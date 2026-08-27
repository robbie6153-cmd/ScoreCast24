import { auth, db } from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  DREAM_CONFIG
} from "./dream-config.js?v=5";


/* =========================
   CONFIGURATION
========================= */

const MAX_PLAYERS =
  DREAM_CONFIG.maxPlayers;

const MAX_RATING =
  DREAM_CONFIG.maxRating;

const MAX_FROM_ONE_CLUB =
  DREAM_CONFIG.maxFromOneClub;

const FORMATIONS =
  DREAM_CONFIG.formations;

const PLAYER_FILES =
  DREAM_CONFIG.playerFiles;


/* =========================
   CURRENT GAME STATE
========================= */

let allPlayers = [];
let selectedPlayers = [];

let currentUser = null;
let currentUsername = "";

let gameIsLocked =
  DREAM_CONFIG.manualLock;

let playerFilesLoaded = false;
let rolloverPromptOpen = false;

/*
  If an existing team was saved using the old
  round-ID format, keep using that document when
  the user edits and resubmits it.
*/

let currentEntryDocumentId = null;
let currentEntryRoundId = null;


/*
  REPLACEMENT MODE

  When the user arrives from View My Team using:

  dream-team-game.html?replace=PLAYER_ID

  the existing saved team is loaded normally,
  then that player is removed from the editor only.

  Firestore remains unchanged until the user
  submits a complete replacement squad.
*/

const pageParameters =
  new URLSearchParams(
    window.location.search
  );

const replacementPlayerId =
  pageParameters.get("replace");

let replacementModeStarted =
  false;


/*
  GRANDFATHERED TEAM

  If a legitimately submitted team later rises above
  MAX_RATING because player ratings are updated,
  the exact saved squad remains valid.

  Once the user changes the squad or formation,
  the normal MAX_RATING rule applies again.
*/

let grandfatheredPlayerIds =
  new Set();

let grandfatheredFormation =
  "";

let hasGrandfatheredTeam =
  false;


/* =========================
   PAGE ELEMENTS
========================= */

const formationSelect =
  document.getElementById("formationSelect");

const clubFilter =
  document.getElementById("clubFilter");

const positionFilter =
  document.getElementById("positionFilter");

const ratingFilter =
  document.getElementById("ratingFilter");

const playerSearch =
  document.getElementById("playerSearch");

const playerList =
  document.getElementById("playerList");

const selectedCount =
  document.getElementById("selectedCount");

const ratingTotal =
  document.getElementById("ratingTotal");

const formationStatus =
  document.getElementById("formationStatus");

const submitDreamTeamBtn =
  document.getElementById("submitDreamTeamBtn");

const dreamMessage =
  document.getElementById("dreamMessage");

const dreamLoginStatus =
  document.getElementById("dreamLoginStatus");

const viewMyTeamBtn =
  document.getElementById("viewMyTeamBtn");


/* =========================
   MESSAGES
========================= */

function showMessage(
  message,
  type = ""
) {
  dreamMessage.textContent =
    message;

  dreamMessage.className =
    `dream-message ${type}`.trim();
}


function clearMessage() {
  showMessage("");
}


/* =========================
   VIEW MY TEAM BUTTON
========================= */

async function setupViewMyTeamButton(user) {
  if (!viewMyTeamBtn) {
    return;
  }

  if (!user) {
    viewMyTeamBtn.href =
      "index.html";

    viewMyTeamBtn.textContent =
      "Log In to View My Team";

    return;
  }

  viewMyTeamBtn.textContent =
    "Loading My Team...";

  viewMyTeamBtn.removeAttribute(
    "href"
  );

  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "dream_team_entries"
        )
      );

    const entries =
      snapshot.docs.map(
        documentSnapshot => ({
          id:
            documentSnapshot.id,

          ...documentSnapshot.data()
        })
      );

    const userEntry =
      entries.find(entry => {

        if (
          entry.uid &&
          entry.uid === user.uid
        ) {
          return true;
        }

        return String(
          entry.id || ""
        ).includes(
          user.uid
        );
      });

    if (!userEntry) {
      viewMyTeamBtn.href =
        "#";

      viewMyTeamBtn.textContent =
        "No Team Selected Yet";

      return;
    }

    viewMyTeamBtn.href =
      `dream-team-view.html?id=${
        encodeURIComponent(
          userEntry.id
        )
      }`;

    viewMyTeamBtn.textContent =
      "View My Team";

  } catch (error) {
    console.error(
      "View My Team error:",
      error
    );

    viewMyTeamBtn.href =
      "#";

    viewMyTeamBtn.textContent =
      "View My Team";
  }
}


/* =========================
   MANUAL ROUND IDS
========================= */

function getCurrentRoundIds() {
  return [
    DREAM_CONFIG.currentRoundId
  ];
}


function getPreviousRoundIds() {
  if (!DREAM_CONFIG.previousRoundId) {
    return [];
  }

  return [
    DREAM_CONFIG.previousRoundId
  ];
}


/* =========================
   MANUAL LOCK
========================= */

function refreshLockStatus() {
  gameIsLocked =
    DREAM_CONFIG.manualLock;

  if (gameIsLocked) {
    showMessage(
      DREAM_CONFIG.messages.lockedShort,
      "error"
    );
  }

  updateDreamTeamDisplay();
}


/* =========================
   PLAYER POSITION NAMES
========================= */

function normalisePosition(
  position
) {
  const value =
    String(position || "")
      .trim()
      .toLowerCase();

  const positionNames = {
    gk: "Goalkeeper",
    goalkeeper: "Goalkeeper",
    goalkeepers: "Goalkeeper",

    def: "Defender",
    defender: "Defender",
    defenders: "Defender",
    df: "Defender",

    mid: "Midfielder",
    midfielder: "Midfielder",
    midfielders: "Midfielder",
    mf: "Midfielder",

    att: "Attacker",
    attacker: "Attacker",
    attackers: "Attacker",
    forward: "Attacker",
    forwards: "Attacker",
    fw: "Attacker",
    st: "Attacker"
  };

  return (
    positionNames[value] ||
    position
  );
}


/* =========================
   LOAD PLAYER DATABASE
========================= */

async function loadPlayerFiles() {
  if (playerFilesLoaded) {
    return;
  }

  try {
    const responses =
      await Promise.all(
        PLAYER_FILES.map(
          fileName =>
            fetch(fileName)
        )
      );

    for (
      const response of responses
    ) {
      if (!response.ok) {
        throw new Error(
          `Could not load ${response.url}`
        );
      }
    }

    const playerGroups =
      await Promise.all(
        responses.map(
          response =>
            response.json()
        )
      );

    allPlayers =
      playerGroups
        .flat()
        .filter(player => {
          return (
            player.id &&
            player.name &&
            player.club &&
            player.position &&
            Number.isFinite(
              Number(player.rating)
            )
          );
        })
        .map(player => ({
          ...player,

          position:
            normalisePosition(
              player.position
            ),

          rating:
            Number(player.rating)
        }));

    playerFilesLoaded = true;

    populateClubFilter();
    renderPlayers();

  } catch (error) {
    console.error(
      "Player loading error:",
      error
    );

    playerList.innerHTML = `
      <p>
        The player database could not be loaded.
        Check that all four player files are saved correctly.
      </p>
    `;
  }
}


/* =========================
   PLAYER FILTERS
========================= */

function populateClubFilter() {
  const clubs = [
    ...new Set(
      allPlayers.map(
        player => player.club
      )
    )
  ].sort(
    (a, b) =>
      a.localeCompare(b)
  );

  clubFilter.innerHTML =
    `<option value="ALL">All clubs</option>`;

  clubs.forEach(club => {
    const option =
      document.createElement("option");

    option.value = club;
    option.textContent = club;

    clubFilter.appendChild(option);
  });
}


function getFilteredPlayers() {
  const selectedClub =
    clubFilter.value;

  const selectedPosition =
    positionFilter.value === "ALL"
      ? "ALL"
      : normalisePosition(
          positionFilter.value
        );

  const selectedRating =
    ratingFilter.value;

  const searchValue =
    playerSearch.value
      .trim()
      .toLowerCase();

  return allPlayers.filter(player => {
    const matchesClub =
      selectedClub === "ALL" ||
      player.club === selectedClub;

    const matchesPosition =
      selectedPosition === "ALL" ||
      player.position ===
        selectedPosition;

    const matchesSearch =
      !searchValue ||
      player.name
        .toLowerCase()
        .includes(searchValue);

    let matchesRating = true;

    if (
      selectedRating === "60-69"
    ) {
      matchesRating =
        player.rating >= 60 &&
        player.rating <= 69;
    }

    if (
      selectedRating === "70-79"
    ) {
      matchesRating =
        player.rating >= 70 &&
        player.rating <= 79;
    }

    if (
      selectedRating === "80-89"
    ) {
      matchesRating =
        player.rating >= 80 &&
        player.rating <= 89;
    }

    if (
      selectedRating === "90+"
    ) {
      matchesRating =
        player.rating >= 90;
    }

    return (
      matchesClub &&
      matchesPosition &&
      matchesRating &&
      matchesSearch
    );
  });
}


/* =========================
   DISPLAY AVAILABLE PLAYERS
========================= */

function renderPlayers() {
  const filteredPlayers =
    getFilteredPlayers();

  if (!filteredPlayers.length) {
    playerList.innerHTML = `
      <p>No matching players found.</p>
    `;

    return;
  }

  playerList.innerHTML =
    filteredPlayers
      .map(player => {
        const alreadySelected =
          selectedPlayers.some(
            selected =>
              selected.id ===
              player.id
          );

        const disabled =
          gameIsLocked ||
          !currentUser;

        return `
          <article
            class="player-card ${player.position.toLowerCase()}"
          >

            <div class="player-card-details">
              <strong>
                ${escapeHtml(player.name)}
              </strong>

              <span>
                ${escapeHtml(player.club)}
              </span>

              <span>
                ${escapeHtml(player.position)}
              </span>
            </div>

            <div class="player-card-rating">
              ${player.rating}
            </div>

            <button
              type="button"
              class="add-player-button"
              data-player-id="${escapeHtml(player.id)}"
              ${disabled ? "disabled" : ""}
            >
              ${
                gameIsLocked
                  ? "Locked"
                  : alreadySelected
                    ? "Remove"
                    : "Add"
              }
            </button>

          </article>
        `;
      })
      .join("");

  document
    .querySelectorAll(
      ".add-player-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          const playerId =
            button.dataset.playerId;

          const alreadySelected =
            selectedPlayers.some(
              player =>
                player.id === playerId
            );

          if (alreadySelected) {
            removePlayer(playerId);
          } else {
            addPlayer(playerId);
          }
        }
      );

    });
}


/* =========================
   ADD PLAYER
========================= */

function addPlayer(
  playerId
) {
  clearMessage();

  if (gameIsLocked) {
    showMessage(
      DREAM_CONFIG.messages.lockedShort,
      "error"
    );

    return;
  }

  const player =
    allPlayers.find(
      item =>
        item.id === playerId
    );

  if (!player) {
    showMessage(
      "Player could not be found.",
      "error"
    );

    return;
  }

  if (!currentUser) {
    showMessage(
      "You must be logged in to select a Dream Team.",
      "error"
    );

    return;
  }

  if (!formationSelect.value) {
    showMessage(
      "Choose your formation before selecting players.",
      "error"
    );

    return;
  }

  if (
    selectedPlayers.length >=
    MAX_PLAYERS
  ) {
    showMessage(
      `Your team already contains ${MAX_PLAYERS} players.`,
      "error"
    );

    return;
  }

  if (
    selectedPlayers.some(
      selected =>
        selected.id === player.id
    )
  ) {
    showMessage(
      "You have already selected this player.",
      "error"
    );

    return;
  }

  const formation =
    FORMATIONS[
      formationSelect.value
    ];

  const positionCount =
    selectedPlayers.filter(
      selected =>
        selected.position ===
        player.position
    ).length;

  const positionLimit =
    formation[player.position];

  if (
    positionCount >=
    positionLimit
  ) {
    showMessage(
      `Your ${formationSelect.value} formation only allows ` +
      `${positionLimit} ${player.position.toLowerCase()} player` +
      `${positionLimit === 1 ? "" : "s"}.`,
      "error"
    );

    return;
  }

  const clubCount =
    selectedPlayers.filter(
      selected =>
        selected.club ===
        player.club
    ).length;

  if (
    clubCount >=
    MAX_FROM_ONE_CLUB
  ) {
    showMessage(
      `You may only select ${MAX_FROM_ONE_CLUB} players ` +
      `from ${player.club}.`,
      "error"
    );

    return;
  }

  const newRatingTotal =
    calculateRatingTotal() +
    player.rating;

  /*
    Normally a player cannot be added if
    they push the squad above MAX_RATING.

    Exception:
    an existing player's original submitted
    squad can be reconstructed after later
    rating increases.
  */

  if (
    newRatingTotal >
      MAX_RATING &&
    !prospectiveSelectionIsGrandfathered(
      player
    )
  ) {
    showMessage(
      `Adding ${player.name} would take your team above ` +
      `${MAX_RATING} rating points.`,
      "error"
    );

    return;
  }

  selectedPlayers.push(player);

  updateDreamTeamDisplay();
}


/* =========================
   REMOVE PLAYER
========================= */

function removePlayer(
  playerId
) {
  if (gameIsLocked) {
    showMessage(
      DREAM_CONFIG.messages.lockedShort,
      "error"
    );

    return;
  }

  selectedPlayers =
    selectedPlayers.filter(
      player =>
        player.id !== playerId
    );

  clearMessage();
  updateDreamTeamDisplay();
}


/* =========================
   GRANDFATHERED TEAM
========================= */

function setGrandfatheredTeam(
  savedEntry
) {
  const savedPlayers =
    Array.isArray(
      savedEntry?.players
    )
      ? savedEntry.players
      : [];

  grandfatheredPlayerIds =
    new Set(
      savedPlayers
        .map(player =>
          String(
            player.id || ""
          )
        )
        .filter(Boolean)
    );

  grandfatheredFormation =
    String(
      savedEntry?.formation ||
      ""
    );

  hasGrandfatheredTeam =
    grandfatheredPlayerIds.size ===
      MAX_PLAYERS &&
    Boolean(
      grandfatheredFormation
    );
}


function selectedTeamMatchesGrandfathered() {
  if (
    !hasGrandfatheredTeam
  ) {
    return false;
  }

  if (
    formationSelect.value !==
    grandfatheredFormation
  ) {
    return false;
  }

  if (
    selectedPlayers.length !==
    MAX_PLAYERS
  ) {
    return false;
  }

  const selectedIds =
    new Set(
      selectedPlayers.map(
        player =>
          String(
            player.id || ""
          )
      )
    );

  if (
    selectedIds.size !==
    grandfatheredPlayerIds.size
  ) {
    return false;
  }

  return [
    ...grandfatheredPlayerIds
  ].every(
    playerId =>
      selectedIds.has(
        playerId
      )
  );
}


/*
  Allows the user to rebuild their ORIGINAL
  grandfathered squad even if updated ratings
  now place it above MAX_RATING.

  As soon as a newly selected player was not
  part of that saved squad, the normal budget
  rule applies.
*/

function prospectiveSelectionIsGrandfathered(
  playerToAdd
) {
  if (
    !hasGrandfatheredTeam
  ) {
    return false;
  }

  if (
    formationSelect.value !==
    grandfatheredFormation
  ) {
    return false;
  }

  const prospectivePlayers = [
    ...selectedPlayers,
    playerToAdd
  ];

  return prospectivePlayers.every(
    player =>
      grandfatheredPlayerIds.has(
        String(
          player.id || ""
        )
      )
  );
}


function ratingLimitIsSatisfied() {
  if (
    calculateRatingTotal() <=
    MAX_RATING
  ) {
    return true;
  }

  /*
    Over-budget is allowed ONLY when
    the entire squad is exactly the
    previously submitted squad.
  */

  return (
    selectedTeamMatchesGrandfathered()
  );
}


/* =========================
   TEAM VALIDATION
========================= */

function calculateRatingTotal() {
  return selectedPlayers.reduce(
    (
      total,
      player
    ) =>
      total +
      Number(player.rating),
    0
  );
}


function getPositionCounts() {
  return {
    Goalkeeper:
      selectedPlayers.filter(
        player =>
          player.position ===
          "Goalkeeper"
      ).length,

    Defender:
      selectedPlayers.filter(
        player =>
          player.position ===
          "Defender"
      ).length,

    Midfielder:
      selectedPlayers.filter(
        player =>
          player.position ===
          "Midfielder"
      ).length,

    Attacker:
      selectedPlayers.filter(
        player =>
          player.position ===
          "Attacker"
      ).length
  };
}


function formationIsComplete() {
  const formationName =
    formationSelect.value;

  if (!formationName) {
    return false;
  }

  const required =
    FORMATIONS[formationName];

  const actual =
    getPositionCounts();

  return Object
    .keys(required)
    .every(position => {
      return (
        actual[position] ===
        required[position]
      );
    });
}


function teamIsValid() {
  return (
    Boolean(currentUser) &&
    !gameIsLocked &&
    selectedPlayers.length ===
      MAX_PLAYERS &&
    ratingLimitIsSatisfied() &&
    formationIsComplete()
  );
}


/* =========================
   CONTROL LOCKING
========================= */

function updateControlAvailability() {
  const disabled =
    !currentUser ||
    gameIsLocked;

  formationSelect.disabled =
    disabled;

  clubFilter.disabled =
    disabled;

  positionFilter.disabled =
    disabled;

  ratingFilter.disabled =
    disabled;

  playerSearch.disabled =
    disabled;
}


/* =========================
   DISPLAY TEAM SUMMARY
========================= */

function updateDreamTeamDisplay() {
  const totalRating =
    calculateRatingTotal();

  selectedCount.textContent =
    `${selectedPlayers.length}/${MAX_PLAYERS}`;

  ratingTotal.textContent =
    `${totalRating}/${MAX_RATING}`;

  formationStatus.textContent =
    formationSelect.value ||
    "Not selected";

  ratingTotal.classList.toggle(
    "over-budget",
    totalRating >
      MAX_RATING &&
    !selectedTeamMatchesGrandfathered()
  );

  updateControlAvailability();

  submitDreamTeamBtn.textContent =
    gameIsLocked
      ? "Team Locked"
      : "Submit Dream Team";

  submitDreamTeamBtn.disabled =
    !teamIsValid();

  renderPlayers();
}


/* =========================
   SAVE DREAM TEAM
========================= */

async function saveDreamTeamEntry({
  players,
  formation,
  rolloverFromRound = null
}) {
  if (!currentUser) {
    throw new Error(
      "No logged-in user."
    );
  }

  const roundId =
    DREAM_CONFIG.currentRoundId;

  if (!roundId) {
    throw new Error(
      "No current Dream Team round has been configured."
    );
  }

  const entryId =
    currentEntryDocumentId ||
    `${roundId}_${currentUser.uid}`;

  const entryReference =
    doc(
      db,
      "dream_team_entries",
      entryId
    );

  const entryData = {
    uid:
      currentUser.uid,

    username:
      currentUsername,

    email:
      currentUser.email || "",

    roundId,

    formation,

    ratingTotal:
      calculateRatingTotal(),

    players:
      players.map(player => ({
        id:
          player.id,

        name:
          player.name,

        club:
          player.club,

        position:
          player.position,

        rating:
          Number(player.rating),

        points:
          Number(player.points || 0)
      })),

 status:
  DREAM_CONFIG.manualLock
    ? "locked"
    : "submitted",

submittedAt:
  serverTimestamp()
};


/*
  Only initialise points for a brand-new entry.
  Never reset an existing team's points when
  the squad is edited.
*/

if (!currentEntryDocumentId) {
  entryData.totalPoints = 0;
}


if (rolloverFromRound) {
  entryData.rolloverFromRound =
    rolloverFromRound;
}


await setDoc(
  entryReference,
  entryData,
  {
    merge: true
  }
);

currentEntryDocumentId =
  entryId;

currentEntryRoundId =
  roundId;

/* =========================
   FIRESTORE ENTRIES
========================= */

async function getEntryForRoundIds(
  roundIds
) {
  if (!currentUser) {
    return null;
  }

  for (
    const roundId of roundIds
  ) {
    const entryId =
      `${roundId}_${currentUser.uid}`;

    const entryReference =
      doc(
        db,
        "dream_team_entries",
        entryId
      );

    const entrySnapshot =
      await getDoc(
        entryReference
      );

    if (
      entrySnapshot.exists()
    ) {
      return {
        id:
          entrySnapshot.id,

        roundId,

        data:
          entrySnapshot.data()
      };
    }
  }

  return null;
}


/* =========================
   LOAD SAVED TEAM INTO EDITOR
========================= */

function loadEntryIntoEditor(
  savedEntry
) {

  /*
    Remember the exact legitimately
    submitted squad BEFORE replacing
    its old ratings with current ratings.
  */

  setGrandfatheredTeam(
    savedEntry
  );

  formationSelect.value =
    savedEntry.formation || "";

  const savedPlayers =
    Array.isArray(
      savedEntry.players
    )
      ? savedEntry.players
      : [];

  /*
    Load the current player database
    versions so the user sees today's
    ratings.

    The grandfather information above
    remembers which eleven players were
    originally submitted.
  */

  selectedPlayers =
    savedPlayers
      .map(savedPlayer => {

        const currentPlayer =
          allPlayers.find(
            player =>
              player.id ===
              savedPlayer.id
          );

        return (
          currentPlayer ||
          savedPlayer
        );

      })
      .filter(Boolean);

  updateDreamTeamDisplay();
}


/* =========================
   START REPLACEMENT MODE
========================= */

function startReplacementMode() {
  if (
    replacementModeStarted ||
    !replacementPlayerId
  ) {
    return;
  }

  const playerToReplace =
    selectedPlayers.find(
      player =>
        String(player.id) ===
        String(replacementPlayerId)
    );

  if (!playerToReplace) {
    showMessage(
      "The selected player could not be found in your current squad.",
      "error"
    );

    return;
  }

  replacementModeStarted = true;

  selectedPlayers =
    selectedPlayers.filter(
      player =>
        String(player.id) !==
        String(replacementPlayerId)
    );

  /*
    IMPORTANT:

    This only changes selectedPlayers in the browser.

    The submitted Firestore team remains untouched
    until a complete valid squad is submitted.
  */

  updateDreamTeamDisplay();

  showMessage(
    `${playerToReplace.name} has been removed from the editor. ` +
    `Choose a replacement and submit your updated Dream Team.`,
    "success"
  );
}


/* =========================
   LOAD EXISTING DREAM TEAM
========================= */

async function loadExistingDreamTeam() {
  try {
    const savedResult =
      await getEntryForRoundIds(
        getCurrentRoundIds()
      );

    if (!savedResult) {
      currentEntryDocumentId =
        null;

      currentEntryRoundId =
        null;

      return false;
    }

    currentEntryDocumentId =
      savedResult.id;

    currentEntryRoundId =
      savedResult.data.roundId ||
      savedResult.roundId;

    loadEntryIntoEditor(
      savedResult.data
    );

    if (
      replacementPlayerId &&
      !gameIsLocked
    ) {
      startReplacementMode();

    } else {
      showMessage(
        gameIsLocked
          ? DREAM_CONFIG.messages.loadedLocked
          : DREAM_CONFIG.messages.loadedEditable,
        "success"
      );
    }

    return true;

  } catch (error) {
    console.error(
      "Could not load existing Dream Team:",
      error
    );

    return false;
  }
}


/* =========================
   KEEP OR CHANGE NOTICE
========================= */

function removeRolloverPrompt() {
  const prompt =
    document.getElementById(
      "dreamTeamRolloverPrompt"
    );

  if (prompt) {
    prompt.remove();
  }

  rolloverPromptOpen = false;
}


function showRolloverPrompt(
  previousEntry
) {
  if (
    rolloverPromptOpen ||
    gameIsLocked
  ) {
    return;
  }

  rolloverPromptOpen = true;

  const overlay =
    document.createElement("div");

  overlay.id =
    "dreamTeamRolloverPrompt";

  overlay.className =
    "dream-rollover-overlay";

  overlay.innerHTML = `
    <section class="dream-rollover-box">

      <h2>
        ${escapeHtml(
          DREAM_CONFIG.rolloverTitle
        )}
      </h2>

      <p>
        ${escapeHtml(
          DREAM_CONFIG.rolloverQuestion
        )}
      </p>

      <div class="dream-rollover-buttons">

        <button
          type="button"
          id="changePreviousDreamTeam"
        >
          ${escapeHtml(
            DREAM_CONFIG.changeTeamButton
          )}
        </button>

        <button
          type="button"
          id="keepPreviousDreamTeam"
        >
          ${escapeHtml(
            DREAM_CONFIG.keepTeamButton
          )}
        </button>

      </div>

    </section>
  `;

  document.body.appendChild(
    overlay
  );

  const changeButton =
    document.getElementById(
      "changePreviousDreamTeam"
    );

  const keepButton =
    document.getElementById(
      "keepPreviousDreamTeam"
    );

  changeButton.addEventListener(
    "click",
    () => {
      loadEntryIntoEditor(
        previousEntry
      );

      removeRolloverPrompt();

      showMessage(
        DREAM_CONFIG.messages.previousLoaded,
        "success"
      );
    }
  );

  keepButton.addEventListener(
    "click",
    async () => {
      changeButton.disabled = true;
      keepButton.disabled = true;

      keepButton.textContent =
        "Submitting...";

      const success =
        await submitPreviousTeam(
          previousEntry
        );

      if (!success) {
        changeButton.disabled = false;
        keepButton.disabled = false;

        keepButton.textContent =
          DREAM_CONFIG.keepTeamButton;
      }
    }
  );
}


async function checkForPreviousTeam() {
  if (
    !currentUser ||
    gameIsLocked
  ) {
    return;
  }

  try {
    const previousResult =
      await getEntryForRoundIds(
        getPreviousRoundIds()
      );

    if (!previousResult) {
      return;
    }

    const previousEntry = {
      ...previousResult.data,

      roundId:
        previousResult.data.roundId ||
        previousResult.roundId
    };

    showRolloverPrompt(
      previousEntry
    );

  } catch (error) {
    console.error(
      "Could not check previous Dream Team:",
      error
    );
  }
}


/* =========================
   SUBMIT PREVIOUS TEAM
========================= */

async function submitPreviousTeam(
  previousEntry
) {
  clearMessage();

  if (
    !currentUser ||
    gameIsLocked
  ) {
    showMessage(
      "The team cannot currently be submitted.",
      "error"
    );

    return false;
  }

  loadEntryIntoEditor(
    previousEntry
  );

  if (!teamIsValid()) {
    removeRolloverPrompt();

    showMessage(
      DREAM_CONFIG.messages.previousInvalid,
      "error"
    );

    return false;
  }

  try {
    await saveDreamTeamEntry({
      players:
        selectedPlayers,

      formation:
        formationSelect.value,

      rolloverFromRound:
        previousEntry.roundId ||
        getPreviousRoundIds()[0]
    });

    completeSubmission();

    return true;

  } catch (error) {
    console.error(
      "Previous-team submission failed:",
      error
    );

    showMessage(
      DREAM_CONFIG.messages.submitError,
      "error"
    );

    return false;
  }
}


/* =========================
   SUBMIT CURRENT TEAM
========================= */

async function submitDreamTeam() {
  clearMessage();
  refreshLockStatus();

  if (gameIsLocked) {
    showMessage(
      DREAM_CONFIG.messages.lockedShort,
      "error"
    );

    return;
  }

  if (!currentUser) {
    showMessage(
      "You must be logged in to submit a team.",
      "error"
    );

    return;
  }

  if (!teamIsValid()) {
    showMessage(
      DREAM_CONFIG.messages.invalidTeam,
      "error"
    );

    return;
  }

  submitDreamTeamBtn.disabled =
    true;

  submitDreamTeamBtn.textContent =
    "Submitting...";

  try {
    await saveDreamTeamEntry({
      players:
        selectedPlayers,

      formation:
        formationSelect.value
    });

    completeSubmission();

  } catch (error) {
    console.error(
      "Dream Team submission failed:",
      error
    );

    showMessage(
      DREAM_CONFIG.messages.submitError,
      "error"
    );

  } finally {
    submitDreamTeamBtn.textContent =
      gameIsLocked
        ? "Team Locked"
        : "Submit Dream Team";

    submitDreamTeamBtn.disabled =
      !teamIsValid();
  }
}


function completeSubmission() {
  sessionStorage.setItem(
    "dreamTeamSubmittedUsername",
    currentUsername
  );

  window.location.href =
    "./dream-leaderboard.html";
}


/* =========================
   USERNAME
========================= */

async function findUsername(
  user
) {
  const localUsername =
    localStorage.getItem(
      "scorecast24Username"
    );

  if (localUsername) {
    return localUsername;
  }

  try {
    const userReference =
      doc(
        db,
        "users",
        user.uid
      );

    const userSnapshot =
      await getDoc(
        userReference
      );

    if (userSnapshot.exists()) {
      const userData =
        userSnapshot.data();

      return (
        userData.username ||
        user.email ||
        "ScoreCast24 Player"
      );
    }

  } catch (error) {
    console.error(
      "Username lookup failed:",
      error
    );
  }

  return (
    user.email ||
    "ScoreCast24 Player"
  );
}


/* =========================
   SECURITY
========================= */

function escapeHtml(
  value
) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   PAGE EVENTS
========================= */

formationSelect.addEventListener(
  "change",
  () => {
    if (gameIsLocked) {
      showMessage(
        DREAM_CONFIG.messages.lockedShort,
        "error"
      );

      return;
    }

    if (
      selectedPlayers.length > 0
    ) {
      const confirmed =
        window.confirm(
          "Changing formation will remove your currently selected players. Continue?"
        );

      if (!confirmed) {
        return;
      }

      selectedPlayers = [];
    }

    clearMessage();
    updateDreamTeamDisplay();
  }
);


clubFilter.addEventListener(
  "change",
  renderPlayers
);

positionFilter.addEventListener(
  "change",
  renderPlayers
);

ratingFilter.addEventListener(
  "change",
  renderPlayers
);

playerSearch.addEventListener(
  "input",
  renderPlayers
);


submitDreamTeamBtn.addEventListener(
  "click",
  event => {
    event.preventDefault();
    submitDreamTeam();
  }
);


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
  auth,
  async user => {
    currentUser = user;

    await setupViewMyTeamButton(
      user
    );

    refreshLockStatus();

    if (!user) {
      currentUsername = "";

      dreamLoginStatus.textContent =
        "You must log in before selecting and submitting a Dream Team.";

      showMessage(
        "Return to the ScoreCast24 home page and log in first.",
        "error"
      );

      updateDreamTeamDisplay();
      return;
    }

    currentUsername =
      await findUsername(user);

    dreamLoginStatus.textContent =
      `Logged in as ${currentUsername}`;

    await loadPlayerFiles();

    const currentEntryExists =
      await loadExistingDreamTeam();

    if (
      !currentEntryExists &&
      !gameIsLocked
    ) {
      await checkForPreviousTeam();
    }

    if (
      !currentEntryExists &&
      gameIsLocked
    ) {
      showMessage(
        DREAM_CONFIG.messages.lockedShort,
        "error"
      );
    }

    updateDreamTeamDisplay();
  }
);


/* =========================
   STARTUP
========================= */

loadPlayerFiles();

refreshLockStatus();
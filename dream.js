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
} from "./dream-config.js?v=6";


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


/*
  Current Firestore entry being edited.

  This is ONLY set when we are actually
  editing the current week's submitted team.

  If an older team is carried forward,
  this stays null so submitting creates
  the new week's document instead.
*/

let currentEntryDocumentId = null;
let currentEntryRoundId = null;


/* =========================
   URL PARAMETERS
========================= */

const pageParameters =
  new URLSearchParams(
    window.location.search
  );


/*
  Used by the View Team page:

  dream-game.html?carry=ENTRY_ID

  This loads that exact submitted squad
  into Team Selection.
*/

const carryEntryId =
  pageParameters.get("carry");


/*
  Optional individual player replacement:

  dream-game.html?replace=PLAYER_ID
*/

const replacementPlayerId =
  pageParameters.get("replace");

let replacementModeStarted =
  false;


/* =========================
   GRANDFATHERED TEAM
========================= */

/*
  A legitimately submitted squad can remain
  valid if ratings later increase above the
  normal MAX_RATING.

  But once the user introduces a different
  player, normal rating rules apply.
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
  document.getElementById(
    "formationSelect"
  );

const clubFilter =
  document.getElementById(
    "clubFilter"
  );

const positionFilter =
  document.getElementById(
    "positionFilter"
  );

const ratingFilter =
  document.getElementById(
    "ratingFilter"
  );

const playerSearch =
  document.getElementById(
    "playerSearch"
  );

const playerList =
  document.getElementById(
    "playerList"
  );

const selectedCount =
  document.getElementById(
    "selectedCount"
  );

const ratingTotal =
  document.getElementById(
    "ratingTotal"
  );

const formationStatus =
  document.getElementById(
    "formationStatus"
  );

const submitDreamTeamBtn =
  document.getElementById(
    "submitDreamTeamBtn"
  );

const dreamMessage =
  document.getElementById(
    "dreamMessage"
  );

const dreamLoginStatus =
  document.getElementById(
    "dreamLoginStatus"
  );

const viewMyTeamBtn =
  document.getElementById(
    "viewMyTeamBtn"
  );


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   MESSAGES
========================= */

function showMessage(
  message,
  type = ""
) {
  if (!dreamMessage) {
    return;
  }

  dreamMessage.textContent =
    message;

  dreamMessage.className =
    `dream-message ${type}`.trim();
}


function clearMessage() {
  showMessage("");
}


/* =========================
   ROUND IDS
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
            Number(
              player.rating
            )
        }));

    playerFilesLoaded = true;

    populateClubFilter();
    renderPlayers();

  } catch (error) {
    console.error(
      "Player loading error:",
      error
    );

    if (playerList) {
      playerList.innerHTML = `
        <p>
          The player database could not be loaded.
          Check that all four player files are saved correctly.
        </p>
      `;
    }
  }
}


/* =========================
   PLAYER FILTERS
========================= */

function populateClubFilter() {
  const clubs = [
    ...new Set(
      allPlayers.map(
        player =>
          player.club
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
      document.createElement(
        "option"
      );

    option.value =
      club;

    option.textContent =
      club;

    clubFilter.appendChild(
      option
    );
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

  return allPlayers.filter(
    player => {
      const matchesClub =
        selectedClub === "ALL" ||
        player.club ===
          selectedClub;

      const matchesPosition =
        selectedPosition === "ALL" ||
        player.position ===
          selectedPosition;

      const matchesSearch =
        !searchValue ||
        player.name
          .toLowerCase()
          .includes(
            searchValue
          );

      let matchesRating =
        true;

      if (
        selectedRating ===
        "60-69"
      ) {
        matchesRating =
          player.rating >= 60 &&
          player.rating <= 69;
      }

      if (
        selectedRating ===
        "70-79"
      ) {
        matchesRating =
          player.rating >= 70 &&
          player.rating <= 79;
      }

      if (
        selectedRating ===
        "80-89"
      ) {
        matchesRating =
          player.rating >= 80 &&
          player.rating <= 89;
      }

      if (
        selectedRating ===
        "90+"
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
    }
  );
}


/* =========================
   DISPLAY AVAILABLE PLAYERS
========================= */

function renderPlayers() {
  if (
    !playerList ||
    !playerFilesLoaded
  ) {
    return;
  }

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
            class="player-card ${escapeHtml(
              player.position.toLowerCase()
            )}"
          >

            <div class="player-card-details">

              <strong>
                ${escapeHtml(
                  player.name
                )}
              </strong>

              <span>
                ${escapeHtml(
                  player.club
                )}
              </span>

              <span>
                ${escapeHtml(
                  player.position
                )}
              </span>

            </div>

            <div class="player-card-rating">
              ${Number(
                player.rating
              )}
            </div>

            <button
              type="button"
              class="add-player-button"
              data-player-id="${escapeHtml(
                player.id
              )}"
              ${
                disabled
                  ? "disabled"
                  : ""
              }
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
            button.dataset
              .playerId;

          const alreadySelected =
            selectedPlayers.some(
              player =>
                player.id ===
                playerId
            );

          if (alreadySelected) {
            removePlayer(
              playerId
            );
          } else {
            addPlayer(
              playerId
            );
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
        item.id ===
        playerId
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
        selected.id ===
        player.id
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
    formation[
      player.position
    ];

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

  selectedPlayers.push(
    player
  );

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
        player.id !==
        playerId
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
  if (!hasGrandfatheredTeam) {
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


function prospectiveSelectionIsGrandfathered(
  playerToAdd
) {
  if (!hasGrandfatheredTeam) {
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
      Number(
        player.rating || 0
      ),
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
    FORMATIONS[
      formationName
    ];

  if (!required) {
    return false;
  }

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
    Boolean(
      currentUser
    ) &&
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
  if (
    !selectedCount ||
    !ratingTotal ||
    !formationStatus ||
    !submitDreamTeamBtn
  ) {
    return;
  }

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


  /*
    If editing the current week's actual
    entry, use the existing document ID.

    If a previous week's squad was merely
    carried into the editor, this is null
    and a fresh current-round document
    will be created.
  */

  const entryId =
    currentEntryDocumentId ||
    `${roundId}_${currentUser.uid}`;

  const entryReference =
    doc(
      db,
      "dream_team_entries",
      entryId
    );


  /*
    Check whether this exact document
    already exists.

    This prevents totalPoints being reset
    when editing an existing current entry.
  */

  const existingSnapshot =
    await getDoc(
      entryReference
    );

  const entryAlreadyExists =
    existingSnapshot.exists();


  const entryData = {
    uid:
      currentUser.uid,

    username:
      currentUsername,

    email:
      currentUser.email ||
      "",

    roundId,

    formation,

    ratingTotal:
      calculateRatingTotal(),

    players:
      players.map(
        player => ({
          id:
            player.id,

          name:
            player.name,

          club:
            player.club,

          position:
            player.position,

          rating:
            Number(
              player.rating
            ),

          points:
            Number(
              player.points ||
              0
            )
        })
      ),

    status:
      DREAM_CONFIG.manualLock
        ? "locked"
        : "submitted",

    submittedAt:
      serverTimestamp()
  };


  /*
    Only initialise totalPoints when
    creating a genuinely new week's entry.
  */

  if (!entryAlreadyExists) {
    entryData.totalPoints =
      0;
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
}


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
  setGrandfatheredTeam(
    savedEntry
  );

  formationSelect.value =
    savedEntry.formation ||
    "";

  const savedPlayers =
    Array.isArray(
      savedEntry.players
    )
      ? savedEntry.players
      : [];


  /*
    Match each submitted player with
    today's player database.

    This means current ratings/clubs
    are shown where that player still
    exists in the database.

    If they are no longer in the current
    database, retain the saved version so
    they don't simply disappear and turn
    an 11-player team into 10/11.
  */

  selectedPlayers =
    savedPlayers
      .map(
        savedPlayer => {
          const currentPlayer =
            allPlayers.find(
              player =>
                String(
                  player.id
                ) ===
                String(
                  savedPlayer.id
                )
            );

          if (currentPlayer) {
            return currentPlayer;
          }

          return {
            ...savedPlayer,

            position:
              normalisePosition(
                savedPlayer.position
              ),

            rating:
              Number(
                savedPlayer.rating ||
                0
              )
          };
        }
      )
      .filter(Boolean);

  updateDreamTeamDisplay();
}


/* =========================
   LOAD CARRIED ENTRY
========================= */

async function loadCarryEntry() {
  if (
    !carryEntryId ||
    !currentUser
  ) {
    return false;
  }

  try {
    const entryReference =
      doc(
        db,
        "dream_team_entries",
        carryEntryId
      );

    const entrySnapshot =
      await getDoc(
        entryReference
      );

    if (
      !entrySnapshot.exists()
    ) {
      console.error(
        "Carry entry does not exist:",
        carryEntryId
      );

      return false;
    }

    const entryData =
      entrySnapshot.data();


    /*
      SECURITY:

      Only allow someone to carry/edit
      their own Dream Team.
    */

    if (
      entryData.uid &&
      entryData.uid !==
        currentUser.uid
    ) {
      console.error(
        "Carry entry belongs to another user."
      );

      showMessage(
        "That Dream Team does not belong to your account.",
        "error"
      );

      return false;
    }


    const entryRoundId =
      entryData.roundId ||
      "";


    /*
      If this is already the CURRENT
      week's entry, edit it directly.

      If this is an OLD week's entry,
      only copy it into the editor.

      Old Firestore entry remains untouched.
    */

    if (
      entryRoundId ===
      DREAM_CONFIG.currentRoundId
    ) {
      currentEntryDocumentId =
        entrySnapshot.id;

      currentEntryRoundId =
        entryRoundId;

    } else {
      currentEntryDocumentId =
        null;

      currentEntryRoundId =
        null;
    }


    loadEntryIntoEditor(
      entryData
    );


    if (
      replacementPlayerId &&
      !replacementModeStarted &&
      !gameIsLocked
    ) {
      startReplacementMode();

    } else {
      showMessage(
        entryRoundId ===
          DREAM_CONFIG.currentRoundId
          ? "Your current Dream Team has been loaded. Remove any players you want to change, choose replacements, then submit the updated team."
          : "Your previous Dream Team has been loaded. Remove any players you want to change, choose replacements, then submit your new weekly team.",
        "success"
      );
    }


    return true;

  } catch (error) {
    console.error(
      "Could not load carried Dream Team:",
      error
    );

    return false;
  }
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
        String(
          player.id
        ) ===
        String(
          replacementPlayerId
        )
    );

  if (!playerToReplace) {
    showMessage(
      "The selected player could not be found in your current squad.",
      "error"
    );

    return;
  }

  replacementModeStarted =
    true;

  selectedPlayers =
    selectedPlayers.filter(
      player =>
        String(
          player.id
        ) !==
        String(
          replacementPlayerId
        )
    );

  updateDreamTeamDisplay();

  showMessage(
    `${playerToReplace.name} has been removed from the editor. ` +
    `Choose a replacement and submit your updated Dream Team.`,
    "success"
  );
}


/* =========================
   LOAD CURRENT DREAM TEAM
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
   LOAD PREVIOUS DREAM TEAM
========================= */

async function loadPreviousDreamTeam() {
  if (
    !currentUser ||
    gameIsLocked
  ) {
    return false;
  }

  try {
    const previousResult =
      await getEntryForRoundIds(
        getPreviousRoundIds()
      );

    if (!previousResult) {
      return false;
    }

    const previousEntry = {
      ...previousResult.data,

      roundId:
        previousResult.data.roundId ||
        previousResult.roundId
    };


    /*
      IMPORTANT:

      This is only a working copy.

      Do NOT point at the previous
      Firestore document.
    */

    currentEntryDocumentId =
      null;

    currentEntryRoundId =
      null;

    loadEntryIntoEditor(
      previousEntry
    );


    if (
      replacementPlayerId &&
      !replacementModeStarted
    ) {
      startReplacementMode();

    } else {
      showMessage(
        "Your previous Dream Team has been loaded. " +
        "Remove any players you want to change, choose their replacements, then submit your team.",
        "success"
      );
    }

    return true;

  } catch (error) {
    console.error(
      "Could not load previous Dream Team:",
      error
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

    if (
      userSnapshot.exists()
    ) {
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
   VIEW MY TEAM BUTTON
========================= */

async function setupViewMyTeamButton(
  user
) {
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

    /*
      First preference:
      CURRENT week's team.
    */

    const currentResult =
      await getEntryForRoundIds(
        getCurrentRoundIds()
      );

    if (currentResult) {
      viewMyTeamBtn.href =
        `dream-team-view.html?id=${encodeURIComponent(
          currentResult.id
        )}`;

      viewMyTeamBtn.textContent =
        "View My Team";

      return;
    }


    /*
      Second preference:
      PREVIOUS week's team.
    */

    const previousResult =
      await getEntryForRoundIds(
        getPreviousRoundIds()
      );

    if (previousResult) {
      viewMyTeamBtn.href =
        `dream-team-view.html?id=${encodeURIComponent(
          previousResult.id
        )}`;

      viewMyTeamBtn.textContent =
        "View My Team";

      return;
    }


    /*
      Fallback for older entries whose
      document IDs may not follow the
      normal round_uid format.
    */

    const snapshot =
      await getDocs(
        collection(
          db,
          "dream_team_entries"
        )
      );

    const entries =
      snapshot.docs
        .map(
          documentSnapshot => ({
            id:
              documentSnapshot.id,

            ...documentSnapshot.data()
          })
        )
        .filter(
          entry =>
            entry.uid ===
              user.uid ||
            String(
              entry.id || ""
            ).includes(
              user.uid
            )
        );


    if (!entries.length) {
      viewMyTeamBtn.href =
        "#";

      viewMyTeamBtn.textContent =
        "No Team Selected Yet";

      return;
    }


    /*
      Prefer the newest submitted entry
      where timestamps are available.
    */

    entries.sort(
      (a, b) => {
        const aSeconds =
          Number(
            a.submittedAt?.seconds ||
            0
          );

        const bSeconds =
          Number(
            b.submittedAt?.seconds ||
            0
          );

        return (
          bSeconds -
          aSeconds
        );
      }
    );


    viewMyTeamBtn.href =
      `dream-team-view.html?id=${encodeURIComponent(
        entries[0].id
      )}`;

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
      selectedPlayers.length >
      0
    ) {
      const confirmed =
        window.confirm(
          "Changing formation will remove your currently selected players. Continue?"
        );

      if (!confirmed) {
        formationSelect.value =
          grandfatheredFormation ||
          formationSelect.value;

        updateDreamTeamDisplay();

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

    currentUser =
      user;

    refreshLockStatus();


    if (!user) {
      currentUsername =
        "";

      dreamLoginStatus.textContent =
        "You must log in before selecting and submitting a Dream Team.";

      showMessage(
        "Return to the ScoreCast24 home page and log in first.",
        "error"
      );

      await setupViewMyTeamButton(
        null
      );

      updateDreamTeamDisplay();

      return;
    }


    currentUsername =
      await findUsername(
        user
      );

    dreamLoginStatus.textContent =
      `Logged in as ${currentUsername}`;


    /*
      Player files MUST load before a
      submitted squad is restored.
    */

    await loadPlayerFiles();


    /*
      Set up View My Team after currentUser
      exists so round-specific lookup works.
    */

    await setupViewMyTeamButton(
      user
    );


    /*
      PRIORITY 1:

      User arrived from View My Team using
      ?carry=ENTRY_ID.

      Load that exact team.
    */

    if (carryEntryId) {
      const carried =
        await loadCarryEntry();

      if (carried) {
        updateDreamTeamDisplay();
        return;
      }
    }


    /*
      PRIORITY 2:

      User already has a current-round
      submitted Dream Team.

      Load it directly for editing.
    */

    const currentEntryExists =
      await loadExistingDreamTeam();

    if (currentEntryExists) {
      updateDreamTeamDisplay();
      return;
    }


    /*
      PRIORITY 3:

      No current-round entry exists.

      Load last week's eleven automatically
      as the starting squad.

      Firestore remains untouched until the
      user submits the new week's team.
    */

    if (!gameIsLocked) {
      const previousLoaded =
        await loadPreviousDreamTeam();

      if (!previousLoaded) {
        selectedPlayers = [];

        showMessage(
          "Choose your formation and select your Dream Team.",
          ""
        );
      }
    }


    if (gameIsLocked) {
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
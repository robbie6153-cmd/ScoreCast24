import { auth, db } from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  DREAM_CONFIG
} from "./dream-config.js?v=2";


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

const FIRST_LOCK_TIME =
  new Date(DREAM_CONFIG.firstLockTime);

const FIRST_REOPEN_TIME =
  new Date(DREAM_CONFIG.firstReopenTime);

const ONE_WEEK_MS =
  7 * 24 * 60 * 60 * 1000;


/* =========================
   CURRENT GAME STATE
========================= */

let allPlayers = [];
let selectedPlayers = [];

let currentUser = null;
let currentUsername = "";

let gameIsLocked = false;
let playerFilesLoaded = false;
let rolloverPromptOpen = false;
/*
  If an existing team was saved using the old
  round-ID format, keep using that document when
  the user edits and resubmits it.
*/
let currentEntryDocumentId = null;
let currentEntryRoundId = null;

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

const selectedTeam =
  document.getElementById("selectedTeam");

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
   WEEKLY ROUND IDS
========================= */

/*
  The round is identified by its Friday lock date.

  Example:
  2026-gameweek-08-14

  The same round remains active:
  - before Friday while selections are open
  - after Friday while teams are locked
  - through the Monday fixtures
  - until the configured reopen time
*/
function getFridayRoundIdForDate(
  date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-gameweek-${month}-${day}`
  );
}


/*
  Produces the older week-number round ID.

  Existing Firestore documents may still use
  this format, so it must remain supported.
*/
function getLegacyRoundIdForDate(
  date
) {
  const year =
    date.getFullYear();

  const firstDayOfYear =
    new Date(
      year,
      0,
      1
    );

  firstDayOfYear.setHours(
    0,
    0,
    0,
    0
  );

  const comparisonDate =
    new Date(date);

  comparisonDate.setHours(
    0,
    0,
    0,
    0
  );

  const daysSinceFirstDay =
    Math.floor(
      (
        comparisonDate -
        firstDayOfYear
      ) / 86400000
    );

  const weekNumber =
    Math.ceil(
      (
        daysSinceFirstDay +
        firstDayOfYear.getDay() +
        1
      ) / 7
    );

  return (
    `${year}-week-${String(
      weekNumber
    ).padStart(
      2,
      "0"
    )}`
  );
}


/*
  The current round is always anchored to the
  relevant configured Friday lock time.
*/
function getCurrentRoundId() {
  const gameWindow =
    getCurrentGameWindow();

  return getFridayRoundIdForDate(
    gameWindow.lockTime
  );
}


/*
  Returns both possible IDs for the current round:
  1. New Friday-date ID.
  2. Old week-number ID.
*/
function getCurrentRoundIds() {
  const gameWindow =
    getCurrentGameWindow();

  return [
    getFridayRoundIdForDate(
      gameWindow.lockTime
    ),

    getLegacyRoundIdForDate(
      gameWindow.lockTime
    )
  ];
}


/*
  Previous round means the Friday lock date
  exactly seven days before the current round.
*/
function getPreviousRoundIds() {
  const gameWindow =
    getCurrentGameWindow();

  const previousLockTime =
    new Date(
      gameWindow.lockTime.getTime() -
      ONE_WEEK_MS
    );

  return [
    getFridayRoundIdForDate(
      previousLockTime
    ),

    getLegacyRoundIdForDate(
      previousLockTime
    )
  ];
}


/* =========================
   LOCK AND REOPEN TIMES
========================= */
function getCurrentGameWindow(
  now = new Date()
) {
  /*
    Before the very first launch deadline,
    use the configured first round.
  */
  if (now < FIRST_LOCK_TIME) {
    return {
      locked: false,
      lockTime:
        new Date(FIRST_LOCK_TIME),
      reopenTime:
        new Date(FIRST_REOPEN_TIME)
    };
  }

  const elapsed =
    now.getTime() -
    FIRST_LOCK_TIME.getTime();

  const weeklyCycle =
    Math.floor(
      elapsed /
      ONE_WEEK_MS
    );

  let lockTime =
    new Date(
      FIRST_LOCK_TIME.getTime() +
      weeklyCycle *
      ONE_WEEK_MS
    );

  let reopenTime =
    new Date(
      FIRST_REOPEN_TIME.getTime() +
      weeklyCycle *
      ONE_WEEK_MS
    );

  /*
    Between Friday's deadline and the configured
    reopen time, the existing team is locked and
    remains attached to that Friday's gameweek.
  */
  if (
    now >= lockTime &&
    now < reopenTime
  ) {
    return {
      locked: true,
      lockTime,
      reopenTime
    };
  }

  /*
    Once the Monday fixtures have finished and
    the game reopens, move forward to the next
    Friday's selection deadline.

    This fixes the old behaviour where the timer
    continued pointing at a deadline that had
    already passed.
  */
  if (now >= reopenTime) {
    lockTime =
      new Date(
        lockTime.getTime() +
        ONE_WEEK_MS
      );

    reopenTime =
      new Date(
        reopenTime.getTime() +
        ONE_WEEK_MS
      );
  }

  return {
    locked: false,
    lockTime,
    reopenTime
  };
}


function formatDateTime(
  date
) {
  return date.toLocaleString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}
const dreamDeadlineCountdown =
  document.getElementById("dreamDeadlineCountdown");

function updateDeadlineCountdown() {

  if (!dreamDeadlineCountdown) {
    return;
  }

  const gameWindow =
    getCurrentGameWindow();

  const now = new Date();

  const target =
    gameWindow.locked
      ? gameWindow.reopenTime
      : gameWindow.lockTime;

  const difference =
    target - now;

  if (difference <= 0) {
    return;
  }

  const days =
    Math.floor(difference / 86400000);

  const hours =
    Math.floor((difference % 86400000) / 3600000);

  const minutes =
    Math.floor((difference % 3600000) / 60000);

  const seconds =
    Math.floor((difference % 60000) / 1000);

  if (gameWindow.locked) {
    dreamDeadlineCountdown.textContent =
      `🔒 Dream Team locked. Reopens in ${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else {
    dreamDeadlineCountdown.textContent =
      `⏳ Submissions close in ${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}

function refreshLockStatus() {
  const gameWindow =
    getCurrentGameWindow();

  gameIsLocked =
    DREAM_CONFIG.manualLock ||
    gameWindow.locked;

  if (gameIsLocked) {
    if (DREAM_CONFIG.manualLock) {
      showMessage(
        "Dream Team selections are temporarily locked while fixtures are being played.",
        "error"
      );
    } else {
      showMessage(
        DREAM_CONFIG.messages.locked
          .replace(
            "{reopenTime}",
            formatDateTime(
              gameWindow.reopenTime
            )
          ),
        "error"
      );
    }
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
          alreadySelected ||
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
                alreadySelected
                  ? "Selected"
                  : gameIsLocked
                    ? "Locked"
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
          addPlayer(
            button.dataset.playerId
          );
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

  if (
    newRatingTotal >
    MAX_RATING
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
    calculateRatingTotal() <=
      MAX_RATING &&
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
   DISPLAY SELECTED TEAM
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
    totalRating > MAX_RATING
  );

  if (!selectedPlayers.length) {
    selectedTeam.innerHTML = `
      <p>No players selected yet.</p>
    `;
  } else {
    const positionOrder = {
      Goalkeeper: 1,
      Defender: 2,
      Midfielder: 3,
      Attacker: 4
    };

    const orderedPlayers =
      [...selectedPlayers]
        .sort((a, b) => {
          return (
            positionOrder[a.position] -
            positionOrder[b.position]
          );
        });

    selectedTeam.innerHTML =
      orderedPlayers
        .map(player => `
          <article
            class="selected-player-card ${player.position.toLowerCase()}"
          >

            <div>
              <strong>
                ${escapeHtml(player.name)}
              </strong>

              <span>
                ${escapeHtml(player.club)}
                ·
                ${escapeHtml(player.position)}
                ·
                ${player.rating} points
              </span>
            </div>

            <button
              type="button"
              class="remove-player-button"
              data-player-id="${escapeHtml(player.id)}"
              ${gameIsLocked ? "disabled" : ""}
            >
              ${
                gameIsLocked
                  ? "Locked"
                  : "Remove"
              }
            </button>

          </article>
        `)
        .join("");

    document
      .querySelectorAll(
        ".remove-player-button"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            removePlayer(
              button.dataset.playerId
            );
          }
        );
      });
  }

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


function loadEntryIntoEditor(
  savedEntry
) {
  formationSelect.value =
    savedEntry.formation || "";

  const savedPlayers =
    Array.isArray(savedEntry.players)
      ? savedEntry.players
      : [];

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

    showMessage(
      gameIsLocked
        ? DREAM_CONFIG.messages.loadedLocked
        : DREAM_CONFIG.messages.loadedEditable,
      "success"
    );

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

      /*
        Ensure the rollover record knows the
        previous round even on older documents.
      */
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
      const gameWindow =
        getCurrentGameWindow();

      showMessage(
        DREAM_CONFIG.messages.locked
          .replace(
            "{reopenTime}",
            formatDateTime(
              gameWindow.reopenTime
            )
          ),
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
updateDeadlineCountdown();

setInterval(() => {
  refreshLockStatus();
  updateDeadlineCountdown();
}, 1000);
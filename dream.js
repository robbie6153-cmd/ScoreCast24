
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

import { DREAM_CONFIG } from "./dream-config.js?v=8";

/* =========================
   CONFIGURATION
========================= */

const MAX_PLAYERS = DREAM_CONFIG.maxPlayers;
const MAX_RATING = DREAM_CONFIG.maxRating;
const MAX_FROM_ONE_CLUB = DREAM_CONFIG.maxFromOneClub;
const FORMATIONS = DREAM_CONFIG.formations;
const PLAYER_FILES = DREAM_CONFIG.playerFiles;

/* =========================
   CURRENT GAME STATE
========================= */

let allPlayers = [];
let selectedPlayers = [];
let currentUser = null;
let currentUsername = "";
let gameIsLocked = DREAM_CONFIG.manualLock;
let playerFilesLoaded = false;
let playerFilesPromise = null;

// Only set these when editing an actual current-round entry.
// Carrying an old squad into the editor must NOT overwrite that old entry.
let currentEntryDocumentId = null;
let currentEntryRoundId = null;

/* =========================
   URL PARAMETERS
========================= */

const pageParameters = new URLSearchParams(window.location.search);
const carryEntryId = pageParameters.get("carry");
const replacementPlayerId = pageParameters.get("replace");
let replacementModeStarted = false;
let previousFormation = "";

/* =========================
   GRANDFATHERED TEAM
========================= */

// A previously submitted unchanged squad may exceed the current rating
// limit if player ratings subsequently rose. New selections obey the limit.
let grandfatheredPlayerIds = new Set();
let grandfatheredFormation = "";
let hasGrandfatheredTeam = false;

/* =========================
   PAGE ELEMENTS
========================= */

const formationSelect = document.getElementById("formationSelect");
const clubFilter = document.getElementById("clubFilter");
const positionFilter = document.getElementById("positionFilter");
const ratingFilter = document.getElementById("ratingFilter");
const playerSearch = document.getElementById("playerSearch");
const playerList = document.getElementById("playerList");
const selectedCount = document.getElementById("selectedCount");
const ratingTotal = document.getElementById("ratingTotal");
const formationStatus = document.getElementById("formationStatus");
const submitDreamTeamBtn = document.getElementById("submitDreamTeamBtn");
const dreamMessage = document.getElementById("dreamMessage");
const dreamLoginStatus = document.getElementById("dreamLoginStatus");
const viewMyTeamBtn = document.getElementById("viewMyTeamBtn");

/* =========================
   SECURITY AND MESSAGES
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message, type = "") {
  if (!dreamMessage) return;
  dreamMessage.textContent = message;
  dreamMessage.className = `dream-message ${type}`.trim();
}

function clearMessage() {
  showMessage("");
}

/* =========================
   ROUND IDS AND LOCK
========================= */

function getCurrentRoundIds() {
  return [DREAM_CONFIG.currentRoundId];
}

function getPreviousRoundIds() {
  return DREAM_CONFIG.previousRoundId
    ? [DREAM_CONFIG.previousRoundId]
    : [];
}

function refreshLockStatus() {
  gameIsLocked = DREAM_CONFIG.manualLock;

  if (gameIsLocked) {
    showMessage(DREAM_CONFIG.messages.lockedShort, "error");
  }

  updateDreamTeamDisplay();
}

/* =========================
   PLAYER POSITIONS
========================= */

function normalisePosition(position) {
  const value = String(position || "").trim().toLowerCase();
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

  return positionNames[value] || position;
}

/* =========================
   LOAD PLAYER DATABASE
========================= */

async function loadPlayerFiles() {
  if (playerFilesLoaded) return true;
  if (playerFilesPromise) return playerFilesPromise;

  // Share the same request between startup and the login callback.
  playerFilesPromise = (async () => {
    try {
      const responses = await Promise.all(
        PLAYER_FILES.map(fileName => fetch(fileName))
      );

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`Could not load ${response.url}`);
        }
      }

      const playerGroups = await Promise.all(
        responses.map(response => response.json())
      );

      allPlayers = playerGroups
        .flat()
        .filter(player =>
          player.id &&
          player.name &&
          player.club &&
          player.position &&
          Number.isFinite(Number(player.rating))
        )
        .map(player => ({
          ...player,
          position: normalisePosition(player.position),
          rating: Number(player.rating)
        }));

      playerFilesLoaded = true;
      populateClubFilter();
      renderPlayers();
      return true;

    } catch (error) {
      console.error("Player loading error:", error);

      if (playerList) {
        playerList.textContent =
          "The player database could not be loaded. " +
          "Check that all four player files are saved correctly.";
      }

      return false;
    }
  })();

  try {
    return await playerFilesPromise;
  } finally {
    playerFilesPromise = null;
  }
}

/* =========================
   PLAYER FILTERS
========================= */

function populateClubFilter() {
  if (!clubFilter) return;

  const clubs = [...new Set(allPlayers.map(player => player.club))]
    .sort((a, b) => a.localeCompare(b));

  clubFilter.innerHTML = '<option value="ALL">All clubs</option>';

  clubs.forEach(club => {
    const option = document.createElement("option");
    option.value = club;
    option.textContent = club;
    clubFilter.appendChild(option);
  });
}

function getFilteredPlayers() {
  const selectedClub = clubFilter.value;
  const selectedPosition = positionFilter.value === "ALL"
    ? "ALL"
    : normalisePosition(positionFilter.value);
  const selectedRating = ratingFilter.value;
  const searchValue = playerSearch.value.trim().toLowerCase();

  return allPlayers.filter(player => {
    const matchesClub =
      selectedClub === "ALL" || player.club === selectedClub;
    const matchesPosition =
      selectedPosition === "ALL" || player.position === selectedPosition;
    const matchesSearch =
      !searchValue || player.name.toLowerCase().includes(searchValue);

    let matchesRating = true;
    if (selectedRating === "60-69") {
      matchesRating = player.rating >= 60 && player.rating <= 69;
    } else if (selectedRating === "70-79") {
      matchesRating = player.rating >= 70 && player.rating <= 79;
    } else if (selectedRating === "80-89") {
      matchesRating = player.rating >= 80 && player.rating <= 89;
    } else if (selectedRating === "90+") {
      matchesRating = player.rating >= 90;
    }

    return matchesClub && matchesPosition && matchesSearch && matchesRating;
  });
}

/* =========================
   DISPLAY AVAILABLE PLAYERS
========================= */

function renderPlayers() {
  if (!playerList || !playerFilesLoaded) return;

  const filteredPlayers = getFilteredPlayers();

  if (!filteredPlayers.length) {
    playerList.innerHTML = "<p>No matching players found.</p>";
    return;
  }

  playerList.innerHTML = filteredPlayers.map(player => {
    const alreadySelected = selectedPlayers.some(
      selected => String(selected.id) === String(player.id)
    );
    const disabled = gameIsLocked || !currentUser;

    return `
      <article class="player-card ${escapeHtml(player.position.toLowerCase())}">
        <div class="player-card-details">
          <strong>${escapeHtml(player.name)}</strong>
          <span>${escapeHtml(player.club)}</span>
          <span>${escapeHtml(player.position)}</span>
        </div>
        <div class="player-card-rating">${Number(player.rating)}</div>
        <button
          type="button"
          class="add-player-button"
          data-player-id="${escapeHtml(player.id)}"
          ${disabled ? "disabled" : ""}
        >
          ${gameIsLocked ? "Locked" : alreadySelected ? "Remove" : "Add"}
        </button>
      </article>
    `;
  }).join("");

  playerList.querySelectorAll(".add-player-button").forEach(button => {
    button.addEventListener("click", () => {
      const playerId = button.dataset.playerId;
      const alreadySelected = selectedPlayers.some(
        player => String(player.id) === String(playerId)
      );

      if (alreadySelected) {
        removePlayer(playerId);
      } else {
        addPlayer(playerId);
      }
    });
  });
}

/* =========================
   ADD / REMOVE PLAYER
========================= */

function addPlayer(playerId) {
  clearMessage();

  if (gameIsLocked) {
    showMessage(DREAM_CONFIG.messages.lockedShort, "error");
    return;
  }

  const player = allPlayers.find(item => String(item.id) === String(playerId));
  if (!player) {
    showMessage("Player could not be found.", "error");
    return;
  }
  if (!currentUser) {
    showMessage("You must be logged in to select a Dream Team.", "error");
    return;
  }
  if (!formationSelect.value) {
    showMessage("Choose your formation before selecting players.", "error");
    return;
  }
  if (selectedPlayers.length >= MAX_PLAYERS) {
    showMessage(`Your team already contains ${MAX_PLAYERS} players.`, "error");
    return;
  }
  if (selectedPlayers.some(selected => String(selected.id) === String(player.id))) {
    showMessage("You have already selected this player.", "error");
    return;
  }

  const formation = FORMATIONS[formationSelect.value];
  if (!formation) {
    showMessage("Choose a valid formation first.", "error");
    return;
  }

  const positionCount = selectedPlayers.filter(
    selected => selected.position === player.position
  ).length;
  const positionLimit = formation[player.position] ?? 0;

  if (positionCount >= positionLimit) {
    showMessage(
      `Your ${formationSelect.value} formation only allows ` +
      `${positionLimit} ${player.position.toLowerCase()} player` +
      `${positionLimit === 1 ? "" : "s"}.`,
      "error"
    );
    return;
  }

  const clubCount = selectedPlayers.filter(
    selected => selected.club === player.club
  ).length;

  if (clubCount >= MAX_FROM_ONE_CLUB) {
    showMessage(
      `You may only select ${MAX_FROM_ONE_CLUB} players from ${player.club}.`,
      "error"
    );
    return;
  }

  const newRatingTotal = calculateRatingTotal() + player.rating;
  if (
    newRatingTotal > MAX_RATING &&
    !prospectiveSelectionIsGrandfathered(player)
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

function removePlayer(playerId) {
  if (gameIsLocked) {
    showMessage(DREAM_CONFIG.messages.lockedShort, "error");
    return;
  }

  selectedPlayers = selectedPlayers.filter(
    player => String(player.id) !== String(playerId)
  );
  clearMessage();
  updateDreamTeamDisplay();
}

/* =========================
   GRANDFATHERED TEAM
========================= */

function setGrandfatheredTeam(savedEntry) {
  const savedPlayers = Array.isArray(savedEntry?.players)
    ? savedEntry.players
    : [];

  grandfatheredPlayerIds = new Set(
    savedPlayers.map(player => String(player.id || "")).filter(Boolean)
  );
  grandfatheredFormation = String(savedEntry?.formation || "");
  hasGrandfatheredTeam =
    grandfatheredPlayerIds.size === MAX_PLAYERS &&
    Boolean(grandfatheredFormation);
}

function selectedTeamMatchesGrandfathered() {
  if (!hasGrandfatheredTeam) return false;
  if (formationSelect.value !== grandfatheredFormation) return false;
  if (selectedPlayers.length !== MAX_PLAYERS) return false;

  const selectedIds = new Set(selectedPlayers.map(player => String(player.id || "")));
  if (selectedIds.size !== grandfatheredPlayerIds.size) return false;

  return [...grandfatheredPlayerIds].every(id => selectedIds.has(id));
}

function prospectiveSelectionIsGrandfathered(playerToAdd) {
  if (!hasGrandfatheredTeam) return false;
  if (formationSelect.value !== grandfatheredFormation) return false;

  return [...selectedPlayers, playerToAdd].every(player =>
    grandfatheredPlayerIds.has(String(player.id || ""))
  );
}

function ratingLimitIsSatisfied() {
  return calculateRatingTotal() <= MAX_RATING ||
    selectedTeamMatchesGrandfathered();
}

/* =========================
   TEAM VALIDATION
========================= */

function calculateRatingTotal() {
  return selectedPlayers.reduce(
    (total, player) => total + Number(player.rating || 0),
    0
  );
}

function getPositionCounts() {
  return {
    Goalkeeper: selectedPlayers.filter(p => p.position === "Goalkeeper").length,
    Defender: selectedPlayers.filter(p => p.position === "Defender").length,
    Midfielder: selectedPlayers.filter(p => p.position === "Midfielder").length,
    Attacker: selectedPlayers.filter(p => p.position === "Attacker").length
  };
}

function formationIsComplete() {
  const formationName = formationSelect.value;
  const required = FORMATIONS[formationName];
  if (!required) return false;

  const actual = getPositionCounts();
  return Object.keys(required).every(
    position => actual[position] === required[position]
  );
}

function teamIsValid() {
  return Boolean(currentUser) &&
    !gameIsLocked &&
    selectedPlayers.length === MAX_PLAYERS &&
    ratingLimitIsSatisfied() &&
    formationIsComplete();
}

/* =========================
   DISPLAY TEAM SUMMARY
========================= */

function updateControlAvailability() {
  const disabled = !currentUser || gameIsLocked;
  for (const control of [
    formationSelect,
    clubFilter,
    positionFilter,
    ratingFilter,
    playerSearch
  ]) {
    if (control) control.disabled = disabled;
  }
}

function updateDreamTeamDisplay() {
  if (!selectedCount || !ratingTotal || !formationStatus || !submitDreamTeamBtn) {
    return;
  }

  const totalRating = calculateRatingTotal();
  selectedCount.textContent = `${selectedPlayers.length}/${MAX_PLAYERS}`;
  ratingTotal.textContent = `${totalRating}/${MAX_RATING}`;
  formationStatus.textContent = formationSelect.value || "Not selected";

  ratingTotal.classList.toggle(
    "over-budget",
    totalRating > MAX_RATING && !selectedTeamMatchesGrandfathered()
  );

  updateControlAvailability();
  submitDreamTeamBtn.textContent = gameIsLocked
    ? "Team Locked"
    : "Submit Dream Team";
  submitDreamTeamBtn.disabled = !teamIsValid();
  renderPlayers();
}

/* =========================
   SAVE DREAM TEAM
========================= */

async function saveDreamTeamEntry({ players, formation, rolloverFromRound = null }) {
  if (!currentUser) throw new Error("No logged-in user.");

  const roundId = DREAM_CONFIG.currentRoundId;
  if (!roundId) {
    throw new Error("No current Dream Team round has been configured.");
  }

  const entryId = currentEntryDocumentId || `${roundId}_${currentUser.uid}`;
  const entryReference = doc(db, "dream_team_entries", entryId);
  const existingSnapshot = await getDoc(entryReference);

  const entryData = {
    uid: currentUser.uid,
    username: currentUsername,
    email: currentUser.email || "",
    roundId,
    formation,
    ratingTotal: calculateRatingTotal(),
    players: players.map(player => ({
      id: player.id,
      name: player.name,
      club: player.club,
      position: player.position,
      rating: Number(player.rating),
      points: Number(player.points || 0)
    })),
    status: DREAM_CONFIG.manualLock ? "locked" : "submitted",
    submittedAt: serverTimestamp()
  };

  // Do not clear already-scored totals when editing an existing entry.
  if (!existingSnapshot.exists()) {
    entryData.totalPoints = 0;
  }

  if (rolloverFromRound) {
    entryData.rolloverFromRound = rolloverFromRound;
  }

  await setDoc(entryReference, entryData, { merge: true });
  currentEntryDocumentId = entryId;
  currentEntryRoundId = roundId;
}

/* =========================
   FIRESTORE ENTRY LOOKUP
========================= */

async function getEntryForRoundIds(roundIds) {
  if (!currentUser) return null;

  for (const roundId of roundIds) {
    const entryId = `${roundId}_${currentUser.uid}`;
    const entrySnapshot = await getDoc(doc(db, "dream_team_entries", entryId));

    if (entrySnapshot.exists()) {
      return {
        id: entrySnapshot.id,
        roundId,
        data: entrySnapshot.data()
      };
    }
  }

  return null;
}

/* =========================
   LOAD SAVED TEAM INTO EDITOR
========================= */

function loadEntryIntoEditor(savedEntry) {
  setGrandfatheredTeam(savedEntry);
  formationSelect.value = savedEntry.formation || "";
  previousFormation = formationSelect.value;

  const savedPlayers = Array.isArray(savedEntry.players)
    ? savedEntry.players
    : [];

  // Use up-to-date player details when available; keep saved players if
  // removed from the player database so a team does not lose members.
  selectedPlayers = savedPlayers.map(savedPlayer => {
    const currentPlayer = allPlayers.find(
      player => String(player.id) === String(savedPlayer.id)
    );

    if (currentPlayer) return currentPlayer;

    return {
      ...savedPlayer,
      position: normalisePosition(savedPlayer.position),
      rating: Number(savedPlayer.rating || 0)
    };
  }).filter(Boolean);

  updateDreamTeamDisplay();
}

/* =========================
   LOAD ENTRY FROM ?carry=
========================= */

async function loadCarryEntry() {
  if (!carryEntryId || !currentUser) return false;

  try {
    const entrySnapshot = await getDoc(
      doc(db, "dream_team_entries", carryEntryId)
    );

    if (!entrySnapshot.exists()) {
      console.error("Carry entry does not exist:", carryEntryId);
      return false;
    }

    const entryData = entrySnapshot.data();
    if (entryData.uid && entryData.uid !== currentUser.uid) {
      console.error("Carry entry belongs to another user.");
      showMessage("That Dream Team does not belong to your account.", "error");
      return false;
    }

    const entryRoundId = entryData.roundId || "";
    if (entryRoundId === DREAM_CONFIG.currentRoundId) {
      currentEntryDocumentId = entrySnapshot.id;
      currentEntryRoundId = entryRoundId;
    } else {
      currentEntryDocumentId = null;
      currentEntryRoundId = null;
    }

    loadEntryIntoEditor(entryData);

    if (replacementPlayerId && !replacementModeStarted && !gameIsLocked) {
      startReplacementMode();
    } else {
      showMessage(
        entryRoundId === DREAM_CONFIG.currentRoundId
          ? "Your current Dream Team has been loaded. Remove any players you want to change, choose replacements, then submit the updated team."
          : "Your previous Dream Team has been loaded. Remove any players you want to change, choose replacements, then submit your new weekly team.",
        "success"
      );
    }

    return true;
  } catch (error) {
    console.error("Could not load carried Dream Team:", error);
    return false;
  }
}

/* =========================
   REPLACE A PLAYER
========================= */

function startReplacementMode() {
  if (replacementModeStarted || !replacementPlayerId) return;

  const playerToReplace = selectedPlayers.find(
    player => String(player.id) === String(replacementPlayerId)
  );

  if (!playerToReplace) {
    showMessage(
      "The selected player could not be found in your current squad.",
      "error"
    );
    return;
  }

  replacementModeStarted = true;
  selectedPlayers = selectedPlayers.filter(
    player => String(player.id) !== String(replacementPlayerId)
  );
  updateDreamTeamDisplay();

  showMessage(
    `${playerToReplace.name} has been removed from the editor. ` +
    "Choose a replacement and submit your updated Dream Team.",
    "success"
  );
}

/* =========================
   LOAD CURRENT DREAM TEAM
========================= */

async function loadExistingDreamTeam() {
  try {
    const savedResult = await getEntryForRoundIds(getCurrentRoundIds());
    if (!savedResult) {
      currentEntryDocumentId = null;
      currentEntryRoundId = null;
      return false;
    }

    currentEntryDocumentId = savedResult.id;
    currentEntryRoundId = savedResult.data.roundId || savedResult.roundId;
    loadEntryIntoEditor(savedResult.data);

    if (replacementPlayerId && !gameIsLocked) {
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
    console.error("Could not load existing Dream Team:", error);
    return false;
  }
}

/* =========================
   LOAD PREVIOUS DREAM TEAM
========================= */

async function loadPreviousDreamTeam() {
  if (!currentUser || gameIsLocked) return false;

  try {
    const previousResult = await getEntryForRoundIds(getPreviousRoundIds());
    if (!previousResult) return false;

    const previousEntry = {
      ...previousResult.data,
      roundId: previousResult.data.roundId || previousResult.roundId
    };

    // Old squad is a working copy only; never edit its Firestore document.
    currentEntryDocumentId = null;
    currentEntryRoundId = null;
    loadEntryIntoEditor(previousEntry);

    if (replacementPlayerId && !replacementModeStarted) {
      startReplacementMode();
    } else {
      showMessage(
        "Your previous Dream Team has been loaded. " +
        "Remove any players you want to change, choose their replacements, " +
        "then submit your team.",
        "success"
      );
    }

    return true;
  } catch (error) {
    console.error("Could not load previous Dream Team:", error);
    return false;
  }
}

/* =========================
   LOAD MOST RECENT DREAM TEAM
========================= */

async function loadMostRecentDreamTeam() {
  if (!currentUser || gameIsLocked) return false;

  try {
    const snapshot = await getDocs(collection(db, "dream_team_entries"));
    const entries = snapshot.docs
      .map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }))
      .filter(entry =>
        entry.uid === currentUser.uid ||
        String(entry.id || "").includes(currentUser.uid)
      )
      .filter(entry =>
        String(entry.roundId || "") !== String(DREAM_CONFIG.currentRoundId)
      );

    if (!entries.length) return false;

    entries.sort((a, b) =>
      Number(b.submittedAt?.seconds || 0) -
      Number(a.submittedAt?.seconds || 0)
    );

    // Never point an edited new-week team at an older document.
    currentEntryDocumentId = null;
    currentEntryRoundId = null;
    loadEntryIntoEditor(entries[0]);

    showMessage(
      "Your most recent Dream Team has been loaded. " +
      "Remove any players you want to change, choose replacements, " +
      "then submit your new weekly team.",
      "success"
    );

    return true;
  } catch (error) {
    console.error("Could not load most recent Dream Team:", error);
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
    showMessage(DREAM_CONFIG.messages.lockedShort, "error");
    return;
  }
  if (!currentUser) {
    showMessage("You must be logged in to submit a team.", "error");
    return;
  }
  if (!teamIsValid()) {
    showMessage(DREAM_CONFIG.messages.invalidTeam, "error");
    return;
  }

  submitDreamTeamBtn.disabled = true;
  submitDreamTeamBtn.textContent = "Submitting...";

  try {
    await saveDreamTeamEntry({
      players: selectedPlayers,
      formation: formationSelect.value
    });
    completeSubmission();
  } catch (error) {
    console.error("Dream Team submission failed:", error);
    showMessage(DREAM_CONFIG.messages.submitError, "error");
  } finally {
    submitDreamTeamBtn.textContent = gameIsLocked
      ? "Team Locked"
      : "Submit Dream Team";
    submitDreamTeamBtn.disabled = !teamIsValid();
  }
}

function completeSubmission() {
  sessionStorage.setItem("dreamTeamSubmittedUsername", currentUsername);
  window.location.href = "./dream-leaderboard.html";
}

/* =========================
   USERNAME
========================= */

async function findUsername(user) {
  const localUsername = localStorage.getItem("scorecast24Username");
  if (localUsername) return localUsername;

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      return userData.username || user.email || "ScoreCast24 Player";
    }
  } catch (error) {
    console.error("Username lookup failed:", error);
  }

  return user.email || "ScoreCast24 Player";
}

/* =========================
   VIEW MY TEAM BUTTON
========================= */

async function setupViewMyTeamButton(user) {
  if (!viewMyTeamBtn) return;

  if (!user) {
    viewMyTeamBtn.href = "index.html";
    viewMyTeamBtn.textContent = "Log In to View My Team";
    return;
  }

  viewMyTeamBtn.textContent = "Loading My Team...";
  viewMyTeamBtn.removeAttribute("href");

  try {
    // Current round first.
    const currentResult = await getEntryForRoundIds(getCurrentRoundIds());
    if (currentResult) {
      viewMyTeamBtn.href =
        `dream-team-view.html?id=${encodeURIComponent(currentResult.id)}`;
      viewMyTeamBtn.textContent = "View My Team";
      return;
    }

    // Previous round if the user has not submitted a current-round entry.
    const previousResult = await getEntryForRoundIds(getPreviousRoundIds());
    if (previousResult) {
      viewMyTeamBtn.href =
        `dream-team-view.html?id=${encodeURIComponent(previousResult.id)}`;
      viewMyTeamBtn.textContent = "View My Team";
      return;
    }

    // Fallback for older/nonstandard entry IDs.
    const snapshot = await getDocs(collection(db, "dream_team_entries"));
    const entries = snapshot.docs
      .map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }))
      .filter(entry =>
        entry.uid === user.uid ||
        String(entry.id || "").includes(user.uid)
      );

    if (!entries.length) {
      viewMyTeamBtn.href = "#";
      viewMyTeamBtn.textContent = "No Team Selected Yet";
      return;
    }

    entries.sort((a, b) =>
      Number(b.submittedAt?.seconds || 0) -
      Number(a.submittedAt?.seconds || 0)
    );

    viewMyTeamBtn.href =
      `dream-team-view.html?id=${encodeURIComponent(entries[0].id)}`;
    viewMyTeamBtn.textContent = "View My Team";
  } catch (error) {
    console.error("View My Team error:", error);
    viewMyTeamBtn.href = "#";
    viewMyTeamBtn.textContent = "View My Team";
  }
}

/* =========================
   PAGE EVENTS
========================= */

if (formationSelect) {
  previousFormation = formationSelect.value;

  formationSelect.addEventListener("change", () => {
    if (gameIsLocked) {
      showMessage(DREAM_CONFIG.messages.lockedShort, "error");
      formationSelect.value = previousFormation;
      return;
    }

    if (selectedPlayers.length > 0) {
      const confirmed = window.confirm(
        "Changing formation will remove your currently selected players. Continue?"
      );

      if (!confirmed) {
        formationSelect.value = previousFormation;
        updateDreamTeamDisplay();
        return;
      }

      selectedPlayers = [];
    }

    previousFormation = formationSelect.value;
    clearMessage();
    updateDreamTeamDisplay();
  });
}

if (clubFilter) clubFilter.addEventListener("change", renderPlayers);
if (positionFilter) positionFilter.addEventListener("change", renderPlayers);
if (ratingFilter) ratingFilter.addEventListener("change", renderPlayers);
if (playerSearch) playerSearch.addEventListener("input", renderPlayers);

if (submitDreamTeamBtn) {
  submitDreamTeamBtn.addEventListener("click", event => {
    event.preventDefault();
    submitDreamTeam();
  });
}

/* =========================
   LOGIN
========================= */

onAuthStateChanged(auth, async user => {
  currentUser = user;
  refreshLockStatus();

  if (!user) {
    currentUsername = "";

    if (dreamLoginStatus) {
      dreamLoginStatus.textContent =
        "You must log in before selecting and submitting a Dream Team.";
    }

    showMessage(
      "Return to the ScoreCast24 home page and log in first.",
      "error"
    );
    await setupViewMyTeamButton(null);
    updateDreamTeamDisplay();
    return;
  }

  currentUsername = await findUsername(user);
  if (dreamLoginStatus) {
    dreamLoginStatus.textContent = `Logged in as ${currentUsername}`;
  }

  const playersLoaded = await loadPlayerFiles();
  if (!playersLoaded) {
    showMessage("Unable to load the player database.", "error");
    return;
  }

  await setupViewMyTeamButton(user);

  // Priority 1: an explicitly requested entry to carry or edit.
  if (carryEntryId) {
    const carried = await loadCarryEntry();
    if (carried) {
      updateDreamTeamDisplay();
      return;
    }
  }

  // Priority 2: the current week's actual Firestore entry.
  const currentEntryExists = await loadExistingDreamTeam();
  if (currentEntryExists) {
    updateDreamTeamDisplay();
    return;
  }

  // Priority 3: last week's squad as an unsaved working copy.
  if (!gameIsLocked) {
    const previousLoaded = await loadPreviousDreamTeam();

    if (!previousLoaded) {
      const recentLoaded = await loadMostRecentDreamTeam();
      if (!recentLoaded) {
        selectedPlayers = [];
        showMessage("Choose your formation and select your Dream Team.");
      }
    }
  }

  if (gameIsLocked) {
    showMessage(DREAM_CONFIG.messages.lockedShort, "error");
  }

  updateDreamTeamDisplay();
});

/* =========================
   STARTUP
========================= */

loadPlayerFiles();
refreshLockStatus();

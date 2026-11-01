
import { auth, db } from "./firebase.js?v=108";
import { DREAM_CONFIG } from "./dream-config.js?v=8";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

/* =====================================================
   CONFIGURATION
===================================================== */

const PLAYER_FILES = [
  { file: "goalkeepers.json", elementId: "goalkeepers", position: "Goalkeeper" },
  { file: "defenders.json", elementId: "defenders", position: "Defender" },
  { file: "midfielders.json", elementId: "midfielders", position: "Midfielder" },
  { file: "attackers.json", elementId: "attackers", position: "Attacker" }
];

const MAX_TEAM_RATING = DREAM_CONFIG.maxRating;
const MAX_PLAYERS = DREAM_CONFIG.maxPlayers;
const MAX_FROM_ONE_CLUB = DREAM_CONFIG.maxFromOneClub;
const FORMATIONS = DREAM_CONFIG.formations;

const currentRoundId = DREAM_CONFIG.currentRoundId;
const previousRoundId = DREAM_CONFIG.previousRoundId;

/* =====================================================
   PAGE ELEMENTS
===================================================== */

const element = id => document.getElementById(id);

const dreamTeamViewTitle = element("dreamTeamViewTitle");
const dreamTeamViewStatus = element("dreamTeamViewStatus");
const dreamTeamSummary = element("dreamTeamSummary");
const viewDreamUsername = element("viewDreamUsername");
const viewDreamFormation = element("viewDreamFormation");
const formationChangeBtn = element("formationChangeBtn");
const formationChangeMenu = element("formationChangeMenu");
const viewDreamRating = element("viewDreamRating");
const viewDreamPoints = element("viewDreamPoints");
const viewDreamTeamPlayers = element("viewDreamTeamPlayers");
const attackerFormationRow = element("attackerFormationRow");
const midfielderFormationRow = element("midfielderFormationRow");
const defenderFormationRow = element("defenderFormationRow");
const goalkeeperFormationRow = element("goalkeeperFormationRow");
const backToTeamSelection = element("backToTeamSelection");
const databasePlayerSearch = element("databasePlayerSearch");
const databasePositionFilter = element("databasePositionFilter");
const databaseClubFilter = element("databaseClubFilter");
const clearDatabaseFilters = element("clearDatabaseFilters");
const submitDreamTeamBtn = element("submitDreamTeamBtn");

/* =====================================================
   CURRENT STATE
===================================================== */

let currentEntry = null;
let currentEntryId = "";
let isOwnTeam = false;
let isUnsavedRollover = false;

let holdTimer = null;
let heldPlayerKey = "";

let allDatabasePlayers = [];
let scoreDocuments = [];

let previousEntry = null;
let previousRoundPlayerKeys = new Set();

let playerScoresByApiId = new Map();
let apiIdByPlayerName = new Map();
let apiIdByClubAndName = new Map();
let fallbackScoresByName = new Map();
let fallbackScoresByClubAndName = new Map();

let loadingStarted = false;

/* =====================================================
   HELPERS
===================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseText(value) {
  return String(value || "")
    .replace(/Ø/g, "O")
    .replace(/ø/g, "o")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .replace(/Ð/g, "D")
    .replace(/ð/g, "d")
    .replace(/Þ/g, "Th")
    .replace(/þ/g, "th")
    .replace(/Æ/g, "Ae")
    .replace(/æ/g, "ae")
    .replace(/Œ/g, "Oe")
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normaliseClubName(value) {
  const club = normaliseText(value);

  const aliases = {
    ipswich: "ipswichtown",
    ipswichtown: "ipswichtown",
    newcastle: "newcastleunited",
    newcastleunited: "newcastleunited",
    wolves: "wolverhamptonwanderers",
    wolverhampton: "wolverhamptonwanderers",
    wolverhamptonwanderers: "wolverhamptonwanderers",
    spurs: "tottenhamhotspur",
    tottenham: "tottenhamhotspur",
    tottenhamhotspur: "tottenhamhotspur",
    manutd: "manchesterunited",
    manchesterunited: "manchesterunited",
    mancity: "manchestercity",
    manchestercity: "manchestercity"
  };

  return aliases[club] || club;
}

function makePlayerKey(club, name) {
  return `${normaliseClubName(club)}|${normaliseText(name)}`;
}

function makeNameKey(name) {
  return normaliseText(name);
}

function makeRosterPlayerKey(player) {
  if (
    player?.apiPlayerId != null &&
    player.apiPlayerId !== ""
  ) {
    return `api:${String(player.apiPlayerId)}`;
  }

  return `player:${makePlayerKey(player?.club, player?.name)}`;
}

/* =====================================================
   API PLAYER MATCHING
===================================================== */

function getApiPlayerId(player) {
  if (!player) return "";

  if (
    player.apiPlayerId != null &&
    player.apiPlayerId !== ""
  ) {
    return String(player.apiPlayerId);
  }

  const exact = apiIdByClubAndName.get(
    makePlayerKey(player.club, player.name)
  );

  if (exact) return exact;

  const matches = apiIdByPlayerName.get(
    makeNameKey(player.name)
  );

  return matches?.size === 1
    ? [...matches][0]
    : "";
}

/* =====================================================
   PLAYER SCORING
===================================================== */

function getPlayerScores(player) {
  const apiId = getApiPlayerId(player);

  if (
    apiId &&
    playerScoresByApiId.has(apiId)
  ) {
    return playerScoresByApiId.get(apiId);
  }

  const exactKey = makePlayerKey(
    player.club,
    player.name
  );

  if (fallbackScoresByClubAndName.has(exactKey)) {
    return fallbackScoresByClubAndName.get(exactKey);
  }

  const nameKey = makeNameKey(player.name);

  return fallbackScoresByName.get(nameKey) || {
    weekScore: 0,
    overallScore: 0
  };
}

function getPlayerScoreForRound(player, roundId) {
  if (!roundId) return 0;

  const roundScores = scoreDocuments.filter(
    score => score.roundId === roundId
  );

  const apiId = getApiPlayerId(player);

  if (apiId) {
    const found = roundScores.find(
      score =>
        String(score.apiPlayerId ?? "") === apiId
    );

    if (found) {
      return Number(found.weekScore || 0);
    }
  }

  const exactKey = makePlayerKey(
    player.club,
    player.name
  );

  const exact = roundScores.find(
    score =>
      makePlayerKey(
        score.club,
        score.playerName
      ) === exactKey
  );

  if (exact) {
    return Number(exact.weekScore || 0);
  }

  const nameMatches = roundScores.filter(
    score =>
      makeNameKey(score.playerName) ===
      makeNameKey(player.name)
  );

  return nameMatches.length === 1
    ? Number(nameMatches[0].weekScore || 0)
    : 0;
}

/* =====================================================
   LOAD PLAYER SCORES

   Weekly points always refer to the configured
   current round.

   Overall points include all scored rounds.
===================================================== */

async function loadPlayerScores() {
  const snapshot = await getDocs(
    collection(db, "dream_team_player_scores")
  );

  scoreDocuments = snapshot.docs
    .map(snapshotDoc => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data()
    }))
    .filter(score =>
      score.roundId &&
      score.playerName
    );

  playerScoresByApiId = new Map();
  apiIdByPlayerName = new Map();
  apiIdByClubAndName = new Map();
  fallbackScoresByName = new Map();
  fallbackScoresByClubAndName = new Map();

  const validScores = scoreDocuments.filter(
    score =>
      /^2026-week-\d+$/.test(
        String(score.roundId)
      )
  );

  for (const score of validScores) {
    const points = Number(score.weekScore || 0);

    const apiId =
      score.apiPlayerId != null &&
      score.apiPlayerId !== ""
        ? String(score.apiPlayerId)
        : "";

    const exactKey = makePlayerKey(
      score.club,
      score.playerName
    );

    const nameKey = makeNameKey(
      score.playerName
    );

    const isCurrent =
      score.roundId === currentRoundId;

    if (apiId) {
      apiIdByClubAndName.set(
        exactKey,
        apiId
      );

      if (!apiIdByPlayerName.has(nameKey)) {
        apiIdByPlayerName.set(
          nameKey,
          new Set()
        );
      }

      apiIdByPlayerName
        .get(nameKey)
        .add(apiId);

      if (!playerScoresByApiId.has(apiId)) {
        playerScoresByApiId.set(apiId, {
          weekScore: 0,
          overallScore: 0
        });
      }

      const totals =
        playerScoresByApiId.get(apiId);

      totals.overallScore += points;

      if (isCurrent) {
        totals.weekScore += points;
      }
    }

    for (const [map, key] of [
      [fallbackScoresByClubAndName, exactKey],
      [fallbackScoresByName, nameKey]
    ]) {
      if (!map.has(key)) {
        map.set(key, {
          weekScore: 0,
          overallScore: 0
        });
      }

      const totals = map.get(key);

      totals.overallScore += points;

      if (isCurrent) {
        totals.weekScore += points;
      }
    }
  }
}

/* =====================================================
   LOAD PLAYER DATABASE
===================================================== */

async function loadPlayerFiles() {
  const loaded = [];

  for (const playerFile of PLAYER_FILES) {
    try {
      const response = await fetch(
        `${playerFile.file}?v=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error(
          `Could not load ${playerFile.file}`
        );
      }

      const players = await response.json();

      if (!Array.isArray(players)) {
        continue;
      }

      for (const player of players) {
        loaded.push({
          ...player,
          position:
            player.position ||
            playerFile.position,
          databasePosition:
            playerFile.position,
          elementId:
            playerFile.elementId
        });
      }
    } catch (error) {
      console.error(
        "Player file loading error:",
        error
      );
    }
  }

  allDatabasePlayers = loaded;
}

/* =====================================================
   API MATCH AUDIT
===================================================== */

function auditPlayerApiMatching() {
  let matched = 0;

  const databaseApiIds = new Set();
  const unmatched = [];

  for (const player of allDatabasePlayers) {
    const id = getApiPlayerId(player);

    if (id) {
      matched++;
      databaseApiIds.add(String(id));
    } else {
      unmatched.push({
        name: player.name,
        club: player.club,
        position: player.databasePosition
      });
    }
  }

  const scoredApiPlayers = new Map();

  for (const score of scoreDocuments) {
    if (
      score.apiPlayerId == null ||
      score.apiPlayerId === ""
    ) {
      continue;
    }

    const id = String(score.apiPlayerId);

    if (!scoredApiPlayers.has(id)) {
      scoredApiPlayers.set(id, {
        apiPlayerId: id,
        name: score.playerName,
        club: score.club
      });
    }
  }

  const scoredButUnmatched =
    [...scoredApiPlayers]
      .filter(([id]) => !databaseApiIds.has(id))
      .map(([, player]) => player);

  console.log("DREAM TEAM API MATCH AUDIT");
  console.log("Database players:", allDatabasePlayers.length);
  console.log("Matched to API ID:", matched);
  console.log("Not yet matched:", unmatched.length);
  console.log("API players with scores:", scoredApiPlayers.size);
  console.log("SCORED BUT UNMATCHED:", scoredButUnmatched.length);

  if (scoredButUnmatched.length) {
    console.table(scoredButUnmatched);
  }
}

/* =====================================================
   DATABASE FILTERS
===================================================== */

function populateClubFilter() {
  if (!databaseClubFilter) return;

  const clubs = [
    ...new Set(
      allDatabasePlayers
        .map(p => p.club)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  databaseClubFilter.innerHTML =
    '<option value="ALL">All clubs</option>';

  for (const club of clubs) {
    const option = document.createElement("option");

    option.value = club;
    option.textContent = club;

    databaseClubFilter.appendChild(option);
  }
}

function getFilteredPlayers() {
  const search = normaliseText(
    databasePlayerSearch?.value || ""
  );

  const position =
    databasePositionFilter?.value || "ALL";

  const club =
    databaseClubFilter?.value || "ALL";

  return allDatabasePlayers.filter(
    player =>
      (
        !search ||
        normaliseText(player.name).includes(search)
      ) &&
      (
        position === "ALL" ||
        player.databasePosition === position
      ) &&
      (
        club === "ALL" ||
        player.club === club
      )
  );
}

/* =====================================================
   DISPLAY DATABASE PLAYERS
===================================================== */

function displayPositionPlayers(elementId, players) {
  const container = element(elementId);

  if (!container) return;

  container.innerHTML = "";

  if (!players.length) {
    container.innerHTML = `
      <p class="leaderboard-empty-message">
        No matching players.
      </p>
    `;
    return;
  }

  const sorted = [...players].sort(
    (a, b) =>
      String(a.club || "").localeCompare(
        String(b.club || "")
      ) ||
      String(a.name || "").localeCompare(
        String(b.name || "")
      )
  );

  for (const player of sorted) {
    const scores = getPlayerScores(player);

    const row = document.createElement("button");

    row.type = "button";
    row.className = "player-database-row";
    row.disabled = !isOwnTeam;

    row.innerHTML = `
      <div class="database-player-main">
        <strong class="database-player-name">
          ${escapeHtml(player.name)}
        </strong>
        <span class="database-player-club">
          ${escapeHtml(player.club)}
        </span>
      </div>

      <div class="database-player-stats">
        <span class="database-player-rating">
          Rating:
          <strong>${Number(player.rating || 0)}</strong>
        </span>

        <span>
          Week:
          <strong>${Number(scores.weekScore || 0)}</strong>
        </span>

        <span>
          Overall:
          <strong>${Number(scores.overallScore || 0)}</strong>
        </span>
      </div>
    `;

    row.addEventListener("click", () => {
      if (!isOwnTeam) return;

      if (
        window.confirm(
          `Add ${player.name} to squad?`
        )
      ) {
        addPlayerToSquad(player);
      }
    });

    container.appendChild(row);
  }
}

function renderPlayerDatabase() {
  const filtered = getFilteredPlayers();

  for (const file of PLAYER_FILES) {
    const players = filtered.filter(
      player =>
        player.databasePosition === file.position
    );

    const section = document.querySelector(
      `.player-database-position-section[data-position="${file.position}"]`
    );

    if (section) {
      section.hidden = players.length === 0;
    }

    displayPositionPlayers(
      file.elementId,
      players
    );
  }
}

function setupDatabaseFilterEvents() {
  databasePlayerSearch?.addEventListener(
    "input",
    renderPlayerDatabase
  );

  databasePositionFilter?.addEventListener(
    "change",
    renderPlayerDatabase
  );

  databaseClubFilter?.addEventListener(
    "change",
    renderPlayerDatabase
  );

  clearDatabaseFilters?.addEventListener(
    "click",
    () => {
      if (databasePlayerSearch) {
        databasePlayerSearch.value = "";
      }

      if (databasePositionFilter) {
        databasePositionFilter.value = "ALL";
      }

      if (databaseClubFilter) {
        databaseClubFilter.value = "ALL";
      }

      renderPlayerDatabase();
    }
  );
}

/* =====================================================
   ADD PLAYER TO SQUAD
===================================================== */

function addPlayerToSquad(player) {
  if (!isOwnTeam || DREAM_CONFIG.manualLock) {
    window.alert(
      "Dream Team selections are currently locked or this is not your team."
    );
    return;
  }

  if (!currentEntry) return;

  if (!Array.isArray(currentEntry.players)) {
    currentEntry.players = [];
  }

  if (currentEntry.players.length >= MAX_PLAYERS) {
    window.alert(
      `Your squad already has ${MAX_PLAYERS} players. Remove one first.`
    );
    return;
  }

  const key = makePlayerKey(
    player.club,
    player.name
  );

  if (
    currentEntry.players.some(
      p => makePlayerKey(p.club, p.name) === key
    )
  ) {
    window.alert(
      `${player.name} is already in your squad.`
    );
    return;
  }

  const clubCount = currentEntry.players.filter(
    p => p.club === player.club
  ).length;

  if (clubCount >= MAX_FROM_ONE_CLUB) {
    window.alert(
      `You may only select ${MAX_FROM_ONE_CLUB} players from ${player.club}.`
    );
    return;
  }

  const formation =
    FORMATIONS[currentEntry.formation];

  if (!formation) {
    window.alert("Choose a valid formation first.");
    return;
  }

  const positionCount =
    currentEntry.players.filter(
      p => p.position === player.position
    ).length;

  const limit = Number(
    formation[player.position] || 0
  );

  if (positionCount >= limit) {
    window.alert(
      `Your ${currentEntry.formation} formation only allows ${limit} ${player.position.toLowerCase()} players.`
    );
    return;
  }

  const total = currentEntry.players.reduce(
    (sum, p) =>
      sum + Number(p.rating || 0),
    0
  );

  if (
    total + Number(player.rating || 0) >
    MAX_TEAM_RATING
  ) {
    window.alert(
      `Adding this player exceeds the ${MAX_TEAM_RATING} rating limit.`
    );
    return;
  }

  const apiPlayerId = getApiPlayerId(player);

  const withApiId = {
    ...player,
    apiPlayerId:
      apiPlayerId ||
      player.apiPlayerId ||
      null
  };

  const scores = getPlayerScores(withApiId);

  const isNew =
    Boolean(previousEntry) &&
    !previousRoundPlayerKeys.has(
      makeRosterPlayerKey(withApiId)
    );

  currentEntry.players.push({
    ...withApiId,
    weeklyPoints:
      getPlayerScoreForRound(
        withApiId,
        currentEntry.roundId
      ),
    overallPoints:
      scores.overallScore,
    isNew
  });

  renderFormation(currentEntry.players);
  renderPlayers(currentEntry.players);
  updateSquadSummary();
  renderPlayerDatabase();
}

/* =====================================================
   REMOVE PLAYER
===================================================== */

function removePlayerFromSquad(playerKey) {
  if (!isOwnTeam || DREAM_CONFIG.manualLock) {
    return;
  }

  if (!Array.isArray(currentEntry?.players)) {
    return;
  }

  const player = currentEntry.players.find(
    p =>
      makePlayerKey(p.club, p.name) === playerKey
  );

  if (!player) return;

  if (
    !window.confirm(
      `Remove ${player.name} from squad?`
    )
  ) {
    return;
  }

  currentEntry.players =
    currentEntry.players.filter(
      p =>
        makePlayerKey(p.club, p.name) !== playerKey
    );

  renderFormation(currentEntry.players);
  renderPlayers(currentEntry.players);
  updateSquadSummary();
  renderPlayerDatabase();
}

/* =====================================================
   ERROR DISPLAY
===================================================== */

function showError(message) {
  if (dreamTeamViewTitle) {
    dreamTeamViewTitle.textContent =
      "Dream Team Unavailable";
  }

  if (dreamTeamViewStatus) {
    dreamTeamViewStatus.textContent = message;
  }

  if (dreamTeamSummary) {
    dreamTeamSummary.hidden = true;
  }

  if (viewDreamTeamPlayers) {
    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        ${escapeHtml(message)}
      </p>
    `;
  }
}

/* =====================================================
   PLAYER ORDER AND LIST
===================================================== */

function orderPlayers(players) {
  const order = {
    Goalkeeper: 1,
    Defender: 2,
    Midfielder: 3,
    Attacker: 4
  };

  return [...players].sort(
    (a, b) =>
      (order[a.position] || 99) -
      (order[b.position] || 99) ||
      String(a.name || "").localeCompare(
        String(b.name || "")
      )
  );
}

function renderPlayers(players) {
  if (!viewDreamTeamPlayers) return;

  if (
    !Array.isArray(players) ||
    !players.length
  ) {
    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        No players currently selected.
      </p>
    `;
    return;
  }

  viewDreamTeamPlayers.innerHTML =
    orderPlayers(players).map(
      player => `
        <article class="selected-player-card ${escapeHtml(
          String(player.position || "").toLowerCase()
        )}">
          <div class="selected-player-info">
            <strong>
              ${escapeHtml(player.name || "Unknown player")}
              ${
                player.isNew
                  ? '<span class="new-player-marker">↑ (NEW)</span>'
                  : ""
              }
            </strong>

            <span>
              ${escapeHtml(player.club || "Unknown club")}
              ·
              ${escapeHtml(player.position || "Unknown position")}
              ·
              ${Number(player.rating || 0)} rating
            </span>
          </div>
        </article>
      `
    ).join("");
}

/* =====================================================
   FORMATION PLAYER DISPLAY
===================================================== */

function createFormationPlayer(player) {
  const key = makePlayerKey(
    player.club,
    player.name
  );

  const position = String(
    player.position || ""
  ).trim().toLowerCase();

  return `
    <div
      class="formation-player"
      data-player-key="${escapeHtml(key)}"
    >
      <div class="formation-player-name">
        ${escapeHtml(player.name || "Unknown player")}

        ${
          player.isNew
            ? '<span class="new-player-marker">↑ (NEW)</span>'
            : ""
        }
      </div>

      <div class="formation-player-score">
        ${Number(player.weeklyPoints || 0)}/${Number(player.overallPoints || 0)}
      </div>

      <div class="formation-player-club">
        (${escapeHtml(player.club || "Unknown club")})
      </div>

      <div
        class="formation-player-dot ${escapeHtml(position)}"
        title="${escapeHtml(
          `${player.name || ""} - ${player.club || ""}`
        )}"
      ></div>
    </div>
  `;
}

/* =====================================================
   RENDER FORMATION
===================================================== */

function renderFormation(players) {
  if (
    !attackerFormationRow ||
    !midfielderFormationRow ||
    !defenderFormationRow ||
    !goalkeeperFormationRow
  ) {
    return;
  }

  const safePlayers =
    Array.isArray(players) ? players : [];

  for (const [position, container] of [
    ["Goalkeeper", goalkeeperFormationRow],
    ["Defender", defenderFormationRow],
    ["Midfielder", midfielderFormationRow],
    ["Attacker", attackerFormationRow]
  ]) {
    container.innerHTML =
      safePlayers
        .filter(p => p.position === position)
        .map(createFormationPlayer)
        .join("");
  }

  enablePlayerHoldRemoval();
}

/* =====================================================
   HOLD PLAYER TO REMOVE
===================================================== */

function enablePlayerHoldRemoval() {
  if (!isOwnTeam || DREAM_CONFIG.manualLock) {
    return;
  }

  document.querySelectorAll(
    ".formation-player"
  ).forEach(playerElement => {
    const cancelHold = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
      heldPlayerKey = "";
    };

    playerElement.addEventListener(
      "pointerdown",
      event => {
        event.preventDefault();

        heldPlayerKey =
          playerElement.dataset.playerKey || "";

        clearTimeout(holdTimer);

        holdTimer = setTimeout(() => {
          if (heldPlayerKey) {
            removePlayerFromSquad(heldPlayerKey);
          }

          heldPlayerKey = "";
        }, 800);
      }
    );

    playerElement.addEventListener(
      "pointerup",
      cancelHold
    );

    playerElement.addEventListener(
      "pointerleave",
      cancelHold
    );

    playerElement.addEventListener(
      "pointercancel",
      cancelHold
    );
  });
}

/* =====================================================
   SQUAD SUMMARY
===================================================== */

function updateSquadSummary() {
  if (!Array.isArray(currentEntry?.players)) {
    return;
  }

  const total = currentEntry.players.reduce(
    (sum, p) =>
      sum + Number(p.rating || 0),
    0
  );

  if (viewDreamRating) {
    viewDreamRating.textContent =
      `${total}/${MAX_TEAM_RATING} · ${currentEntry.players.length}/${MAX_PLAYERS}`;
  }
}

/* =====================================================
   OFFICIAL SEASON TOTAL
===================================================== */

async function getOfficialSeasonTotal(entry) {
  if (!entry) return 0;

  const snapshot = await getDocs(
    collection(db, "dream_team_entries")
  );

  const entries = snapshot.docs
    .map(snapshotDoc => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data()
    }))
    .filter(item =>
      ["submitted", "locked", "scored"].includes(
        item.status
      ) &&
      (
        (
          entry.uid &&
          item.uid === entry.uid
        ) ||
        (
          !entry.uid &&
          entry.email &&
          item.email === entry.email
        ) ||
        (
          !entry.uid &&
          !entry.email &&
          entry.username &&
          item.username === entry.username
        )
      )
    );

  const rounds = new Map();

  for (const item of entries) {
    const key =
      item.roundId ||
      item.gameweekId ||
      item.id;

    if (!rounds.has(key)) {
      rounds.set(key, item);
    }
  }

  return [...rounds.values()].reduce(
    (total, item) =>
      total + Number(item.totalPoints || 0),
    0
  );
}

/* =====================================================
   RENDER DREAM TEAM
===================================================== */

function renderDreamTeam(entry) {
  const username =
    entry.username || "ScoreCast24 Player";

  const weekLabel =
    String(entry.roundId || "")
      .match(/week-(\d+)$/)?.[1];

  if (dreamTeamViewTitle) {
    dreamTeamViewTitle.textContent =
      `${username}'s Dream Team`;
  }

  if (dreamTeamViewStatus) {
    dreamTeamViewStatus.textContent =
      isUnsavedRollover
        ? `Week ${weekLabel || "current"} preview only — no submitted entry exists for this week.`
        : `Submitted Dream Team${
            weekLabel
              ? ` — Week ${Number(weekLabel)}`
              : ""
          }`;
  }

  if (viewDreamUsername) {
    viewDreamUsername.textContent = username;
  }

  if (viewDreamFormation) {
    viewDreamFormation.textContent =
      entry.formation || "Not recorded";
  }

  updateSquadSummary();

  if (viewDreamPoints) {
    const weeklyTotal =
      isUnsavedRollover
        ? 0
        : Number(entry.totalPoints || 0);

    viewDreamPoints.innerHTML = `
      This Week:
      <strong>${weeklyTotal}</strong>
      <br>
      Season Total:
      <strong>Loading...</strong>
    `;

    getOfficialSeasonTotal(entry)
      .then(seasonTotal => {
        viewDreamPoints.innerHTML = `
          This Week:
          <strong>${weeklyTotal}</strong>
          <br>
          Season Total:
          <strong>${seasonTotal}</strong>
        `;
      })
      .catch(error => {
        console.error(
          "Season total loading error:",
          error
        );

        viewDreamPoints.innerHTML = `
          This Week:
          <strong>${weeklyTotal}</strong>
          <br>
          Season Total:
          <strong>—</strong>
        `;
      });
  }

  if (dreamTeamSummary) {
    dreamTeamSummary.hidden = false;
  }

  renderFormation(entry.players);
  renderPlayers(entry.players);
}

/* =====================================================
   TEAM SELECTION LINK
===================================================== */

function updateTeamSelectionLink() {
  if (!backToTeamSelection) return;

  backToTeamSelection.hidden = !isOwnTeam;

  if (!isOwnTeam) return;

  const carryId =
    isUnsavedRollover
      ? previousEntry?.id
      : currentEntryId;

  backToTeamSelection.href =
    carryId
      ? `dream-game.html?carry=${encodeURIComponent(carryId)}`
      : "dream-game.html";
}

/* =====================================================
   TEAM EDIT PERMISSIONS
===================================================== */

function applyTeamEditPermissions() {
  const editable =
    isOwnTeam && !DREAM_CONFIG.manualLock;

  const picker = document.querySelector(
    ".dream-player-picker"
  );

  if (submitDreamTeamBtn) {
    submitDreamTeamBtn.hidden = !editable;
  }

  if (formationChangeBtn) {
    formationChangeBtn.hidden = !editable;
    formationChangeBtn.disabled = !editable;
  }

  if (formationChangeMenu) {
    formationChangeMenu.hidden = true;
  }

  if (picker) {
    picker.hidden = !editable;
  }

  if (backToTeamSelection) {
    backToTeamSelection.hidden = !editable;
  }
}

/* =====================================================
   READ FIRESTORE ENTRY
===================================================== */

async function readEntry(entryId) {
  if (!entryId) return null;

  const snapshot = await getDoc(
    doc(db, "dream_team_entries", entryId)
  );

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : null;
}

/* =====================================================
   PREVIOUS ROUND COMPARISON
===================================================== */

function preparePreviousRound(previous) {
  previousEntry = previous;

  previousRoundPlayerKeys = new Set(
    (
      Array.isArray(previous?.players)
        ? previous.players
        : []
    ).map(player => {
      const apiId = getApiPlayerId(player);

      return makeRosterPlayerKey({
        ...player,
        apiPlayerId:
          apiId ||
          player.apiPlayerId ||
          null
      });
    })
  );
}

/* =====================================================
   PREPARE PLAYER SCORES

   Historical teams show their own round scores.
   Current teams show the configured current round.
===================================================== */

function prepareEntryPlayerScores(entry) {
  entry.players = (
    Array.isArray(entry.players)
      ? entry.players
      : []
  ).map(player => {
    const apiId = getApiPlayerId(player);

    const withApiId = {
      ...player,
      apiPlayerId:
        apiId ||
        player.apiPlayerId ||
        null
    };

    const scores = getPlayerScores(withApiId);

    return {
      ...withApiId,

      weeklyPoints:
        getPlayerScoreForRound(
          withApiId,
          entry.roundId
        ),

      overallPoints:
        scores.overallScore,

      isNew:
        entry.roundId === currentRoundId &&
        Boolean(previousEntry) &&
        !previousRoundPlayerKeys.has(
          makeRosterPlayerKey(withApiId)
        )
    };
  });
}

/* =====================================================
   LOAD DREAM TEAM
===================================================== */

async function loadDreamTeam() {
  const requestedEntryId =
    new URLSearchParams(
      window.location.search
    ).get("id");

  try {
    await auth.authStateReady();

    const user = auth.currentUser;

    if (!user) {
      showError(
        "Please sign in to view your Dream Team."
      );
      return;
    }

    isUnsavedRollover = false;
    preparePreviousRound(null);

    let entryData;

    /*
      A specific saved entry was requested.

      This is used by the leaderboard
      and View My Team links.
    */

    if (requestedEntryId) {
      entryData = await readEntry(
        requestedEntryId
      );

      if (!entryData) {
        showError(
          "This Dream Team entry could not be found."
        );
        return;
      }

      currentEntryId = entryData.id;

      isOwnTeam =
        entryData.uid === user.uid &&
        entryData.roundId === currentRoundId &&
        !DREAM_CONFIG.manualLock;

      if (
        entryData.roundId === currentRoundId &&
        previousRoundId &&
        entryData.uid
      ) {
        preparePreviousRound(
          await readEntry(
            `${previousRoundId}_${entryData.uid}`
          )
        );
      }
    } else {
      /*
        No entry ID supplied.

        Look up the logged-in user's
        current round first.
      */

      const wantedId =
        `${currentRoundId}_${user.uid}`;

      entryData = await readEntry(wantedId);

      preparePreviousRound(
        previousRoundId
          ? await readEntry(
              `${previousRoundId}_${user.uid}`
            )
          : null
      );

      currentEntryId = wantedId;

      isOwnTeam =
        !DREAM_CONFIG.manualLock;

      if (!entryData) {
        if (!previousEntry) {
          showError(
            "No Dream Team entry was found for this gameweek."
          );
          return;
        }

        /*
          No current-round Firestore entry exists.

          Display previous squad as a preview.
          Do not create or score an entry here.
        */

        isUnsavedRollover = true;

        entryData = {
          ...previousEntry,

          id: wantedId,

          roundId: currentRoundId,

          rolloverFromRound:
            previousRoundId,

          players:
            (previousEntry.players || [])
              .map(player => ({
                ...player
              })),

          totalPoints: 0,
          scoredFixtures: 0
        };
      }
    }

    prepareEntryPlayerScores(entryData);

    currentEntry = entryData;

    applyTeamEditPermissions();
    updateTeamSelectionLink();
    renderDreamTeam(entryData);

    if (isOwnTeam) {
      renderPlayerDatabase();
    }
  } catch (error) {
    console.error(
      "Dream Team loading error:",
      error
    );

    showError(
      "The Dream Team could not be loaded. Please try again."
    );
  }
}

/* =====================================================
   SAVE CURRENT DREAM TEAM
===================================================== */

async function saveCurrentDreamTeam() {
  if (
    DREAM_CONFIG.manualLock ||
    !isOwnTeam
  ) {
    window.alert(
      "Dream Team selections are currently locked or this is not your team."
    );
    return;
  }

  if (
    !currentEntry ||
    !currentEntryId ||
    !auth.currentUser
  ) {
    window.alert(
      "Your Dream Team has not loaded yet."
    );
    return;
  }

  if (
    currentEntry.roundId !== currentRoundId ||
    currentEntryId !==
      `${currentRoundId}_${auth.currentUser.uid}`
  ) {
    window.alert(
      "Only your current gameweek's Dream Team can be saved."
    );
    return;
  }

  const players =
    Array.isArray(currentEntry.players)
      ? currentEntry.players
      : [];

  if (players.length !== MAX_PLAYERS) {
    window.alert(
      `You must select ${MAX_PLAYERS} players. You currently have ${players.length}.`
    );
    return;
  }

  const ratingTotal = players.reduce(
    (sum, player) =>
      sum + Number(player.rating || 0),
    0
  );

  if (ratingTotal > MAX_TEAM_RATING) {
    window.alert(
      `Your team rating is ${ratingTotal}/${MAX_TEAM_RATING}. Reduce it before submitting.`
    );
    return;
  }

  const formation =
    FORMATIONS[currentEntry.formation];

  if (!formation) {
    window.alert(
      "Choose a valid formation."
    );
    return;
  }

  const counts = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Attacker: 0
  };

  for (const player of players) {
    if (
      counts[player.position] === undefined
    ) {
      window.alert(
        "Your team contains an unrecognised position."
      );
      return;
    }

    counts[player.position]++;
  }

  if (
    !Object.keys(formation).every(
      position =>
        counts[position] === formation[position]
    )
  ) {
    window.alert(
      "Your players do not match the selected formation."
    );
    return;
  }

  if (
    new Set(
      players.map(p =>
        makePlayerKey(p.club, p.name)
      )
    ).size !== players.length
  ) {
    window.alert(
      "Your squad contains a duplicate player."
    );
    return;
  }

  const clubCounts = new Map();

  for (const player of players) {
    const club = normaliseClubName(
      player.club
    );

    clubCounts.set(
      club,
      (clubCounts.get(club) || 0) + 1
    );
  }

  if (
    [...clubCounts.values()].some(
      count => count > MAX_FROM_ONE_CLUB
    )
  ) {
    window.alert(
      `You can only select ${MAX_FROM_ONE_CLUB} players per club.`
    );
    return;
  }

  if (submitDreamTeamBtn) {
    submitDreamTeamBtn.disabled = true;
  }

  try {
    const playersToSave = players.map(
      player => {
        const {
          weeklyPoints,
          overallPoints,
          isNew,
          databasePosition,
          elementId,
          ...savedPlayer
        } = player;

        return savedPlayer;
      }
    );

    /*
      Preserve existing scores.

      For a genuinely new entry,
      initialise points to zero.
    */

    const existing = await getDoc(
      doc(
        db,
        "dream_team_entries",
        currentEntryId
      )
    );

    const existingTotal =
      existing.exists()
        ? Number(
            existing.data().totalPoints || 0
          )
        : 0;

    await setDoc(
      doc(
        db,
        "dream_team_entries",
        currentEntryId
      ),
      {
        uid:
          auth.currentUser.uid,

        username:
          currentEntry.username ||
          previousEntry?.username ||
          "",

        email:
          currentEntry.email ||
          previousEntry?.email ||
          auth.currentUser.email ||
          "",

        roundId:
          currentRoundId,

        rolloverFromRound:
          previousRoundId || null,

        players:
          playersToSave,

        formation:
          currentEntry.formation,

        ratingTotal,

        status:
          "submitted",

        totalPoints:
          existingTotal,

        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    currentEntry.id = currentEntryId;
    currentEntry.roundId = currentRoundId;
    currentEntry.totalPoints = existingTotal;
    currentEntry.status = "submitted";
    currentEntry.ratingTotal = ratingTotal;

    isUnsavedRollover = false;

    window.alert(
      "Dream Team saved successfully."
    );

    updateSquadSummary();
    renderDreamTeam(currentEntry);
  } catch (error) {
    console.error(
      "Dream Team save error:",
      error
    );

    window.alert(
      "Your Dream Team could not be saved. Please try again."
    );
  } finally {
    if (submitDreamTeamBtn) {
      submitDreamTeamBtn.disabled = false;
    }
  }
}

/* =====================================================
   FORMATION VALIDATION
===================================================== */

function canChangeToFormation(formationName) {
  if (
    !isOwnTeam ||
    DREAM_CONFIG.manualLock ||
    !Array.isArray(currentEntry?.players)
  ) {
    return false;
  }

  const formation = FORMATIONS[formationName];

  if (!formation) return false;

  const counts = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Attacker: 0
  };

  currentEntry.players.forEach(player => {
    if (
      counts[player.position] !== undefined
    ) {
      counts[player.position]++;
    }
  });

  return Object.keys(formation).every(
    position =>
      counts[position] <= formation[position]
  );
}

/* =====================================================
   FORMATION MENU
===================================================== */

function renderFormationMenu() {
  if (
    !isOwnTeam ||
    DREAM_CONFIG.manualLock ||
    !formationChangeMenu
  ) {
    return;
  }

  formationChangeMenu.innerHTML = "";

  Object.keys(FORMATIONS).forEach(
    formationName => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "formation-option";
      button.textContent = formationName;

      button.addEventListener(
        "click",
        () => {
          if (
            formationName ===
            currentEntry?.formation
          ) {
            formationChangeMenu.hidden = true;
            return;
          }

          if (
            !canChangeToFormation(formationName)
          ) {
            window.alert(
              "You need to remove players from your squad before changing formation."
            );

            formationChangeMenu.hidden = true;
            return;
          }

          currentEntry.formation =
            formationName;

          if (viewDreamFormation) {
            viewDreamFormation.textContent =
              formationName;
          }

          formationChangeMenu.hidden = true;
        }
      );

      formationChangeMenu.appendChild(
        button
      );
    }
  );
}

/* =====================================================
   STARTUP
===================================================== */

async function startDreamTeamPage() {
  if (loadingStarted) return;

  loadingStarted = true;

  try {
    await loadPlayerFiles();
    await loadPlayerScores();

    populateClubFilter();
    setupDatabaseFilterEvents();

    submitDreamTeamBtn?.addEventListener(
      "click",
      event => {
        event.preventDefault();
        saveCurrentDreamTeam();
      }
    );

    formationChangeBtn?.addEventListener(
      "click",
      () => {
        if (
          !isOwnTeam ||
          DREAM_CONFIG.manualLock
        ) {
          return;
        }

        renderFormationMenu();

        if (formationChangeMenu) {
          formationChangeMenu.hidden =
            !formationChangeMenu.hidden;
        }
      }
    );

    auditPlayerApiMatching();

    await loadDreamTeam();
  } catch (error) {
    console.error(
      "Dream Team startup error:",
      error
    );

    showError(
      "The Dream Team could not be loaded. Please try again."
    );
  }
}

onAuthStateChanged(
  auth,
  async user => {
    if (!user) {
      showError(
        "Please sign in to view your Dream Team."
      );
      return;
    }

    await startDreamTeamPage();
  }
);

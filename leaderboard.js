
console.log("leaderboard.js loaded English League v11");

import { db } from "./firebase.js?v=107";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { resultsByRound } from "./results.js?v=3";

/* =====================================================
   PAGE ELEMENTS
===================================================== */

const leaderboardContainer = document.getElementById("leaderboardContainer");
const weekLeaderboardTab =
  document.getElementById("weekLeaderboardTab") ||
  document.getElementById("groupStageTotalTab");
const seasonLeaderboardTab = document.getElementById("seasonLeaderboardTab");
const weekSelectorContainer = document.getElementById("weekSelectorContainer");
const weekSelector = document.getElementById("weekSelector");

/* =====================================================
   ROUND CONFIGURATION
   Old Firestore round names are preserved for Weeks 0-3.
===================================================== */

const englishLeagueRounds = [
  {
    id: "English League Week 0",
    label: "Week 0 - Championship",
    storedRound: "English League Week One",
    resultsRound: "English League Week One"
  },
  {
    id: "English League Week 1",
    label: "Week 1",
    storedRound: "English League Week Two",
    resultsRound: "English League Week Two"
  },
  {
    id: "English League Week 2",
    label: "Week 2",
    storedRound: "English League Week Three",
    resultsRound: "English League Week Three"
  },
  {
    id: "English League Week 3",
    label: "Week 3",
    storedRound: "English League Week Four",
    resultsRound: "English League Week Four"
  },
  ...[4, 5, 6, 7, 8].map(week => ({
    id: `English League Week ${week}`,
    label: `Week ${week}`,
    storedRound: `English League Week ${week}`,
    resultsRound: `English League Week ${week}`
  }))
];

/* =====================================================
   CURRENT WEEK AND DEFAULT LEADERBOARD
   Week 8 takes predictions; Week 7 shows on page load.
===================================================== */

const currentRound = "English League Week 8";
const currentLeaderboardRound = "English League Week 7";
let selectedRound = currentLeaderboardRound;
let activeLeaderboard = "week";

let predictionDocuments = [];
let liveResultsByRound = {};
let weekLeaderboardRows = [];
let seasonLeaderboardRows = [];

const myUsername = String(
  localStorage.getItem("scorecast24Username") || ""
).trim().toLowerCase();

/* =====================================================
   HELPERS
===================================================== */

function normaliseUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timestampToMillis(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  return null;
}

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Leaderboard load timed out")), ms);
  });
}

function getRoundNumber(roundId) {
  const match = String(roundId || "").match(/Week\s+(\d+)/i);
  return match ? Number(match[1]) : -1;
}

function getRoundConfig(roundId) {
  return englishLeagueRounds.find(round => round.id === roundId) || null;
}

function getRoundLabel(roundId) {
  return getRoundConfig(roundId)?.label || roundId;
}

function getLogicalRoundFromStoredRound(storedRound) {
  const round = englishLeagueRounds.find(
    item => item.storedRound === storedRound || item.id === storedRound
  );
  return round?.id || null;
}

/* =====================================================
   LOAD PREDICTIONS
===================================================== */

async function loadPredictionDocuments() {
  const snapshot = await Promise.race([
    getDocs(collection(db, "scorecast24_predictions")),
    timeoutPromise(12000)
  ]);

  predictionDocuments = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const logicalRound = getLogicalRoundFromStoredRound(data.round);

    if (!logicalRound) return;

    predictionDocuments.push({
      id: docSnap.id,
      username: data.username || "Unknown",
      round: data.round,
      logicalRound,
      predictions: Array.isArray(data.predictions) ? data.predictions : [],
      submittedAtMillis: timestampToMillis(data.submittedAt)
    });
  });
}

/* =====================================================
   LOAD FINISHED RESULTS FROM FIRESTORE
===================================================== */

async function loadLiveResults() {
  const snapshot = await getDocs(collection(db, "scorecast24_results"));
  const finishedStatuses = new Set(["FT", "AET", "PEN"]);
  liveResultsByRound = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const round = String(data.round || "").trim();
    const fixtureId = String(data.fixtureId || "").trim();
    if (!round || !fixtureId) return;

    const status = String(data.status || "").trim().toUpperCase();
    const isFinished = finishedStatuses.has(status);

    if (!liveResultsByRound[round]) liveResultsByRound[round] = {};

    liveResultsByRound[round][fixtureId] = {
      homeScore: isFinished ? data.homeScore ?? null : null,
      awayScore: isFinished ? data.awayScore ?? null : null,
      status
    };
  });
}

/* =====================================================
   MERGE MANUAL AND FIRESTORE RESULTS
   Completed manual results take priority.
===================================================== */

function getResultsForLogicalRound(logicalRound) {
  const config = getRoundConfig(logicalRound);
  if (!config) return {};

  const liveResults = {
    ...(liveResultsByRound[config.resultsRound] || {}),
    ...(liveResultsByRound[logicalRound] || {})
  };

  const staticResults = {
    ...(resultsByRound[config.resultsRound] || {}),
    ...(resultsByRound[logicalRound] || {})
  };

  const mergedResults = { ...liveResults };

  Object.entries(staticResults).forEach(([fixtureId, result]) => {
    if (result?.homeScore != null && result?.awayScore != null) {
      mergedResults[fixtureId] = result;
    } else if (!(fixtureId in mergedResults)) {
      mergedResults[fixtureId] = result;
    }
  });

  return mergedResults;
}

/* =====================================================
   WEEK DROPDOWN
   Week 8 is visible, but Week 7 is selected by default.
===================================================== */

function buildWeekSelector() {
  if (!weekSelector) return;
  weekSelector.innerHTML = "";

  [...englishLeagueRounds].reverse().forEach(round => {
    const option = document.createElement("option");
    option.value = round.id;
    option.textContent = round.label;
    option.selected = round.id === selectedRound;
    weekSelector.appendChild(option);
  });
}

/* =====================================================
   POINTS: EXACT 5, DRAW 3, AWAY 2, HOME 1
   Week 8 stays pending until it becomes the active week.
===================================================== */

function calculateRoundStats(predictions = [], logicalRound) {
  if (
    getRoundNumber(logicalRound) >
    getRoundNumber(currentLeaderboardRound)
  ) {
    return { points: null, exactScores: 0 };
  }

  const roundResults = getResultsForLogicalRound(logicalRound);
  let totalPoints = 0;
  let exactScores = 0;
  let hasAnyResult = false;

  predictions.forEach(prediction => {
    if (prediction.void === true) return;

    const result = roundResults[String(prediction.fixtureId || "")];
    if (!result || result.homeScore == null || result.awayScore == null) return;

    hasAnyResult = true;
    const predictedHome = Number(prediction.predictedHome);
    const predictedAway = Number(prediction.predictedAway);
    const actualHome = Number(result.homeScore);
    const actualAway = Number(result.awayScore);

    if (predictedHome === actualHome && predictedAway === actualAway) {
      totalPoints += 5;
      exactScores += 1;
    } else if (predictedHome === predictedAway && actualHome === actualAway) {
      totalPoints += 3;
    } else if (predictedHome < predictedAway && actualHome < actualAway) {
      totalPoints += 2;
    } else if (predictedHome > predictedAway && actualHome > actualAway) {
      totalPoints += 1;
    }
  });

  return {
    points: hasAnyResult ? totalPoints : null,
    exactScores
  };
}

/* =====================================================
   SORT: POINTS, EXACT SCORES, EARLIEST ENTRY
===================================================== */

function sortLeaderboard(rows) {
  rows.sort((a, b) => {
    if (a.points == null && b.points != null) return 1;
    if (a.points != null && b.points == null) return -1;

    if (a.points != null && b.points != null) {
      if (a.points !== b.points) return b.points - a.points;
      if (a.exactScores !== b.exactScores) {
        return (b.exactScores || 0) - (a.exactScores || 0);
      }
    }

    const aTime = a.submittedAtMillis;
    const bTime = b.submittedAtMillis;
    if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime;
    if (aTime != null && bTime == null) return -1;
    if (aTime == null && bTime != null) return 1;
    return String(a.username).localeCompare(String(b.username));
  });
}

/* =====================================================
   TABS AND SELECTOR VISIBILITY
===================================================== */

function setActiveTab(tab) {
  weekLeaderboardTab?.classList.remove("active");
  seasonLeaderboardTab?.classList.remove("active");
  tab?.classList.add("active");
}

function showWeekSelector() {
  if (weekSelectorContainer) weekSelectorContainer.style.display = "";
}

function hideWeekSelector() {
  if (weekSelectorContainer) weekSelectorContainer.style.display = "none";
}

/* =====================================================
   DISPLAY ROWS
===================================================== */

function displayLeaderboard(rows, heading) {
  if (!leaderboardContainer) return;

  if (rows.length === 0) {
    leaderboardContainer.innerHTML = `
      <h2>${escapeHtml(heading)}</h2>
      <p>No predictions submitted yet.</p>
    `;
    return;
  }

  leaderboardContainer.innerHTML = `<h2>${escapeHtml(heading)} 🏆</h2>`;

  rows.forEach((row, index) => {
    const div = document.createElement("div");
    const isMe = normaliseUsername(row.username) === myUsername;
    div.className = isMe ? "leaderboard-row my-row" : "leaderboard-row";

    div.innerHTML = `
      <div>#${index + 1}</div>
      <div>
        <div>${escapeHtml(row.username)}</div>
        ${row.viewId ? '<div class="view-predictions-text">View predictions</div>' : ""}
      </div>
      <div class="leaderboard-points">
        ${row.points == null ? "Score pending match results" : `${row.points} pts`}
      </div>
    `;

    if (row.viewId) {
      div.addEventListener("click", () => {
        localStorage.setItem("viewPredictionId", row.viewId);
        localStorage.setItem("viewPredictionUsername", row.username);
        if (row.viewRound) {
          localStorage.setItem("viewPredictionRound", row.viewRound);
        }
        if (row.viewLogicalRound) {
          localStorage.setItem("viewPredictionLogicalRound", row.viewLogicalRound);
        }
        window.location.href = "view-predictions.html";
      });
    }

    leaderboardContainer.appendChild(div);
  });
}

/* =====================================================
   WEEKLY LEADERBOARD
   CRITICAL: MATCH THE EXACT SELECTED LOGICAL ROUND.
===================================================== */

function buildWeekLeaderboard(logicalRound) {
  weekLeaderboardRows = [];

  predictionDocuments.forEach(entry => {
    // Without this, every week shows entries from every other week.
    if (entry.logicalRound !== logicalRound) return;

    const stats = calculateRoundStats(entry.predictions, logicalRound);
    const isFutureRound =
      getRoundNumber(logicalRound) > getRoundNumber(currentLeaderboardRound);

    weekLeaderboardRows.push({
      id: entry.id,
      viewId: isFutureRound ? null : entry.id,
      viewRound: entry.round,
      viewLogicalRound: entry.logicalRound,
      username: entry.username,
      points: stats.points,
      exactScores: stats.exactScores,
      submittedAtMillis: entry.submittedAtMillis
    });
  });

  sortLeaderboard(weekLeaderboardRows);
}

function displaySelectedWeek() {
  buildWeekLeaderboard(selectedRound);
  displayLeaderboard(weekLeaderboardRows, `${getRoundLabel(selectedRound)} Leaderboard`);
}

/* =====================================================
   SEASON LEADERBOARD
   Only include Weeks 0-7 while Week 8 is open.
===================================================== */

function buildSeasonLeaderboard() {
  const playerMap = new Map();

  predictionDocuments.forEach(entry => {
    if (!entry.logicalRound) return;
    if (
      getRoundNumber(entry.logicalRound) >
      getRoundNumber(currentLeaderboardRound)
    ) return;

    const username = entry.username || "Unknown";
    const usernameKey = normaliseUsername(username);
    if (!usernameKey) return;

    if (!playerMap.has(usernameKey)) {
      playerMap.set(usernameKey, {
        username,
        totalPoints: 0,
        totalExactScores: 0,
        hasAnyResult: false,
        earliestSubmission: null,
        viewId: null,
        viewRound: null,
        viewLogicalRound: null
      });
    }

    const player = playerMap.get(usernameKey);
    const stats = calculateRoundStats(entry.predictions, entry.logicalRound);

    if (stats.points !== null) {
      player.totalPoints += stats.points;
      player.totalExactScores += stats.exactScores;
      player.hasAnyResult = true;
    }

    if (
      entry.submittedAtMillis != null &&
      (player.earliestSubmission == null ||
       entry.submittedAtMillis < player.earliestSubmission)
    ) {
      player.earliestSubmission = entry.submittedAtMillis;
    }

    // View predictions from the latest included round for this player.
    if (
      !player.viewLogicalRound ||
      getRoundNumber(entry.logicalRound) > getRoundNumber(player.viewLogicalRound)
    ) {
      player.viewId = entry.id;
      player.viewRound = entry.round;
      player.viewLogicalRound = entry.logicalRound;
    }
  });

  seasonLeaderboardRows = Array.from(playerMap.values()).map(player => ({
    username: player.username,
    points: player.hasAnyResult ? player.totalPoints : null,
    exactScores: player.totalExactScores,
    submittedAtMillis: player.earliestSubmission,
    viewId: player.viewId,
    viewRound: player.viewRound,
    viewLogicalRound: player.viewLogicalRound
  }));

  sortLeaderboard(seasonLeaderboardRows);
}

/* =====================================================
   TAB EVENTS
===================================================== */

weekLeaderboardTab?.addEventListener("click", () => {
  activeLeaderboard = "week";
  setActiveTab(weekLeaderboardTab);
  showWeekSelector();
  displaySelectedWeek();
});

weekSelector?.addEventListener("change", () => {
  selectedRound = weekSelector.value;
  activeLeaderboard = "week";
  setActiveTab(weekLeaderboardTab);
  showWeekSelector();
  displaySelectedWeek();
});

seasonLeaderboardTab?.addEventListener("click", () => {
  activeLeaderboard = "season";
  setActiveTab(seasonLeaderboardTab);
  hideWeekSelector();
  displayLeaderboard(seasonLeaderboardRows, "Season Leaderboard");
});

/* =====================================================
   INITIAL LOAD AND LIVE REFRESH
===================================================== */

function refreshDisplayedLeaderboard() {
  buildSeasonLeaderboard();

  if (activeLeaderboard === "season") {
    hideWeekSelector();
    setActiveTab(seasonLeaderboardTab);
    displayLeaderboard(seasonLeaderboardRows, "Season Leaderboard");
  } else {
    showWeekSelector();
    setActiveTab(weekLeaderboardTab);
    displaySelectedWeek();
  }
}

async function initialiseLeaderboard() {
  if (!leaderboardContainer) {
    console.error("leaderboardContainer not found");
    return;
  }

  leaderboardContainer.textContent = "Loading English League leaderboard...";

  try {
    await loadPredictionDocuments();
    await loadLiveResults();
    selectedRound = currentLeaderboardRound;
    activeLeaderboard = "week";
    buildWeekSelector();
    refreshDisplayedLeaderboard();
    console.log("Leaderboard initialised:", {
      currentRound,
      selectedRound,
      entries: predictionDocuments.length
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    leaderboardContainer.innerHTML = `
      <h2>Leaderboard Error</h2>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
}

async function refreshLeaderboardData() {
  try {
    await loadPredictionDocuments();
    await loadLiveResults();
    buildWeekSelector(); // Preserve user's selected week.
    refreshDisplayedLeaderboard();
    console.log("ScoreCast leaderboard refreshed:", new Date().toLocaleTimeString());
  } catch (error) {
    console.error("Live leaderboard refresh failed:", error);
  }
}

initialiseLeaderboard();
setInterval(refreshLeaderboardData, 60000);

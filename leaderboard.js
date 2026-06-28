import { db } from "./firebase.js?v=7";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const leaderboardContainer = document.getElementById("leaderboardContainer");

const currentLeaderboardTab = document.getElementById("currentLeaderboardTab");
const groupStageTotalTab = document.getElementById("groupStageTotalTab");

let leaderboardMode = "current";

const currentRound = "Round of 32";
const groupStageRounds = ["Round One", "Round Two", "Round Three"];

const results = {
  // ROUND ONE
  1: { homeScore: 2, awayScore: 0 },
  2: { homeScore: 2, awayScore: 1 },
  3: { homeScore: 1, awayScore: 1 },
  4: { homeScore: 4, awayScore: 1 },
  5: { homeScore: 0, awayScore: 1 },
  6: { homeScore: 2, awayScore: 0 },
  7: { homeScore: 1, awayScore: 1 },
  8: { homeScore: 1, awayScore: 1 },
  9: { homeScore: 1, awayScore: 0 },
  10: { homeScore: 7, awayScore: 1 },
  11: { homeScore: 2, awayScore: 2 },
  12: { homeScore: 5, awayScore: 1 },
  13: { homeScore: 1, awayScore: 1 },
  14: { homeScore: 0, awayScore: 0 },
  15: { homeScore: 2, awayScore: 2 },
  16: { homeScore: 1, awayScore: 1 },
  17: { homeScore: 3, awayScore: 1 },
  18: { homeScore: 1, awayScore: 4 },
  19: { homeScore: 3, awayScore: 0 },
  20: { homeScore: 3, awayScore: 1 },
  21: { homeScore: 1, awayScore: 0 },
  22: { homeScore: 4, awayScore: 2 },
  23: { homeScore: 1, awayScore: 1 },
  24: { homeScore: 1, awayScore: 3 },

  // ROUND TWO
  25: { homeScore: 1, awayScore: 1 },
  26: { homeScore: 4, awayScore: 1 },
  27: { homeScore: 6, awayScore: 0 },
  28: { homeScore: 1, awayScore: 0 },
  29: { homeScore: 2, awayScore: 0 },
  30: { homeScore: 0, awayScore: 1 },
  31: { homeScore: 3, awayScore: 0 },
  32: { homeScore: 0, awayScore: 1 },
  33: { homeScore: 5, awayScore: 1 },
  34: { homeScore: 2, awayScore: 1 },
  35: { homeScore: 0, awayScore: 0 },
  36: { homeScore: 0, awayScore: 4 },
  37: { homeScore: 4, awayScore: 0 },
  38: { homeScore: 0, awayScore: 0 },
  39: { homeScore: 2, awayScore: 2 },
  40: { homeScore: 1, awayScore: 3 },
  41: { homeScore: 2, awayScore: 0 },
  42: { homeScore: 3, awayScore: 0 },
  43: { homeScore: 3, awayScore: 2 },
  44: { homeScore: 1, awayScore: 2 },
  45: { homeScore: 5, awayScore: 0 },
  46: { homeScore: 0, awayScore: 0 },
  47: { homeScore: 0, awayScore: 1 },
  48: { homeScore: 1, awayScore: 0 },

  // ROUND THREE
  49: { homeScore: 2, awayScore: 1 },
  50: { homeScore: 3, awayScore: 1 },
  51: { homeScore: 4, awayScore: 2 },
  52: { homeScore: 0, awayScore: 3 },
  53: { homeScore: 1, awayScore: 0 },
  54: { homeScore: 0, awayScore: 3 },
  55: { homeScore: 0, awayScore: 2 },
  56: { homeScore: 2, awayScore: 1 },
  57: { homeScore: 1, awayScore: 3 },
  58: { homeScore: 1, awayScore: 1 },
  59: { homeScore: 3, awayScore: 2 },
  60: { homeScore: 0, awayScore: 0 },
  61: { homeScore: 1, awayScore: 4 },
  62: { homeScore: 5, awayScore: 0 },
  63: { homeScore: 0, awayScore: 0 },
  64: { homeScore: 0, awayScore: 1 },
  65: { homeScore: 1, awayScore: 5 },
  66: { homeScore: 1, awayScore: 1 },
  67: { homeScore: 0, awayScore: 2 },
  68: { homeScore: 2, awayScore: 1 },

  // ROUND OF 32
  69: { homeScore: null, awayScore: null },
  70: { homeScore: null, awayScore: null },
  71: { homeScore: null, awayScore: null },
  72: { homeScore: null, awayScore: null },
  73: { homeScore: null, awayScore: null },
  74: { homeScore: null, awayScore: null },
  75: { homeScore: null, awayScore: null },
  76: { homeScore: null, awayScore: null },
  77: { homeScore: null, awayScore: null },
  78: { homeScore: null, awayScore: null },
  79: { homeScore: null, awayScore: null },
  80: { homeScore: null, awayScore: null },
  81: { homeScore: null, awayScore: null },
  82: { homeScore: null, awayScore: null },
  83: { homeScore: null, awayScore: null },
  84: { homeScore: null, awayScore: null }
};

function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Leaderboard load timed out")), ms)
  );
}

function calculatePoints(predictions = []) {
  let total = 0;
  let hasAnyResult = false;

  predictions.forEach((prediction) => {
    const result = results[prediction.fixtureId];

    if (!result) return;
    if (result.homeScore === null || result.awayScore === null) return;

    hasAnyResult = true;

    const predictedHome = Number(prediction.predictedHome);
    const predictedAway = Number(prediction.predictedAway);
    const actualHome = Number(result.homeScore);
    const actualAway = Number(result.awayScore);

    if (predictedHome === actualHome && predictedAway === actualAway) {
      total += 5;
    } else if (
      predictedHome === predictedAway &&
      actualHome === actualAway
    ) {
      total += 3;
    } else if (
      predictedHome > predictedAway &&
      actualHome > actualAway
    ) {
      total += 1;
    } else if (
      predictedHome < predictedAway &&
      actualHome < actualAway
    ) {
      total += 2;
    }
  });

  return hasAnyResult ? total : null;
}

function updateActiveTab() {
  currentLeaderboardTab?.classList.toggle("active", leaderboardMode === "current");
  groupStageTotalTab?.classList.toggle("active", leaderboardMode === "groupStage");
}

function buildCurrentRows(predictionsSnap) {
  const rows = [];

  predictionsSnap.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.round !== currentRound) return;

    rows.push({
      id: docSnap.id,
      username: data.username || "Unknown",
      points: calculatePoints(data.predictions)
    });
  });

  return rows;
}

function buildGroupStageRows(predictionsSnap) {
  const users = {};

  predictionsSnap.forEach((docSnap) => {
    const data = docSnap.data();

    if (!groupStageRounds.includes(data.round)) return;

    const username = data.username || "Unknown";
    const cleanName = username.trim().toLowerCase();

    if (!users[cleanName]) {
      users[cleanName] = {
        id: docSnap.id,
        username,
        points: 0,
        hasAnyResult: false
      };
    }

    const points = calculatePoints(data.predictions);

    if (points !== null) {
      users[cleanName].points += points;
      users[cleanName].hasAnyResult = true;
    }
  });

  return Object.values(users).map((user) => ({
    id: user.id,
    username: user.username,
    points: user.hasAnyResult ? user.points : null
  }));
}

async function renderLeaderboard() {
  const title =
    leaderboardMode === "current"
      ? "Round of 32 Leaderboard"
      : "Group Stage Total Leaderboard";

  leaderboardContainer.innerHTML = `Loading ${title}...`;

  try {
    const predictionsSnap = await Promise.race([
      getDocs(collection(db, "scorecast24_predictions")),
      timeoutPromise(40000)
    ]);

    const rows =
      leaderboardMode === "current"
        ? buildCurrentRows(predictionsSnap)
        : buildGroupStageRows(predictionsSnap);

    rows.sort((a, b) => (b.points || 0) - (a.points || 0));

    if (rows.length === 0) {
      leaderboardContainer.innerHTML = `<p>No predictions found for this leaderboard yet.</p>`;
      return;
    }

    leaderboardContainer.innerHTML = `
      <h2>${title} 🏆</h2>
    `;

    rows.forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "leaderboard-row";

      div.innerHTML = `
        <div>#${index + 1}</div>

        <div>
          <div>${row.username}</div>
          <div class="view-predictions-text">View predictions</div>
        </div>

        <div class="leaderboard-points">
          ${
            row.points === null || row.points === undefined
              ? "Score pending match results"
              : `${row.points} pts`
          }
        </div>
      `;

      div.addEventListener("click", () => {
        localStorage.setItem("viewPredictionId", row.id);
        localStorage.setItem("viewPredictionUsername", row.username);
        window.location.href = "view-predictions.html";
      });

      leaderboardContainer.appendChild(div);
    });

  } catch (error) {
    console.error("Leaderboard error:", error);

    leaderboardContainer.innerHTML = `
      <div class="leaderboard-info">
        <h2>ScoreCast24 World Cup 2026 Leaderboard</h2>
        <p>
          The leaderboard updates as World Cup results are added.
          If the live rankings do not appear immediately, please refresh the page shortly.
        </p>
      </div>
    `;
  }
}

currentLeaderboardTab?.addEventListener("click", () => {
  leaderboardMode = "current";
  updateActiveTab();
  renderLeaderboard();
});

groupStageTotalTab?.addEventListener("click", () => {
  leaderboardMode = "groupStage";
  updateActiveTab();
  renderLeaderboard();
});

updateActiveTab();
renderLeaderboard();
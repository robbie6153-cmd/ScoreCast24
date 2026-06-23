import { db } from "./firebase.js?v=3";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const leaderboardContainer = document.getElementById("leaderboardContainer");
const predictionsDeadline = new Date("2026-06-11T19:00:00Z");

const results = {
  1: { homeScore: 2, awayScore: 0 },
  2: { homeScore: 2, awayScore: 1 },
  3: { homeScore: 1, awayScore: 1 },
  4: { homeScore: 4, awayScore: 1 },
  5: { homeScore: 0, awayScore: 1 },
  6: { homeScore: 2, awayScore: 0 },
  7: { homeScore: 1, awayScore: 1 },
  8: { homeScore: 1, awayScore: 1 },
  9: { homeScore: 1, awayScore: 0 },
  10: { homeScore: 7, awayScore: 1},
  11: { homeScore: 2, awayScore: 2},
  12: { homeScore: 5, awayScore: 1},
  13: { homeScore: 1, awayScore: 1},
  14: { homeScore: 0, awayScore: 0},
  15: { homeScore: 2, awayScore: 2},
  16: { homeScore: 1, awayScore: 1},
  17: { homeScore: 3, awayScore: 1},
  18: { homeScore: 1, awayScore: 4},
  19: { homeScore: 3, awayScore: 0},
  20: { homeScore: 3, awayScore: 1},
  21: { homeScore: 1, awayScore: 0},
  22: { homeScore: 4, awayScore: 2},
  23: { homeScore: 1, awayScore: 1},
  24: { homeScore: 1, awayScore: 3},
  25: { homeScore: 1, awayScore: 1},
  26: { homeScore: 4, awayScore: 1},
  27: { homeScore: 6, awayScore: 0},
  28: { homeScore: 1, awayScore: 0},
  29: { homeScore: 2, awayScore: 0},
  30: { homeScore: 0, awayScore: 1},
  31: { homeScore: 3, awayScore: 0},
  32: { homeScore: 0, awayScore: 1},
  33: { homeScore: 5, awayScore: 1},
  34: { homeScore: 2, awayScore: 1},
  35: { homeScore: 0, awayScore: 0},
  36: { homeScore: 0, awayScore: 4},
  37: { homeScore: 4, awayScore: 0},
  38: { homeScore: 0, awayScore: 0},
  39: { homeScore: 2, awayScore: 2},
  40: { homeScore: 1, awayScore: 3},
  41: { homeScore: 2, awayScore: 0},
  42: { homeScore: 3, awayScore: 0},
  43: { homeScore: 3, awayScore: 2},
  44: { homeScore: 1, awayScore: 2},
  45: { homeScore: 5, awayScore: 0},
};
  

function predictionsAreClosed() {
  return new Date() >= predictionsDeadline;
}

let selectedRound = "Round One";

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

async function renderLeaderboard() {
  leaderboardContainer.innerHTML = `Loading ${selectedRound} leaderboard...`;

  try {
 const predictionsSnap = await Promise.race([
  getDocs(collection(db, "scorecast24_predictions")),
  timeoutPromise(40000)
]);

    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      if (data.round !== selectedRound) {
        return;
      }

      rows.push({
        id: docSnap.id,
        username: data.username || "Unknown",
        points: calculatePoints(data.predictions)
      });
    });

    rows.sort((a, b) => (b.points || 0) - (a.points || 0));

    if (rows.length === 0) {
      leaderboardContainer.innerHTML = `<p>No predictions submitted yet for ${selectedRound}.</p>`;
      return;
    }

    leaderboardContainer.innerHTML = "";

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
    <p>
      Players earn points for correct scores, draws, away wins and home wins.
    </p>
  </div>
`;
  }
}

const roundOneTab = document.getElementById("roundOneTab");
const roundTwoTab = document.getElementById("roundTwoTab");
const roundThreeTab = document.getElementById("roundThreeTab");

function updateActiveTab() {
  if (!roundOneTab || !roundTwoTab || !roundThreeTab) return;

  roundOneTab.classList.toggle("active", selectedRound === "Round One");
  roundTwoTab.classList.toggle("active", selectedRound === "Round Two");
  roundThreeTab.classList.toggle("active", selectedRound === "Round Three");
}

roundOneTab?.addEventListener("click", () => {
  selectedRound = "Round One";
  updateActiveTab();
  renderLeaderboard();
});

roundTwoTab?.addEventListener("click", () => {
  selectedRound = "Round Two";
  updateActiveTab();
  renderLeaderboard();
});

roundThreeTab?.addEventListener("click", () => {
  selectedRound = "Round Three";
  updateActiveTab();
  renderLeaderboard();
});
updateActiveTab();
renderLeaderboard();
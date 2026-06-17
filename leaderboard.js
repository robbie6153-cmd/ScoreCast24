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
  timeoutPromise(20000)
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

function updateActiveTab() {
  if (!roundOneTab || !roundTwoTab) return;

  roundOneTab.classList.toggle("active", selectedRound === "Round One");
  roundTwoTab.classList.toggle("active", selectedRound === "Round Two");
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

updateActiveTab();
renderLeaderboard();
import { db } from "./firebase.js?v=3";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const leaderboardContainer = document.getElementById("leaderboardContainer");
const predictionsDeadline = new Date("2026-06-11T19:00:00Z");

const results = {
  1: { homeScore: 2, awayScore: 0 }, // Mexico 2 South Africa 0
  2: { homeScore: 2, awayScore: 1 }, // Korea Republic v Czechia
  3: { homeScore: 1, awayScore: 1 }, // Canada 1 Bosnia & Herzegovina 1
  4: { homeScore: 4, awayScore: 1 }, // USA 4 Paraguay 1
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
      timeoutPromise(3000)
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
    leaderboardContainer.innerHTML =
      "<p>Could not load leaderboard. Please refresh and try again.</p>";
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
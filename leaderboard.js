import { db } from "./firebase.js?v=3";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const leaderboardContainer = document.getElementById("leaderboardContainer");
console.time("Leaderboard total load");

async function renderLeaderboard() {
  leaderboardContainer.innerHTML = "Loading leaderboard...";

  try {
    console.time("Leaderboard total load");
    const predictionsSnap = await getDocs(
      collection(db, "scorecast24_predictions")
    );

    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      rows.push({
  id: docSnap.id,
  username: data.username || "Unknown",
  status: data.status || "Score pending match results",
  points: data.points
});

    rows.sort((a, b) => (b.points || 0) - (a.points || 0));

    if (rows.length === 0) {
      leaderboardContainer.innerHTML =
        "<p>No predictions submitted yet.</p>";
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
      row.points === null ||
      row.points === undefined
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
    console.error(error);

    leaderboardContainer.innerHTML =
      "<p>Could not load leaderboard.</p>";
  }
}

renderLeaderboard();
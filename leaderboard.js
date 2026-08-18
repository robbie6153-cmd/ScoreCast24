console.log("leaderboard.js loaded English League v4");

import { db } from "./firebase.js?v=107";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const leaderboardContainer =
  document.getElementById("leaderboardContainer");

const weekLeaderboardTab =
  document.getElementById("weekLeaderboardTab") ||
  document.getElementById("groupStageTotalTab");

const seasonLeaderboardTab =
  document.getElementById("seasonLeaderboardTab");


const currentRound =
  "English League Week One";


const results = {
  1: { homeScore: 2, awayScore: 2 },
  2: { homeScore: 2, awayScore: 1 },
  3: { homeScore: 0, awayScore: 2 },
  4: { homeScore: 2, awayScore: 1 },
  5: { homeScore: 2, awayScore: 1 },
  6: { homeScore: 1, awayScore: 2 },
  7: { homeScore: 1, awayScore: 3 },
  8: { homeScore: 1, awayScore: 2 },
  9: { homeScore: 0, awayScore: 0 },
  10: { homeScore: 2, awayScore: 1 },
  11: { homeScore: 3, awayScore: 0 },
  12: { homeScore: 2, awayScore: 2 },
  13: { homeScore: 1, awayScore: 1 }
};


let leaderboardRows = [];

const myUsername =
  (
    localStorage.getItem(
      "scorecast24Username"
    ) || ""
  )
    .trim()
    .toLowerCase();
/* =========================
   TIMEOUT
========================= */

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          "Leaderboard load timed out"
        )
      );
    }, ms);
  });
}


/* =========================
   CALCULATE POINTS
========================= */

function calculatePoints(predictions = []) {
  let total = 0;
  let hasAnyResult = false;

  predictions.forEach((prediction) => {
    const result =
      results[prediction.fixtureId];

    if (!result) return;

    if (
      result.homeScore === null ||
      result.awayScore === null
    ) {
      return;
    }

    hasAnyResult = true;

    const predictedHome =
      Number(prediction.predictedHome);

    const predictedAway =
      Number(prediction.predictedAway);

    const actualHome =
      Number(result.homeScore);

    const actualAway =
      Number(result.awayScore);


    if (
      predictedHome === actualHome &&
      predictedAway === actualAway
    ) {
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

  return hasAnyResult
    ? total
    : null;
}


/* =========================
   ACTIVE TAB
========================= */

function setActiveTab(activeTab) {
  if (weekLeaderboardTab) {
    weekLeaderboardTab.classList.remove(
      "active"
    );
  }

  if (seasonLeaderboardTab) {
    seasonLeaderboardTab.classList.remove(
      "active"
    );
  }

  if (activeTab) {
    activeTab.classList.add("active");
  }
}


/* =========================
   DISPLAY LEADERBOARD
========================= */

function displayLeaderboard(heading) {
  if (leaderboardRows.length === 0) {
    leaderboardContainer.innerHTML = `
      <h2>${heading}</h2>
      <p>No predictions submitted yet.</p>
    `;

    return;
  }

  leaderboardContainer.innerHTML = `
    <h2>${heading} 🏆</h2>
  `;

  leaderboardRows.forEach(
    (row, index) => {
    const div =
  document.createElement("div");

const isMe =
  row.username
    .trim()
    .toLowerCase() ===
  myUsername;

div.className =
  isMe
    ? "leaderboard-row my-row"
    : "leaderboard-row";

      div.innerHTML = `
        <div>#${index + 1}</div>

        <div>
          <div>${row.username}</div>

          <div class="view-predictions-text">
            View predictions
          </div>
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

      div.addEventListener(
        "click",
        () => {
          localStorage.setItem(
            "viewPredictionId",
            row.id
          );

          localStorage.setItem(
            "viewPredictionUsername",
            row.username
          );

          window.location.href =
            "view-predictions.html";
        }
      );

      leaderboardContainer.appendChild(
        div
      );
    }
  );
}


/* =========================
   TAB CLICKS
========================= */

if (weekLeaderboardTab) {
  weekLeaderboardTab.addEventListener(
    "click",
    () => {
      setActiveTab(
        weekLeaderboardTab
      );

      displayLeaderboard(
        "Week One Leaderboard"
      );
    }
  );
}


if (seasonLeaderboardTab) {
  seasonLeaderboardTab.addEventListener(
    "click",
    () => {
      setActiveTab(
        seasonLeaderboardTab
      );

      /*
        For Week One, the season table
        is deliberately the same table.
      */
      displayLeaderboard(
        "Season Leaderboard"
      );
    }
  );
}


/* =========================
   LOAD FIRESTORE
========================= */

async function initialiseLeaderboard() {
  if (!leaderboardContainer) {
    console.error(
      "leaderboardContainer not found"
    );

    return;
  }

  leaderboardContainer.innerHTML =
    "Loading English League leaderboard...";

  try {
    const predictionsQuery =
      query(
        collection(
          db,
          "scorecast24_predictions"
        ),
        where(
          "round",
          "==",
          currentRound
        )
      );

    const predictionsSnap =
      await Promise.race([
        getDocs(predictionsQuery),
        timeoutPromise(12000)
      ]);

    leaderboardRows = [];

    predictionsSnap.forEach(
      (docSnap) => {
        const data =
          docSnap.data();

        leaderboardRows.push({
          id: docSnap.id,

          username:
            data.username || "Unknown",

          points:
            calculatePoints(
              data.predictions || []
            )
        });
      }
    );

    leaderboardRows.sort(
      (a, b) =>
        (b.points || 0) -
        (a.points || 0)
    );

    setActiveTab(
      weekLeaderboardTab
    );

    displayLeaderboard(
      "Week One Leaderboard"
    );

  } catch (error) {
    console.error(
      "Leaderboard error:",
      error
    );

    leaderboardContainer.innerHTML = `
      <h2>Leaderboard Error</h2>
      <p>${error.message}</p>
    `;
  }
}


initialiseLeaderboard();
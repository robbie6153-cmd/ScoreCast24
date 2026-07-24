console.log("leaderboard.js loaded English League v4");

import { db } from "./firebase.js?v=7";

import {
  collection,
  getDocs
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
  1: { homeScore: null, awayScore: null },
  2: { homeScore: null, awayScore: null },
  3: { homeScore: null, awayScore: null },
  4: { homeScore: null, awayScore: null },
  5: { homeScore: null, awayScore: null },
  6: { homeScore: null, awayScore: null },
  7: { homeScore: null, awayScore: null },
  8: { homeScore: null, awayScore: null },
  9: { homeScore: null, awayScore: null },
  10: { homeScore: null, awayScore: null },
  11: { homeScore: null, awayScore: null },
  12: { homeScore: null, awayScore: null },
  13: { homeScore: null, awayScore: null }
};


let leaderboardRows = [];


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

      div.className =
        "leaderboard-row";

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
    const predictionsSnap =
      await Promise.race([
        getDocs(
          collection(
            db,
            "scorecast24_predictions"
          )
        ),
        timeoutPromise(40000)
      ]);

    leaderboardRows = [];

    predictionsSnap.forEach(
      (docSnap) => {
        const data =
          docSnap.data();

        if (
          data.round !== currentRound
        ) {
          return;
        }

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
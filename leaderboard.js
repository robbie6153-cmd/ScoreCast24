console.log("leaderboard.js loaded English League v2");

import { db } from "./firebase.js?v=7";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const leaderboardContainer =
  document.getElementById("leaderboardContainer");

const weekLeaderboardTab =
  document.getElementById("weekLeaderboardTab");

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


let allPredictionEntries = [];


/* =========================
   TIMEOUT
========================= */

function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Leaderboard load timed out"
          )
        ),
      ms
    )
  );
}


/* =========================
   CALCULATE CURRENT WEEK
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
   LOAD FIRESTORE ENTRIES
========================= */

async function loadPredictionEntries() {
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

  allPredictionEntries = [];

  predictionsSnap.forEach((docSnap) => {
    allPredictionEntries.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });
}


/* =========================
   TAB STYLING
========================= */

function setActiveTab(activeTab) {
  weekLeaderboardTab.classList.remove(
    "active"
  );

  seasonLeaderboardTab.classList.remove(
    "active"
  );

  activeTab.classList.add("active");
}


/* =========================
   DISPLAY ROWS
========================= */

function displayRows(
  rows,
  heading,
  allowPredictionViewing = true
) {
  if (rows.length === 0) {
    leaderboardContainer.innerHTML = `
      <h2>${heading}</h2>
      <p>No predictions submitted yet.</p>
    `;

    return;
  }


  leaderboardContainer.innerHTML = `
    <h2>${heading} 🏆</h2>
  `;


  rows.forEach((row, index) => {
    const div =
      document.createElement("div");

    div.className =
      "leaderboard-row";


    div.innerHTML = `
      <div>#${index + 1}</div>

      <div>
        <div>${row.username}</div>

        ${
          allowPredictionViewing
            ? `
              <div class="view-predictions-text">
                View predictions
              </div>
            `
            : `
              <div class="view-predictions-text">
                ${row.roundsPlayed} round${
                  row.roundsPlayed === 1
                    ? ""
                    : "s"
                } played
              </div>
            `
        }
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


    if (allowPredictionViewing) {
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
    }


    leaderboardContainer.appendChild(div);
  });
}


/* =========================
   WEEK ONE LEADERBOARD
========================= */

function renderWeekLeaderboard() {
  setActiveTab(weekLeaderboardTab);

  const rows =
    allPredictionEntries
      .filter(
        (entry) =>
          entry.round === currentRound
      )
      .map((entry) => ({
        id: entry.id,
        username:
          entry.username || "Unknown",
        points:
          calculatePoints(
            entry.predictions
          )
      }));


  rows.sort(
    (a, b) =>
      (b.points || 0) -
      (a.points || 0)
  );


  displayRows(
    rows,
    "Week 1 Leaderboard",
    true
  );
}


/* =========================
   SEASON LEADERBOARD
========================= */

function renderSeasonLeaderboard() {
  setActiveTab(seasonLeaderboardTab);

  const seasonTotals = {};


  allPredictionEntries.forEach(
    (entry) => {
      const username =
        entry.username || "Unknown";

      /*
        For the current round, use the
        live calculated score.

        For older rounds, use the saved
        Firestore points field.
      */
      const entryPoints =
        entry.round === currentRound
          ? calculatePoints(
              entry.predictions
            )
          : Number(entry.points);


      /*
        Do not add rounds whose scores
        have not been calculated yet.
      */
      if (
        entryPoints === null ||
        entryPoints === undefined ||
        Number.isNaN(entryPoints)
      ) {
        return;
      }


      if (!seasonTotals[username]) {
        seasonTotals[username] = {
          username,
          points: 0,
          roundsPlayed: 0
        };
      }


      seasonTotals[username].points +=
        entryPoints;

      seasonTotals[username].roundsPlayed +=
        1;
    }
  );


  const rows =
    Object.values(seasonTotals);


  rows.sort(
    (a, b) =>
      b.points - a.points
  );


  displayRows(
    rows,
    "Season Leaderboard",
    false
  );
}


/* =========================
   INITIAL LOAD
========================= */

async function initialiseLeaderboard() {
  leaderboardContainer.innerHTML =
    "Loading English League leaderboard...";

  try {
    await loadPredictionEntries();

    renderWeekLeaderboard();

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


weekLeaderboardTab.addEventListener(
  "click",
  renderWeekLeaderboard
);


seasonLeaderboardTab.addEventListener(
  "click",
  renderSeasonLeaderboard
);


initialiseLeaderboard();
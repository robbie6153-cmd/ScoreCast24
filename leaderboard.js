console.log("leaderboard.js loaded English League v6");

import { db } from "./firebase.js?v=107";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  resultsByRound
} from "./results.js?v=1";


/* =========================
   PAGE ELEMENTS
========================= */

const leaderboardContainer =
  document.getElementById(
    "leaderboardContainer"
  );

const weekLeaderboardTab =
  document.getElementById(
    "weekLeaderboardTab"
  ) ||
  document.getElementById(
    "groupStageTotalTab"
  );

const seasonLeaderboardTab =
  document.getElementById(
    "seasonLeaderboardTab"
  );


/* =========================
   CURRENT ROUND
========================= */

const currentRound =
  "English League Week Two";

const currentWeekHeading =
  "Week Two Leaderboard";


/* =========================
   LEADERBOARD DATA
========================= */

let weekLeaderboardRows = [];

let seasonLeaderboardRows = [];

let activeLeaderboard =
  "week";


/* =========================
   CURRENT USER
========================= */

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
   CLEAN USERNAME
========================= */

function normaliseUsername(username) {

  return (
    username || ""
  )
    .trim()
    .toLowerCase();

}


/* =========================
   FIRESTORE TIMESTAMP
========================= */

function timestampToMillis(timestamp) {

  if (!timestamp) {
    return null;
  }


  /*
    Normal Firestore Timestamp.
  */

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();

  }


  /*
    Fallback if timestamp has been
    converted to a Date.
  */

  if (timestamp instanceof Date) {

    return timestamp.getTime();

  }


  /*
    Fallback for timestamp-like
    objects containing seconds.
  */

  if (
    typeof timestamp.seconds ===
    "number"
  ) {

    return (
      timestamp.seconds * 1000
    );

  }


  return null;

}


/* =========================
   CALCULATE ROUND STATS
========================= */

function calculateRoundStats(
  predictions = [],
  round
) {

  const roundResults =
    resultsByRound[round];


  if (!roundResults) {

    return {
      points: null,
      exactScores: 0
    };

  }


  let totalPoints = 0;

  let exactScores = 0;

  let hasAnyResult = false;


  predictions.forEach(
    (prediction) => {

      const result =
        roundResults[
          prediction.fixtureId
        ];


      if (!result) {
        return;
      }


      /*
        == null deliberately catches
        BOTH null and undefined.
      */

      if (
        result.homeScore == null ||
        result.awayScore == null
      ) {
        return;
      }


      hasAnyResult = true;


      const predictedHome =
        Number(
          prediction.predictedHome
        );

      const predictedAway =
        Number(
          prediction.predictedAway
        );

      const actualHome =
        Number(
          result.homeScore
        );

      const actualAway =
        Number(
          result.awayScore
        );


      /* =========================
         EXACT SCORE = 5 POINTS
         ALSO COUNTS FOR TIEBREAK
      ========================= */

      if (
        predictedHome === actualHome &&
        predictedAway === actualAway
      ) {

        totalPoints += 5;

        exactScores += 1;

        return;

      }


      /* =========================
         CORRECT DRAW = 3 POINTS
      ========================= */

      if (
        predictedHome ===
          predictedAway &&
        actualHome === actualAway
      ) {

        totalPoints += 3;

        return;

      }


      /* =========================
         CORRECT HOME WIN = 1 POINT
      ========================= */

      if (
        predictedHome >
          predictedAway &&
        actualHome >
          actualAway
      ) {

        totalPoints += 1;

        return;

      }


      /* =========================
         CORRECT AWAY WIN = 2 POINTS
      ========================= */

      if (
        predictedHome <
          predictedAway &&
        actualHome <
          actualAway
      ) {

        totalPoints += 2;

      }

    }
  );


  return {

    points:
      hasAnyResult
        ? totalPoints
        : null,

    exactScores

  };

}


/* =========================
   SORT LEADERBOARD
========================= */

function sortLeaderboard(rows) {

  rows.sort((a, b) => {

    /*
      Players whose matches have not
      started yet go underneath players
      who already have scored results.
    */

    if (
      a.points == null &&
      b.points != null
    ) {

      return 1;

    }


    if (
      a.points != null &&
      b.points == null
    ) {

      return -1;

    }


    /*
      If BOTH players are pending,
      use submission time so the
      ordering remains consistent.
    */

    if (
      a.points == null &&
      b.points == null
    ) {

      const aTime =
        a.submittedAtMillis;

      const bTime =
        b.submittedAtMillis;


      if (
        aTime != null &&
        bTime != null &&
        aTime !== bTime
      ) {

        return aTime - bTime;

      }


      if (
        aTime != null &&
        bTime == null
      ) {

        return -1;

      }


      if (
        aTime == null &&
        bTime != null
      ) {

        return 1;

      }


      return a.username.localeCompare(
        b.username
      );

    }


    const aPoints =
      a.points ?? 0;

    const bPoints =
      b.points ?? 0;


    /* =========================
       TIEBREAK RULE 1

       HIGHEST POINTS
    ========================= */

    if (
      bPoints !== aPoints
    ) {

      return bPoints - aPoints;

    }


    const aExactScores =
      a.exactScores ?? 0;

    const bExactScores =
      b.exactScores ?? 0;


    /* =========================
       TIEBREAK RULE 2

       MOST EXACT SCORES
    ========================= */

    if (
      bExactScores !==
      aExactScores
    ) {

      return (
        bExactScores -
        aExactScores
      );

    }


    const aTime =
      a.submittedAtMillis;

    const bTime =
      b.submittedAtMillis;


    /* =========================
       TIEBREAK RULE 3

       EARLIEST SUBMISSION
    ========================= */

    if (
      aTime != null &&
      bTime != null &&
      aTime !== bTime
    ) {

      return aTime - bTime;

    }


    /*
      If only one entry has a valid
      timestamp, favour that entry.
    */

    if (
      aTime != null &&
      bTime == null
    ) {

      return -1;

    }


    if (
      aTime == null &&
      bTime != null
    ) {

      return 1;

    }


    /*
      Extremely unlikely final fallback:
      same points, same exact scores and
      identical/missing submission time.

      Alphabetical ordering simply keeps
      the display deterministic.
    */

    return a.username.localeCompare(
      b.username
    );

  });

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

    activeTab.classList.add(
      "active"
    );

  }

}


/* =========================
   DISPLAY LEADERBOARD
========================= */

function displayLeaderboard(
  rows,
  heading
) {

  if (!leaderboardContainer) {
    return;
  }


  if (rows.length === 0) {

    leaderboardContainer.innerHTML = `
      <h2>${heading}</h2>

      <p>
        No predictions submitted yet.
      </p>
    `;

    return;

  }


  leaderboardContainer.innerHTML = `
    <h2>${heading} 🏆</h2>
  `;


  rows.forEach(
    (row, index) => {

      const div =
        document.createElement(
          "div"
        );


      const isMe =
        normaliseUsername(
          row.username
        ) === myUsername;


      div.className =
        isMe
          ? "leaderboard-row my-row"
          : "leaderboard-row";


      div.innerHTML = `
        <div>
          #${index + 1}
        </div>

        <div>

          <div>
            ${row.username}
          </div>

          ${
            row.viewId
              ? `
                <div
                  class="view-predictions-text"
                >
                  View predictions
                </div>
              `
              : ""
          }

        </div>

        <div
          class="leaderboard-points"
        >
          ${
            row.points == null
              ?
                "Score pending match results"
              :
                `${row.points} pts`
          }
        </div>
      `;


      /*
        For the current-week leaderboard,
        this opens that person's current
        round predictions.

        For the season leaderboard,
        it uses their newest/preferred
        available prediction document.
      */

      if (row.viewId) {

        div.addEventListener(
          "click",
          () => {

            localStorage.setItem(
              "viewPredictionId",
              row.viewId
            );

            localStorage.setItem(
              "viewPredictionUsername",
              row.username
            );


            if (row.viewRound) {

              localStorage.setItem(
                "viewPredictionRound",
                row.viewRound
              );

            }


            window.location.href =
              "view-predictions.html";

          }
        );

      }


      leaderboardContainer.appendChild(
        div
      );

    }
  );

}


/* =========================
   WEEK TAB
========================= */

if (weekLeaderboardTab) {

  weekLeaderboardTab.addEventListener(
    "click",
    () => {

      activeLeaderboard =
        "week";


      setActiveTab(
        weekLeaderboardTab
      );


      displayLeaderboard(
        weekLeaderboardRows,
        currentWeekHeading
      );

    }
  );

}


/* =========================
   SEASON TAB
========================= */

if (seasonLeaderboardTab) {

  seasonLeaderboardTab.addEventListener(
    "click",
    () => {

      activeLeaderboard =
        "season";


      setActiveTab(
        seasonLeaderboardTab
      );


      displayLeaderboard(
        seasonLeaderboardRows,
        "Season Leaderboard"
      );

    }
  );

}


/* =========================
   BUILD WEEK LEADERBOARD
========================= */

function buildWeekLeaderboard(
  predictionDocuments
) {

  weekLeaderboardRows = [];


  predictionDocuments.forEach(
    (entry) => {

      if (
        entry.round !== currentRound
      ) {

        return;

      }


      const stats =
        calculateRoundStats(
          entry.predictions || [],
          currentRound
        );


      weekLeaderboardRows.push({

        id:
          entry.id,

        viewId:
          entry.id,

        viewRound:
          entry.round,

        username:
          entry.username ||
          "Unknown",

        points:
          stats.points,

        exactScores:
          stats.exactScores,

        submittedAtMillis:
          entry.submittedAtMillis

      });

    }
  );


  /*
    Week ranking:

    1. Points
    2. Exact scores
    3. Earliest submission
  */

  sortLeaderboard(
    weekLeaderboardRows
  );

}


/* =========================
   BUILD SEASON LEADERBOARD
========================= */

function buildSeasonLeaderboard(
  predictionDocuments
) {

  const playerMap =
    new Map();


  predictionDocuments.forEach(
    (entry) => {

      /*
        Ignore prediction rounds that
        do not belong to the current
        English League season results.
      */

      if (
        !resultsByRound[
          entry.round
        ]
      ) {

        return;

      }


      const username =
        entry.username ||
        "Unknown";


      const usernameKey =
        normaliseUsername(
          username
        );


      if (!usernameKey) {
        return;
      }


      if (
        !playerMap.has(
          usernameKey
        )
      ) {

        playerMap.set(
          usernameKey,
          {

            username,

            totalPoints: 0,

            totalExactScores: 0,

            hasAnyResult: false,

            earliestSubmission:
              null,

            viewId: null,

            viewRound: null,

            roundDocs: {}

          }
        );

      }


      const player =
        playerMap.get(
          usernameKey
        );


      const stats =
        calculateRoundStats(
          entry.predictions || [],
          entry.round
        );


      /*
        Add scored rounds to the
        running season total.
      */

      if (
        stats.points !== null
      ) {

        player.totalPoints +=
          stats.points;

        player.totalExactScores +=
          stats.exactScores;

        player.hasAnyResult =
          true;

      }


      /*
        Keep the player's earliest
        submission time.

        This becomes the final
        season-level tiebreak after
        points and exact scores.
      */

      if (
        entry.submittedAtMillis != null
      ) {

        if (
          player.earliestSubmission ==
            null ||
          entry.submittedAtMillis <
            player.earliestSubmission
        ) {

          player.earliestSubmission =
            entry.submittedAtMillis;

        }

      }


      /*
        Remember the document belonging
        to each round.
      */

      player.roundDocs[
        entry.round
      ] = entry.id;


      /*
        Prefer the CURRENT round for
        the View Predictions link.
      */

      if (
        entry.round === currentRound
      ) {

        player.viewId =
          entry.id;

        player.viewRound =
          entry.round;

      } else if (
        !player.viewId
      ) {

        /*
          If the player hasn't entered
          the current week, allow an
          existing entry to be viewed.
        */

        player.viewId =
          entry.id;

        player.viewRound =
          entry.round;

      }

    }
  );


  seasonLeaderboardRows =
    Array.from(
      playerMap.values()
    )
      .map(
        (player) => ({

          username:
            player.username,

          points:
            player.hasAnyResult
              ? player.totalPoints
              : null,

          exactScores:
            player.totalExactScores,

          submittedAtMillis:
            player.earliestSubmission,

          viewId:
            player.viewId,

          viewRound:
            player.viewRound

        })
      );


  /*
    Season ranking:

    1. Total season points
    2. Total exact scores
    3. Earliest submission
  */

  sortLeaderboard(
    seasonLeaderboardRows
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

    /*
      Load the English League
      prediction documents and build
      TWO separate tables:

      1. Current Week
      2. Full Season
    */

    const predictionsSnap =
      await Promise.race([

        getDocs(
          collection(
            db,
            "scorecast24_predictions"
          )
        ),

        timeoutPromise(
          12000
        )

      ]);


    const predictionDocuments =
      [];


    predictionsSnap.forEach(
      (docSnap) => {

        const data =
          docSnap.data();


        /*
          Only keep rounds listed in
          resultsByRound.

          This prevents unrelated
          prediction competitions from
          entering this leaderboard.
        */

        if (
          !resultsByRound[
            data.round
          ]
        ) {

          return;

        }


        predictionDocuments.push({

          id:
            docSnap.id,

          username:
            data.username ||
            "Unknown",

          round:
            data.round,

          predictions:
            Array.isArray(
              data.predictions
            )
              ? data.predictions
              : [],

          submittedAtMillis:
            timestampToMillis(
              data.submittedAt
            )

        });

      }
    );


    /* =========================
       BUILD CURRENT WEEK
    ========================= */

    buildWeekLeaderboard(
      predictionDocuments
    );


    /* =========================
       BUILD SEASON
    ========================= */

    buildSeasonLeaderboard(
      predictionDocuments
    );


    /* =========================
       OPEN ON CURRENT WEEK
    ========================= */

    activeLeaderboard =
      "week";


    setActiveTab(
      weekLeaderboardTab
    );


    displayLeaderboard(
      weekLeaderboardRows,
      currentWeekHeading
    );


  } catch (error) {

    console.error(
      "Leaderboard error:",
      error
    );


    leaderboardContainer.innerHTML = `
      <h2>
        Leaderboard Error
      </h2>

      <p>
        ${error.message}
      </p>
    `;

  }

}


/* =========================
   START
========================= */

initialiseLeaderboard();
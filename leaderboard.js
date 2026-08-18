console.log("leaderboard.js loaded English League v5");

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
   RESULTS BY ROUND

   Historical fixtures do NOT need
   to remain in index.js.

   Only the fixture ID and final
   score are required here.
========================= */

const resultsByRound = {

  /* =========================
     WEEK ONE
  ========================= */

  "English League Week One": {
    1: {
      homeScore: 2,
      awayScore: 2
    },

    2: {
      homeScore: 2,
      awayScore: 1
    },

    3: {
      homeScore: 0,
      awayScore: 2
    },

    4: {
      homeScore: 2,
      awayScore: 1
    },

    5: {
      homeScore: 2,
      awayScore: 1
    },

    6: {
      homeScore: 1,
      awayScore: 2
    },

    7: {
      homeScore: 1,
      awayScore: 3
    },

    8: {
      homeScore: 1,
      awayScore: 2
    },

    9: {
      homeScore: 0,
      awayScore: 0
    },

    10: {
      homeScore: 2,
      awayScore: 1
    },

    11: {
      homeScore: 3,
      awayScore: 0
    },

    12: {
      homeScore: 2,
      awayScore: 2
    },

    13: {
      homeScore: 1,
      awayScore: 1
    }
  },


  /* =========================
     WEEK TWO
  ========================= */

  "English League Week Two": {

    1: {
      homeScore: null,
      awayScore: null
    },

    2: {
      homeScore: null,
      awayScore: null
    },

    3: {
      homeScore: null,
      awayScore: null
    },

    4: {
      homeScore: null,
      awayScore: null
    },

    5: {
      homeScore: null,
      awayScore: null
    },

    6: {
      homeScore: null,
      awayScore: null
    },

    7: {
      homeScore: null,
      awayScore: null
    },

    8: {
      homeScore: null,
      awayScore: null
    },

    9: {
      homeScore: null,
      awayScore: null
    },

    10: {
      homeScore: null,
      awayScore: null
    },

    11: {
      homeScore: null,
      awayScore: null
    },

    12: {
      homeScore: null,
      awayScore: null
    },

    13: {
      homeScore: null,
      awayScore: null
    },

    14: {
      homeScore: null,
      awayScore: null
    },

    15: {
      homeScore: null,
      awayScore: null
    },

    16: {
      homeScore: null,
      awayScore: null
    },

    17: {
      homeScore: null,
      awayScore: null
    },

    18: {
      homeScore: null,
      awayScore: null
    },

    19: {
      homeScore: null,
      awayScore: null
    },

    20: {
      homeScore: null,
      awayScore: null
    },

    21: {
      homeScore: null,
      awayScore: null
    },

    22: {
      homeScore: null,
      awayScore: null
    }

  }

};


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
   CALCULATE ROUND POINTS
========================= */

function calculatePoints(
  predictions = [],
  round
) {
  const roundResults =
    resultsByRound[round];

  if (!roundResults) {
    return null;
  }

  let total = 0;

  let hasAnyResult = false;


  predictions.forEach(
    (prediction) => {

      const result =
        roundResults[
          prediction.fixtureId
        ];

      if (!result) return;


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


      /* EXACT SCORE = 5 */

      if (
        predictedHome === actualHome &&
        predictedAway === actualAway
      ) {
        total += 5;

        return;
      }


      /* CORRECT DRAW = 3 */

      if (
        predictedHome ===
          predictedAway &&
        actualHome === actualAway
      ) {
        total += 3;

        return;
      }


      /* CORRECT HOME WIN = 1 */

      if (
        predictedHome >
          predictedAway &&
        actualHome >
          actualAway
      ) {
        total += 1;

        return;
      }


      /* CORRECT AWAY WIN = 2 */

      if (
        predictedHome <
          predictedAway &&
        actualHome <
          actualAway
      ) {
        total += 2;
      }

    }
  );


  return hasAnyResult
    ? total
    : null;
}


/* =========================
   SORT LEADERBOARD
========================= */

function sortLeaderboard(rows) {

  rows.sort((a, b) => {

    /*
      Players with pending scores go
      underneath players who already
      have points.
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


    const aPoints =
      a.points || 0;

    const bPoints =
      b.points || 0;


    if (bPoints !== aPoints) {
      return bPoints - aPoints;
    }


    /*
      Alphabetical order when tied.
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
        For the Week Two leaderboard,
        this opens that person's
        Week Two predictions.

        For the season leaderboard,
        it uses their newest available
        prediction document.
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
          calculatePoints(
            entry.predictions || [],
            currentRound
          )

      });

    }
  );


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

            hasAnyResult: false,

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


      const roundPoints =
        calculatePoints(
          entry.predictions || [],
          entry.round
        );


      /*
        Add completed/scored rounds
        to the running season total.
      */

      if (roundPoints !== null) {

        player.totalPoints +=
          roundPoints;

        player.hasAnyResult =
          true;

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
          Week Two, allow their latest
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

          viewId:
            player.viewId,

          viewRound:
            player.viewRound

        })
      );


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
      We now load the English League
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
              : []

        });

      }
    );


    /* BUILD WEEK TWO */

    buildWeekLeaderboard(
      predictionDocuments
    );


    /* BUILD SEASON */

    buildSeasonLeaderboard(
      predictionDocuments
    );


    /* OPEN ON WEEK TWO */

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
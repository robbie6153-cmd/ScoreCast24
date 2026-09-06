console.log(
  "leaderboard.js loaded English League v8"
);

import { db } from "./firebase.js?v=107";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  resultsByRound
} from "./results.js?v=2";


/* =====================================================
   PAGE ELEMENTS
===================================================== */

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

const weekSelectorContainer =
  document.getElementById(
    "weekSelectorContainer"
  );

const weekSelector =
  document.getElementById(
    "weekSelector"
  );


/* =====================================================
   SCORECAST24 ROUND NUMBERING

   OLD STORED ROUND       NEW DISPLAY

   Week One               Week 0 - Championship
   Week Two               Week 1
   Week Three             Week 2
   Week Four              Week 3

   New entries:
   English League Week 4  Week 4
===================================================== */

const englishLeagueRounds = [

  {
    id: "English League Week 0",
    label: "Week 0 - Championship",

    storedRound:
      "English League Week One",

    resultsRound:
      "English League Week One"
  },

  {
    id: "English League Week 1",
    label: "Week 1",

    storedRound:
      "English League Week Two",

    resultsRound:
      "English League Week Two"
  },

  {
    id: "English League Week 2",
    label: "Week 2",

    storedRound:
      "English League Week Three",

    resultsRound:
      "English League Week Three"
  },

  {
    id: "English League Week 3",
    label: "Week 3",

    storedRound:
      "English League Week Four",

    resultsRound:
      "English League Week Four"
  },

  {
    id: "English League Week 4",
    label: "Week 4",

    storedRound:
      "English League Week 4",

    resultsRound:
      "English League Week 4"
  }

];


/*
  Week 4 is OPEN for predictions.
*/
const currentRound =
  "English League Week 4";


/*
  Week 3 remains the leaderboard
  initially displayed.
*/
const currentLeaderboardRound =
  "English League Week 3";


let selectedRound =
  currentLeaderboardRound;


/* =====================================================
   LIVE RESULTS FROM FIRESTORE
===================================================== */

let liveResultsByRound = {};


/* =====================================================
   LEADERBOARD DATA
===================================================== */

let predictionDocuments = [];

let weekLeaderboardRows = [];

let seasonLeaderboardRows = [];

let activeLeaderboard =
  "week";


/* =====================================================
   CURRENT USER
===================================================== */

const myUsername =
  (
    localStorage.getItem(
      "scorecast24Username"
    ) || ""
  )
    .trim()
    .toLowerCase();


/* =====================================================
   TIMEOUT
===================================================== */

function timeoutPromise(ms) {

  return new Promise(
    (_, reject) => {

      setTimeout(
        () => {

          reject(
            new Error(
              "Leaderboard load timed out"
            )
          );

        },
        ms
      );

    }
  );
}


/* =====================================================
   CLEAN USERNAME
===================================================== */

function normaliseUsername(
  username
) {

  return (
    username || ""
  )
    .trim()
    .toLowerCase();
}


/* =====================================================
   FIRESTORE TIMESTAMP
===================================================== */

function timestampToMillis(
  timestamp
) {

  if (!timestamp) {
    return null;
  }


  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();
  }


  if (
    timestamp instanceof Date
  ) {

    return timestamp.getTime();
  }


  if (
    typeof timestamp.seconds ===
    "number"
  ) {

    return (
      timestamp.seconds *
      1000
    );
  }


  return null;
}


/* =====================================================
   ROUND HELPERS
===================================================== */

function getRoundConfig(
  roundId
) {

  return (
    englishLeagueRounds.find(
      (round) =>
        round.id === roundId
    ) || null
  );
}


function getRoundLabel(
  roundId
) {

  const round =
    getRoundConfig(
      roundId
    );


  return round
    ? round.label
    : roundId;
}


/*
  Converts an OLD Firestore round name
  into the NEW ScoreCast24 numbering.
*/

function getLogicalRoundFromStoredRound(
  storedRound
) {

  const round =
    englishLeagueRounds.find(
      (item) =>
        item.storedRound ===
        storedRound
    );


  return round
    ? round.id
    : null;
}


/*
  Accept both the old stored round IDs
  and the new canonical IDs.
*/

function isEnglishLeagueRound(
  roundId
) {

  return englishLeagueRounds.some(
    (round) =>
      round.id === roundId ||
      round.storedRound === roundId
  );
}


/* =====================================================
   RESULT ROUND LOOKUP
===================================================== */

function getResultsForLogicalRound(
  logicalRound
) {

  const config =
    getRoundConfig(
      logicalRound
    );


  if (!config) {
    return {};
  }


  /*
    Static results.js results.

    Historical weeks still use their
    old stored names.
  */

  const staticResults = {

    ...(
      resultsByRound[
        config.resultsRound
      ] || {}
    ),

    ...(
      resultsByRound[
        logicalRound
      ] || {}
    )

  };


  /*
    Firestore live results.

    Again accept both old and new names.
  */

  const liveResults = {

    ...(
      liveResultsByRound[
        config.resultsRound
      ] || {}
    ),

    ...(
      liveResultsByRound[
        logicalRound
      ] || {}
    )

  };


  return {

    ...staticResults,
    ...liveResults

  };
}


/* =====================================================
   LOAD LIVE RESULTS FROM FIRESTORE
===================================================== */

async function loadLiveResults() {

  liveResultsByRound = {};


  const resultsSnap =
    await getDocs(
      collection(
        db,
        "scorecast24_results"
      )
    );


  resultsSnap.forEach(
    (docSnap) => {

      const data =
        docSnap.data();


      const round =
        data.round;


      const fixtureId =
        String(
          data.fixtureId || ""
        );


      if (
        !round ||
        !fixtureId
      ) {

        return;
      }


      if (
        !liveResultsByRound[
          round
        ]
      ) {

        liveResultsByRound[
          round
        ] = {};
      }


      liveResultsByRound[
        round
      ][
        fixtureId
      ] = {

        homeScore:
          data.homeScore ??
          null,

        awayScore:
          data.awayScore ??
          null

      };

    }
  );
}


/* =====================================================
   BUILD WEEK SELECTOR
===================================================== */

function buildWeekSelector() {

  if (!weekSelector) {
    return;
  }


  weekSelector.innerHTML =
    "";


  /*
    Newest week first.
  */

  [...englishLeagueRounds]
    .reverse()
    .forEach(
      (round) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          round.id;


        option.textContent =
          round.label;


        if (
          round.id ===
          selectedRound
        ) {

          option.selected =
            true;
        }


        weekSelector.appendChild(
          option
        );

      }
    );
}


/* =====================================================
   CALCULATE ROUND STATS
===================================================== */

function calculateRoundStats(
  predictions = [],
  logicalRound
) {

  const roundResults =
    getResultsForLogicalRound(
      logicalRound
    );


  let totalPoints = 0;

  let exactScores = 0;

  let hasAnyResult =
    false;


  predictions.forEach(
    (prediction) => {


      /*
        Void fixtures never score.
      */

      if (
        prediction.void === true
      ) {

        return;
      }


      const result =
        roundResults[
          prediction.fixtureId
        ];


      if (!result) {
        return;
      }


      if (
        result.homeScore == null ||
        result.awayScore == null
      ) {

        return;
      }


      hasAnyResult =
        true;


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
         EXACT SCORE = 5
      ========================= */

      if (
        predictedHome ===
          actualHome &&
        predictedAway ===
          actualAway
      ) {

        totalPoints += 5;

        exactScores += 1;

        return;
      }


      /* =========================
         CORRECT DRAW = 3
      ========================= */

      if (
        predictedHome ===
          predictedAway &&
        actualHome ===
          actualAway
      ) {

        totalPoints += 3;

        return;
      }


      /* =========================
         CORRECT HOME WIN = 1
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
         CORRECT AWAY WIN = 2
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


/* =====================================================
   SORT LEADERBOARD
===================================================== */

function sortLeaderboard(
  rows
) {

  rows.sort(
    (a, b) => {


      /*
        Scored players above
        pending players.
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
        Pending round:
        earliest submission first.
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

          return (
            aTime - bTime
          );
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


        return (
          a.username.localeCompare(
            b.username
          )
        );
      }


      const aPoints =
        a.points ?? 0;


      const bPoints =
        b.points ?? 0;


      /* =========================
         TIEBREAK 1
         POINTS
      ========================= */

      if (
        bPoints !==
        aPoints
      ) {

        return (
          bPoints -
          aPoints
        );
      }


      const aExactScores =
        a.exactScores ?? 0;


      const bExactScores =
        b.exactScores ?? 0;


      /* =========================
         TIEBREAK 2
         EXACT SCORES
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
         TIEBREAK 3
         EARLIEST SUBMISSION
      ========================= */

      if (
        aTime != null &&
        bTime != null &&
        aTime !== bTime
      ) {

        return (
          aTime -
          bTime
        );
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


      return (
        a.username.localeCompare(
          b.username
        )
      );

    }
  );
}


/* =====================================================
   ACTIVE TAB
===================================================== */

function setActiveTab(
  activeTab
) {

  if (
    weekLeaderboardTab
  ) {

    weekLeaderboardTab
      .classList
      .remove(
        "active"
      );
  }


  if (
    seasonLeaderboardTab
  ) {

    seasonLeaderboardTab
      .classList
      .remove(
        "active"
      );
  }


  if (activeTab) {

    activeTab
      .classList
      .add(
        "active"
      );
  }
}


/* =====================================================
   WEEK SELECTOR VISIBILITY
===================================================== */

function showWeekSelector() {

  if (
    weekSelectorContainer
  ) {

    weekSelectorContainer
      .style
      .display = "";
  }
}


function hideWeekSelector() {

  if (
    weekSelectorContainer
  ) {

    weekSelectorContainer
      .style
      .display = "none";
  }
}


/* =====================================================
   DISPLAY LEADERBOARD
===================================================== */

function displayLeaderboard(
  rows,
  heading
) {

  if (
    !leaderboardContainer
  ) {

    return;
  }


  if (
    rows.length === 0
  ) {

    leaderboardContainer.innerHTML = `
      <h2>
        ${heading}
      </h2>

      <p>
        No predictions submitted yet.
      </p>
    `;

    return;
  }


  leaderboardContainer.innerHTML = `
    <h2>
      ${heading} 🏆
    </h2>
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


      if (
        row.viewId
      ) {

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


            if (
              row.viewRound
            ) {

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


      leaderboardContainer
        .appendChild(
          div
        );

    }
  );
}


/* =====================================================
   BUILD SELECTED WEEK LEADERBOARD
===================================================== */

function buildWeekLeaderboard(
  logicalRound
) {

  weekLeaderboardRows =
    [];


  predictionDocuments.forEach(
    (entry) => {


      if (
        entry.logicalRound !==
        logicalRound
      ) {

        return;
      }


      const stats =
        calculateRoundStats(
          entry.predictions || [],
          logicalRound
        );


      weekLeaderboardRows.push({

        id:
          entry.id,

        viewId:
          entry.id,

        /*
          Keep the REAL stored round here
          because View Predictions may
          still use it.
        */

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


  sortLeaderboard(
    weekLeaderboardRows
  );
}


/* =====================================================
   DISPLAY SELECTED WEEK
===================================================== */

function displaySelectedWeek() {

  buildWeekLeaderboard(
    selectedRound
  );


  const label =
    getRoundLabel(
      selectedRound
    );


  displayLeaderboard(
    weekLeaderboardRows,
    `${label} Leaderboard`
  );
}


/* =====================================================
   CURRENT LEADERBOARD TAB
===================================================== */

if (
  weekLeaderboardTab
) {

  weekLeaderboardTab
    .addEventListener(
      "click",
      () => {

        activeLeaderboard =
          "week";


        setActiveTab(
          weekLeaderboardTab
        );


        showWeekSelector();


        displaySelectedWeek();

      }
    );
}


/* =====================================================
   WEEK DROPDOWN
===================================================== */

if (
  weekSelector
) {

  weekSelector
    .addEventListener(
      "change",
      () => {

        selectedRound =
          weekSelector.value;


        activeLeaderboard =
          "week";


        setActiveTab(
          weekLeaderboardTab
        );


        displaySelectedWeek();

      }
    );
}


/* =====================================================
   SEASON TAB
===================================================== */

if (
  seasonLeaderboardTab
) {

  seasonLeaderboardTab
    .addEventListener(
      "click",
      () => {

        activeLeaderboard =
          "season";


        setActiveTab(
          seasonLeaderboardTab
        );


        hideWeekSelector();


        displayLeaderboard(
          seasonLeaderboardRows,
          "Season Leaderboard"
        );

      }
    );
}


/* =====================================================
   BUILD SEASON LEADERBOARD
===================================================== */

function buildSeasonLeaderboard() {

  const playerMap =
    new Map();


  predictionDocuments.forEach(
    (entry) => {


      if (
        !entry.logicalRound
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


      if (
        !usernameKey
      ) {

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

            totalPoints:
              0,

            totalExactScores:
              0,

            hasAnyResult:
              false,

            earliestSubmission:
              null,

            viewId:
              null,

            viewRound:
              null,

            viewLogicalRound:
              null

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
          entry.logicalRound
        );


      if (
        stats.points !==
        null
      ) {

        player.totalPoints +=
          stats.points;


        player.totalExactScores +=
          stats.exactScores;


        player.hasAnyResult =
          true;
      }


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
        Prefer the newest logical round
        for View Predictions.
      */

      if (
        !player.viewLogicalRound ||
        getRoundNumber(
          entry.logicalRound
        ) >
        getRoundNumber(
          player.viewLogicalRound
        )
      ) {

        player.viewId =
          entry.id;


        player.viewRound =
          entry.round;


        player.viewLogicalRound =
          entry.logicalRound;
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
              ?
                player.totalPoints
              :
                null,

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


  sortLeaderboard(
    seasonLeaderboardRows
  );
}


/* =====================================================
   ROUND NUMBER
===================================================== */

function getRoundNumber(
  roundId
) {

  const match =
    String(
      roundId || ""
    ).match(
      /Week\s+(\d+)/i
    );


  return match
    ? Number(
        match[1]
      )
    : -1;
}


/* =====================================================
   LOAD FIRESTORE
===================================================== */

async function initialiseLeaderboard() {

  if (
    !leaderboardContainer
  ) {

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

        timeoutPromise(
          12000
        )

      ]);


    predictionDocuments =
      [];


    predictionsSnap.forEach(
      (docSnap) => {

        const data =
          docSnap.data();


        if (
          !isEnglishLeagueRound(
            data.round
          )
        ) {

          return;
        }


        const logicalRound =
          getLogicalRoundFromStoredRound(
            data.round
          ) ||
          (
            englishLeagueRounds.some(
              (round) =>
                round.id ===
                data.round
            )
              ?
                data.round
              :
                null
          );


        if (
          !logicalRound
        ) {

          return;
        }


        predictionDocuments.push({

          id:
            docSnap.id,

          username:
            data.username ||
            "Unknown",

          /*
            Original Firestore value.
          */

          round:
            data.round,


          /*
            New ScoreCast24 week number.
          */

          logicalRound,

          predictions:
            Array.isArray(
              data.predictions
            )
              ?
                data.predictions
              :
                [],

          submittedAtMillis:
            timestampToMillis(
              data.submittedAt
            )

        });

      }
    );


    /* =========================
       LOAD LIVE RESULTS
    ========================= */

    await loadLiveResults();


    /* =========================
       BUILD DROPDOWN
    ========================= */

    buildWeekSelector();


    /* =========================
       BUILD WEEK
    ========================= */

    buildWeekLeaderboard(
      selectedRound
    );


    /* =========================
       BUILD SEASON
    ========================= */

    buildSeasonLeaderboard();


    /* =========================
       OPEN ON WEEK THREE
    ========================= */

    activeLeaderboard =
      "week";


    setActiveTab(
      weekLeaderboardTab
    );


    showWeekSelector();


    displaySelectedWeek();


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


/* =====================================================
   START
===================================================== */

initialiseLeaderboard();
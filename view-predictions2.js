import { db } from "./firebase.js?v=107";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  resultsByRound
} from "./results.js?v=2";


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const predictionTitle =
  document.getElementById(
    "predictionTitle"
  );

const predictionContainer =
  document.getElementById(
    "predictionContainer"
  );


/* =====================================================
   SELECTED PREDICTION
===================================================== */

const predictionId =
  localStorage.getItem(
    "viewPredictionId"
  );

const predictionUsername =
  localStorage.getItem(
    "viewPredictionUsername"
  );


/* =====================================================
   ROUND CONFIG
===================================================== */

const englishLeagueRounds = [

  {
    id: "English League Week 0",
    label: "Week 0 - Championship",
    storedRound: "English League Week One",
    resultsRound: "English League Week One"
  },

  {
    id: "English League Week 1",
    label: "Week 1",
    storedRound: "English League Week Two",
    resultsRound: "English League Week Two"
  },

  {
    id: "English League Week 2",
    label: "Week 2",
    storedRound: "English League Week Three",
    resultsRound: "English League Week Three"
  },

  {
    id: "English League Week 3",
    label: "Week 3",
    storedRound: "English League Week Four",
    resultsRound: "English League Week Four"
  },

  {
    id: "English League Week 4",
    label: "Week 4",
    storedRound: "English League Week 4",
    resultsRound: "English League Week 4"
  },

  {
    id: "English League Week 5",
    label: "Week 5",
    storedRound: "English League Week 5",
    resultsRound: "English League Week 5"
  }

];


/* =====================================================
   ROUND HELPERS
===================================================== */

function getRoundConfigFromStoredRound(
  storedRound
) {

  return (
    englishLeagueRounds.find(
      (round) =>
        round.storedRound === storedRound ||
        round.id === storedRound
    ) || null
  );
}


function getLogicalRound(
  storedRound
) {

  const config =
    getRoundConfigFromStoredRound(
      storedRound
    );


  return config
    ? config.id
    : storedRound;
}


function getRoundLabel(
  storedRound
) {

  const config =
    getRoundConfigFromStoredRound(
      storedRound
    );


  return config
    ? config.label
    : storedRound;
}


/* =====================================================
   LOAD LIVE RESULTS FROM FIRESTORE
===================================================== */

async function loadLiveResults(
  storedRound,
  logicalRound
) {

  const liveResults = {};


  const resultsSnap =
    await getDocs(
      collection(
        db,
        "scorecast24_results"
      )
    );


  const finishedStatuses =
    new Set([
      "FT",
      "AET",
      "PEN"
    ]);


  resultsSnap.forEach(
    (docSnap) => {

      const data =
        docSnap.data();


      const resultRound =
        String(
          data.round || ""
        ).trim();


      if (
        resultRound !== storedRound &&
        resultRound !== logicalRound
      ) {

        return;
      }


      const fixtureId =
        String(
          data.fixtureId ?? ""
        ).trim();


      if (!fixtureId) {

        return;
      }


      const status =
        String(
          data.status || ""
        )
          .trim()
          .toUpperCase();


      if (
        !finishedStatuses.has(
          status
        )
      ) {

        return;
      }


      if (
        data.homeScore == null ||
        data.awayScore == null
      ) {

        return;
      }


      liveResults[
        fixtureId
      ] = {

        homeScore:
          Number(
            data.homeScore
          ),

        awayScore:
          Number(
            data.awayScore
          ),

        status

      };

    }
  );


  return liveResults;
}


/* =====================================================
   GET RESULTS FOR ROUND
===================================================== */

async function getResultsForRound(
  storedRound
) {

  const config =
    getRoundConfigFromStoredRound(
      storedRound
    );


  const logicalRound =
    getLogicalRound(
      storedRound
    );


  const staticResults = {

    ...(
      resultsByRound[
        storedRound
      ] || {}
    ),

    ...(
      config
        ?
          resultsByRound[
            config.resultsRound
          ] || {}
        :
          {}
    ),

    ...(
      resultsByRound[
        logicalRound
      ] || {}
    )

  };


  const liveResults =
    await loadLiveResults(
      storedRound,
      logicalRound
    );


  return {

    ...staticResults,
    ...liveResults

  };
}


/* =====================================================
   CALCULATE POINTS FOR ONE FIXTURE

   Exact score = 5
   Correct draw = 3
   Correct away win = 2
   Correct home win = 1
   Wrong result = 0
===================================================== */

function calculateFixturePoints(
  prediction,
  result
) {

  if (
    prediction.void === true
  ) {

    return 0;
  }


  if (
    !result ||
    result.homeScore == null ||
    result.awayScore == null
  ) {

    return null;
  }


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


  if (
    predictedHome === actualHome &&
    predictedAway === actualAway
  ) {

    return 5;
  }


  if (
    predictedHome === predictedAway &&
    actualHome === actualAway
  ) {

    return 3;
  }


  if (
    predictedHome < predictedAway &&
    actualHome < actualAway
  ) {

    return 2;
  }


  if (
    predictedHome > predictedAway &&
    actualHome > actualAway
  ) {

    return 1;
  }


  return 0;
}


/* =====================================================
   LOAD PREDICTIONS
===================================================== */

async function loadPredictions() {

  if (
    !predictionContainer ||
    !predictionTitle
  ) {

    console.error(
      "Prediction page elements not found."
    );

    return;
  }


  if (!predictionId) {

    predictionContainer.innerHTML =
      "<p>No prediction selected.</p>";

    return;
  }


  predictionTitle.textContent =
    `${
      predictionUsername ||
      "User"
    }'s Predictions`;


  try {

    const predictionRef =
      doc(
        db,
        "scorecast24_predictions",
        predictionId
      );


    const predictionSnap =
      await getDoc(
        predictionRef
      );


    if (
      !predictionSnap.exists()
    ) {

      predictionContainer.innerHTML =
        "<p>Predictions not found.</p>";

      return;
    }


    const data =
      predictionSnap.data();


    const storedRound =
      String(
        data.round || ""
      ).trim();


    const roundLabel =
      getRoundLabel(
        storedRound
      );


    predictionTitle.textContent =
      `${
        predictionUsername ||
        data.username ||
        "User"
      }'s ${roundLabel} Predictions`;


    const predictions =
      Array.isArray(
        data.predictions
      )
        ?
          data.predictions
        :
          [];


    if (
      predictions.length === 0
    ) {

      predictionContainer.innerHTML =
        "<p>No predictions saved for this user.</p>";

      return;
    }


    const roundResults =
      await getResultsForRound(
        storedRound
      );


    console.log(
      "View Predictions loaded:",
      {
        predictionId,
        storedRound,
        logicalRound:
          getLogicalRound(
            storedRound
          ),
        resultCount:
          Object.keys(
            roundResults
          ).length,
        roundResults
      }
    );


    predictionContainer.innerHTML =
      "";


    predictions.forEach(
      (prediction) => {

        const fixtureId =
          String(
            prediction.fixtureId ?? ""
          ).trim();


        const result =
          roundResults[
            fixtureId
          ] || null;


        const points =
          calculateFixturePoints(
            prediction,
            result
          );


        const div =
          document.createElement(
            "div"
          );


        div.className =
          "prediction-view-row";


        /*
          VOID FIXTURE
        */

        if (
          prediction.void === true
        ) {

          div.innerHTML = `
            <div class="prediction-fixture">
              ${prediction.home} v ${prediction.away}
            </div>

            <div class="prediction-score">
              Prediction:
              ${prediction.predictedHome}
              -
              ${prediction.predictedAway}
            </div>

            <div class="prediction-result">
              Fixture void
            </div>

            <div class="prediction-points">
              0 pts
            </div>
          `;


          predictionContainer
            .appendChild(
              div
            );


          return;
        }


        /*
          FINISHED FIXTURE
        */

        if (
          result &&
          result.homeScore != null &&
          result.awayScore != null
        ) {

          div.classList.add(
            "prediction-finished"
          );


          if (
            points === 5
          ) {

            div.classList.add(
              "prediction-exact"
            );
          }


          div.innerHTML = `
            <div class="prediction-fixture">
              ${prediction.home} v ${prediction.away}
            </div>

            <div class="prediction-score">
              Prediction:
              ${prediction.predictedHome}
              -
              ${prediction.predictedAway}
            </div>

            <div class="prediction-result">
              Result:
              ${result.homeScore}
              -
              ${result.awayScore}
            </div>

            <div class="prediction-points">
              ${
                points === 5
                  ?
                    "⭐ 5 pts"
                  :
                    `${points} ${
                      points === 1
                        ?
                          "pt"
                        :
                          "pts"
                    }`
              }
            </div>
          `;

        } else {

          /*
            RESULT NOT YET AVAILABLE
          */

          div.innerHTML = `
            <div class="prediction-fixture">
              ${prediction.home} v ${prediction.away}
            </div>

            <div class="prediction-score">
              Prediction:
              ${prediction.predictedHome}
              -
              ${prediction.predictedAway}
            </div>

            <div class="prediction-result">
              Result: Pending
            </div>
          `;

        }


        predictionContainer
          .appendChild(
            div
          );

      }
    );


  } catch (error) {

    console.error(
      "View predictions error:",
      error
    );


    predictionContainer.innerHTML =
      "<p>Could not load predictions.</p>";
  }
}


/* =====================================================
   START
===================================================== */

loadPredictions();
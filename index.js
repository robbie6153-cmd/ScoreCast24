import { db } from "./firebase.js?v=107";
import { requireLogin } from "./auth.js?v=110";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  resultsByRound
} from "./results.js?v=2";


/* =====================================================
   ROUNDS

   NEW NUMBERING FROM NOW ON:

   Original Week One   = Week 0 Championship
   Original Week Two   = Week 1
   Original Week Three = Week 2
   Original Week Four  = Week 3

   New round           = Week 4
===================================================== */


/*
  New predictions are for Week Four.
*/
const currentRound =
  "English League Week 4";


/*
  Homepage continues displaying the
  currently-playing/completed Week Three.
*/
const homePreviewRound =
  "English League Week 3";
  const homePreviewStoredRound =
  "English League Week Four";


const submittedStorageKey =
  `scorecast24Submitted-${currentRound}`;


/* =====================================================
   ENTRY / FIXTURE LOCKS
===================================================== */


/*
  Week Four is OPEN.
*/
const roundClosed = false;


/*
  No Week Four fixtures are currently void.
*/
const voidFixtureIds =
  new Set([]);


function predictionsAreClosed() {
  return roundClosed;
}


function fixtureIsVoid(fixtureId) {

  return voidFixtureIds.has(
    String(fixtureId)
  );
}


/* =====================================================
   WEEK FOUR FIXTURES
   11–14 SEPTEMBER 2026
===================================================== */

const englishLeagueFixtures = [

  /* =================================================
     PREMIER LEAGUE
  ================================================= */

  {
    id: "1",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Premier League",
    home: "AFC Bournemouth",
    away: "Brentford",
    homeScore: null,
    awayScore: null
  },

  {
    id: "2",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Premier League",
    home: "Aston Villa",
    away: "Nottingham Forest",
    homeScore: null,
    awayScore: null
  },

  {
    id: "3",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Premier League",
    home: "Chelsea",
    away: "Hull City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "4",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Premier League",
    home: "Crystal Palace",
    away: "Ipswich Town",
    homeScore: null,
    awayScore: null
  },

  {
    id: "5",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Premier League",
    home: "Liverpool",
    away: "Fulham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "6",
    date: "Sat 12 Sep 2026, 17:30",
    group: "Premier League",
    home: "Tottenham Hotspur",
    away: "Everton",
    homeScore: null,
    awayScore: null
  },

  {
    id: "7",
    date: "Sat 12 Sep 2026, 20:00",
    group: "Premier League",
    home: "Sunderland",
    away: "Arsenal",
    homeScore: null,
    awayScore: null
  },

  {
    id: "8",
    date: "Sun 13 Sep 2026, 14:00",
    group: "Premier League",
    home: "Coventry City",
    away: "Brighton & Hove Albion",
    homeScore: null,
    awayScore: null
  },

  {
    id: "9",
    date: "Sun 13 Sep 2026, 16:30",
    group: "Premier League",
    home: "Manchester United",
    away: "Manchester City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "10",
    date: "Mon 14 Sep 2026, 20:00",
    group: "Premier League",
    home: "Leeds United",
    away: "Newcastle United",
    homeScore: null,
    awayScore: null
  },


  /* =================================================
     CHAMPIONSHIP
  ================================================= */

  {
    id: "11",
    date: "Fri 11 Sep 2026, 20:00",
    group: "Championship",
    home: "West Ham United",
    away: "Wrexham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "12",
    date: "Sat 12 Sep 2026, 12:30",
    group: "Championship",
    home: "Bolton Wanderers",
    away: "Cardiff City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "13",
    date: "Sat 12 Sep 2026, 12:30",
    group: "Championship",
    home: "Derby County",
    away: "Birmingham City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "14",
    date: "Sat 12 Sep 2026, 12:30",
    group: "Championship",
    home: "West Bromwich Albion",
    away: "Queens Park Rangers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "15",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Blackburn Rovers",
    away: "Millwall",
    homeScore: null,
    awayScore: null
  },

  {
    id: "16",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Charlton Athletic",
    away: "Portsmouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "17",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Middlesbrough",
    away: "Norwich City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "18",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Preston North End",
    away: "Lincoln City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "19",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Southampton",
    away: "Bristol City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "20",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Swansea City",
    away: "Burnley",
    homeScore: null,
    awayScore: null
  },

  {
    id: "21",
    date: "Sat 12 Sep 2026, 15:00",
    group: "Championship",
    home: "Watford",
    away: "Stoke City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "22",
    date: "Sun 13 Sep 2026, 12:00",
    group: "Championship",
    home: "Sheffield United",
    away: "Wolverhampton Wanderers",
    homeScore: null,
    awayScore: null
  }

];


const fixtures =
  englishLeagueFixtures;


/* =====================================================
   WEEK THREE FIXTURE REFERENCES
   4–6 SEPTEMBER 2026

   This is the round currently displayed
   on the homepage.
===================================================== */

const weekThreeFixtures = [

  {
    id: "1",
    home: "Ipswich Town",
    away: "Liverpool"
  },

  {
    id: "2",
    home: "Newcastle United",
    away: "AFC Bournemouth"
  },

  {
    id: "3",
    home: "Brentford",
    away: "Sunderland"
  },

  {
    id: "4",
    home: "Brighton & Hove Albion",
    away: "Leeds United"
  },

  {
    id: "5",
    home: "Fulham",
    away: "Crystal Palace"
  },

  {
    id: "6",
    home: "Manchester City",
    away: "Coventry City"
  },

  {
    id: "7",
    home: "Nottingham Forest",
    away: "Tottenham Hotspur"
  },

  {
    id: "8",
    home: "Hull City",
    away: "Aston Villa"
  },

  {
    id: "9",
    home: "Everton",
    away: "Manchester United"
  },

  {
    id: "10",
    home: "Arsenal",
    away: "Chelsea"
  },

  {
    id: "11",
    home: "Lincoln City",
    away: "Southampton"
  },

  {
    id: "12",
    home: "Preston North End",
    away: "Blackburn Rovers"
  },

  {
    id: "13",
    home: "Stoke City",
    away: "Charlton Athletic"
  },

  {
    id: "14",
    home: "Burnley",
    away: "Bristol City"
  },

  {
    id: "15",
    home: "Millwall",
    away: "Bolton Wanderers"
  },

  {
    id: "16",
    home: "Portsmouth",
    away: "Cardiff City"
  },

  {
    id: "17",
    home: "Queens Park Rangers",
    away: "Middlesbrough"
  },

  {
    id: "18",
    home: "Sheffield United",
    away: "Norwich City"
  },

  {
    id: "19",
    home: "West Bromwich Albion",
    away: "Watford"
  },

  {
    id: "20",
    home: "West Ham United",
    away: "Derby County"
  },

  {
    id: "21",
    home: "Swansea City",
    away: "Wrexham"
  },

  {
    id: "22",
    home: "Birmingham City",
    away: "Wolverhampton Wanderers"
  }

];


/* =====================================================
   WEEK TWO FIXTURE REFERENCES
   29–31 AUGUST 2026

   Previously called Week Three.
   Kept for historical results.
===================================================== */

const weekTwoFixtures = [

  {
    id: "1",
    home: "Crystal Palace",
    away: "Manchester City"
  },

  {
    id: "2",
    home: "Liverpool",
    away: "Nottingham Forest"
  },

  {
    id: "3",
    home: "AFC Bournemouth",
    away: "Everton"
  },

  {
    id: "4",
    home: "Coventry City",
    away: "Hull City"
  },

  {
    id: "5",
    home: "Tottenham Hotspur",
    away: "Newcastle United"
  },

  {
    id: "6",
    home: "Chelsea",
    away: "Brighton & Hove Albion"
  },

  {
    id: "7",
    home: "Leeds United",
    away: "Brentford"
  },

  {
    id: "8",
    home: "Sunderland",
    away: "Fulham"
  },

  {
    id: "9",
    home: "Manchester United",
    away: "Ipswich Town"
  },

  {
    id: "10",
    home: "Aston Villa",
    away: "Arsenal"
  },

  {
    id: "11",
    home: "Wrexham",
    away: "Birmingham City"
  },

  {
    id: "12",
    home: "Derby County",
    away: "Swansea City"
  },

  {
    id: "13",
    home: "Middlesbrough",
    away: "West Bromwich Albion"
  },

  {
    id: "14",
    home: "Wolverhampton Wanderers",
    away: "Stoke City"
  },

  {
    id: "15",
    home: "Blackburn Rovers",
    away: "Queens Park Rangers"
  },

  {
    id: "16",
    home: "Bolton Wanderers",
    away: "Lincoln City"
  },

  {
    id: "17",
    home: "Bristol City",
    away: "Portsmouth"
  },

  {
    id: "18",
    home: "Cardiff City",
    away: "Sheffield United"
  },

  {
    id: "19",
    home: "Charlton Athletic",
    away: "Preston North End"
  },

  {
    id: "20",
    home: "Norwich City",
    away: "Burnley"
  },

  {
    id: "21",
    home: "Southampton",
    away: "Millwall"
  },

  {
    id: "22",
    home: "Watford",
    away: "West Ham United"
  }

];


/* =====================================================
   WEEK ONE FIXTURE REFERENCES
   21–24 AUGUST 2026

   Previously called Week Two.
   Kept for historical results.
===================================================== */

const weekOneFixtures = [

  {
    id: "1",
    home: "Arsenal",
    away: "Coventry City"
  },

  {
    id: "2",
    home: "Hull City",
    away: "Manchester United"
  },

  {
    id: "3",
    home: "Everton",
    away: "Crystal Palace"
  },

  {
    id: "4",
    home: "Ipswich Town",
    away: "Sunderland"
  },

  {
    id: "5",
    home: "Nottingham Forest",
    away: "Leeds United"
  },

  {
    id: "6",
    home: "Brentford",
    away: "Tottenham Hotspur"
  },

  {
    id: "7",
    home: "Brighton & Hove Albion",
    away: "Aston Villa"
  },

  {
    id: "8",
    home: "Manchester City",
    away: "AFC Bournemouth"
  },

  {
    id: "9",
    home: "Newcastle United",
    away: "Liverpool"
  },

  {
    id: "10",
    home: "Fulham",
    away: "Chelsea"
  },

  {
    id: "11",
    home: "Birmingham City",
    away: "Bristol City"
  },

  {
    id: "12",
    home: "Lincoln City",
    away: "Portsmouth"
  },

  {
    id: "13",
    home: "Millwall",
    away: "Norwich City"
  },

  {
    id: "14",
    home: "Blackburn Rovers",
    away: "Middlesbrough"
  },

  {
    id: "15",
    home: "Derby County",
    away: "Cardiff City"
  },

  {
    id: "16",
    home: "Preston North End",
    away: "Wolverhampton Wanderers"
  },

  {
    id: "17",
    home: "Queens Park Rangers",
    away: "Bolton Wanderers"
  },

  {
    id: "18",
    home: "Southampton",
    away: "Stoke City"
  },

  {
    id: "19",
    home: "Swansea City",
    away: "Sheffield United"
  },

  {
    id: "20",
    home: "West Ham United",
    away: "Charlton Athletic"
  },

  {
    id: "21",
    home: "Wrexham",
    away: "Watford"
  },

  {
    id: "22",
    home: "West Bromwich Albion",
    away: "Burnley"
  }

];


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const homePage =
  document.getElementById("homePage");

const predictionsPage =
  document.getElementById("predictionsPage");

const startGameBtn =
  document.getElementById("startGameBtn");

const premierLeagueBtn =
  document.getElementById("premierLeagueBtn");

const dreamTeamBtn =
  document.getElementById("dreamTeamBtn");

const backHomeBtn =
  document.getElementById("backHomeBtn");

const fixturesContainer =
  document.getElementById("fixturesContainer");

const submitPredictionsBtn =
  document.getElementById("submitPredictionsBtn");

const homeLeaderboardPreview =
  document.getElementById(
    "homeLeaderboardPreview"
  );

const homeFixturesPreview =
  document.getElementById(
    "homeFixturesPreview"
  );


/* =====================================================
   USERNAME
===================================================== */

let username =
  localStorage.getItem(
    "scorecast24Username"
  );


function cleanUsername(name) {

  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}


function getPredictionDocId(username) {

  const cleanRound =
    currentRound
      .toLowerCase()
      .replace(/\s+/g, "-");


  const cleanUser =
    cleanUsername(username);


  return `${cleanUser}-${cleanRound}`;
}


/* =====================================================
   PAGE SWITCHING
===================================================== */

function showHome() {

  if (homePage) {
    homePage.classList.remove("hidden");
  }


  if (predictionsPage) {
    predictionsPage.classList.add("hidden");
  }
}


function showPredictions() {

  if (homePage) {
    homePage.classList.add("hidden");
  }


  if (predictionsPage) {
    predictionsPage.classList.remove(
      "hidden"
    );
  }
}


/* =====================================================
   RENDER WEEK FOUR FIXTURES
===================================================== */

function renderFixtures() {

  if (!fixturesContainer) return;


  fixturesContainer.innerHTML = "";


  fixtures.forEach((fixture) => {

    const card =
      document.createElement("div");


    const isVoid =
      fixtureIsVoid(fixture.id);


    card.className =
      isVoid
        ? "fixture-card fixture-void"
        : "fixture-card";


    card.innerHTML = `
      <div class="fixture-teams">

        <div class="team-name">
          ${fixture.home}
        </div>

        ${
          isVoid
            ? `
              <div class="void-score">
                ✕
              </div>
            `
            : `
              <input
                class="score-input"
                type="number"
                min="0"
                id="home-${fixture.id}"
                placeholder="0"
              >
            `
        }

        <div class="vs">v</div>

        ${
          isVoid
            ? `
              <div class="void-score">
                ✕
              </div>
            `
            : `
              <input
                class="score-input"
                type="number"
                min="0"
                id="away-${fixture.id}"
                placeholder="0"
              >
            `
        }

        <div class="team-name">
          ${fixture.away}
        </div>

      </div>

      <div class="fixture-date">

        ${fixture.date} · ${fixture.group}

        ${
          isVoid
            ? `
              · <strong class="void-label">
                VOID FOR LATE ENTRIES
              </strong>
            `
            : ""
        }

      </div>
    `;


    fixturesContainer.appendChild(card);
  });
}


/* =====================================================
   ENTRY CHECK
===================================================== */

async function hasAlreadySubmitted(
  savedUsername
) {

  if (
    !savedUsername ||
    savedUsername.trim().length < 2
  ) {
    return false;
  }


  const predictionRef =
    doc(
      db,
      "scorecast24_predictions",
      getPredictionDocId(savedUsername)
    );


  const predictionSnap =
    await getDoc(predictionRef);


  return predictionSnap.exists();
}


function entryCheckTimeout(ms = 12000) {

  return new Promise(
    (_, reject) => {

      setTimeout(() => {

        reject(
          new Error(
            "Entry check timed out"
          )
        );

      }, ms);
    }
  );
}


/* =====================================================
   READ WEEK FOUR PREDICTIONS
===================================================== */

function getPredictionsFromPage() {

  const predictions = [];


  for (const fixture of fixtures) {


    if (
      fixtureIsVoid(fixture.id)
    ) {

      predictions.push({

        fixtureId:
          fixture.id,

        home:
          fixture.home,

        away:
          fixture.away,

        predictedHome:
          null,

        predictedAway:
          null,

        void:
          true
      });


      continue;
    }


    const homeInput =
      document.getElementById(
        `home-${fixture.id}`
      );


    const awayInput =
      document.getElementById(
        `away-${fixture.id}`
      );


    if (
      !homeInput ||
      !awayInput
    ) {

      alert(
        "The prediction form could not be read."
      );

      return null;
    }


    const homePrediction =
      homeInput.value;


    const awayPrediction =
      awayInput.value;


    if (
      homePrediction === "" ||
      awayPrediction === ""
    ) {

      alert(
        `Please enter a score for ${fixture.home} v ${fixture.away}`
      );

      return null;
    }


    predictions.push({

      fixtureId:
        fixture.id,

      home:
        fixture.home,

      away:
        fixture.away,

      predictedHome:
        Number(homePrediction),

      predictedAway:
        Number(awayPrediction),

      void:
        false
    });
  }


  return predictions;
}


/* =====================================================
   SUBMIT WEEK FOUR PREDICTIONS
===================================================== */

if (submitPredictionsBtn) {

  submitPredictionsBtn.addEventListener(
    "click",
    async () => {


      if (
        predictionsAreClosed()
      ) {

        alert(
          `${currentRound} predictions are now closed.`
        );

        return;
      }


      username =
        localStorage.getItem(
          "scorecast24Username"
        );


      if (
        !username ||
        username.trim().length < 2
      ) {

        alert(
          "Please create your ScoreCast24 username first."
        );


        window.location.href =
          "username.html";


        return;
      }


      submitPredictionsBtn.disabled =
        true;


      submitPredictionsBtn.textContent =
        "Checking entry...";


      try {

        const alreadySubmitted =
          await hasAlreadySubmitted(
            username
          );


        if (alreadySubmitted) {

          localStorage.setItem(
            submittedStorageKey,
            "true"
          );


          alert(
            "You have already submitted predictions for Week Four."
          );


          window.location.href =
            "leaderboard.html";


          return;
        }


        const predictions =
          getPredictionsFromPage();


        if (!predictions) {

          submitPredictionsBtn.disabled =
            false;


          submitPredictionsBtn.textContent =
            "Submit Predictions";


          return;
        }


        submitPredictionsBtn.textContent =
          "Submitting...";


        const predictionRef =
          doc(
            db,
            "scorecast24_predictions",
            getPredictionDocId(username)
          );


        await setDoc(
          predictionRef,
          {

            username,

            predictions,

            round:
              currentRound,

            submittedAt:
              serverTimestamp(),

            status:
              "Score pending match results",

            points:
              null
          }
        );


        localStorage.setItem(
          submittedStorageKey,
          "true"
        );


        alert(
          "Week Four predictions submitted!"
        );


        window.location.href =
          "leaderboard.html";


      } catch (error) {

        console.error(
          "Submission failed:",
          error
        );


        alert(
          "Submission failed:\n\n" +
          error.message
        );


      } finally {

        submitPredictionsBtn.disabled =
          false;


        submitPredictionsBtn.textContent =
          "Submit Predictions";
      }
    }
  );
}


/* =====================================================
   SCORING SYSTEM
===================================================== */

function getResultType(
  home,
  away
) {

  if (home > away) {
    return "home";
  }


  if (away > home) {
    return "away";
  }


  return "draw";
}


function calculatePoints(
  prediction,
  fixture,
  scoringRound = currentRound
) {

  if (
    prediction.void === true
  ) {

    return null;
  }


  const roundResults =
    resultsByRound[
      scoringRound
    ] || {};


  const result =
    roundResults[
      fixture.id
    ];


  const actualHome =
    result?.homeScore;


  const actualAway =
    result?.awayScore;


  if (
    actualHome == null ||
    actualAway == null
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


  if (
    predictedHome === actualHome &&
    predictedAway === actualAway
  ) {

    return 5;
  }


  const predictedResult =
    getResultType(
      predictedHome,
      predictedAway
    );


  const actualResult =
    getResultType(
      actualHome,
      actualAway
    );


  if (
    predictedResult === "draw" &&
    actualResult === "draw"
  ) {

    return 3;
  }


  if (
    predictedResult === "away" &&
    actualResult === "away"
  ) {

    return 2;
  }


  if (
    predictedResult === "home" &&
    actualResult === "home"
  ) {

    return 1;
  }


  return 0;
}


/* =====================================================
   MAIN SCORE PREDICTION BUTTON
===================================================== */

if (startGameBtn) {

  startGameBtn.addEventListener(
    "click",
    async () => {


      if (!requireLogin()) {
        return;
      }


      if (
        predictionsAreClosed()
      ) {

        alert(
          `${currentRound} predictions are now closed.`
        );

        return;
      }


      username =
        localStorage.getItem(
          "scorecast24Username"
        );


      if (
        !username ||
        username.trim().length < 2
      ) {

        window.location.href =
          "username.html";


        return;
      }


      startGameBtn.disabled =
        true;


      startGameBtn.textContent =
        "Checking your entry...";


      try {

        const alreadySubmitted =
          await Promise.race([

            hasAlreadySubmitted(
              username
            ),

            entryCheckTimeout()

          ]);


        if (
          alreadySubmitted
        ) {

          localStorage.setItem(
            submittedStorageKey,
            "true"
          );


          alert(
            "You have already submitted your Week Four predictions."
          );


          window.location.href =
            "leaderboard.html";


          return;
        }


        renderFixtures();

        showPredictions();


      } catch (error) {

        console.error(
          "Entry check failed:",
          error
        );


        alert(
          "We could not check your existing entry. Please check your connection and try again."
        );


      } finally {

        startGameBtn.disabled =
          false;


        startGameBtn.textContent =
          "Submit Your Score Predictions Now!";
      }
    }
  );
}


/* =====================================================
   OTHER GAME BUTTONS
===================================================== */

if (premierLeagueBtn) {

  premierLeagueBtn.addEventListener(
    "click",
    () => {


      if (!requireLogin()) {
        return;
      }


      window.location.href =
        "index2.html";
    }
  );
}


if (dreamTeamBtn) {

  dreamTeamBtn.addEventListener(
    "click",
    () => {


      if (!requireLogin()) {
        return;
      }
    }
  );
}


/* =====================================================
   HOME LEADERBOARD PREVIEW

   Displays WEEK THREE.
===================================================== */

async function renderHomeLeaderboardPreview() {

  if (!homeLeaderboardPreview) {
    return;
  }


  homeLeaderboardPreview.innerHTML =
    "Loading standings...";


  try {

    const predictionsSnap =
      await getDocs(
        collection(
          db,
          "scorecast24_predictions"
        )
      );


    const rows = [];


    predictionsSnap.forEach(
      (docSnap) => {


        const data =
          docSnap.data();


      if (
  data.round !==
  homePreviewStoredRound
) {

  return;
}


        let totalPoints = 0;

        let hasScoredFixture =
          false;


        if (
          Array.isArray(
            data.predictions
          )
        ) {


          data.predictions.forEach(
            (prediction) => {


              const fixture =
                weekThreeFixtures.find(
                  (item) =>
                    item.id ===
                    prediction.fixtureId
                );


              if (!fixture) {
                return;
              }


              const points =
                calculatePoints(
                  prediction,
                  fixture,
                  homePreviewRound
                );


              if (
                points !== null
              ) {

                totalPoints +=
                  points;


                hasScoredFixture =
                  true;
              }
            }
          );
        }


        rows.push({

          username:
            data.username ||
            "?????",


          points:
            totalPoints,


          status:
            hasScoredFixture
              ? `${totalPoints} pts`
              : "Pending"
        });
      }
    );


    if (
      rows.length === 0
    ) {

      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">

          <span>
            No Week Three entries
          </span>

          <span class="preview-points">
            Pending
          </span>

        </div>
      `;


      return;
    }


    rows.sort(
      (a, b) =>
        b.points -
        a.points
    );


    homeLeaderboardPreview.innerHTML =
      "";


    rows
      .slice(0, 3)
      .forEach(
        (row, index) => {


          const div =
            document.createElement(
              "div"
            );


          div.className =
            "preview-row";


          div.innerHTML = `
            <span>
              ${index + 1}. ${row.username}
            </span>

            <span class="preview-points">
              ${row.status}
            </span>
          `;


          homeLeaderboardPreview
            .appendChild(
              div
            );
        }
      );


  } catch (error) {

    console.error(
      "Home leaderboard preview failed:",
      error
    );


    homeLeaderboardPreview.innerHTML = `
      <div class="preview-row">

        <span>
          Could not load
        </span>

        <span class="preview-points">
          —
        </span>

      </div>
    `;
  }
}


/* =====================================================
   HOME FIXTURES PREVIEW

   Displays WEEK THREE results.
===================================================== */

function renderHomeFixturesPreview() {

  if (!homeFixturesPreview) {
    return;
  }


  homeFixturesPreview.innerHTML =
    "";


  const roundResults =
    resultsByRound[
      homePreviewRound
    ] || {};


  const latestResults =
    weekThreeFixtures
      .map((fixture) => {


        const result =
          roundResults[
            fixture.id
          ];


        return {

          ...fixture,

          homeScore:
            result?.homeScore,

          awayScore:
            result?.awayScore
        };
      })
      .filter(
        (fixture) =>
          fixture.homeScore != null &&
          fixture.awayScore != null
      )
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      )
      .slice(0, 3);


  if (
    latestResults.length === 0
  ) {

    homeFixturesPreview.innerHTML = `
      <div class="preview-row">

        <span>
          No results yet
        </span>

        <span>
          —
        </span>

      </div>
    `;


    return;
  }


  latestResults.forEach(
    (fixture, index) => {


      const div =
        document.createElement(
          "div"
        );


      div.className =
        "preview-row";


      div.innerHTML = `
        <span>

          ${fixture.home}

          ${fixture.homeScore}-${fixture.awayScore}

          ${fixture.away}

        </span>

        <span>
          ${index === 0 ? "Latest" : "›"}
        </span>
      `;


      homeFixturesPreview.appendChild(
        div
      );
    }
  );
}


/* =====================================================
   MENU
===================================================== */

const menuToggle =
  document.getElementById(
    "menuToggle"
  );


const dropdownMenu =
  document.getElementById(
    "dropdownMenu"
  );


if (
  menuToggle &&
  dropdownMenu
) {


  menuToggle.addEventListener(
    "click",
    () => {


      dropdownMenu.classList.toggle(
        "hidden"
      );
    }
  );


  document.addEventListener(
    "click",
    (event) => {


      if (
        !menuToggle.contains(
          event.target
        ) &&
        !dropdownMenu.contains(
          event.target
        )
      ) {


        dropdownMenu.classList.add(
          "hidden"
        );
      }
    }
  );
}


/* =====================================================
   PREDICTIONS STATUS
===================================================== */

function updatePredictionsCountdown() {


  const countdownBox =
    document.getElementById(
      "weekOneCountdown"
    );


  if (!countdownBox) {
    return;
  }


  if (roundClosed) {


    countdownBox.innerHTML = `
      <strong>
        Week Four predictions are now closed.
      </strong>
    `;


    if (startGameBtn) {

      startGameBtn.disabled =
        true;


      startGameBtn.textContent =
        "Predictions Closed";
    }


    if (submitPredictionsBtn) {

      submitPredictionsBtn.disabled =
        true;
    }


    return;
  }


  countdownBox.innerHTML = `
    <strong>
      Week Four predictions are now open
    </strong>
    <br>
    Predict all Premier League and
    Championship matches for
    11–14 September.
  `;


  if (startGameBtn) {

    startGameBtn.disabled =
      false;


    startGameBtn.textContent =
      "Submit Your Score Predictions Now!";
  }
}


/* =====================================================
   INSTALL BUTTON
===================================================== */

let deferredPrompt;


window.addEventListener(
  "beforeinstallprompt",
  (event) => {


    event.preventDefault();


    deferredPrompt =
      event;


    const installBtn =
      document.getElementById(
        "installBtn"
      );


    if (!installBtn) {
      return;
    }


    installBtn.style.display =
      "block";


    installBtn.addEventListener(
      "click",
      async () => {


        if (!deferredPrompt) {
          return;
        }


        deferredPrompt.prompt();


        await deferredPrompt.userChoice;


        deferredPrompt =
          null;


        installBtn.style.display =
          "none";
      },
      {
        once: true
      }
    );
  }
);


/* =====================================================
   START
===================================================== */

showHome();


/*
  Homepage displays Week Three.
*/
renderHomeLeaderboardPreview();

renderHomeFixturesPreview();


/*
  Prediction entry is Week Four.
*/
updatePredictionsCountdown();


/*
  Refresh Week Three top-three
  preview every minute.
*/
setInterval(
  renderHomeLeaderboardPreview,
  60000
);
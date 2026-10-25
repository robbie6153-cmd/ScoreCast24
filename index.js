
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
} from "./results.js?v=4";


/* =====================================================
   ROUND SETTINGS
===================================================== */

// New predictions are for Week 9.
// Homepage leaderboard continues to show Week 8.

const currentRound =
  "English League Week 9";

const homePreviewRound =
  "English League Week 8";

const homePreviewStoredRound =
  homePreviewRound;

const submittedStorageKey =
  `scorecast24Submitted-${currentRound}`;


/* =====================================================
   ENTRY LOCKS — WEEK 9
===================================================== */

// Set true to close all entries manually.

const roundClosed = false;

const voidFixtureIds = new Set([]);

// Saturday 31 October 2026 at 12:30pm GMT.
// UK clocks have changed back from BST.

const predictionDeadline =
  new Date("2026-10-31T12:30:00+00:00");

// Sheffield United v Wrexham.
// Friday 30 October at 8pm GMT.

const fridayVoidDeadline =
  new Date("2026-10-30T20:00:00+00:00");

const fridayVoidFixtureId = "11";


function fixtureIsVoid(fixtureId) {

  const id = String(fixtureId);

  if (voidFixtureIds.has(id)) {
    return true;
  }

  // The Sheffield United match is void
  // only for entries submitted from
  // Friday at 8pm onwards.

  if (
    currentRound === "English League Week 9" &&
    id === fridayVoidFixtureId &&
    new Date() >= fridayVoidDeadline
  ) {
    return true;
  }

  return false;
}


function predictionsAreClosed() {

  if (roundClosed) {
    return true;
  }

  return new Date() >= predictionDeadline;
}


/* =====================================================
   FIXTURE HELPER
===================================================== */

// All fixtures have null scores until
// match results are imported.
//
// IDs 1-10 = Premier League.
// IDs 11-22 = Championship.

const PL = "Premier League";
const CH = "Championship";

function makeFixture(
  id,
  date,
  group,
  home,
  away
) {

  return {
    id: String(id),
    date,
    group,
    home,
    away,
    homeScore: null,
    awayScore: null
  };
}


/* =====================================================
   WEEK 6 FIXTURES
   9–12 OCTOBER 2026
===================================================== */

const week6Fixtures = [

  // PREMIER LEAGUE

  makeFixture(1, "Sat 10 Oct 2026, 12:30", PL, "Arsenal", "Leeds United"),
  makeFixture(2, "Sat 10 Oct 2026, 15:00", PL, "Aston Villa", "Brentford"),
  makeFixture(3, "Sat 10 Oct 2026, 15:00", PL, "Chelsea", "AFC Bournemouth"),
  makeFixture(4, "Sat 10 Oct 2026, 15:00", PL, "Ipswich Town", "Fulham"),
  makeFixture(5, "Sat 10 Oct 2026, 15:00", PL, "Sunderland", "Brighton & Hove Albion"),
  makeFixture(6, "Sat 10 Oct 2026, 17:30", PL, "Manchester United", "Tottenham Hotspur"),
  makeFixture(7, "Sun 11 Oct 2026, 14:00", PL, "Crystal Palace", "Nottingham Forest"),
  makeFixture(8, "Sun 11 Oct 2026, 14:00", PL, "Hull City", "Everton"),
  makeFixture(9, "Sun 11 Oct 2026, 16:30", PL, "Liverpool", "Manchester City"),
  makeFixture(10, "Mon 12 Oct 2026, 20:00", PL, "Coventry City", "Newcastle United"),

  // CHAMPIONSHIP

  makeFixture(11, "Fri 9 Oct 2026, 20:00", CH, "West Ham United", "Queens Park Rangers"),
  makeFixture(12, "Sat 10 Oct 2026, 12:30", CH, "Charlton Athletic", "Bristol City"),
  makeFixture(13, "Sat 10 Oct 2026, 12:30", CH, "Swansea City", "Norwich City"),
  makeFixture(14, "Sat 10 Oct 2026, 12:30", CH, "West Bromwich Albion", "Birmingham City"),
  makeFixture(15, "Sat 10 Oct 2026, 15:00", CH, "Blackburn Rovers", "Cardiff City"),
  makeFixture(16, "Sat 10 Oct 2026, 15:00", CH, "Bolton Wanderers", "Stoke City"),
  makeFixture(17, "Sat 10 Oct 2026, 15:00", CH, "Derby County", "Wrexham"),
  makeFixture(18, "Sat 10 Oct 2026, 15:00", CH, "Middlesbrough", "Wolverhampton Wanderers"),
  makeFixture(19, "Sat 10 Oct 2026, 15:00", CH, "Preston North End", "Millwall"),
  makeFixture(20, "Sat 10 Oct 2026, 15:00", CH, "Sheffield United", "Lincoln City"),
  makeFixture(21, "Sat 10 Oct 2026, 15:00", CH, "Watford", "Burnley"),
  makeFixture(22, "Sun 11 Oct 2026, 12:00", CH, "Southampton", "Portsmouth")

];


/* =====================================================
   WEEK 7 FIXTURES
   16–19 OCTOBER 2026
===================================================== */

const week7Fixtures = [

  // PREMIER LEAGUE

  makeFixture(1, "Sat 17 Oct 2026, 12:30", PL, "Everton", "Chelsea"),
  makeFixture(2, "Sat 17 Oct 2026, 15:00", PL, "Brentford", "Liverpool"),
  makeFixture(3, "Sat 17 Oct 2026, 15:00", PL, "Fulham", "Hull City"),
  makeFixture(4, "Sat 17 Oct 2026, 15:00", PL, "Manchester City", "Ipswich Town"),
  makeFixture(5, "Sat 17 Oct 2026, 17:30", PL, "Newcastle United", "Aston Villa"),
  makeFixture(6, "Sun 18 Oct 2026, 14:00", PL, "AFC Bournemouth", "Sunderland"),
  makeFixture(7, "Sun 18 Oct 2026, 14:00", PL, "Brighton & Hove Albion", "Crystal Palace"),
  makeFixture(8, "Sun 18 Oct 2026, 14:00", PL, "Leeds United", "Manchester United"),
  makeFixture(9, "Sun 18 Oct 2026, 16:30", PL, "Nottingham Forest", "Arsenal"),
  makeFixture(10, "Mon 19 Oct 2026, 20:00", PL, "Tottenham Hotspur", "Coventry City"),

  // CHAMPIONSHIP

  makeFixture(11, "Fri 16 Oct 2026, 20:00", CH, "Burnley", "Wolverhampton Wanderers"),
  makeFixture(12, "Sat 17 Oct 2026, 12:30", CH, "Middlesbrough", "Cardiff City"),
  makeFixture(13, "Sat 17 Oct 2026, 12:30", CH, "Millwall", "Lincoln City"),
  makeFixture(14, "Sat 17 Oct 2026, 12:30", CH, "Watford", "Charlton Athletic"),
  makeFixture(15, "Sat 17 Oct 2026, 15:00", CH, "Birmingham City", "Queens Park Rangers"),
  makeFixture(16, "Sat 17 Oct 2026, 15:00", CH, "Bristol City", "Sheffield United"),
  makeFixture(17, "Sat 17 Oct 2026, 15:00", CH, "Derby County", "Stoke City"),
  makeFixture(18, "Sat 17 Oct 2026, 15:00", CH, "Norwich City", "Portsmouth"),
  makeFixture(19, "Sat 17 Oct 2026, 15:00", CH, "Southampton", "Bolton Wanderers"),
  makeFixture(20, "Sat 17 Oct 2026, 15:00", CH, "Swansea City", "West Ham United"),
  makeFixture(21, "Sat 17 Oct 2026, 15:00", CH, "West Bromwich Albion", "Blackburn Rovers"),
  makeFixture(22, "Sat 17 Oct 2026, 15:00", CH, "Wrexham", "Preston North End")

];


/* =====================================================
   WEEK 8 FIXTURES
   23–25 OCTOBER 2026
===================================================== */

const week8Fixtures = [

  // PREMIER LEAGUE

  makeFixture(1, "Fri 23 Oct 2026, 20:00", PL, "Ipswich Town", "Nottingham Forest"),
  makeFixture(2, "Sat 24 Oct 2026, 12:30", PL, "Aston Villa", "Manchester City"),
  makeFixture(3, "Sat 24 Oct 2026, 15:00", PL, "Arsenal", "Everton"),
  makeFixture(4, "Sat 24 Oct 2026, 15:00", PL, "Coventry City", "Fulham"),
  makeFixture(5, "Sat 24 Oct 2026, 17:30", PL, "Chelsea", "Tottenham Hotspur"),
  makeFixture(6, "Sun 25 Oct 2026, 14:00", PL, "Crystal Palace", "Newcastle United"),
  makeFixture(7, "Sun 25 Oct 2026, 14:00", PL, "Hull City", "Brentford"),
  makeFixture(8, "Sun 25 Oct 2026, 14:00", PL, "Liverpool", "Brighton & Hove Albion"),
  makeFixture(9, "Sun 25 Oct 2026, 14:00", PL, "Manchester United", "AFC Bournemouth"),
  makeFixture(10, "Sun 25 Oct 2026, 16:30", PL, "Sunderland", "Leeds United"),

  // CHAMPIONSHIP

  makeFixture(11, "Fri 23 Oct 2026, 20:00", CH, "Bolton Wanderers", "Middlesbrough"),
  makeFixture(12, "Sat 24 Oct 2026, 12:30", CH, "Charlton Athletic", "Norwich City"),
  makeFixture(13, "Sat 24 Oct 2026, 12:30", CH, "Portsmouth", "Millwall"),
  makeFixture(14, "Sat 24 Oct 2026, 12:30", CH, "Sheffield United", "Derby County"),
  makeFixture(15, "Sat 24 Oct 2026, 15:00", CH, "Blackburn Rovers", "Wrexham"),
  makeFixture(16, "Sat 24 Oct 2026, 15:00", CH, "Cardiff City", "Birmingham City"),
  makeFixture(17, "Sat 24 Oct 2026, 15:00", CH, "Lincoln City", "Burnley"),
  makeFixture(18, "Sat 24 Oct 2026, 15:00", CH, "Preston North End", "West Bromwich Albion"),
  makeFixture(19, "Sat 24 Oct 2026, 15:00", CH, "Queens Park Rangers", "Swansea City"),
  makeFixture(20, "Sat 24 Oct 2026, 15:00", CH, "Stoke City", "Bristol City"),
  makeFixture(21, "Sat 24 Oct 2026, 15:00", CH, "West Ham United", "Southampton"),
  makeFixture(22, "Sat 24 Oct 2026, 15:00", CH, "Wolverhampton Wanderers", "Watford")

];


/* =====================================================
   WEEK 9 FIXTURES
   30 OCTOBER – 2 NOVEMBER 2026

   NEW PREDICTION ROUND
===================================================== */

const week9Fixtures = [

  // PREMIER LEAGUE

  makeFixture(1, "Sat 31 Oct 2026, 12:30", PL, "Chelsea", "Manchester United"),

  makeFixture(2, "Sat 31 Oct 2026, 15:00", PL, "AFC Bournemouth", "Leeds United"),

  makeFixture(3, "Sat 31 Oct 2026, 15:00", PL, "Brentford", "Nottingham Forest"),

  makeFixture(4, "Sat 31 Oct 2026, 15:00", PL, "Coventry City", "Sunderland"),

  makeFixture(5, "Sat 31 Oct 2026, 15:00", PL, "Hull City", "Ipswich Town"),

  makeFixture(6, "Sat 31 Oct 2026, 15:00", PL, "Manchester City", "Brighton & Hove Albion"),

  makeFixture(7, "Sat 31 Oct 2026, 17:30", PL, "Tottenham Hotspur", "Crystal Palace"),

  makeFixture(8, "Sat 31 Oct 2026, 20:00", PL, "Aston Villa", "Fulham"),

  makeFixture(9, "Sun 1 Nov 2026, 16:30", PL, "Liverpool", "Arsenal"),

  makeFixture(10, "Mon 2 Nov 2026, 20:00", PL, "Newcastle United", "Everton"),


  // CHAMPIONSHIP

  // FRIDAY MATCH:
  // Sheffield United v Wrexham.
  // Void for entries from Friday at 8pm.

  makeFixture(11, "Fri 30 Oct 2026, 20:00", CH, "Sheffield United", "Wrexham"),

  makeFixture(12, "Sat 31 Oct 2026, 12:30", CH, "Lincoln City", "Birmingham City"),

  makeFixture(13, "Sat 31 Oct 2026, 12:30", CH, "Norwich City", "Watford"),

  makeFixture(14, "Sat 31 Oct 2026, 12:30", CH, "Stoke City", "Preston North End"),

  makeFixture(15, "Sat 31 Oct 2026, 15:00", CH, "Bolton Wanderers", "Bristol City"),

  makeFixture(16, "Sat 31 Oct 2026, 15:00", CH, "Burnley", "Portsmouth"),

  makeFixture(17, "Sat 31 Oct 2026, 15:00", CH, "Middlesbrough", "Charlton Athletic"),

  makeFixture(18, "Sat 31 Oct 2026, 15:00", CH, "Millwall", "Derby County"),

  makeFixture(19, "Sat 31 Oct 2026, 15:00", CH, "Southampton", "Queens Park Rangers"),

  makeFixture(20, "Sat 31 Oct 2026, 15:00", CH, "Swansea City", "Blackburn Rovers"),

  makeFixture(21, "Sat 31 Oct 2026, 15:00", CH, "West Ham United", "West Bromwich Albion"),

  makeFixture(22, "Sat 31 Oct 2026, 15:00", CH, "Wolverhampton Wanderers", "Cardiff City")

];


/* =====================================================
   ACTIVE FIXTURES
===================================================== */

// Week 9 predictions.
// Week 8 homepage results.

const fixtures =
  week9Fixtures;

const homePreviewFixtures =
  week8Fixtures;


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
  document.getElementById("homeLeaderboardPreview");

const homeFixturesPreview =
  document.getElementById("homeFixturesPreview");


/* =====================================================
   USERNAME
===================================================== */

let username =
  localStorage.getItem("scorecast24Username");


function cleanUsername(name) {

  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}


function getPredictionDocId(savedUsername) {

  const cleanRound =
    currentRound
      .toLowerCase()
      .replace(/\s+/g, "-");

  return (
    cleanUsername(savedUsername) +
    "-" +
    cleanRound
  );
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
    predictionsPage.classList.remove("hidden");
  }
}


if (backHomeBtn) {

  backHomeBtn.addEventListener(
    "click",
    showHome
  );
}


/* =====================================================
   RENDER PREDICTION FIXTURES
===================================================== */

function renderFixtures() {

  if (!fixturesContainer) {
    return;
  }

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

    card.dataset.fixtureId =
      String(fixture.id);

    card.innerHTML = `
      <div class="fixture-teams">

        <div class="team-name">
          ${fixture.home}
        </div>

        ${
          isVoid
            ? `
              <div class="void-score">✕</div>
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
              <div class="void-score">✕</div>
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

        ${fixture.date}
        ·
        ${fixture.group}

        ${
          isVoid
            ? `
              ·
              <strong class="void-label">
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
   UPDATE FRIDAY VOID ON OPEN FORMS
===================================================== */

// If somebody opens the entry form before
// Friday at 8pm and leaves it open,
// automatically change Sheffield United
// to VOID when 8pm arrives.
//
// Other entered scores are left untouched.

function updateVisibleFridayFixture() {

  if (!fixtureIsVoid(fridayVoidFixtureId)) {
    return;
  }

  const card =
    document.querySelector(
      `.fixture-card[data-fixture-id="${fridayVoidFixtureId}"]`
    );

  if (!card) {
    return;
  }

  if (card.classList.contains("fixture-void")) {
    return;
  }

  card.classList.add("fixture-void");

  const homeInput =
    document.getElementById(
      `home-${fridayVoidFixtureId}`
    );

  const awayInput =
    document.getElementById(
      `away-${fridayVoidFixtureId}`
    );

  [homeInput, awayInput].forEach((input) => {

    if (!input) {
      return;
    }

    const cross =
      document.createElement("div");

    cross.className = "void-score";
    cross.textContent = "✕";

    input.replaceWith(cross);
  });

  const dateBox =
    card.querySelector(".fixture-date");

  if (
    dateBox &&
    !dateBox.querySelector(".void-label")
  ) {

    const label =
      document.createElement("strong");

    label.className = "void-label";
    label.textContent =
      " · VOID FOR LATE ENTRIES";

    dateBox.appendChild(label);
  }
}


/* =====================================================
   ENTRY CHECK
===================================================== */

async function hasAlreadySubmitted(savedUsername) {

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

  return new Promise((_, reject) => {

    setTimeout(() => {

      reject(
        new Error("Entry check timed out")
      );

    }, ms);
  });
}


/* =====================================================
   READ PREDICTIONS FROM FORM
===================================================== */

function getPredictionsFromPage() {

  const predictions = [];

  for (const fixture of fixtures) {

    if (fixtureIsVoid(fixture.id)) {

      predictions.push({

        fixtureId: fixture.id,
        home: fixture.home,
        away: fixture.away,

        predictedHome: null,
        predictedAway: null,

        void: true

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

    if (!homeInput || !awayInput) {

      alert(
        "The prediction form could not be read."
      );

      return null;
    }

    if (
      homeInput.value === "" ||
      awayInput.value === ""
    ) {

      alert(
        `Please enter a score for ${fixture.home} v ${fixture.away}`
      );

      return null;
    }

    const homeValue =
      Number(homeInput.value);

    const awayValue =
      Number(awayInput.value);

    if (
      !Number.isInteger(homeValue) ||
      !Number.isInteger(awayValue) ||
      homeValue < 0 ||
      awayValue < 0
    ) {

      alert(
        `Please enter valid non-negative whole-number scores for ${fixture.home} v ${fixture.away}`
      );

      return null;
    }

    predictions.push({

      fixtureId: fixture.id,

      home: fixture.home,
      away: fixture.away,

      predictedHome: homeValue,
      predictedAway: awayValue,

      void: false

    });
  }

  return predictions;
}


/* =====================================================
   SUBMIT WEEK 9 PREDICTIONS
===================================================== */

if (submitPredictionsBtn) {

  submitPredictionsBtn.addEventListener(
    "click",
    async () => {

      if (predictionsAreClosed()) {

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

      submitPredictionsBtn.disabled = true;

      submitPredictionsBtn.textContent =
        "Checking entry...";

      try {

        const alreadySubmitted =
          await hasAlreadySubmitted(username);

        if (alreadySubmitted) {

          localStorage.setItem(
            submittedStorageKey,
            "true"
          );

          alert(
            "You have already submitted predictions for Week 9."
          );

          window.location.href =
            "leaderboard.html";

          return;
        }

        const predictions =
          getPredictionsFromPage();

        if (!predictions) {
          return;
        }

        // Check the deadline again before
        // writing to Firestore.

        if (predictionsAreClosed()) {

          alert(
            "Week 9 predictions have now closed."
          );

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

            round: currentRound,

            submittedAt:
              serverTimestamp(),

            status:
              "Score pending match results",

            points: null

          }
        );

        localStorage.setItem(
          submittedStorageKey,
          "true"
        );

        alert(
          "Week 9 predictions submitted!"
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

        submitPredictionsBtn.disabled = false;

        submitPredictionsBtn.textContent =
          "Submit Predictions";
      }
    }
  );
}


/* =====================================================
   LIVE WEEK 8 RESULTS FROM FIRESTORE
===================================================== */

let homeLiveResults = {};


async function loadHomeLiveResults() {

  homeLiveResults = {};

  const resultsQuery =
    query(
      collection(
        db,
        "scorecast24_results"
      ),
      where(
        "round",
        "==",
        homePreviewRound
      )
    );

  const resultsSnap =
    await getDocs(resultsQuery);

  console.log(
    "Week 8 result documents found:",
    resultsSnap.size
  );

  const finishedStatuses =
    new Set([
      "FT",
      "AET",
      "PEN"
    ]);

  resultsSnap.forEach((docSnap) => {

    const data =
      docSnap.data();

    const fixtureId =
      String(data.fixtureId || "").trim();

    if (!fixtureId) {
      return;
    }

    const status =
      String(data.status || "")
        .trim()
        .toUpperCase();

    const isFinished =
      finishedStatuses.has(status);

    homeLiveResults[fixtureId] = {

      homeScore:
        isFinished
          ? data.homeScore ?? null
          : null,

      awayScore:
        isFinished
          ? data.awayScore ?? null
          : null,

      status

    };
  });

  console.log(
    "Week 8 home live results:",
    homeLiveResults
  );
}


/* =====================================================
   MERGE WEEK 8 RESULTS
===================================================== */

function getHomeRoundResults() {

  const manualResults =
    resultsByRound[homePreviewRound] || {};

  const mergedResults = {
    ...homeLiveResults
  };

  Object.entries(manualResults).forEach(
    ([fixtureId, result]) => {

      if (
        result?.homeScore != null &&
        result?.awayScore != null
      ) {

        mergedResults[fixtureId] =
          result;

      } else if (!(fixtureId in mergedResults)) {

        mergedResults[fixtureId] =
          result;
      }
    }
  );

  return mergedResults;
}


/* =====================================================
   SCORING SYSTEM
===================================================== */

// Exact score = 5.
// Correct draw = 3.
// Correct away win = 2.
// Correct home win = 1.
// Incorrect = 0.

function getResultType(home, away) {

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

  if (prediction.void === true) {
    return null;
  }

  const roundResults =
    scoringRound === homePreviewRound
      ? getHomeRoundResults()
      : (
          resultsByRound[scoringRound] || {}
        );

  const result =
    roundResults[String(fixture.id)];

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
    Number(prediction.predictedHome);

  const predictedAway =
    Number(prediction.predictedAway);

  const realHome =
    Number(actualHome);

  const realAway =
    Number(actualAway);

  if (
    predictedHome === realHome &&
    predictedAway === realAway
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
      realHome,
      realAway
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
   SCORE PREDICTION BUTTON
===================================================== */

if (startGameBtn) {

  startGameBtn.addEventListener(
    "click",
    async () => {

      if (!requireLogin()) {
        return;
      }

      if (predictionsAreClosed()) {

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

      startGameBtn.disabled = true;

      startGameBtn.textContent =
        "Checking your entry...";

      try {

        const alreadySubmitted =
          await Promise.race([

            hasAlreadySubmitted(username),

            entryCheckTimeout()

          ]);

        if (alreadySubmitted) {

          localStorage.setItem(
            submittedStorageKey,
            "true"
          );

          alert(
            "You have already submitted your Week 9 predictions."
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

        startGameBtn.disabled = false;

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
   HOME LEADERBOARD — WEEK 8
===================================================== */

async function renderHomeLeaderboardPreview() {

  if (!homeLeaderboardPreview) {
    return;
  }

  homeLeaderboardPreview.innerHTML =
    "Loading standings...";

  try {

    // Only retrieve Week 8 predictions.

    const predictionsQuery =
      query(
        collection(
          db,
          "scorecast24_predictions"
        ),
        where(
          "round",
          "==",
          homePreviewStoredRound
        )
      );

    const predictionsSnap =
      await getDocs(predictionsQuery);

    const rows = [];

    predictionsSnap.forEach((docSnap) => {

      const data =
        docSnap.data();

      let totalPoints = 0;
      let exactScores = 0;
      let hasScoredFixture = false;

      if (
        Array.isArray(data.predictions)
      ) {

        data.predictions.forEach(
          (prediction) => {

            const fixture = {
              id: String(
                prediction.fixtureId
              )
            };

            const points =
              calculatePoints(
                prediction,
                fixture,
                homePreviewRound
              );

            if (points !== null) {

              totalPoints += points;

              hasScoredFixture = true;

              if (points === 5) {
                exactScores += 1;
              }
            }
          }
        );
      }

      rows.push({

        username:
          data.username || "?????",

        points:
          hasScoredFixture
            ? totalPoints
            : null,

        exactScores,

        submittedAtMillis:
          data.submittedAt?.toMillis
            ? data.submittedAt.toMillis()
            : (
                typeof data.submittedAt?.seconds ===
                  "number"
                  ? data.submittedAt.seconds * 1000
                  : null
              ),

        status:
          hasScoredFixture
            ? `${totalPoints} pts`
            : "Pending"

      });
    });

    if (rows.length === 0) {

      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">

          <span>
            No Week 8 entries
          </span>

          <span class="preview-points">
            Pending
          </span>

        </div>
      `;

      return;
    }

    // Ranking:
    // 1. Total points
    // 2. Exact scores
    // 3. Earliest submission

    rows.sort((a, b) => {

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

      if (
        a.points != null &&
        b.points != null &&
        b.points !== a.points
      ) {
        return b.points - a.points;
      }

      if (
        b.exactScores !== a.exactScores
      ) {
        return b.exactScores - a.exactScores;
      }

      if (
        a.submittedAtMillis != null &&
        b.submittedAtMillis != null
      ) {

        if (
          a.submittedAtMillis !==
          b.submittedAtMillis
        ) {

          return (
            a.submittedAtMillis -
            b.submittedAtMillis
          );
        }
      }

      if (
        a.submittedAtMillis != null &&
        b.submittedAtMillis == null
      ) {
        return -1;
      }

      if (
        a.submittedAtMillis == null &&
        b.submittedAtMillis != null
      ) {
        return 1;
      }

      return a.username.localeCompare(
        b.username
      );
    });

    homeLeaderboardPreview.innerHTML = "";

    rows.slice(0, 3).forEach(
      (row, index) => {

        const div =
          document.createElement("div");

        div.className = "preview-row";

        div.style.cursor = "pointer";

        div.innerHTML = `
          <span>
            ${index + 1}.
            ${row.username}
          </span>

          <span class="preview-points">
            ${row.status}
          </span>
        `;

        div.addEventListener(
          "click",
          () => {

            window.location.href =
              "leaderboard.html";
          }
        );

        homeLeaderboardPreview.appendChild(
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
   HOME FIXTURE RESULTS — WEEK 8
===================================================== */

function renderHomeFixturesPreview() {

  if (!homeFixturesPreview) {
    return;
  }

  homeFixturesPreview.innerHTML = "";

  const roundResults =
    getHomeRoundResults();

  const latestResults =
    homePreviewFixtures

      .map((fixture) => {

        const result =
          roundResults[fixture.id];

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
          Number(b.id) - Number(a.id)
      )

      .slice(0, 3);

  if (latestResults.length === 0) {

    homeFixturesPreview.innerHTML = `
      <div class="preview-row">

        <span>
          No results yet
        </span>

        <span>—</span>

      </div>
    `;

    return;
  }

  latestResults.forEach(
    (fixture, index) => {

      const div =
        document.createElement("div");

      div.className = "preview-row";

      div.style.cursor = "pointer";

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

      div.addEventListener(
        "click",
        () => {

          window.location.href =
            "leaderboard.html";
        }
      );

      homeFixturesPreview.appendChild(div);
    }
  );
}


/* =====================================================
   MENU
===================================================== */

const menuToggle =
  document.getElementById("menuToggle");

const dropdownMenu =
  document.getElementById("dropdownMenu");


if (menuToggle && dropdownMenu) {

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
        !menuToggle.contains(event.target) &&
        !dropdownMenu.contains(event.target)
      ) {

        dropdownMenu.classList.add(
          "hidden"
        );
      }
    }
  );
}


/* =====================================================
   WEEK 9 PREDICTION STATUS
===================================================== */

function updatePredictionsCountdown() {

  // Check whether the Friday fixture
  // needs to change to VOID.

  updateVisibleFridayFixture();

  const countdownBox =
    document.getElementById(
      "weekOneCountdown"
    );

  if (!countdownBox) {
    return;
  }

  if (predictionsAreClosed()) {

    countdownBox.innerHTML = `
      <strong>
        Week Nine predictions are now closed.
      </strong>
    `;

    if (startGameBtn) {

      startGameBtn.disabled = true;

      startGameBtn.textContent =
        "Predictions Closed";
    }

    if (submitPredictionsBtn) {
      submitPredictionsBtn.disabled = true;
    }

    return;
  }

  const fridayMatchVoided =
    fixtureIsVoid(fridayVoidFixtureId);

  countdownBox.innerHTML = `
    <strong>
      Week Nine predictions are now open!
    </strong>

    <br><br>

    Predict all Premier League and
    Championship matches for
    30 October – 2 November 2026.

    <br><br>

    <strong>
      Final entries close Saturday
      31 October at 12:30pm.
    </strong>

    <br><br>

    ${
      fridayMatchVoided
        ? `
          <strong>
            Sheffield United v Wrexham
            is now VOID for new entries.
          </strong>
        `
        : `
          Friday's Sheffield United
          v Wrexham match will be
          void for entries submitted
          after 8pm Friday.
        `
    }
  `;

  if (startGameBtn) {

    startGameBtn.disabled = false;

    startGameBtn.textContent =
      "Submit Your Score Predictions Now!";
  }

  if (submitPredictionsBtn) {
    submitPredictionsBtn.disabled = false;
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

    deferredPrompt = event;

    const installBtn =
      document.getElementById(
        "installBtn"
      );

    if (!installBtn) {
      return;
    }

    installBtn.style.display = "block";

    installBtn.addEventListener(
      "click",
      async () => {

        if (!deferredPrompt) {
          return;
        }

        deferredPrompt.prompt();

        await deferredPrompt.userChoice;

        deferredPrompt = null;

        installBtn.style.display = "none";

      },
      {
        once: true
      }
    );
  }
);


/* =====================================================
   HOME LIVE REFRESH
===================================================== */

async function refreshHomeLiveData() {

  try {

    await loadHomeLiveResults();

    await renderHomeLeaderboardPreview();

    renderHomeFixturesPreview();

  } catch (error) {

    console.error(
      "Home live update failed:",
      error
    );

    if (homeLeaderboardPreview) {

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
}


/* =====================================================
   START
===================================================== */

showHome();

updatePredictionsCountdown();

refreshHomeLiveData();


// Check entry status and Friday voids
// every 30 seconds.

setInterval(
  updatePredictionsCountdown,
  30000
);


// Refresh Week 8 homepage standings
// and results every 60 seconds.

setInterval(
  refreshHomeLiveData,
  60000
);

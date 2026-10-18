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
} from "./results.js?v=3";


/* =====================================================
   ROUND
===================================================== */

const currentRound =
  "English League Week 8";

/*
  Week 6 predictions are open,
  but keep the homepage leaderboard/results
  showing completed/in-progress Week 5.
*/


/*
  Automatically switch the homepage
  from Week 5 to Week 6 when
  predictions close.
*/

const homePreviewRound =
  "English League Week 7";

const homePreviewStoredRound =
  homePreviewRound;


const submittedStorageKey =
  `scorecast24Submitted-${currentRound}`;



/* =====================================================
   ENTRY / FIXTURE LOCKS — WEEK 7
===================================================== */

// Keep locked until setup is complete
const roundClosed = false;

const voidFixtureIds =
  new Set([]);

// Week 8 deadline:
// Saturday 24 October 2026, 12:30pm
const predictionDeadline =
  new Date("2026-10-24T12:30:00+01:00");


function fixtureIsVoid(fixtureId) {

  const id = String(fixtureId);

  if (voidFixtureIds.has(id)) {
    return true;
  }

  // Week 8 Friday fixtures:
  // 1 = Premier League
  // 11 = Championship
  // Both void after Friday 8pm

  if (
    currentRound === "English League Week 8" &&
    (id === "1" || id === "11") &&
    new Date() >=
      new Date("2026-10-23T20:00:00+01:00")
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
   WEEK 6 FIXTURES
   9–12 OCTOBER 2026
===================================================== */

const week6Fixtures = [

  /*
    PREMIER LEAGUE
  */

  {
    id: "1",
    date: "Sat 10 Oct 2026, 12:30",
    group: "Premier League",
    home: "Arsenal",
    away: "Leeds United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "2",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Premier League",
    home: "Aston Villa",
    away: "Brentford",
    homeScore: null,
    awayScore: null
  },

  {
    id: "3",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Premier League",
    home: "Chelsea",
    away: "AFC Bournemouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "4",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Premier League",
    home: "Ipswich Town",
    away: "Fulham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "5",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Premier League",
    home: "Sunderland",
    away: "Brighton & Hove Albion",
    homeScore: null,
    awayScore: null
  },

  {
    id: "6",
    date: "Sat 10 Oct 2026, 17:30",
    group: "Premier League",
    home: "Manchester United",
    away: "Tottenham Hotspur",
    homeScore: null,
    awayScore: null
  },

  {
    id: "7",
    date: "Sun 11 Oct 2026, 14:00",
    group: "Premier League",
    home: "Crystal Palace",
    away: "Nottingham Forest",
    homeScore: null,
    awayScore: null
  },

  {
    id: "8",
    date: "Sun 11 Oct 2026, 14:00",
    group: "Premier League",
    home: "Hull City",
    away: "Everton",
    homeScore: null,
    awayScore: null
  },

  {
    id: "9",
    date: "Sun 11 Oct 2026, 16:30",
    group: "Premier League",
    home: "Liverpool",
    away: "Manchester City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "10",
    date: "Mon 12 Oct 2026, 20:00",
    group: "Premier League",
    home: "Coventry City",
    away: "Newcastle United",
    homeScore: null,
    awayScore: null
  },


  /*
    CHAMPIONSHIP
  */

  {
    id: "11",
    date: "Fri 9 Oct 2026, 20:00",
    group: "Championship",
    home: "West Ham United",
    away: "Queens Park Rangers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "12",
    date: "Sat 10 Oct 2026, 12:30",
    group: "Championship",
    home: "Charlton Athletic",
    away: "Bristol City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "13",
    date: "Sat 10 Oct 2026, 12:30",
    group: "Championship",
    home: "Swansea City",
    away: "Norwich City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "14",
    date: "Sat 10 Oct 2026, 12:30",
    group: "Championship",
    home: "West Bromwich Albion",
    away: "Birmingham City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "15",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Blackburn Rovers",
    away: "Cardiff City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "16",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Bolton Wanderers",
    away: "Stoke City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "17",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Derby County",
    away: "Wrexham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "18",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Middlesbrough",
    away: "Wolverhampton Wanderers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "19",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Preston North End",
    away: "Millwall",
    homeScore: null,
    awayScore: null
  },

  {
    id: "20",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Sheffield United",
    away: "Lincoln City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "21",
    date: "Sat 10 Oct 2026, 15:00",
    group: "Championship",
    home: "Watford",
    away: "Burnley",
    homeScore: null,
    awayScore: null
  },

  {
    id: "22",
    date: "Sun 11 Oct 2026, 12:00",
    group: "Championship",
    home: "Southampton",
    away: "Portsmouth",
    homeScore: null,
    awayScore: null
  }

];



/* =====================================================
   WEEK 7 FIXTURES
   16–19 OCTOBER 2026
===================================================== */

const week7Fixtures = [

  /*
    PREMIER LEAGUE
  */

  {
    id: "1",
    date: "Sat 17 Oct 2026, 12:30",
    group: "Premier League",
    home: "Everton",
    away: "Chelsea",
    homeScore: null,
    awayScore: null
  },

  {
    id: "2",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Premier League",
    home: "Brentford",
    away: "Liverpool",
    homeScore: null,
    awayScore: null
  },

  {
    id: "3",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Premier League",
    home: "Fulham",
    away: "Hull City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "4",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Premier League",
    home: "Manchester City",
    away: "Ipswich Town",
    homeScore: null,
    awayScore: null
  },

  {
    id: "5",
    date: "Sat 17 Oct 2026, 17:30",
    group: "Premier League",
    home: "Newcastle United",
    away: "Aston Villa",
    homeScore: null,
    awayScore: null
  },

  {
    id: "6",
    date: "Sun 18 Oct 2026, 14:00",
    group: "Premier League",
    home: "AFC Bournemouth",
    away: "Sunderland",
    homeScore: null,
    awayScore: null
  },

  {
    id: "7",
    date: "Sun 18 Oct 2026, 14:00",
    group: "Premier League",
    home: "Brighton & Hove Albion",
    away: "Crystal Palace",
    homeScore: null,
    awayScore: null
  },

  {
    id: "8",
    date: "Sun 18 Oct 2026, 14:00",
    group: "Premier League",
    home: "Leeds United",
    away: "Manchester United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "9",
    date: "Sun 18 Oct 2026, 16:30",
    group: "Premier League",
    home: "Nottingham Forest",
    away: "Arsenal",
    homeScore: null,
    awayScore: null
  },

  {
    id: "10",
    date: "Mon 19 Oct 2026, 20:00",
    group: "Premier League",
    home: "Tottenham Hotspur",
    away: "Coventry City",
    homeScore: null,
    awayScore: null
  },


  /*
    CHAMPIONSHIP
  */

  {
    id: "11",
    date: "Fri 16 Oct 2026, 20:00",
    group: "Championship",
    home: "Burnley",
    away: "Wolverhampton Wanderers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "12",
    date: "Sat 17 Oct 2026, 12:30",
    group: "Championship",
    home: "Middlesbrough",
    away: "Cardiff City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "13",
    date: "Sat 17 Oct 2026, 12:30",
    group: "Championship",
    home: "Millwall",
    away: "Lincoln City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "14",
    date: "Sat 17 Oct 2026, 12:30",
    group: "Championship",
    home: "Watford",
    away: "Charlton Athletic",
    homeScore: null,
    awayScore: null
  },

  {
    id: "15",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Birmingham City",
    away: "Queens Park Rangers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "16",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Bristol City",
    away: "Sheffield United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "17",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Derby County",
    away: "Stoke City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "18",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Norwich City",
    away: "Portsmouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "19",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Southampton",
    away: "Bolton Wanderers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "20",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Swansea City",
    away: "West Ham United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "21",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "West Bromwich Albion",
    away: "Blackburn Rovers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "22",
    date: "Sat 17 Oct 2026, 15:00",
    group: "Championship",
    home: "Wrexham",
    away: "Preston North End",
    homeScore: null,
    awayScore: null
  }

];
/* =====================================================
   WEEK 8 FIXTURES
   23–25 OCTOBER 2026
===================================================== */

const week8Fixtures = [

  /*
    PREMIER LEAGUE
  */

  {
    id: "1",
    date: "Fri 23 Oct 2026, 20:00",
    group: "Premier League",
    home: "Ipswich Town",
    away: "Nottingham Forest",
    homeScore: null,
    awayScore: null
  },

  {
    id: "2",
    date: "Sat 24 Oct 2026, 12:30",
    group: "Premier League",
    home: "Aston Villa",
    away: "Manchester City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "3",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Premier League",
    home: "Arsenal",
    away: "Everton",
    homeScore: null,
    awayScore: null
  },

  {
    id: "4",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Premier League",
    home: "Coventry City",
    away: "Fulham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "5",
    date: "Sat 24 Oct 2026, 17:30",
    group: "Premier League",
    home: "Chelsea",
    away: "Tottenham Hotspur",
    homeScore: null,
    awayScore: null
  },

  {
    id: "6",
    date: "Sun 25 Oct 2026, 14:00",
    group: "Premier League",
    home: "Crystal Palace",
    away: "Newcastle United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "7",
    date: "Sun 25 Oct 2026, 14:00",
    group: "Premier League",
    home: "Hull City",
    away: "Brentford",
    homeScore: null,
    awayScore: null
  },

  {
    id: "8",
    date: "Sun 25 Oct 2026, 14:00",
    group: "Premier League",
    home: "Liverpool",
    away: "Brighton & Hove Albion",
    homeScore: null,
    awayScore: null
  },

  {
    id: "9",
    date: "Sun 25 Oct 2026, 14:00",
    group: "Premier League",
    home: "Manchester United",
    away: "AFC Bournemouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "10",
    date: "Sun 25 Oct 2026, 16:30",
    group: "Premier League",
    home: "Sunderland",
    away: "Leeds United",
    homeScore: null,
    awayScore: null
  },


  /*
    CHAMPIONSHIP
  */

  {
    id: "11",
    date: "Fri 23 Oct 2026, 20:00",
    group: "Championship",
    home: "Bolton Wanderers",
    away: "Middlesbrough",
    homeScore: null,
    awayScore: null
  },

  {
    id: "12",
    date: "Sat 24 Oct 2026, 12:30",
    group: "Championship",
    home: "Charlton Athletic",
    away: "Norwich City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "13",
    date: "Sat 24 Oct 2026, 12:30",
    group: "Championship",
    home: "Portsmouth",
    away: "Millwall",
    homeScore: null,
    awayScore: null
  },

  {
    id: "14",
    date: "Sat 24 Oct 2026, 12:30",
    group: "Championship",
    home: "Sheffield United",
    away: "Derby County",
    homeScore: null,
    awayScore: null
  },

  {
    id: "15",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Blackburn Rovers",
    away: "Wrexham",
    homeScore: null,
    awayScore: null
  },

  {
    id: "16",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Cardiff City",
    away: "Birmingham City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "17",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Lincoln City",
    away: "Burnley",
    homeScore: null,
    awayScore: null
  },

  {
    id: "18",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Preston North End",
    away: "West Bromwich Albion",
    homeScore: null,
    awayScore: null
  },

  {
    id: "19",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Queens Park Rangers",
    away: "Swansea City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "20",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Stoke City",
    away: "Bristol City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "21",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "West Ham United",
    away: "Southampton",
    homeScore: null,
    awayScore: null
  },

  {
    id: "22",
    date: "Sat 24 Oct 2026, 15:00",
    group: "Championship",
    home: "Wolverhampton Wanderers",
    away: "Watford",
    homeScore: null,
    awayScore: null
  }

];
const fixtures =
  week8Fixtures;



const week5HomePreviewFixtures = [

  {
    id: "1",
    home: "Brentford",
    away: "Chelsea"
  },

  {
    id: "2",
    home: "Tottenham Hotspur",
    away: "Aston Villa"
  },

  {
    id: "3",
    home: "Brighton & Hove Albion",
    away: "Arsenal"
  },

  {
    id: "4",
    home: "Everton",
    away: "Ipswich Town"
  },

  {
    id: "5",
    home: "Newcastle United",
    away: "Hull City"
  },

  {
    id: "6",
    home: "Nottingham Forest",
    away: "Coventry City"
  },

  {
    id: "7",
    home: "AFC Bournemouth",
    away: "Liverpool"
  },

  {
    id: "8",
    home: "Leeds United",
    away: "Crystal Palace"
  },

  {
    id: "9",
    home: "Manchester City",
    away: "Sunderland"
  },

  {
    id: "10",
    home: "Fulham",
    away: "Manchester United"
  },

  {
    id: "11",
    home: "Bristol City",
    away: "Watford"
  },

  {
    id: "12",
    home: "Cardiff City",
    away: "Charlton Athletic"
  },

  {
    id: "13",
    home: "Millwall",
    away: "West Ham United"
  },

  {
    id: "14",
    home: "Stoke City",
    away: "Sheffield United"
  },

  {
    id: "15",
    home: "Birmingham City",
    away: "Middlesbrough"
  },

  {
    id: "16",
    home: "Burnley",
    away: "Derby County"
  },

  {
    id: "17",
    home: "Lincoln City",
    away: "Swansea City"
  },

  {
    id: "18",
    home: "Norwich City",
    away: "Bolton Wanderers"
  },

  {
    id: "19",
    home: "Portsmouth",
    away: "Blackburn Rovers"
  },

  {
    id: "20",
    home: "Queens Park Rangers",
    away: "Preston North End"
  },

  {
    id: "21",
    home: "Wrexham",
    away: "Southampton"
  },

  {
    id: "22",
    home: "Wolverhampton Wanderers",
    away: "West Bromwich Albion"
  }

];

const homePreviewFixtures =
  week7Fixtures;


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const homePage =
  document.getElementById(
    "homePage"
  );

const predictionsPage =
  document.getElementById(
    "predictionsPage"
  );

const startGameBtn =
  document.getElementById(
    "startGameBtn"
  );

const premierLeagueBtn =
  document.getElementById(
    "premierLeagueBtn"
  );

const dreamTeamBtn =
  document.getElementById(
    "dreamTeamBtn"
  );

const backHomeBtn =
  document.getElementById(
    "backHomeBtn"
  );

const fixturesContainer =
  document.getElementById(
    "fixturesContainer"
  );

const submitPredictionsBtn =
  document.getElementById(
    "submitPredictionsBtn"
  );

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


function getPredictionDocId(
  username
) {

  const cleanRound =
    currentRound
      .toLowerCase()
      .replace(/\s+/g, "-");

  const cleanUser =
    cleanUsername(
      username
    );

  return `${cleanUser}-${cleanRound}`;
}


/* =====================================================
   PAGE SWITCHING
===================================================== */

function showHome() {

  if (
    homePage
  ) {

    homePage.classList.remove(
      "hidden"
    );
  }


  if (
    predictionsPage
  ) {

    predictionsPage.classList.add(
      "hidden"
    );
  }
}


function showPredictions() {

  if (
    homePage
  ) {

    homePage.classList.add(
      "hidden"
    );
  }


  if (
    predictionsPage
  ) {

    predictionsPage.classList.remove(
      "hidden"
    );
  }
}


if (
  backHomeBtn
) {

  backHomeBtn.addEventListener(
    "click",
    showHome
  );
}


/* =====================================================
   RENDER FIXTURES
===================================================== */

function renderFixtures() {

  if (
    !fixturesContainer
  ) {
    return;
  }


  fixturesContainer.innerHTML =
    "";


  fixtures.forEach(
    (fixture) => {

      const card =
        document.createElement(
          "div"
        );


      const isVoid =
        fixtureIsVoid(
          fixture.id
        );


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

          <div class="vs">
            v
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


      fixturesContainer.appendChild(
        card
      );
    }
  );
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
      getPredictionDocId(
        savedUsername
      )
    );


  const predictionSnap =
    await getDoc(
      predictionRef
    );


  return predictionSnap.exists();
}


function entryCheckTimeout(
  ms = 12000
) {

  return new Promise(
    (_, reject) => {

      setTimeout(
        () => {

          reject(
            new Error(
              "Entry check timed out"
            )
          );

        },
        ms
      );
    }
  );
}


/* =====================================================
   READ PREDICTIONS FROM PAGE
===================================================== */

function getPredictionsFromPage() {

  const predictions = [];


  for (
    const fixture of fixtures
  ) {

    if (
      fixtureIsVoid(
        fixture.id
      )
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


    if (
      homeInput.value === "" ||
      awayInput.value === ""
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
        Number(
          homeInput.value
        ),

      predictedAway:
        Number(
          awayInput.value
        ),

      void:
        false

    });
  }


  return predictions;
}


/* =====================================================
   SUBMIT PREDICTIONS
===================================================== */

if (
  submitPredictionsBtn
) {

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


        if (
          alreadySubmitted
        ) {

          localStorage.setItem(
            submittedStorageKey,
            "true"
          );


          alert(
            "You have already submitted predictions for This Week ."
          );


          window.location.href =
            "leaderboard.html";

          return;
        }


        const predictions =
          getPredictionsFromPage();


        if (
          !predictions
        ) {

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
            getPredictionDocId(
              username
            )
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
          "Current Week predictions submitted!"
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
   LIVE RESULTS FROM FIRESTORE
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
    await getDocs(
      resultsQuery
    );


  console.log(
    "Week 5 result documents found:",
    resultsSnap.size
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


      const fixtureId =
        String(
          data.fixtureId || ""
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


      const isFinished =
        finishedStatuses.has(
          status
        );


      console.log(
        "HOME LIVE RESULT:",
        {
          document:
            docSnap.id,

          fixtureId,

          status,

          isFinished,

          homeScore:
            data.homeScore,

          awayScore:
            data.awayScore
        }
      );


      homeLiveResults[
        fixtureId
      ] = {

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

    }
  );


  console.log(
    "Week 5 home live results:",
    homeLiveResults
  );
}

/* =====================================================
   MERGED RESULTS
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

        mergedResults[fixtureId] = result;

      } else if (!(fixtureId in mergedResults)) {

        mergedResults[fixtureId] = result;

      }

    }
  );

  return mergedResults;
}



/* =====================================================
   SCORING SYSTEM
===================================================== */

function getResultType(
  home,
  away
) {

  if (
    home > away
  ) {

    return "home";
  }


  if (
    away > home
  ) {

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
    scoringRound ===
    homePreviewRound
      ? getHomeRoundResults()
      : (
          resultsByRound[
            scoringRound
          ] || {}
        );


  const result =
    roundResults[
      String(
        fixture.id
      )
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


  const realHome =
    Number(
      actualHome
    );


  const realAway =
    Number(
      actualAway
    );


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

if (
  startGameBtn
) {

  startGameBtn.addEventListener(
    "click",
    async () => {

      if (
        !requireLogin()
      ) {

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
            "You have already submitted your this week's predictions."
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

if (
  premierLeagueBtn
) {

  premierLeagueBtn.addEventListener(
    "click",
    () => {

      if (
        !requireLogin()
      ) {

        return;
      }


      window.location.href =
        "index2.html";
    }
  );
}


if (
  dreamTeamBtn
) {

  dreamTeamBtn.addEventListener(
    "click",
    () => {

      if (
        !requireLogin()
      ) {

        return;
      }
    }
  );
}


/* =====================================================
   HOME LEADERBOARD PREVIEW
===================================================== */

async function renderHomeLeaderboardPreview() {

  if (
    !homeLeaderboardPreview
  ) {

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

        let exactScores = 0;

        let hasScoredFixture =
          false;


        if (
          Array.isArray(
            data.predictions
          )
        ) {

          data.predictions.forEach(
            (prediction) => {

      const fixture = {
  id:
    String(
      prediction.fixtureId
    )
};


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


                if (
                  points === 5
                ) {

                  exactScores += 1;
                }
              }
            }
          );
        }


        rows.push({

          username:
            data.username ||
            "?????",

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
                    ? data.submittedAt.seconds *
                      1000
                    : null
                ),

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
            No Week 6 entries
          </span>

          <span class="preview-points">
            Pending
          </span>

        </div>
      `;

      return;
    }


    rows.sort(
      (a, b) => {

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
          a.points == null &&
          b.points == null
        ) {

          if (
            a.submittedAtMillis != null &&
            b.submittedAtMillis != null &&
            a.submittedAtMillis !==
              b.submittedAtMillis
          ) {

            return (
              a.submittedAtMillis -
              b.submittedAtMillis
            );
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


          return (
            a.username.localeCompare(
              b.username
            )
          );
        }


        if (
          b.points !==
          a.points
        ) {

          return (
            b.points -
            a.points
          );
        }


        if (
          b.exactScores !==
          a.exactScores
        ) {

          return (
            b.exactScores -
            a.exactScores
          );
        }


        if (
          a.submittedAtMillis != null &&
          b.submittedAtMillis != null &&
          a.submittedAtMillis !==
            b.submittedAtMillis
        ) {

          return (
            a.submittedAtMillis -
            b.submittedAtMillis
          );
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


        return (
          a.username.localeCompare(
            b.username
          )
        );
      }
    );


    homeLeaderboardPreview.innerHTML =
      "";


    rows
      .slice(
        0,
        3
      )
      .forEach(
        (row, index) => {

          const div =
            document.createElement(
              "div"
            );


          div.className =
            "preview-row";


          div.style.cursor =
            "pointer";


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
===================================================== */

function renderHomeFixturesPreview() {

  if (
    !homeFixturesPreview
  ) {

    return;
  }


  homeFixturesPreview.innerHTML =
    "";


  const roundResults =
    getHomeRoundResults();


  const latestResults =
  homePreviewFixtures

      .map(
        (fixture) => {

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
        }
      )

      .filter(
        (fixture) =>
          fixture.homeScore != null &&
          fixture.awayScore != null
      )

      .sort(
        (a, b) =>
          Number(
            b.id
          ) -
          Number(
            a.id
          )
      )

      .slice(
        0,
        3
      );


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


      div.style.cursor =
        "pointer";


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

  if (predictionsAreClosed()) {

    countdownBox.innerHTML = `
      <strong>
        Week Eight predictions are now closed.
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

  countdownBox.innerHTML = `
    <strong>
      Week Eight predictions are now open!
    </strong>

    <br><br>

    Predict all Premier League and
    Championship matches for
    23–25 October 2026.

    <br><br>

    <strong>
      Final entries close Saturday
      24 October at 12:30pm.
    </strong>

    <br><br>

    Friday's Premier League and
    Championship fixtures will be
    void for entries submitted
    after 8pm Friday.
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


    deferredPrompt =
      event;


    const installBtn =
      document.getElementById(
        "installBtn"
      );


    if (
      !installBtn
    ) {

      return;
    }


    installBtn.style.display =
      "block";


    installBtn.addEventListener(
      "click",
      async () => {

        if (
          !deferredPrompt
        ) {

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


    if (
      homeLeaderboardPreview
    ) {

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

setInterval(
  updatePredictionsCountdown,
  30000
);
setInterval(
  refreshHomeLiveData,
  60000
);
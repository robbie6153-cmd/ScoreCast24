import { db } from "./firebase.js?v=107";
import { requireLogin } from "./auth.js?v=107";

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
} from "./results.js?v=1";


/* =========================
   ENGLISH LEAGUE WEEK TWO
========================= */

const currentRound =
  "English League Week Two";

const submittedStorageKey =
  `scorecast24Submitted-${currentRound}`;


/* =========================
   ENTRY / FIXTURE LOCKS
========================= */

/*
  Change to true when you want
  to close ALL Week Two entries.
*/
const roundClosed = true;


/*
  Fixtures listed here are void
  for NEW entrants only.

  Fixture 1 =
  Arsenal v Coventry City
*/
const voidFixtureIds = new Set([
  "1"
]);


function predictionsAreClosed() {
  return roundClosed;
}


function fixtureIsVoid(fixtureId) {
  return voidFixtureIds.has(
    String(fixtureId)
  );
}


/* =========================
   WEEK TWO FIXTURES
========================= */

const englishLeagueFixtures = [

  /* =========================
     PREMIER LEAGUE
  ========================= */

  {
    id: "1",
    date: "Fri 21 Aug 2026, 20:00",
    group: "Premier League",
    home: "Arsenal",
    away: "Coventry City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "2",
    date: "Sat 22 Aug 2026, 12:30",
    group: "Premier League",
    home: "Hull City",
    away: "Manchester United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "3",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Premier League",
    home: "Everton",
    away: "Crystal Palace",
    homeScore: null,
    awayScore: null
  },

  {
    id: "4",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Premier League",
    home: "Ipswich Town",
    away: "Sunderland",
    homeScore: null,
    awayScore: null
  },

  {
    id: "5",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Premier League",
    home: "Nottingham Forest",
    away: "Leeds United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "6",
    date: "Sat 22 Aug 2026, 17:30",
    group: "Premier League",
    home: "Brentford",
    away: "Tottenham Hotspur",
    homeScore: null,
    awayScore: null
  },

  {
    id: "7",
    date: "Sun 23 Aug 2026, 14:00",
    group: "Premier League",
    home: "Brighton & Hove Albion",
    away: "Aston Villa",
    homeScore: null,
    awayScore: null
  },

  {
    id: "8",
    date: "Sun 23 Aug 2026, 14:00",
    group: "Premier League",
    home: "Manchester City",
    away: "AFC Bournemouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "9",
    date: "Sun 23 Aug 2026, 16:30",
    group: "Premier League",
    home: "Newcastle United",
    away: "Liverpool",
    homeScore: null,
    awayScore: null
  },

  {
    id: "10",
    date: "Mon 24 Aug 2026, 20:00",
    group: "Premier League",
    home: "Fulham",
    away: "Chelsea",
    homeScore: null,
    awayScore: null
  },


  /* =========================
     EFL CHAMPIONSHIP
  ========================= */

  {
    id: "11",
    date: "Sat 22 Aug 2026, 12:30",
    group: "Championship",
    home: "Birmingham City",
    away: "Bristol City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "12",
    date: "Sat 22 Aug 2026, 12:30",
    group: "Championship",
    home: "Lincoln City",
    away: "Portsmouth",
    homeScore: null,
    awayScore: null
  },

  {
    id: "13",
    date: "Sat 22 Aug 2026, 12:30",
    group: "Championship",
    home: "Millwall",
    away: "Norwich City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "14",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Blackburn Rovers",
    away: "Middlesbrough",
    homeScore: null,
    awayScore: null
  },

  {
    id: "15",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Derby County",
    away: "Cardiff City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "16",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Preston North End",
    away: "Wolverhampton Wanderers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "17",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Queens Park Rangers",
    away: "Bolton Wanderers",
    homeScore: null,
    awayScore: null
  },

  {
    id: "18",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Southampton",
    away: "Stoke City",
    homeScore: null,
    awayScore: null
  },

  {
    id: "19",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Swansea City",
    away: "Sheffield United",
    homeScore: null,
    awayScore: null
  },

  {
    id: "20",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "West Ham United",
    away: "Charlton Athletic",
    homeScore: null,
    awayScore: null
  },

  {
    id: "21",
    date: "Sat 22 Aug 2026, 15:00",
    group: "Championship",
    home: "Wrexham",
    away: "Watford",
    homeScore: null,
    awayScore: null
  },

  {
    id: "22",
    date: "Sun 23 Aug 2026, 12:00",
    group: "Championship",
    home: "West Bromwich Albion",
    away: "Burnley",
    homeScore: null,
    awayScore: null
  }

];


const fixtures =
  englishLeagueFixtures;


/* =========================
   PAGE ELEMENTS
========================= */

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


/* =========================
   USERNAME
========================= */

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


/* =========================
   PAGE SWITCHING
========================= */

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


/* =========================
   RENDER FIXTURES
========================= */

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


/* =========================
   ENTRY CHECK
========================= */

async function hasAlreadySubmitted(
  savedUsername
) {
  if (
    !savedUsername ||
    savedUsername.trim().length < 2
  ) {
    return false;
  }


  /*
    FIRST:
    Check expected document ID.
  */

  const predictionRef = doc(
    db,
    "scorecast24_predictions",
    getPredictionDocId(savedUsername)
  );

  const predictionSnap =
    await getDoc(predictionRef);


  if (predictionSnap.exists()) {

    const data =
      predictionSnap.data();

    if (
      data.round === currentRound
    ) {
      return true;
    }
  }


  /*
    SECOND:
    Search ALL Week Two entries.

    This protects against older entries
    whose document ID was created using
    another format.
  */

  const roundQuery =
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


  const snapshot =
    await getDocs(roundQuery);


  const wantedUsername =
    cleanUsername(savedUsername);


  let found = false;


  snapshot.forEach((docSnap) => {

    if (found) return;


    const data =
      docSnap.data();


    const storedUsername =
      cleanUsername(
        data.username
      );


    if (
      storedUsername === wantedUsername
    ) {
      found = true;
    }
  });


  return found;
}


function entryCheckTimeout(ms = 12000) {
  return new Promise((_, reject) => {

    setTimeout(() => {

      reject(
        new Error(
          "Entry check timed out"
        )
      );

    }, ms);
  });
}


/* =========================
   READ PREDICTIONS
========================= */

function getPredictionsFromPage() {

  const predictions = [];


  for (const fixture of fixtures) {


    /*
      Void match for NEW entrant.
    */

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


/* =========================
   SUBMIT PREDICTIONS
========================= */

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


      /*
        IMPORTANT:

        Check Firestore BEFORE reading
        or submitting anything.
      */

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
            "You have already submitted predictions for this round."
          );


          window.location.href =
            "leaderboard.html";

          return;
        }


        /*
          Only read the form AFTER we know
          this person hasn't entered.
        */

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


        /*
          SECOND DUPLICATE CHECK.

          This is deliberate.

          It prevents somebody opening
          two tabs and submitting at
          roughly the same time.
        */

        const finalDuplicateCheck =
          await hasAlreadySubmitted(
            username
          );


        if (finalDuplicateCheck) {

          alert(
            "You have already submitted predictions for this round."
          );


          window.location.href =
            "leaderboard.html";

          return;
        }


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
          "Predictions submitted!"
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


/* =========================
   SCORING SYSTEM
========================= */

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
  fixture
) {


  /*
    A fixture void for this entrant
    contributes nothing.
  */

  if (
    prediction.void === true
  ) {

    return null;
  }


  const roundResults =
    resultsByRound[
      currentRound
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


/* =========================
   MAIN SCORE BUTTON
========================= */

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
            "You have already submitted your predictions for this round."
          );


          window.location.href =
            "leaderboard.html";

          return;
        }


        /*
          No existing entry found,
          so show prediction form.
        */

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


/* =========================
   OTHER GAME BUTTONS
========================= */

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


/* =========================
   HOME LEADERBOARD PREVIEW
========================= */

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
          currentRound
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
                fixtures.find(
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
                  fixture
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
            No entries yet
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

/* =========================
   HOME FIXTURES PREVIEW
========================= */

function renderHomeFixturesPreview() {

  if (!homeFixturesPreview) {
    return;
  }


  homeFixturesPreview.innerHTML =
    "";


  /*
    Get the official results for
    the current round from results.js
  */

  const roundResults =
    resultsByRound[
      currentRound
    ] || {};


  /*
    Match the results to the
    fixture information.
  */

  const latestResults =
    fixtures
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


  /*
    No completed matches yet.
  */

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


  /*
    Show latest three results.
  */

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

/* =========================
   MENU
========================= */

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


/* =========================
   PREDICTIONS STATUS
========================= */

function updatePredictionsCountdown() {


  /*
    Keeping your existing HTML ID
    so index.html does not need
    changing.
  */

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
        ${currentRound} predictions are now closed.
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
      Week Two predictions are still open
    </strong>
    <br>
    Matches already started are void
    for new entries.
  `;
}


/* =========================
   INSTALL BUTTON
========================= */

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


/* =========================
   START
========================= */

showHome();

renderHomeLeaderboardPreview();

renderHomeFixturesPreview();

updatePredictionsCountdown();


/*
  Refresh current week's
  top-three preview every minute.
*/
setInterval(
  renderHomeLeaderboardPreview,
  60000
);
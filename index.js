
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

import { resultsByRound } from "./results.js?v=4";

/* =====================================================
   ROUND SETTINGS
   Week 10 predictions / Week 9 homepage results
===================================================== */

const currentRound = "English League Week 10";
const homePreviewRound = "English League Week 9";
const homePreviewStoredRound = homePreviewRound;

const submittedStorageKey =
  `scorecast24Submitted-${currentRound}`;

/* =====================================================
   ENTRY LOCKS — WEEK 10
===================================================== */

// Set to true to close all Week 10 entries manually.
const roundClosed = false;

// Add fixture IDs here only if they must always be void.
const voidFixtureIds = new Set([]);

// All new entries close Saturday 7 November 2026, 12:30 GMT.
const predictionDeadline =
  new Date("2026-11-07T12:30:00+00:00");

// Both Friday matches kick off Friday 6 November at 20:00 GMT.
// Existing submissions made BEFORE kick-off are not changed.
const fridayVoidDeadline =
  new Date("2026-11-06T20:00:00+00:00");

const fridayVoidFixtureIds = new Set(["1", "11"]);

function fixtureIsVoid(fixtureId) {
  const id = String(fixtureId);

  if (voidFixtureIds.has(id)) {
    return true;
  }

  return (
    currentRound === "English League Week 10" &&
    fridayVoidFixtureIds.has(id) &&
    new Date() >= fridayVoidDeadline
  );
}

function predictionsAreClosed() {
  return roundClosed || new Date() >= predictionDeadline;
}

/* =====================================================
   FIXTURE HELPER
   IDs 1–10 = Premier League
   IDs 11–22 = Championship
===================================================== */

const PL = "Premier League";
const CH = "Championship";

function makeFixture(id, date, group, home, away) {
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
   WEEK 9 FIXTURES — HOMEPAGE RESULTS
   30 OCTOBER – 2 NOVEMBER 2026
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
   WEEK 10 FIXTURES — NEW PREDICTION ROUND
   6–8 NOVEMBER 2026
===================================================== */

const week10Fixtures = [
  // PREMIER LEAGUE
  // Friday: fixture 1 becomes VOID for entries after 20:00.
  makeFixture(1, "Fri 6 Nov 2026, 20:00", PL, "Everton", "Coventry City"),
  makeFixture(2, "Sat 7 Nov 2026, 12:30", PL, "Leeds United", "Tottenham Hotspur"),
  makeFixture(3, "Sat 7 Nov 2026, 15:00", PL, "Arsenal", "Hull City"),
  makeFixture(4, "Sat 7 Nov 2026, 15:00", PL, "Fulham", "Newcastle United"),
  makeFixture(5, "Sat 7 Nov 2026, 17:30", PL, "Nottingham Forest", "Manchester City"),
  makeFixture(6, "Sun 8 Nov 2026, 14:00", PL, "Brighton & Hove Albion", "Brentford"),
  makeFixture(7, "Sun 8 Nov 2026, 14:00", PL, "Crystal Palace", "Liverpool"),
  makeFixture(8, "Sun 8 Nov 2026, 14:00", PL, "Ipswich Town", "AFC Bournemouth"),
  makeFixture(9, "Sun 8 Nov 2026, 14:00", PL, "Sunderland", "Chelsea"),
  makeFixture(10, "Sun 8 Nov 2026, 16:30", PL, "Manchester United", "Aston Villa"),

  // CHAMPIONSHIP
  // Friday: fixture 11 becomes VOID for entries after 20:00.
  makeFixture(11, "Fri 6 Nov 2026, 20:00", CH, "Derby County", "Bolton Wanderers"),
  makeFixture(12, "Sat 7 Nov 2026, 12:30", CH, "Bristol City", "Norwich City"),
  makeFixture(13, "Sat 7 Nov 2026, 12:30", CH, "Portsmouth", "Stoke City"),
  makeFixture(14, "Sat 7 Nov 2026, 12:30", CH, "Wrexham", "Wolverhampton Wanderers"),
  makeFixture(15, "Sat 7 Nov 2026, 15:00", CH, "Birmingham City", "Swansea City"),
  makeFixture(16, "Sat 7 Nov 2026, 15:00", CH, "Blackburn Rovers", "West Ham United"),
  makeFixture(17, "Sat 7 Nov 2026, 15:00", CH, "Cardiff City", "Burnley"),
  makeFixture(18, "Sat 7 Nov 2026, 15:00", CH, "Charlton Athletic", "Sheffield United"),
  makeFixture(19, "Sat 7 Nov 2026, 15:00", CH, "Preston North End", "Southampton"),
  makeFixture(20, "Sat 7 Nov 2026, 15:00", CH, "Queens Park Rangers", "Lincoln City"),
  makeFixture(21, "Sat 7 Nov 2026, 15:00", CH, "Watford", "Middlesbrough"),
  makeFixture(22, "Sat 7 Nov 2026, 15:00", CH, "West Bromwich Albion", "Millwall")
];

/* =====================================================
   ACTIVE FIXTURES
===================================================== */

const fixtures = week10Fixtures;
const homePreviewFixtures = week9Fixtures;

/* =====================================================
   PAGE ELEMENTS
===================================================== */

const homePage = document.getElementById("homePage");
const predictionsPage = document.getElementById("predictionsPage");
const startGameBtn = document.getElementById("startGameBtn");
const premierLeagueBtn = document.getElementById("premierLeagueBtn");
const dreamTeamBtn = document.getElementById("dreamTeamBtn");
const backHomeBtn = document.getElementById("backHomeBtn");
const fixturesContainer = document.getElementById("fixturesContainer");
const submitPredictionsBtn = document.getElementById("submitPredictionsBtn");
const homeLeaderboardPreview = document.getElementById("homeLeaderboardPreview");
const homeFixturesPreview = document.getElementById("homeFixturesPreview");

/* =====================================================
   USERNAME
===================================================== */

let username = localStorage.getItem("scorecast24Username");

function cleanUsername(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getPredictionDocId(savedUsername) {
  const cleanRound = currentRound
    .toLowerCase()
    .replace(/\s+/g, "-");

  return cleanUsername(savedUsername) + "-" + cleanRound;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* =====================================================
   PAGE SWITCHING
===================================================== */

function showHome() {
  if (homePage) homePage.classList.remove("hidden");
  if (predictionsPage) predictionsPage.classList.add("hidden");
}

function showPredictions() {
  if (homePage) homePage.classList.add("hidden");
  if (predictionsPage) predictionsPage.classList.remove("hidden");
}

if (backHomeBtn) {
  backHomeBtn.addEventListener("click", showHome);
}

/* =====================================================
   RENDER PREDICTION FIXTURES
===================================================== */

function renderFixtures() {
  if (!fixturesContainer) return;

  fixturesContainer.innerHTML = "";

  fixtures.forEach((fixture) => {
    const card = document.createElement("div");
    const isVoid = fixtureIsVoid(fixture.id);

    card.className = isVoid
      ? "fixture-card fixture-void"
      : "fixture-card";

    card.dataset.fixtureId = fixture.id;

    card.innerHTML = `
      <div class="fixture-teams">
        <div class="team-name">${escapeHtml(fixture.home)}</div>

        ${isVoid
          ? '<div class="void-score">✕</div>'
          : `<input class="score-input" type="number" min="0"
                    id="home-${fixture.id}" placeholder="0">`
        }

        <div class="vs">v</div>

        ${isVoid
          ? '<div class="void-score">✕</div>'
          : `<input class="score-input" type="number" min="0"
                    id="away-${fixture.id}" placeholder="0">`
        }

        <div class="team-name">${escapeHtml(fixture.away)}</div>
      </div>

      <div class="fixture-date">
        ${escapeHtml(fixture.date)} · ${escapeHtml(fixture.group)}
        ${isVoid
          ? ' · <strong class="void-label">VOID FOR LATE ENTRIES</strong>'
          : ""
        }
      </div>
    `;

    fixturesContainer.appendChild(card);
  });
}

/* =====================================================
   AUTOMATICALLY VOID BOTH FRIDAY MATCHES
   If a player leaves their entry form open past 20:00,
   only the two Friday score boxes change to crosses.
===================================================== */

function updateVisibleFridayFixtures() {
  fridayVoidFixtureIds.forEach((fixtureId) => {
    if (!fixtureIsVoid(fixtureId)) return;

    const card = document.querySelector(
      `.fixture-card[data-fixture-id="${fixtureId}"]`
    );

    if (!card || card.classList.contains("fixture-void")) {
      return;
    }

    card.classList.add("fixture-void");

    [
      document.getElementById(`home-${fixtureId}`),
      document.getElementById(`away-${fixtureId}`)
    ].forEach((input) => {
      if (!input) return;

      const cross = document.createElement("div");
      cross.className = "void-score";
      cross.textContent = "✕";
      input.replaceWith(cross);
    });

    const dateBox = card.querySelector(".fixture-date");

    if (dateBox && !dateBox.querySelector(".void-label")) {
      const label = document.createElement("strong");
      label.className = "void-label";
      label.textContent = " · VOID FOR LATE ENTRIES";
      dateBox.appendChild(label);
    }
  });
}

/* =====================================================
   CHECK FOR AN EXISTING ENTRY
===================================================== */

async function hasAlreadySubmitted(savedUsername) {
  if (!savedUsername || savedUsername.trim().length < 2) {
    return false;
  }

  const predictionRef = doc(
    db,
    "scorecast24_predictions",
    getPredictionDocId(savedUsername)
  );

  const predictionSnap = await getDoc(predictionRef);
  return predictionSnap.exists();
}

function entryCheckTimeout(ms = 12000) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Entry check timed out")), ms);
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

    const homeInput = document.getElementById(`home-${fixture.id}`);
    const awayInput = document.getElementById(`away-${fixture.id}`);

    if (!homeInput || !awayInput) {
      alert("The prediction form could not be read.");
      return null;
    }

    if (homeInput.value === "" || awayInput.value === "") {
      alert(`Please enter a score for ${fixture.home} v ${fixture.away}`);
      return null;
    }

    const homeValue = Number(homeInput.value);
    const awayValue = Number(awayInput.value);

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
   SUBMIT WEEK 10 PREDICTIONS
===================================================== */

if (submitPredictionsBtn) {
  submitPredictionsBtn.addEventListener("click", async () => {
    if (predictionsAreClosed()) {
      alert(`${currentRound} predictions are now closed.`);
      return;
    }

    username = localStorage.getItem("scorecast24Username");

    if (!username || username.trim().length < 2) {
      alert("Please create your ScoreCast24 username first.");
      window.location.href = "username.html";
      return;
    }

    submitPredictionsBtn.disabled = true;
    submitPredictionsBtn.textContent = "Checking entry...";

    try {
      const alreadySubmitted = await hasAlreadySubmitted(username);

      if (alreadySubmitted) {
        localStorage.setItem(submittedStorageKey, "true");
        alert("You have already submitted predictions for Week 10.");
        window.location.href = "leaderboard.html";
        return;
      }

      const predictions = getPredictionsFromPage();
      if (!predictions) return;

      // Recheck after the Firestore lookup and just before saving.
      if (predictionsAreClosed()) {
        alert("Week 10 predictions have now closed.");
        return;
      }

      submitPredictionsBtn.textContent = "Submitting...";

      const predictionRef = doc(
        db,
        "scorecast24_predictions",
        getPredictionDocId(username)
      );

      await setDoc(predictionRef, {
        username,
        predictions,
        round: currentRound,
        submittedAt: serverTimestamp(),
        status: "Score pending match results",
        points: null
      });

      localStorage.setItem(submittedStorageKey, "true");
      alert("Week 10 predictions submitted!");
      window.location.href = "leaderboard.html";

    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission failed:\n\n" + error.message);

    } finally {
      submitPredictionsBtn.disabled = false;
      submitPredictionsBtn.textContent = "Submit Predictions";
    }
  });
}

/* =====================================================
   LIVE WEEK 9 RESULTS FROM FIRESTORE
===================================================== */

let homeLiveResults = {};

async function loadHomeLiveResults() {
  homeLiveResults = {};

  const resultsQuery = query(
    collection(db, "scorecast24_results"),
    where("round", "==", homePreviewRound)
  );

  const resultsSnap = await getDocs(resultsQuery);
  console.log("Week 9 result documents found:", resultsSnap.size);

  const finishedStatuses = new Set(["FT", "AET", "PEN"]);

  resultsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const fixtureId = String(data.fixtureId || "").trim();
    if (!fixtureId) return;

    const status = String(data.status || "").trim().toUpperCase();
    const isFinished = finishedStatuses.has(status);

    homeLiveResults[fixtureId] = {
      homeScore: isFinished ? data.homeScore ?? null : null,
      awayScore: isFinished ? data.awayScore ?? null : null,
      status
    };
  });

  console.log("Week 9 home live results:", homeLiveResults);
}

/* =====================================================
   MERGE WEEK 9 LIVE AND MANUAL RESULTS
===================================================== */

function getHomeRoundResults() {
  const manualResults = resultsByRound[homePreviewRound] || {};
  const mergedResults = { ...homeLiveResults };

  Object.entries(manualResults).forEach(([fixtureId, result]) => {
    if (result?.homeScore != null && result?.awayScore != null) {
      mergedResults[fixtureId] = result;
    } else if (!(fixtureId in mergedResults)) {
      mergedResults[fixtureId] = result;
    }
  });

  return mergedResults;
}

/* =====================================================
   SCORING
   Exact 5 / draw 3 / away 2 / home 1 / wrong 0
===================================================== */

function getResultType(home, away) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function calculatePoints(prediction, fixture, scoringRound = currentRound) {
  if (prediction.void === true) return null;

  const roundResults = scoringRound === homePreviewRound
    ? getHomeRoundResults()
    : (resultsByRound[scoringRound] || {});

  const result = roundResults[String(fixture.id)];
  const actualHome = result?.homeScore;
  const actualAway = result?.awayScore;

  if (actualHome == null || actualAway == null) return null;

  const predictedHome = Number(prediction.predictedHome);
  const predictedAway = Number(prediction.predictedAway);
  const realHome = Number(actualHome);
  const realAway = Number(actualAway);

  if (predictedHome === realHome && predictedAway === realAway) {
    return 5;
  }

  const predictedResult = getResultType(predictedHome, predictedAway);
  const actualResult = getResultType(realHome, realAway);

  if (predictedResult === "draw" && actualResult === "draw") return 3;
  if (predictedResult === "away" && actualResult === "away") return 2;
  if (predictedResult === "home" && actualResult === "home") return 1;
  return 0;
}

/* =====================================================
   SCORE PREDICTION BUTTON
===================================================== */

if (startGameBtn) {
  startGameBtn.addEventListener("click", async () => {
    if (!requireLogin()) return;

    if (predictionsAreClosed()) {
      alert(`${currentRound} predictions are now closed.`);
      return;
    }

    username = localStorage.getItem("scorecast24Username");

    if (!username || username.trim().length < 2) {
      window.location.href = "username.html";
      return;
    }

    startGameBtn.disabled = true;
    startGameBtn.textContent = "Checking your entry...";

    try {
      const alreadySubmitted = await Promise.race([
        hasAlreadySubmitted(username),
        entryCheckTimeout()
      ]);

      if (alreadySubmitted) {
        localStorage.setItem(submittedStorageKey, "true");
        alert("You have already submitted your Week 10 predictions.");
        window.location.href = "leaderboard.html";
        return;
      }

      // The deadline might pass during the asynchronous entry check.
      if (predictionsAreClosed()) {
        alert("Week 10 predictions have now closed.");
        return;
      }

      renderFixtures();
      showPredictions();

    } catch (error) {
      console.error("Entry check failed:", error);
      alert(
        "We could not check your existing entry. Please check your connection and try again."
      );

    } finally {
      startGameBtn.disabled = predictionsAreClosed();
      startGameBtn.textContent = predictionsAreClosed()
        ? "Predictions Closed"
        : "Submit Your Score Predictions Now!";
    }
  });
}

/* =====================================================
   OTHER GAME BUTTONS
===================================================== */

if (premierLeagueBtn) {
  premierLeagueBtn.addEventListener("click", () => {
    if (!requireLogin()) return;
    window.location.href = "index2.html";
  });
}

if (dreamTeamBtn) {
  dreamTeamBtn.addEventListener("click", () => {
    if (!requireLogin()) return;
  });
}

/* =====================================================
   HOME LEADERBOARD — WEEK 9
===================================================== */

async function renderHomeLeaderboardPreview() {
  if (!homeLeaderboardPreview) return;
  homeLeaderboardPreview.innerHTML = "Loading standings...";

  try {
    const predictionsQuery = query(
      collection(db, "scorecast24_predictions"),
      where("round", "==", homePreviewStoredRound)
    );

    const predictionsSnap = await getDocs(predictionsQuery);
    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      let totalPoints = 0;
      let exactScores = 0;
      let hasScoredFixture = false;

      if (Array.isArray(data.predictions)) {
        data.predictions.forEach((prediction) => {
          const fixture = { id: String(prediction.fixtureId) };
          const points = calculatePoints(
            prediction,
            fixture,
            homePreviewRound
          );

          if (points !== null) {
            totalPoints += points;
            hasScoredFixture = true;
            if (points === 5) exactScores += 1;
          }
        });
      }

      rows.push({
        username: data.username || "?????",
        points: hasScoredFixture ? totalPoints : null,
        exactScores,
        submittedAtMillis: data.submittedAt?.toMillis
          ? data.submittedAt.toMillis()
          : (typeof data.submittedAt?.seconds === "number"
              ? data.submittedAt.seconds * 1000
              : null),
        status: hasScoredFixture ? `${totalPoints} pts` : "Pending"
      });
    });

    if (rows.length === 0) {
      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">
          <span>No Week 9 entries</span>
          <span class="preview-points">Pending</span>
        </div>
      `;
      return;
    }

    // Points, exact scores, earliest submission, username A–Z.
    rows.sort((a, b) => {
      if (a.points == null && b.points != null) return 1;
      if (a.points != null && b.points == null) return -1;
      if (a.points != null && b.points != null && b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.exactScores !== a.exactScores) {
        return b.exactScores - a.exactScores;
      }
      if (a.submittedAtMillis != null && b.submittedAtMillis != null) {
        if (a.submittedAtMillis !== b.submittedAtMillis) {
          return a.submittedAtMillis - b.submittedAtMillis;
        }
      }
      if (a.submittedAtMillis != null && b.submittedAtMillis == null) {
        return -1;
      }
      if (a.submittedAtMillis == null && b.submittedAtMillis != null) {
        return 1;
      }
      return a.username.localeCompare(b.username);
    });

    homeLeaderboardPreview.innerHTML = "";

    rows.slice(0, 3).forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "preview-row";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <span>${index + 1}. ${escapeHtml(row.username)}</span>
        <span class="preview-points">${row.status}</span>
      `;
      div.addEventListener("click", () => {
        window.location.href = "leaderboard.html";
      });
      homeLeaderboardPreview.appendChild(div);
    });

  } catch (error) {
    console.error("Home leaderboard preview failed:", error);
    homeLeaderboardPreview.innerHTML = `
      <div class="preview-row">
        <span>Could not load</span>
        <span class="preview-points">—</span>
      </div>
    `;
  }
}

/* =====================================================
   HOME FIXTURE RESULTS — WEEK 9
===================================================== */

function renderHomeFixturesPreview() {
  if (!homeFixturesPreview) return;
  homeFixturesPreview.innerHTML = "";

  const roundResults = getHomeRoundResults();

  const latestResults = homePreviewFixtures
    .map((fixture) => {
      const result = roundResults[fixture.id];
      return {
        ...fixture,
        homeScore: result?.homeScore,
        awayScore: result?.awayScore
      };
    })
    .filter((fixture) =>
      fixture.homeScore != null && fixture.awayScore != null
    )
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 3);

  if (latestResults.length === 0) {
    homeFixturesPreview.innerHTML = `
      <div class="preview-row">
        <span>No results yet</span>
        <span>—</span>
      </div>
    `;
    return;
  }

  latestResults.forEach((fixture, index) => {
    const div = document.createElement("div");
    div.className = "preview-row";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <span>
        ${escapeHtml(fixture.home)}
        ${escapeHtml(fixture.homeScore)}-${escapeHtml(fixture.awayScore)}
        ${escapeHtml(fixture.away)}
      </span>
      <span>${index === 0 ? "Latest" : "›"}</span>
    `;
    div.addEventListener("click", () => {
      window.location.href = "leaderboard.html";
    });
    homeFixturesPreview.appendChild(div);
  });
}

/* =====================================================
   MENU
===================================================== */

const menuToggle = document.getElementById("menuToggle");
const dropdownMenu = document.getElementById("dropdownMenu");

if (menuToggle && dropdownMenu) {
  menuToggle.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (
      !menuToggle.contains(event.target) &&
      !dropdownMenu.contains(event.target)
    ) {
      dropdownMenu.classList.add("hidden");
    }
  });
}

/* =====================================================
   WEEK 10 PREDICTION STATUS
===================================================== */

function updatePredictionsCountdown() {
  updateVisibleFridayFixtures();

  const countdownBox = document.getElementById("weekOneCountdown");

  if (predictionsAreClosed()) {
    if (countdownBox) {
      countdownBox.innerHTML = `
        <strong>Week Ten predictions are now closed.</strong>
      `;
    }
    if (startGameBtn) {
      startGameBtn.disabled = true;
      startGameBtn.textContent = "Predictions Closed";
    }
    if (submitPredictionsBtn) {
      submitPredictionsBtn.disabled = true;
    }
    return;
  }

  const fridayMatchesVoided = new Date() >= fridayVoidDeadline;

  if (countdownBox) {
    countdownBox.innerHTML = `
      <strong>Week Ten predictions are now open!</strong>
      <br><br>
      Predict all Premier League and Championship matches for
      6–8 November 2026.
      <br><br>
      <strong>Final entries close Saturday 7 November at 12:30pm.</strong>
      <br><br>
      ${fridayMatchesVoided
        ? `<strong>
             Everton v Coventry City and Derby County v Bolton Wanderers
             are now VOID for new entries.
           </strong>`
        : `Friday's Everton v Coventry City and Derby County v Bolton Wanderers
           matches will be void for entries submitted after 8pm Friday.`
      }
    `;
  }

  if (startGameBtn) {
    startGameBtn.disabled = false;
    startGameBtn.textContent = "Submit Your Score Predictions Now!";
  }

  if (submitPredictionsBtn) {
    submitPredictionsBtn.disabled = false;
  }
}

/* =====================================================
   INSTALL BUTTON
===================================================== */

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;

  const installBtn = document.getElementById("installBtn");
  if (!installBtn) return;

  installBtn.style.display = "block";
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = "none";
  }, { once: true });
});

/* =====================================================
   HOME LIVE REFRESH
===================================================== */

async function refreshHomeLiveData() {
  try {
    await loadHomeLiveResults();
    await renderHomeLeaderboardPreview();
    renderHomeFixturesPreview();

  } catch (error) {
    console.error("Home live update failed:", error);

    if (homeLeaderboardPreview) {
      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">
          <span>Could not load</span>
          <span class="preview-points">—</span>
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

// Check deadline and Friday voids every 30 seconds.
setInterval(updatePredictionsCountdown, 30000);

// Refresh Week 9 homepage standings/results every 60 seconds.
setInterval(refreshHomeLiveData, 60000);

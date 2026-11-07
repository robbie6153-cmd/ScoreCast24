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

const currentRound = "English League Week 11";
const homePreviewRound = "English League Week 10";
const submittedStorageKey = `scorecast24Submitted-${currentRound}`;
const roundClosed = false;
const predictionDeadline = new Date("2026-11-21T12:30:00+00:00");

const PL = "Premier League";
const CH = "Championship";

function makeFixture(id, date, group, home, away) {
  return { id: String(id), date, group, home, away, homeScore: null, awayScore: null };
}


// Week 11 — Premier League and Championship, 21–23 November 2026.
// All kick-off times are GMT.
const fixtures = [
  // PREMIER LEAGUE
  makeFixture(1, "Sat 21 Nov 2026, 12:30", PL, "Manchester City", "Fulham"),
  makeFixture(2, "Sat 21 Nov 2026, 15:00", PL, "AFC Bournemouth", "Nottingham Forest"),
  makeFixture(3, "Sat 21 Nov 2026, 15:00", PL, "Aston Villa", "Sunderland"),
  makeFixture(4, "Sat 21 Nov 2026, 15:00", PL, "Chelsea", "Leeds United"),
  makeFixture(5, "Sat 21 Nov 2026, 15:00", PL, "Coventry City", "Crystal Palace"),
  makeFixture(6, "Sat 21 Nov 2026, 15:00", PL, "Tottenham Hotspur", "Ipswich Town"),
  makeFixture(7, "Sat 21 Nov 2026, 17:30", PL, "Newcastle United", "Arsenal"),
  makeFixture(8, "Sun 22 Nov 2026, 14:00", PL, "Hull City", "Brighton & Hove Albion"),
  makeFixture(9, "Sun 22 Nov 2026, 16:30", PL, "Liverpool", "Manchester United"),
  makeFixture(10, "Mon 23 Nov 2026, 20:00", PL, "Brentford", "Everton"),

  // CHAMPIONSHIP
  makeFixture(11, "Sat 21 Nov 2026, 12:30", CH, "Millwall", "Queens Park Rangers"),
  makeFixture(12, "Sat 21 Nov 2026, 12:30", CH, "Norwich City", "Cardiff City"),
  makeFixture(13, "Sat 21 Nov 2026, 12:30", CH, "Southampton", "Derby County"),
  makeFixture(14, "Sat 21 Nov 2026, 15:00", CH, "Bolton Wanderers", "Portsmouth"),
  makeFixture(15, "Sat 21 Nov 2026, 15:00", CH, "Lincoln City", "Wrexham"),
  makeFixture(16, "Sat 21 Nov 2026, 15:00", CH, "Middlesbrough", "Bristol City"),
  makeFixture(17, "Sat 21 Nov 2026, 15:00", CH, "Sheffield United", "Watford"),
  makeFixture(18, "Sat 21 Nov 2026, 15:00", CH, "Stoke City", "Birmingham City"),
  makeFixture(19, "Sat 21 Nov 2026, 15:00", CH, "Swansea City", "West Bromwich Albion"),
  makeFixture(20, "Sat 21 Nov 2026, 15:00", CH, "West Ham United", "Preston North End"),
  makeFixture(21, "Sat 21 Nov 2026, 15:00", CH, "Wolverhampton Wanderers", "Charlton Athletic"),
  makeFixture(22, "Sun 22 Nov 2026, 12:00", CH, "Burnley", "Blackburn Rovers")
];

// Week 10 — homepage results. IDs match the original Week 10 entries.
const homePreviewFixtures = [
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

let checkingEntry = false;
let submittingEntry = false;
let homeLiveResults = {};

function predictionsAreClosed() {
  return roundClosed || new Date() >= predictionDeadline;
}

function getPredictionRef(username) {
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "-");
  const cleanRound = currentRound.toLowerCase().replace(/\s+/g, "-");
  return doc(db, "scorecast24_predictions", `${cleanUsername}-${cleanRound}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showHome() {
  homePage?.classList.remove("hidden");
  predictionsPage?.classList.add("hidden");
}

function showPredictions() {
  homePage?.classList.add("hidden");
  predictionsPage?.classList.remove("hidden");
}

backHomeBtn?.addEventListener("click", showHome);

function renderFixtures() {
  if (!fixturesContainer) return;
  fixturesContainer.innerHTML = "";

  fixtures.forEach((fixture) => {
    const card = document.createElement("div");
    card.className = "fixture-card";
    card.dataset.fixtureId = fixture.id;
    card.innerHTML = `
      <div class="fixture-teams">
        <div class="team-name">${escapeHtml(fixture.home)}</div>
        <input class="score-input" type="number" min="0"
               id="home-${fixture.id}" placeholder="0">
        <div class="vs">v</div>
        <input class="score-input" type="number" min="0"
               id="away-${fixture.id}" placeholder="0">
        <div class="team-name">${escapeHtml(fixture.away)}</div>
      </div>
      <div class="fixture-date">
        ${escapeHtml(fixture.date)} · ${escapeHtml(fixture.group)}
      </div>
    `;
    fixturesContainer.appendChild(card);
  });
}

async function hasAlreadySubmitted(predictionRef) {
  const predictionSnap = await getDoc(predictionRef);
  return predictionSnap.exists();
}

function entryCheckTimeout(ms = 12000) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Entry check timed out")), ms);
  });
}

function redirectToExistingEntry() {
  localStorage.setItem(submittedStorageKey, "true");
  alert("You have already submitted predictions for Week 11.");
  window.location.href = "leaderboard.html";
}

function getPredictionsFromPage() {
  const predictions = [];

  for (const fixture of fixtures) {
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

    const predictedHome = Number(homeInput.value);
    const predictedAway = Number(awayInput.value);

    if (
      !Number.isInteger(predictedHome) ||
      !Number.isInteger(predictedAway) ||
      predictedHome < 0 ||
      predictedAway < 0
    ) {
      alert(`Please enter valid non-negative whole-number scores for ${fixture.home} v ${fixture.away}`);
      return null;
    }

    predictions.push({
      fixtureId: fixture.id,
      home: fixture.home,
      away: fixture.away,
      predictedHome,
      predictedAway,
      void: false
    });
  }

  return predictions;
}

startGameBtn?.addEventListener("click", async () => {
  if (checkingEntry || !requireLogin()) return;

  if (predictionsAreClosed()) {
    alert(`${currentRound} predictions are now closed.`);
    return;
  }

  const username = localStorage.getItem("scorecast24Username");
  if (!username || username.trim().length < 2) {
    window.location.href = "username.html";
    return;
  }

  checkingEntry = true;
  startGameBtn.disabled = true;
  startGameBtn.textContent = "Checking your entry...";

  try {
    const alreadySubmitted = await Promise.race([
      hasAlreadySubmitted(getPredictionRef(username)),
      entryCheckTimeout()
    ]);

    if (alreadySubmitted) {
      redirectToExistingEntry();
      return;
    }

    if (predictionsAreClosed()) {
      alert("Week 11 predictions have now closed.");
      return;
    }

    renderFixtures();
    showPredictions();
  } catch (error) {
    console.error("Entry check failed:", error);
    alert("We could not check your existing entry. Please check your connection and try again.");
  } finally {
    checkingEntry = false;
    updatePredictionsCountdown();
  }
});

submitPredictionsBtn?.addEventListener("click", async () => {
  if (submittingEntry) return;

  if (predictionsAreClosed()) {
    alert(`${currentRound} predictions are now closed.`);
    return;
  }

  const username = localStorage.getItem("scorecast24Username");
  if (!username || username.trim().length < 2) {
    alert("Please create your ScoreCast24 username first.");
    window.location.href = "username.html";
    return;
  }

  submittingEntry = true;
  submitPredictionsBtn.disabled = true;
  submitPredictionsBtn.textContent = "Checking entry...";

  try {
    const predictionRef = getPredictionRef(username);
    if (await hasAlreadySubmitted(predictionRef)) {
      redirectToExistingEntry();
      return;
    }

    const predictions = getPredictionsFromPage();
    if (!predictions) return;

    if (predictionsAreClosed()) {
      alert("Week 11 predictions have now closed.");
      return;
    }

    submitPredictionsBtn.textContent = "Submitting...";
    await setDoc(predictionRef, {
      username,
      predictions,
      round: currentRound,
      submittedAt: serverTimestamp(),
      status: "Score pending match results",
      points: null
    });

    localStorage.setItem(submittedStorageKey, "true");
    alert("Week 11 predictions submitted!");
    window.location.href = "leaderboard.html";
  } catch (error) {
    console.error("Submission failed:", error);
    alert("Submission failed:\n\n" + error.message);
  } finally {
    submittingEntry = false;
    submitPredictionsBtn.textContent = "Submit Predictions";
    updatePredictionsCountdown();
  }
});

premierLeagueBtn?.addEventListener("click", () => {
  if (!requireLogin()) return;
  window.location.href = "index2.html";
});

dreamTeamBtn?.addEventListener("click", () => {
  if (!requireLogin()) return;
});

// Week 10 homepage results and standings.
async function loadHomeLiveResults() {
  const resultsQuery = query(
    collection(db, "scorecast24_results"),
    where("round", "==", homePreviewRound)
  );

  const resultsSnap = await getDocs(resultsQuery);
  const finishedStatuses = new Set(["FT", "AET", "PEN"]);
  const liveResults = {};

  resultsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const fixtureId = String(data.fixtureId || "").trim();
    if (!fixtureId) return;

    const status = String(data.status || "").trim().toUpperCase();
    const isFinished = finishedStatuses.has(status);
    liveResults[fixtureId] = {
      homeScore: isFinished ? data.homeScore ?? null : null,
      awayScore: isFinished ? data.awayScore ?? null : null,
      status
    };
  });

  homeLiveResults = liveResults;
}

function getHomeRoundResults() {
  const manualResults = resultsByRound[homePreviewRound] || {};
  const mergedResults = { ...homeLiveResults };

  Object.entries(manualResults).forEach(([fixtureId, result]) => {
    if (
      (result?.homeScore != null && result?.awayScore != null) ||
      !(fixtureId in mergedResults)
    ) {
      mergedResults[fixtureId] = result;
    }
  });

  return mergedResults;
}

function getResultType(home, away) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function calculatePoints(prediction, result) {
  if (prediction.void === true) return null;
  if (result?.homeScore == null || result?.awayScore == null) return null;

  const predictedHome = Number(prediction.predictedHome);
  const predictedAway = Number(prediction.predictedAway);
  const realHome = Number(result.homeScore);
  const realAway = Number(result.awayScore);

  if (predictedHome === realHome && predictedAway === realAway) return 5;

  const predictedResult = getResultType(predictedHome, predictedAway);
  const actualResult = getResultType(realHome, realAway);

  if (predictedResult !== actualResult) return 0;
  if (actualResult === "draw") return 3;
  if (actualResult === "away") return 2;
  return 1;
}

async function renderHomeLeaderboardPreview() {
  if (!homeLeaderboardPreview) return;
  homeLeaderboardPreview.innerHTML = "Loading standings...";

  try {
    const predictionsQuery = query(
      collection(db, "scorecast24_predictions"),
      where("round", "==", homePreviewRound)
    );

    const predictionsSnap = await getDocs(predictionsQuery);
    const roundResults = getHomeRoundResults();
    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      let totalPoints = 0;
      let exactScores = 0;
      let hasScoredFixture = false;

      if (Array.isArray(data.predictions)) {
        data.predictions.forEach((prediction) => {
          const points = calculatePoints(
            prediction,
            roundResults[String(prediction.fixtureId)]
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
              : null)
      });
    });

    if (rows.length === 0) {
      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">
          <span>No Week 10 entries</span>
          <span class="preview-points">Pending</span>
        </div>
      `;
      return;
    }

    // Pending entries last, then points, exact scores, earliest entry and username.
    rows.sort((a, b) =>
      (b.points ?? -1) - (a.points ?? -1) ||
      b.exactScores - a.exactScores ||
      (a.submittedAtMillis ?? Infinity) - (b.submittedAtMillis ?? Infinity) ||
      a.username.localeCompare(b.username)
    );

    homeLeaderboardPreview.innerHTML = "";
    rows.slice(0, 3).forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "preview-row";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <span>${index + 1}. ${escapeHtml(row.username)}</span>
        <span class="preview-points">${row.points == null ? "Pending" : `${row.points} pts`}</span>
      `;
      div.addEventListener("click", () => {
        window.location.href = "leaderboard.html";
      });
      homeLeaderboardPreview.appendChild(div);
    });
  } catch (error) {
    console.error("Home leaderboard preview failed:", error);
    showHomeLeaderboardError();
  }
}

function showHomeLeaderboardError() {
  if (!homeLeaderboardPreview) return;
  homeLeaderboardPreview.innerHTML = `
    <div class="preview-row">
      <span>Could not load</span>
      <span class="preview-points">—</span>
    </div>
  `;
}

function renderHomeFixturesPreview() {
  if (!homeFixturesPreview) return;
  homeFixturesPreview.innerHTML = "";

  const roundResults = getHomeRoundResults();
  const latestResults = homePreviewFixtures
    .map((fixture) => ({
      ...fixture,
      homeScore: roundResults[fixture.id]?.homeScore,
      awayScore: roundResults[fixture.id]?.awayScore
    }))
    .filter((fixture) => fixture.homeScore != null && fixture.awayScore != null)
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

const menuToggle = document.getElementById("menuToggle");
const dropdownMenu = document.getElementById("dropdownMenu");

if (menuToggle && dropdownMenu) {
  menuToggle.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!menuToggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });
}

function updatePredictionsCountdown() {
  const countdownBox = document.getElementById("weekOneCountdown");
  const closed = predictionsAreClosed();

  if (countdownBox) {
    countdownBox.innerHTML = closed
      ? "<strong>Week Eleven predictions are now closed.</strong>"
      : `
        <strong>Week Eleven predictions are now open!</strong>
        <br><br>
        Predict all 10 Premier League matches for 21–23 November 2026.
        <br><br>
        <strong>Final entries close Saturday 21 November at 12:30pm GMT.</strong>
      `;
  }

  if (startGameBtn) {
    startGameBtn.disabled = closed || checkingEntry;
    if (!checkingEntry || closed) {
      startGameBtn.textContent = closed
        ? "Predictions Closed"
        : "Submit Your Score Predictions Now!";
    }
  }

  if (submitPredictionsBtn) {
    submitPredictionsBtn.disabled = closed || submittingEntry;
  }
}

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

async function refreshHomeLiveData() {
  try {
    await loadHomeLiveResults();
    await renderHomeLeaderboardPreview();
    renderHomeFixturesPreview();
  } catch (error) {
    console.error("Home live update failed:", error);
    showHomeLeaderboardError();
  }
}

showHome();
updatePredictionsCountdown();
refreshHomeLiveData();

setInterval(updatePredictionsCountdown, 30000);
setInterval(refreshHomeLiveData, 60000);
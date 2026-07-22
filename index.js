import { db } from "./firebase.js?v=107";
import { requireLogin } from "./auth.js?v=107";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* =========================
   ENGLISH LEAGUE OPENING FIXTURES
========================= */

const predictionsDeadline = new Date("2026-08-14T20:00:00+01:00");

function predictionsAreClosed() {
  return new Date() >= predictionsDeadline;
}

const englishLeagueFixtures = [
  { id: "1", date: "Fri 14 Aug 2026, 20:00", group: "Championship", home: "Wolves", away: "Blackburn", homeScore: null, awayScore: null },

  { id: "2", date: "Sat 15 Aug 2026, 12:30", group: "Championship", home: "Bolton", away: "Preston", homeScore: null, awayScore: null },

  { id: "3", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Bristol City", away: "Millwall", homeScore: null, awayScore: null },
  { id: "4", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Charlton", away: "Derby", homeScore: null, awayScore: null },
  { id: "5", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Middlesbrough", away: "Lincoln", homeScore: null, awayScore: null },
  { id: "6", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Norwich", away: "West Brom", homeScore: null, awayScore: null },
  { id: "7", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Portsmouth", away: "QPR", homeScore: null, awayScore: null },
  { id: "8", date: "Sat 15 Aug 2026, 15:00", group: "Championship", home: "Stoke", away: "Swansea", homeScore: null, awayScore: null },

  { id: "9", date: "Sat 15 Aug 2026, 17:30", group: "Championship", home: "Sheffield United", away: "Birmingham", homeScore: null, awayScore: null },

  { id: "10", date: "Sun 16 Aug 2026, 13:30", group: "Championship", home: "Watford", away: "Southampton", homeScore: null, awayScore: null },

  { id: "11", date: "Sun 16 Aug 2026, 15:00", group: "Community Shield", home: "Arsenal", away: "Manchester City", venue: "Principality Stadium, Cardiff", homeScore: null, awayScore: null },

  { id: "12", date: "Sun 16 Aug 2026, 16:00", group: "Championship", home: "Burnley", away: "West Ham", homeScore: null, awayScore: null },

  { id: "13", date: "Mon 17 Aug 2026, 20:00", group: "Championship", home: "Cardiff", away: "Wrexham", homeScore: null, awayScore: null }
];

const fixtures = englishLeagueFixtures;
const currentRound = "English League Week One";

/* =========================
   PAGE ELEMENTS
========================= */

const homePage = document.getElementById("homePage");
const predictionsPage = document.getElementById("predictionsPage");
const leaderboardPage = document.getElementById("leaderboardPage");

const startGameBtn = document.getElementById("startGameBtn");
const premierLeagueBtn = document.getElementById("premierLeagueBtn");
const dreamTeamBtn = document.getElementById("dreamTeamBtn");

const backHomeBtn = document.getElementById("backHomeBtn");
const backToPredictionsBtn = document.getElementById("backToPredictionsBtn");
const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");
const fixturesContainer = document.getElementById("fixturesContainer");
const leaderboardContainer = document.getElementById("leaderboardContainer");

const submitPredictionsBtn = document.getElementById("submitPredictionsBtn");

const confirmModal = document.getElementById("confirmModal");
const confirmSubmitBtn = document.getElementById("confirmSubmitBtn");
const cancelSubmitBtn = document.getElementById("cancelSubmitBtn");

/* =========================
   USERNAME
========================= */

let username = localStorage.getItem("scorecast24Username");

function cleanUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
function getPredictionDocId(savedUsername) {
  return `${cleanUsername(savedUsername)}-${currentRound.toLowerCase().replace(/\s+/g, "-")}`;
}
function askForUsername() {
  while (!username || username.trim().length < 2) {
    username = prompt("Choose a username for ScoreCast24:");
    if (username === null) return false;
    username = username.trim();
  }

  localStorage.setItem("scorecast24Username", username);
  return true;
}

/* =========================
   PAGE SWITCHING
========================= */

function showHome() {
  homePage.classList.remove("hidden");
  predictionsPage.classList.add("hidden");
  leaderboardPage.classList.add("hidden");
}

function showPredictions() {
  homePage.classList.add("hidden");
  predictionsPage.classList.remove("hidden");
  leaderboardPage.classList.add("hidden");
}

function showLeaderboard() {
  homePage.classList.add("hidden");
  predictionsPage.classList.add("hidden");
  leaderboardPage.classList.remove("hidden");
}

/* =========================
   RENDER FIXTURES
========================= */

function renderFixtures() {
  fixturesContainer.innerHTML = "";

  fixtures.forEach((fixture) => {
    const card = document.createElement("div");
    card.className = "fixture-card";

    card.innerHTML = `
      <div class="fixture-teams">
        <div class="team-name">${fixture.home}</div>
        <input 
          class="score-input" 
          type="number" 
          min="0" 
          id="home-${fixture.id}"
          placeholder="0"
        >
        <div class="vs">v</div>
        <input 
          class="score-input" 
          type="number" 
          min="0" 
          id="away-${fixture.id}"
          placeholder="0"
        >
        <div class="team-name">${fixture.away}</div>
      </div>

      <div class="fixture-date">
      ${fixture.date} · ${fixture.group}${fixture.venue ? ` · ${fixture.venue}` : ""}
      </div>
    `;

    fixturesContainer.appendChild(card);
  });
}

/* =========================
   SUBMIT PREDICTIONS
========================= */

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

function getPredictionsFromPage() {
  const predictions = [];

  for (const fixture of fixtures) {
    const homeInput = document.getElementById(`home-${fixture.id}`);
    const awayInput = document.getElementById(`away-${fixture.id}`);

    const homePrediction = homeInput.value;
    const awayPrediction = awayInput.value;

    if (homePrediction === "" || awayPrediction === "") {
      alert(`Please enter a score for ${fixture.home} v ${fixture.away}`);
      return null;
    }

    predictions.push({
      fixtureId: fixture.id,
      home: fixture.home,
      away: fixture.away,
      predictedHome: Number(homePrediction),
      predictedAway: Number(awayPrediction)
    });
  }

  return predictions;
}


if (submitPredictionsBtn) {
  submitPredictionsBtn.addEventListener("click", async () => {
if (predictionsAreClosed()) {
  alert("English League Week One predictions are now closed.");
  return;
}

 username = localStorage.getItem("scorecast24Username");

if (!username || username.trim().length < 2) {
  alert("Please create your ScoreCast24 username first.");
  window.location.href = "username.html";
  return;
}

    const predictions = getPredictionsFromPage();
    if (!predictions) return;

    try {
      const alreadySubmitted = await hasAlreadySubmitted(username);

      if (alreadySubmitted) {
        alert("You have already submitted predictions for this round. You cannot change them.");
        await renderLeaderboard();
        showLeaderboard();
        return;
      }

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

      alert("Predictions submitted!");

      await renderLeaderboard();
      showLeaderboard();

    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission failed:\n\n" + error.message);
    }
  });
}

/* =========================
   SCORING SYSTEM
========================= */
function getResultType(home, away) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function calculatePoints(prediction, fixture) {
  const actualHome = fixture.homeScore;
  const actualAway = fixture.awayScore;

  if (actualHome === null || actualAway === null) {
    return null;
  }

  const predictedHome = prediction.predictedHome;
  const predictedAway = prediction.predictedAway;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 5;
  }

  const predictedResult = getResultType(predictedHome, predictedAway);
  const actualResult = getResultType(actualHome, actualAway);

  if (predictedResult === "draw" && actualResult === "draw") {
    return 3;
  }

  if (predictedResult === "away" && actualResult === "away") {
    return 2;
  }

  if (predictedResult === "home" && actualResult === "home") {
    return 1;
  }

  return 0;
}

function haveAnyResultsBeenAdded() {
  return fixtures.some(fixture => fixture.homeScore !== null && fixture.awayScore !== null);
}

/* =========================
   LEADERBOARD
========================= */

 async function renderLeaderboard() {
  leaderboardContainer.innerHTML = "Loading leaderboard...";

  try {
    const predictionsSnap = await getDocs(collection(db, "scorecast24_predictions"));

    const rows = [];
    const resultsStarted = haveAnyResultsBeenAdded();

 predictionsSnap.forEach((docSnap) => {
  const data = docSnap.data();

  if (data.round !== currentRound) {
    return;
  }

  let totalPoints = 0;
      let hasScoredFixture = false;

      if (data.predictions && Array.isArray(data.predictions)) {
        data.predictions.forEach((prediction) => {
          const fixture = fixtures.find(f => f.id === prediction.fixtureId);

          if (fixture) {
            const points = calculatePoints(prediction, fixture);

            if (points !== null) {
              totalPoints += points;
              hasScoredFixture = true;
            }
          }
        });
      }

      rows.push({
        id: docSnap.id,
        username: data.username || "Unknown",
        points: totalPoints,
        status: resultsStarted && hasScoredFixture
          ? `${totalPoints} pts`
          : "Score pending match results"
      });
    });

    rows.sort((a, b) => b.points - a.points);

    if (rows.length === 0) {
      leaderboardContainer.innerHTML = "<p>No predictions submitted yet.</p>";
      return;
    }

    leaderboardContainer.innerHTML = "";

    rows.forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "leaderboard-row";

      div.innerHTML = `
        <div>#${index + 1}</div>

        <div>
          <div>${row.username}</div>
          <div class="view-predictions-text">View predictions</div>
        </div>

        <div class="leaderboard-points">${row.status}</div>
      `;

      div.addEventListener("click", () => {
        localStorage.setItem("viewPredictionId", row.id);
        localStorage.setItem("viewPredictionUsername", row.username);
        window.location.href = "view-predictions.html";
      });

      leaderboardContainer.appendChild(div);
    });

  } catch (error) {
    console.error("Leaderboard failed:", error);
    leaderboardContainer.innerHTML = "<p>Could not load leaderboard.</p>";
  }
}

/* =========================
   BUTTONS
========================= */
if (startGameBtn) {
  startGameBtn.addEventListener("click", async () => {
    if (!requireLogin()) return;

    if (predictionsAreClosed()) {
      alert("English League Week One predictions are now closed.");
      return;
    }

    username = localStorage.getItem("scorecast24Username");

    if (!username || username.trim().length < 2) {
      window.location.href = "username.html";
      return;
    }

    // Prevent repeated clicks while Firestore is checking.
    startGameBtn.disabled = true;
    startGameBtn.textContent = "Checking your entry...";

    try {
      const alreadySubmitted =
        await hasAlreadySubmitted(username);

      if (alreadySubmitted) {
        alert(
          "You have already submitted predictions. Showing leaderboard."
        );

        await renderLeaderboard();
        showLeaderboard();
        return;
      }

      // Only show the prediction form once Firestore confirms
      // that the user has not already submitted.
      renderFixtures();
      showPredictions();

    } catch (error) {
      console.error(
        "Firestore check failed:",
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
  });
}

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
if (backHomeBtn) {
  backHomeBtn.addEventListener("click", showHome);
}

if (leaderboardHomeBtn) {
  leaderboardHomeBtn.addEventListener("click", showHome);
}
if (backToPredictionsBtn) {
  backToPredictionsBtn.addEventListener("click", async () => {
    if (predictionsAreClosed()) {
      alert("English League Week One predictions are now closed.");
      return;
    }

    username = localStorage.getItem("scorecast24Username");

    try {
      const alreadySubmitted = await hasAlreadySubmitted(username);

      if (alreadySubmitted) {
        alert("You have already submitted predictions. You cannot change them.");
        return;
      }

      renderFixtures();
      showPredictions();
    } catch (error) {
      console.error("Back to predictions failed:", error);
      alert("Could not check your submission status.");
    }
  });
}
/* =========================
   HOME PAGE PREVIEWS
========================= */

const homeLeaderboardPreview = document.getElementById("homeLeaderboardPreview");
const homeFixturesPreview = document.getElementById("homeFixturesPreview");
if (homeLeaderboardPreview) {
  homeLeaderboardPreview.style.cursor = "pointer";

  homeLeaderboardPreview.addEventListener("click", () => {
    window.location.href = "leaderboard.html";
  });
}

     async function renderHomeLeaderboardPreview() {
  if (!homeLeaderboardPreview) return;

  homeLeaderboardPreview.innerHTML = "Loading standings...";

  try {
    const predictionsSnap = await getDocs(collection(db, "scorecast24_predictions"));
    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();

    if (data.round !== currentRound) {
  return;
}

      let totalPoints = 0;
      let hasScoredFixture = false;

      if (data.predictions && Array.isArray(data.predictions)) {
        data.predictions.forEach((prediction) => {
        const fixture = fixtures.find(f => f.id === prediction.fixtureId);

          if (fixture) {
            const points = calculatePoints(prediction, fixture);

            if (points !== null) {
              totalPoints += points;
              hasScoredFixture = true;
            }
          }
        });
      }

      rows.push({
        username: data.username || "?????",
        points: totalPoints,
        status: hasScoredFixture ? `${totalPoints} pts` : "Pending"
      });
    });

    if (rows.length === 0) {
      homeLeaderboardPreview.innerHTML = `
        <div class="preview-row">
          <span>No entries yet</span>
          <span class="preview-points">Pending</span>
        </div>
      `;
      return;
    }

    rows.sort((a, b) => b.points - a.points);

    homeLeaderboardPreview.innerHTML = "";

    rows.slice(0, 3).forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "preview-row";

      div.innerHTML = `
        <span>${index + 1}. ${row.username}</span>
        <span class="preview-points">${row.status}</span>
      `;

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

function renderHomeFixturesPreview() {
  if (!homeFixturesPreview) return;

  homeFixturesPreview.innerHTML = "";

  const latestResults = fixtures
    .filter(fixture => fixture.homeScore !== null && fixture.awayScore !== null)
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

    div.innerHTML = `
      <span>${fixture.home} ${fixture.homeScore}-${fixture.awayScore} ${fixture.away}</span>
      <span>${index === 0 ? "Latest" : "›"}</span>
    `;

    homeFixturesPreview.appendChild(div);
  });
}

/* =========================
   START
========================= */
const menuToggle = document.getElementById("menuToggle");
const dropdownMenu = document.getElementById("dropdownMenu");

if (menuToggle && dropdownMenu) {
  menuToggle.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (
      !menuToggle.contains(e.target) &&
      !dropdownMenu.contains(e.target)
    ) {
      dropdownMenu.classList.add("hidden");
    }
  });
}


/* =========================
   WEEK ONE COUNTDOWN
========================= */

function updateWeekOneCountdown() {
  const countdownBox = document.getElementById("weekOneCountdown");

  if (!countdownBox) return;

  const timeLeft = predictionsDeadline.getTime() - Date.now();

  if (timeLeft <= 0) {
    countdownBox.innerHTML =
      "<strong>English League Week One predictions are now closed.</strong>";

    if (startGameBtn) {
      startGameBtn.disabled = true;
      startGameBtn.textContent = "Predictions Closed";
    }

    if (submitPredictionsBtn) {
      submitPredictionsBtn.disabled = true;
    }

    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft / (1000 * 60 * 60)) % 24
  );
  const minutes = Math.floor(
    (timeLeft / (1000 * 60)) % 60
  );
  const seconds = Math.floor(
    (timeLeft / 1000) % 60
  );

  countdownBox.innerHTML = `
    Predictions close in
    <strong>${days}d ${hours}h ${minutes}m ${seconds}s</strong>
  `;
}

updateWeekOneCountdown();
setInterval(updateWeekOneCountdown, 1000);


/* =========================
   START
========================= */

showHome();

renderHomeLeaderboardPreview();
renderHomeFixturesPreview();

setInterval(renderHomeLeaderboardPreview, 10000);
setInterval(renderHomeFixturesPreview, 1000);

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");

  if (installBtn) {
    installBtn.style.display = "block";

    installBtn.addEventListener("click", async () => {
      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      installBtn.style.display = "none";
    });
  }
});
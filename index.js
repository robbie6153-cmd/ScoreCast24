import { db } from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

/* =========================
   ROUND ONE FIXTURES
========================= */

const fixtures = [
  { id: "1", date: "Thu 11 Jun 2026", group: "Group A", home: "Mexico", away: "South Africa", venue: "Mexico City Stadium", homeScore: null, awayScore: null },
  { id: "2", date: "Thu 11 Jun 2026", group: "Group A", home: "Korea Republic", away: "Czechia", venue: "Estadio Guadalajara", homeScore: null, awayScore: null },

  { id: "3", date: "Fri 12 Jun 2026", group: "Group B", home: "Canada", away: "Bosnia and Herzegovina", venue: "Toronto Stadium", homeScore: null, awayScore: null },
  { id: "4", date: "Fri 12 Jun 2026", group: "Group D", home: "USA", away: "Paraguay", venue: "Los Angeles Stadium", homeScore: null, awayScore: null },

  { id: "5", date: "Sat 13 Jun 2026", group: "Group C", home: "Haiti", away: "Scotland", venue: "Boston Stadium", homeScore: null, awayScore: null },
  { id: "6", date: "Sat 13 Jun 2026", group: "Group D", home: "Australia", away: "Türkiye", venue: "BC Place Vancouver", homeScore: null, awayScore: null },
  { id: "7", date: "Sat 13 Jun 2026", group: "Group C", home: "Brazil", away: "Morocco", venue: "New York New Jersey Stadium", homeScore: null, awayScore: null },
  { id: "8", date: "Sat 13 Jun 2026", group: "Group B", home: "Qatar", away: "Switzerland", venue: "San Francisco Bay Area Stadium", homeScore: null, awayScore: null },

  { id: "9", date: "Sun 14 Jun 2026", group: "Group E", home: "Côte d'Ivoire", away: "Ecuador", venue: "Philadelphia Stadium", homeScore: null, awayScore: null },
  { id: "10", date: "Sun 14 Jun 2026", group: "Group E", home: "Germany", away: "Curaçao", venue: "Houston Stadium", homeScore: null, awayScore: null },
  { id: "11", date: "Sun 14 Jun 2026", group: "Group F", home: "Netherlands", away: "Japan", venue: "Dallas Stadium", homeScore: null, awayScore: null },
  { id: "12", date: "Sun 14 Jun 2026", group: "Group F", home: "Sweden", away: "Tunisia", venue: "Estadio Monterrey", homeScore: null, awayScore: null },

  { id: "13", date: "Mon 15 Jun 2026", group: "Group H", home: "Saudi Arabia", away: "Uruguay", venue: "Miami Stadium", homeScore: null, awayScore: null },
  { id: "14", date: "Mon 15 Jun 2026", group: "Group H", home: "Spain", away: "Cabo Verde", venue: "Atlanta Stadium", homeScore: null, awayScore: null },
  { id: "15", date: "Mon 15 Jun 2026", group: "Group G", home: "IR Iran", away: "New Zealand", venue: "Los Angeles Stadium", homeScore: null, awayScore: null },
  { id: "16", date: "Mon 15 Jun 2026", group: "Group G", home: "Belgium", away: "Egypt", venue: "Seattle Stadium", homeScore: null, awayScore: null },

  { id: "17", date: "Tue 16 Jun 2026", group: "Group I", home: "France", away: "Senegal", venue: "New York New Jersey Stadium", homeScore: null, awayScore: null },
  { id: "18", date: "Tue 16 Jun 2026", group: "Group I", home: "Iraq", away: "Norway", venue: "Boston Stadium", homeScore: null, awayScore: null },
  { id: "19", date: "Tue 16 Jun 2026", group: "Group J", home: "Argentina", away: "Algeria", venue: "Kansas City Stadium", homeScore: null, awayScore: null },
  { id: "20", date: "Tue 16 Jun 2026", group: "Group J", home: "Austria", away: "Jordan", venue: "San Francisco Bay Area Stadium", homeScore: null, awayScore: null },

  { id: "21", date: "Wed 17 Jun 2026", group: "Group L", home: "Ghana", away: "Panama", venue: "Toronto Stadium", homeScore: null, awayScore: null },
  { id: "22", date: "Wed 17 Jun 2026", group: "Group L", home: "England", away: "Croatia", venue: "Dallas Stadium", homeScore: null, awayScore: null },
  { id: "23", date: "Wed 17 Jun 2026", group: "Group K", home: "Portugal", away: "Congo DR", venue: "Houston Stadium", homeScore: null, awayScore: null },
  { id: "24", date: "Wed 17 Jun 2026", group: "Group K", home: "Uzbekistan", away: "Colombia", venue: "Mexico City Stadium", homeScore: null, awayScore: null }
];

/* =========================
   PAGE ELEMENTS
========================= */

const homePage = document.getElementById("homePage");
const predictionsPage = document.getElementById("predictionsPage");
const leaderboardPage = document.getElementById("leaderboardPage");

const startGameBtn = document.getElementById("startGameBtn");
const backHomeBtn = document.getElementById("backHomeBtn");
const backToPredictionsBtn = document.getElementById("backToPredictionsBtn");

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

  const usernameBox = document.createElement("div");
  usernameBox.className = "username-box";
  usernameBox.innerHTML = `
    <label>Your username</label>
    <input id="usernameInput" value="${username || ""}" placeholder="Enter username">
  `;
  fixturesContainer.appendChild(usernameBox);

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
        ${fixture.date} · ${fixture.group} · ${fixture.venue}
      </div>
    `;

    fixturesContainer.appendChild(card);
  });
}

/* =========================
   SUBMIT PREDICTIONS
========================= */

async function hasAlreadySubmitted(savedUsername) {
  const predictionRef = doc(db, "scorecast24_predictions", cleanUsername(savedUsername));
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

submitPredictionsBtn.addEventListener("click", async () => {
  const usernameInput = document.getElementById("usernameInput");
  username = usernameInput.value.trim();

  if (username.length < 2) {
    alert("Please enter a username.");
    return;
  }

  localStorage.setItem("scorecast24Username", username);

  try {
    const alreadySubmitted = await hasAlreadySubmitted(username);

    if (alreadySubmitted) {
      alert("You have already submitted predictions. You cannot change them.");
      await renderLeaderboard();
      showLeaderboard();
      return;
    }

    const predictions = getPredictionsFromPage();
    if (!predictions) return;

    confirmModal.classList.remove("hidden");
  } catch (error) {
    console.error("Submit check failed:", error);
    alert("There was a problem checking your submission. Please try again.");
  }
});

cancelSubmitBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

confirmSubmitBtn.addEventListener("click", async () => {
  confirmModal.classList.add("hidden");

  const predictions = getPredictionsFromPage();
  if (!predictions) return;

  try {
    const predictionRef = doc(db, "scorecast24_predictions", cleanUsername(username));

    await setDoc(predictionRef, {
      username,
      predictions,
      round: "Round One",
      submittedAt: serverTimestamp(),
      status: "Score pending match results",
      points: null
    });

    alert("Predictions submitted!");

    await renderLeaderboard();
    showLeaderboard();
  } catch (error) {
    console.error("Submission failed:", error);
    alert("Submission failed. Check Firestore rules or console errors.");
  }
});

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
        username: data.username,
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
        <div>${row.username}</div>
        <div class="leaderboard-points">${row.status}</div>
      `;

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

startGameBtn.addEventListener("click", async () => {
  const okay = askForUsername();
  if (!okay) return;

  renderFixtures();
  showPredictions();

  try {
    const alreadySubmitted = await hasAlreadySubmitted(username);

    if (alreadySubmitted) {
      alert("You have already submitted predictions. Showing leaderboard.");
      await renderLeaderboard();
      showLeaderboard();
    }
  } catch (error) {
    console.error("Firestore check failed:", error);
    alert("Predictions page loaded, but Firestore connection needs checking.");
  }
});

backHomeBtn.addEventListener("click", showHome);

backToPredictionsBtn.addEventListener("click", async () => {
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
/* =========================
   HOME PAGE PREVIEWS
========================= */

const homeLeaderboardPreview = document.getElementById("homeLeaderboardPreview");
const homeFixturesPreview = document.getElementById("homeFixturesPreview");

async function renderHomeLeaderboardPreview() {
  if (!homeLeaderboardPreview) return;

  homeLeaderboardPreview.innerHTML = "Loading standings...";

  try {
    const predictionsSnap = await getDocs(collection(db, "scorecast24_predictions"));
    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      rows.push({
        username: data.username || "?????",
        points: data.points
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

    rows.sort((a, b) => (b.points || 0) - (a.points || 0));

    homeLeaderboardPreview.innerHTML = "";

    rows.slice(0, 3).forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "preview-row";

      div.innerHTML = `
        <span>${index + 1}. ${row.username}</span>
        <span class="preview-points">
          ${
            row.points === null || row.points === undefined
              ? "Pending"
              : `${row.points} pts`
          }
        </span>
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

  const latestResults = fixtures.filter(
    fixture => fixture.homeScore !== null && fixture.awayScore !== null
  );

  homeFixturesPreview.innerHTML = "";

  if (latestResults.length > 0) {
    latestResults.slice(-2).reverse().forEach((fixture) => {
      const div = document.createElement("div");
      div.className = "preview-row";

      div.innerHTML = `
        <span>${fixture.home} ${fixture.homeScore}-${fixture.awayScore} ${fixture.away}</span>
        <span>›</span>
      `;

      homeFixturesPreview.appendChild(div);
    });

    return;
  }

  fixtures.slice(0, 2).forEach((fixture) => {
    const div = document.createElement("div");
    div.className = "preview-row";

    div.innerHTML = `
      <span>${fixture.home} v ${fixture.away}</span>
      <span>›</span>
    `;

    homeFixturesPreview.appendChild(div);
  });
}
/* =========================
   START
========================= */

showHome();
renderHomeLeaderboardPreview();
renderHomeFixturesPreview();
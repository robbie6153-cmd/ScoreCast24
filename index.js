import { db } from "./firebase.js?v=7";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* =========================
   ROUND ONE FIXTURES
========================= */
const predictionsDeadline = new Date("2026-06-11T19:00:00Z");

function predictionsAreClosed() {
  return new Date() >= predictionsDeadline;
}
const roundOneFixtures = [
  { id: "1", date: "Thu 11 Jun 2026", group: "Group A", home: "Mexico", away: "South Africa", venue: "Mexico City Stadium", homeScore: 2, awayScore: 0 },
  { id: "2", date: "Thu 11 Jun 2026", group: "Group A", home: "Korea Republic", away: "Czechia", venue: "Estadio Guadalajara", homeScore: 2, awayScore: 1 },

  { id: "3", date: "Fri 12 Jun 2026", group: "Group B", home: "Canada", away: "Bosnia and Herzegovina", venue: "Toronto Stadium", homeScore: 1, awayScore: 1 },
  { id: "4", date: "Fri 12 Jun 2026", group: "Group D", home: "USA", away: "Paraguay", venue: "Los Angeles Stadium", homeScore: 4, awayScore: 1 },

  { id: "5", date: "Sat 13 Jun 2026", group: "Group C", home: "Haiti", away: "Scotland", venue: "Boston Stadium", homeScore: 0, awayScore: 1 },
  { id: "6", date: "Sat 13 Jun 2026", group: "Group D", home: "Australia", away: "Türkiye", venue: "BC Place Vancouver", homeScore: 2, awayScore: 0 },
  { id: "7", date: "Sat 13 Jun 2026", group: "Group C", home: "Brazil", away: "Morocco", venue: "New York New Jersey Stadium", homeScore: 1, awayScore: 1 },
  { id: "8", date: "Sat 13 Jun 2026", group: "Group B", home: "Qatar", away: "Switzerland", venue: "San Francisco Bay Area Stadium", homeScore: 1, awayScore: 1 },

  { id: "9", date: "Sun 14 Jun 2026", group: "Group E", home: "Côte d'Ivoire", away: "Ecuador", venue: "Philadelphia Stadium", homeScore: 1, awayScore: 0 },
  { id: "10", date: "Sun 14 Jun 2026", group: "Group E", home: "Germany", away: "Curaçao", venue: "Houston Stadium", homeScore: 7, awayScore: 1 },
  { id: "11", date: "Sun 14 Jun 2026", group: "Group F", home: "Netherlands", away: "Japan", venue: "Dallas Stadium", homeScore: 2, awayScore: 2 },
  { id: "12", date: "Sun 14 Jun 2026", group: "Group F", home: "Sweden", away: "Tunisia", venue: "Estadio Monterrey", homeScore: 5, awayScore: 1 },

  { id: "13", date: "Mon 15 Jun 2026", group: "Group H", home: "Saudi Arabia", away: "Uruguay", venue: "Miami Stadium", homeScore: 1, awayScore: 1 },
  { id: "14", date: "Mon 15 Jun 2026", group: "Group H", home: "Spain", away: "Cabo Verde", venue: "Atlanta Stadium", homeScore: 0, awayScore: 0 },
  { id: "15", date: "Mon 15 Jun 2026", group: "Group G", home: "IR Iran", away: "New Zealand", venue: "Los Angeles Stadium", homeScore: 2, awayScore: 2 },
  { id: "16", date: "Mon 15 Jun 2026", group: "Group G", home: "Belgium", away: "Egypt", venue: "Seattle Stadium", homeScore: 1, awayScore: 1 },

  { id: "17", date: "Tue 16 Jun 2026", group: "Group I", home: "France", away: "Senegal", venue: "New York New Jersey Stadium", homeScore: 3, awayScore: 1 },
  { id: "18", date: "Tue 16 Jun 2026", group: "Group I", home: "Iraq", away: "Norway", venue: "Boston Stadium", homeScore: 1, awayScore: 4 },
  { id: "19", date: "Tue 16 Jun 2026", group: "Group J", home: "Argentina", away: "Algeria", venue: "Kansas City Stadium", homeScore: 3, awayScore: 0 },
  { id: "20", date: "Tue 16 Jun 2026", group: "Group J", home: "Austria", away: "Jordan", venue: "San Francisco Bay Area Stadium", homeScore: 3, awayScore: 1 },

  { id: "21", date: "Wed 17 Jun 2026", group: "Group L", home: "Ghana", away: "Panama", venue: "Toronto Stadium", homeScore: 1, awayScore: 0 },
  { id: "22", date: "Wed 17 Jun 2026", group: "Group L", home: "England", away: "Croatia", venue: "Dallas Stadium", homeScore: 4, awayScore: 2 },
  { id: "23", date: "Wed 17 Jun 2026", group: "Group K", home: "Portugal", away: "Congo DR", venue: "Houston Stadium", homeScore: 1, awayScore: 1 },
  { id: "24", date: "Wed 17 Jun 2026", group: "Group K", home: "Uzbekistan", away: "Colombia", venue: "Mexico City Stadium", homeScore: 1, awayScore: 3 }
];

const roundTwoFixtures = [
  { id: "25", date: "Thu 18 Jun 2026, 17:00", group: "Group A", home: "Czechia", away: "South Africa", venue: "Mercedes-Benz Stadium, Atlanta", homeScore: 1, awayScore: 1 },
  { id: "26", date: "Thu 18 Jun 2026, 20:00", group: "Group B", home: "Switzerland", away: "Bosnia & Herzegovina", venue: "SoFi Stadium, Los Angeles", homeScore: 4, awayScore: 1 },
  { id: "27", date: "Thu 18 Jun 2026, 23:00", group: "Group B", home: "Canada", away: "Qatar", venue: "BC Place, Vancouver", homeScore: 6, awayScore: 0 },
  { id: "28", date: "Fri 19 Jun 2026, 02:00", group: "Group A", home: "Mexico", away: "South Korea", venue: "Estadio Akron, Guadalajara", homeScore: 1, awayScore: 0 },

  { id: "29", date: "Fri 19 Jun 2026, 20:00", group: "Group D", home: "USA", away: "Australia", venue: "Lumen Field, Seattle", homeScore: 2, awayScore: 0 },
  { id: "30", date: "Fri 19 Jun 2026, 23:00", group: "Group C", home: "Scotland", away: "Morocco", venue: "Gillette Stadium, Boston", homeScore: 0, awayScore: 1 },
  { id: "31", date: "Sat 20 Jun 2026, 01:30", group: "Group C", home: "Brazil", away: "Haiti", venue: "Lincoln Financial Field, Philadelphia", homeScore: 3, awayScore: 0 },
  { id: "32", date: "Sat 20 Jun 2026, 04:00", group: "Group D", home: "Türkiye", away: "Paraguay", venue: "Levi's Stadium, San Francisco Bay Area", homeScore: 0, awayScore: 1 },

  { id: "33", date: "Sat 20 Jun 2026, 18:00", group: "Group F", home: "Netherlands", away: "Sweden", venue: "NRG Stadium, Houston", homeScore: null, awayScore: null },
  { id: "34", date: "Sat 20 Jun 2026, 21:00", group: "Group E", home: "Germany", away: "Ivory Coast", venue: "BMO Field, Toronto", homeScore: null, awayScore: null },
  { id: "35", date: "Sun 21 Jun 2026, 01:00", group: "Group E", home: "Ecuador", away: "Curaçao", venue: "Arrowhead Stadium, Kansas City", homeScore: null, awayScore: null },
  { id: "36", date: "Sun 21 Jun 2026, 05:00", group: "Group F", home: "Tunisia", away: "Japan", venue: "Estadio BBVA, Monterrey", homeScore: null, awayScore: null },

  { id: "37", date: "Sun 21 Jun 2026, 17:00", group: "Group H", home: "Spain", away: "Saudi Arabia", venue: "Atlanta Stadium, Atlanta", homeScore: null, awayScore: null },
  { id: "38", date: "Sun 21 Jun 2026, 20:00", group: "Group G", home: "Belgium", away: "IR Iran", venue: "SoFi Stadium, Los Angeles", homeScore: null, awayScore: null },
  { id: "39", date: "Sun 21 Jun 2026, 23:00", group: "Group H", home: "Uruguay", away: "Cape Verde", venue: "Hard Rock Stadium, Miami", homeScore: null, awayScore: null },
  { id: "40", date: "Mon 22 Jun 2026, 02:00", group: "Group G", home: "New Zealand", away: "Egypt", venue: "BC Place, Vancouver", homeScore: null, awayScore: null },

  { id: "41", date: "Mon 22 Jun 2026, 18:00", group: "Group J", home: "Argentina", away: "Austria", venue: "AT&T Stadium, Dallas", homeScore: null, awayScore: null },
  { id: "42", date: "Mon 22 Jun 2026, 22:00", group: "Group I", home: "France", away: "Iraq", venue: "Lincoln Financial Field, Philadelphia", homeScore: null, awayScore: null },
  { id: "43", date: "Tue 23 Jun 2026, 01:00", group: "Group I", home: "Norway", away: "Senegal", venue: "MetLife Stadium, New York/New Jersey", homeScore: null, awayScore: null },
  { id: "44", date: "Tue 23 Jun 2026, 04:00", group: "Group J", home: "Jordan", away: "Algeria", venue: "Levi's Stadium, San Francisco Bay Area", homeScore: null, awayScore: null },

  { id: "45", date: "Tue 23 Jun 2026, 18:00", group: "Group K", home: "Portugal", away: "Uzbekistan", venue: "NRG Stadium, Houston", homeScore: null, awayScore: null },
  { id: "46", date: "Tue 23 Jun 2026, 21:00", group: "Group L", home: "England", away: "Ghana", venue: "Gillette Stadium, Boston", homeScore: null, awayScore: null },
  { id: "47", date: "Wed 24 Jun 2026, 00:00", group: "Group L", home: "Panama", away: "Croatia", venue: "BMO Field, Toronto", homeScore: null, awayScore: null },
  { id: "48", date: "Wed 24 Jun 2026, 03:00", group: "Group K", home: "Colombia", away: "DR Congo", venue: "Estadio Akron, Guadalajara", homeScore: null, awayScore: null }
];

const roundThreeFixtures = [

  { id: "49", date: "Wed 24 Jun 2026, 20:00", group: "Group B", home: "Switzerland", away: "Canada", venue: "", homeScore: 4, awayScore: 1 },
  { id: "50", date: "Wed 24 Jun 2026, 20:00", group: "Group B", home: "Bosnia and Herzegovina", away: "Qatar", venue: "", homeScore: null, awayScore: null },

  { id: "51", date: "Wed 24 Jun 2026, 23:00", group: "Group C", home: "Morocco", away: "Haiti", venue: "", homeScore: null, awayScore: null },
  { id: "52", date: "Wed 24 Jun 2026, 23:00", group: "Group C", home: "Scotland", away: "Brazil", venue: "", homeScore: null, awayScore: null },

  { id: "53", date: "Thu 25 Jun 2026, 02:00", group: "Group A", home: "South Africa", away: "South Korea", venue: "", homeScore: null, awayScore: null },
  { id: "54", date: "Thu 25 Jun 2026, 02:00", group: "Group A", home: "Czech Republic", away: "Mexico", venue: "", homeScore: null, awayScore: null },

  { id: "55", date: "Thu 25 Jun 2026, 21:00", group: "Group E", home: "Curacao", away: "Côte d'Ivoire", venue: "", homeScore: null, awayScore: null },
  { id: "56", date: "Thu 25 Jun 2026, 21:00", group: "Group E", home: "Ecuador", away: "Germany", venue: "", homeScore: null, awayScore: null },

  { id: "57", date: "Fri 26 Jun 2026, 00:00", group: "Group F", home: "Tunisia", away: "Netherlands", venue: "", homeScore: null, awayScore: null },
  { id: "58", date: "Fri 26 Jun 2026, 00:00", group: "Group F", home: "Japan", away: "Sweden", venue: "", homeScore: null, awayScore: null },

  { id: "59", date: "Fri 26 Jun 2026, 03:00", group: "Group D", home: "Turkey", away: "United States", venue: "", homeScore: null, awayScore: null },
  { id: "60", date: "Fri 26 Jun 2026, 03:00", group: "Group D", home: "Paraguay", away: "Australia", venue: "", homeScore: null, awayScore: null },

  { id: "61", date: "Fri 26 Jun 2026, 20:00", group: "Group I", home: "Norway", away: "France", venue: "", homeScore: null, awayScore: null },
  { id: "62", date: "Fri 26 Jun 2026, 20:00", group: "Group I", home: "Senegal", away: "Iraq", venue: "", homeScore: null, awayScore: null },

  { id: "63", date: "Sat 27 Jun 2026, 01:00", group: "Group H", home: "Cape Verde", away: "Saudi Arabia", venue: "", homeScore: null, awayScore: null },
  { id: "64", date: "Sat 27 Jun 2026, 01:00", group: "Group H", home: "Uruguay", away: "Spain", venue: "", homeScore: null, awayScore: null },

  { id: "65", date: "Sat 27 Jun 2026, 04:00", group: "Group G", home: "New Zealand", away: "Belgium", venue: "", homeScore: null, awayScore: null },
  { id: "66", date: "Sat 27 Jun 2026, 04:00", group: "Group G", home: "Egypt", away: "Iran", venue: "", homeScore: null, awayScore: null },

  { id: "67", date: "Sat 27 Jun 2026, 22:00", group: "Group L", home: "Panama", away: "England", venue: "", homeScore: null, awayScore: null },
  { id: "68", date: "Sat 27 Jun 2026, 22:00", group: "Group L", home: "Croatia", away: "Ghana", venue: "", homeScore: null, awayScore: null }

];
const fixtures = roundThreeFixtures;
const currentRound = "Round Three";
/* =========================
   PAGE ELEMENTS
========================= */

const homePage = document.getElementById("homePage");
const predictionsPage = document.getElementById("predictionsPage");
const leaderboardPage = document.getElementById("leaderboardPage");

const startGameBtn = document.getElementById("startGameBtn");
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


submitPredictionsBtn.addEventListener("click", async () => {
  alert("Submit button clicked");

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
      alert("You have already submitted predictions for this round. You cannot change them.");
      await renderLeaderboard();
      showLeaderboard();
      return;
    }

    const predictions = getPredictionsFromPage();
    if (!predictions) return;

    confirmModal.classList.remove("hidden");
  } catch (error) {
    console.error("Submit check failed:", error);
    alert("Submit check failed:\n\n" + error.message);
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
leaderboardHomeBtn.addEventListener("click", showHome);
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

      if (data.round !== "Round Two") {
        return;
      }

      let totalPoints = 0;
      let hasScoredFixture = false;

      if (data.predictions && Array.isArray(data.predictions)) {
        data.predictions.forEach((prediction) => {
        const fixture = roundTwoFixtures.find(f => f.id === prediction.fixtureId);

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

  const latestResults = [...roundOneFixtures, ...roundTwoFixtures]
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
   ROUND TWO COUNTDOWN
========================= */

const roundThreeDeadline = new Date("2026-06-24T20:00:00+01:00");

function updateRoundThreeCountdown() {
  const countdownBox = document.getElementById("roundThreeCountdown");

  if (!countdownBox) return;

  const now = new Date();
 const timeLeft = roundThreeDeadline - now;

  if (timeLeft <= 0) {
    countdownBox.innerHTML = "Round Three predictions are now closed.";
    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  countdownBox.innerHTML =
    `Round Three closes in: <strong>${days}d ${hours}h ${minutes}m ${seconds}s</strong>`;
}

setInterval(updateRoundThreeCountdown, 1000);

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
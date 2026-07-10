import { auth, db } from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const ADMIN_EMAIL = "robbie6153@icloud.com";

const teams = [
  "Arsenal",
  "Aston Villa",
  "Bournemouth",
  "Brentford",
  "Brighton & Hove Albion",
  "Chelsea",
  "Coventry City",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Hull City",
  "Ipswich Town",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sunderland",
  "Tottenham Hotspur"
];

const currentPremierLeagueTable = [
  "Liverpool",
  "Manchester City",
  "Arsenal",
  "Chelsea",
  "Newcastle United",
  "Tottenham Hotspur",
  "Manchester United",
  "Aston Villa",
  "Brighton & Hove Albion",
  "Crystal Palace",
  "Bournemouth",
  "Brentford",
  "Sunderlamd",
  "Everton",
  "Nottingham Forest",
  "Leeds United",
  "Fulham",
  "Ipswich Town",
  "Coventry City",
  "Hull City"
];

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const tableContainer = document.getElementById("tableContainer");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

let existingPrediction = null;

function getUsername() {
  return (
    localStorage.getItem("scorecast24Username") ||
    localStorage.getItem("username") ||
    ""
  );
}

function getCleanUsername() {
  return getUsername().trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function getUserEmail() {
  return auth.currentUser?.email || localStorage.getItem("scorecast24Email") || "";
}

startBtn.addEventListener("click", async () => {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  if (!getCleanUsername()) {
    tableContainer.innerHTML = `
      <p class="message">
        Please log in or create a username before entering the Premier League predictor.
      </p>
    `;
    submitBtn.style.display = "none";
    return;
  }

  await loadExistingPrediction();
  buildTable();
});

async function loadExistingPrediction() {
  try {
    const predictionRef = doc(db, "premier_league_predictions", getCleanUsername());
    const predictionSnap = await getDoc(predictionRef);

    if (predictionSnap.exists()) {
      existingPrediction = predictionSnap.data().prediction || null;
    }
  } catch (error) {
    console.error("Could not load prediction:", error);
  }
}

function buildTable() {
  tableContainer.innerHTML = "";

  if (existingPrediction) {
    showExistingPrediction();
    submitBtn.style.display = "none";
    return;
  }

  for (let i = 1; i <= 20; i++) {
    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <div class="position">${i}</div>

      <select class="team-select" data-position="${i}">
        <option value="">Select team</option>
        ${teams.map(team => `<option value="${team}">${team}</option>`).join("")}
      </select>

      <input type="checkbox" class="confirm-box">
    `;

    tableContainer.appendChild(row);
  }

  document.querySelectorAll(".team-select, .confirm-box").forEach(item => {
    item.addEventListener("change", updateForm);
  });
}

function showExistingPrediction() {
  const matches = countMatchingPositions(existingPrediction);

  tableContainer.innerHTML = `
    <div class="prediction-summary">
      <h2>My Premier Prediction</h2>
      ${renderPredictionTable(existingPrediction)}

      <h3>You currently have ${matches} matching positions</h3>

      <h2>Current Premier League Table</h2>
      ${renderCurrentTable()}
    </div>
  `;
}

function renderPredictionTable(prediction) {
  return `
    <table class="league-table prediction-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Team</th>
        </tr>
      </thead>

      <tbody>
        ${prediction.map(item => {
          const currentTeam = currentPremierLeagueTable[item.position - 1];
          const isMatch = item.team === currentTeam;

          return `
            <tr class="${isMatch ? "matched-position" : ""}">
              <td>${item.position}</td>
              <td>${isMatch ? "✅ " : ""}${item.team}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderCurrentTable() {
  return `
    <table class="league-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>Pts</th>
        </tr>
      </thead>

      <tbody>
        ${currentPremierLeagueTable.map((team, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${team}</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function countMatchingPositions(prediction) {
  let matches = 0;

  prediction.forEach(item => {
    const currentTeam = currentPremierLeagueTable[item.position - 1];

    if (item.team === currentTeam) {
      matches++;
    }
  });

  return matches;
}

function updateForm() {
  const selects = Array.from(document.querySelectorAll(".team-select"));
  const checkboxes = Array.from(document.querySelectorAll(".confirm-box"));

  const selectedTeams = selects.map(select => select.value).filter(Boolean);

  selects.forEach(select => {
    const currentValue = select.value;

    Array.from(select.options).forEach(option => {
      if (option.value === "") return;

      option.disabled =
        selectedTeams.includes(option.value) &&
        option.value !== currentValue;
    });
  });

  const allTeamsSelected = selectedTeams.length === 20;
  const noDuplicates = new Set(selectedTeams).size === selectedTeams.length;
  const allChecked = checkboxes.every(box => box.checked);

  if (allTeamsSelected && noDuplicates && allChecked) {
    submitBtn.disabled = false;
    submitBtn.classList.add("ready");
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.remove("ready");
  }
}

async function sendAdminPredictionReport(reason = "Premier League prediction update") {
  try {
    const predictionsSnap = await getDocs(collection(db, "premier_league_predictions"));

    let exactMatches = [];
    let bestMatches = -1;
    let bestUsers = [];
    let totalEntries = 0;

    predictionsSnap.forEach(docSnap => {
      const data = docSnap.data();
      const prediction = data.prediction || [];

      if (!prediction.length) return;

      totalEntries++;

      const matches = countMatchingPositions(prediction);

      const userDetails = {
        username: data.username || "Unknown username",
        email: data.email || "No email saved",
        matches
      };

      if (matches === 20) {
        exactMatches.push(userDetails);
      }

      if (matches > bestMatches) {
        bestMatches = matches;
        bestUsers = [userDetails];
      } else if (matches === bestMatches) {
        bestUsers.push(userDetails);
      }
    });

    const exactText = exactMatches.length
      ? exactMatches.map(user => `${user.username} - ${user.email}`).join("\n")
      : "None";

    const bestText = bestUsers.length
      ? bestUsers.map(user => `${user.username} - ${user.email} - ${user.matches}/20`).join("\n")
      : "None";

    const emailText = `
${reason}

Total entries: ${totalEntries}

Exact 20/20 matches: ${exactMatches.length}

Exact match users:
${exactText}

Closest prediction:
${bestText}
    `.trim();

    await addDoc(collection(db, "mail"), {
      to: [ADMIN_EMAIL],
      message: {
        subject: "ScoreCast24 Premier League Prediction Report",
        text: emailText
      },
      createdAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Admin email report failed:", error);
  }
}

submitBtn.addEventListener("click", async () => {
  const sure = confirm("Are you sure you want to submit this as your final prediction?");

  if (!sure) return;

  const prediction = Array.from(document.querySelectorAll(".team-select")).map(select => {
    return {
      position: Number(select.dataset.position),
      team: select.value
    };
  });

  try {
    const username = getUsername();
    const cleanUsername = getCleanUsername();
    const email = getUserEmail();

    await setDoc(doc(db, "premier_league_predictions", cleanUsername), {
      username,
      cleanUsername,
      email,
      prediction,
      submittedAt: serverTimestamp()
    });

    localStorage.setItem("premierLeaguePrediction", JSON.stringify(prediction));

    existingPrediction = prediction;

    message.textContent = "Prediction submitted and saved.";
    submitBtn.disabled = true;
    submitBtn.classList.remove("ready");
    submitBtn.style.display = "none";

    showExistingPrediction();

    await sendAdminPredictionReport("A new Premier League prediction has been submitted.");

  } catch (error) {
    console.error("Save error:", error);
    message.textContent = "Could not save prediction: " + error.message;
  }
});
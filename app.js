import { db } from "./firebase.js?v=107";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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
  "Arsenal",
  "Manchester City",
  "Liverpool",
  "Chelsea",
  "Newcastle United",
  "Tottenham Hotspur",
  "Manchester United",
  "Aston Villa",
  "Brighton & Hove Albion",
  "Crystal Palace",
  "Bournemouth",
  "Brentford",
  "Fulham",
  "Everton",
  "Nottingham Forest",
  "Leeds United",
  "Sunderland",
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
      ${renderTable(existingPrediction)}

      <h3>You currently have ${matches} matching positions</h3>

      <h2>Current Premier League Table</h2>
      ${renderCurrentTable()}
    </div>
  `;
}

function renderTable(prediction) {
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
        ${prediction.map(item => {
          const currentTeam = currentPremierLeagueTable[item.position - 1];
          const isMatch = item.team === currentTeam;

          return `
            <tr class="${isMatch ? "matched-position" : ""}">
              <td>${item.position}</td>
              <td>${isMatch ? "✅ " : ""}${item.team}</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
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

await setDoc(doc(db, "premier_league_predictions", cleanUsername), {
  username: username,
  cleanUsername: cleanUsername,
  prediction: prediction,
  submittedAt: serverTimestamp()
});

    localStorage.setItem("premierLeaguePrediction", JSON.stringify(prediction));

    existingPrediction = prediction;

    message.textContent = "Prediction submitted and saved.";
    submitBtn.disabled = true;
    submitBtn.classList.remove("ready");
    submitBtn.style.display = "none";

    showExistingPrediction();

  } catch (error) {
  console.error("Save error:", error);
  message.textContent = "Could not save prediction: " + error.message;
}
});
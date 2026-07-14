import { auth, db } from "./firebase.js?v=109";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-functions.js";

const functions = getFunctions(undefined, "europe-west1");

const createPremierLeagueCheckout =
  httpsCallable(functions, "createPremierLeagueCheckout");

const submitPremierLeaguePrediction =
  httpsCallable(functions, "submitPremierLeaguePrediction");

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
  "Sunderland",
  "Everton",
  "Nottingham Forest",
  "Leeds United",
  "Ipswich Town",
  "Fulham",
  "Coventry City",
  "Hull City"
];

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const homeBtn = document.getElementById("homeBtn");

const buyCreditHomeBtn =
  document.getElementById("buyCreditHomeBtn");

const tableContainer =
  document.getElementById("tableContainer");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

let existingPrediction = null;
let premierLeagueCredits = 0;

const creditPanel = document.createElement("div");
creditPanel.id = "creditPanel";
creditPanel.className = "credit-panel";
creditPanel.style.display = "none";

gameScreen.insertBefore(
  creditPanel,
  tableContainer
);

function getUsername() {
  return (
    localStorage.getItem("scorecast24Username") ||
    localStorage.getItem("username") ||
    ""
  );
}

function getCleanUsername() {
  return getUsername()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
}



function renderCreditPanel() {
  creditPanel.style.display = "block";

  if (!auth.currentUser) {
    creditPanel.innerHTML = "";
    return;
  }

  if (premierLeagueCredits > 0) {
    creditPanel.innerHTML = `
      <p>
        <strong>
          Premier League entry credits:
          ${premierLeagueCredits}
        </strong>
      </p>
    `;
  } else {
    creditPanel.innerHTML = `
      <p>
        <strong>
          Premier League entry credits: 0
        </strong>
      </p>

      <button
        type="button"
        id="buyCreditBtn"
        class="buy-credit-circle"
      >
        <span class="buy-title">BUY ENTRY</span>
        <span class="buy-price">£1</span>
      </button>
    `;

    const gameBuyButton =
      document.getElementById("buyCreditBtn");

   if (gameBuyButton) {
  gameBuyButton.addEventListener("click", () => {
    buyCredit(gameBuyButton);
  });
}
  }
}

async function buyCredit(button) {
  if (!button) return;

  const originalButtonContent = button.innerHTML;

  try {
    if (!auth.currentUser) {
      throw new Error(
        "You must be logged in before buying a credit."
      );
    }

    button.disabled = true;

    button.innerHTML = `
      <span class="buy-title">OPENING</span>
      <span class="buy-price">...</span>
    `;

    const result =
      await createPremierLeagueCheckout();

    if (!result.data?.url) {
      throw new Error(
        "Stripe did not return a payment page."
      );
    }

    window.location.href = result.data.url;
  } catch (error) {
    console.error("Checkout error:", error);

    const errorMessage =
      error.message ||
      "The payment page could not be opened.";

    message.textContent = errorMessage;

    /*
      The message element is hidden while the player
      is still on the home screen, so show an alert too.
    */
    if (!homeScreen.classList.contains("hidden")) {
      alert(errorMessage);
    }

    button.disabled = false;
    button.innerHTML = originalButtonContent;
  }
}
if (buyCreditHomeBtn) {
  buyCreditHomeBtn.addEventListener("click", () => {
    buyCredit(buyCreditHomeBtn);
  });
}

homeBtn.addEventListener("click", () => {
  window.location.href = "../index.html";
});

startBtn.addEventListener("click", async () => {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  const user = auth.currentUser;

  if (!user || !getCleanUsername()) {
    tableContainer.innerHTML = `
      <p class="message">
        Please log in or create a username before entering the Premier League predictor.
      </p>
    `;

    submitBtn.style.display = "none";
    creditPanel.style.display = "none";
    return;
  }

  message.textContent = "Loading your account...";

  await Promise.all([
    loadExistingPrediction(),
    loadCredits()
  ]);

  message.textContent = "";
  renderCreditPanel();
  buildTable();
});

async function loadCredits() {
  premierLeagueCredits = 0;

  const user = auth.currentUser;

  if (!user) return;

  try {
    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    if (userSnapshot.exists()) {
      premierLeagueCredits = Number(
        userSnapshot.data().premierLeagueCredits || 0
      );
    }
  } catch (error) {
    console.error("Could not load credits:", error);
  }
}

async function loadExistingPrediction() {
  existingPrediction = null;

  const user = auth.currentUser;

  if (!user) return;

  try {
    const predictionSnapshot = await getDoc(
      doc(db, "premier_league_predictions", user.uid)
    );

    if (predictionSnapshot.exists()) {
      existingPrediction =
        predictionSnapshot.data().prediction || null;
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

  submitBtn.style.display = "";

  for (let i = 1; i <= 20; i++) {
    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <div class="position">${i}</div>

      <select class="team-select" data-position="${i}">
        <option value="">Select team</option>
        ${teams
          .map(team => `<option value="${team}">${team}</option>`)
          .join("")}
      </select>

      <input type="checkbox" class="confirm-box">
    `;

    tableContainer.appendChild(row);
  }

  document
    .querySelectorAll(".team-select, .confirm-box")
    .forEach(item => {
      item.addEventListener("change", updateForm);
    });

  updateForm();
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
        ${prediction
          .map(item => {
            const currentTeam =
              currentPremierLeagueTable[item.position - 1];

            const isMatch = item.team === currentTeam;

            return `
              <tr class="${isMatch ? "matched-position" : ""}">
                <td>${item.position}</td>
                <td>${isMatch ? "✅ " : ""}${item.team}</td>
              </tr>
            `;
          })
          .join("")}
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
        ${currentPremierLeagueTable
          .map(
            (team, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${team}</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function countMatchingPositions(prediction) {
  let matches = 0;

  prediction.forEach(item => {
    const currentTeam =
      currentPremierLeagueTable[item.position - 1];

    if (item.team === currentTeam) {
      matches++;
    }
  });

  return matches;
}

function updateForm() {
  const selects = Array.from(
    document.querySelectorAll(".team-select")
  );

  const checkboxes = Array.from(
    document.querySelectorAll(".confirm-box")
  );

  const selectedTeams = selects
    .map(select => select.value)
    .filter(Boolean);

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
  const noDuplicates =
    new Set(selectedTeams).size === selectedTeams.length;

  const allChecked =
    checkboxes.length === 20 &&
    checkboxes.every(box => box.checked);

  const hasCredit = premierLeagueCredits >= 1;

  submitBtn.disabled = !(
    allTeamsSelected &&
    noDuplicates &&
    allChecked &&
    hasCredit
  );

  submitBtn.classList.toggle(
    "ready",
    !submitBtn.disabled
  );

  if (
    allTeamsSelected &&
    noDuplicates &&
    allChecked &&
    !hasCredit
  ) {
    message.textContent =
      "You need one Premier League entry credit before submitting.";
  } else if (
    message.textContent.includes("entry credit")
  ) {
    message.textContent = "";
  }
}

async function sendAdminPredictionReport(
  reason = "Premier League prediction update"
) {
  try {
    const predictionsSnapshot = await getDocs(
      collection(db, "premier_league_predictions")
    );

    let exactMatches = [];
    let bestMatches = -1;
    let bestUsers = [];
    let totalEntries = 0;

    predictionsSnapshot.forEach(documentSnapshot => {
      const data = documentSnapshot.data();
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
      ? exactMatches
          .map(user => `${user.username} - ${user.email}`)
          .join("\n")
      : "None";

    const bestText = bestUsers.length
      ? bestUsers
          .map(
            user =>
              `${user.username} - ${user.email} - ${user.matches}/20`
          )
          .join("\n")
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
        subject:
          "ScoreCast24 Premier League Prediction Report",
        text: emailText
      },
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Admin email report failed:", error);
  }
}

submitBtn.addEventListener("click", async () => {
  const sure = confirm(
    "Are you sure you want to use one credit and submit this as your final prediction?"
  );

  if (!sure) return;

  const prediction = Array.from(
    document.querySelectorAll(".team-select")
  ).map(select => ({
    position: Number(select.dataset.position),
    team: select.value
  }));

  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        "You must be logged in to submit a prediction."
      );
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    message.textContent = "Checking credit and saving prediction...";

    const result = await submitPremierLeaguePrediction({
      username: getUsername(),
      cleanUsername: getCleanUsername(),
      prediction
    });

    premierLeagueCredits =
      Number(result.data?.remainingCredits ?? 0);

    localStorage.setItem(
      "premierLeaguePrediction",
      JSON.stringify(prediction)
    );

    existingPrediction = prediction;

    message.textContent =
      "Prediction submitted. One credit has been used.";

    submitBtn.classList.remove("ready");
    submitBtn.style.display = "none";
    submitBtn.textContent = "Submit Prediction";

    renderCreditPanel();
    showExistingPrediction();

    await sendAdminPredictionReport(
      "A new paid Premier League prediction has been submitted."
    );
  } catch (error) {
    console.error("Submission error:", error);

    submitBtn.textContent = "Submit Prediction";
    updateForm();

    message.textContent =
      error.message ||
      "The prediction could not be submitted.";
  }
});
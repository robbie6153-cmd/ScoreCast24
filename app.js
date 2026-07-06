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

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const tableContainer = document.getElementById("tableContainer");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

startBtn.addEventListener("click", () => {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  buildTable();
});

function buildTable() {
  tableContainer.innerHTML = "";

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

submitBtn.addEventListener("click", () => {
  const sure = confirm("Are you sure you want to submit this as your final prediction?");

  if (!sure) return;

  const prediction = Array.from(document.querySelectorAll(".team-select")).map(select => {
    return {
      position: Number(select.dataset.position),
      team: select.value
    };
  });

  localStorage.setItem("premierLeaguePrediction", JSON.stringify(prediction));

  message.textContent = "Prediction submitted and saved on this device.";
  submitBtn.disabled = true;
  submitBtn.classList.remove("ready");
});
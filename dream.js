import { auth, db } from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";


const MAX_PLAYERS = 11;
const MAX_RATING = 888;
const MAX_FROM_ONE_CLUB = 2;

const FORMATIONS = {
  "4-4-2": {
    Goalkeeper: 1,
    Defender: 4,
    Midfielder: 4,
    Attacker: 2
  },

  "4-3-3": {
    Goalkeeper: 1,
    Defender: 4,
    Midfielder: 3,
    Attacker: 3
  },

  "4-5-1": {
    Goalkeeper: 1,
    Defender: 4,
    Midfielder: 5,
    Attacker: 1
  },

  "5-3-2": {
    Goalkeeper: 1,
    Defender: 5,
    Midfielder: 3,
    Attacker: 2
  },

  "5-4-1": {
    Goalkeeper: 1,
    Defender: 5,
    Midfielder: 4,
    Attacker: 1
  },

  "3-4-3": {
    Goalkeeper: 1,
    Defender: 3,
    Midfielder: 4,
    Attacker: 3
  },

  "3-5-2": {
    Goalkeeper: 1,
    Defender: 3,
    Midfielder: 5,
    Attacker: 2
  }
};


let allPlayers = [];
let selectedPlayers = [];
let currentUser = null;
let currentUsername = "";


const formationSelect =
  document.getElementById("formationSelect");

const clubFilter =
  document.getElementById("clubFilter");

const positionFilter =
  document.getElementById("positionFilter");

const playerSearch =
  document.getElementById("playerSearch");

const playerList =
  document.getElementById("playerList");

const selectedTeam =
  document.getElementById("selectedTeam");

const selectedCount =
  document.getElementById("selectedCount");

const ratingTotal =
  document.getElementById("ratingTotal");

const formationStatus =
  document.getElementById("formationStatus");

const submitDreamTeamBtn =
  document.getElementById("submitDreamTeamBtn");

const dreamMessage =
  document.getElementById("dreamMessage");

const dreamLoginStatus =
  document.getElementById("dreamLoginStatus");


function showMessage(message, type = "") {
  dreamMessage.textContent = message;
  dreamMessage.className = `dream-message ${type}`;
}


function clearMessage() {
  showMessage("");
}


function getWeeklyRoundId() {
  const now = new Date();

  const year = now.getFullYear();

  const firstDayOfYear =
    new Date(year, 0, 1);

  const daysSinceFirstDay =
    Math.floor(
      (now - firstDayOfYear) / 86400000
    );

  const weekNumber =
    Math.ceil(
      (daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7
    );

  return `${year}-week-${String(weekNumber).padStart(2, "0")}`;
}


async function loadPlayerFiles() {
  try {
    const fileNames = [
      "./goalkeepers.json?v=1",
      "./defenders.json?v=1",
      "./midfielders.json?v=1",
      "./attackers.json?v=1"
    ];

    const responses =
      await Promise.all(
        fileNames.map(fileName => fetch(fileName))
      );

    for (const response of responses) {
      if (!response.ok) {
        throw new Error(
          `Could not load ${response.url}`
        );
      }
    }

    const playerGroups =
      await Promise.all(
        responses.map(response => response.json())
      );

    allPlayers = playerGroups
      .flat()
      .filter(player => {
        return (
          player.id &&
          player.name &&
          player.club &&
          player.position &&
          Number.isFinite(Number(player.rating))
        );
      })
      .map(player => ({
        ...player,
        rating: Number(player.rating)
      }));

    populateClubFilter();
    renderPlayers();

  } catch (error) {
    console.error("Player loading error:", error);

    playerList.innerHTML = `
      <p>
        The player database could not be loaded.
        Check that all four JSON files are saved correctly.
      </p>
    `;
  }
}


function populateClubFilter() {
  const clubs = [
    ...new Set(
      allPlayers.map(player => player.club)
    )
  ].sort((a, b) => a.localeCompare(b));

  clubFilter.innerHTML =
    `<option value="ALL">All clubs</option>`;

  clubs.forEach(club => {
    const option =
      document.createElement("option");

    option.value = club;
    option.textContent = club;

    clubFilter.appendChild(option);
  });
}


function getFilteredPlayers() {
  const selectedClub = clubFilter.value;
  const selectedPosition = positionFilter.value;
  const searchValue =
    playerSearch.value.trim().toLowerCase();

  return allPlayers.filter(player => {
    const matchesClub =
      selectedClub === "ALL" ||
      player.club === selectedClub;

    const matchesPosition =
      selectedPosition === "ALL" ||
      player.position === selectedPosition;

    const matchesSearch =
      !searchValue ||
      player.name.toLowerCase().includes(searchValue);

    return (
      matchesClub &&
      matchesPosition &&
      matchesSearch
    );
  });
}


function renderPlayers() {
  const filteredPlayers = getFilteredPlayers();

  if (!filteredPlayers.length) {
    playerList.innerHTML = `
      <p>No matching players found.</p>
    `;
    return;
  }

  playerList.innerHTML =
    filteredPlayers.map(player => {
      const alreadySelected =
        selectedPlayers.some(
          selected => selected.id === player.id
        );

      return `
        <article class="player-card">

          <div class="player-card-details">
            <strong>${escapeHtml(player.name)}</strong>

            <span>
              ${escapeHtml(player.club)}
            </span>

            <span>
              ${escapeHtml(player.position)}
            </span>
          </div>

          <div class="player-card-rating">
            ${player.rating}
          </div>

          <button
            type="button"
            class="add-player-button"
            data-player-id="${escapeHtml(player.id)}"
            ${alreadySelected ? "disabled" : ""}
          >
            ${alreadySelected ? "Selected" : "Add"}
          </button>

        </article>
      `;
    }).join("");

  document
    .querySelectorAll(".add-player-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        addPlayer(button.dataset.playerId);
      });
    });
}


function addPlayer(playerId) {
  clearMessage();

  const player =
    allPlayers.find(item => item.id === playerId);

  if (!player) {
    showMessage("Player could not be found.", "error");
    return;
  }

  if (!currentUser) {
    showMessage(
      "You must be logged in to select a Dream Team.",
      "error"
    );
    return;
  }

  if (!formationSelect.value) {
    showMessage(
      "Choose your formation before selecting players.",
      "error"
    );
    return;
  }

  if (selectedPlayers.length >= MAX_PLAYERS) {
    showMessage(
      "Your team already contains 11 players.",
      "error"
    );
    return;
  }

  if (
    selectedPlayers.some(
      selected => selected.id === player.id
    )
  ) {
    showMessage(
      "You have already selected this player.",
      "error"
    );
    return;
  }

  const formation =
    FORMATIONS[formationSelect.value];

  const positionCount =
    selectedPlayers.filter(
      selected => selected.position === player.position
    ).length;

  const positionLimit =
    formation[player.position];

  if (positionCount >= positionLimit) {
    showMessage(
      `Your ${formationSelect.value} formation only allows ` +
      `${positionLimit} ${player.position.toLowerCase()} player` +
      `${positionLimit === 1 ? "" : "s"}.`,
      "error"
    );
    return;
  }

  const clubCount =
    selectedPlayers.filter(
      selected => selected.club === player.club
    ).length;

  if (clubCount >= MAX_FROM_ONE_CLUB) {
    showMessage(
      `You may only select two players from ${player.club}.`,
      "error"
    );
    return;
  }

  const newRatingTotal =
    calculateRatingTotal() + player.rating;

  if (newRatingTotal > MAX_RATING) {
    showMessage(
      `Adding ${player.name} would take your team above ` +
      `${MAX_RATING} rating points.`,
      "error"
    );
    return;
  }

  selectedPlayers.push(player);

  updateDreamTeamDisplay();
}


function removePlayer(playerId) {
  selectedPlayers =
    selectedPlayers.filter(
      player => player.id !== playerId
    );

  clearMessage();
  updateDreamTeamDisplay();
}


function calculateRatingTotal() {
  return selectedPlayers.reduce(
    (total, player) => total + player.rating,
    0
  );
}


function getPositionCounts() {
  return {
    Goalkeeper:
      selectedPlayers.filter(
        player => player.position === "Goalkeeper"
      ).length,

    Defender:
      selectedPlayers.filter(
        player => player.position === "Defender"
      ).length,

    Midfielder:
      selectedPlayers.filter(
        player => player.position === "Midfielder"
      ).length,

    Attacker:
      selectedPlayers.filter(
        player => player.position === "Attacker"
      ).length
  };
}


function formationIsComplete() {
  const formationName =
    formationSelect.value;

  if (!formationName) {
    return false;
  }

  const required =
    FORMATIONS[formationName];

  const actual =
    getPositionCounts();

  return Object.keys(required).every(position => {
    return actual[position] === required[position];
  });
}


function teamIsValid() {
  return (
    Boolean(currentUser) &&
    selectedPlayers.length === MAX_PLAYERS &&
    calculateRatingTotal() <= MAX_RATING &&
    formationIsComplete()
  );
}


function updateDreamTeamDisplay() {
  const totalRating =
    calculateRatingTotal();

  selectedCount.textContent =
    `${selectedPlayers.length}/${MAX_PLAYERS}`;

  ratingTotal.textContent =
    `${totalRating}/${MAX_RATING}`;

  formationStatus.textContent =
    formationSelect.value || "Not selected";

  ratingTotal.classList.toggle(
    "over-budget",
    totalRating > MAX_RATING
  );

  if (!selectedPlayers.length) {
    selectedTeam.innerHTML = `
      <p>No players selected yet.</p>
    `;
  } else {
    const positionOrder = {
      Goalkeeper: 1,
      Defender: 2,
      Midfielder: 3,
      Attacker: 4
    };

    const orderedPlayers =
      [...selectedPlayers].sort((a, b) => {
        return (
          positionOrder[a.position] -
          positionOrder[b.position]
        );
      });

    selectedTeam.innerHTML =
      orderedPlayers.map(player => `
        <article class="selected-player-card">

          <div>
            <strong>${escapeHtml(player.name)}</strong>

            <span>
              ${escapeHtml(player.club)}
              ·
              ${escapeHtml(player.position)}
              ·
              ${player.rating} points
            </span>
          </div>

          <button
            type="button"
            class="remove-player-button"
            data-player-id="${escapeHtml(player.id)}"
          >
            Remove
          </button>

        </article>
      `).join("");

    document
      .querySelectorAll(".remove-player-button")
      .forEach(button => {
        button.addEventListener("click", () => {
          removePlayer(button.dataset.playerId);
        });
      });
  }

  submitDreamTeamBtn.disabled =
    !teamIsValid();

  renderPlayers();
}


async function loadExistingDreamTeam() {
  if (!currentUser) {
    return;
  }

  const roundId =
    getWeeklyRoundId();

  const entryId =
    `${roundId}_${currentUser.uid}`;

  try {
    const entryReference =
      doc(db, "dream_team_entries", entryId);

    const entrySnapshot =
      await getDoc(entryReference);

    if (!entrySnapshot.exists()) {
      return;
    }

    const savedEntry =
      entrySnapshot.data();

    formationSelect.value =
      savedEntry.formation || "";

    const savedPlayerIds =
      Array.isArray(savedEntry.players)
        ? savedEntry.players.map(player => player.id)
        : [];

    selectedPlayers =
      allPlayers.filter(player => {
        return savedPlayerIds.includes(player.id);
      });

    updateDreamTeamDisplay();

    showMessage(
      "Your previously submitted team has been loaded.",
      "success"
    );

  } catch (error) {
    console.error(
      "Could not load existing Dream Team:",
      error
    );
  }
}


async function submitDreamTeam() {
  clearMessage();

  if (!currentUser) {
    showMessage(
      "You must be logged in to submit a team.",
      "error"
    );
    return;
  }

  if (!teamIsValid()) {
    showMessage(
      "Your team does not currently meet all the rules.",
      "error"
    );
    return;
  }

  submitDreamTeamBtn.disabled = true;
  submitDreamTeamBtn.textContent = "Submitting...";

  const roundId =
    getWeeklyRoundId();

  const entryId =
    `${roundId}_${currentUser.uid}`;

  try {
    const entryReference =
      doc(db, "dream_team_entries", entryId);

    await setDoc(entryReference, {
      uid: currentUser.uid,
      username: currentUsername,
      email: currentUser.email || "",
      roundId,
      formation: formationSelect.value,
      ratingTotal: calculateRatingTotal(),

      players: selectedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        club: player.club,
        position: player.position,
        rating: player.rating
      })),

      submittedAt: serverTimestamp(),
      status: "submitted",
      totalPoints: 0
    });

    showMessage(
      "Your weekly Dream Team has been submitted successfully.",
      "success"
    );

  } catch (error) {
    console.error("Dream Team submission failed:", error);

    showMessage(
      "Your team could not be submitted. Please try again.",
      "error"
    );

  } finally {
    submitDreamTeamBtn.textContent =
      "Submit Dream Team";

    submitDreamTeamBtn.disabled =
      !teamIsValid();
  }
}


async function findUsername(user) {
  const localUsername =
    localStorage.getItem("scorecast24Username");

  if (localUsername) {
    return localUsername;
  }

  try {
    const userReference =
      doc(db, "users", user.uid);

    const userSnapshot =
      await getDoc(userReference);

    if (userSnapshot.exists()) {
      const userData =
        userSnapshot.data();

      return (
        userData.username ||
        user.email ||
        "ScoreCast24 Player"
      );
    }

  } catch (error) {
    console.error("Username lookup failed:", error);
  }

  return user.email || "ScoreCast24 Player";
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


formationSelect.addEventListener("change", () => {
  /*
    Changing formation clears the team because players already selected
    may not fit the newly chosen formation.
  */
  if (selectedPlayers.length > 0) {
    const confirmed =
      window.confirm(
        "Changing formation will remove your currently selected players. Continue?"
      );

    if (!confirmed) {
      return;
    }

    selectedPlayers = [];
  }

  clearMessage();
  updateDreamTeamDisplay();
});


clubFilter.addEventListener(
  "change",
  renderPlayers
);

positionFilter.addEventListener(
  "change",
  renderPlayers
);

playerSearch.addEventListener(
  "input",
  renderPlayers
);

submitDreamTeamBtn.addEventListener(
  "click",
  submitDreamTeam
);


onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    currentUsername = "";

    dreamLoginStatus.textContent =
      "You must log in before selecting and submitting a Dream Team.";

    showMessage(
      "Return to the ScoreCast24 home page and log in first.",
      "error"
    );

    submitDreamTeamBtn.disabled = true;
    return;
  }

  currentUsername =
    await findUsername(user);

  dreamLoginStatus.textContent =
    `Logged in as ${currentUsername}`;

  if (!allPlayers.length) {
    await loadPlayerFiles();
  }

  await loadExistingDreamTeam();

  updateDreamTeamDisplay();
});


loadPlayerFiles();
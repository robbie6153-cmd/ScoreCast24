import { db } from "./firebase.js?v=108";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const dreamTeamViewTitle =
  document.getElementById("dreamTeamViewTitle");

const dreamTeamViewStatus =
  document.getElementById("dreamTeamViewStatus");

const dreamTeamSummary =
  document.getElementById("dreamTeamSummary");

const viewDreamUsername =
  document.getElementById("viewDreamUsername");

const viewDreamFormation =
  document.getElementById("viewDreamFormation");

const viewDreamRating =
  document.getElementById("viewDreamRating");

const viewDreamPoints =
  document.getElementById("viewDreamPoints");

const viewDreamTeamPlayers =
  document.getElementById("viewDreamTeamPlayers");


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showError(message) {
  if (dreamTeamViewTitle) {
    dreamTeamViewTitle.textContent =
      "Dream Team Unavailable";
  }

  if (dreamTeamViewStatus) {
    dreamTeamViewStatus.textContent =
      message;
  }

  if (dreamTeamSummary) {
    dreamTeamSummary.hidden = true;
  }

  if (viewDreamTeamPlayers) {
    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        ${escapeHtml(message)}
      </p>
    `;
  }
}


function orderPlayers(players) {
  const positionOrder = {
    Goalkeeper: 1,
    Defender: 2,
    Midfielder: 3,
    Attacker: 4
  };

  return [...players].sort((a, b) => {
    const firstPosition =
      positionOrder[a.position] || 99;

    const secondPosition =
      positionOrder[b.position] || 99;

    if (firstPosition !== secondPosition) {
      return firstPosition - secondPosition;
    }

    return String(a.name || "")
      .localeCompare(String(b.name || ""));
  });
}


function renderPlayers(players) {
  if (!viewDreamTeamPlayers) {
    return;
  }

  if (!Array.isArray(players) || !players.length) {
    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        No players were saved with this Dream Team.
      </p>
    `;
    return;
  }

  const orderedPlayers =
    orderPlayers(players);

  viewDreamTeamPlayers.innerHTML =
    orderedPlayers.map(player => {
      const positionClass =
        String(player.position || "")
          .trim()
          .toLowerCase();

      return `
        <article
          class="selected-player-card ${escapeHtml(positionClass)}"
        >
          <div>
            <strong>
              ${escapeHtml(player.name || "Unknown player")}
            </strong>

            <span>
              ${escapeHtml(player.club || "Unknown club")}
              ·
              ${escapeHtml(player.position || "Unknown position")}
              ·
              ${Number(player.rating || 0)} rating
            </span>
          </div>
        </article>
      `;
    }).join("");
}


function renderDreamTeam(entry) {
  const username =
    entry.username || "ScoreCast24 Player";

  if (dreamTeamViewTitle) {
    dreamTeamViewTitle.textContent =
      `${username}'s Dream Team`;
  }

  if (dreamTeamViewStatus) {
    dreamTeamViewStatus.textContent =
      "Submitted weekly Dream Team";
  }

  if (viewDreamUsername) {
    viewDreamUsername.textContent =
      username;
  }

  if (viewDreamFormation) {
    viewDreamFormation.textContent =
      entry.formation || "Not recorded";
  }

  if (viewDreamRating) {
    viewDreamRating.textContent =
      Number(entry.ratingTotal || 0);
  }

  if (viewDreamPoints) {
    viewDreamPoints.textContent =
      Number(entry.totalPoints || 0);
  }

  if (dreamTeamSummary) {
    dreamTeamSummary.hidden = false;
  }

  renderPlayers(entry.players);
}


async function loadDreamTeam() {
  const parameters =
    new URLSearchParams(window.location.search);

  const entryId =
    parameters.get("id");

  if (!entryId) {
    showError(
      "No Dream Team entry was selected."
    );
    return;
  }

  try {
    const entryReference =
      doc(
        db,
        "dream_team_entries",
        entryId
      );

    const entrySnapshot =
      await getDoc(entryReference);

    if (!entrySnapshot.exists()) {
      showError(
        "This Dream Team entry could not be found."
      );
      return;
    }

    renderDreamTeam({
      id: entrySnapshot.id,
      ...entrySnapshot.data()
    });

  } catch (error) {
    console.error(
      "Dream Team loading error:",
      error
    );

    showError(
      "The Dream Team could not be loaded. Please try again."
    );
  }
}


loadDreamTeam();
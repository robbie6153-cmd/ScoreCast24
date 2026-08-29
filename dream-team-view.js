import {
  auth,
  db
} from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc
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

const attackerFormationRow =
  document.getElementById("attackerFormationRow");

const midfielderFormationRow =
  document.getElementById("midfielderFormationRow");

const defenderFormationRow =
  document.getElementById("defenderFormationRow");

const goalkeeperFormationRow =
  document.getElementById("goalkeeperFormationRow");


let currentEntry = null;
let currentEntryId = "";


/* =====================================================
   HELPERS
===================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normaliseText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toLowerCase();
}


function makePlayerKey(
  club,
  playerName
) {
  return (
    `${normaliseText(club)}|` +
    `${normaliseText(playerName)}`
  );
}


/* =====================================================
   PLAYER SCORES
===================================================== */
async function loadPlayerScores() {
  const CURRENT_ROUND_ID =
    "2026-week-02";

  const SEASON_ROUND_IDS = [
    "2026-week-01",
    "2026-week-02"
  ];

  const snapshot =
    await getDocs(
      collection(
        db,
        "dream_team_player_scores"
      )
    );

  const scoresByPlayer =
    new Map();

  snapshot.forEach(
    documentSnapshot => {
      const scoreDocument =
        documentSnapshot.data();

      /*
        Ignore old testing rounds.
      */
      if (
        !SEASON_ROUND_IDS.includes(
          scoreDocument.roundId
        )
      ) {
        return;
      }

      const key =
        makePlayerKey(
          scoreDocument.club,
          scoreDocument.playerName
        );

      if (
        !scoresByPlayer.has(key)
      ) {
        scoresByPlayer.set(
          key,
          {
            weekScore: 0,
            overallScore: 0
          }
        );
      }

      const scores =
        scoresByPlayer.get(key);

      const weekScore =
        Number(
          scoreDocument.weekScore
        ) || 0;

      /*
        Season total:
        Week One + Week Two.
      */
      scores.overallScore +=
        weekScore;

      /*
        Current weekly score:
        Week Two only.
      */
      if (
        scoreDocument.roundId ===
        CURRENT_ROUND_ID
      ) {
        scores.weekScore =
          weekScore;
      }
    }
  );

  return scoresByPlayer;
}



/* =====================================================
   ERROR DISPLAY
===================================================== */

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


/* =====================================================
   PLAYER ORDER
===================================================== */

function orderPlayers(players) {
  const positionOrder = {
    Goalkeeper: 1,
    Defender: 2,
    Midfielder: 3,
    Attacker: 4
  };

  return [...players].sort(
    (a, b) => {
      const firstPosition =
        positionOrder[
          a.position
        ] || 99;

      const secondPosition =
        positionOrder[
          b.position
        ] || 99;

      if (
        firstPosition !==
        secondPosition
      ) {
        return (
          firstPosition -
          secondPosition
        );
      }

      return String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        )
      );
    }
  );
}


/* =====================================================
   REMOVE PLAYER
===================================================== */

async function removePlayerFromSquad(
  playerName
) {
  if (
    !currentEntry ||
    !currentEntryId
  ) {
    return;
  }

  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    alert(
      "You must be logged in to change your Dream Team."
    );
    return;
  }

  if (
    currentEntry.uid !==
    currentUser.uid
  ) {
    alert(
      "You can only change your own Dream Team."
    );
    return;
  }

  const player =
    currentEntry.players.find(
      item =>
        item.name ===
        playerName
    );

  if (!player) {
    return;
  }

  const confirmed =
    window.confirm(
      `Are you sure you want to remove ${player.name} from your squad?`
    );

  if (!confirmed) {
    return;
  }

  const updatedPlayers =
    currentEntry.players.filter(
      item =>
        item.name !==
        playerName
    );

  const updatedRatingTotal =
    updatedPlayers.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.rating || 0
        ),
      0
    );

  try {
    const entryReference =
      doc(
        db,
        "dream_team_entries",
        currentEntryId
      );

    await updateDoc(
      entryReference,
      {
        players:
          updatedPlayers,

        ratingTotal:
          updatedRatingTotal
      }
    );

    currentEntry.players =
      updatedPlayers;

    currentEntry.ratingTotal =
      updatedRatingTotal;

    renderDreamTeam(
      currentEntry
    );

  } catch (error) {
    console.error(
      "Dream Team player removal error:",
      error
    );

    alert(
      "The player could not be removed. Please try again."
    );
  }
}


/* =====================================================
   PLAYER LIST
===================================================== */

function renderPlayers(players) {
  if (!viewDreamTeamPlayers) {
    return;
  }

  if (
    !Array.isArray(players) ||
    !players.length
  ) {
    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        No players were saved with this Dream Team.
      </p>
    `;

    return;
  }

  const orderedPlayers =
    orderPlayers(players);

  const currentUser =
    auth.currentUser;

  const canEdit =
    currentUser &&
    currentEntry &&
    currentEntry.uid ===
      currentUser.uid;

  viewDreamTeamPlayers.innerHTML =
    orderedPlayers.map(
      player => {
        const positionClass =
          String(
            player.position ||
            ""
          )
            .trim()
            .toLowerCase();

        return `
          <article
            class="
              selected-player-card
              ${escapeHtml(
                positionClass
              )}
            "
          >

            <div
              class="selected-player-info"
            >

              <strong>
                ${escapeHtml(
                  player.name ||
                  "Unknown player"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  player.club ||
                  "Unknown club"
                )}
                ·
                ${escapeHtml(
                  player.position ||
                  "Unknown position"
                )}
                ·
                ${Number(
                  player.rating || 0
                )} rating
              </span>

            </div>

            ${
              canEdit
                ? `
                  <button
                    type="button"
                    class="
                      remove-dream-player
                    "
                    data-player-name="${escapeHtml(
                      player.name ||
                      ""
                    )}"
                  >
                    ✕ Remove
                  </button>
                `
                : ""
            }

          </article>
        `;
      }
    ).join("");

  const removeButtons =
    viewDreamTeamPlayers
      .querySelectorAll(
        ".remove-dream-player"
      );

  removeButtons.forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          const playerName =
            button.dataset
              .playerName;

          removePlayerFromSquad(
            playerName
          );
        }
      );
    }
  );
}


/* =====================================================
   FORMATION PLAYER
===================================================== */

function createFormationPlayer(
  player
) {
  const position =
    String(
      player.position || ""
    )
      .trim()
      .toLowerCase();

  const weeklyPoints =
    Number(
      player.weeklyPoints || 0
    );

  const overallPoints =
    Number(
      player.overallPoints || 0
    );

  return `
    <div class="formation-player">

      <div
        class="formation-player-name"
      >
        ${escapeHtml(
          player.name ||
          "Unknown player"
        )}
      </div>

      <div
        class="formation-player-score"
      >
        ${weeklyPoints}/${overallPoints}
      </div>

      <div
        class="formation-player-club"
      >
        (${escapeHtml(
          player.club ||
          "Unknown club"
        )})
      </div>

      <div
        class="
          formation-player-dot
          ${escapeHtml(position)}
        "
        title="${escapeHtml(
          `${
            player.name || ""
          } - ${
            player.club || ""
          }`
        )}"
      ></div>

    </div>
  `;
}


/* =====================================================
   FORMATION
===================================================== */

function renderFormation(players) {
  if (
    !attackerFormationRow ||
    !midfielderFormationRow ||
    !defenderFormationRow ||
    !goalkeeperFormationRow
  ) {
    return;
  }

  const safePlayers =
    Array.isArray(players)
      ? players
      : [];

  const goalkeepers =
    safePlayers.filter(
      player =>
        player.position ===
        "Goalkeeper"
    );

  const defenders =
    safePlayers.filter(
      player =>
        player.position ===
        "Defender"
    );

  const midfielders =
    safePlayers.filter(
      player =>
        player.position ===
        "Midfielder"
    );

  const attackers =
    safePlayers.filter(
      player =>
        player.position ===
        "Attacker"
    );

  goalkeeperFormationRow
    .innerHTML =
      goalkeepers
        .map(
          createFormationPlayer
        )
        .join("");

  defenderFormationRow
    .innerHTML =
      defenders
        .map(
          createFormationPlayer
        )
        .join("");

  midfielderFormationRow
    .innerHTML =
      midfielders
        .map(
          createFormationPlayer
        )
        .join("");

  attackerFormationRow
    .innerHTML =
      attackers
        .map(
          createFormationPlayer
        )
        .join("");
}


/* =====================================================
   RENDER DREAM TEAM
===================================================== */

function renderDreamTeam(entry) {
  const username =
    entry.username ||
    "ScoreCast24 Player";

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
      entry.formation ||
      "Not recorded";
  }

  if (viewDreamRating) {
    viewDreamRating.textContent =
      Number(
        entry.ratingTotal || 0
      );
  }

  if (viewDreamPoints) {
    viewDreamPoints.textContent =
      Number(
        entry.totalPoints || 0
      );
  }

  if (dreamTeamSummary) {
    dreamTeamSummary.hidden =
      false;
  }

  renderFormation(
    entry.players
  );

  renderPlayers(
    entry.players
  );
}


/* =====================================================
   LOAD DREAM TEAM
===================================================== */

async function loadDreamTeam() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

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
      await getDoc(
        entryReference
      );

    if (
      !entrySnapshot.exists()
    ) {
      showError(
        "This Dream Team entry could not be found."
      );

      return;
    }

    const scoresByPlayer =
      await loadPlayerScores();

    const entryData = {
      id:
        entrySnapshot.id,

      ...entrySnapshot.data()
    };

    currentEntryId =
      entrySnapshot.id;

    currentEntry =
      entryData;

    entryData.players =
      Array.isArray(
        entryData.players
      )
        ? entryData.players.map(
            player => {
              const key =
                makePlayerKey(
                  player.club,
                  player.name
                );

              const scores =
                scoresByPlayer.get(
                  key
                ) || {
                  weekScore: 0,
                  overallScore: 0
                };

              return {
                ...player,

                weeklyPoints:
                  scores.weekScore,

                overallPoints:
                  scores.overallScore
              };
            }
          )
        : [];

    currentEntry.players =
      entryData.players;

    renderDreamTeam(
      entryData
    );

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
import {
  auth,
  db
} from "./firebase.js?v=108";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


/* =====================================================
   PLAYER FILES
===================================================== */

const PLAYER_FILES = [
  {
    file: "goalkeepers.json",
    elementId: "goalkeepers",
    position: "Goalkeeper"
  },
  {
    file: "defenders.json",
    elementId: "defenders",
    position: "Defender"
  },
  {
    file: "midfielders.json",
    elementId: "midfielders",
    position: "Midfielder"
  },
  {
    file: "attackers.json",
    elementId: "attackers",
    position: "Attacker"
  }
];


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const dreamTeamViewTitle =
  document.getElementById(
    "dreamTeamViewTitle"
  );

const dreamTeamViewStatus =
  document.getElementById(
    "dreamTeamViewStatus"
  );

const dreamTeamSummary =
  document.getElementById(
    "dreamTeamSummary"
  );

const viewDreamUsername =
  document.getElementById(
    "viewDreamUsername"
  );

const viewDreamFormation =
  document.getElementById(
    "viewDreamFormation"
  );

const viewDreamRating =
  document.getElementById(
    "viewDreamRating"
  );

const viewDreamPoints =
  document.getElementById(
    "viewDreamPoints"
  );

const viewDreamTeamPlayers =
  document.getElementById(
    "viewDreamTeamPlayers"
  );

const attackerFormationRow =
  document.getElementById(
    "attackerFormationRow"
  );

const midfielderFormationRow =
  document.getElementById(
    "midfielderFormationRow"
  );

const defenderFormationRow =
  document.getElementById(
    "defenderFormationRow"
  );

const goalkeeperFormationRow =
  document.getElementById(
    "goalkeeperFormationRow"
  );

const backToTeamSelection =
  document.getElementById(
    "backToTeamSelection"
  );

const databasePlayerSearch =
  document.getElementById(
    "databasePlayerSearch"
  );

const databasePositionFilter =
  document.getElementById(
    "databasePositionFilter"
  );

const databaseClubFilter =
  document.getElementById(
    "databaseClubFilter"
  );

const clearDatabaseFilters =
  document.getElementById(
    "clearDatabaseFilters"
  );


/* =====================================================
   CURRENT STATE
===================================================== */

let currentEntry = null;

let currentEntryId = "";

let holdTimer = null;

let heldPlayerKey = "";

let allDatabasePlayers = [];

let playerScoresByKey =
  new Map();


/* =====================================================
   HELPERS
===================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
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
        !scoresByPlayer.has(
          key
        )
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
        scoresByPlayer.get(
          key
        );


      const weekScore =
        Number(
          scoreDocument.weekScore
        ) || 0;


      scores.overallScore +=
        weekScore;


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
   LOAD PLAYER FILES
===================================================== */

async function loadPlayerFiles() {

  const loadedPlayers = [];


  for (
    const playerFile of
    PLAYER_FILES
  ) {

    try {

      const response =
        await fetch(
          `${playerFile.file}?v=${Date.now()}`
        );


      if (!response.ok) {

        throw new Error(
          `Could not load ${playerFile.file}`
        );
      }


      const players =
        await response.json();


      if (
        !Array.isArray(
          players
        )
      ) {
        continue;
      }


      for (
        const player of
        players
      ) {

        loadedPlayers.push({
          ...player,

          position:
            player.position ||
            playerFile.position,

          databasePosition:
            playerFile.position,

          elementId:
            playerFile.elementId
        });
      }

    } catch (error) {

      console.error(
        "Player file loading error:",
        error
      );
    }
  }


  allDatabasePlayers =
    loadedPlayers;
}


/* =====================================================
   CLUB FILTER
===================================================== */

function populateClubFilter() {

  if (
    !databaseClubFilter
  ) {
    return;
  }


  const clubs =
    [
      ...new Set(
        allDatabasePlayers
          .map(
            player =>
              player.club
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(
            b
          )
      );


  databaseClubFilter.innerHTML = `
    <option value="ALL">
      All clubs
    </option>
  `;


  clubs.forEach(
    club => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        club;

      option.textContent =
        club;


      databaseClubFilter
        .appendChild(
          option
        );
    }
  );
}


/* =====================================================
   FILTER PLAYERS
===================================================== */

function getFilteredPlayers() {

  const searchValue =
    normaliseText(
      databasePlayerSearch
        ?.value ||
      ""
    );


  const selectedPosition =
    databasePositionFilter
      ?.value ||
    "ALL";


  const selectedClub =
    databaseClubFilter
      ?.value ||
    "ALL";


  return allDatabasePlayers.filter(
    player => {

      const matchesSearch =
        !searchValue ||
        normaliseText(
          player.name
        ).includes(
          searchValue
        );


      const matchesPosition =
        selectedPosition ===
          "ALL" ||
        player.databasePosition ===
          selectedPosition;


      const matchesClub =
        selectedClub ===
          "ALL" ||
        player.club ===
          selectedClub;


      return (
        matchesSearch &&
        matchesPosition &&
        matchesClub
      );
    }
  );
}


/* =====================================================
   ADD PLAYER TO SQUAD
===================================================== */

function addPlayerToSquad(
  player
) {

  if (!currentEntry) {

    window.alert(
      "Your Dream Team is still loading."
    );

    return;
  }


  if (
    !Array.isArray(
      currentEntry.players
    )
  ) {

    currentEntry.players = [];
  }


  const playerKey =
    makePlayerKey(
      player.club,
      player.name
    );


  const alreadySelected =
    currentEntry.players.some(
      selectedPlayer =>
        makePlayerKey(
          selectedPlayer.club,
          selectedPlayer.name
        ) === playerKey
    );


  if (alreadySelected) {

    window.alert(
      `${player.name} is already in your squad.`
    );

    return;
  }


  const scores =
    playerScoresByKey.get(
      playerKey
    ) || {
      weekScore: 0,
      overallScore: 0
    };


  currentEntry.players.push({
    ...player,

    weeklyPoints:
      scores.weekScore,

    overallPoints:
      scores.overallScore
  });


  renderFormation(
    currentEntry.players
  );


  renderPlayers(
    currentEntry.players
  );


  renderPlayerDatabase();
}

/* =====================================================
   DISPLAY DATABASE PLAYERS
===================================================== */

function displayPositionPlayers(
  elementId,
  players
) {

  const container =
    document.getElementById(
      elementId
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!players.length) {

    container.innerHTML = `
      <p class="leaderboard-empty-message">
        No matching players.
      </p>
    `;

    return;
  }


  const sortedPlayers =
    [...players].sort(
      (a, b) => {

        const clubA =
          String(
            a.club || ""
          ).toLowerCase();

        const clubB =
          String(
            b.club || ""
          ).toLowerCase();

        const nameA =
          String(
            a.name || ""
          ).toLowerCase();

        const nameB =
          String(
            b.name || ""
          ).toLowerCase();


        return (
          clubA.localeCompare(
            clubB
          ) ||
          nameA.localeCompare(
            nameB
          )
        );
      }
    );


  for (
    const player of
    sortedPlayers
  ) {

    const playerKey =
      makePlayerKey(
        player.club,
        player.name
      );


    const scores =
      playerScoresByKey.get(
        playerKey
      ) || {
        weekScore: 0,
        overallScore: 0
      };


    const row =
      document.createElement(
        "button"
      );


    row.type =
      "button";

    row.className =
      "player-database-row";


    row.innerHTML = `

      <div class="database-player-main">

        <strong class="database-player-name">
          ${escapeHtml(
            player.name
          )}
        </strong>

        <span class="database-player-club">
          ${escapeHtml(
            player.club
          )}
        </span>

      </div>


      <div class="database-player-stats">

        <span class="database-player-rating">
          Rating:
          <strong>
            ${Number(
              player.rating || 0
            )}
          </strong>
        </span>

        <span>
          Week:
          <strong>
            ${Number(
              scores.weekScore || 0
            )}
          </strong>
        </span>

        <span>
          Overall:
          <strong>
            ${Number(
              scores.overallScore || 0
            )}
          </strong>
        </span>

      </div>

    `;


    row.addEventListener(
      "click",
      () => {

        const shouldAdd =
          window.confirm(
            `Add ${player.name} to squad?`
          );


        if (!shouldAdd) {
          return;
        }


        addPlayerToSquad(
          player
        );
      }
    );


    container.appendChild(
      row
    );
  }
}
/* =====================================================
   RENDER PLAYER DATABASE
===================================================== */

function renderPlayerDatabase() {

  const filteredPlayers =
    getFilteredPlayers();


  for (
    const playerFile of
    PLAYER_FILES
  ) {

    const positionPlayers =
      filteredPlayers.filter(
        player =>
          player.databasePosition ===
          playerFile.position
      );


    const section =
      document.querySelector(
        `.player-database-position-section[data-position="${playerFile.position}"]`
      );


    if (section) {

      section.hidden =
        positionPlayers.length ===
        0;
    }


    displayPositionPlayers(
      playerFile.elementId,
      positionPlayers
    );
  }
}


/* =====================================================
   DATABASE FILTER EVENTS
===================================================== */

function setupDatabaseFilterEvents() {

  if (
    databasePlayerSearch
  ) {

    databasePlayerSearch
      .addEventListener(
        "input",
        renderPlayerDatabase
      );
  }


  if (
    databasePositionFilter
  ) {

    databasePositionFilter
      .addEventListener(
        "change",
        renderPlayerDatabase
      );
  }


  if (
    databaseClubFilter
  ) {

    databaseClubFilter
      .addEventListener(
        "change",
        renderPlayerDatabase
      );
  }


  if (
    clearDatabaseFilters
  ) {

    clearDatabaseFilters
      .addEventListener(
        "click",
        () => {

          if (
            databasePlayerSearch
          ) {
            databasePlayerSearch.value =
              "";
          }


          if (
            databasePositionFilter
          ) {
            databasePositionFilter.value =
              "ALL";
          }


          if (
            databaseClubFilter
          ) {
            databaseClubFilter.value =
              "ALL";
          }


          renderPlayerDatabase();
        }
      );
  }
}


/* =====================================================
   ERROR DISPLAY
===================================================== */

function showError(message) {

  if (
    dreamTeamViewTitle
  ) {

    dreamTeamViewTitle.textContent =
      "Dream Team Unavailable";
  }


  if (
    dreamTeamViewStatus
  ) {

    dreamTeamViewStatus.textContent =
      message;
  }


  if (
    dreamTeamSummary
  ) {

    dreamTeamSummary.hidden =
      true;
  }


  if (
    viewDreamTeamPlayers
  ) {

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
   PLAYER LIST
===================================================== */

function renderPlayers(players) {

  if (
    !viewDreamTeamPlayers
  ) {
    return;
  }


  if (
    !Array.isArray(players) ||
    !players.length
  ) {

    viewDreamTeamPlayers.innerHTML = `
      <p class="leaderboard-empty-message">
        No players currently selected.
      </p>
    `;

    return;
  }


  const orderedPlayers =
    orderPlayers(
      players
    );


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

          </article>
        `;
      }
    )
      .join("");
}


/* =====================================================
   REMOVE PLAYER
===================================================== */

function removePlayerFromSquad(
  playerKey
) {

  if (
    !currentEntry ||
    !Array.isArray(
      currentEntry.players
    )
  ) {
    return;
  }


  const player =
    currentEntry.players.find(
      item =>
        makePlayerKey(
          item.club,
          item.name
        ) === playerKey
    );


  if (!player) {
    return;
  }


  const shouldRemove =
    window.confirm(
      `Remove ${player.name} from squad?`
    );


  if (!shouldRemove) {
    return;
  }


  currentEntry.players =
    currentEntry.players.filter(
      item =>
        makePlayerKey(
          item.club,
          item.name
        ) !== playerKey
    );


  renderFormation(
    currentEntry.players
  );


  renderPlayers(
    currentEntry.players
  );


  renderPlayerDatabase();
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


  const playerKey =
    makePlayerKey(
      player.club,
      player.name
    );


  return `
    <div
      class="formation-player"
      data-player-key="${escapeHtml(
        playerKey
      )}"
    >

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


  goalkeeperFormationRow.innerHTML =
    goalkeepers
      .map(
        createFormationPlayer
      )
      .join("");


  defenderFormationRow.innerHTML =
    defenders
      .map(
        createFormationPlayer
      )
      .join("");


  midfielderFormationRow.innerHTML =
    midfielders
      .map(
        createFormationPlayer
      )
      .join("");


  attackerFormationRow.innerHTML =
    attackers
      .map(
        createFormationPlayer
      )
      .join("");


  enablePlayerHoldRemoval();
}


/* =====================================================
   HOLD PLAYER TO REMOVE
===================================================== */

function enablePlayerHoldRemoval() {

  const formationPlayers =
    document.querySelectorAll(
      ".formation-player"
    );


  formationPlayers.forEach(
    playerElement => {

      const startHold =
        event => {

          event.preventDefault();


          heldPlayerKey =
            playerElement.dataset
              .playerKey ||
            "";


          clearTimeout(
            holdTimer
          );


          holdTimer =
            setTimeout(
              () => {

                if (
                  heldPlayerKey
                ) {

                  removePlayerFromSquad(
                    heldPlayerKey
                  );
                }


                heldPlayerKey =
                  "";

              },
              800
            );
        };


      const cancelHold =
        () => {

          clearTimeout(
            holdTimer
          );


          holdTimer =
            null;

          heldPlayerKey =
            "";
        };


      playerElement
        .addEventListener(
          "pointerdown",
          startHold
        );


      playerElement
        .addEventListener(
          "pointerup",
          cancelHold
        );


      playerElement
        .addEventListener(
          "pointerleave",
          cancelHold
        );


      playerElement
        .addEventListener(
          "pointercancel",
          cancelHold
        );
    }
  );
}


/* =====================================================
   RENDER DREAM TEAM
===================================================== */

function renderDreamTeam(entry) {

  const username =
    entry.username ||
    "ScoreCast24 Player";


  if (
    dreamTeamViewTitle
  ) {

    dreamTeamViewTitle.textContent =
      `${username}'s Dream Team`;
  }


  if (
    dreamTeamViewStatus
  ) {

    dreamTeamViewStatus.textContent =
      "Submitted weekly Dream Team";
  }


  if (
    viewDreamUsername
  ) {

    viewDreamUsername.textContent =
      username;
  }


  if (
    viewDreamFormation
  ) {

    viewDreamFormation.textContent =
      entry.formation ||
      "Not recorded";
  }


  if (
    viewDreamRating
  ) {

    viewDreamRating.textContent =
      Number(
        entry.ratingTotal || 0
      );
  }


  if (
    viewDreamPoints
  ) {

    viewDreamPoints.textContent =
      Number(
        entry.totalPoints || 0
      );
  }


  if (
    dreamTeamSummary
  ) {

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
   TEAM SELECTION LINK
===================================================== */

function updateTeamSelectionLink() {

  if (
    !backToTeamSelection ||
    !currentEntryId
  ) {
    return;
  }


  backToTeamSelection.href =
    `dream-game.html?carry=${encodeURIComponent(
      currentEntryId
    )}`;
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
    parameters.get(
      "id"
    );


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


    playerScoresByKey =
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


    updateTeamSelectionLink();


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
                playerScoresByKey.get(
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


    /*
      Re-render database now that
      current squad is loaded.
    */

    renderPlayerDatabase();

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


/* =====================================================
   START
===================================================== */

async function startDreamTeamPage() {

  await loadPlayerFiles();


  populateClubFilter();


  setupDatabaseFilterEvents();


  renderPlayerDatabase();


  await loadDreamTeam();
}


startDreamTeamPage();
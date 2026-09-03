import {
  auth,
  db
} from "./firebase.js?v=108";
import {
  DREAM_CONFIG
} from "./dream-config.js?v=6";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp
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
  const formationChangeBtn =
  document.getElementById(
    "formationChangeBtn"
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

  const submitDreamTeamBtn =
  document.getElementById(
    "submitDreamTeamBtn"
  );

/* =====================================================
   CURRENT STATE
===================================================== */
const MAX_TEAM_RATING =
  DREAM_CONFIG.maxRating;

const MAX_PLAYERS =
  DREAM_CONFIG.maxPlayers;

const MAX_FROM_ONE_CLUB =
  DREAM_CONFIG.maxFromOneClub;

const FORMATIONS =
  DREAM_CONFIG.formations;
let currentEntry = null;

let currentEntryId = "";

let holdTimer = null;

let heldPlayerKey = "";

let allDatabasePlayers = [];

let scoreDocuments = [];

let latestRoundId = "";

let playerScoresByApiId =
  new Map();

let apiIdByPlayerName =
  new Map();

let apiIdByClubAndName =
  new Map();

let fallbackScoresByName =
  new Map();

let fallbackScoresByClubAndName =
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
    .replace(/Ø/g, "O")
    .replace(/ø/g, "o")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .replace(/Ð/g, "D")
    .replace(/ð/g, "d")
    .replace(/Þ/g, "Th")
    .replace(/þ/g, "th")
    .replace(/Æ/g, "Ae")
    .replace(/æ/g, "ae")
    .replace(/Œ/g, "Oe")
    .replace(/œ/g, "oe")
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


function makeNameKey(
  playerName
) {

  return normaliseText(
    playerName
  );
}


/* =====================================================
   FIND API PLAYER ID
===================================================== */

function getApiPlayerId(
  player
) {

  /*
    If we permanently add API IDs
    to the JSON later, use them first.
  */

  if (
    player.apiPlayerId !==
      undefined &&
    player.apiPlayerId !==
      null &&
    player.apiPlayerId !==
      ""
  ) {

    return String(
      player.apiPlayerId
    );
  }


  const exactKey =
    makePlayerKey(
      player.club,
      player.name
    );


  const exactApiId =
    apiIdByClubAndName.get(
      exactKey
    );


  if (exactApiId) {
    return exactApiId;
  }


  const nameKey =
    makeNameKey(
      player.name
    );


  const nameApiIds =
    apiIdByPlayerName.get(
      nameKey
    );


  /*
    Only use name-only matching when
    that name belongs to exactly one
    API player.

    This prevents accidentally joining
    two different players with the
    same name.
  */

  if (
    nameApiIds &&
    nameApiIds.size === 1
  ) {

    return [
      ...nameApiIds
    ][0];
  }


  return "";
}


/* =====================================================
   GET PLAYER SCORES
===================================================== */

function getPlayerScores(
  player
) {

  const apiPlayerId =
    getApiPlayerId(
      player
    );


  /*
    API ID is the preferred match.
  */

  if (
    apiPlayerId &&
    playerScoresByApiId.has(
      apiPlayerId
    )
  ) {

    return playerScoresByApiId.get(
      apiPlayerId
    );
  }


  /*
    Temporary fallback for players
    that cannot yet be mapped to an
    API ID.
  */

  const exactKey =
    makePlayerKey(
      player.club,
      player.name
    );


  if (
    fallbackScoresByClubAndName.has(
      exactKey
    )
  ) {

    return fallbackScoresByClubAndName.get(
      exactKey
    );
  }


  const nameKey =
    makeNameKey(
      player.name
    );


  if (
    fallbackScoresByName.has(
      nameKey
    )
  ) {

    return fallbackScoresByName.get(
      nameKey
    );
  }


  return {
    weekScore: 0,
    overallScore: 0
  };
}


/* =====================================================
   LOAD PLAYER SCORES
===================================================== */

async function loadPlayerScores() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "dream_team_player_scores"
      )
    );


  scoreDocuments = [];


  snapshot.forEach(
    documentSnapshot => {

      const data =
        documentSnapshot.data();


      if (
        !data.roundId ||
        !data.playerName
      ) {
        return;
      }


      scoreDocuments.push({
        id:
          documentSnapshot.id,

        ...data
      });
    }
  );


  const roundIds =
    [
      ...new Set(
        scoreDocuments
          .map(
            score =>
              score.roundId
          )
          .filter(
            roundId =>
              /^2026-week-\d+$/.test(
                roundId
              )
          )
      )
    ];


  roundIds.sort(
    (a, b) => {

      const weekA =
        Number(
          a.split("-").pop()
        ) || 0;

      const weekB =
        Number(
          b.split("-").pop()
        ) || 0;


      return weekA - weekB;
    }
  );


  latestRoundId =
    roundIds[
      roundIds.length - 1
    ] || "";


  playerScoresByApiId =
    new Map();

  apiIdByPlayerName =
    new Map();

  apiIdByClubAndName =
    new Map();

  fallbackScoresByName =
    new Map();

  fallbackScoresByClubAndName =
    new Map();


  for (
    const scoreDocument of
    scoreDocuments
  ) {

    if (
      !roundIds.includes(
        scoreDocument.roundId
      )
    ) {
      continue;
    }


    const weekScore =
      Number(
        scoreDocument.weekScore
      ) || 0;


    const apiPlayerId =
      scoreDocument.apiPlayerId !==
        undefined &&
      scoreDocument.apiPlayerId !==
        null &&
      scoreDocument.apiPlayerId !==
        ""
        ? String(
            scoreDocument.apiPlayerId
          )
        : "";


    const exactKey =
      makePlayerKey(
        scoreDocument.club,
        scoreDocument.playerName
      );


    const nameKey =
      makeNameKey(
        scoreDocument.playerName
      );


    /* =========================
       API ID LOOKUP MAP
    ========================= */

    if (apiPlayerId) {

      apiIdByClubAndName.set(
        exactKey,
        apiPlayerId
      );


      if (
        !apiIdByPlayerName.has(
          nameKey
        )
      ) {

        apiIdByPlayerName.set(
          nameKey,
          new Set()
        );
      }


      apiIdByPlayerName
        .get(
          nameKey
        )
        .add(
          apiPlayerId
        );


      /* =========================
         SCORE BY API ID
      ========================= */

      if (
        !playerScoresByApiId.has(
          apiPlayerId
        )
      ) {

        playerScoresByApiId.set(
          apiPlayerId,
          {
            weekScore: 0,
            overallScore: 0
          }
        );
      }


      const apiScores =
        playerScoresByApiId.get(
          apiPlayerId
        );


      apiScores.overallScore +=
        weekScore;


      if (
        scoreDocument.roundId ===
        latestRoundId
      ) {

        apiScores.weekScore =
          weekScore;
      }
    }


    /* =========================
       FALLBACK EXACT SCORE
    ========================= */

    if (
      !fallbackScoresByClubAndName.has(
        exactKey
      )
    ) {

      fallbackScoresByClubAndName.set(
        exactKey,
        {
          weekScore: 0,
          overallScore: 0
        }
      );
    }


    const exactScores =
      fallbackScoresByClubAndName.get(
        exactKey
      );


    exactScores.overallScore +=
      weekScore;


    if (
      scoreDocument.roundId ===
      latestRoundId
    ) {

      exactScores.weekScore =
        weekScore;
    }


    /* =========================
       FALLBACK NAME SCORE
    ========================= */

    if (
      !fallbackScoresByName.has(
        nameKey
      )
    ) {

      fallbackScoresByName.set(
        nameKey,
        {
          weekScore: 0,
          overallScore: 0
        }
      );
    }


    const nameScores =
      fallbackScoresByName.get(
        nameKey
      );


    nameScores.overallScore +=
      weekScore;


    if (
      scoreDocument.roundId ===
        latestRoundId
    ) {

      nameScores.weekScore =
        weekScore;
    }
  }
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
   API MATCH AUDIT
===================================================== */
function auditPlayerApiMatching() {

  let matched = 0;

  const unmatchedPlayers = [];

  const databaseApiIds =
    new Set();


  /*
    Check every player in our
    JSON player database.
  */

  for (
    const player of
    allDatabasePlayers
  ) {

    const apiPlayerId =
      getApiPlayerId(
        player
      );


    if (apiPlayerId) {

      matched += 1;

      databaseApiIds.add(
        String(apiPlayerId)
      );

    } else {

      unmatchedPlayers.push({
        name:
          player.name,

        club:
          player.club,

        position:
          player.databasePosition
      });
    }
  }


  /*
    Now work backwards.

    Look at every API player who has
    actually generated a score and
    check that we successfully linked
    that API player to our database.
  */

  const scoredApiPlayers =
    new Map();


  for (
    const scoreDocument of
    scoreDocuments
  ) {

    if (
      scoreDocument.apiPlayerId ===
        undefined ||
      scoreDocument.apiPlayerId ===
        null ||
      scoreDocument.apiPlayerId ===
        ""
    ) {
      continue;
    }


    const apiPlayerId =
      String(
        scoreDocument.apiPlayerId
      );


    if (
      !scoredApiPlayers.has(
        apiPlayerId
      )
    ) {

      scoredApiPlayers.set(
        apiPlayerId,
        {
          apiPlayerId,
          name:
            scoreDocument.playerName,
          club:
            scoreDocument.club
        }
      );
    }
  }


  const scoredButUnmatched = [];


  for (
    const [
      apiPlayerId,
      player
    ] of scoredApiPlayers
  ) {

    if (
      !databaseApiIds.has(
        apiPlayerId
      )
    ) {

      scoredButUnmatched.push(
        player
      );
    }
  }


  console.log(
    "DREAM TEAM API MATCH AUDIT"
  );

  console.log(
    "Database players:",
    allDatabasePlayers.length
  );

  console.log(
    "Matched to API ID:",
    matched
  );

  console.log(
    "Not yet matched:",
    unmatchedPlayers.length
  );

  console.log(
    "API players with scores:",
    scoredApiPlayers.size
  );

  console.log(
    "SCORED BUT UNMATCHED:",
    scoredButUnmatched.length
  );


  if (
    scoredButUnmatched.length
  ) {

    console.log(
      "These need checking:"
    );

    console.table(
      scoredButUnmatched
    );
  }


  console.log(
    "Players with no API match yet:",
    unmatchedPlayers.length
  );
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

if (
  currentEntry.players.length >=
  MAX_PLAYERS
) {

  window.alert(
    "Your squad already has 11 players. Remove a player before adding another."
  );

  return;
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

  const clubCount =
  currentEntry.players.filter(
    selectedPlayer =>
      selectedPlayer.club ===
      player.club
  ).length;


if (
  clubCount >=
  MAX_FROM_ONE_CLUB
) {

  window.alert(
    `You may only select ${MAX_FROM_ONE_CLUB} players from ${player.club}.`
  );

  return;
}

const formation =
  FORMATIONS[
    currentEntry.formation
  ];


if (formation) {

  const positionCount =
    currentEntry.players.filter(
      selectedPlayer =>
        selectedPlayer.position ===
        player.position
    ).length;


  const positionLimit =
    formation[
      player.position
    ];


  if (
    positionCount >=
    positionLimit
  ) {

    window.alert(
      `Your ${currentEntry.formation} formation only allows ${positionLimit} ${player.position.toLowerCase()} player${positionLimit === 1 ? "" : "s"}.`
    );

    return;
  }
}
const currentRating =
  currentEntry.players.reduce(
    (total, selectedPlayer) =>
      total +
      Number(
        selectedPlayer.rating || 0
      ),
    0
  );


const newRating =
  currentRating +
  Number(
    player.rating || 0
  );


if (
  newRating >
  MAX_TEAM_RATING
) {

  window.alert(
    `This player is not available as it takes you over the ${MAX_TEAM_RATING} rating limit.`
  );

  return;
}

  const scores =
    getPlayerScores(
      player
    );


  const apiPlayerId =
    getApiPlayerId(
      player
    );


  currentEntry.players.push({
    ...player,

    apiPlayerId:
      apiPlayerId ||
      player.apiPlayerId ||
      null,

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


  updateSquadSummary();


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

    const scores =
      getPlayerScores(
        player
      );


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


  updateSquadSummary();


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
   UPDATE SQUAD SUMMARY
===================================================== */

function updateSquadSummary() {

  if (
    !currentEntry ||
    !Array.isArray(
      currentEntry.players
    )
  ) {
    return;
  }


  const currentRating =
    currentEntry.players.reduce(
      (total, player) =>
        total +
        Number(
          player.rating || 0
        ),
      0
    );


  const playerCount =
    currentEntry.players.length;


  if (
    viewDreamRating
  ) {

    viewDreamRating.textContent =
      `${currentRating}/${MAX_TEAM_RATING} · ${playerCount}/${MAX_PLAYERS}`;
  }
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


  updateSquadSummary();


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

              const apiPlayerId =
                getApiPlayerId(
                  player
                );


              const scores =
                getPlayerScores(
                  {
                    ...player,
                    apiPlayerId
                  }
                );


              return {
                ...player,

                apiPlayerId:
                  apiPlayerId ||
                  player.apiPlayerId ||
                  null,

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
async function saveCurrentDreamTeam() {

  if (
    !currentEntry ||
    !currentEntryId
  ) {
    window.alert(
      "Your Dream Team has not loaded yet."
    );

    return;
  }


  const players =
    Array.isArray(
      currentEntry.players
    )
      ? currentEntry.players
      : [];


  if (
    players.length !==
    MAX_PLAYERS
  ) {

    window.alert(
      `You must select ${MAX_PLAYERS} players before submitting. You currently have ${players.length}.`
    );

    return;
  }


  const ratingTotal =
    players.reduce(
      (total, player) =>
        total +
        Number(
          player.rating || 0
        ),
      0
    );


  if (
    ratingTotal >
    MAX_TEAM_RATING
  ) {

    window.alert(
      `Your team rating is ${ratingTotal}/${MAX_TEAM_RATING}. Reduce the rating before submitting.`
    );

    return;
  }


  try {

    submitDreamTeamBtn.disabled =
      true;


    await setDoc(
      doc(
        db,
        "dream_team_entries",
        currentEntryId
      ),
  {
  players,

  formation:
    currentEntry.formation,

  ratingTotal,

  updatedAt:
    serverTimestamp()
},
      {
        merge: true
      }
    );


    currentEntry.ratingTotal =
      ratingTotal;


    window.alert(
      "Dream Team saved successfully."
    );


    updateSquadSummary();

  } catch (error) {

    console.error(
      "Dream Team save error:",
      error
    );


    window.alert(
      "Your Dream Team could not be saved. Please try again."
    );

  } finally {

    submitDreamTeamBtn.disabled =
      false;
  }
}
function canChangeToFormation(
  formationName
) {

  if (
    !currentEntry ||
    !Array.isArray(
      currentEntry.players
    )
  ) {
    return false;
  }


  const formation =
    FORMATIONS[
      formationName
    ];


  if (!formation) {
    return false;
  }


  const counts = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Attacker: 0
  };


  currentEntry.players.forEach(
    player => {

      if (
        counts[player.position] !==
        undefined
      ) {

        counts[player.position] += 1;
      }
    }
  );


  return Object
    .keys(
      formation
    )
    .every(
      position =>
        counts[position] <=
        formation[position]
    );
}
function chooseFormation() {

  if (!currentEntry) {
    return;
  }


  const formationNames =
    Object.keys(
      FORMATIONS
    );


  const choice =
    window.prompt(
      "Choose formation:\n\n" +
      formationNames
        .map(
          (formation, index) =>
            `${index + 1}. ${formation}`
        )
        .join("\n")
    );


  if (!choice) {
    return;
  }


  const selectedIndex =
    Number(choice) - 1;


  const newFormation =
    formationNames[
      selectedIndex
    ];


  if (!newFormation) {

    window.alert(
      "Please choose a valid formation."
    );

    return;
  }


  if (
    newFormation ===
    currentEntry.formation
  ) {
    return;
  }


  if (
    !canChangeToFormation(
      newFormation
    )
  ) {

    window.alert(
      "You need to remove players from your squad before changing formation."
    );

    return;
  }


  currentEntry.formation =
    newFormation;


  if (
    viewDreamFormation
  ) {

    viewDreamFormation.textContent =
      newFormation;
  }
}
/* =====================================================
   START
===================================================== */

async function startDreamTeamPage() {

  /*
    Load both sources before rendering
    the player database.
  */

  await loadPlayerFiles();

  await loadPlayerScores();


  populateClubFilter();


  setupDatabaseFilterEvents();
if (
  submitDreamTeamBtn
) {

  submitDreamTeamBtn
    .addEventListener(
      "click",
      saveCurrentDreamTeam
    );
}
if (
  formationChangeBtn
) {

  formationChangeBtn
    .addEventListener(
      "click",
      chooseFormation
    );
}
  auditPlayerApiMatching();


  renderPlayerDatabase();


  await loadDreamTeam();
}


startDreamTeamPage();


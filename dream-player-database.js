import { db } from "./firebase.js?v=108";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


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


/* =========================
   PAGE ELEMENTS
========================= */

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


/* =========================
   CURRENT DATABASE STATE
========================= */

let allDatabasePlayers = [];

let scoresByPlayer =
  new Map();

let scoresByPlayerMatch =
  new Map();


/* =========================
   TEXT NORMALISATION
========================= */

function normaliseText(value) {
  return String(value || "")
    .replace(/Ø/g, "O")
    .replace(/ø/g, "o")
    .replace(/Æ/g, "AE")
    .replace(/æ/g, "ae")
    .replace(/Œ/g, "OE")
    .replace(/œ/g, "oe")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .replace(/ß/g, "ss")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .replace(/Þ/g, "Th")
    .replace(/þ/g, "th")
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


/* =========================
   EXACT PLAYER KEY
========================= */

function makePlayerKey(
  club,
  playerName
) {
  return (
    `${normaliseText(club)}|` +
    `${normaliseText(playerName)}`
  );
}


/* =========================
   ABBREVIATED PLAYER KEY
========================= */

function makePlayerMatchKey(
  club,
  playerName
) {
  const normalisedClub =
    normaliseText(club);

  const cleanedName =
    String(playerName || "")
      .replace(/Ø/g, "O")
      .replace(/ø/g, "o")
      .replace(/Æ/g, "AE")
      .replace(/æ/g, "ae")
      .replace(/Œ/g, "OE")
      .replace(/œ/g, "oe")
      .replace(/Ł/g, "L")
      .replace(/ł/g, "l")
      .replace(/ß/g, "ss")
      .replace(/Đ/g, "D")
      .replace(/đ/g, "d")
      .replace(/Þ/g, "Th")
      .replace(/þ/g, "th")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9\s]/g,
        ""
      )
      .trim()
      .toLowerCase();

  const parts =
    cleanedName
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "";
  }

  const firstInitial =
    parts[0].charAt(0);

  const surname =
    parts[
      parts.length - 1
    ];

  return (
    `${normalisedClub}|` +
    `${firstInitial}|` +
    `${surname}`
  );
}


/* =========================
   LOAD PLAYER SCORES
========================= */

async function loadPlayerScores() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "dream_team_player_scores"
      )
    );


  const scoreDocuments = [];

  snapshot.forEach(
    documentSnapshot => {

      scoreDocuments.push(
        documentSnapshot.data()
      );

    }
  );


  const roundIds =
    [
      ...new Set(
        scoreDocuments
          .map(
            item =>
              item.roundId
          )
          .filter(Boolean)
      )
    ]
      .sort();


  const currentRoundId =
    roundIds.length > 0
      ? roundIds[
          roundIds.length - 1
        ]
      : "";


  const exactScores =
    new Map();

  const matchScores =
    new Map();


  for (
    const scoreDocument of
    scoreDocuments
  ) {

    const key =
      makePlayerKey(
        scoreDocument.club,
        scoreDocument.playerName
      );


    const matchKey =
      makePlayerMatchKey(
        scoreDocument.club,
        scoreDocument.playerName
      );


    if (
      !exactScores.has(key)
    ) {

      exactScores.set(
        key,
        {
          weekScore: 0,
          overallScore: 0
        }
      );

    }


    const scores =
      exactScores.get(key);


    const weekScore =
      Number(
        scoreDocument.weekScore
      ) || 0;


    scores.overallScore +=
      weekScore;


    if (
      scoreDocument.roundId ===
      currentRoundId
    ) {

      scores.weekScore =
        weekScore;

    }


    if (matchKey) {

      matchScores.set(
        matchKey,
        scores
      );

    }

  }


  return {
    scoresByPlayer:
      exactScores,

    scoresByPlayerMatch:
      matchScores
  };
}


/* =========================
   LOAD PLAYER FILES
========================= */

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
        !Array.isArray(players)
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


/* =========================
   CLUB FILTER
========================= */

function populateClubFilter() {

  if (!databaseClubFilter) {
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
          a.localeCompare(b)
      );


  databaseClubFilter.innerHTML =
    `
      <option value="ALL">
        All clubs
      </option>
    `;


  clubs.forEach(club => {

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

  });

}


/* =========================
   FILTER PLAYERS
========================= */

function getFilteredPlayers() {

  const searchValue =
    normaliseText(
      databasePlayerSearch
        ?.value || ""
    );


  const selectedPosition =
    databasePositionFilter
      ?.value ||
    "ALL";


  const selectedClub =
    databaseClubFilter
      ?.value ||
    "ALL";


  return allDatabasePlayers
    .filter(player => {

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

    });

}


/* =========================
   GET PLAYER SCORE
========================= */

function getPlayerScores(
  player
) {

  const key =
    makePlayerKey(
      player.club,
      player.name
    );


  const matchKey =
    makePlayerMatchKey(
      player.club,
      player.name
    );


  return (
    scoresByPlayer.get(
      key
    ) ||
    scoresByPlayerMatch.get(
      matchKey
    ) ||
    {
      weekScore: 0,
      overallScore: 0
    }
  );
}


/* =========================
   DISPLAY ONE POSITION
========================= */

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
          )
            .toLowerCase();

        const clubB =
          String(
            b.club || ""
          )
            .toLowerCase();

        const nameA =
          String(
            a.name || ""
          )
            .toLowerCase();

        const nameB =
          String(
            b.name || ""
          )
            .toLowerCase();


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
        "p"
      );


    row.className =
      "player-database-row";


    row.textContent =
      `${player.name} — ` +
      `${player.club} — ` +
      `Rating: ${player.rating} — ` +
      `Week: ${scores.weekScore} — ` +
      `Overall: ${scores.overallScore}`;


    container.appendChild(
      row
    );

  }

}


/* =========================
   RENDER DATABASE
========================= */

function renderDatabase() {

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


    /*
      Hide an entire position section
      when there are no matching players.
    */

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


/* =========================
   FILTER EVENTS
========================= */

function setupFilterEvents() {

  if (
    databasePlayerSearch
  ) {

    databasePlayerSearch
      .addEventListener(
        "input",
        renderDatabase
      );

  }


  if (
    databasePositionFilter
  ) {

    databasePositionFilter
      .addEventListener(
        "change",
        renderDatabase
      );

  }


  if (
    databaseClubFilter
  ) {

    databaseClubFilter
      .addEventListener(
        "change",
        renderDatabase
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


          renderDatabase();

        }
      );

  }

}


/* =========================
   LOAD DATABASE
========================= */

async function loadPlayerDatabase() {

  try {

    const loadedScores =
      await loadPlayerScores();


    scoresByPlayer =
      loadedScores
        .scoresByPlayer;


    scoresByPlayerMatch =
      loadedScores
        .scoresByPlayerMatch;


  } catch (error) {

    console.error(
      "Could not load player scores:",
      error
    );

  }


  await loadPlayerFiles();


  populateClubFilter();

  setupFilterEvents();

  renderDatabase();

}


/* =========================
   START
========================= */

loadPlayerDatabase();
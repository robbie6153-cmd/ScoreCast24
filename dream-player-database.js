import { db } from "./firebase.js?v=108";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const PLAYER_FILES = [
  {
    file: "goalkeepers.json",
    elementId: "goalkeepers"
  },
  {
    file: "defenders.json",
    elementId: "defenders"
  },
  {
    file: "midfielders.json",
    elementId: "midfielders"
  },
  {
    file: "attackers.json",
    elementId: "attackers"
  }
];


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


  /*
    Find the most recent round.

    Because round IDs are formatted
    like:

    2026-week-01
    2026-week-02
    2026-week-03

    sorting them works correctly.
  */

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


  /*
    Two matching systems:

    1. Exact club + full name

    2. Club + first initial + surname

    This allows:

    Martin Ødegaard
    M. Ødegaard

    to match each other.
  */

  const scoresByPlayer =
    new Map();

  const scoresByPlayerMatch =
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


    /*
      Create the exact-name score record.
    */

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
      Every round contributes to
      the overall player score.
    */

    scores.overallScore +=
      weekScore;


    /*
      Only the latest round contributes
      to Current Week.
    */

    if (
      scoreDocument.roundId ===
      currentRoundId
    ) {

      scores.weekScore =
        weekScore;

    }


    /*
      Also store the abbreviated-name
      matching version.

      Example:

      Arsenal + Martin Ødegaard
      Arsenal + M. Ødegaard

      both become:

      arsenal|m|odegaard
    */

    if (matchKey) {

      scoresByPlayerMatch.set(
        matchKey,
        scores
      );

    }

  }


  return {
    scoresByPlayer,
    scoresByPlayerMatch
  };
}


/* =========================
   LOAD PLAYER DATABASE
========================= */

async function loadPlayerDatabase() {

  let scoresByPlayer =
    new Map();

  let scoresByPlayerMatch =
    new Map();


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


  for (
    const playerFile of
    PLAYER_FILES
  ) {

    const container =
      document.getElementById(
        playerFile.elementId
      );


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


      displayPlayers(
        container,
        players,
        scoresByPlayer,
        scoresByPlayerMatch
      );


    } catch (error) {

      console.error(
        error
      );


      if (container) {

        container.textContent =
          "Unable to load players.";

      }

    }

  }

}


/* =========================
   DISPLAY PLAYERS
========================= */

function displayPlayers(
  container,
  players,
  scoresByPlayer,
  scoresByPlayerMatch
) {

  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (
    !Array.isArray(players) ||
    players.length === 0
  ) {

    container.textContent =
      "No players available.";

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

    /*
      Try an exact full-name match first.
    */

    const key =
      makePlayerKey(
        player.club,
        player.name
      );


    /*
      If that fails, try:

      club + first initial + surname.
    */

    const matchKey =
      makePlayerMatchKey(
        player.club,
        player.name
      );


    const scores =
      scoresByPlayer.get(
        key
      ) ||
      scoresByPlayerMatch.get(
        matchKey
      ) ||
      {
        weekScore: 0,
        overallScore: 0
      };


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
   START
========================= */

loadPlayerDatabase();
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


async function loadPlayerScores() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "dream_team_player_scores"
      )
    );


  const scoreDocuments = [];

  snapshot.forEach(documentSnapshot => {

    scoreDocuments.push(
      documentSnapshot.data()
    );

  });


  /*
    Find the most recent round.

    Because the round IDs are formatted
    like 2026-week-01, 2026-week-02 etc,
    sorting them works correctly.
  */

  const roundIds =
    [
      ...new Set(
        scoreDocuments
          .map(item => item.roundId)
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


  const scoresByPlayer =
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
      the player's overall score.
    */

    scores.overallScore +=
      weekScore;


    /*
      Only the most recent round
      contributes to Current Week.
    */

    if (
      scoreDocument.roundId ===
      currentRoundId
    ) {
      scores.weekScore =
        weekScore;
    }

  }


  return scoresByPlayer;
}


async function loadPlayerDatabase() {

  let scoresByPlayer =
    new Map();


  try {

    scoresByPlayer =
      await loadPlayerScores();

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
        scoresByPlayer
      );


    } catch (error) {

      console.error(error);

      container.textContent =
        "Unable to load players.";

    }

  }

}


function displayPlayers(
  container,
  players,
  scoresByPlayer
) {

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
          (a.club || "")
            .toLowerCase();

        const clubB =
          (b.club || "")
            .toLowerCase();

        const nameA =
          (a.name || "")
            .toLowerCase();

        const nameB =
          (b.name || "")
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

    const key =
      makePlayerKey(
        player.club,
        player.name
      );


    const scores =
      scoresByPlayer.get(key) || {
        weekScore: 0,
        overallScore: 0
      };


    const row =
      document.createElement("p");


    row.className =
      "player-database-row";


    row.textContent =
      `${player.name} — ` +
      `${player.club} — ` +
      `Rating: ${player.rating} — ` +
      `Week: ${scores.weekScore} — ` +
      `Overall: ${scores.overallScore}`;


    container.appendChild(row);

  }

}


loadPlayerDatabase();
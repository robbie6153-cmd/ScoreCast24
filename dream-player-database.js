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


async function loadPlayerDatabase() {

  for (const playerFile of PLAYER_FILES) {

    const container =
      document.getElementById(playerFile.elementId);

    try {

      const response =
        await fetch(`${playerFile.file}?v=${Date.now()}`);

      if (!response.ok) {
        throw new Error(
          `Could not load ${playerFile.file}`
        );
      }

      const players =
        await response.json();

      displayPlayers(
        container,
        players
      );

    } catch (error) {

      console.error(error);

      container.textContent =
        "Unable to load players.";

    }

  }

}


function displayPlayers(container, players) {

  container.innerHTML = "";

  if (!Array.isArray(players) || players.length === 0) {

    container.textContent =
      "No players available.";

    return;
  }


  const sortedPlayers =
    [...players].sort((a, b) => {

      const clubA =
        (a.club || "").toLowerCase();

      const clubB =
        (b.club || "").toLowerCase();

      const nameA =
        (a.name || "").toLowerCase();

      const nameB =
        (b.name || "").toLowerCase();

      return (
        clubA.localeCompare(clubB) ||
        nameA.localeCompare(nameB)
      );

    });


  for (const player of sortedPlayers) {

    const row =
      document.createElement("p");

    row.className =
      "player-database-row";

    row.textContent =
      `${player.name} — ${player.club} — Rating: ${player.rating}`;

    container.appendChild(row);

  }

}


loadPlayerDatabase();
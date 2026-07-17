/*
  ScoreCast24 Football API connector

  This browser file does NOT contain the API-FOOTBALL key.

  It calls a Firebase Cloud Function, which will:
  1. hold the secret API key;
  2. contact API-FOOTBALL;
  3. return the football data safely.

  The Firebase Cloud Function will be created next.
*/

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-functions.js";

import {
  app
} from "./firebase.js?v=108";


const functions = getFunctions(
  app,
  "europe-west1"
);


/*
  Firebase callable-function connections
*/

const getFootballApiStatusFunction =
  httpsCallable(
    functions,
    "getFootballApiStatus"
  );

const getFootballFixturesFunction =
  httpsCallable(
    functions,
    "getFootballFixtures"
  );

const getFixturePlayerStatisticsFunction =
  httpsCallable(
    functions,
    "getFixturePlayerStatistics"
  );


/*
  Tests whether ScoreCast24 can successfully connect
  to API-FOOTBALL through Firebase.

  This request uses the API status endpoint.
*/

export async function testFootballApiConnection() {
  try {
    console.log(
      "Testing connection to API-FOOTBALL..."
    );

    const result =
      await getFootballApiStatusFunction();

    console.log(
      "API-FOOTBALL connection successful:",
      result.data
    );

    return result.data;

  } catch (error) {
    console.error(
      "API-FOOTBALL connection failed:",
      error
    );

    throw new Error(
      error.message ||
      "Could not connect to API-FOOTBALL."
    );
  }
}


/*
  Retrieves fixtures for one league and season.

  Example:

  getFootballFixtures({
    leagueId: 39,
    season: 2025,
    from: "2026-05-01",
    to: "2026-05-31"
  });

  API-FOOTBALL league ID 39 is normally the
  English Premier League, but IDs should always be
  confirmed through the API.
*/

export async function getFootballFixtures({
  leagueId,
  season,
  from = "",
  to = "",
  status = ""
} = {}) {
  const numericLeagueId =
    Number(leagueId);

  const numericSeason =
    Number(season);

  if (
    !Number.isInteger(numericLeagueId) ||
    numericLeagueId <= 0
  ) {
    throw new Error(
      "A valid football league ID is required."
    );
  }

  if (
    !Number.isInteger(numericSeason) ||
    numericSeason < 2000
  ) {
    throw new Error(
      "A valid football season is required."
    );
  }

  try {
    const result =
      await getFootballFixturesFunction({
        leagueId: numericLeagueId,
        season: numericSeason,
        from: String(from || ""),
        to: String(to || ""),
        status: String(status || "")
      });

    const fixtures =
      Array.isArray(result.data?.fixtures)
        ? result.data.fixtures
        : [];

    console.log(
      `${fixtures.length} fixtures received:`,
      fixtures
    );

    return fixtures;

  } catch (error) {
    console.error(
      "Fixture request failed:",
      error
    );

    throw new Error(
      error.message ||
      "Could not retrieve football fixtures."
    );
  }
}


/*
  Retrieves all available player statistics for
  one fixture.

  The fixture ID comes from the fixtures endpoint.

  Example:

  getFixturePlayerStatistics(1234567);
*/

export async function getFixturePlayerStatistics(
  fixtureId
) {
  const numericFixtureId =
    Number(fixtureId);

  if (
    !Number.isInteger(numericFixtureId) ||
    numericFixtureId <= 0
  ) {
    throw new Error(
      "A valid fixture ID is required."
    );
  }

  try {
    console.log(
      `Requesting player statistics for fixture ${numericFixtureId}...`
    );

    const result =
      await getFixturePlayerStatisticsFunction({
        fixtureId: numericFixtureId
      });

    const teams =
      Array.isArray(result.data?.teams)
        ? result.data.teams
        : [];

    console.log(
      "Fixture player statistics received:",
      teams
    );

    return teams;

  } catch (error) {
    console.error(
      "Player-statistics request failed:",
      error
    );

    throw new Error(
      error.message ||
      "Could not retrieve fixture player statistics."
    );
  }
}


/*
  Produces a simpler list of players from the API response.

  This does not calculate Dream Team points yet.

  It helps us inspect:
  - player IDs;
  - ratings;
  - goals;
  - assists;
  - cards;
  - minutes;
  - saves;
  - goals conceded.
*/

export function flattenFixturePlayerStatistics(
  teams = []
) {
  if (!Array.isArray(teams)) {
    return [];
  }

  return teams.flatMap(teamEntry => {
    const team =
      teamEntry?.team || {};

    const players =
      Array.isArray(teamEntry?.players)
        ? teamEntry.players
        : [];

    return players.map(playerEntry => {
      const player =
        playerEntry?.player || {};

      const statistics =
        Array.isArray(playerEntry?.statistics)
          ? playerEntry.statistics[0] || {}
          : {};

      return {
        apiPlayerId:
          player.id ?? null,

        playerName:
          player.name || "",

        apiTeamId:
          team.id ?? null,

        teamName:
          team.name || "",

        position:
          statistics.games?.position || "",

        minutes:
          Number(
            statistics.games?.minutes
          ) || 0,

        rating:
          statistics.games?.rating === null ||
          statistics.games?.rating === undefined
            ? null
            : Number(
                statistics.games.rating
              ),

        substitute:
          Boolean(
            statistics.games?.substitute
          ),

        captain:
          Boolean(
            statistics.games?.captain
          ),

        goals:
          Number(
            statistics.goals?.total
          ) || 0,

        assists:
          Number(
            statistics.goals?.assists
          ) || 0,

        goalsConceded:
          Number(
            statistics.goals?.conceded
          ) || 0,

        saves:
          Number(
            statistics.goals?.saves
          ) || 0,

        yellowCards:
          Number(
            statistics.cards?.yellow
          ) || 0,

        yellowRedCards:
          Number(
            statistics.cards?.yellowred
          ) || 0,

        redCards:
          Number(
            statistics.cards?.red
          ) || 0,

        penaltiesSaved:
          Number(
            statistics.penalty?.saved
          ) || 0,

        rawStatistics:
          statistics
      };
    });
  });
}


/*
  Handy combined test:

  1. Request fixture player statistics.
  2. Flatten the response.
  3. Display the result as a console table.

  Example:

  testFixturePlayerStatistics(1234567);
*/

export async function testFixturePlayerStatistics(
  fixtureId
) {
  const teams =
    await getFixturePlayerStatistics(
      fixtureId
    );

  const players =
    flattenFixturePlayerStatistics(
      teams
    );

  console.table(
    players.map(player => ({
      playerId: player.apiPlayerId,
      player: player.playerName,
      team: player.teamName,
      position: player.position,
      minutes: player.minutes,
      rating: player.rating,
      goals: player.goals,
      assists: player.assists,
      conceded: player.goalsConceded,
      saves: player.saves,
      yellow: player.yellowCards,
      yellowRed: player.yellowRedCards,
      red: player.redCards,
      penaltiesSaved:
        player.penaltiesSaved
    }))
  );

  return players;
}


/*
  Temporary browser-console access.

  After this module is loaded by a page, these functions
  can be run from the browser console, for example:

  footballApiTest.connection()

  footballApiTest.fixturePlayers(1234567)
*/

window.footballApiTest = {
  connection:
    testFootballApiConnection,

  fixtures:
    getFootballFixtures,

  fixturePlayers:
    testFixturePlayerStatistics
};
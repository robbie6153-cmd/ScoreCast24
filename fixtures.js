import { db } from "./firebase.js?v=108";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  resultsByRound
} from "./results.js?v=1";


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const premierLeagueResults =
  document.getElementById(
    "premierLeagueResults"
  );

const championshipResults =
  document.getElementById(
    "championshipResults"
  );


/* =====================================================
   CURRENT SCORE PREDICTION ROUND
===================================================== */

const CURRENT_SCORE_ROUND =
  "English League Week Two";


/* =====================================================
   CHAMPIONSHIP FIXTURES

   Week Two fixture IDs 11-22.
===================================================== */

const championshipFixtures = [
  {
    id: "11",
    home: "Birmingham City",
    away: "Bristol City"
  },
  {
    id: "12",
    home: "Lincoln City",
    away: "Portsmouth"
  },
  {
    id: "13",
    home: "Millwall",
    away: "Norwich City"
  },
  {
    id: "14",
    home: "Blackburn Rovers",
    away: "Middlesbrough"
  },
  {
    id: "15",
    home: "Derby County",
    away: "Cardiff City"
  },
  {
    id: "16",
    home: "Preston North End",
    away: "Wolverhampton Wanderers"
  },
  {
    id: "17",
    home: "Queens Park Rangers",
    away: "Bolton Wanderers"
  },
  {
    id: "18",
    home: "Southampton",
    away: "Stoke City"
  },
  {
    id: "19",
    home: "Swansea City",
    away: "Sheffield United"
  },
  {
    id: "20",
    home: "West Ham United",
    away: "Charlton Athletic"
  },
  {
    id: "21",
    home: "Wrexham",
    away: "Watford"
  },
  {
    id: "22",
    home: "West Bromwich Albion",
    away: "Burnley"
  }
];


/* =====================================================
   HTML SAFETY
===================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =====================================================
   DREAM TEAM RATING ROUNDING

   ScoreCast24 rule:

   6.4 -> 6
   6.5 -> 6
   6.6 -> 7
===================================================== */

function roundDreamRating(rating) {
  if (
    rating === null ||
    rating === undefined ||
    rating === ""
  ) {
    return null;
  }

  const numeric =
    Number(rating);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  const limited =
    Math.max(
      0,
      Math.min(10, numeric)
    );

  const whole =
    Math.floor(limited);

  const decimal =
    limited - whole;

  if (decimal <= 0.5) {
    return whole;
  }

  return Math.min(
    10,
    whole + 1
  );
}


/* =====================================================
   PLAYER STATISTICS
===================================================== */

function getPlayerStatistics(
  playerRecord
) {
  if (
    !Array.isArray(
      playerRecord?.statistics
    )
  ) {
    return null;
  }

  return (
    playerRecord.statistics[0] ||
    null
  );
}


/*
  Only display players who actually appeared.
*/

function playerAppeared(
  playerRecord
) {
  const stats =
    getPlayerStatistics(
      playerRecord
    );

  if (!stats) {
    return false;
  }

  const minutes =
    Number(
      stats?.games?.minutes || 0
    );

  const rating =
    stats?.games?.rating;

  return (
    minutes > 0 ||
    (
      rating !== null &&
      rating !== undefined &&
      rating !== ""
    )
  );
}


/* =====================================================
   STARTER OR SUBSTITUTE
===================================================== */

function playerWasSubstitute(
  playerRecord
) {
  const stats =
    getPlayerStatistics(
      playerRecord
    );

  return (
    stats?.games?.substitute === true
  );
}


/* =====================================================
   PLAYER EVENTS
===================================================== */

function getPlayerEvents(
  playerRecord
) {
  const stats =
    getPlayerStatistics(
      playerRecord
    );

  if (!stats) {
    return [];
  }

  const events = [];

  const goals =
    Number(
      stats?.goals?.total || 0
    );

  const assists =
    Number(
      stats?.goals?.assists || 0
    );

  const yellowCards =
    Number(
      stats?.cards?.yellow || 0
    );

  const yellowRedCards =
    Number(
      stats?.cards?.yellowred || 0
    );

  const redCards =
    Number(
      stats?.cards?.red || 0
    );

  const penaltiesSaved =
    Number(
      stats?.penalty?.saved || 0
    );


  if (goals === 1) {
    events.push(
      "Goal"
    );
  }

  if (goals > 1) {
    events.push(
      `${goals} Goals`
    );
  }


  if (assists === 1) {
    events.push(
      "Assist"
    );
  }

  if (assists > 1) {
    events.push(
      `${assists} Assists`
    );
  }


  if (
    yellowRedCards > 0
  ) {
    events.push(
      "Sent Off"
    );
  } else if (
    redCards > 0
  ) {
    events.push(
      "Sent Off"
    );
  } else if (
    yellowCards === 1
  ) {
    events.push(
      "Booked"
    );
  } else if (
    yellowCards > 1
  ) {
    events.push(
      `${yellowCards} Bookings`
    );
  }


  if (penaltiesSaved === 1) {
    events.push(
      "Penalty Saved"
    );
  }

  if (penaltiesSaved > 1) {
    events.push(
      `${penaltiesSaved} Penalties Saved`
    );
  }


  return events;
}


/* =====================================================
   PLAYER DISPLAY DATA
===================================================== */

function preparePlayer(
  playerRecord
) {
  const stats =
    getPlayerStatistics(
      playerRecord
    );

  const suppliedRating =
    stats?.games?.rating;

  const numericSuppliedRating =
    Number(
      suppliedRating
    );

  return {
    id:
      playerRecord?.player?.id || "",

    name:
      playerRecord?.player?.name ||
      "Unknown Player",

    rating:
      roundDreamRating(
        suppliedRating
      ),

    suppliedRating:
      Number.isFinite(
        numericSuppliedRating
      )
        ? numericSuppliedRating
        : null,

    substitute:
      playerWasSubstitute(
        playerRecord
      ),

    events:
      getPlayerEvents(
        playerRecord
      )
  };
}


/* =====================================================
   MAN OF THE MATCH

   Use the original API rating rather than the
   rounded ScoreCast24 display rating.

   Example:
   7.6 and 8.4 may both display as 8,
   but 8.4 remains the higher API performance.
===================================================== */

function findManOfTheMatch(
  playerTeams
) {
  let bestPlayer = null;

  playerTeams.forEach(
    teamRecord => {

      const players =
        Array.isArray(
          teamRecord?.players
        )
          ? teamRecord.players
          : [];

      players
        .filter(
          playerAppeared
        )
        .forEach(
          playerRecord => {

            const player =
              preparePlayer(
                playerRecord
              );

            if (
              player.suppliedRating ===
              null
            ) {
              return;
            }

            if (
              !bestPlayer ||
              player.suppliedRating >
                bestPlayer.suppliedRating
            ) {
              bestPlayer =
                player;
            }
          }
        );
    }
  );

  return bestPlayer;
}


/* =====================================================
   PLAYER TEXT
===================================================== */

function renderPlayer(
  player
) {
  const eventsText =
    player.events.length
      ? ` (${player.events
          .map(escapeHtml)
          .join(", ")})`
      : "";

  const ratingText =
    player.rating === null
      ? "-"
      : player.rating;

  return `
    <span class="dream-match-player">
      ${escapeHtml(
        player.name
      )}
      ${escapeHtml(
        ratingText
      )}${eventsText}
    </span>
  `;
}


/* =====================================================
   TEAM PLAYERS

   Starting XI and substitutes are displayed
   separately.
===================================================== */

function renderTeamPlayers(
  teamRecord,
  fallbackTeamName
) {
  const teamName =
    teamRecord?.team?.name ||
    fallbackTeamName ||
    "Team";

  const players =
    Array.isArray(
      teamRecord?.players
    )
      ? teamRecord.players
      : [];

  const appearedPlayers =
    players
      .filter(
        playerAppeared
      )
      .map(
        preparePlayer
      );


  if (
    !appearedPlayers.length
  ) {
    return `
      <div class="dream-result-team">

        <strong>
          ${escapeHtml(teamName)}:
        </strong>

        Player ratings unavailable.

      </div>
    `;
  }


  const starters =
    appearedPlayers.filter(
      player =>
        !player.substitute
    );

  const substitutes =
    appearedPlayers.filter(
      player =>
        player.substitute
    );


  const starterHtml =
    starters.length
      ? starters
          .map(
            renderPlayer
          )
          .join(", ")
      : "Starting XI unavailable";


  const substituteHtml =
    substitutes.length
      ? `
        <div class="dream-result-subs">
          <strong>
            Substitutes:
          </strong>

          ${substitutes
            .map(
              renderPlayer
            )
            .join(", ")}
        </div>
      `
      : "";


  return `
    <div class="dream-result-team">

      <div class="dream-result-starting-xi">

        <strong class="dream-result-team-name">
          ${escapeHtml(
            teamName
          )}:
        </strong>

        ${starterHtml}

      </div>

      ${substituteHtml}

    </div>
  `;
}


/* =====================================================
   FIND TEAM DATA
===================================================== */

function findTeamRecord(
  playerTeams,
  teamId,
  teamName
) {
  if (
    !Array.isArray(
      playerTeams
    )
  ) {
    return null;
  }

  const numericTeamId =
    Number(teamId);

  if (
    Number.isFinite(
      numericTeamId
    )
  ) {
    const byId =
      playerTeams.find(
        record =>
          Number(
            record?.team?.id
          ) ===
          numericTeamId
      );

    if (byId) {
      return byId;
    }
  }


  const normalisedName =
    String(teamName || "")
      .trim()
      .toLowerCase();

  if (normalisedName) {
    const byName =
      playerTeams.find(
        record =>
          String(
            record?.team?.name || ""
          )
            .trim()
            .toLowerCase() ===
          normalisedName
      );

    if (byName) {
      return byName;
    }
  }


  return null;
}


/* =====================================================
   PREMIER LEAGUE FIXTURE CARD
===================================================== */

function renderPremierFixture(
  fixture
) {
  const playerTeams =
    Array.isArray(
      fixture.playerTeams
    )
      ? fixture.playerTeams
      : [];


  const homeTeamRecord =
    findTeamRecord(
      playerTeams,
      fixture.homeTeamId,
      fixture.homeTeam
    );


  const awayTeamRecord =
    findTeamRecord(
      playerTeams,
      fixture.awayTeamId,
      fixture.awayTeam
    );


  const manOfTheMatch =
    findManOfTheMatch(
      playerTeams
    );


  const homeGoals =
    Number.isFinite(
      Number(
        fixture.homeGoals
      )
    )
      ? Number(
          fixture.homeGoals
        )
      : "-";


  const awayGoals =
    Number.isFinite(
      Number(
        fixture.awayGoals
      )
    )
      ? Number(
          fixture.awayGoals
        )
      : "-";


  const manOfTheMatchHtml =
    manOfTheMatch
      ? `
        <div class="dream-result-motm">
          <strong>
            🏅 Man of the Match:
            ${escapeHtml(
              manOfTheMatch.name
            )}
          </strong>
        </div>
      `
      : "";


  return `
    <article
      class="fixture-card dream-result-card"
    >

      <div class="dream-result-score">

        <strong>
          ${escapeHtml(
            fixture.homeTeam
          )}
          ${escapeHtml(
            homeGoals
          )}
          -
          ${escapeHtml(
            awayGoals
          )}
          ${escapeHtml(
            fixture.awayTeam
          )}
        </strong>

      </div>


      <div class="dream-result-status">
        Premier League · Full Time
      </div>


      ${renderTeamPlayers(
        homeTeamRecord,
        fixture.homeTeam
      )}


      ${renderTeamPlayers(
        awayTeamRecord,
        fixture.awayTeam
      )}


      ${manOfTheMatchHtml}

    </article>
  `;
}


/* =====================================================
   PREMIER LEAGUE RESULTS
===================================================== */

async function loadPremierLeagueResults() {
  if (!premierLeagueResults) {
    return;
  }


  premierLeagueResults.innerHTML = `
    <p>
      Loading Premier League results...
    </p>
  `;


  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "dream_team_fixtures"
        )
      );


    const fixtures =
      snapshot.docs
        .map(
          documentSnapshot => ({
            id:
              documentSnapshot.id,

            ...documentSnapshot.data()
          })
        )
        .filter(
          fixture =>
            fixture.finished ===
            true
        )
        .sort(
          (a, b) => {

            const dateA =
              new Date(
                a.kickoff || 0
              ).getTime();

            const dateB =
              new Date(
                b.kickoff || 0
              ).getTime();

            return (
              dateA - dateB
            );
          }
        );


    if (!fixtures.length) {
      premierLeagueResults.innerHTML = `
        <p class="leaderboard-empty-message">
          No completed Premier League matches yet.
        </p>
      `;

      return;
    }


    premierLeagueResults.innerHTML =
      fixtures
        .map(
          renderPremierFixture
        )
        .join("");


  } catch (error) {
    console.error(
      "Premier League results error:",
      error
    );

    premierLeagueResults.innerHTML = `
      <p class="leaderboard-empty-message">
        Premier League results could not be loaded.
      </p>
    `;
  }
}


/* =====================================================
   SCORE PREDICTION RESULT FORMAT
===================================================== */

function extractScore(
  result
) {
  if (!result) {
    return null;
  }


  if (
    Array.isArray(result) &&
    result.length >= 2
  ) {
    const home =
      Number(
        result[0]
      );

    const away =
      Number(
        result[1]
      );

    if (
      Number.isFinite(home) &&
      Number.isFinite(away)
    ) {
      return {
        home,
        away
      };
    }
  }


  const possibleHomeValues = [
    result.home,
    result.homeScore,
    result.homeGoals,
    result.home_score,
    result.home_goals
  ];


  const possibleAwayValues = [
    result.away,
    result.awayScore,
    result.awayGoals,
    result.away_score,
    result.away_goals
  ];


  const homeValue =
    possibleHomeValues.find(
      value =>
        value !== null &&
        value !== undefined &&
        value !== ""
    );


  const awayValue =
    possibleAwayValues.find(
      value =>
        value !== null &&
        value !== undefined &&
        value !== ""
    );


  const home =
    Number(
      homeValue
    );

  const away =
    Number(
      awayValue
    );


  if (
    !Number.isFinite(home) ||
    !Number.isFinite(away)
  ) {
    return null;
  }


  return {
    home,
    away
  };
}


/* =====================================================
   CHAMPIONSHIP RESULTS
===================================================== */

function loadChampionshipResults() {
  if (!championshipResults) {
    return;
  }


  const roundResults =
    resultsByRound[
      CURRENT_SCORE_ROUND
    ] || {};


  const completed =
    championshipFixtures
      .map(
        fixture => {

          const result =
            roundResults[
              fixture.id
            ];

          const score =
            extractScore(
              result
            );

          return {
            ...fixture,
            score
          };
        }
      )
      .filter(
        fixture =>
          fixture.score !== null
      );


  if (!completed.length) {
    championshipResults.innerHTML = `
      <p class="leaderboard-empty-message">
        No completed Championship matches yet.
      </p>
    `;

    return;
  }


  championshipResults.innerHTML =
    completed
      .map(
        fixture => `
          <article class="fixture-card">

            <strong>
              ${escapeHtml(
                fixture.home
              )}
              ${fixture.score.home}
              -
              ${fixture.score.away}
              ${escapeHtml(
                fixture.away
              )}
            </strong>

            <br>

            <span>
              Championship · Full Time
            </span>

          </article>
        `
      )
      .join("");
}


/* =====================================================
   START PAGE
===================================================== */

loadPremierLeagueResults();

loadChampionshipResults();
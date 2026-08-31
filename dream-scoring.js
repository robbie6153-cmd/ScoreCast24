/*
  ScoreCast24 Dream Team scoring system

  This file only calculates points from supplied match statistics.
  It does not fetch football API data and does not update Firestore.

  The football API integration should convert its data into the
  format expected by calculateDreamTeamPlayerScore().
*/


export const DREAM_SCORING_RULES = {
  goals: {
    Goalkeeper: 7,
    Defender: 6,
    Midfielder: 5,
    Attacker: 4
  },

  assist: 3,
  hatTrickBonus: 5,
  manOfTheMatch: 5,

  penaltySaved: 5,

  cleanSheet: {
    Goalkeeper: 5,
    Defender: 3
  },

  cards: {
    yellow: -3,
    red: -5
  },

  ratings: {
    10: 5,
    9: 4,
    8: 3,
    7: 2,
    6: 1,
    5: 0,
    4: -1,
    3: -2,
    2: -3,
    1: -4,
    0: -5
  }
};


/*
  Converts different API position names into the position names
  used by ScoreCast24.
*/

export function normaliseDreamTeamPosition(position) {
  const value = String(position || "")
    .trim()
    .toLowerCase();

const positionNames = {
  g: "Goalkeeper",
  gk: "Goalkeeper",
  goalkeeper: "Goalkeeper",
  goalkeepers: "Goalkeeper",

  d: "Defender",
  def: "Defender",
  df: "Defender",
  defender: "Defender",
  defenders: "Defender",

  m: "Midfielder",
  mid: "Midfielder",
  mf: "Midfielder",
  midfielder: "Midfielder",
  midfielders: "Midfielder",

  f: "Attacker",
  att: "Attacker",
  fw: "Attacker",
  st: "Attacker",
  forward: "Attacker",
  forwards: "Attacker",
  striker: "Attacker",
  attacker: "Attacker",
  attackers: "Attacker"
};

  return positionNames[value] || position;
}


/*
  ScoreCast24 rating-rounding rule:

  6.4 becomes 6
  6.5 becomes 6
  6.6 becomes 7

  This deliberately differs from Math.round(), which would
  round 6.5 up to 7.
*/

export function roundDreamTeamRating(rating) {
  if (
    rating === null ||
    rating === undefined ||
    rating === ""
  ) {
    return null;
  }

  const numericRating = Number(rating);

  if (!Number.isFinite(numericRating)) {
    return null;
  }

  const limitedRating =
    Math.max(0, Math.min(10, numericRating));

  const wholeNumber =
    Math.floor(limitedRating);

  const decimal =
    limitedRating - wholeNumber;

  if (decimal <= 0.5) {
    return wholeNumber;
  }

  return Math.min(10, wholeNumber + 1);
}


/*
  Returns rating points.

  A missing API rating receives zero points.
  It must not be treated as a genuine 0/10 rating.
*/

export function calculateRatingPoints(rating) {
  const roundedRating =
    roundDreamTeamRating(rating);

  if (roundedRating === null) {
    return {
      suppliedRating: null,
      roundedRating: null,
      points: 0
    };
  }

  return {
    suppliedRating: Number(rating),
    roundedRating,
    points:
      DREAM_SCORING_RULES.ratings[roundedRating] ?? 0
  };
}


/*
 Goalkeeper and defender goals-conceded scoring:

  0 conceded: clean-sheet points are handled separately
  1 conceded: 0 points
  2 conceded: -1 point
  3 conceded: -2 points
  4 conceded: -3 points
  5 conceded: -4 points
*/

export function calculateGoalsConcededPoints(
  goalsConceded
) {
  const conceded =
    Math.max(0, Math.floor(Number(goalsConceded) || 0));

  if (conceded <= 1) {
    return 0;
  }

  return -(conceded - 1);
}


/*
  Makes sure API values such as null, undefined or negative
  numbers do not cause incorrect scoring.
*/

function safeWholeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.floor(number));
}


/*
  Main individual-player scoring function.

  Expected input example:

  {
    playerId: "player-123",
    playerName: "Example Player",
    position: "Attacker",
    rating: 9,
    goals: 3,
    assists: 1,
    yellowCards: 1,
    redCard: false,
    sentOffForTwoYellows: false,
    manOfTheMatch: true,
    penaltiesSaved: 0,
    cleanSheet: false,
    goalsConceded: 0
  }

  cleanSheet should be supplied by the API-processing code.

  goalsConceded should eventually mean the number of goals
  charged to that goalkeeper under the chosen API rules.
*/

export function calculateDreamTeamPlayerScore(stats = {}) {
  const position =
    normaliseDreamTeamPosition(stats.position);

  const goals =
    safeWholeNumber(stats.goals);

  const assists =
    safeWholeNumber(stats.assists);

  const yellowCards =
    safeWholeNumber(stats.yellowCards);

  const penaltiesSaved =
    safeWholeNumber(stats.penaltiesSaved);

  const goalsConceded =
    safeWholeNumber(stats.goalsConceded);

  const redCard =
    Boolean(stats.redCard);

  const sentOffForTwoYellows =
    Boolean(stats.sentOffForTwoYellows);

  const manOfTheMatch =
    Boolean(stats.manOfTheMatch);

  const cleanSheet =
    Boolean(stats.cleanSheet);

  const ratingResult =
    calculateRatingPoints(stats.rating);

  const goalValue =
    DREAM_SCORING_RULES.goals[position] || 0;

  const goalPoints =
    goals * goalValue;

  const assistPoints =
    assists * DREAM_SCORING_RULES.assist;

  /*
    A player receives one hat-trick bonus when scoring
    three or more goals.

    Four, five or six goals still produce one +5 bonus.
  */

  const hatTrickPoints =
    goals >= 3
      ? DREAM_SCORING_RULES.hatTrickBonus
      : 0;

  const manOfTheMatchPoints =
    manOfTheMatch
      ? DREAM_SCORING_RULES.manOfTheMatch
      : 0;

  /*
    A red card, including a dismissal for two yellows,
    produces one -5 deduction.

    Yellow-card deductions are not added on top of the red
    deduction when the player has been dismissed.
  */

  let cardPoints = 0;

  if (redCard || sentOffForTwoYellows) {
    cardPoints =
      DREAM_SCORING_RULES.cards.red;
  } else {
    cardPoints =
      yellowCards *
      DREAM_SCORING_RULES.cards.yellow;
  }

  let penaltySavePoints = 0;
  let cleanSheetPoints = 0;
  let goalsConcededPoints = 0;

if (position === "Goalkeeper") {
  penaltySavePoints =
    penaltiesSaved *
    DREAM_SCORING_RULES.penaltySaved;

  if (cleanSheet) {
    cleanSheetPoints =
      DREAM_SCORING_RULES.cleanSheet.Goalkeeper;
  }

  goalsConcededPoints =
    calculateGoalsConcededPoints(
      goalsConceded
    );
}


if (position === "Defender") {
  if (cleanSheet) {
    cleanSheetPoints =
      DREAM_SCORING_RULES.cleanSheet.Defender;
  }

  goalsConcededPoints =
    calculateGoalsConcededPoints(
      goalsConceded
    );
}

  const breakdown = {
    goals: goalPoints,
    assists: assistPoints,
    hatTrick: hatTrickPoints,
    manOfTheMatch: manOfTheMatchPoints,
    rating: ratingResult.points,
    cards: cardPoints,
    penaltiesSaved: penaltySavePoints,
    cleanSheet: cleanSheetPoints,
    goalsConceded: goalsConcededPoints
  };

  const totalPoints =
    Object.values(breakdown).reduce(
      (total, points) => total + points,
      0
    );

  return {
    playerId: stats.playerId || "",
    playerName: stats.playerName || "",
    position,

    suppliedRating:
      ratingResult.suppliedRating,

    roundedRating:
      ratingResult.roundedRating,

    stats: {
      goals,
      assists,
      yellowCards,
      redCard,
      sentOffForTwoYellows,
      manOfTheMatch,
      penaltiesSaved,
      cleanSheet,
      goalsConceded
    },

    breakdown,
    totalPoints
  };
}


/*
  Calculates the total score for an array of players.

  This will be useful when calculating a submitted Dream Team.
*/

export function calculateDreamTeamTotal(
  playerMatchStats = []
) {
  if (!Array.isArray(playerMatchStats)) {
    return {
      players: [],
      totalPoints: 0
    };
  }

  const players =
    playerMatchStats.map(playerStats => {
      return calculateDreamTeamPlayerScore(
        playerStats
      );
    });

  const totalPoints =
    players.reduce(
      (total, player) => {
        return total + player.totalPoints;
      },
      0
    );

  return {
    players,
    totalPoints
  };
}
  
export const DREAM_CONFIG = {
  /*
    Core selection rules
  */

  maxPlayers: 11,
  maxRating: 888,
  maxFromOneClub: 2,

  /*
    First weekly lock period

    Locks:
    Friday 21 August 2026 at 7:00 pm

    Reopens:
    Monday 24 August 2026 at 11:59 pm
  */

  firstLockTime:
    "2026-08-21T19:00:00+01:00",

  firstReopenTime:
    "2026-08-24T23:59:00+01:00",

  /*
    Player database files

    Increase the version number after changing
    one of the JSON files.
  */

  playerFiles: [
    "./goalkeepers.json?v=1",
    "./defenders.json?v=1",
    "./midfielders.json?v=1",
    "./attackers.json?v=1"
  ],

  /*
    Valid formations
  */

  formations: {
    "4-4-2": {
      Goalkeeper: 1,
      Defender: 4,
      Midfielder: 4,
      Attacker: 2
    },

    "4-3-3": {
      Goalkeeper: 1,
      Defender: 4,
      Midfielder: 3,
      Attacker: 3
    },

    "4-5-1": {
      Goalkeeper: 1,
      Defender: 4,
      Midfielder: 5,
      Attacker: 1
    },

    "5-3-2": {
      Goalkeeper: 1,
      Defender: 5,
      Midfielder: 3,
      Attacker: 2
    },

    "5-4-1": {
      Goalkeeper: 1,
      Defender: 5,
      Midfielder: 4,
      Attacker: 1
    },

    "3-4-3": {
      Goalkeeper: 1,
      Defender: 3,
      Midfielder: 4,
      Attacker: 3
    },

    "3-5-2": {
      Goalkeeper: 1,
      Defender: 3,
      Midfielder: 5,
      Attacker: 2
    }
  },

  /*
    Weekly rollover popup
  */

  rolloverTitle:
    "Your new Dream Team week is open",

  rolloverQuestion:
    "Do you wish to make any changes to your team?",

  changeTeamButton:
    "Yes — make changes",

  keepTeamButton:
    "No — keep the same team",

  /*
    User-facing messages
  */

  messages: {
    locked:
      "Dream Team selections are locked while this week's matches are being played. Team selection reopens {reopenTime}.",

    lockedShort:
      "Dream Team selections are currently locked.",

    loadedLocked:
      "Your submitted team has been loaded. Selections are currently locked.",

    loadedEditable:
      "Your submitted team has been loaded. You may make changes before the deadline.",

    previousLoaded:
      "Last week's team has been loaded. Make any changes and submit it before the deadline.",

    previousInvalid:
      "Last week's team no longer meets the selection rules. Please make the required changes and submit it manually.",

    invalidTeam:
      "Your team does not currently meet all the rules.",

    submitError:
      "Your team could not be submitted. Please try again."
  }
};
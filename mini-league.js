import {
  auth,
  db
} from "./firebase.js?v=108";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-functions.js";

import {
  resultsByRound
} from "./results.js?v=2";

/* =========================
   FIREBASE FUNCTIONS
========================= */

const functions =
  getFunctions(
    undefined,
    "europe-west1"
  );

const createJoinMiniLeagueCheckout =
  httpsCallable(
    functions,
    "createJoinMiniLeagueCheckout"
  );


/* =========================
   PAGE ELEMENTS
========================= */

const miniLeagueTitle =
  document.getElementById(
    "miniLeagueTitle"
  );

const miniLeagueMemberCount =
  document.getElementById(
    "miniLeagueMemberCount"
  );

const joinMiniLeagueBtn =
  document.getElementById(
    "joinMiniLeagueBtn"
  );

const joinMiniLeagueInfo =
  document.getElementById(
    "joinMiniLeagueInfo"
  );

const miniLeagueLeaderboard =
  document.getElementById(
    "miniLeagueLeaderboard"
  );

const miniLeagueMessage =
  document.getElementById(
    "miniLeagueMessage"
  );

const miniWeekLeaderboardTab =
  document.getElementById(
    "miniWeekLeaderboardTab"
  );

const miniSeasonLeaderboardTab =
  document.getElementById(
    "miniSeasonLeaderboardTab"
  );


/* =========================
   CURRENT ROUND
========================= */

const currentRound =
  "English League Week 4";

const currentWeekHeading =
  "Week 4 Leaderboard";




/* =========================
   PAGE STATE
========================= */

let miniWeekLeaderboardRows = [];

let miniSeasonLeaderboardRows = [];


const pageParameters =
  new URLSearchParams(
    window.location.search
  );


const myUsername =
  (
    localStorage.getItem(
      "scorecast24Username"
    ) || ""
  )
    .trim()
    .toLowerCase();


const miniLeagueId =
  pageParameters.get("id");


const paymentStatus =
  pageParameters.get("payment");


let currentUser = null;

let leagueData = null;


/* =========================
   SHOW MESSAGE
========================= */

function showMessage(message) {

  if (!miniLeagueMessage) {
    return;
  }

  miniLeagueMessage.textContent =
    message;
}


/* =========================
   SAFE HTML
========================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   NORMALISE USERNAME
========================= */

function normaliseUsername(username) {

  return String(
    username || ""
  )
    .trim()
    .toLowerCase();

}


/* =========================
   CALCULATE ROUND POINTS
========================= */

function calculatePoints(
  predictions = [],
  round
) {

  const roundResults =
    resultsByRound[round];

  if (!roundResults) {
    return null;
  }


  let total = 0;

  let hasAnyResult = false;


  predictions.forEach(
    prediction => {

      const result =
        roundResults[
          prediction.fixtureId
        ];


      if (!result) {
        return;
      }


      /*
        Deliberately catches both
        null and undefined.
      */

      if (
        result.homeScore == null ||
        result.awayScore == null
      ) {
        return;
      }


      hasAnyResult = true;


      const predictedHome =
        Number(
          prediction.predictedHome
        );

      const predictedAway =
        Number(
          prediction.predictedAway
        );

      const actualHome =
        Number(
          result.homeScore
        );

      const actualAway =
        Number(
          result.awayScore
        );


      /* EXACT SCORE = 5 */

      if (
        predictedHome === actualHome &&
        predictedAway === actualAway
      ) {

        total += 5;

        return;
      }


      /* DRAW = 3 */

      if (
        predictedHome === predictedAway &&
        actualHome === actualAway
      ) {

        total += 3;

        return;
      }


      /* HOME WIN = 1 */

      if (
        predictedHome > predictedAway &&
        actualHome > actualAway
      ) {

        total += 1;

        return;
      }


      /* AWAY WIN = 2 */

      if (
        predictedHome < predictedAway &&
        actualHome < actualAway
      ) {

        total += 2;
      }

    }
  );


  return hasAnyResult
    ? total
    : null;

}


/* =========================
   SORT LEADERBOARD
========================= */

function sortMiniLeaderboard(rows) {

  rows.sort(
    (firstMember, secondMember) => {

      /*
        Pending entries are shown
        below scored entries.
      */

      if (
        firstMember.points == null &&
        secondMember.points != null
      ) {
        return 1;
      }

      if (
        firstMember.points != null &&
        secondMember.points == null
      ) {
        return -1;
      }


      const firstPoints =
        firstMember.points || 0;

      const secondPoints =
        secondMember.points || 0;


      if (
        secondPoints !== firstPoints
      ) {

        return (
          secondPoints -
          firstPoints
        );
      }


      return firstMember.username.localeCompare(
        secondMember.username
      );

    }
  );

}


/* =========================
   MEMBER BUTTON STATUS
========================= */

async function updateJoinButton() {

  if (!joinMiniLeagueBtn) {
    return;
  }


  if (!currentUser || !miniLeagueId) {

    joinMiniLeagueBtn.textContent =
      "Log In to Join This League";

    joinMiniLeagueBtn.disabled =
      false;

    return;
  }


  const memberReference =
    doc(
      db,
      "score_prediction_mini_leagues",
      miniLeagueId,
      "members",
      currentUser.uid
    );


  const memberSnapshot =
    await getDoc(
      memberReference
    );


  if (memberSnapshot.exists()) {

    joinMiniLeagueBtn.textContent =
      "You Have Joined This League";

    joinMiniLeagueBtn.disabled =
      true;


    if (joinMiniLeagueInfo) {

      joinMiniLeagueInfo.style.display =
        "none";

    }

    return;
  }


  joinMiniLeagueBtn.textContent =
    "Join This League — £1";

  joinMiniLeagueBtn.disabled =
    false;


  if (joinMiniLeagueInfo) {

    joinMiniLeagueInfo.style.display =
      "";

  }

}


/* =========================
   ACTIVE TAB
========================= */

function setActiveMiniTab(
  activeTab
) {

  if (miniWeekLeaderboardTab) {

    miniWeekLeaderboardTab.classList.remove(
      "active"
    );

  }


  if (miniSeasonLeaderboardTab) {

    miniSeasonLeaderboardTab.classList.remove(
      "active"
    );

  }


  if (activeTab) {

    activeTab.classList.add(
      "active"
    );

  }

}


/* =========================
   DISPLAY MINI LEADERBOARD
========================= */

function displayMiniLeaderboard(
  rows,
  heading
) {

  if (!miniLeagueLeaderboard) {
    return;
  }


  if (rows.length === 0) {

    miniLeagueLeaderboard.innerHTML = `
      <h2>${heading}</h2>

      <p>
        This mini league currently has no members.
      </p>
    `;

    return;
  }


  miniLeagueLeaderboard.innerHTML = `
    <h2>${heading} 🏆</h2>
  `;


  rows.forEach(
    (member, index) => {

      const row =
        document.createElement(
          "div"
        );


      const isMe =
        normaliseUsername(
          member.username
        ) === myUsername;


      row.className =
        isMe
          ? "leaderboard-row my-row"
          : "leaderboard-row";


      row.innerHTML = `
        <span
          class="leaderboard-position"
        >
          ${index + 1}
        </span>

        <span
          class="leaderboard-player"
        >
          ${escapeHtml(
            member.username
          )}

          ${
            member.predictionId
              ? `
                <span
                  class="view-predictions-text"
                >
                  View predictions
                </span>
              `
              : ""
          }

        </span>

        <span
          class="leaderboard-points"
        >
          ${
            member.points == null
              ? "Score pending"
              : `${member.points} pts`
          }
        </span>
      `;


      if (member.predictionId) {

        row.addEventListener(
          "click",
          () => {

            localStorage.setItem(
              "viewPredictionId",
              member.predictionId
            );

            localStorage.setItem(
              "viewPredictionUsername",
              member.username
            );


            if (member.predictionRound) {

              localStorage.setItem(
                "viewPredictionRound",
                member.predictionRound
              );

            }


            window.location.href =
              "view-predictions.html";

          }
        );

      }


      miniLeagueLeaderboard.appendChild(
        row
      );

    }
  );

}

/* =========================
   ROUND MAPPING
========================= */

function getLogicalRound(
  storedRound
) {

  const roundMap = {

    "English League Week One":
      "English League Week 0",

    "English League Week Two":
      "English League Week 1",

    "English League Week Three":
      "English League Week 2",

    "English League Week Four":
      "English League Week 3",

    "English League Week 4":
      "English League Week 4"

  };


  return (
    roundMap[storedRound] ||
    storedRound
  );
}
/* =========================
   BUILD MEMBER PREDICTIONS
========================= */

function buildPredictionMap(
  predictionsSnapshot
) {

  const predictionsByUsername =
    new Map();


  predictionsSnapshot.forEach(
    predictionDocument => {

      const predictionData =
        predictionDocument.data();


      const logicalRound =
        getLogicalRound(
          predictionData.round
        );


      /*
        Ignore anything that is not
        part of the English League
        results file.
      */

      if (
        !resultsByRound[
          logicalRound
        ]
      ) {

        return;
      }


      const cleanUsername =
        normaliseUsername(
          predictionData.username
        );


      if (!cleanUsername) {
        return;
      }


      if (
        !predictionsByUsername.has(
          cleanUsername
        )
      ) {

        predictionsByUsername.set(
          cleanUsername,
          []
        );

      }


      predictionsByUsername
        .get(cleanUsername)
        .push({

          id:
            predictionDocument.id,

          round:
            logicalRound,

          storedRound:
            predictionData.round,

          predictions:
            Array.isArray(
              predictionData.predictions
            )
              ? predictionData.predictions
              : []

        });

    }
  );


  return predictionsByUsername;
}

/* =========================
   BUILD SEASON LEADERBOARD
========================= */

function buildMiniSeasonLeaderboard(
  membersSnapshot,
  predictionsByUsername
) {

  miniSeasonLeaderboardRows = [];


  membersSnapshot.forEach(
    memberDocument => {

      const memberData =
        memberDocument.data();


      const username =
        memberData.username ||
        "ScoreCast24 Player";


      const cleanUsername =
        normaliseUsername(
          username
        );


      const playerPredictions =
        predictionsByUsername.get(
          cleanUsername
        ) || [];


      let totalPoints = 0;

      let hasAnyResult = false;

      let predictionId = null;

      let predictionRound = null;


      playerPredictions.forEach(
        entry => {

          const roundPoints =
            calculatePoints(
              entry.predictions,
              entry.round
            );


          if (roundPoints !== null) {

            totalPoints +=
              roundPoints;

            hasAnyResult =
              true;

          }


          /*
            Prefer the current round
            for the View Predictions
            link.
          */

          if (
            entry.round ===
              currentRound
          ) {

            predictionId =
              entry.id;

         predictionRound =
  entry.storedRound ||
  entry.round;

          } else if (
            !predictionId
          ) {

            predictionId =
              entry.id;

      predictionRound =
  entry.storedRound ||
  entry.round;

          }

        }
      );


      miniSeasonLeaderboardRows.push({

        username,

        predictionId,

        predictionRound,

        points:
          hasAnyResult
            ? totalPoints
            : null

      });

    }
  );


  sortMiniLeaderboard(
    miniSeasonLeaderboardRows
  );

}


/* =========================
   LOAD LEAGUE MEMBERS
========================= */

async function loadLeagueMembers() {

  const membersQuery =
    query(
      collection(
        db,
        "score_prediction_mini_leagues",
        miniLeagueId,
        "members"
      ),
      orderBy(
        "username",
        "asc"
      )
    );


  const membersSnapshot =
    await getDocs(
      membersQuery
    );


  if (membersSnapshot.empty) {

    miniWeekLeaderboardRows = [];

    miniSeasonLeaderboardRows = [];


    setActiveMiniTab(
      miniWeekLeaderboardTab
    );


    displayMiniLeaderboard(
      miniWeekLeaderboardRows,
      currentWeekHeading
    );

    return;
  }


  /*
    Load all prediction documents so
    Week One + Week Two can be used for
    the season standings.
  */

  const predictionsSnapshot =
    await getDocs(
      collection(
        db,
        "scorecast24_predictions"
      )
    );


  const predictionsByUsername =
    buildPredictionMap(
      predictionsSnapshot
    );


  buildMiniWeekLeaderboard(
    membersSnapshot,
    predictionsByUsername
  );


  buildMiniSeasonLeaderboard(
    membersSnapshot,
    predictionsByUsername
  );


  setActiveMiniTab(
    miniWeekLeaderboardTab
  );


  displayMiniLeaderboard(
    miniWeekLeaderboardRows,
    currentWeekHeading
  );

}


/* =========================
   LOAD MINI LEAGUE
========================= */

async function loadMiniLeague() {

  if (!miniLeagueId) {

    if (miniLeagueTitle) {
      miniLeagueTitle.textContent =
        "Mini League Not Found";
    }


    if (miniLeagueMemberCount) {
      miniLeagueMemberCount.textContent =
        "No mini league was selected.";
    }


    if (joinMiniLeagueBtn) {
      joinMiniLeagueBtn.style.display =
        "none";
    }

    return;
  }


  try {

    const leagueReference =
      doc(
        db,
        "score_prediction_mini_leagues",
        miniLeagueId
      );


    const leagueSnapshot =
      await getDoc(
        leagueReference
      );


    if (!leagueSnapshot.exists()) {

      if (miniLeagueTitle) {
        miniLeagueTitle.textContent =
          "Mini League Not Found";
      }


      if (miniLeagueMemberCount) {
        miniLeagueMemberCount.textContent =
          "This mini league does not exist.";
      }


      if (joinMiniLeagueBtn) {
        joinMiniLeagueBtn.style.display =
          "none";
      }

      return;
    }


    leagueData =
      leagueSnapshot.data();


    if (miniLeagueTitle) {

      miniLeagueTitle.textContent =
        leagueData.name ||
        "Mini League";

    }


    const memberCount =
      Number(
        leagueData.memberCount || 0
      );


    if (miniLeagueMemberCount) {

      miniLeagueMemberCount.textContent =
        `${memberCount} ${
          memberCount === 1
            ? "member"
            : "members"
        }`;

    }


    await loadLeagueMembers();

    await updateJoinButton();


    if (
      paymentStatus ===
      "cancelled"
    ) {

      showMessage(
        "Payment was cancelled. You have not joined this mini league."
      );

    }


    if (
      paymentStatus ===
      "success"
    ) {

      showMessage(
        "Payment received. Your membership should appear shortly."
      );

    }

  } catch (error) {

    console.error(
      "Could not load mini league:",
      error
    );


    showMessage(
      `Could not load mini league: ${
        error.code ||
        error.message
      }`
    );

  }

}


/* =========================
   TAB CLICKS
========================= */

if (miniWeekLeaderboardTab) {

  miniWeekLeaderboardTab.addEventListener(
    "click",
    () => {

      setActiveMiniTab(
        miniWeekLeaderboardTab
      );


      displayMiniLeaderboard(
        miniWeekLeaderboardRows,
        currentWeekHeading
      );

    }
  );

}


if (miniSeasonLeaderboardTab) {

  miniSeasonLeaderboardTab.addEventListener(
    "click",
    () => {

      setActiveMiniTab(
        miniSeasonLeaderboardTab
      );


      displayMiniLeaderboard(
        miniSeasonLeaderboardRows,
        "Season Leaderboard"
      );

    }
  );

}


/* =========================
   JOIN MINI LEAGUE
========================= */

if (joinMiniLeagueBtn) {

  joinMiniLeagueBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        window.location.href =
          "login.html";

        return;
      }


      if (!miniLeagueId) {

        showMessage(
          "This mini league could not be found."
        );

        return;
      }


      joinMiniLeagueBtn.disabled =
        true;

      joinMiniLeagueBtn.textContent =
        "Opening payment...";


      showMessage(
        "Preparing your £1 secure payment..."
      );


      try {

        const username =
          localStorage.getItem(
            "scorecast24Username"
          ) ||
          currentUser.displayName ||
          currentUser.email ||
          "ScoreCast24 Player";


        const result =
          await createJoinMiniLeagueCheckout({
            leagueId:
              miniLeagueId,

            username:
              username
          });


        const checkoutUrl =
          result?.data?.url;


        if (!checkoutUrl) {

          throw new Error(
            "Stripe did not return a payment page."
          );

        }


        showMessage(
          "Taking you to Stripe..."
        );


        window.location.href =
          checkoutUrl;


      } catch (error) {

        console.error(
          "Could not open mini-league payment:",
          error
        );


        let errorMessage =
          "The payment page could not be opened. Please try again.";


        if (
          error?.code ===
          "functions/already-exists"
        ) {

          errorMessage =
            "You have already joined this mini league.";


        } else if (
          error?.code ===
          "functions/not-found"
        ) {

          errorMessage =
            "This mini league no longer exists.";


        } else if (
          error?.code ===
          "functions/failed-precondition"
        ) {

          errorMessage =
            "This mini league is not currently available to join.";


        } else if (
          error?.code ===
          "functions/unauthenticated"
        ) {

          errorMessage =
            "You must be logged in to join this mini league.";


        } else if (
          error?.message
        ) {

          errorMessage =
            error.message;

        }


        showMessage(
          errorMessage
        );


        joinMiniLeagueBtn.disabled =
          false;

        joinMiniLeagueBtn.textContent =
          "Join This League — £1";

      }

    }
  );

}


/* =========================
   AUTHENTICATION
========================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user;

    loadMiniLeague();

  }
);
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
const currentRound =
  "English League Week One";


const results = {
  1: { homeScore: 2, awayScore: 2 },
  2: { homeScore: 2, awayScore: 1 },
  3: { homeScore: 0, awayScore: 2 },
  4: { homeScore: 2, awayScore: 1 },
  5: { homeScore: 2, awayScore: 1 },
  6: { homeScore: 1, awayScore: 2 },
  7: { homeScore: 1, awayScore: 3 },
  8: { homeScore: 1, awayScore: 2 },
  9: { homeScore: 0, awayScore: 0 },
  10: { homeScore: 2, awayScore: 1 },
  11: { homeScore: 3, awayScore: 0 },
  12: { homeScore: 2, awayScore: 2 },
  13: { homeScore: 1, awayScore: 1 }
};


let miniLeaderboardRows = [];
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
   CALCULATE POINTS
========================= */

function calculatePoints(predictions = []) {
  let total = 0;
  let hasAnyResult = false;

  predictions.forEach(
    prediction => {
      const result =
        results[prediction.fixtureId];

      if (!result) {
        return;
      }

      if (
        result.homeScore === null ||
        result.awayScore === null
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

      if (
        predictedHome === actualHome &&
        predictedAway === actualAway
      ) {
        total += 5;

      } else if (
        predictedHome === predictedAway &&
        actualHome === actualAway
      ) {
        total += 3;

      } else if (
        predictedHome > predictedAway &&
        actualHome > actualAway
      ) {
        total += 1;

      } else if (
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
   MEMBER BUTTON STATUS
========================= */

async function updateJoinButton() {
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

function setActiveMiniTab(activeTab) {
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

function displayMiniLeaderboard(heading) {
  if (miniLeaderboardRows.length === 0) {
    miniLeagueLeaderboard.innerHTML = `
      <h2>${heading}</h2>
      <p>This mini league currently has no members.</p>
    `;

    return;
  }

  miniLeagueLeaderboard.innerHTML = `
    <h2>${heading} 🏆</h2>
  `;

  miniLeaderboardRows.forEach(
    (member, index) => {
      const row =
        document.createElement(
          "div"
        );

    const isMe =
  member.username
    .trim()
    .toLowerCase() ===
  myUsername;

row.className =
  isMe
    ? "leaderboard-row my-row"
    : "leaderboard-row";

      row.innerHTML = `
        <span class="leaderboard-position">
          ${index + 1}
        </span>

        <span class="leaderboard-player">
          ${escapeHtml(member.username)}

          <span class="view-predictions-text">
            View predictions
          </span>
        </span>

        <span class="leaderboard-points">
          ${
            member.points === null ||
            member.points === undefined
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
    miniLeaderboardRows = [];

    displayMiniLeaderboard(
      "Week One Leaderboard"
    );

    return;
  }

  const predictionsSnapshot =
    await getDocs(
      collection(
        db,
        "scorecast24_predictions"
      )
    );

  const predictionsByUsername =
    new Map();

  predictionsSnapshot.forEach(
    predictionDocument => {
      const predictionData =
        predictionDocument.data();

      if (
        predictionData.round !==
        currentRound
      ) {
        return;
      }

      const cleanUsername =
        String(
          predictionData.username || ""
        )
          .trim()
          .toLowerCase();

      if (!cleanUsername) {
        return;
      }

      predictionsByUsername.set(
        cleanUsername,
        {
          id:
            predictionDocument.id,

          points:
            calculatePoints(
              predictionData.predictions || []
            )
        }
      );
    }
  );

  miniLeaderboardRows = [];

  membersSnapshot.forEach(
    memberDocument => {
      const memberData =
        memberDocument.data();

      const username =
        memberData.username ||
        "ScoreCast24 Player";

      const cleanUsername =
        String(username)
          .trim()
          .toLowerCase();

      const prediction =
        predictionsByUsername.get(
          cleanUsername
        );

      miniLeaderboardRows.push({
        username:
          username,

        predictionId:
          prediction?.id || null,

        points:
          prediction
            ? prediction.points
            : null
      });
    }
  );

  miniLeaderboardRows.sort(
    (firstMember, secondMember) => {
      const firstPoints =
        firstMember.points ?? -1;

      const secondPoints =
        secondMember.points ?? -1;

      return (
        secondPoints -
        firstPoints
      );
    }
  );

  setActiveMiniTab(
    miniWeekLeaderboardTab
  );

  displayMiniLeaderboard(
    "Week One Leaderboard"
  );
}
/* =========================
   LOAD MINI LEAGUE
========================= */

async function loadMiniLeague() {
  if (!miniLeagueId) {
    miniLeagueTitle.textContent =
      "Mini League Not Found";

    miniLeagueMemberCount.textContent =
      "No mini league was selected.";

    joinMiniLeagueBtn.style.display =
      "none";

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
      miniLeagueTitle.textContent =
        "Mini League Not Found";

      miniLeagueMemberCount.textContent =
        "This mini league does not exist.";

      joinMiniLeagueBtn.style.display =
        "none";

      return;
    }

    leagueData =
      leagueSnapshot.data();

    miniLeagueTitle.textContent =
      leagueData.name ||
      "Mini League";

    const memberCount =
      Number(
        leagueData.memberCount || 0
      );

    miniLeagueMemberCount.textContent =
      `${memberCount} ${
        memberCount === 1
          ? "member"
          : "members"
      }`;

    await loadLeagueMembers();
    await updateJoinButton();

    if (
      paymentStatus === "cancelled"
    ) {
      showMessage(
        "Payment was cancelled. You have not joined this mini league."
      );
    }

    if (
      paymentStatus === "success"
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
        error.code || error.message
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
        "Week One Leaderboard"
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

      /*
        During Week One, the season
        leaderboard is the same table.
      */
      displayMiniLeaderboard(
        "Season Leaderboard"
      );
    }
  );
}
/* =========================
   JOIN MINI LEAGUE
========================= */

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
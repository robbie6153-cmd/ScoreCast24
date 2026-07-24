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


const pageParameters =
  new URLSearchParams(
    window.location.search
  );

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
    miniLeagueLeaderboard.innerHTML =
      "<p>This mini league currently has no members.</p>";

    return;
  }

  const members = [];

  membersSnapshot.forEach(
    memberDocument => {
      const memberData =
        memberDocument.data();

      members.push({
        username:
          memberData.username ||
          "ScoreCast24 Player",

        points:
          Number(
            memberData.points || 0
          )
      });
    }
  );

  members.sort(
    (firstMember, secondMember) =>
      secondMember.points -
      firstMember.points
  );

  miniLeagueLeaderboard.innerHTML =
    members.map(
      (member, index) => `
        <div class="leaderboard-row">
          <span class="leaderboard-position">
            ${index + 1}
          </span>

          <span class="leaderboard-player">
            ${escapeHtml(member.username)}
          </span>

          <span class="leaderboard-points">
            ${member.points}
          </span>
        </div>
      `
    ).join("");
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
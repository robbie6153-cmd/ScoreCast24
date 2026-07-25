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


/* =========================
   FIREBASE FUNCTIONS
========================= */

const functions =
  getFunctions(
    undefined,
    "europe-west1"
  );

const createDreamMiniLeagueJoinCheckout =
  httpsCallable(
    functions,
    "createDreamMiniLeagueJoinCheckout"
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

const miniWeekLeaderboardTab =
  document.getElementById(
    "miniWeekLeaderboardTab"
  );

const miniSeasonLeaderboardTab =
  document.getElementById(
    "miniSeasonLeaderboardTab"
  );

const miniLeagueLeaderboard =
  document.getElementById(
    "miniLeagueLeaderboard"
  );

const miniLeagueMessage =
  document.getElementById(
    "miniLeagueMessage"
  );


/* =========================
   LEAGUE ID
========================= */

const pageParameters =
  new URLSearchParams(
    window.location.search
  );

const leagueId =
  pageParameters.get("id")?.trim() ||
  "";


/* =========================
   PAGE STATE
========================= */

let currentUser = null;
let leagueData = null;
let leagueMembers = [];
let activeLeaderboard =
  "weekly";


/* =========================
   HELPERS
========================= */

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showMessage(
  message,
  type = ""
) {
  if (!miniLeagueMessage) {
    return;
  }

  miniLeagueMessage.textContent =
    message;

  miniLeagueMessage.classList.remove(
    "success",
    "error"
  );

  if (type) {
    miniLeagueMessage.classList.add(
      type
    );
  }
}


function hideJoinControls() {
  if (joinMiniLeagueBtn) {
    joinMiniLeagueBtn.hidden =
      true;
  }

  if (joinMiniLeagueInfo) {
    joinMiniLeagueInfo.hidden =
      true;
  }
}


function showJoinControls() {
  if (joinMiniLeagueBtn) {
    joinMiniLeagueBtn.hidden =
      false;
  }

  if (joinMiniLeagueInfo) {
    joinMiniLeagueInfo.hidden =
      false;
  }
}


function getMemberWeeklyPoints(member) {
  return Number(
    member.weeklyPoints ??
    member.weekPoints ??
    member.currentWeekPoints ??
    member.points ??
    member.totalPoints ??
    0
  );
}


function getMemberSeasonPoints(member) {
  return Number(
    member.seasonPoints ??
    member.totalPoints ??
    member.points ??
    0
  );
}


function getMemberUsername(member) {
  return (
    member.username ||
    member.displayName ||
    member.email ||
    "ScoreCast24 Player"
  );
}


/* =========================
   RENDER LEADERBOARD
========================= */

function renderLeaderboard() {
  if (!miniLeagueLeaderboard) {
    return;
  }

  if (leagueMembers.length === 0) {
    miniLeagueLeaderboard.innerHTML = `
      <p>
        This Dream Team mini league currently has no members.
      </p>
    `;

    return;
  }

  const sortedMembers =
    [...leagueMembers].sort(
      (firstMember, secondMember) => {
        const firstPoints =
          activeLeaderboard === "season"
            ? getMemberSeasonPoints(
                firstMember
              )
            : getMemberWeeklyPoints(
                firstMember
              );

        const secondPoints =
          activeLeaderboard === "season"
            ? getMemberSeasonPoints(
                secondMember
              )
            : getMemberWeeklyPoints(
                secondMember
              );

        if (
          secondPoints !== firstPoints
        ) {
          return (
            secondPoints -
            firstPoints
          );
        }

        return getMemberUsername(
          firstMember
        ).localeCompare(
          getMemberUsername(
            secondMember
          )
        );
      }
    );

  miniLeagueLeaderboard.innerHTML =
    "";

  sortedMembers.forEach(
    (member, index) => {
      const points =
        activeLeaderboard === "season"
          ? getMemberSeasonPoints(
              member
            )
          : getMemberWeeklyPoints(
              member
            );

      const username =
        getMemberUsername(
          member
        );

      const leaderboardItem =
        document.createElement(
          "a"
        );

      leaderboardItem.className =
        "leaderboard-row";

      /*
        This link opens the member's
        submitted Dream Team.

        The page can use uid and username
        to find the correct entry.
      */

      leaderboardItem.href =
        `dream-team-view.html?uid=${encodeURIComponent(
          member.uid ||
          member.id ||
          ""
        )}&username=${encodeURIComponent(
          username
        )}`;

      leaderboardItem.innerHTML = `
        <span class="leaderboard-position">
          ${index + 1}
        </span>

        <span class="leaderboard-name">
          ${escapeHtml(
            username
          )}
          ${
            member.role === "creator"
              ? `<small>League creator</small>`
              : ""
          }
        </span>

        <strong class="leaderboard-points">
          ${points}
          ${
            points === 1
              ? "point"
              : "points"
          }
        </strong>
      `;

      miniLeagueLeaderboard.appendChild(
        leaderboardItem
      );
    }
  );
}


/* =========================
   UPDATE JOIN BUTTON
========================= */

function updateJoinButton() {
  if (!currentUser) {
    showJoinControls();

    if (joinMiniLeagueBtn) {
      joinMiniLeagueBtn.disabled =
        false;

      joinMiniLeagueBtn.textContent =
        "Log In to Join — £1";
    }

    return;
  }

  const currentMember =
    leagueMembers.find(
      member =>
        member.uid ===
        currentUser.uid
    );

  if (currentMember) {
    hideJoinControls();

    showMessage(
      "You are a member of this Dream Team mini league.",
      "success"
    );

    return;
  }

  if (
    leagueData?.status !== "active" ||
    leagueData?.paymentStatus !== "paid"
  ) {
    hideJoinControls();

    showMessage(
      "This Dream Team mini league is not currently available to join.",
      "error"
    );

    return;
  }

  showJoinControls();

  if (joinMiniLeagueBtn) {
    joinMiniLeagueBtn.disabled =
      false;

    joinMiniLeagueBtn.textContent =
      "Join This League — £1";
  }
}


/* =========================
   LOAD LEAGUE
========================= */

async function loadDreamMiniLeague() {
  if (!leagueId) {
    if (miniLeagueTitle) {
      miniLeagueTitle.textContent =
        "Dream Team Mini League";
    }

    if (miniLeagueMemberCount) {
      miniLeagueMemberCount.textContent =
        "No mini-league ID was supplied.";
    }

    if (miniLeagueLeaderboard) {
      miniLeagueLeaderboard.innerHTML = `
        <p>
          This Dream Team mini league could not be found.
        </p>
      `;
    }

    hideJoinControls();

    return;
  }

  try {
    const leagueReference =
      doc(
        db,
        "dream_team_mini_leagues",
        leagueId
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
          "This Dream Team mini league does not exist.";
      }

      hideJoinControls();

      return;
    }

    leagueData =
      leagueSnapshot.data() ||
      {};

    if (miniLeagueTitle) {
      miniLeagueTitle.textContent =
        leagueData.name ||
        "Dream Team Mini League";
    }

    const membersReference =
      collection(
        db,
        "dream_team_mini_leagues",
        leagueId,
        "members"
      );

    const membersSnapshot =
      await getDocs(
        membersReference
      );

    leagueMembers =
      membersSnapshot.docs.map(
        memberDocument => {
          return {
            id:
              memberDocument.id,

            ...memberDocument.data()
          };
        }
      );

    const actualMemberCount =
      leagueMembers.length;

    if (miniLeagueMemberCount) {
      miniLeagueMemberCount.textContent =
        `${actualMemberCount} ${
          actualMemberCount === 1
            ? "member"
            : "members"
        }`;
    }

    renderLeaderboard();
    updateJoinButton();

  } catch (error) {
    console.error(
      "Could not load Dream Team mini league:",
      error
    );

    if (miniLeagueMemberCount) {
      miniLeagueMemberCount.textContent =
        "The mini league could not be loaded.";
    }

    if (miniLeagueLeaderboard) {
      miniLeagueLeaderboard.innerHTML = `
        <p>
          Could not load this Dream Team mini league.
        </p>
      `;
    }

    hideJoinControls();

    showMessage(
      error.code ||
      error.message ||
      "The mini league could not be loaded.",
      "error"
    );
  }
}


/* =========================
   LEADERBOARD TABS
========================= */

if (miniWeekLeaderboardTab) {
  miniWeekLeaderboardTab.addEventListener(
    "click",
    () => {
      activeLeaderboard =
        "weekly";

      miniWeekLeaderboardTab.classList.add(
        "active"
      );

      miniSeasonLeaderboardTab?.classList.remove(
        "active"
      );

      renderLeaderboard();
    }
  );
}


if (miniSeasonLeaderboardTab) {
  miniSeasonLeaderboardTab.addEventListener(
    "click",
    () => {
      activeLeaderboard =
        "season";

      miniSeasonLeaderboardTab.classList.add(
        "active"
      );

      miniWeekLeaderboardTab?.classList.remove(
        "active"
      );

      renderLeaderboard();
    }
  );
}


/* =========================
   JOIN LEAGUE
========================= */

if (joinMiniLeagueBtn) {
  joinMiniLeagueBtn.addEventListener(
    "click",
    async () => {
      if (!currentUser) {
        window.location.href =
          `login.html?redirect=${encodeURIComponent(
            window.location.href
          )}`;

        return;
      }

      if (!leagueId) {
        showMessage(
          "This Dream Team mini league could not be identified.",
          "error"
        );

        return;
      }

      const existingMember =
        leagueMembers.find(
          member =>
            member.uid ===
            currentUser.uid
        );

      if (existingMember) {
        hideJoinControls();

        showMessage(
          "You have already joined this Dream Team mini league.",
          "success"
        );

        return;
      }

      const username =
        localStorage.getItem(
          "scorecast24Username"
        ) ||
        currentUser.displayName ||
        currentUser.email ||
        "ScoreCast24 Player";

      joinMiniLeagueBtn.disabled =
        true;

      joinMiniLeagueBtn.textContent =
        "Opening payment...";

      showMessage(
        "Preparing your £1 secure payment..."
      );

      try {
        const result =
          await createDreamMiniLeagueJoinCheckout({
            leagueId,
            username
          });

        const checkoutUrl =
          result?.data?.url;

        if (!checkoutUrl) {
          throw new Error(
            "The payment page address was not returned."
          );
        }

        window.location.href =
          checkoutUrl;

      } catch (error) {
        console.error(
          "Could not open Dream Team mini-league join payment:",
          error
        );

        let message =
          "The payment page could not be opened. Please try again.";

        if (
          error?.code ===
          "functions/already-exists"
        ) {
          message =
            "You have already joined this Dream Team mini league.";

        } else if (
          error?.code ===
          "functions/failed-precondition"
        ) {
          message =
            "This Dream Team mini league is not currently available to join.";

        } else if (
          error?.code ===
          "functions/unauthenticated"
        ) {
          message =
            "You must be logged in to join this Dream Team mini league.";

        } else if (
          error?.message
        ) {
          message =
            error.message;
        }

        showMessage(
          message,
          "error"
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
   PAYMENT MESSAGES
========================= */

if (
  pageParameters.get("payment") ===
  "success"
) {
  showMessage(
    "Payment confirmed. Your mini-league membership is being activated.",
    "success"
  );
}

if (
  pageParameters.get("payment") ===
  "cancelled"
) {
  showMessage(
    "Payment was cancelled. You have not been charged.",
    "error"
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

    loadDreamMiniLeague();
  }
);
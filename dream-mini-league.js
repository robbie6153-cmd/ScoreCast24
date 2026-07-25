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

const createDreamMiniLeagueJoinCheckout =
  httpsCallable(
    functions,
    "createDreamMiniLeagueJoinCheckout"
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


const pageParameters =
  new URLSearchParams(
    window.location.search
  );

const miniLeagueId =
  pageParameters.get("id");

const paymentStatus =
  pageParameters.get("payment");

const myUsername =
  (
    localStorage.getItem(
      "scorecast24Username"
    ) || ""
  )
    .trim()
    .toLowerCase();


let currentUser = null;
let leagueData = null;

let weeklyLeaderboardRows = [];
let seasonLeaderboardRows = [];

let latestRoundId = null;


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

function normaliseUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


/* =========================
   NUMBER VALUE
========================= */

function getPointsValue(value) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
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
      "dream_team_mini_leagues",
      miniLeagueId,
      "members",
      currentUser.uid
    );

  const memberSnapshot =
    await getDoc(
      memberReference
    );

if (member.entryId) {
  row.addEventListener(
    "click",
    () => {
      window.location.href =
        `dream-team-view.html?id=${encodeURIComponent(
          member.entryId
        )}`;
    }
  );
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
   DISPLAY LEADERBOARD
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
      <h2>${escapeHtml(heading)}</h2>

      <p>
        This Dream Team mini league currently has no members.
      </p>
    `;

    return;
  }

  miniLeagueLeaderboard.innerHTML = `
    <h2>
      ${escapeHtml(heading)} 🏆
    </h2>
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
        <span class="leaderboard-position">
          ${index + 1}
        </span>

        <span class="leaderboard-player">
          ${escapeHtml(member.username)}

          <span class="view-predictions-text">
            ${
              member.entryId
                ? "View Dream Team"
                : "Team not submitted"
            }
          </span>
        </span>

        <span class="leaderboard-points">
          ${
            member.hasEntry
              ? `${member.points} pts`
              : "Score pending"
          }
        </span>
      `;

      if (member.entryId) {
        row.addEventListener(
          "click",
          () => {
            localStorage.setItem(
              "viewDreamTeamEntryId",
              member.entryId
            );

            localStorage.setItem(
              "viewDreamTeamUsername",
              member.username
            );

            window.location.href =
              "dream-team-view.html";
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
   FIND LATEST ROUND
========================= */

function findLatestRoundId(entries) {
  const roundIds =
    entries
      .map(entry => {
        return String(
          entry.roundId || ""
        ).trim();
      })
      .filter(Boolean);

  if (roundIds.length === 0) {
    return null;
  }

  roundIds.sort(
    (firstRound, secondRound) => {
      return secondRound.localeCompare(
        firstRound,
        undefined,
        {
          numeric:
            true
        }
      );
    }
  );

  return roundIds[0];
}


/* =========================
   LOAD DREAM TEAM ENTRIES
========================= */

async function loadDreamTeamEntries() {
  const entriesSnapshot =
    await getDocs(
      collection(
        db,
        "dream_team_entries"
      )
    );

  const entries = [];

  entriesSnapshot.forEach(
    entryDocument => {
      const entryData =
        entryDocument.data() ||
        {};

      entries.push({
        id:
          entryDocument.id,

        uid:
          entryData.uid ||
          entryData.userId ||
          "",

        username:
          entryData.username ||
          "ScoreCast24 Player",

        roundId:
          entryData.roundId ||
          "",

        totalPoints:
          getPointsValue(
            entryData.totalPoints
          ),

        ratingTotal:
          getPointsValue(
            entryData.ratingTotal
          ),

        submittedAt:
          entryData.submittedAt ||
          null
      });
    }
  );

  return entries;
}


/* =========================
   WEEKLY ENTRY LOOKUP
========================= */

function createWeeklyEntryLookup(
  entries,
  roundId
) {
  const entriesByUser =
    new Map();

  entries.forEach(entry => {
    if (
      roundId &&
      entry.roundId !== roundId
    ) {
      return;
    }

    const uidKey =
      String(entry.uid || "")
        .trim();

    const usernameKey =
      normaliseUsername(
        entry.username
      );

    if (uidKey) {
      entriesByUser.set(
        `uid:${uidKey}`,
        entry
      );
    }

    if (usernameKey) {
      entriesByUser.set(
        `username:${usernameKey}`,
        entry
      );
    }
  });

  return entriesByUser;
}


/* =========================
   SEASON POINTS LOOKUP
========================= */

function createSeasonPointsLookup(entries) {
  const seasonByUser =
    new Map();

  entries.forEach(entry => {
    const uidKey =
      String(entry.uid || "")
        .trim();

    const usernameKey =
      normaliseUsername(
        entry.username
      );

    const primaryKey =
      uidKey
        ? `uid:${uidKey}`
        : `username:${usernameKey}`;

    if (!primaryKey) {
      return;
    }

    const existing =
      seasonByUser.get(
        primaryKey
      ) || {
        username:
          entry.username,

        points:
          0,

        latestEntryId:
          null,

        latestRoundId:
          ""
      };

    existing.points +=
      getPointsValue(
        entry.totalPoints
      );

    if (
      !existing.latestRoundId ||
      String(entry.roundId).localeCompare(
        existing.latestRoundId,
        undefined,
        {
          numeric:
            true
        }
      ) > 0
    ) {
      existing.latestRoundId =
        entry.roundId;

      existing.latestEntryId =
        entry.id;
    }

    seasonByUser.set(
      primaryKey,
      existing
    );

    if (uidKey && usernameKey) {
      seasonByUser.set(
        `username:${usernameKey}`,
        existing
      );
    }
  });

  return seasonByUser;
}


/* =========================
   LOAD LEAGUE MEMBERS
========================= */

async function loadLeagueMembers() {
  const membersQuery =
    query(
      collection(
        db,
        "dream_team_mini_leagues",
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
    weeklyLeaderboardRows = [];
    seasonLeaderboardRows = [];

    displayMiniLeaderboard(
      weeklyLeaderboardRows,
      "Week One Leaderboard"
    );

    return;
  }

  const dreamTeamEntries =
    await loadDreamTeamEntries();

  latestRoundId =
    findLatestRoundId(
      dreamTeamEntries
    );

  const weeklyEntriesByUser =
    createWeeklyEntryLookup(
      dreamTeamEntries,
      latestRoundId
    );

  const seasonPointsByUser =
    createSeasonPointsLookup(
      dreamTeamEntries
    );

  weeklyLeaderboardRows = [];
  seasonLeaderboardRows = [];

  membersSnapshot.forEach(
    memberDocument => {
      const memberData =
        memberDocument.data() ||
        {};

      const uid =
        memberData.uid ||
        memberDocument.id;

      const username =
        memberData.username ||
        "ScoreCast24 Player";

      const cleanUsername =
        normaliseUsername(
          username
        );

      const weeklyEntry =
        weeklyEntriesByUser.get(
          `uid:${uid}`
        ) ||
        weeklyEntriesByUser.get(
          `username:${cleanUsername}`
        );

      const seasonEntry =
        seasonPointsByUser.get(
          `uid:${uid}`
        ) ||
        seasonPointsByUser.get(
          `username:${cleanUsername}`
        );

      weeklyLeaderboardRows.push({
        uid,

        username,

        entryId:
          weeklyEntry?.id ||
          null,

        points:
          weeklyEntry
            ? getPointsValue(
                weeklyEntry.totalPoints
              )
            : 0,

        ratingTotal:
          weeklyEntry
            ? getPointsValue(
                weeklyEntry.ratingTotal
              )
            : 9999,

        hasEntry:
          Boolean(
            weeklyEntry
          )
      });

      seasonLeaderboardRows.push({
        uid,

        username,

        entryId:
          seasonEntry
            ?.latestEntryId ||
          weeklyEntry
            ?.id ||
          null,

        points:
          seasonEntry
            ? getPointsValue(
                seasonEntry.points
              )
            : 0,

        ratingTotal:
          weeklyEntry
            ? getPointsValue(
                weeklyEntry.ratingTotal
              )
            : 9999,

        hasEntry:
          Boolean(
            seasonEntry ||
            weeklyEntry
          )
      });
    }
  );

  /*
    Highest points first.

    If two users have equal points,
    the lower Dream Team rating wins
    the tie-break.
  */

  weeklyLeaderboardRows.sort(
    (
      firstMember,
      secondMember
    ) => {
      if (
        secondMember.points !==
        firstMember.points
      ) {
        return (
          secondMember.points -
          firstMember.points
        );
      }

      return (
        firstMember.ratingTotal -
        secondMember.ratingTotal
      );
    }
  );

  seasonLeaderboardRows.sort(
    (
      firstMember,
      secondMember
    ) => {
      if (
        secondMember.points !==
        firstMember.points
      ) {
        return (
          secondMember.points -
          firstMember.points
        );
      }

      return (
        firstMember.ratingTotal -
        secondMember.ratingTotal
      );
    }
  );

  setActiveMiniTab(
    miniWeekLeaderboardTab
  );

  displayMiniLeaderboard(
    weeklyLeaderboardRows,
    latestRoundId
      ? "Current Week Leaderboard"
      : "Week One Leaderboard"
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
      "No Dream Team mini league was selected.";

    joinMiniLeagueBtn.style.display =
      "none";

    return;
  }

  try {
    const leagueReference =
      doc(
        db,
        "dream_team_mini_leagues",
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
        "This Dream Team mini league does not exist.";

      joinMiniLeagueBtn.style.display =
        "none";

      return;
    }

    leagueData =
      leagueSnapshot.data() ||
      {};

    miniLeagueTitle.textContent =
      leagueData.name ||
      "Dream Team Mini League";

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
        "Payment was cancelled. You have not joined this Dream Team mini league."
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
      "Could not load Dream Team mini league:",
      error
    );

    showMessage(
      `Could not load Dream Team mini league: ${
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
        weeklyLeaderboardRows,
        "Current Week Leaderboard"
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
        seasonLeaderboardRows,
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
          "This Dream Team mini league could not be found."
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
          await createDreamMiniLeagueJoinCheckout({
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
          "Could not open Dream Team mini-league payment:",
          error
        );

        let errorMessage =
          "The payment page could not be opened. Please try again.";

        if (
          error?.code ===
          "functions/already-exists"
        ) {
          errorMessage =
            "You have already joined this Dream Team mini league.";

        } else if (
          error?.code ===
          "functions/not-found"
        ) {
          errorMessage =
            "This Dream Team mini league no longer exists.";

        } else if (
          error?.code ===
          "functions/failed-precondition"
        ) {
          errorMessage =
            "This Dream Team mini league is not currently available to join.";

        } else if (
          error?.code ===
          "functions/unauthenticated"
        ) {
          errorMessage =
            "You must be logged in to join this Dream Team mini league.";

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
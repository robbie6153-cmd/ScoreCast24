
import { auth, db } from "./firebase.js?v=108";
import { DREAM_CONFIG } from "./dream-config.js?v=8";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

/* =====================================================
   PAGE ELEMENTS
===================================================== */

const dreamLeaderboardContainer =
  document.getElementById("dreamLeaderboardContainer");

const seasonDreamLeaderboardTab =
  document.getElementById("seasonDreamLeaderboardTab");

const dreamWeekSelector =
  document.getElementById("dreamWeekSelector");

const viewMyDreamTeamBtn =
  document.getElementById("viewMyDreamTeamBtn");

/* =====================================================
   CURRENT GAMEWEEK

   Uses the same configuration as Dream Team selection
   and View My Dream Team, so the pages stay in sync.
===================================================== */

const CURRENT_ROUND_ID = DREAM_CONFIG.currentRoundId;
const CURRENT_WEEK_NUMBER =
  Number(CURRENT_ROUND_ID.match(/week-(\d+)$/)?.[1] || 0);

const COUNTED_STATUSES = new Set([
  "submitted",
  "locked",
  "scored"
]);

let leaderboardRequestNumber = 0;
let activeMode = "weekly";

/* =====================================================
   HELPERS
===================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getWeekNumber(roundId) {
  const match = String(roundId || "")
    .match(/^2026-week-(\d+)$/);

  return match ? Number(match[1]) : 0;
}

function getSubmittedUsername() {
  return sessionStorage.getItem(
    "dreamTeamSubmittedUsername"
  ) || "";
}

function showLeaderboardMessage(message) {
  if (!dreamLeaderboardContainer) return;

  dreamLeaderboardContainer.innerHTML = `
    <p class="leaderboard-empty-message">
      ${escapeHtml(message)}
    </p>
  `;
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const pointsDifference =
      Number(b.totalPoints || 0) - Number(a.totalPoints || 0);

    if (pointsDifference) return pointsDifference;

    // Retain the existing tie-break: lower rating wins.
    const ratingDifference =
      Number(a.ratingTotal || 0) - Number(b.ratingTotal || 0);

    if (ratingDifference) return ratingDifference;

    return String(a.username || "").localeCompare(
      String(b.username || "")
    );
  });
}

function getEntryUserKey(entry) {
  if (entry.uid) return `uid:${entry.uid}`;
  if (entry.email) {
    return `email:${String(entry.email).trim().toLowerCase()}`;
  }
  if (entry.username) {
    return `username:${String(entry.username).trim().toLowerCase()}`;
  }
  return `document:${entry.id}`;
}

function getEntryTimestamp(entry) {
  return Number(
    entry.updatedAt?.seconds ??
    entry.scoredAt?.seconds ??
    entry.submittedAt?.seconds ??
    0
  );
}

function preferEntry(existing, candidate) {
  // If legacy and standard IDs coexist, use the standard entry.
  const existingIsStandard = Boolean(
    existing.uid && existing.id === `${existing.roundId}_${existing.uid}`
  );
  const candidateIsStandard = Boolean(
    candidate.uid && candidate.id === `${candidate.roundId}_${candidate.uid}`
  );

  if (candidateIsStandard !== existingIsStandard) {
    return candidateIsStandard ? candidate : existing;
  }

  return getEntryTimestamp(candidate) > getEntryTimestamp(existing)
    ? candidate
    : existing;
}

function removeRoundDuplicates(entries) {
  const uniqueEntries = new Map();

  for (const entry of entries) {
    const key = `${getEntryUserKey(entry)}|${entry.roundId}`;
    const existing = uniqueEntries.get(key);
    uniqueEntries.set(key, existing ? preferEntry(existing, entry) : entry);
  }

  return [...uniqueEntries.values()];
}

function isCountedEntry(entry) {
  return COUNTED_STATUSES.has(entry.status) &&
    getWeekNumber(entry.roundId) >= 1 &&
    getWeekNumber(entry.roundId) <= CURRENT_WEEK_NUMBER;
}

async function getAllEntries() {
  const snapshot = await getDocs(
    collection(db, "dream_team_entries")
  );

  return snapshot.docs.map(snapshotDoc => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data()
  }));
}

/* =====================================================
   WEEK SELECTOR - NEWEST FIRST
===================================================== */

function setupWeekSelector() {
  if (!dreamWeekSelector || CURRENT_WEEK_NUMBER < 1) return;

  dreamWeekSelector.innerHTML = "";

  for (let week = CURRENT_WEEK_NUMBER; week >= 1; week--) {
    const option = document.createElement("option");
    option.value = `2026-week-${String(week).padStart(2, "0")}`;
    option.textContent = `Week ${week}`;
    dreamWeekSelector.appendChild(option);
  }

  dreamWeekSelector.value = CURRENT_ROUND_ID;
}

/* =====================================================
   RENDER LEADERBOARD
===================================================== */

function renderLeaderboard(entries, mode) {
  if (!dreamLeaderboardContainer) return;

  if (!entries.length) {
    showLeaderboardMessage(
      mode === "weekly"
        ? "No submitted Dream Team entries were found for this week."
        : "No Dream Team season entries are available yet."
    );
    return;
  }

  const submittedUsername = getSubmittedUsername().trim().toLowerCase();
  const currentUid = auth.currentUser?.uid || "";

  dreamLeaderboardContainer.innerHTML = `
    <div class="dream-leaderboard-list">
      <div class="dream-leaderboard-header">
        <span>Pos</span>
        <span>Player</span>
        <span>Rating</span>
        <span>Points</span>
      </div>

      ${entries.map((entry, index) => {
        const username = entry.username || "ScoreCast24 Player";
        const isCurrentUser = Boolean(
          (currentUid && entry.uid === currentUid) ||
          (submittedUsername &&
            username.trim().toLowerCase() === submittedUsername)
        );

        return `
          <button
            type="button"
            class="dream-leaderboard-row ${isCurrentUser ? "current-dream-player" : ""}"
            data-entry-id="${escapeHtml(entry.id)}"
          >
            <span class="dream-position">${index + 1}</span>
            <span class="dream-player-name">
              ${escapeHtml(username)}
              ${isCurrentUser ? "<small>Your team</small>" : ""}
            </span>
            <span class="dream-rating-total">
              ${Number(entry.ratingTotal || 0)}
            </span>
            <span class="dream-points-total">
              ${Number(entry.totalPoints || 0)}
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  dreamLeaderboardContainer
    .querySelectorAll(".dream-leaderboard-row")
    .forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.entryId;
        if (id) {
          window.location.href =
            `dream-team-view.html?id=${encodeURIComponent(id)}`;
        }
      });
    });

  sessionStorage.removeItem("dreamTeamSubmittedUsername");
}

/* =====================================================
   WEEKLY LEADERBOARD
===================================================== */

async function loadWeeklyLeaderboard(
  roundId = dreamWeekSelector?.value || CURRENT_ROUND_ID
) {
  const requestNumber = ++leaderboardRequestNumber;
  showLeaderboardMessage("Loading Dream Team leaderboard...");

  try {
    const allEntries = await getAllEntries();
    if (requestNumber !== leaderboardRequestNumber) return;

    const entries = removeRoundDuplicates(
      allEntries.filter(entry =>
        entry.roundId === roundId && isCountedEntry(entry)
      )
    );

    renderLeaderboard(sortEntries(entries), "weekly");
  } catch (error) {
    if (requestNumber !== leaderboardRequestNumber) return;
    console.error("Weekly Dream Team leaderboard error:", error);
    showLeaderboardMessage(
      "The Dream Team leaderboard could not be loaded. Please try again."
    );
  }
}

/* =====================================================
   SEASON LEADERBOARD - WEEKS 1 THROUGH CURRENT WEEK
===================================================== */

async function loadSeasonLeaderboard() {
  const requestNumber = ++leaderboardRequestNumber;
  showLeaderboardMessage("Loading the Dream Team season leaderboard...");

  try {
    const allEntries = await getAllEntries();
    if (requestNumber !== leaderboardRequestNumber) return;

    // One entry per user per round, including Weeks 8 and 9.
    const entries = removeRoundDuplicates(
      allEntries.filter(isCountedEntry)
    );

    const totalsByUser = new Map();

    for (const entry of entries) {
      const key = getEntryUserKey(entry);
      const week = getWeekNumber(entry.roundId);
      const existing = totalsByUser.get(key) || {
        id: entry.id,
        uid: entry.uid || "",
        username: entry.username || "ScoreCast24 Player",
        totalPoints: 0,
        ratingTotalSum: 0,
        weeksPlayed: 0,
        latestWeek: 0
      };

      existing.totalPoints += Number(entry.totalPoints || 0);
      existing.ratingTotalSum += Number(entry.ratingTotal || 0);
      existing.weeksPlayed++;

      // Season row opens the newest team, not an arbitrary old entry.
      if (week >= existing.latestWeek) {
        existing.latestWeek = week;
        existing.id = entry.id;
        existing.username = entry.username || existing.username;
      }

      totalsByUser.set(key, existing);
    }

    const seasonEntries = [...totalsByUser.values()].map(entry => ({
      ...entry,
      ratingTotal: entry.weeksPlayed
        ? Math.round(entry.ratingTotalSum / entry.weeksPlayed)
        : 0
    }));

    renderLeaderboard(sortEntries(seasonEntries), "season");
  } catch (error) {
    if (requestNumber !== leaderboardRequestNumber) return;
    console.error("Season Dream Team leaderboard error:", error);
    showLeaderboardMessage(
      "The season leaderboard could not be loaded. Please try again."
    );
  }
}

/* =====================================================
   TAB EVENTS
===================================================== */

function showWeeklyTab() {
  activeMode = "weekly";
  seasonDreamLeaderboardTab?.classList.remove("active");
  loadWeeklyLeaderboard();
}

function showSeasonTab() {
  activeMode = "season";
  seasonDreamLeaderboardTab?.classList.add("active");
  loadSeasonLeaderboard();
}

seasonDreamLeaderboardTab?.addEventListener("click", showSeasonTab);
dreamWeekSelector?.addEventListener("change", showWeeklyTab);

/* =====================================================
   VIEW MY DREAM TEAM LINK
===================================================== */

onAuthStateChanged(auth, async user => {
  if (!viewMyDreamTeamBtn) return;

  if (!user) {
    viewMyDreamTeamBtn.href = "index.html";
    viewMyDreamTeamBtn.textContent = "Log In to View My Dream Team";
    return;
  }

  viewMyDreamTeamBtn.textContent = "Loading My Dream Team...";
  viewMyDreamTeamBtn.removeAttribute("href");

  try {
    const allEntries = await getAllEntries();
    const entries = removeRoundDuplicates(
      allEntries.filter(entry =>
        entry.roundId === CURRENT_ROUND_ID &&
        isCountedEntry(entry) &&
        (entry.uid === user.uid ||
          String(entry.id || "").endsWith(`_${user.uid}`))
      )
    );

    const userEntry = entries[0];

    if (!userEntry) {
      viewMyDreamTeamBtn.removeAttribute("href");
      viewMyDreamTeamBtn.textContent =
        `No Week ${CURRENT_WEEK_NUMBER} Team Submitted`;
      return;
    }

    viewMyDreamTeamBtn.href =
      `dream-team-view.html?id=${encodeURIComponent(userEntry.id)}`;
    viewMyDreamTeamBtn.textContent = "View My Dream Team";
  } catch (error) {
    console.error("View My Dream Team error:", error);
    viewMyDreamTeamBtn.removeAttribute("href");
    viewMyDreamTeamBtn.textContent = "Dream Team Unavailable";
  }
});

/* =====================================================
   STARTUP
===================================================== */

setupWeekSelector();
showWeeklyTab();

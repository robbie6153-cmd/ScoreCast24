import { auth, db } from "./firebase.js?v=108";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";


const dreamLeaderboardContainer =
  document.getElementById("dreamLeaderboardContainer");

const seasonDreamLeaderboardTab =
  document.getElementById("seasonDreamLeaderboardTab");

const weeklyDreamLeaderboardTab =
  document.getElementById("weeklyDreamLeaderboardTab");

const viewMyDreamTeamBtn =
  document.getElementById("viewMyDreamTeamBtn");


function getWeeklyRoundId() {
  const now = new Date();

  const year = now.getFullYear();

  const firstDayOfYear =
    new Date(year, 0, 1);

  const daysSinceFirstDay =
    Math.floor(
      (now - firstDayOfYear) / 86400000
    );

  const weekNumber =
    Math.ceil(
      (
        daysSinceFirstDay +
        firstDayOfYear.getDay() +
        1
      ) / 7
    );

  return `${year}-week-${String(weekNumber).padStart(2, "0")}`;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getSubmittedUsername() {
  return (
    sessionStorage.getItem(
      "dreamTeamSubmittedUsername"
    ) || ""
  );
}


function showLeaderboardMessage(message) {
  if (!dreamLeaderboardContainer) {
    return;
  }

  dreamLeaderboardContainer.innerHTML = `
    <p class="leaderboard-empty-message">
      ${escapeHtml(message)}
    </p>
  `;
}


function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const pointsDifference =
      Number(b.totalPoints || 0) -
      Number(a.totalPoints || 0);

    if (pointsDifference !== 0) {
      return pointsDifference;
    }

    /*
      Tie-break:
      lowest team rating wins.
    */
    const ratingDifference =
      Number(a.ratingTotal || 0) -
      Number(b.ratingTotal || 0);

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return String(a.username || "")
      .localeCompare(
        String(b.username || "")
      );
  });
}


function renderLeaderboard(entries, mode) {
  if (!dreamLeaderboardContainer) {
    return;
  }

  if (!entries.length) {
    showLeaderboardMessage(
      mode === "weekly"
        ? "No Dream Teams have been submitted for this week yet."
        : "No Dream Team season entries are available yet."
    );

    return;
  }

  const submittedUsername =
    getSubmittedUsername()
      .trim()
      .toLowerCase();

  dreamLeaderboardContainer.innerHTML = `
    <div class="dream-leaderboard-list">

      <div class="dream-leaderboard-header">
        <span>Pos</span>
        <span>Player</span>
        <span>Rating</span>
        <span>Points</span>
      </div>

      ${entries.map((entry, index) => {
        const username =
          entry.username ||
          "ScoreCast24 Player";

        const isCurrentUser =
          submittedUsername &&
          username.trim().toLowerCase() ===
            submittedUsername;

        return `
          <button
            type="button"
            class="dream-leaderboard-row
              ${isCurrentUser ? "current-dream-player" : ""}"
            data-entry-id="${escapeHtml(entry.id)}"
          >
            <span class="dream-position">
              ${index + 1}
            </span>

            <span class="dream-player-name">
              ${escapeHtml(username)}

              ${isCurrentUser ? `
                <small>Your team</small>
              ` : ""}
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

  document
    .querySelectorAll(".dream-leaderboard-row")
    .forEach(row => {
      row.addEventListener("click", () => {
        const entryId =
          row.dataset.entryId;

        if (!entryId) {
          return;
        }

        window.location.href =
          `dream-team-view.html?id=${encodeURIComponent(entryId)}`;
      });
    });

  sessionStorage.removeItem(
    "dreamTeamSubmittedUsername"
  );
}


async function loadWeeklyLeaderboard() {
  showLeaderboardMessage(
    "Loading this week’s Dream Team leaderboard..."
  );

  try {
    const roundId =
      getWeeklyRoundId();

    const entriesQuery =
      query(
        collection(
          db,
          "dream_team_entries"
        ),
        where(
          "roundId",
          "==",
          roundId
        )
      );

    const snapshot =
      await getDocs(entriesQuery);

    const entries =
      snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }));

    renderLeaderboard(
      sortEntries(entries),
      "weekly"
    );

  } catch (error) {
    console.error(
      "Weekly Dream Team leaderboard error:",
      error
    );

    showLeaderboardMessage(
      "The Dream Team leaderboard could not be loaded. Please try again."
    );
  }
}


async function loadSeasonLeaderboard() {
  showLeaderboardMessage(
    "Loading the Dream Team season leaderboard..."
  );

  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "dream_team_entries"
        )
      );

    const entries =
      snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }));

    const totalsByUser =
      new Map();

    entries.forEach(entry => {
      const userKey =
        entry.uid ||
        entry.email ||
        entry.username;

      if (!userKey) {
        return;
      }

      const existing =
        totalsByUser.get(userKey) || {
          id: entry.id,
          uid: entry.uid || "",
          username:
            entry.username ||
            "ScoreCast24 Player",
          totalPoints: 0,
          ratingTotalSum: 0,
          weeksPlayed: 0
        };

      existing.totalPoints +=
        Number(entry.totalPoints || 0);

      existing.ratingTotalSum +=
        Number(entry.ratingTotal || 0);

      existing.weeksPlayed += 1;

      /*
        Keep the most recent available entry ID
        so tapping the season row still opens a team.
      */
      existing.id = entry.id;

      totalsByUser.set(
        userKey,
        existing
      );
    });

    const seasonEntries =
      Array.from(
        totalsByUser.values()
      ).map(entry => ({
        ...entry,

        ratingTotal:
          entry.weeksPlayed > 0
            ? Math.round(
                entry.ratingTotalSum /
                entry.weeksPlayed
              )
            : 0
      }));

    renderLeaderboard(
      sortEntries(seasonEntries),
      "season"
    );

  } catch (error) {
    console.error(
      "Season Dream Team leaderboard error:",
      error
    );

    showLeaderboardMessage(
      "The season leaderboard could not be loaded. Please try again."
    );
  }
}


function showWeeklyTab() {
  weeklyDreamLeaderboardTab
    ?.classList.add("active");

  seasonDreamLeaderboardTab
    ?.classList.remove("active");

  loadWeeklyLeaderboard();
}


function showSeasonTab() {
  seasonDreamLeaderboardTab
    ?.classList.add("active");

  weeklyDreamLeaderboardTab
    ?.classList.remove("active");

  loadSeasonLeaderboard();
}


seasonDreamLeaderboardTab
  ?.addEventListener(
    "click",
    showSeasonTab
  );


weeklyDreamLeaderboardTab
  ?.addEventListener(
    "click",
    showWeeklyTab
  );


onAuthStateChanged(auth, user => {
  if (!viewMyDreamTeamBtn) {
    return;
  }

  if (!user) {
    viewMyDreamTeamBtn.href =
      "index.html";

    viewMyDreamTeamBtn.textContent =
      "Log In to View My Dream Team";

    return;
  }

  const roundId =
    getWeeklyRoundId();

  const entryId =
    `${roundId}_${user.uid}`;

  viewMyDreamTeamBtn.href =
    `dream-team-view.html?id=${encodeURIComponent(entryId)}`;
});


showWeeklyTab();
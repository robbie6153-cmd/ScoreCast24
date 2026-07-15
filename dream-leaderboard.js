import { db } from "./firebase.js?v=108";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const dreamLeaderboardContainer =
  document.getElementById("dreamLeaderboardContainer");

const seasonDreamLeaderboardTab =
  document.getElementById("seasonDreamLeaderboardTab");

const weeklyDreamLeaderboardTab =
  document.getElementById("weeklyDreamLeaderboardTab");


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


function showLoadingMessage(message) {
  if (!dreamLeaderboardContainer) return;

  dreamLeaderboardContainer.innerHTML = `
    <p class="leaderboard-empty-message">
      ${escapeHtml(message)}
    </p>
  `;
}


function sortEntries(entries) {
  return entries.sort((a, b) => {
    const pointsDifference =
      Number(b.totalPoints || 0) -
      Number(a.totalPoints || 0);

    if (pointsDifference !== 0) {
      return pointsDifference;
    }

    /*
      Tie-break:
      the lower overall rating total wins.
    */
    const ratingDifference =
      Number(a.ratingTotal || 0) -
      Number(b.ratingTotal || 0);

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return String(a.username || "")
      .localeCompare(String(b.username || ""));
  });
}


function renderLeaderboard(entries, mode) {
  if (!dreamLeaderboardContainer) return;

  if (!entries.length) {
    dreamLeaderboardContainer.innerHTML = `
      <p class="leaderboard-empty-message">
        No Dream Teams have been submitted
        ${mode === "weekly" ? "for this week yet." : "yet."}
      </p>
    `;
    return;
  }

  const submittedUsername =
    getSubmittedUsername().trim().toLowerCase();

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
          entry.username || "ScoreCast24 Player";

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

        if (!entryId) return;

        window.location.href =
          `dream-team-view.html?id=${encodeURIComponent(entryId)}`;
      });
    });

  sessionStorage.removeItem(
    "dreamTeamSubmittedUsername"
  );
}


async function loadWeeklyLeaderboard() {
  showLoadingMessage(
    "Loading this week’s Dream Team leaderboard..."
  );

  try {
    const roundId =
      getWeeklyRoundId();

    const entriesQuery =
      query(
        collection(db, "dream_team_entries"),
        where("roundId", "==", roundId)
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

    dreamLeaderboardContainer.innerHTML = `
      <p class="leaderboard-empty-message">
        The Dream Team leaderboard could not be loaded.
        Please try again.
      </p>
    `;
  }
}


async function loadSeasonLeaderboard() {
  showLoadingMessage(
    "Loading the Dream Team season leaderboard..."
  );

  try {
    const snapshot =
      await getDocs(
        collection(db, "dream_team_entries")
      );

    const entries =
      snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }));

    const totalsByUser = new Map();

    entries.forEach(entry => {
      const userKey =
        entry.uid ||
        entry.email ||
        entry.username;

      if (!userKey) return;

      const existing =
        totalsByUser.get(userKey) || {
          id: userKey,
          username:
            entry.username || "ScoreCast24 Player",
          totalPoints: 0,
          ratingTotal: 0,
          weeksPlayed: 0
        };

      existing.totalPoints +=
        Number(entry.totalPoints || 0);

      existing.ratingTotal +=
        Number(entry.ratingTotal || 0);

      existing.weeksPlayed += 1;

      totalsByUser.set(userKey, existing);
    });

    const seasonEntries =
      Array.from(totalsByUser.values())
        .map(entry => ({
          ...entry,

          /*
            For season ties, this uses the player's
            average weekly rating as the tie-break.
          */
          ratingTotal:
            entry.weeksPlayed > 0
              ? Math.round(
                  entry.ratingTotal /
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

    dreamLeaderboardContainer.innerHTML = `
      <p class="leaderboard-empty-message">
        The season leaderboard could not be loaded.
        Please try again.
      </p>
    `;
  }
}


if (seasonDreamLeaderboardTab) {
  seasonDreamLeaderboardTab.addEventListener(
    "click",
    () => {
      seasonDreamLeaderboardTab.classList.add(
        "active"
      );

      weeklyDreamLeaderboardTab?.classList.remove(
        "active"
      );

      loadSeasonLeaderboard();
    }
  );
}


if (weeklyDreamLeaderboardTab) {
  weeklyDreamLeaderboardTab.addEventListener(
    "click",
    () => {
      weeklyDreamLeaderboardTab.classList.add(
        "active"
      );

      seasonDreamLeaderboardTab?.classList.remove(
        "active"
      );

      loadWeeklyLeaderboard();
    }
  );
}


loadWeeklyLeaderboard();
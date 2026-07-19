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
  document.getElementById(
    "dreamLeaderboardContainer"
  );

const seasonDreamLeaderboardTab =
  document.getElementById(
    "seasonDreamLeaderboardTab"
  );

const weeklyDreamLeaderboardTab =
  document.getElementById(
    "weeklyDreamLeaderboardTab"
  );

const viewMyDreamTeamBtn =
  document.getElementById(
    "viewMyDreamTeamBtn"
  );


/*
  Returns the Friday belonging to the active
  Dream Team gameweek.

  Tuesday–Thursday:
  use the upcoming Friday.

  Friday–Monday:
  use the Friday that began the current round.
*/
function getGameweekFriday() {
  const now = new Date();

  const gameweekFriday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  gameweekFriday.setHours(
    0,
    0,
    0,
    0
  );

  const dayOfWeek =
    gameweekFriday.getDay();

  let dateAdjustment = 0;

  if (
    dayOfWeek >= 2 &&
    dayOfWeek <= 4
  ) {
    /*
      Tuesday, Wednesday or Thursday:
      move forward to the upcoming Friday.
    */
    dateAdjustment =
      5 - dayOfWeek;

  } else if (dayOfWeek === 0) {
    /*
      Sunday:
      move backwards two days.
    */
    dateAdjustment = -2;

  } else if (dayOfWeek === 1) {
    /*
      Monday:
      move backwards three days.
    */
    dateAdjustment = -3;
  }

  gameweekFriday.setDate(
    gameweekFriday.getDate() +
    dateAdjustment
  );

  return gameweekFriday;
}


/*
  New preferred round ID.

  Example:
  2026-gameweek-07-17
*/
function getWeeklyRoundId() {
  const gameweekFriday =
    getGameweekFriday();

  const year =
    gameweekFriday.getFullYear();

  const month =
    String(
      gameweekFriday.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      gameweekFriday.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-gameweek-${month}-${day}`
  );
}


/*
  Creates the old week-number ID that was used
  when the existing teams were submitted.

  Example:
  2026-week-29

  This temporarily allows old submissions and
  new submissions to appear together.
*/
function getLegacyWeeklyRoundId() {
  const gameweekFriday =
    getGameweekFriday();

  const year =
    gameweekFriday.getFullYear();

  const firstDayOfYear =
    new Date(
      year,
      0,
      1
    );

  firstDayOfYear.setHours(
    0,
    0,
    0,
    0
  );

  const daysSinceFirstDay =
    Math.floor(
      (
        gameweekFriday -
        firstDayOfYear
      ) / 86400000
    );

  const weekNumber =
    Math.ceil(
      (
        daysSinceFirstDay +
        firstDayOfYear.getDay() +
        1
      ) / 7
    );

  return (
    `${year}-week-${String(
      weekNumber
    ).padStart(
      2,
      "0"
    )}`
  );
}


/*
  Returns all round IDs that should be treated
  as the same current football gameweek.

  This includes:
  1. The new Friday-based ID.
  2. The old week-number ID.
*/
function getActiveRoundIds() {
  return [
    getWeeklyRoundId(),
    getLegacyWeeklyRoundId()
  ];
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function getSubmittedUsername() {
  return (
    sessionStorage.getItem(
      "dreamTeamSubmittedUsername"
    ) || ""
  );
}


function showLeaderboardMessage(
  message
) {
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
  return [...entries].sort(
    (a, b) => {
      const pointsDifference =
        Number(
          b.totalPoints || 0
        ) -
        Number(
          a.totalPoints || 0
        );

      if (
        pointsDifference !== 0
      ) {
        return pointsDifference;
      }

      /*
        Tie-break:
        lowest team rating wins.
      */
      const ratingDifference =
        Number(
          a.ratingTotal || 0
        ) -
        Number(
          b.ratingTotal || 0
        );

      if (
        ratingDifference !== 0
      ) {
        return ratingDifference;
      }

      return String(
        a.username || ""
      ).localeCompare(
        String(
          b.username || ""
        )
      );
    }
  );
}


/*
  Creates a reliable user key for preventing
  accidental duplicate leaderboard rows.
*/
function getEntryUserKey(entry) {
  if (entry.uid) {
    return `uid:${entry.uid}`;
  }

  if (entry.email) {
    return (
      `email:${String(
        entry.email
      ).trim().toLowerCase()}`
    );
  }

  if (entry.username) {
    return (
      `username:${String(
        entry.username
      ).trim().toLowerCase()}`
    );
  }

  return `document:${entry.id}`;
}


/*
  If a user somehow has both an old-format and
  new-format submission for the same gameweek,
  only one leaderboard row is shown.

  The new Friday-based entry is preferred.
*/
function removeCurrentRoundDuplicates(
  entries
) {
  const preferredRoundId =
    getWeeklyRoundId();

  const entriesByUser =
    new Map();

  entries.forEach(entry => {
    const userKey =
      getEntryUserKey(entry);

    const existing =
      entriesByUser.get(userKey);

    if (!existing) {
      entriesByUser.set(
        userKey,
        entry
      );

      return;
    }

    const entryUsesPreferredRound =
      entry.roundId ===
      preferredRoundId;

    const existingUsesPreferredRound =
      existing.roundId ===
      preferredRoundId;

    if (
      entryUsesPreferredRound &&
      !existingUsesPreferredRound
    ) {
      entriesByUser.set(
        userKey,
        entry
      );
    }
  });

  return Array.from(
    entriesByUser.values()
  );
}


/*
  Stops season totals from counting the same
  person twice in one round if old and new IDs
  temporarily coexist.
*/
function removeSeasonDuplicates(
  entries
) {
  const uniqueEntries =
    new Map();

  entries.forEach(entry => {
    const userKey =
      getEntryUserKey(entry);

    const roundKey =
      entry.roundId ||
      entry.gameweekId ||
      entry.id;

    const combinedKey =
      `${userKey}_${roundKey}`;

    if (
      !uniqueEntries.has(
        combinedKey
      )
    ) {
      uniqueEntries.set(
        combinedKey,
        entry
      );
    }
  });

  return Array.from(
    uniqueEntries.values()
  );
}


function renderLeaderboard(
  entries,
  mode
) {
  if (!dreamLeaderboardContainer) {
    return;
  }

  if (!entries.length) {
    showLeaderboardMessage(
      mode === "weekly"
        ? "No Dream Teams have been submitted for this gameweek yet."
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

      ${entries.map(
        (entry, index) => {
          const username =
            entry.username ||
            "ScoreCast24 Player";

          const isCurrentUser =
            submittedUsername &&
            username
              .trim()
              .toLowerCase() ===
              submittedUsername;

          return `
            <button
              type="button"
              class="dream-leaderboard-row
                ${
                  isCurrentUser
                    ? "current-dream-player"
                    : ""
                }"
              data-entry-id="${
                escapeHtml(
                  entry.id
                )
              }"
            >
              <span class="dream-position">
                ${index + 1}
              </span>

              <span class="dream-player-name">
                ${escapeHtml(
                  username
                )}

                ${
                  isCurrentUser
                    ? `
                      <small>
                        Your team
                      </small>
                    `
                    : ""
                }
              </span>

              <span class="dream-rating-total">
                ${Number(
                  entry.ratingTotal || 0
                )}
              </span>

              <span class="dream-points-total">
                ${Number(
                  entry.totalPoints || 0
                )}
              </span>
            </button>
          `;
        }
      ).join("")}

    </div>
  `;

  document
    .querySelectorAll(
      ".dream-leaderboard-row"
    )
    .forEach(row => {
      row.addEventListener(
        "click",
        () => {
          const entryId =
            row.dataset.entryId;

          if (!entryId) {
            return;
          }

          window.location.href =
            `dream-team-view.html?id=${
              encodeURIComponent(
                entryId
              )
            }`;
        }
      );
    });

  sessionStorage.removeItem(
    "dreamTeamSubmittedUsername"
  );
}


async function getActiveRoundEntries() {
  const activeRoundIds =
    getActiveRoundIds();

  const entriesQuery =
    query(
      collection(
        db,
        "dream_team_entries"
      ),
      where(
        "roundId",
        "in",
        activeRoundIds
      )
    );

  const snapshot =
    await getDocs(
      entriesQuery
    );

  const entries =
    snapshot.docs.map(
      documentSnapshot => ({
        id:
          documentSnapshot.id,

        ...documentSnapshot.data()
      })
    );

  return removeCurrentRoundDuplicates(
    entries
  );
}


async function loadWeeklyLeaderboard() {
  showLeaderboardMessage(
    "Loading this gameweek’s Dream Team leaderboard..."
  );

  try {
    const entries =
      await getActiveRoundEntries();

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

    const allEntries =
      snapshot.docs.map(
        documentSnapshot => ({
          id:
            documentSnapshot.id,

          ...documentSnapshot.data()
        })
      );

    const entries =
      removeSeasonDuplicates(
        allEntries
      );

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
        totalsByUser.get(
          userKey
        ) || {
          id: entry.id,
          uid:
            entry.uid || "",
          username:
            entry.username ||
            "ScoreCast24 Player",
          totalPoints: 0,
          ratingTotalSum: 0,
          weeksPlayed: 0
        };

      existing.totalPoints +=
        Number(
          entry.totalPoints || 0
        );

      existing.ratingTotalSum +=
        Number(
          entry.ratingTotal || 0
        );

      existing.weeksPlayed += 1;

      /*
        Keep an available entry ID so pressing
        the season row still opens a team.
      */
      existing.id =
        entry.id;

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
      sortEntries(
        seasonEntries
      ),
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
    ?.classList.add(
      "active"
    );

  seasonDreamLeaderboardTab
    ?.classList.remove(
      "active"
    );

  loadWeeklyLeaderboard();
}


function showSeasonTab() {
  seasonDreamLeaderboardTab
    ?.classList.add(
      "active"
    );

  weeklyDreamLeaderboardTab
    ?.classList.remove(
      "active"
    );

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


onAuthStateChanged(
  auth,
  async user => {
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

    viewMyDreamTeamBtn.textContent =
      "Loading My Dream Team...";

    viewMyDreamTeamBtn.removeAttribute(
      "href"
    );

    try {
      const entries =
        await getActiveRoundEntries();

      const userEntry =
        entries.find(entry => {
          if (
            entry.uid &&
            entry.uid === user.uid
          ) {
            return true;
          }

          /*
            Fallback for older documents whose
            document ID contains the user's UID.
          */
          return String(
            entry.id || ""
          ).includes(
            user.uid
          );
        });

      if (!userEntry) {
        viewMyDreamTeamBtn.href =
          "dream.html";

        viewMyDreamTeamBtn.textContent =
          "Choose My Dream Team";

        return;
      }

      viewMyDreamTeamBtn.href =
        `dream-team-view.html?id=${
          encodeURIComponent(
            userEntry.id
          )
        }`;

      viewMyDreamTeamBtn.textContent =
        "View My Dream Team";

    } catch (error) {
      console.error(
        "View My Dream Team error:",
        error
      );

      viewMyDreamTeamBtn.href =
        "dream.html";

      viewMyDreamTeamBtn.textContent =
        "View My Dream Team";
    }
  }
);


showWeeklyTab();
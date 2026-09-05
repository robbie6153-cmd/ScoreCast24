import { auth, db } from "./firebase.js?v=108";

import {
  collection,
  getDocs
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

const dreamWeekSelector =
  document.getElementById(
    "dreamWeekSelector"
  );

const viewMyDreamTeamBtn =
  document.getElementById(
    "viewMyDreamTeamBtn"
  );


/*
  Current Dream Team gameweek.
*/

const CURRENT_WEEK_NUMBER = 2;

const CURRENT_ROUND_ID =
  "2026-week-03";


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


function removeCurrentRoundDuplicates(
  entries
) {
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

    /*
      Prefer the new manual Week One entry
      if both an old and new document exist.
    */
    const entryIsManualWeekOne =
      entry.roundId ===
      CURRENT_ROUND_ID;

    const existingIsManualWeekOne =
      existing.roundId ===
      CURRENT_ROUND_ID;

    if (
      entryIsManualWeekOne &&
      !existingIsManualWeekOne
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


async function getActiveRoundEntries(roundId = CURRENT_ROUND_ID) {
  const snapshot =
    await getDocs(
      collection(
        db,
        "dream_team_entries"
      )
    );

  return snapshot.docs
    .map(
      documentSnapshot => ({
        id:
          documentSnapshot.id,

        ...documentSnapshot.data()
      })
    )
    .filter(
      entry =>
       entry.roundId ===
  roundId &&
        entry.status ===
        "submitted"
    );
}


async function loadWeeklyLeaderboard(
  roundId = dreamWeekSelector?.value || CURRENT_ROUND_ID
) {
  showLeaderboardMessage(
   "Loading Dream Team leaderboard..."
  );

  try {
  const entries =
  await getActiveRoundEntries(
    roundId
  );

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
  snapshot.docs
    .map(
      documentSnapshot => ({
        id:
          documentSnapshot.id,

        ...documentSnapshot.data()
      })
    )
    .filter(
      entry =>
        entry.status ===
          "submitted" &&
     (
  entry.roundId ===
    "2026-week-01" ||
  entry.roundId ===
    "2026-week-02" ||
  entry.roundId ===
    "2026-week-03"
)
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

  loadSeasonLeaderboard();
}


seasonDreamLeaderboardTab
  ?.addEventListener(
    "click",
    showSeasonTab
  );


dreamWeekSelector?.addEventListener(
  "change",
  () => {
    showWeeklyTab();
  }
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
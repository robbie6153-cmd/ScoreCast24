import {
  auth,
  db
} from "./firebase.js?v=108";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";


const dreamMiniLeagueContainer =
  document.getElementById(
    "dreamMiniLeagueContainer"
  );


function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showMessage(message) {
  if (!dreamMiniLeagueContainer) {
    return;
  }

  dreamMiniLeagueContainer.innerHTML = `
    <p>${escapeHtml(message)}</p>
  `;
}

async function loadDreamMiniLeagues() {
  if (!dreamMiniLeagueContainer) {
    return;
  }

  showMessage(
    "Loading Dream Team mini leagues..."
  );

  try {
    const leaguesQuery =
      query(
        collection(
          db,
          "dream_team_mini_leagues"
        )
      );

    const leaguesSnapshot =
      await getDocs(
        leaguesQuery
      );

    if (leaguesSnapshot.empty) {
      showMessage(
        "There are currently no Dream Team mini leagues."
      );

      return;
    }

    dreamMiniLeagueContainer.innerHTML =
      "";

    leaguesSnapshot.forEach(
      leagueDocument => {
        const league =
          leagueDocument.data() ||
          {};

        const leagueLink =
          document.createElement(
            "a"
          );

        leagueLink.href =
          `dream-mini-league.html?id=${encodeURIComponent(
            leagueDocument.id
          )}`;

        leagueLink.className =
          "dream-mini-league-list-item";

        const memberCount =
          Number(
            league.memberCount || 0
          );

        leagueLink.innerHTML = `
          <strong>
            ${escapeHtml(
              league.name ||
              "Dream Team Mini League"
            )}
          </strong>

          <span>
            ${memberCount}
            ${
              memberCount === 1
                ? "member"
                : "members"
            }
          </span>
        `;

        dreamMiniLeagueContainer.appendChild(
          leagueLink
        );
      }
    );

  } catch (error) {
    console.error(
      "Could not load Dream Team mini leagues:",
      error
    );

    showMessage(
      `Could not load Dream Team mini leagues: ${
        error.code ||
        error.message
      }`
    );
  }
}


onAuthStateChanged(
  auth,
  user => {
    if (!user) {
      showMessage(
        "Log in to view your Dream Team mini leagues."
      );

      return;
    }

   loadDreamMiniLeagues();
  }
);
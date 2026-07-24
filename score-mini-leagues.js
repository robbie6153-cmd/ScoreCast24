import {
  db
} from "./firebase.js?v=108";

import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


const miniLeagueContainer =
  document.getElementById(
    "miniLeagueContainer"
  );


/* =========================
   LOAD MINI LEAGUES
========================= */

async function loadMiniLeagues() {

  miniLeagueContainer.innerHTML =
    "<p>Loading mini leagues...</p>";

  try {

    const miniLeaguesQuery =
      query(
        collection(
          db,
          "score_prediction_mini_leagues"
        ),
        orderBy(
          "nameLowercase",
          "asc"
        )
      );

    const miniLeaguesSnapshot =
      await getDocs(
        miniLeaguesQuery
      );


    if (miniLeaguesSnapshot.empty) {

      miniLeagueContainer.innerHTML =
        "<p>There are currently no mini leagues.</p>";

      return;
    }


    miniLeagueContainer.innerHTML = "";


    miniLeaguesSnapshot.forEach(
      leagueDocument => {

        const leagueData =
          leagueDocument.data();

        const leagueName =
          leagueData.name ||
          "Unnamed Mini League";

        const memberCount =
          Number(
            leagueData.memberCount || 0
          );


        const leagueLink =
          document.createElement("a");

        leagueLink.href =
          `mini-league.html?id=${encodeURIComponent(
            leagueDocument.id
          )}`;

        leagueLink.className =
          "mini-league-list-item";


        leagueLink.innerHTML = `
          <span class="mini-league-list-name">
            ${escapeHtml(leagueName)}
          </span>

          <span class="mini-league-list-members">
            ${memberCount}
            ${memberCount === 1
              ? "member"
              : "members"}
          </span>
        `;


        miniLeagueContainer.appendChild(
          leagueLink
        );

      }
    );

  } catch (error) {

    console.error(
      "Could not load mini leagues:",
      error
    );

    miniLeagueContainer.innerHTML = `
      <p>
        Could not load mini leagues:
        ${escapeHtml(
          error.code || error.message
        )}
      </p>
    `;
  }
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


loadMiniLeagues();
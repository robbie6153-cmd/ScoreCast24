import {
  db
} from "./firebase.js?v=108";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


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


async function loadMiniLeague() {

  if (!miniLeagueId) {

    miniLeagueTitle.textContent =
      "Mini League Not Found";

    miniLeagueMemberCount.textContent =
      "No mini league was selected.";

    joinMiniLeagueBtn.style.display =
      "none";

    miniLeagueLeaderboard.innerHTML =
      "<p>Return to the mini leagues page and select a league.</p>";

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

      miniLeagueLeaderboard.innerHTML =
        "<p>The selected mini league could not be found.</p>";

      return;
    }


    const leagueData =
      leagueSnapshot.data();


    miniLeagueTitle.textContent =
      leagueData.name || "Mini League";


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


    if (memberCount === 0) {

      miniLeagueLeaderboard.innerHTML =
        "<p>This mini league currently has no members.</p>";

    } else {

      miniLeagueLeaderboard.innerHTML =
        "<p>League members and scores will appear here next.</p>";
    }

  } catch (error) {

    console.error(
      "Could not load mini league:",
      error
    );

    miniLeagueTitle.textContent =
      "Mini League";

    miniLeagueMemberCount.textContent =
      "Could not load league details.";

    miniLeagueMessage.textContent =
      `Could not load mini league: ${
        error.code || error.message
      }`;
  }
}


joinMiniLeagueBtn.addEventListener(
  "click",
  () => {

    miniLeagueMessage.textContent =
      "Payment and league membership will be added later.";

  }
);


loadMiniLeague();
import {
  auth,
  db
} from "./firebase.js?v=108";

import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";


const createMiniLeagueForm =
  document.getElementById(
    "createMiniLeagueForm"
  );

const miniLeagueNameInput =
  document.getElementById(
    "miniLeagueName"
  );

const createMiniLeagueBtn =
  document.getElementById(
    "createMiniLeagueBtn"
  );

const createMiniLeagueMessage =
  document.getElementById(
    "createMiniLeagueMessage"
  );


let currentUser = null;
let authenticationChecked = false;


/* =========================
   SHOW MESSAGE
========================= */

function showMessage(message, type = "") {
  createMiniLeagueMessage.textContent =
    message;

  createMiniLeagueMessage.classList.remove(
    "success",
    "error"
  );

  if (type) {
    createMiniLeagueMessage.classList.add(
      type
    );
  }
}


/* =========================
   CLEAN LEAGUE NAME
========================= */

function cleanLeagueName(name) {
  return name
    .trim()
    .replace(/\s+/g, " ");
}


/* =========================
   AUTHENTICATION
========================= */

createMiniLeagueBtn.disabled = true;

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;
    authenticationChecked = true;

    if (!user) {
      showMessage(
        "You must be logged in to create a mini league.",
        "error"
      );

      createMiniLeagueBtn.disabled = false;
      return;
    }

    createMiniLeagueBtn.disabled = false;
  }
);


/* =========================
   CREATE MINI LEAGUE
========================= */

createMiniLeagueForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!authenticationChecked) {
      showMessage(
        "Checking your account. Please try again.",
        "error"
      );

      return;
    }

    if (!currentUser) {
      showMessage(
        "You must be logged in to create a mini league.",
        "error"
      );

      return;
    }

    const miniLeagueName =
      cleanLeagueName(
        miniLeagueNameInput.value
      );

    if (miniLeagueName.length < 3) {
      showMessage(
        "The mini league name must contain at least 3 characters.",
        "error"
      );

      return;
    }

    if (miniLeagueName.length > 40) {
      showMessage(
        "The mini league name cannot contain more than 40 characters.",
        "error"
      );

      return;
    }

    const miniLeagueNameLowercase =
      miniLeagueName.toLowerCase();

    createMiniLeagueBtn.disabled = true;
    createMiniLeagueBtn.textContent =
      "Creating...";

    showMessage(
      "Checking mini league name..."
    );

    try {

      /*
        Check whether the league name
        already exists.
      */

      const existingLeagueQuery =
        query(
          collection(
            db,
            "score_prediction_mini_leagues"
          ),
          where(
            "nameLowercase",
            "==",
            miniLeagueNameLowercase
          ),
          limit(1)
        );

      const existingLeagueSnapshot =
        await getDocs(
          existingLeagueQuery
        );

      if (!existingLeagueSnapshot.empty) {
        showMessage(
          "A mini league with that name already exists.",
          "error"
        );

        createMiniLeagueBtn.disabled = false;
        createMiniLeagueBtn.textContent =
          "Create Mini League";

        return;
      }


      const username =
        localStorage.getItem(
          "scorecast24Username"
        ) ||
        currentUser.displayName ||
        currentUser.email ||
        "ScoreCast24 Player";


      /*
        Create a new league document with
        an automatically generated ID.
      */

      const leagueReference =
        doc(
          collection(
            db,
            "score_prediction_mini_leagues"
          )
        );


      /*
        Store members in a subcollection rather
        than one large array. This allows leagues
        to grow without a fixed member limit.
      */

      const memberReference =
        doc(
          db,
          "score_prediction_mini_leagues",
          leagueReference.id,
          "members",
          currentUser.uid
        );


      const batch =
        writeBatch(db);


      batch.set(
        leagueReference,
        {
          name: miniLeagueName,
          nameLowercase:
            miniLeagueNameLowercase,

          creatorUid:
            currentUser.uid,

          creatorUsername:
            username,

          memberCount: 1,

          createdAt:
            serverTimestamp(),

          status: "active"
        }
      );


      batch.set(
        memberReference,
        {
          uid:
            currentUser.uid,

          username:
            username,

          email:
            currentUser.email || "",

          joinedAt:
            serverTimestamp(),

          role: "creator"
        }
      );


      await batch.commit();


      showMessage(
        "Mini league created successfully.",
        "success"
      );


      window.location.href =
        `mini-league.html?id=${encodeURIComponent(
          leagueReference.id
        )}`;

    } catch (error) {

      console.error(
        "Could not create mini league:",
        error
      );

      showMessage(
        "The mini league could not be created. Please try again.",
        "error"
      );

      createMiniLeagueBtn.disabled = false;
      createMiniLeagueBtn.textContent =
        "Create Mini League";
    }
  }
);
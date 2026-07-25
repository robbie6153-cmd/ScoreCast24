import {
  auth
} from "./firebase.js?v=108";

import {
  getApp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-functions.js";


const createDreamMiniLeagueForm =
  document.getElementById(
    "createDreamMiniLeagueForm"
  );

const dreamMiniLeagueNameInput =
  document.getElementById(
    "dreamMiniLeagueName"
  );

const createDreamMiniLeagueBtn =
  document.getElementById(
    "createDreamMiniLeagueBtn"
  );

const createDreamMiniLeagueMessage =
  document.getElementById(
    "createDreamMiniLeagueMessage"
  );


/*
  Connect to Firebase Functions
  in the same region as the backend.
*/

const functions =
  getFunctions(
    getApp(),
    "europe-west1"
  );

const createDreamMiniLeagueCheckout =
  httpsCallable(
    functions,
    "createDreamMiniLeagueCheckout"
  );


let currentUser = null;
let authenticationChecked = false;


/* =========================
   SHOW MESSAGE
========================= */

function showMessage(
  message,
  type = ""
) {
  if (!createDreamMiniLeagueMessage) {
    return;
  }

  createDreamMiniLeagueMessage.textContent =
    message;

  createDreamMiniLeagueMessage.classList.remove(
    "success",
    "error"
  );

  if (type) {
    createDreamMiniLeagueMessage.classList.add(
      type
    );
  }
}


/* =========================
   CLEAN LEAGUE NAME
========================= */

function cleanLeagueName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}


/* =========================
   RESET BUTTON
========================= */

function resetCreateButton() {
  if (!createDreamMiniLeagueBtn) {
    return;
  }

  createDreamMiniLeagueBtn.disabled =
    false;

  createDreamMiniLeagueBtn.textContent =
    "Create Mini League";
}


/* =========================
   AUTHENTICATION
========================= */

if (createDreamMiniLeagueBtn) {
  createDreamMiniLeagueBtn.disabled =
    true;
}

onAuthStateChanged(
  auth,
  user => {
    currentUser =
      user;

    authenticationChecked =
      true;

    if (!createDreamMiniLeagueBtn) {
      return;
    }

    if (!user) {
      showMessage(
        "You must be logged in to create a Dream Team mini league.",
        "error"
      );

      createDreamMiniLeagueBtn.disabled =
        false;

      return;
    }

    createDreamMiniLeagueBtn.disabled =
      false;
  }
);


/* =========================
   CANCELLED PAYMENT MESSAGE
========================= */

const pageParameters =
  new URLSearchParams(
    window.location.search
  );

if (
  pageParameters.get("payment") ===
  "cancelled"
) {
  showMessage(
    "Payment was cancelled. Your Dream Team mini league has not been activated.",
    "error"
  );

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
}


/* =========================
   CREATE DREAM MINI LEAGUE
========================= */

if (createDreamMiniLeagueForm) {
  createDreamMiniLeagueForm.addEventListener(
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
          "You must be logged in to create a Dream Team mini league.",
          "error"
        );

        return;
      }

      const miniLeagueName =
        cleanLeagueName(
          dreamMiniLeagueNameInput?.value
        );

      if (
        miniLeagueName.length < 3
      ) {
        showMessage(
          "The mini league name must contain at least 3 characters.",
          "error"
        );

        return;
      }

      if (
        miniLeagueName.length > 40
      ) {
        showMessage(
          "The mini league name cannot contain more than 40 characters.",
          "error"
        );

        return;
      }

      const username =
        localStorage.getItem(
          "scorecast24Username"
        ) ||
        currentUser.displayName ||
        currentUser.email ||
        "ScoreCast24 Player";

      createDreamMiniLeagueBtn.disabled =
        true;

      createDreamMiniLeagueBtn.textContent =
        "Opening payment...";

      showMessage(
        "Preparing your £1 secure payment..."
      );

      try {
        const result =
          await createDreamMiniLeagueCheckout({
            miniLeagueName,
            username
          });

        const checkoutUrl =
          result?.data?.url;

        if (!checkoutUrl) {
          throw new Error(
            "The payment page address was not returned."
          );
        }

        showMessage(
          "Taking you to Stripe..."
        );

        window.location.href =
          checkoutUrl;

      } catch (error) {
        console.error(
          "Could not open Dream Team mini league payment:",
          error
        );

        let errorMessage =
          "The payment page could not be opened. Please try again.";

        if (
          error?.code ===
          "functions/already-exists"
        ) {
          errorMessage =
            "A Dream Team mini league with that name already exists.";

        } else if (
          error?.code ===
          "functions/unauthenticated"
        ) {
          errorMessage =
            "You must be logged in to create a Dream Team mini league.";

        } else if (
          error?.code ===
          "functions/invalid-argument"
        ) {
          errorMessage =
            error.message ||
            "Please enter a valid mini league name.";

        } else if (
          error?.message
        ) {
          errorMessage =
            error.message;
        }

        showMessage(
          errorMessage,
          "error"
        );

        resetCreateButton();
      }
    }
  );
}
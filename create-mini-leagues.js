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


/*
  Connect to Firebase Functions
  in the same region as the backend.
*/

const functions =
  getFunctions(
    getApp(),
    "europe-west1"
  );

const createScoreMiniLeagueCheckout =
  httpsCallable(
    functions,
    "createScoreMiniLeagueCheckout"
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
  if (!createMiniLeagueMessage) {
    return;
  }

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
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}


/* =========================
   RESET BUTTON
========================= */

function resetCreateButton() {
  createMiniLeagueBtn.disabled =
    false;

  createMiniLeagueBtn.textContent =
    "Create Mini League";
}


/* =========================
   AUTHENTICATION
========================= */

createMiniLeagueBtn.disabled =
  true;

onAuthStateChanged(
  auth,
  user => {
    currentUser =
      user;

    authenticationChecked =
      true;

    if (!user) {
      showMessage(
        "You must be logged in to create a mini league.",
        "error"
      );

      createMiniLeagueBtn.disabled =
        false;

      return;
    }

    createMiniLeagueBtn.disabled =
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
    "Payment was cancelled. Your mini league has not been activated.",
    "error"
  );

  /*
    Remove the cancelled-payment details
    from the address bar.
  */

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
}


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

    createMiniLeagueBtn.disabled =
      true;

    createMiniLeagueBtn.textContent =
      "Opening payment...";

    showMessage(
      "Preparing your £1 secure payment..."
    );

    try {
      const result =
        await createScoreMiniLeagueCheckout({
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
        "Could not open mini league payment:",
        error
      );

      let errorMessage =
        "The payment page could not be opened. Please try again.";

      if (
        error?.code ===
        "functions/already-exists"
      ) {
        errorMessage =
          "A mini league with that name already exists.";
      } else if (
        error?.code ===
        "functions/unauthenticated"
      ) {
        errorMessage =
          "You must be logged in to create a mini league.";
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
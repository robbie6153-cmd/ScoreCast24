import { auth, db } from "./firebase.js?v=109";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


/* =========================
   PAGE ELEMENTS
========================= */

const createPublicLeagueBtn =
  document.getElementById("createPublicLeagueBtn");

const createPrivateLeagueBtn =
  document.getElementById("createPrivateLeagueBtn");

const leagueNameInput =
  document.getElementById("leagueName");

const leagueDescriptionInput =
  document.getElementById("leagueDescription");

const publicLeagueMessage =
  document.getElementById("publicLeagueMessage");

const privateLeagueMessage =
  document.getElementById("privateLeagueMessage");


/* =========================
   USERNAME
========================= */

async function getUsername(user) {
  const savedUsername =
    localStorage.getItem("scorecast24Username") ||
    localStorage.getItem("username") ||
    "";

  if (savedUsername.trim()) {
    return savedUsername.trim();
  }

  if (!user) {
    return "";
  }

  try {
    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();

      return String(
        userData.username || ""
      ).trim();
    }
  } catch (error) {
    console.error(
      "Could not load username:",
      error
    );
  }

  return "";
}


/* =========================
   TEXT HELPERS
========================= */

function cleanText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}


function createCleanLeagueName(value) {
  return cleanText(value).toLowerCase();
}


function showMessage(text, type = "") {
  const messageElement =
    publicLeagueMessage ||
    privateLeagueMessage;

  if (!messageElement) {
    return;
  }

  messageElement.textContent = text;

  messageElement.className =
    `mini-league-message ${type}`.trim();
}


/* =========================
   VALIDATION
========================= */

function validateLeagueDetails(
  leagueName,
  leagueDescription
) {
  if (!leagueName) {
    return "Please enter a league name.";
  }

  if (leagueName.length < 3) {
    return (
      "Please enter a league name containing " +
      "at least 3 characters."
    );
  }

  if (leagueName.length > 40) {
    return (
      "The league name cannot contain more " +
      "than 40 characters."
    );
  }

  if (leagueDescription.length > 250) {
    return (
      "The league description cannot contain " +
      "more than 250 characters."
    );
  }

  return "";
}


/* =========================
   DUPLICATE NAME CHECK
========================= */

async function leagueNameAlreadyExists(
  cleanLeagueName
) {
  const leagueQuery = query(
    collection(db, "dream_mini_leagues"),
    where(
      "cleanName",
      "==",
      cleanLeagueName
    )
  );

  const leagueSnapshot =
    await getDocs(leagueQuery);

  return !leagueSnapshot.empty;
}


/* =========================
   CREATE LEAGUE
========================= */

async function createMiniLeague(
  leagueType,
  button
) {
  const user = auth.currentUser;

  if (!user) {
    showMessage(
      "You must be logged in before creating a mini league.",
      "error"
    );
    return;
  }

  const username =
    await getUsername(user);

  if (!username) {
    showMessage(
      "You must create a ScoreCast24 username first.",
      "error"
    );
    return;
  }

  if (
    !leagueNameInput ||
    !leagueDescriptionInput
  ) {
    showMessage(
      "The mini league form could not be found.",
      "error"
    );
    return;
  }

  const leagueName =
    cleanText(leagueNameInput.value);

  const leagueDescription =
    cleanText(leagueDescriptionInput.value);

  const validationError =
    validateLeagueDetails(
      leagueName,
      leagueDescription
    );

  if (validationError) {
    showMessage(
      validationError,
      "error"
    );
    return;
  }

  const cleanLeagueName =
    createCleanLeagueName(leagueName);

  const leagueTypeLabel =
    leagueType === "private"
      ? "private"
      : "public";

  const confirmed = window.confirm(
    `Create the ${leagueTypeLabel} mini league ` +
    `"${leagueName}"?\n\n` +
    "No payment will be taken while the feature is being tested."
  );

  if (!confirmed) {
    return;
  }

  const originalButtonText =
    button.textContent;

  try {
    button.disabled = true;
    button.textContent =
      "Checking League Name...";

    showMessage(
      "Checking that the league name is available..."
    );

    const nameExists =
      await leagueNameAlreadyExists(
        cleanLeagueName
      );

    if (nameExists) {
      throw new Error(
        "A mini league with this name already exists. " +
        "Please choose another name."
      );
    }

    button.textContent =
      "Creating League...";

    showMessage(
      `Creating your ${leagueTypeLabel} mini league...`
    );

    const leagueDocument = await addDoc(
      collection(db, "dream_mini_leagues"),
      {
        name: leagueName,
        cleanName: cleanLeagueName,
        description: leagueDescription,

        type: leagueType,
        status: "active",

        ownerUid: user.uid,
        ownerUsername: username,
        ownerEmail: user.email || "",

        memberLimit: 20,
        memberCount: 1,

        memberUids: [
          user.uid
        ],

        members: [
          {
            uid: user.uid,
            username,
            role: "owner"
          }
        ],

        invitationOnly:
          leagueType === "private",

        visibleInPublicSearch:
          leagueType === "public",

        creationPrice: 1,

        paymentRequired: false,
        paymentStatus: "testing",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    localStorage.setItem(
      "latestDreamMiniLeagueId",
      leagueDocument.id
    );

    localStorage.setItem(
      "latestDreamMiniLeagueName",
      leagueName
    );

    leagueNameInput.disabled = true;
    leagueDescriptionInput.disabled = true;

    button.textContent =
      "League Created";

    showMessage(
      `Your ${leagueTypeLabel} mini league ` +
      `"${leagueName}" has been created successfully.`,
      "success"
    );

  } catch (error) {
    console.error(
      "Could not create mini league:",
      error
    );

    button.disabled = false;
    button.textContent =
      originalButtonText;

    showMessage(
      error.message ||
      "The mini league could not be created. Please try again.",
      "error"
    );
  }
}


/* =========================
   PUBLIC LEAGUE BUTTON
========================= */

if (createPublicLeagueBtn) {
  createPublicLeagueBtn.addEventListener(
    "click",
    async () => {
      await createMiniLeague(
        "public",
        createPublicLeagueBtn
      );
    }
  );
}


/* =========================
   PRIVATE LEAGUE BUTTON
========================= */

if (createPrivateLeagueBtn) {
  createPrivateLeagueBtn.addEventListener(
    "click",
    async () => {
      await createMiniLeague(
        "private",
        createPrivateLeagueBtn
      );
    }
  );
}
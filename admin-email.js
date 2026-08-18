import {
  auth
} from "./firebase.js?v=107";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-functions.js";


/* =========================
   FIREBASE FUNCTIONS
========================= */

const functions =
  getFunctions(
    undefined,
    "europe-west1"
  );


const sendScoreCastAnnouncement =
  httpsCallable(
    functions,
    "sendScoreCastAnnouncement"
  );


/* =========================
   PAGE ELEMENTS
========================= */

const emailSubject =
  document.getElementById(
    "emailSubject"
  );

const emailMessage =
  document.getElementById(
    "emailMessage"
  );

const emailButtonText =
  document.getElementById(
    "emailButtonText"
  );

const emailButtonUrl =
  document.getElementById(
    "emailButtonUrl"
  );

const sendEmailBtn =
  document.getElementById(
    "sendEmailBtn"
  );

const emailStatus =
  document.getElementById(
    "emailStatus"
  );


let currentUser = null;


/* =========================
   STATUS MESSAGE
========================= */

function showStatus(message) {
  if (!emailStatus) {
    return;
  }

  emailStatus.textContent =
    message;
}


/* =========================
   AUTHENTICATION
========================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user;


    if (!user) {

      showStatus(
        "You must be logged in as the ScoreCast24 administrator."
      );

      if (sendEmailBtn) {
        sendEmailBtn.disabled =
          true;
      }

      return;
    }


    showStatus(
      `Logged in as ${user.email}`
    );


    if (sendEmailBtn) {
      sendEmailBtn.disabled =
        false;
    }

  }
);


/* =========================
   SEND ANNOUNCEMENT
========================= */

if (sendEmailBtn) {

  sendEmailBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        showStatus(
          "You must be logged in."
        );

        return;
      }


      const subject =
        emailSubject.value.trim();

      const message =
        emailMessage.value.trim();

      const buttonText =
        emailButtonText.value.trim();

      const buttonUrl =
        emailButtonUrl.value.trim();


      if (!subject) {

        alert(
          "Please enter an email subject."
        );

        return;
      }


      if (!message) {

        alert(
          "Please enter an email message."
        );

        return;
      }


      /*
        Deliberate confirmation because
        this sends to EVERY user.
      */

      const confirmed =
        window.confirm(
          `Send this email to ALL registered ScoreCast24 users?\n\nSubject: ${subject}\n\nThis cannot be undone.`
        );


      if (!confirmed) {
        return;
      }


      sendEmailBtn.disabled =
        true;

      sendEmailBtn.textContent =
        "Sending...";


      showStatus(
        "Sending ScoreCast24 announcement..."
      );


      try {

        const result =
          await sendScoreCastAnnouncement({
            subject,
            message,
            buttonText,
            buttonUrl
          });


        const data =
          result.data || {};


        showStatus(
          `Email complete. ${data.sent || 0} sent, ${data.failed || 0} failed.`
        );


        alert(
          `Email complete.\n\nSent: ${data.sent || 0}\nFailed: ${data.failed || 0}`
        );


      } catch (error) {

        console.error(
          "Announcement failed:",
          error
        );


        let message =
          "The email could not be sent.";


        if (
          error.code ===
          "functions/permission-denied"
        ) {

          message =
            "You are not authorised to send ScoreCast24 emails.";

        } else if (
          error.code ===
          "functions/unauthenticated"
        ) {

          message =
            "You must be logged in.";

        } else if (
          error.message
        ) {

          message =
            error.message;

        }


        showStatus(
          message
        );


        alert(
          message
        );


      } finally {

        sendEmailBtn.disabled =
          false;

        sendEmailBtn.textContent =
          "Send Email to All Users";

      }

    }
  );

}
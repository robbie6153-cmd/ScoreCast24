import { auth, db } from "./firebase.js?v=107";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Persistence error:", error);
});

let currentUser = null;

const authBox = document.createElement("div");
authBox.className = "auth-box";
authBox.innerHTML = `
  <div class="auth-card">
    <button class="auth-close" id="authCloseBtn">×</button>

    <h2>ScoreCast24 Account</h2>
    <p class="auth-note">
      Create one free ScoreCast24 account to play all games.
    </p>

    <input id="authEmail" type="email" placeholder="Email address">
    <input id="authPassword" type="password" placeholder="Password">

    <button id="createAccountBtn">Create account</button>
    <button id="loginBtn">Log in</button>

    <p>
      <button id="forgotPasswordBtn" class="text-btn">
        Forgot password? Reset password
      </button>
    </p>

    <p id="authMessage"></p>
  </div>
`;

document.body.appendChild(authBox);

const authMessage = document.getElementById("authMessage");

function showAuthPopup(message = "") {
  authBox.style.display = "flex";
  authMessage.textContent = message;
}

function hideAuthPopup() {
  authBox.style.display = "none";
}

document.getElementById("authCloseBtn").addEventListener("click", hideAuthPopup);

document.getElementById("createAccountBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!email || !password) {
    authMessage.textContent = "Please enter an email and password.";
    return;
  }

  try {
    authMessage.textContent = "Creating account...";

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await sendEmailVerification(userCredential.user, {
      url: "https://scorecast24.com/username.html",
      handleCodeInApp: false
    });

    authMessage.textContent =
      "Account created. Verification email sent. After verifying, log in and choose your username.";
  } catch (error) {
    authMessage.textContent = cleanAuthError(error.code);
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!email || !password) {
    authMessage.textContent = "Please enter your email and password.";
    return;
  }

  try {
    authMessage.textContent = "Logging in...";

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
      authMessage.textContent =
        "Please verify your email before playing. Check your inbox or spam/junk folder.";
      return;
    }

    hideAuthPopup();

    const username = await loadUsername(userCredential.user);

    if (!username && !window.location.pathname.includes("username.html")) {
      window.location.href = "username.html";
    }
  } catch (error) {
    authMessage.textContent = cleanAuthError(error.code);
  }
});

document.getElementById("forgotPasswordBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();

  if (!email) {
    authMessage.textContent = "Enter your email address first, then press reset password.";
    return;
  }

  try {
    authMessage.textContent = "Sending password reset...";

    await sendPasswordResetEmail(auth, email, {
      url: "https://scorecast24.com",
      handleCodeInApp: false
    });

    authMessage.textContent =
      "Password reset email sent. Please check your inbox and spam/junk folder.";
  } catch (error) {
    authMessage.textContent = cleanAuthError(error.code);
  }
});

async function loadUsername(user) {
  let username = localStorage.getItem("scorecast24Username");
  let cleanUsername = localStorage.getItem("scorecast24CleanUsername");

  if (username && cleanUsername) {
    return username;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      username = userSnap.data().username || "";
      cleanUsername = userSnap.data().cleanUsername || "";

      if (username) localStorage.setItem("scorecast24Username", username);
      if (cleanUsername) localStorage.setItem("scorecast24CleanUsername", cleanUsername);

      return username;
    }
  } catch (error) {
    console.error("Username load error:", error);
  }

  return "";
}

onAuthStateChanged(auth, user => {
  currentUser = user;

  const loginStatus =
    document.getElementById("loginStatus");

  const menuLinks =
    document.getElementById("dropdownMenu");

  if (user && user.emailVerified) {

    /*
      Show logged-in state immediately.
      Do not make the page wait for Firestore.
    */

    if (loginStatus) {
      loginStatus.textContent = "Logged in";
    }


    /*
      Load username afterwards.
    */

    loadUsername(user)
      .then(username => {

        if (!loginStatus) {
          return;
        }

        if (username) {
          loginStatus.textContent =
            `Logged in as ${username}`;
        } else {
          loginStatus.innerHTML = `
            Logged in
            <a
              href="username.html"
              style="
                color:#f5c542;
                text-decoration:underline;
              "
            >
              Create username
            </a>
          `;
        }

      })
      .catch(error => {
        console.error(
          "Username display error:",
          error
        );
      });


    /*
      ADD LOGOUT BUTTON
    */

    if (
      menuLinks &&
      !document.getElementById(
        "logoutMenuBtn"
      )
    ) {
      const logoutBtn =
        document.createElement(
          "button"
        );

      logoutBtn.id =
        "logoutMenuBtn";

    logoutBtn.className = "";

      logoutBtn.textContent =
        "Log out";

      logoutBtn.addEventListener(
        "click",
        async () => {
          await logoutUser();

          window.location.href =
            "index.html";
        }
      );

      menuLinks.appendChild(
        logoutBtn
      );
    }

  } else {

    localStorage.removeItem(
      "scorecast24Username"
    );

    localStorage.removeItem(
      "scorecast24CleanUsername"
    );

    if (loginStatus) {
      loginStatus.textContent =
        "Not logged in";
    }


    /*
      Remove logout button if present.
    */

    const logoutBtn =
      document.getElementById(
        "logoutMenuBtn"
      );

    if (logoutBtn) {
      logoutBtn.remove();
    }
  }
});

function cleanAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function requireLogin() {
  if (!currentUser) {
    showAuthPopup("You must create an account to play. The same account can be used for all ScoreCast24 games.");
    return false;
  }

  if (!currentUser.emailVerified) {
    showAuthPopup("Please verify your email before playing. Check your inbox or spam/junk folder.");
    return false;
  }

  return true;
}

export function openAuthPopup() {
  showAuthPopup();
}

export function getCurrentUser() {
  return currentUser;
}

export async function logoutUser() {
  localStorage.removeItem("scorecast24Username");
  localStorage.removeItem("scorecast24CleanUsername");
  await signOut(auth);
}
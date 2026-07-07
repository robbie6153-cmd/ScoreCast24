import { auth } from "./firebase.js?v=8";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await sendEmailVerification(userCredential.user, {
      url: "https://scorecast24.com/username.html",
      handleCodeInApp: false
    });

    authMessage.textContent =
      "Account created. We have sent an email confirmation. Please check your spam/junk folder.";
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
      authMessage.textContent =
        "Please verify your email before playing. Check your inbox or spam/junk folder.";
      return;
    }

    hideAuthPopup();
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

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  const loginStatus = document.getElementById("loginStatus");

  if (loginStatus) {
    if (user && user.emailVerified) {
      const username = localStorage.getItem("scorecast24Username") || user.email;
      loginStatus.textContent = `Logged in as ${username}`;
    } else {
      loginStatus.textContent = "Not logged in";
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
  await signOut(auth);
}
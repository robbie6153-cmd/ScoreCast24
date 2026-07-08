import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzevzy5fy0karxUfs2GOStF8YoNSlUARg",
  authDomain: "scorecast24.firebaseapp.com",
  projectId: "scorecast24",
  storageBucket: "scorecast24.firebasestorage.app",
  messagingSenderId: "879114353512",
  appId: "1:879114353512:web:e077c031ea19cb629534dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Keeps users logged in until they press your logout button.
// This avoids top-level await breaking the login script.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

export { app, db, auth };
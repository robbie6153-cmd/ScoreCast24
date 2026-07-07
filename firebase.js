import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzevzy5fy0karxUfs2GOStF8YoNSlUARg",
  authDomain: "scorecast24.firebaseapp.com",
  projectId: "scorecast24",
  storageBucket: "scorecast24.firebasestorage.app",
  messagingSenderId: "879114353512",
  appId: "1:879114353512:web:e077c031ea19cb629534dd"
};

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
const auth = getAuth(app);

export const db = getFirestore(app);
export { analytics, auth };
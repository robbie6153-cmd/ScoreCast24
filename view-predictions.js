import { db } from "./firebase.js?v=3";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const predictionTitle = document.getElementById("predictionTitle");
const predictionContainer = document.getElementById("predictionContainer");

const predictionId = localStorage.getItem("viewPredictionId");
const predictionUsername = localStorage.getItem("viewPredictionUsername");

async function loadPredictions() {
  if (!predictionId) {
    predictionContainer.innerHTML = "<p>No prediction selected.</p>";
    return;
  }

  predictionTitle.textContent = `${predictionUsername || "User"}'s Predictions`;

  try {
    const predictionRef = doc(db, "scorecast24_predictions", predictionId);
    const predictionSnap = await getDoc(predictionRef);

    if (!predictionSnap.exists()) {
      predictionContainer.innerHTML = "<p>Predictions not found.</p>";
      return;
    }

    const data = predictionSnap.data();
    predictionTitle.textContent = `${predictionUsername || data.username || "User"}'s ${data.round || ""} Predictions`;
    const predictions = data.predictions || [];

    if (predictions.length === 0) {
      predictionContainer.innerHTML = "<p>No predictions saved for this user.</p>";
      return;
    }

    predictionContainer.innerHTML = "";

    predictions.forEach((prediction) => {
      const div = document.createElement("div");
      div.className = "prediction-view-row";

      div.innerHTML = `
        <div class="prediction-fixture">
          ${prediction.home} v ${prediction.away}
        </div>

        <div class="prediction-score">
          ${prediction.predictedHome} - ${prediction.predictedAway}
        </div>
      `;

      predictionContainer.appendChild(div);
    });

  } catch (error) {
    console.error(error);
    predictionContainer.innerHTML = "<p>Could not load predictions.</p>";
  }
}

loadPredictions();
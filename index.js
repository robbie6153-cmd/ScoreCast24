const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();

setGlobalOptions({
  maxInstances: 2,
  region: "europe-west1"
});

const iCloudEmail = defineSecret("ICLOUD_EMAIL");
const iCloudAppPassword = defineSecret("ICLOUD_APP_PASSWORD");
const adminEmail = defineSecret("ADMIN_EMAIL");
const replyToEmail = defineSecret("REPLY_TO_EMAIL");

/*
  This function runs whenever this Firestore document changes:

  Collection: premier_league
  Document: current_table

  The document must contain:

  teams: [
    "Arsenal",
    "Manchester City",
    ...
  ]
*/

exports.sendPremierLeaguePredictionReport = onDocumentWritten(
  {
    document: "premier_league/current_table",
    secrets: [
      iCloudEmail,
      iCloudAppPassword,
      adminEmail,
      replyToEmail
    ]
  },

  async event => {
    if (!event.data?.after.exists) {
      console.log("The current Premier League table was deleted.");
      return;
    }

    const tableData = event.data.after.data();

    const rawTable =
      tableData.teams ||
      tableData.table ||
      tableData.currentPremierLeagueTable ||
      [];

    const currentTable = rawTable
      .map(item => {
        if (typeof item === "string") {
          return item;
        }

        return item?.team || item?.name || "";
      })
      .filter(Boolean);

    if (currentTable.length !== 20) {
      console.error(
        `The current table must contain 20 teams. It currently contains ${currentTable.length}.`
      );
      return;
    }

    const predictionsSnapshot = await db
      .collection("premier_league_predictions")
      .get();

    let totalValidEntries = 0;
    let highestMatches = -1;

    const exactMatches = [];
    let currentLeaders = [];

    predictionsSnapshot.forEach(predictionDocument => {
      const data = predictionDocument.data();

      const prediction = Array.isArray(data.prediction)
        ? data.prediction
        : [];

      if (prediction.length !== 20) {
        console.warn(
          `Skipped ${predictionDocument.id}: prediction does not contain 20 teams.`
        );
        return;
      }

      totalValidEntries++;

      let matches = 0;

      prediction.forEach((item, index) => {
        const predictedTeam =
          typeof item === "string"
            ? item
            : item.team;

        const positionIndex =
          typeof item?.position === "number"
            ? item.position - 1
            : index;

        if (
          positionIndex >= 0 &&
          positionIndex < 20 &&
          predictedTeam === currentTable[positionIndex]
        ) {
          matches++;
        }
      });

      const userDetails = {
        username:
          data.username ||
          data.cleanUsername ||
          predictionDocument.id,

        email:
          data.email ||
          "No email saved",

        matches
      };

      if (matches === 20) {
        exactMatches.push(userDetails);
      }

      if (matches > highestMatches) {
        highestMatches = matches;
        currentLeaders = [userDetails];
      } else if (matches === highestMatches) {
        currentLeaders.push(userDetails);
      }
    });

    const exactMatchList = exactMatches.length
      ? exactMatches
          .map(user => {
            return `${user.username}
Email: ${user.email}
Matching positions: ${user.matches}/20`;
          })
          .join("\n\n")
      : "None";

    const leaderList = currentLeaders.length
      ? currentLeaders
          .map(user => {
            return `${user.username}
Email: ${user.email}
Matching positions: ${user.matches}/20`;
          })
          .join("\n\n")
      : "No valid predictions found.";

    const subject = exactMatches.length
      ? `🏆 ScoreCast24: ${exactMatches.length} exact prediction match${exactMatches.length === 1 ? "" : "es"}`
      : "ScoreCast24 Premier League prediction report";

    const emailBody = `
PREMIER LEAGUE PREDICTION REPORT

Total valid predictions: ${totalValidEntries}

Exact 20/20 matches: ${exactMatches.length}

EXACT-MATCH USERS

${exactMatchList}


MOST MATCHING POSITIONS

Highest score: ${
      highestMatches >= 0
        ? `${highestMatches}/20`
        : "No valid entries"
    }

${leaderList}
    `.trim();

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      requireTLS: true,

      auth: {
        user: iCloudEmail.value(),
        pass: iCloudAppPassword.value()
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"ScoreCast24 Reports" <${iCloudEmail.value()}>`,
      to: adminEmail.value(),
      replyTo: replyToEmail.value(),
      subject,
      text: emailBody
    });

    console.log(
      `Premier League report sent. Entries: ${totalValidEntries}; exact matches: ${exactMatches.length}; highest score: ${highestMatches}.`
    );
  }
);
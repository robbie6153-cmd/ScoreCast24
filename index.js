const { setGlobalOptions } = require("firebase-functions/v2");

const {
  onDocumentWritten
} = require("firebase-functions/v2/firestore");

const {
  onCall,
  onRequest,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  defineSecret
} = require("firebase-functions/params");

const {
  initializeApp
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const {
  getAuth
} = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

initializeApp();

const db = getFirestore();

setGlobalOptions({
  maxInstances: 2,
  region: "europe-west1"
});


/* =========================
   EMAIL SECRETS
========================= */

const iCloudEmail =
  defineSecret("ICLOUD_EMAIL");

const iCloudAppPassword =
  defineSecret("ICLOUD_APP_PASSWORD");

const adminEmail =
  defineSecret("ADMIN_EMAIL");

const replyToEmail =
  defineSecret("REPLY_TO_EMAIL");


/* =========================
   STRIPE SECRETS
========================= */

const stripeSecretKey =
  defineSecret("STRIPE_SECRET_KEY");

const stripeWebhookSecret =
  defineSecret("STRIPE_WEBHOOK_SECRET");


/* =========================
   API-FOOTBALL SECRET
========================= */

const footballApiKey =
  defineSecret("API_FOOTBALL_KEY");

const FOOTBALL_API_BASE_URL =
  "https://v3.football.api-sports.io";


/* =========================
   API-FOOTBALL REQUEST
========================= */

async function requestFootballApi(
  endpoint,
  parameters = {}
) {
  const url =
    new URL(
      `${FOOTBALL_API_BASE_URL}/${endpoint}`
    );

  Object.entries(parameters).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  const response = await fetch(url, {
    method: "GET",

    headers: {
      "x-apisports-key":
        footballApiKey.value()
    }
  });

  let data;

  try {
    data = await response.json();

  } catch (error) {
    console.error(
      "API-FOOTBALL returned invalid JSON:",
      error
    );

    throw new HttpsError(
      "internal",
      "API-FOOTBALL returned an invalid response."
    );
  }

  if (!response.ok) {
    console.error(
      "API-FOOTBALL HTTP error:",
      response.status,
      data
    );

    throw new HttpsError(
      "internal",
      `API-FOOTBALL returned HTTP ${response.status}.`
    );
  }

  const apiErrors =
    data?.errors &&
    typeof data.errors === "object"
      ? Object.values(data.errors)
          .filter(Boolean)
      : [];

  if (apiErrors.length > 0) {
    console.error(
      "API-FOOTBALL request errors:",
      data.errors
    );

    throw new HttpsError(
      "internal",
      apiErrors.join(" ")
    );
  }

  return data;
}


/* =========================
   STRIPE PRICE
========================= */

/*
  Stripe Price ID for one £1
  Premier League Prediction entry.
*/

const STRIPE_PRICE_ID =
  "price_1Ts2kFJtwyfkPIPrNo8xuXNR";


/* =========================
   PREMIER LEAGUE CHECKOUT
========================= */

exports.createPremierLeagueCheckout = onCall(
  {
    secrets: [
      stripeSecretKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in before purchasing a credit."
      );
    }

    const email =
      request.auth.token.email || "";

    const uid =
      request.auth.uid;

    try {
      const stripe =
        new Stripe(
          stripeSecretKey.value()
        );

      const session =
        await stripe.checkout.sessions.create({
          mode:
            "payment",

          line_items: [
            {
              price:
                STRIPE_PRICE_ID,

              quantity:
                1
            }
          ],

          customer_email:
            email || undefined,

          client_reference_id:
            uid,

          metadata: {
            firebaseUid:
              uid,

            competition:
              "premier_league_prediction"
          },

          success_url:
            "https://scorecast24.com/?payment=success&session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            "https://scorecast24.com/?payment=cancelled"
        });

      if (!session.url) {
        throw new Error(
          "Stripe did not return a Checkout URL."
        );
      }

      return {
        url:
          session.url
      };

    } catch (error) {
      console.error(
        "Stripe Checkout creation failed:",
        error
      );

      throw new HttpsError(
        "internal",
        "The payment page could not be opened. Please try again."
      );
    }
  }
);


/* =========================
   SCORE MINI LEAGUE CHECKOUT
========================= */

/*
  Creates a £1 Stripe Checkout page
  for a Score Prediction mini league.

  The mini league starts with
  awaiting_payment status.

  The Stripe webhook activates the league
  after payment is confirmed.
*/

exports.createScoreMiniLeagueCheckout = onCall(
  {
    secrets: [
      stripeSecretKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to create a mini league."
      );
    }

    const uid =
      request.auth.uid;

    const email =
      request.auth.token.email || "";

    const miniLeagueName =
      typeof request.data?.miniLeagueName === "string"
        ? request.data.miniLeagueName
            .trim()
            .replace(/\s+/g, " ")
        : "";

    const miniLeagueNameLowercase =
      miniLeagueName.toLowerCase();

    const username =
      typeof request.data?.username === "string"
        ? request.data.username.trim()
        : "";

    if (
      miniLeagueName.length < 3 ||
      miniLeagueName.length > 40
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The mini league name must contain between 3 and 40 characters."
      );
    }

    if (!username) {
      throw new HttpsError(
        "invalid-argument",
        "A valid username is required."
      );
    }

    let leagueReference = null;

    try {
      const existingLeagueSnapshot =
        await db
          .collection(
            "score_prediction_mini_leagues"
          )
          .where(
            "nameLowercase",
            "==",
            miniLeagueNameLowercase
          )
          .limit(1)
          .get();

      if (!existingLeagueSnapshot.empty) {
        throw new HttpsError(
          "already-exists",
          "A mini league with that name already exists."
        );
      }

      leagueReference =
        db
          .collection(
            "score_prediction_mini_leagues"
          )
          .doc();

      await leagueReference.set({
        name:
          miniLeagueName,

        nameLowercase:
          miniLeagueNameLowercase,

        creatorUid:
          uid,

        creatorUsername:
          username,

        memberCount:
          0,

        paymentStatus:
          "pending",

        status:
          "awaiting_payment",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp()
      });

      const stripe =
        new Stripe(
          stripeSecretKey.value()
        );

      const session =
        await stripe.checkout.sessions.create({
          mode:
            "payment",

          line_items: [
            {
              price_data: {
                currency:
                  "gbp",

                product_data: {
                  name:
                    "ScoreCast24 Score Prediction Mini League"
                },

                unit_amount:
                  100
              },

              quantity:
                1
            }
          ],

          customer_email:
            email || undefined,

          client_reference_id:
            uid,

          metadata: {
            firebaseUid:
              uid,

            competition:
              "score_prediction_mini_league",

            leagueId:
              leagueReference.id,

            miniLeagueName:
              miniLeagueName,

            creatorUsername:
              username
          },

         success_url:
  "https://scorecast24.com/Score-Prediction/mini-league.html?id=" +
  encodeURIComponent(
    leagueReference.id
  ) +
  "&payment=success&session_id={CHECKOUT_SESSION_ID}",

cancel_url:
  "https://scorecast24.com/Score-Prediction/create-mini-league.html?payment=cancelled&leagueId=" +
  encodeURIComponent(
    leagueReference.id
  ),
        });

      if (!session.url) {
        throw new Error(
          "Stripe did not return a Checkout URL."
        );
      }

      await leagueReference.set(
        {
          stripeSessionId:
            session.id,

          updatedAt:
            FieldValue.serverTimestamp()
        },
        {
          merge:
            true
        }
      );

      return {
        url:
          session.url,

        leagueId:
          leagueReference.id
      };

    } catch (error) {
      console.error(
        "Mini league Stripe Checkout creation failed:",
        error
      );

      if (
        leagueReference &&
        !(error instanceof HttpsError)
      ) {
        try {
          await leagueReference.set(
            {
              status:
                "checkout_error",

              paymentStatus:
                "not_started",

              updatedAt:
                FieldValue.serverTimestamp()
            },
            {
              merge:
                true
            }
          );

        } catch (updateError) {
          console.error(
            "Could not mark mini league checkout as failed:",
            updateError
          );
        }
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "The payment page could not be opened. Please try again."
      );
    }
  }
);
/* =========================
   CREATE DREAM TEAM
   MINI LEAGUE CHECKOUT
========================= */

exports.createDreamMiniLeagueCheckout = onCall(
  {
    secrets: [
      stripeSecretKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to create a Dream Team mini league."
      );
    }

    const uid =
      request.auth.uid;

    const email =
      request.auth.token.email || "";

    const miniLeagueName =
      typeof request.data?.miniLeagueName === "string"
        ? request.data.miniLeagueName
            .trim()
            .replace(/\s+/g, " ")
        : "";

    const miniLeagueNameLowercase =
      miniLeagueName.toLowerCase();

    const username =
      typeof request.data?.username === "string"
        ? request.data.username.trim()
        : "";

    if (
      miniLeagueName.length < 3 ||
      miniLeagueName.length > 40
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The mini league name must contain between 3 and 40 characters."
      );
    }

    if (!username) {
      throw new HttpsError(
        "invalid-argument",
        "A valid username is required."
      );
    }

    let leagueReference = null;

    try {
      const existingLeagueSnapshot =
        await db
          .collection(
            "dream_team_mini_leagues"
          )
          .where(
            "nameLowercase",
            "==",
            miniLeagueNameLowercase
          )
          .limit(1)
          .get();

      if (!existingLeagueSnapshot.empty) {
        throw new HttpsError(
          "already-exists",
          "A Dream Team mini league with that name already exists."
        );
      }

      leagueReference =
        db
          .collection(
            "dream_team_mini_leagues"
          )
          .doc();

      await leagueReference.set({
        name:
          miniLeagueName,

        nameLowercase:
          miniLeagueNameLowercase,

        creatorUid:
          uid,

        creatorUsername:
          username,

        memberCount:
          0,

        paymentStatus:
          "pending",

        status:
          "awaiting_payment",

        competition:
          "dream_team",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp()
      });

      const stripe =
        new Stripe(
          stripeSecretKey.value()
        );

      const session =
        await stripe.checkout.sessions.create({
          mode:
            "payment",

          line_items: [
            {
              price_data: {
                currency:
                  "gbp",

                product_data: {
                  name:
                    "ScoreCast24 Dream Team Mini League"
                },

                unit_amount:
                  100
              },

              quantity:
                1
            }
          ],

          customer_email:
            email || undefined,

          client_reference_id:
            uid,

          metadata: {
            firebaseUid:
              uid,

            competition:
              "dream_team_mini_league",

            leagueId:
              leagueReference.id,

            miniLeagueName:
              miniLeagueName,

            creatorUsername:
              username
          },

        success_url:
  "https://scorecast24.com/dream-mini-league.html?id=" +
  encodeURIComponent(
    leagueReference.id
  ) +
  "&payment=success&session_id={CHECKOUT_SESSION_ID}",

cancel_url:
  "https://scorecast24.com/create-dream-mini-league.html?payment=cancelled&id=" +
  encodeURIComponent(
    leagueReference.id
  )
  
        });

      if (!session.url) {
        throw new Error(
          "Stripe did not return a Checkout URL."
        );
      }

      await leagueReference.set(
        {
          stripeSessionId:
            session.id,

          updatedAt:
            FieldValue.serverTimestamp()
        },
        {
          merge:
            true
        }
      );

      return {
        url:
          session.url,

        leagueId:
          leagueReference.id
      };

    } catch (error) {
      console.error(
        "Dream Team mini league Stripe Checkout creation failed:",
        error
      );

      if (
        leagueReference &&
        !(error instanceof HttpsError)
      ) {
        try {
          await leagueReference.set(
            {
              status:
                "checkout_error",

              paymentStatus:
                "not_started",

              updatedAt:
                FieldValue.serverTimestamp()
            },
            {
              merge:
                true
            }
          );

        } catch (updateError) {
          console.error(
            "Could not mark Dream Team mini league checkout as failed:",
            updateError
          );
        }
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "The payment page could not be opened. Please try again."
      );
    }
  }
);
/* =========================
   JOIN MINI LEAGUE CHECKOUT
========================= */

/*
  Creates a £1 Stripe Checkout page
  for joining an existing Score
  Prediction mini league.

  The user is not added as a member
  until Stripe confirms payment through
  the webhook.
*/

exports.createJoinMiniLeagueCheckout = onCall(
  {
    secrets: [
      stripeSecretKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to join a mini league."
      );
    }

    const uid =
      request.auth.uid;

    const email =
      request.auth.token.email || "";

    const leagueId =
      typeof request.data?.leagueId === "string"
        ? request.data.leagueId.trim()
        : "";

    const username =
      typeof request.data?.username === "string"
        ? request.data.username
            .trim()
            .slice(0, 50)
        : "";

    if (!leagueId) {
      throw new HttpsError(
        "invalid-argument",
        "A valid mini-league ID is required."
      );
    }

    if (!username) {
      throw new HttpsError(
        "invalid-argument",
        "A valid username is required."
      );
    }

    const leagueReference =
      db
        .collection(
          "score_prediction_mini_leagues"
        )
        .doc(
          leagueId
        );

    const memberReference =
      leagueReference
        .collection(
          "members"
        )
        .doc(
          uid
        );

    try {
      const [
        leagueSnapshot,
        memberSnapshot
      ] =
        await Promise.all([
          leagueReference.get(),
          memberReference.get()
        ]);

      if (!leagueSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "This mini league does not exist."
        );
      }

      const leagueData =
        leagueSnapshot.data() || {};

      if (
        leagueData.status !== "active" ||
        leagueData.paymentStatus !== "paid"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This mini league is not currently available to join."
        );
      }

      if (memberSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "You have already joined this mini league."
        );
      }

      const stripe =
        new Stripe(
          stripeSecretKey.value()
        );

      const session =
        await stripe.checkout.sessions.create({
          mode:
            "payment",

          line_items: [
            {
              price_data: {
                currency:
                  "gbp",

                product_data: {
                  name:
                    `Join ${leagueData.name || "ScoreCast24 Mini League"}`
                },

                unit_amount:
                  100
              },

              quantity:
                1
            }
          ],

          customer_email:
            email || undefined,

          client_reference_id:
            uid,

          metadata: {
            firebaseUid:
              uid,

            competition:
              "score_prediction_mini_league_join",

            leagueId:
              leagueId,

            memberUsername:
              username
          },

          success_url:
  "https://scorecast24.com/Score-Prediction/mini-league.html?id=" +
  encodeURIComponent(
    leagueId
  ) +
  "&payment=success&session_id={CHECKOUT_SESSION_ID}",

cancel_url:
  "https://scorecast24.com/Score-Prediction/mini-league.html?id=" +
  encodeURIComponent(
    leagueId
  ) +
  "&payment=cancelled"
          });

      if (!session.url) {
        throw new Error(
          "Stripe did not return a Checkout URL."
        );
      }

      return {
        url:
          session.url,

        leagueId:
          leagueId
      };

    } catch (error) {
      console.error(
        "Mini-league join Checkout creation failed:",
        error
      );

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "The payment page could not be opened. Please try again."
      );
    }
  }
);
/* =========================
   DREAM TEAM MINI LEAGUE
   JOIN CHECKOUT
========================= */

exports.createDreamMiniLeagueJoinCheckout =
  onCall(
    {
      secrets: [
        stripeSecretKey
      ]
    },

    async request => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in to join a Dream Team mini league."
        );
      }

      const uid =
        request.auth.uid;

      const email =
        request.auth.token.email || "";

      const leagueId =
        typeof request.data?.leagueId ===
        "string"
          ? request.data.leagueId.trim()
          : "";

      const username =
        typeof request.data?.username ===
        "string"
          ? request.data.username
              .trim()
              .slice(0, 50)
          : "";

      if (!leagueId) {
        throw new HttpsError(
          "invalid-argument",
          "A valid Dream Team mini-league ID is required."
        );
      }

      if (!username) {
        throw new HttpsError(
          "invalid-argument",
          "A valid username is required."
        );
      }

      const leagueReference =
        db
          .collection(
            "dream_team_mini_leagues"
          )
          .doc(
            leagueId
          );

      const memberReference =
        leagueReference
          .collection(
            "members"
          )
          .doc(
            uid
          );

      try {
        const [
          leagueSnapshot,
          memberSnapshot
        ] =
          await Promise.all([
            leagueReference.get(),
            memberReference.get()
          ]);

        if (!leagueSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "This Dream Team mini league does not exist."
          );
        }

        const leagueData =
          leagueSnapshot.data() || {};

        if (
          leagueData.status !== "active" ||
          leagueData.paymentStatus !== "paid"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "This Dream Team mini league is not currently available to join."
          );
        }

        if (memberSnapshot.exists) {
          throw new HttpsError(
            "already-exists",
            "You have already joined this Dream Team mini league."
          );
        }

        const stripe =
          new Stripe(
            stripeSecretKey.value()
          );

        const session =
          await stripe.checkout.sessions.create({
            mode:
              "payment",

            line_items: [
              {
                price_data: {
                  currency:
                    "gbp",

                  product_data: {
                    name:
                      `Join ${
                        leagueData.name ||
                        "ScoreCast24 Dream Team Mini League"
                      }`
                  },

                  unit_amount:
                    100
                },

                quantity:
                  1
              }
            ],

            customer_email:
              email || undefined,

            client_reference_id:
              uid,

            metadata: {
              firebaseUid:
                uid,

              competition:
                "dream_team_mini_league_join",

              leagueId:
                leagueId,

              memberUsername:
                username
            },

          success_url:
  "https://scorecast24.com/dream-mini-league.html?id=" +
  encodeURIComponent(
    leagueId
  ) +
  "&payment=success&session_id={CHECKOUT_SESSION_ID}",

cancel_url:
  "https://scorecast24.com/dream-mini-league.html?id=" +
  encodeURIComponent(
    leagueId
  ) +
  "&payment=cancelled"
          });

        if (!session.url) {
          throw new Error(
            "Stripe did not return a Checkout URL."
          );
        }

        return {
          url:
            session.url,

          leagueId:
            leagueId
        };

      } catch (error) {
        console.error(
          "Dream Team mini-league join Checkout creation failed:",
          error
        );

        if (
          error instanceof HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "The payment page could not be opened. Please try again."
        );
      }
    }
  );
/* =========================
   STRIPE WEBHOOK
========================= */

/*
  Handles:

  1. Premier League Prediction payments.
  2. Score Prediction mini-league payments.
  3. Dream Team mini-league payments.
*/

exports.stripeWebhook = onRequest(
  {
    secrets: [
      stripeSecretKey,
      stripeWebhookSecret
    ]
  },

  async (request, response) => {
    const stripe =
      new Stripe(
        stripeSecretKey.value()
      );

    let event;

    try {
      const signature =
        request.headers[
          "stripe-signature"
        ];

      if (!signature) {
        response
          .status(400)
          .send(
            "Missing Stripe signature."
          );

        return;
      }

      event =
        stripe.webhooks.constructEvent(
          request.rawBody,
          signature,
          stripeWebhookSecret.value()
        );

    } catch (error) {
      console.error(
        "Stripe webhook verification failed:",
        error.message
      );

      response
        .status(400)
        .send(
          `Webhook Error: ${error.message}`
        );

      return;
    }

    try {
      if (
        event.type ===
        "checkout.session.completed"
      ) {
        const session =
          event.data.object;

        const competition =
          session.metadata?.competition ||
          "";
/* =========================
   DREAM TEAM MINI LEAGUE
========================= */

if (
  session.payment_status === "paid" &&
  competition ===
    "dream_team_mini_league"
) {
  const uid =
    session.metadata?.firebaseUid ||
    session.client_reference_id;

  const leagueId =
    session.metadata?.leagueId ||
    "";

  const creatorUsername =
    session.metadata?.creatorUsername ||
    "ScoreCast24 Player";

  if (!uid) {
    throw new Error(
      "No Firebase user ID was attached to the Dream Team mini league payment."
    );
  }

  if (!leagueId) {
    throw new Error(
      "No Dream Team mini league ID was attached to the payment."
    );
  }

  const paymentReference =
    db
      .collection(
        "stripe_payments"
      )
      .doc(
        session.id
      );

  const leagueReference =
    db
      .collection(
        "dream_team_mini_leagues"
      )
      .doc(
        leagueId
      );

  const memberReference =
    leagueReference
      .collection(
        "members"
      )
      .doc(
        uid
      );

  await db.runTransaction(
    async transaction => {
      const existingPayment =
        await transaction.get(
          paymentReference
        );

      if (existingPayment.exists) {
        console.log(
          `Dream Team mini league payment ${session.id} has already been processed.`
        );

        return;
      }

      const leagueSnapshot =
        await transaction.get(
          leagueReference
        );

      if (!leagueSnapshot.exists) {
        throw new Error(
          `Dream Team mini league ${leagueId} does not exist.`
        );
      }

      transaction.set(
        leagueReference,
        {
          paymentStatus:
            "paid",

          status:
            "active",

          memberCount:
            1,

          stripeSessionId:
            session.id,

          stripePaymentIntent:
            session.payment_intent ||
            null,

          paidAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp()
        },
        {
          merge:
            true
        }
      );

      transaction.set(
        memberReference,
        {
          uid,

          username:
            creatorUsername,

          role:
            "creator",

          totalPoints:
            0,

          joinedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp()
        },
        {
          merge:
            true
        }
      );

      transaction.set(
        paymentReference,
        {
          uid,

          email:
            session.customer_details
              ?.email ||
            session.customer_email ||
            "",

          competition:
            "dream_team_mini_league",

          leagueId,

          stripeSessionId:
            session.id,

          stripePaymentIntent:
            session.payment_intent ||
            null,

          amountTotal:
            session.amount_total ||
            0,

          currency:
            session.currency ||
            "gbp",

          paymentStatus:
            session.payment_status ||
            "unknown",

          creditStatus:
            "league_activated",

          createdAt:
            FieldValue.serverTimestamp()
        }
      );
    }
  );

  console.log(
    `Dream Team mini league ${leagueId} was activated and creator ${uid} was added as its first member.`
  );
}

        /* =========================
           PREMIER LEAGUE PAYMENT
        ========================= */

        if (
          session.payment_status === "paid" &&
          competition ===
            "premier_league_prediction"
        ) {
          const uid =
            session.metadata?.firebaseUid ||
            session.client_reference_id;

          if (!uid) {
            throw new Error(
              "No Firebase user ID was attached to the Stripe payment."
            );
          }

          const paymentReference =
            db
              .collection(
                "stripe_payments"
              )
              .doc(
                session.id
              );

          const userReference =
            db
              .collection(
                "users"
              )
              .doc(
                uid
              );

          await db.runTransaction(
            async transaction => {
              const existingPayment =
                await transaction.get(
                  paymentReference
                );

              if (existingPayment.exists) {
                console.log(
                  `Stripe payment ${session.id} has already been credited.`
                );

                return;
              }

              transaction.set(
                userReference,
                {
                  premierLeagueCredits:
                    FieldValue.increment(1),

                  updatedAt:
                    FieldValue.serverTimestamp()
                },
                {
                  merge:
                    true
                }
              );

              transaction.set(
                paymentReference,
                {
                  uid,

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  competition:
                    "premier_league_prediction",

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  amountTotal:
                    session.amount_total ||
                    0,

                  currency:
                    session.currency ||
                    "gbp",

                  paymentStatus:
                    session.payment_status ||
                    "unknown",

                  creditStatus:
                    "credited",

                  createdAt:
                    FieldValue.serverTimestamp()
                }
              );
            }
          );

          console.log(
            `One Premier League credit was added to Firebase user ${uid}.`
          );
        }


        /* =========================
           MINI LEAGUE PAYMENT
        ========================= */

        if (
          session.payment_status === "paid" &&
          competition ===
            "score_prediction_mini_league"
        ) {
          const uid =
            session.metadata?.firebaseUid ||
            session.client_reference_id;

          const leagueId =
            session.metadata?.leagueId ||
            "";

          const username =
            session.metadata
              ?.creatorUsername ||
            "";

          if (!uid) {
            throw new Error(
              "No Firebase user ID was attached to the mini-league payment."
            );
          }

          if (!leagueId) {
            throw new Error(
              "No mini-league ID was attached to the Stripe payment."
            );
          }

          const paymentReference =
            db
              .collection(
                "stripe_payments"
              )
              .doc(
                session.id
              );

          const leagueReference =
            db
              .collection(
                "score_prediction_mini_leagues"
              )
              .doc(
                leagueId
              );

          const memberReference =
            leagueReference
              .collection(
                "members"
              )
              .doc(
                uid
              );

          await db.runTransaction(
            async transaction => {
              const existingPayment =
                await transaction.get(
                  paymentReference
                );

              if (existingPayment.exists) {
                console.log(
                  `Stripe payment ${session.id} has already activated a mini league.`
                );

                return;
              }

              const leagueSnapshot =
                await transaction.get(
                  leagueReference
                );

              if (!leagueSnapshot.exists) {
                throw new Error(
                  `Mini league ${leagueId} does not exist.`
                );
              }

              const leagueData =
                leagueSnapshot.data() ||
                {};

              if (
                leagueData.creatorUid &&
                leagueData.creatorUid !== uid
              ) {
                throw new Error(
                  "The Stripe payer does not match the mini-league creator."
                );
              }

              transaction.set(
                leagueReference,
                {
                  memberCount:
                    1,

                  paymentStatus:
                    "paid",

                  status:
                    "active",

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  paidAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp()
                },
                {
                  merge:
                    true
                }
              );

              transaction.set(
                memberReference,
                {
                  uid,

                  username:
                    username ||
                    leagueData
                      .creatorUsername ||
                    session.customer_details
                      ?.email ||
                    "ScoreCast24 Player",

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  joinedAt:
                    FieldValue.serverTimestamp(),

                  role:
                    "creator"
                },
                {
                  merge:
                    true
                }
              );

              transaction.set(
                paymentReference,
                {
                  uid,

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  competition:
                    "score_prediction_mini_league",

                  leagueId,

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  amountTotal:
                    session.amount_total ||
                    0,

                  currency:
                    session.currency ||
                    "gbp",

                  paymentStatus:
                    session.payment_status ||
                    "unknown",

                  creditStatus:
                    "mini_league_activated",

                  createdAt:
                    FieldValue.serverTimestamp()
                }
              );
            }
          );

          console.log(
            `Score Prediction mini league ${leagueId} was activated for Firebase user ${uid}.`
          );
        }
 
        /* =========================
           DREAM TEAM MINI LEAGUE
           PAYMENT
        ========================= */

        if (
          session.payment_status === "paid" &&
          competition ===
            "dream_team_mini_league"
        ) {
          const uid =
            session.metadata?.firebaseUid ||
            session.client_reference_id;

          const leagueId =
            session.metadata?.leagueId ||
            "";

          const username =
            session.metadata
              ?.creatorUsername ||
            "";

          if (!uid) {
            throw new Error(
              "No Firebase user ID was attached to the Dream Team mini-league payment."
            );
          }

          if (!leagueId) {
            throw new Error(
              "No Dream Team mini-league ID was attached to the Stripe payment."
            );
          }

          const paymentReference =
            db
              .collection(
                "stripe_payments"
              )
              .doc(
                session.id
              );

          const leagueReference =
            db
              .collection(
                "dream_team_mini_leagues"
              )
              .doc(
                leagueId
              );

          const memberReference =
            leagueReference
              .collection(
                "members"
              )
              .doc(
                uid
              );

          await db.runTransaction(
            async transaction => {
              const existingPayment =
                await transaction.get(
                  paymentReference
                );

              if (existingPayment.exists) {
                console.log(
                  `Stripe payment ${session.id} has already activated a Dream Team mini league.`
                );

                return;
              }

              const leagueSnapshot =
                await transaction.get(
                  leagueReference
                );

              if (!leagueSnapshot.exists) {
                throw new Error(
                  `Dream Team mini league ${leagueId} does not exist.`
                );
              }

              const leagueData =
                leagueSnapshot.data() ||
                {};

              if (
                leagueData.creatorUid &&
                leagueData.creatorUid !== uid
              ) {
                throw new Error(
                  "The Stripe payer does not match the Dream Team mini-league creator."
                );
              }

              transaction.set(
                leagueReference,
                {
                  memberCount:
                    1,

                  paymentStatus:
                    "paid",

                  status:
                    "active",

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  paidAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp()
                },
                {
                  merge:
                    true
                }
              );

              transaction.set(
                memberReference,
                {
                  uid,

                  username:
                    username ||
                    leagueData
                      .creatorUsername ||
                    session.customer_details
                      ?.email ||
                    "ScoreCast24 Player",

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  joinedAt:
                    FieldValue.serverTimestamp(),

                  role:
                    "creator",

                  points:
                    0
                },
                {
                  merge:
                    true
                }
              );

              transaction.set(
                paymentReference,
                {
                  uid,

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  competition:
                    "dream_team_mini_league",

                  leagueId,

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  amountTotal:
                    session.amount_total ||
                    0,

                  currency:
                    session.currency ||
                    "gbp",

                  paymentStatus:
                    session.payment_status ||
                    "unknown",

                  creditStatus:
                    "dream_team_mini_league_activated",

                  createdAt:
                    FieldValue.serverTimestamp()
                }
              );
            }
          );

          console.log(
            `Dream Team mini league ${leagueId} was activated for Firebase user ${uid}.`
          );
        }
        /* =========================
           MINI LEAGUE JOIN PAYMENT
        ========================= */

        if (
          session.payment_status === "paid" &&
          competition ===
            "score_prediction_mini_league_join"
        ) {
          const uid =
            session.metadata?.firebaseUid ||
            session.client_reference_id;

          const leagueId =
            session.metadata?.leagueId ||
            "";

          const username =
            session.metadata
              ?.memberUsername ||
            "";

          if (!uid) {
            throw new Error(
              "No Firebase user ID was attached to the mini-league join payment."
            );
          }

          if (!leagueId) {
            throw new Error(
              "No mini-league ID was attached to the join payment."
            );
          }

          const paymentReference =
            db
              .collection(
                "stripe_payments"
              )
              .doc(
                session.id
              );

          const leagueReference =
            db
              .collection(
                "score_prediction_mini_leagues"
              )
              .doc(
                leagueId
              );

          const memberReference =
            leagueReference
              .collection(
                "members"
              )
              .doc(
                uid
              );

          await db.runTransaction(
            async transaction => {
              const existingPayment =
                await transaction.get(
                  paymentReference
                );

              if (existingPayment.exists) {
                console.log(
                  `Stripe join payment ${session.id} has already been processed.`
                );

                return;
              }

              const leagueSnapshot =
                await transaction.get(
                  leagueReference
                );

              if (!leagueSnapshot.exists) {
                throw new Error(
                  `Mini league ${leagueId} does not exist.`
                );
              }

              const leagueData =
                leagueSnapshot.data() ||
                {};

              if (
                leagueData.status !== "active"
              ) {
                throw new Error(
                  `Mini league ${leagueId} is not active.`
                );
              }

              const memberSnapshot =
                await transaction.get(
                  memberReference
                );

              if (!memberSnapshot.exists) {
                transaction.set(
                  memberReference,
                  {
                    uid,

                    username:
                      username ||
                      session.customer_details
                        ?.email ||
                      "ScoreCast24 Player",

                    email:
                      session.customer_details
                        ?.email ||
                      session.customer_email ||
                      "",

                    joinedAt:
                      FieldValue.serverTimestamp(),

                    role:
                      "member",

                    points:
                      0
                  }
                );

                transaction.set(
                  leagueReference,
                  {
                    memberCount:
                      FieldValue.increment(1),

                    updatedAt:
                      FieldValue.serverTimestamp()
                  },
                  {
                    merge:
                      true
                  }
                );
              }

              transaction.set(
                paymentReference,
                {
                  uid,

                  email:
                    session.customer_details
                      ?.email ||
                    session.customer_email ||
                    "",

                  competition:
                    "score_prediction_mini_league_join",

                  leagueId,

                  stripeSessionId:
                    session.id,

                  stripePaymentIntent:
                    session.payment_intent ||
                    null,

                  amountTotal:
                    session.amount_total ||
                    0,

                  currency:
                    session.currency ||
                    "gbp",

                  paymentStatus:
                    session.payment_status ||
                    "unknown",

                  creditStatus:
                    memberSnapshot.exists
                      ? "already_member"
                      : "mini_league_joined",

                  createdAt:
                    FieldValue.serverTimestamp()
                }
              );
            }
          );

                    console.log(
            `Firebase user ${uid} joined Score Prediction mini league ${leagueId}.`
          );
        }
      }

      response
        .status(200)
        .send(
          "Webhook received."
        );

    } catch (error) {
      console.error(
        "Stripe webhook processing failed:",
        error
      );

      response
        .status(500)
        .send(
          "Webhook processing failed."
        );
    }
  }
);


/* =========================
   SUBMIT PREMIER LEAGUE
========================= */

exports.submitPremierLeaguePrediction = onCall(
  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to submit a prediction."
      );
    }
const PREMIER_LEAGUE_PRIZE_CLOSED = true;
    const uid =
      request.auth.uid;

    const email =
      request.auth.token.email ||
      "";

    const username =
      typeof request.data?.username === "string"
        ? request.data.username.trim()
        : "";

    const cleanUsername =
      typeof request.data?.cleanUsername === "string"
        ? request.data.cleanUsername.trim()
        : "";

    const prediction =
      Array.isArray(
        request.data?.prediction
      )
        ? request.data.prediction
        : [];

    if (
      !username ||
      !cleanUsername
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid username is required."
      );
    }

    if (
      prediction.length !== 20
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Your prediction must contain all 20 teams."
      );
    }

    const validTeams =
      new Set([
        "Arsenal",
        "Aston Villa",
        "Bournemouth",
        "Brentford",
        "Brighton & Hove Albion",
        "Chelsea",
        "Coventry City",
        "Crystal Palace",
        "Everton",
        "Fulham",
        "Hull City",
        "Ipswich Town",
        "Leeds United",
        "Liverpool",
        "Manchester City",
        "Manchester United",
        "Newcastle United",
        "Nottingham Forest",
        "Sunderland",
        "Tottenham Hotspur"
      ]);

    const submittedTeams =
      prediction.map(
        item =>
          item?.team
      );

    const positionsAreValid =
      prediction.every(
        (item, index) => {
          return (
            Number(
              item?.position
            ) ===
              index + 1 &&
            validTeams.has(
              item?.team
            )
          );
        }
      );

    if (
      !positionsAreValid ||
      new Set(
        submittedTeams
      ).size !== 20
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The prediction contains invalid or duplicate teams."
      );
    }

    const userReference =
      db
        .collection(
          "users"
        )
        .doc(
          uid
        );

    const predictionReference =
      db
        .collection(
          "premier_league_predictions"
        )
        .doc(
          uid
        );

    await db.runTransaction(
      async transaction => {
        const userSnapshot =
          await transaction.get(
            userReference
          );

        const predictionSnapshot =
          await transaction.get(
            predictionReference
          );

        if (
          predictionSnapshot.exists
        ) {
          throw new HttpsError(
            "already-exists",
            "You have already submitted a Premier League prediction."
          );
        }

        const credits =
          userSnapshot.exists
            ? Number(
                userSnapshot
                  .data()
                  .premierLeagueCredits ||
                0
              )
            : 0;

        if (
          credits < 1
        ) {
          throw new HttpsError(
            "failed-precondition",
            "You need one Premier League entry credit before submitting."
          );
        }

        transaction.set(
          userReference,
          {
            premierLeagueCredits:
              credits - 1,

            updatedAt:
              FieldValue.serverTimestamp()
          },
          {
            merge:
              true
          }
        );

        transaction.set(
          predictionReference,
          {
            username,

            cleanUsername,

            email,

            userId:
              uid,

            prediction,

            paidEntry:
              true,

            creditUsed:
              1,
prizeEligible:
  !PREMIER_LEAGUE_PRIZE_CLOSED,
            submittedAt:
              FieldValue.serverTimestamp()
          }
        );
      }
    );

    return {
      success:
        true,

      remainingCredits:
        0
    };
  }
);


/* =========================
   PREMIER LEAGUE REPORT
========================= */

exports.sendPremierLeaguePredictionReport =
  onDocumentWritten(
    {
      document:
        "premier_league/current_table",

      secrets: [
        iCloudEmail,
        iCloudAppPassword,
        adminEmail,
        replyToEmail
      ]
    },

    async event => {
      if (
        !event.data?.after.exists
      ) {
        console.log(
          "The current Premier League table was deleted."
        );

        return;
      }

      const tableData =
        event.data.after.data();

      const rawTable =
        tableData.teams ||
        tableData.table ||
        tableData
          .currentPremierLeagueTable ||
        [];

      const currentTable =
        rawTable
          .map(item => {
            if (
              typeof item ===
              "string"
            ) {
              return item;
            }

            return (
              item?.team ||
              item?.name ||
              ""
            );
          })
          .filter(Boolean);

      if (
        currentTable.length !== 20
      ) {
        console.error(
          `The current table must contain 20 teams. It currently contains ${currentTable.length}.`
        );

        return;
      }

      const predictionsSnapshot =
        await db
          .collection(
            "premier_league_predictions"
          )
          .get();

      let totalValidEntries = 0;
      let highestMatches = -1;

      const exactMatches = [];
      let currentLeaders = [];

      predictionsSnapshot.forEach(
        predictionDocument => {
          const data =
            predictionDocument.data();

          const prediction =
            Array.isArray(
              data.prediction
            )
              ? data.prediction
              : [];

          if (
            prediction.length !== 20
          ) {
            console.warn(
              `Skipped ${predictionDocument.id}: prediction does not contain 20 teams.`
            );

            return;
          }

          totalValidEntries++;

          let matches = 0;

          prediction.forEach(
            (item, index) => {
              const predictedTeam =
                typeof item === "string"
                  ? item
                  : item.team;

              const positionIndex =
                typeof item?.position ===
                "number"
                  ? item.position - 1
                  : index;

              if (
                positionIndex >= 0 &&
                positionIndex < 20 &&
                predictedTeam ===
                  currentTable[
                    positionIndex
                  ]
              ) {
                matches++;
              }
            }
          );

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

          if (
            matches === 20
          ) {
            exactMatches.push(
              userDetails
            );
          }

          if (
            matches >
            highestMatches
          ) {
            highestMatches =
              matches;

            currentLeaders = [
              userDetails
            ];

          } else if (
            matches ===
            highestMatches
          ) {
            currentLeaders.push(
              userDetails
            );
          }
        }
      );

      const exactMatchList =
        exactMatches.length
          ? exactMatches
              .map(user => {
                return `${user.username}
Email: ${user.email}
Matching positions: ${user.matches}/20`;
              })
              .join("\n\n")
          : "None";

      const leaderList =
        currentLeaders.length
          ? currentLeaders
              .map(user => {
                return `${user.username}
Email: ${user.email}
Matching positions: ${user.matches}/20`;
              })
              .join("\n\n")
          : "No valid predictions found.";

      const subject =
        exactMatches.length
          ? `🏆 ScoreCast24: ${exactMatches.length} exact prediction match${
              exactMatches.length === 1
                ? ""
                : "es"
            }`
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

      const transporter =
        nodemailer.createTransport({
          host:
            "smtp.mail.me.com",

          port:
            587,

          secure:
            false,

          requireTLS:
            true,

          auth: {
            user:
              iCloudEmail.value(),

            pass:
              iCloudAppPassword.value()
          }
        });

      await transporter.verify();

      await transporter.sendMail({
        from:
          `"ScoreCast24 Reports" <${iCloudEmail.value()}>`,

        to:
          adminEmail.value(),

        replyTo:
          replyToEmail.value(),

        subject,

        text:
          emailBody
      });

      console.log(
        `Premier League report sent. Entries: ${totalValidEntries}; exact matches: ${exactMatches.length}; highest score: ${highestMatches}.`
      );
    }
  );
/* =========================
   SEND SCORECAST ANNOUNCEMENT
========================= */

exports.sendScoreCastAnnouncement = onCall(
  {
    secrets: [
      iCloudEmail,
      iCloudAppPassword,
      adminEmail,
      replyToEmail
    ]
  },

  async request => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }


    /*
      ADMIN SECURITY

      Only the account whose email matches
      ADMIN_EMAIL can send bulk announcements.
    */

    const callerEmail =
      String(
        request.auth.token.email || ""
      )
        .trim()
        .toLowerCase();

    const allowedAdminEmail =
      String(
        adminEmail.value() || ""
      )
        .trim()
        .toLowerCase();


    if (
      !callerEmail ||
      callerEmail !== allowedAdminEmail
    ) {
      throw new HttpsError(
        "permission-denied",
        "You are not authorised to send ScoreCast24 announcements."
      );
    }


    const subject =
      typeof request.data?.subject ===
      "string"
        ? request.data.subject
            .trim()
            .slice(0, 150)
        : "";


    const message =
      typeof request.data?.message ===
      "string"
        ? request.data.message
            .trim()
            .slice(0, 5000)
        : "";


    const buttonText =
      typeof request.data?.buttonText ===
      "string"
        ? request.data.buttonText
            .trim()
            .slice(0, 80)
        : "";


    const buttonUrl =
      typeof request.data?.buttonUrl ===
      "string"
        ? request.data.buttonUrl
            .trim()
        : "";


    if (!subject) {
      throw new HttpsError(
        "invalid-argument",
        "An email subject is required."
      );
    }


    if (!message) {
      throw new HttpsError(
        "invalid-argument",
        "An email message is required."
      );
    }


    if (
      buttonUrl &&
      !buttonUrl.startsWith(
        "https://scorecast24.com/"
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The button URL must be a ScoreCast24 URL."
      );
    }


    const transporter =
      nodemailer.createTransport({
        host:
          "smtp.mail.me.com",

        port:
          587,

        secure:
          false,

        requireTLS:
          true,

        auth: {
          user:
            iCloudEmail.value(),

          pass:
            iCloudAppPassword.value()
        }
      });


    try {

      await transporter.verify();


      /*
        GET ALL FIREBASE AUTH USERS
      */

      const users = [];

      let nextPageToken;


      do {

        const result =
          await getAuth().listUsers(
            1000,
            nextPageToken
          );


        result.users.forEach(
          userRecord => {

            if (
              userRecord.email &&
              !userRecord.disabled
            ) {
              users.push({
                uid:
                  userRecord.uid,

                email:
                  userRecord.email
              });
            }

          }
        );


        nextPageToken =
          result.pageToken;

      } while (nextPageToken);


      if (users.length === 0) {

        return {
          success:
            true,

          sent:
            0,

          failed:
            0
        };

      }


      const escapedMessage =
        message
          .replaceAll(
            "&",
            "&amp;"
          )
          .replaceAll(
            "<",
            "&lt;"
          )
          .replaceAll(
            ">",
            "&gt;"
          )
          .replaceAll(
            "\n",
            "<br>"
          );


      const buttonHtml =
        buttonText &&
        buttonUrl
          ? `
            <p
              style="
                margin-top: 28px;
                margin-bottom: 28px;
              "
            >
              <a
                href="${buttonUrl}"
                style="
                  display:inline-block;
                  background:#f5c542;
                  color:#111;
                  text-decoration:none;
                  padding:14px 22px;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                ${buttonText}
              </a>
            </p>
          `
          : "";


      const html =
        `
        <!DOCTYPE html>

        <html>

        <body
          style="
            margin:0;
            padding:0;
            background:#f4f4f4;
            font-family:Arial, Helvetica, sans-serif;
          "
        >

          <div
            style="
              max-width:600px;
              margin:0 auto;
              padding:30px 20px;
            "
          >

            <div
              style="
                background:#ffffff;
                border-radius:10px;
                padding:30px;
              "
            >

              <h1
                style="
                  margin-top:0;
                  color:#111;
                "
              >
                ScoreCast24
              </h1>


              <div
                style="
                  font-size:16px;
                  line-height:1.6;
                  color:#222;
                "
              >
                ${escapedMessage}
              </div>


              ${buttonHtml}


              <p
                style="
                  margin-top:35px;
                  font-size:13px;
                  color:#777;
                "
              >
                ScoreCast24
              </p>

            </div>

          </div>

        </body>

        </html>
        `;


      let sent = 0;

      let failed = 0;


      /*
        Send separately so users never see
        anybody else's email address.
      */

      for (const user of users) {

        try {

          await transporter.sendMail({
            from:
              `"ScoreCast24" <${iCloudEmail.value()}>`,

            to:
              user.email,

            replyTo:
              replyToEmail.value(),

            subject,

            text:
              `${message}${
                buttonUrl
                  ? `\n\n${buttonText || "Visit ScoreCast24"}:\n${buttonUrl}`
                  : ""
              }\n\nScoreCast24`,

            html
          });


          sent++;


        } catch (error) {

          failed++;

          console.error(
            `Announcement email failed for user ${user.uid}:`,
            error
          );

        }

      }


      /*
        Keep an audit record.
      */

      await db
        .collection(
          "admin_email_history"
        )
        .add({

          subject,

          message,

          buttonText:
            buttonText || null,

          buttonUrl:
            buttonUrl || null,

          sent,

          failed,

          totalRecipients:
            users.length,

          sentByUid:
            request.auth.uid,

          sentByEmail:
            callerEmail,

          createdAt:
            FieldValue.serverTimestamp()

        });


      console.log(
        `ScoreCast24 announcement completed. Sent: ${sent}; failed: ${failed}.`
      );


      return {
        success:
          true,

        total:
          users.length,

        sent,

        failed
      };


    } catch (error) {

      console.error(
        "ScoreCast24 announcement failed:",
        error
      );


      if (
        error instanceof HttpsError
      ) {
        throw error;
      }


      throw new HttpsError(
        "internal",
        "The announcement could not be sent."
      );

    }

  }
);

/* =========================
   API-FOOTBALL STATUS
========================= */

exports.getFootballApiStatus = onCall(
  {
    secrets: [
      footballApiKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to test the Football API."
      );
    }

    try {
      const data =
        await requestFootballApi(
          "status"
        );

      return {
        success:
          true,

        account:
          data?.response?.account ||
          null,

        subscription:
          data?.response
            ?.subscription ||
          null,

        requests:
          data?.response?.requests ||
          null
      };

    } catch (error) {
      console.error(
        "Football API status test failed:",
        error
      );

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "The Football API connection test failed."
      );
    }
  }
);


/* =========================
   FOOTBALL FIXTURES
========================= */

exports.getFootballFixtures = onCall(
  {
    secrets: [
      footballApiKey
    ]
  },

  async request => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to retrieve fixtures."
      );
    }

    const leagueId =
      Number(
        request.data?.leagueId
      );

    const season =
      Number(
        request.data?.season
      );

    const from =
      typeof request.data?.from === "string"
        ? request.data.from.trim()
        : "";

    const to =
      typeof request.data?.to === "string"
        ? request.data.to.trim()
        : "";

    const status =
      typeof request.data?.status === "string"
        ? request.data.status.trim()
        : "";

    if (
      !Number.isInteger(
        leagueId
      ) ||
      leagueId <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid league ID is required."
      );
    }

    if (
      !Number.isInteger(
        season
      ) ||
      season < 2000 ||
      season > 2100
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid season is required."
      );
    }

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      from &&
      !datePattern.test(
        from
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The from date must use YYYY-MM-DD."
      );
    }

    if (
      to &&
      !datePattern.test(
        to
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The to date must use YYYY-MM-DD."
      );
    }

    try {
      const data =
        await requestFootballApi(
          "fixtures",
          {
            league:
              leagueId,

            season,

            from,

            to,

            status
          }
        );

      return {
        success:
          true,

        results:
          Number(
            data?.results
          ) || 0,

        fixtures:
          Array.isArray(
            data?.response
          )
            ? data.response
            : [],

        paging:
          data?.paging ||
          null
      };

    } catch (error) {
      console.error(
        "Football fixture request failed:",
        error
      );

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "The football fixtures could not be retrieved."
      );
    }
  }
);
exports.testScorecastLiveResults =
  onCall(
    {
      secrets: [
        footballApiKey
      ]
    },

    async request => {

      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in."
        );
      }

      try {

        const season = 2026;

        const from = "2026-08-28";
        const to = "2026-08-29";

        const leagues = [
          {
            id: 39,
            name: "Premier League"
          },
          {
            id: 40,
            name: "Championship"
          }
        ];

        const matches = [];

        for (const league of leagues) {

          const data =
            await requestFootballApi(
              "fixtures",
              {
                league: league.id,
                season,
                from,
                to
              }
            );

          const fixtures =
            Array.isArray(
              data?.response
            )
              ? data.response
              : [];

          fixtures.forEach(
            fixture => {

              matches.push({
                apiFixtureId:
                  fixture?.fixture?.id || null,

                league:
                  league.name,

                home:
                  fixture?.teams?.home?.name || "",

                away:
                  fixture?.teams?.away?.name || "",

                status:
                  fixture?.fixture
                    ?.status
                    ?.short || "",

                homeScore:
                  fixture?.goals?.home ?? null,

                awayScore:
                  fixture?.goals?.away ?? null,

                kickoff:
                  fixture?.fixture?.date || null
              });

            }
          );
        }
        /* =========================
           TEST WEEK THREE RESULT SAVE

           Crystal Palace v Manchester City
           = ScoreCast fixture 1
        ========================= */

        const palaceCity =
          matches.find(
            match =>
              match.home === "Crystal Palace" &&
              match.away === "Manchester City"
          );


        if (
          palaceCity &&
          ["FT", "AET", "PEN"].includes(
            palaceCity.status
          ) &&
          palaceCity.homeScore != null &&
          palaceCity.awayScore != null
        ) {

          await db
            .collection(
              "scorecast24_results"
            )
            .doc(
              "english-league-week-three-1"
            )
            .set(
              {
                round:
                  "English League Week Three",

                fixtureId:
                  "1",

                home:
                  palaceCity.home,

                away:
                  palaceCity.away,

                homeScore:
                  palaceCity.homeScore,

                awayScore:
                  palaceCity.awayScore,

                status:
                  palaceCity.status,

                apiFixtureId:
                  palaceCity.apiFixtureId,

                kickoff:
                  palaceCity.kickoff,

                updatedAt:
                  FieldValue.serverTimestamp()
              },
              {
                merge: true
              }
            );


          console.log(
            "Saved Week Three fixture 1 result:",
            palaceCity.homeScore,
            palaceCity.awayScore
          );

        }
        return {
          success: true,
          matches
        };

      } catch (error) {

        console.error(
          "ScoreCast live-result test failed:",
          error
        );

        throw new HttpsError(
          "internal",
          "Could not retrieve ScoreCast live results."
        );
      }
    }
  );

/* =========================
   PLAYER STATISTICS
========================= */

exports.getFixturePlayerStatistics =
  onCall(
    {
      secrets: [
        footballApiKey
      ]
    },

    async request => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in to retrieve player statistics."
        );
      }

      const fixtureId =
        Number(
          request.data?.fixtureId
        );

      if (
        !Number.isInteger(
          fixtureId
        ) ||
        fixtureId <= 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "A valid fixture ID is required."
        );
      }

      try {
        const data =
          await requestFootballApi(
            "fixtures/players",
            {
              fixture:
                fixtureId
            }
          );

        return {
          success:
            true,

          fixtureId,

          results:
            Number(
              data?.results
            ) || 0,

          teams:
            Array.isArray(
              data?.response
            )
              ? data.response
              : []
        };

      } catch (error) {
        console.error(
          "Fixture player-statistics request failed:",
          error
        );

        if (
          error instanceof HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "The fixture player statistics could not be retrieved."
        );
      }
    }
  );

  /* =========================
   DREAM TEAM WEEKEND IMPORT
========================= */

exports.importDreamTeamWeekend =
  onCall(
    {
      secrets: [
        footballApiKey,
        adminEmail
      ]
    },

    async request => {

      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in."
        );
      }


      /* =========================
         ADMIN ONLY
      ========================= */

      const callerEmail =
        String(
          request.auth.token.email || ""
        )
          .trim()
          .toLowerCase();

      const allowedAdminEmail =
        String(
          adminEmail.value() || ""
        )
          .trim()
          .toLowerCase();

      if (
        !callerEmail ||
        callerEmail !== allowedAdminEmail
      ) {
        throw new HttpsError(
          "permission-denied",
          "You are not authorised to import Dream Team results."
        );
      }


      /*
        English Premier League
      */

      const leagueId = 39;
      const season = 2026;


    /*
  Week Three:

  Friday 28 August
  through
  Monday 31 August
*/

     const from = "2026-08-28";
const to = "2026-08-31";


      try {

        /* =========================
           GET FIXTURES
        ========================= */

        const fixtureData =
          await requestFootballApi(
            "fixtures",
            {
              league:
                leagueId,

              season,

              from,

              to
            }
          );


        const fixtures =
          Array.isArray(
            fixtureData?.response
          )
            ? fixtureData.response
            : [];


        if (fixtures.length === 0) {
          return {
            success:
              true,

            fixturesFound:
              0,

            fixturesImported:
              0,

            message:
              "No Premier League fixtures were found."
          };
        }


        let fixturesImported = 0;

        const importedFixtures = [];


        /* =========================
           PROCESS EACH FIXTURE
        ========================= */

        for (
          const fixture of fixtures
        ) {

          const fixtureId =
            Number(
              fixture?.fixture?.id
            );


          if (
            !Number.isInteger(
              fixtureId
            )
          ) {
            continue;
          }


          const status =
            String(
              fixture?.fixture
                ?.status
                ?.short ||
              ""
            );


          const homeTeam =
            fixture?.teams
              ?.home
              ?.name ||
            "";


          const awayTeam =
            fixture?.teams
              ?.away
              ?.name ||
            "";


          const homeGoals =
            Number(
              fixture?.goals
                ?.home
            );


          const awayGoals =
            Number(
              fixture?.goals
                ?.away
            );


          /*
            Only retrieve player statistics
            once the match has finished.

            FT  = Full Time
            AET = After Extra Time
            PEN = Penalties
          */

          const matchFinished =
            [
              "FT",
              "AET",
              "PEN"
            ].includes(
              status
            );


          let playerTeams = [];


          if (matchFinished) {

            const playerData =
              await requestFootballApi(
                "fixtures/players",
                {
                  fixture:
                    fixtureId
                }
              );


            playerTeams =
              Array.isArray(
                playerData?.response
              )
                ? playerData.response
                : [];
          }


          /* =========================
             SAVE RAW FIXTURE
          ========================= */

          await db
            .collection(
              "dream_team_fixtures"
            )
            .doc(
              String(
                fixtureId
              )
            )
            .set(
              {
                fixtureId,

                leagueId,

                season,
                roundId: "2026-week-02",

                kickoff:
                  fixture?.fixture
                    ?.date ||
                  null,

                status,

                finished:
                  matchFinished,

                homeTeam,

                awayTeam,

                homeTeamId:
                  fixture?.teams
                    ?.home
                    ?.id ||
                  null,

                awayTeamId:
                  fixture?.teams
                    ?.away
                    ?.id ||
                  null,

                homeGoals:
                  Number.isFinite(
                    homeGoals
                  )
                    ? homeGoals
                    : null,

                awayGoals:
                  Number.isFinite(
                    awayGoals
                  )
                    ? awayGoals
                    : null,

                playerTeams,

                importedAt:
                  FieldValue
                    .serverTimestamp(),

                updatedAt:
                  FieldValue
                    .serverTimestamp()
              },
              {
                merge:
                  true
              }
            );


          fixturesImported++;


          importedFixtures.push({
            fixtureId,

            match:
              `${homeTeam} v ${awayTeam}`,

            status,

            playerStatisticsImported:
              playerTeams.length > 0
          });
        }


        return {
          success:
            true,

          fixturesFound:
            fixtures.length,

          fixturesImported,

          fixtures:
            importedFixtures
        };


      } catch (error) {

        console.error(
          "Dream Team weekend import failed:",
          error
        );


        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }


        throw new HttpsError(
          "internal",
          "The Dream Team weekend results could not be imported."
        );
      }
    }
  );
  /* =========================
   SCORE DREAM TEAM ROUND
========================= */

exports.scoreDreamTeamRound =
  onCall(
    {
      secrets: [
        adminEmail
      ]
    },

    async request => {

      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in."
        );
      }


      /* =========================
         ADMIN ONLY
      ========================= */

      const callerEmail =
        String(
          request.auth.token.email || ""
        )
          .trim()
          .toLowerCase();

      const allowedAdminEmail =
        String(
          adminEmail.value() || ""
        )
          .trim()
          .toLowerCase();

      if (
        !callerEmail ||
        callerEmail !== allowedAdminEmail
      ) {
        throw new HttpsError(
          "permission-denied",
          "You are not authorised to score Dream Team entries."
        );
      }


     const roundId =
  "2026-week-02";


      /* =========================
         SCORING RULES
      ========================= */

      const scoringRules = {
        goals: {
          Goalkeeper: 7,
          Defender: 6,
          Midfielder: 5,
          Attacker: 4
        },

        assist: 3,

        hatTrickBonus: 5,

        manOfTheMatch: 5,

        penaltySaved: 5,

        cleanSheet: {
          Goalkeeper: 5,
          Defender: 3
        },

        cards: {
          yellow: -3,
          red: -5
        },

        ratings: {
          10: 5,
          9: 4,
          8: 3,
          7: 2,
          6: 1,
          5: 0,
          4: -1,
          3: -2,
          2: -3,
          1: -4,
          0: -5
        }
      };


      function normaliseText(value) {
        return String(
          value || ""
        )
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-zA-Z0-9]/g,
            ""
          )
          .toLowerCase();
      }


      function roundRating(value) {

        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const rating =
          Number(value);

        if (
          !Number.isFinite(
            rating
          )
        ) {
          return null;
        }

        const limited =
          Math.max(
            0,
            Math.min(
              10,
              rating
            )
          );

        const whole =
          Math.floor(
            limited
          );

        const decimal =
          limited - whole;

        if (
          decimal <= 0.5
        ) {
          return whole;
        }

        return Math.min(
          10,
          whole + 1
        );
      }


      function safeNumber(value) {

        const number =
          Number(value);

        if (
          !Number.isFinite(
            number
          )
        ) {
          return 0;
        }

        return Math.max(
          0,
          Math.floor(
            number
          )
        );
      }


      function scorePlayer({
        position,
        rating,
        goals,
        assists,
        yellowCards,
        redCard,
        manOfTheMatch,
        penaltiesSaved,
        cleanSheet,
        goalsConceded
      }) {

        const roundedRating =
          roundRating(
            rating
          );

        const ratingPoints =
          roundedRating === null
            ? 0
            : scoringRules
                .ratings[
                  roundedRating
                ] ?? 0;


        const goalPoints =
          safeNumber(
            goals
          ) *
          (
            scoringRules
              .goals[
                position
              ] || 0
          );


        const assistPoints =
          safeNumber(
            assists
          ) *
          scoringRules.assist;


        const hatTrickPoints =
          safeNumber(
            goals
          ) >= 3
            ? scoringRules
                .hatTrickBonus
            : 0;


        const motmPoints =
          manOfTheMatch
            ? scoringRules
                .manOfTheMatch
            : 0;


        const cardPoints =
          redCard
            ? scoringRules
                .cards.red
            : (
                safeNumber(
                  yellowCards
                ) *
                scoringRules
                  .cards.yellow
              );


        let cleanSheetPoints = 0;

        let penaltySavePoints = 0;

        let goalsConcededPoints = 0;


        if (
          position ===
          "Goalkeeper"
        ) {

          penaltySavePoints =
            safeNumber(
              penaltiesSaved
            ) *
            scoringRules
              .penaltySaved;


          if (cleanSheet) {
            cleanSheetPoints =
              scoringRules
                .cleanSheet
                .Goalkeeper;
          }


          const conceded =
            safeNumber(
              goalsConceded
            );

          if (
            conceded >= 2
          ) {
            goalsConcededPoints =
              -(
                conceded - 1
              );
          }
        }


        if (
          position ===
            "Defender" &&
          cleanSheet
        ) {
          cleanSheetPoints =
            scoringRules
              .cleanSheet
              .Defender;
        }


        const breakdown = {
          goals:
            goalPoints,

          assists:
            assistPoints,

          hatTrick:
            hatTrickPoints,

          manOfTheMatch:
            motmPoints,

          rating:
            ratingPoints,

          cards:
            cardPoints,

          penaltiesSaved:
            penaltySavePoints,

          cleanSheet:
            cleanSheetPoints,

          goalsConceded:
            goalsConcededPoints
        };


        const totalPoints =
          Object
            .values(
              breakdown
            )
            .reduce(
              (
                total,
                points
              ) =>
                total +
                points,
              0
            );


        return {
          totalPoints,
          breakdown,
          roundedRating
        };
      }


      try {

        /* =========================
           LOAD FINISHED FIXTURES
        ========================= */

        const fixtureSnapshot =
          await db
            .collection(
              "dream_team_fixtures"
            )
            .get();


        const fixtures =
          fixtureSnapshot
            .docs
            .map(
              document => ({
                id:
                  document.id,

                ...document.data()
              })
            )
        .filter(
  fixture =>
    fixture.finished ===
      true &&
    fixture.roundId ===
      roundId &&
    Array.isArray(
      fixture.playerTeams
    ) &&
    fixture
      .playerTeams
      .length > 0
);


        /* =========================
           BUILD PLAYER RESULTS
        ========================= */

        const playerResults =
          new Map();


        for (
          const fixture of fixtures
        ) {

          const candidates = [];


          for (
            const teamBlock of
            fixture.playerTeams
          ) {

            const teamName =
              teamBlock
                ?.team
                ?.name ||
              "";

            const isHomeTeam =
              normaliseText(
                teamName
              ) ===
              normaliseText(
                fixture.homeTeam
              );

            const oppositionGoals =
              isHomeTeam
                ? Number(
                    fixture.awayGoals
                  ) || 0
                : Number(
                    fixture.homeGoals
                  ) || 0;


            const players =
              Array.isArray(
                teamBlock?.players
              )
                ? teamBlock.players
                : [];


            for (
              const playerBlock of
              players
            ) {

              const player =
                playerBlock
                  ?.player ||
                {};

              const stats =
                Array.isArray(
                  playerBlock
                    ?.statistics
                )
                  ? (
                      playerBlock
                        .statistics[0] ||
                      {}
                    )
                  : {};


              const minutes =
                Number(
                  stats
                    ?.games
                    ?.minutes
                ) || 0;


              /*
                A player who did not play
                receives no points.
              */

              if (
                minutes <= 0
              ) {
                continue;
              }


              const rating =
                stats
                  ?.games
                  ?.rating;


              const goals =
                safeNumber(
                  stats
                    ?.goals
                    ?.total
                );


              const assists =
                safeNumber(
                  stats
                    ?.goals
                    ?.assists
                );


              const passes =
                safeNumber(
                  stats
                    ?.passes
                    ?.total
                );


              candidates.push({
                apiPlayerId:
                  player.id ||
                  null,

                playerName:
                  player.name ||
                  "",

                club:
                  teamName,

                rating:
                  Number(
                    rating
                  ),

                goals,

                assists,

                passes
              });
            }
          }


          /*
            MAN OF THE MATCH

            1. Highest rating
            2. Most goals
            3. Most assists
            4. Most passes
            5. Stable final tie-break
          */

          const motmCandidates =
            candidates
              .filter(
                player =>
                  Number.isFinite(
                    player.rating
                  )
              )
              .sort(
                (a, b) => {

                  if (
                    b.rating !==
                    a.rating
                  ) {
                    return (
                      b.rating -
                      a.rating
                    );
                  }

                  if (
                    b.goals !==
                    a.goals
                  ) {
                    return (
                      b.goals -
                      a.goals
                    );
                  }

                  if (
                    b.assists !==
                    a.assists
                  ) {
                    return (
                      b.assists -
                      a.assists
                    );
                  }

                  if (
                    b.passes !==
                    a.passes
                  ) {
                    return (
                      b.passes -
                      a.passes
                    );
                  }

                  return String(
                    a.apiPlayerId ||
                    a.playerName
                  )
                    .localeCompare(
                      String(
                        b.apiPlayerId ||
                        b.playerName
                      )
                    );
                }
              );


          const motm =
            motmCandidates[0] ||
            null;


          for (
            const teamBlock of
            fixture.playerTeams
          ) {

            const teamName =
              teamBlock
                ?.team
                ?.name ||
              "";

            const isHomeTeam =
              normaliseText(
                teamName
              ) ===
              normaliseText(
                fixture.homeTeam
              );

            const oppositionGoals =
              isHomeTeam
                ? Number(
                    fixture.awayGoals
                  ) || 0
                : Number(
                    fixture.homeGoals
                  ) || 0;


            const players =
              Array.isArray(
                teamBlock?.players
              )
                ? teamBlock.players
                : [];


            for (
              const playerBlock of
              players
            ) {

              const player =
                playerBlock
                  ?.player ||
                {};

              const stats =
                Array.isArray(
                  playerBlock
                    ?.statistics
                )
                  ? (
                      playerBlock
                        .statistics[0] ||
                      {}
                    )
                  : {};


              const minutes =
                Number(
                  stats
                    ?.games
                    ?.minutes
                ) || 0;


              if (
                minutes <= 0
              ) {
                continue;
              }

const apiPosition =
  String(
    stats
      ?.games
      ?.position ||
    ""
  )
    .trim()
    .toUpperCase();

const positionMap = {
  G: "Goalkeeper",
  GK: "Goalkeeper",

  D: "Defender",
  DEF: "Defender",

  M: "Midfielder",
  MID: "Midfielder",

  F: "Attacker",
  FW: "Attacker",
  ST: "Attacker",
  ATT: "Attacker"
};

const position =
  positionMap[
    apiPosition
  ] || "";

              const result = {
                apiPlayerId:
                  player.id ||
                  null,

                playerName:
                  player.name ||
                  "",

                club:
                  teamName,
                  position,

                rating:
                  stats
                    ?.games
                    ?.rating ??
                  null,

                goals:
                  safeNumber(
                    stats
                      ?.goals
                      ?.total
                  ),

                assists:
                  safeNumber(
                    stats
                      ?.goals
                      ?.assists
                  ),

                yellowCards:
                  safeNumber(
                    stats
                      ?.cards
                      ?.yellow
                  ),

                redCard:
                  safeNumber(
                    stats
                      ?.cards
                      ?.red
                  ) > 0,

                penaltiesSaved:
                  safeNumber(
                    stats
                      ?.penalty
                      ?.saved
                  ),

                cleanSheet:
                  oppositionGoals ===
                  0,

                goalsConceded:
                  safeNumber(
                    stats
                      ?.goals
                      ?.conceded
                  ),

                manOfTheMatch:
                  Boolean(
                    motm &&
                    String(
                      motm
                        .apiPlayerId
                    ) ===
                    String(
                      player.id
                    )
                  )
              };

const scoredPlayer =
  scorePlayer({
    position:
      result.position,

    rating:
      result.rating,

    goals:
      result.goals,

    assists:
      result.assists,

    yellowCards:
      result.yellowCards,

    redCard:
      result.redCard,

    manOfTheMatch:
      result.manOfTheMatch,

    penaltiesSaved:
      result.penaltiesSaved,

    cleanSheet:
      result.cleanSheet,

    goalsConceded:
      result.goalsConceded
  });

  result.points =
  scoredPlayer.totalPoints;
              const key =
                `${normaliseText(
                  teamName
                )}|${normaliseText(
                  player.name
                )}`;


              playerResults.set(
                key,
                result
              );
            }
          }
        }

/*
  Save individual player scores
  for the current Dream Team round.
*/
const existingPlayerScoresSnapshot =
  await db
    .collection(
      "dream_team_player_scores"
    )
    .where(
      "roundId",
      "==",
      roundId
    )
    .get();

const deletePlayerScoresBatch =
  db.batch();

existingPlayerScoresSnapshot.docs
  .forEach(documentSnapshot => {
    deletePlayerScoresBatch.delete(
      documentSnapshot.ref
    );
  });

await deletePlayerScoresBatch.commit();
const playerScoreBatch =
  db.batch();

for (
  const result of
  playerResults.values()
) {

  if (
    !result.apiPlayerId
  ) {
    continue;
  }

  const playerScoreRef =
    db
      .collection(
        "dream_team_player_scores"
      )
      .doc(
        `${roundId}_${result.apiPlayerId}`
      );

  playerScoreBatch.set(
    playerScoreRef,
    {
      roundId,

      apiPlayerId:
        result.apiPlayerId,

      playerName:
        result.playerName,

      club:
        result.club,

      position:
        result.position,

      weekScore:
        result.points || 0,

      updatedAt:
        FieldValue
          .serverTimestamp()
    },
    {
      merge: true
    }
  );
}

await playerScoreBatch.commit();
        /* =========================
   LOAD DREAM TEAM ENTRIES

   A player's most recently submitted
   team remains active until they change it.

   If they have not submitted a new team
   for this round, their most recent previous
   team is automatically carried forward.
========================= */

const allEntriesSnapshot =
  await db
    .collection(
      "dream_team_entries"
    )
    .get();


/*
  Keep the most appropriate team
  for each user.

  Priority:

  1. Exact current-round entry
  2. Otherwise latest earlier entry
*/

const entriesByUser =
  new Map();


for (
  const documentSnapshot of
  allEntriesSnapshot.docs
) {

  const entry =
    documentSnapshot.data();


  /*
    Only valid submitted teams
    can be carried forward.
  */

  if (
    entry.status !==
    "submitted"
  ) {
    continue;
  }


  const uid =
    entry.uid;


  const entryRoundId =
    entry.roundId;


  if (
    !uid ||
    !entryRoundId
  ) {
    continue;
  }


  /*
    Never carry a future round
    backwards into an earlier round.
  */

  if (
    entryRoundId >
    roundId
  ) {
    continue;
  }


  const existing =
    entriesByUser.get(
      uid
    );


  if (!existing) {

    entriesByUser.set(
      uid,
      {
        documentSnapshot,
        entry
      }
    );

    continue;
  }


  const existingRoundId =
    existing.entry.roundId;


  /*
    Prefer the most recent round.

    Round IDs such as:

    2026-week-01
    2026-week-02
    2026-week-03

    sort correctly in this format.
  */

  if (
    entryRoundId >
    existingRoundId
  ) {

    entriesByUser.set(
      uid,
      {
        documentSnapshot,
        entry
      }
    );

  }

}


let entriesScored = 0;

let carriedForwardEntries = 0;

const unmatchedPlayers =
  [];


/* =========================
   SCORE EACH ACTIVE TEAM
========================= */

for (
  const {
    documentSnapshot,
    entry
  } of entriesByUser.values()
) {

  const selectedPlayers =
    Array.isArray(
      entry.players
    )
      ? entry.players
      : [];


  /*
    Ignore incomplete/broken entries.
  */

  if (
    selectedPlayers.length === 0
  ) {
    continue;
  }


  let totalPoints = 0;


  const updatedPlayers =
    selectedPlayers.map(
      selectedPlayer => {

        const key =
          `${normaliseText(
            selectedPlayer.club
          )}|${normaliseText(
            selectedPlayer.name
          )}`;


        const matchStats =
          playerResults.get(
            key
          );


        /*
          Player has not played yet,
          or could not be matched.

          They remain on zero until
          statistics become available.
        */

        if (
          !matchStats
        ) {

          return {
            ...selectedPlayer,

            points:
              0
          };
        }


        const playerPoints =
  Number(
    matchStats.points
  ) || 0;


totalPoints +=
  playerPoints;


return {
  ...selectedPlayer,

  apiPlayerId:
    matchStats
      .apiPlayerId,

  points:
    playerPoints
};
  }
);

  /*
    IMPORTANT:

    Always write the score into a
    CURRENT-ROUND document.

    This preserves each week's team
    and score separately.

    Example:

    2026-week-01_UID
    2026-week-02_UID
    2026-week-03_UID
  */

  const currentRoundEntryId =
    `${roundId}_${entry.uid}`;


  const currentRoundReference =
    db
      .collection(
        "dream_team_entries"
      )
      .doc(
        currentRoundEntryId
      );


  const alreadyCurrentRound =
    entry.roundId ===
    roundId;


  const updateData = {

    uid:
      entry.uid,

    username:
      entry.username || "",

    email:
      entry.email || "",

    roundId,

    formation:
      entry.formation || "",

    ratingTotal:
      entry.ratingTotal || 0,

    players:
      updatedPlayers,

    status:
      "submitted",

    totalPoints,

    scoredFixtures:
      fixtures.length,

    scoredAt:
      FieldValue
        .serverTimestamp()

  };


  /*
    If this team came from an earlier
    week, record where it originated.
  */

  if (
    !alreadyCurrentRound
  ) {

    updateData.rolloverFromRound =
      entry.roundId;

    updateData.carriedForward =
      true;

    carriedForwardEntries++;

  }


  await currentRoundReference
    .set(
      updateData,
      {
        merge:
          true
      }
    );


  entriesScored++;
}


/* =========================
   RETURN RESULT
========================= */

return {

  success:
    true,

  roundId,

  finishedFixtures:
    fixtures.length,

  playersAvailable:
    playerResults.size,

  entriesFound:
    entriesByUser.size,

  entriesScored,

  carriedForwardEntries

};
      } catch (error) {

        console.error(
          "Dream Team scoring failed:",
          error
        );


        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }


        throw new HttpsError(
          "internal",
          "Dream Team scoring could not be completed."
        );
      }
    }
  );
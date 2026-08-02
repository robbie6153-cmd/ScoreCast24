"use strict";


/* =========================
   FIREBASE
========================= */

import {
  auth,
  db
} from "./template-firebase.js?v=3";


import {
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


/* =========================
   PAGE ELEMENTS
========================= */

const navigationButtons =
  document.querySelectorAll(
    ".nav-button"
  );

const sectionLinkButtons =
  document.querySelectorAll(
    ".section-link-button"
  );

const contentSections =
  document.querySelectorAll(
    ".content-section"
  );


const currentYear =
  document.getElementById(
    "currentYear"
  );


const accountStatusText =
  document.getElementById(
    "accountStatusText"
  );

const adminPanelLink =
  document.getElementById(
    "adminPanelLink"
  );

const mainLogoutButton =
  document.getElementById(
    "mainLogoutButton"
  );

const memberLoginBox =
  document.getElementById(
    "memberLoginBox"
  );


const photoGallery =
  document.getElementById(
    "photoGallery"
  );

const photoGalleryLoading =
  document.getElementById(
    "photoGalleryLoading"
  );

const photoGalleryEmpty =
  document.getElementById(
    "photoGalleryEmpty"
  );

const photoGalleryError =
  document.getElementById(
    "photoGalleryError"
  );


const photoViewer =
  document.getElementById(
    "photoViewer"
  );

const closePhotoViewer =
  document.getElementById(
    "closePhotoViewer"
  );

const photoViewerImage =
  document.getElementById(
    "photoViewerImage"
  );

const photoViewerWatermark =
  document.getElementById(
    "photoViewerWatermark"
  );

const photoViewerAccess =
  document.getElementById(
    "photoViewerAccess"
  );

const photoViewerTitle =
  document.getElementById(
    "photoViewerTitle"
  );

const photoViewerDescription =
  document.getElementById(
    "photoViewerDescription"
  );


/* =========================
   CURRENT VIEWER
========================= */

let currentViewer = {
  user: null,
  username: "",
  isAdmin: false,
  isSubscriber: false
};


/* =========================
   BASIC HELPERS
========================= */

function escapeHtml(value) {

  return String(value ?? "")
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
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function showElement(element) {

  element
    ?.classList
    .remove(
      "hidden"
    );

}


function hideElement(element) {

  element
    ?.classList
    .add(
      "hidden"
    );

}


/* =========================
   YEAR
========================= */

if (currentYear) {

  currentYear.textContent =
    new Date()
      .getFullYear();

}


/* =========================
   SECTION NAVIGATION
========================= */

function showSection(sectionId) {

  contentSections.forEach(
    (section) => {

      const isSelected =
        section.id ===
        sectionId;

      section.classList.toggle(
        "active-section",
        isSelected
      );

      section.classList.toggle(
        "hidden-section",
        !isSelected
      );

    }
  );


  navigationButtons.forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.section ===
          sectionId
      );

    }
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


navigationButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        showSection(
          button.dataset.section
        );

      }
    );

  }
);


sectionLinkButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        showSection(
          button.dataset.section
        );

      }
    );

  }
);


/* =========================
   USER PROFILE
========================= */

async function getUserProfile(user) {

  try {

    const userReference =
      doc(
        db,
        "users",
        user.uid
      );

    const userSnapshot =
      await getDoc(
        userReference
      );

    if (!userSnapshot.exists()) {

      return {
        username:
          user.email
            ?.split("@")[0] ||
          "Member",

        subscriptionActive:
          false
      };

    }

    const userData =
      userSnapshot.data();

    return {
      username:
        userData.username ||
        user.email
          ?.split("@")[0] ||
        "Member",

      subscriptionActive:
        userData.subscriptionActive ===
        true
    };

  } catch (error) {

    console.error(
      "Unable to load user profile:",
      error
    );

    return {
      username:
        user.email
          ?.split("@")[0] ||
        "Member",

      subscriptionActive:
        false
    };

  }

}


/* =========================
   ACCOUNT STATUS
========================= */

function showLoggedOutStatus() {

  currentViewer = {
    user: null,
    username: "",
    isAdmin: false,
    isSubscriber: false
  };

  if (accountStatusText) {

    accountStatusText.textContent =
      "Not logged in";

  }

  hideElement(
    adminPanelLink
  );

  hideElement(
    mainLogoutButton
  );

  showElement(
    memberLoginBox
  );

}


function showLoggedInStatus() {

  if (currentViewer.isAdmin) {

    accountStatusText.textContent =
      "Logged in as Admin";

    showElement(
      adminPanelLink
    );

  } else {

    accountStatusText.textContent =
      `Logged in as ${currentViewer.username}`;

    hideElement(
      adminPanelLink
    );

  }

  showElement(
    mainLogoutButton
  );

  hideElement(
    memberLoginBox
  );

}


/* =========================
   AUTHENTICATION
========================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      showLoggedOutStatus();

      await loadPhotoGallery();

      return;

    }

    try {

      const tokenResult =
        await user.getIdTokenResult();

      const profile =
        await getUserProfile(
          user
        );

      currentViewer = {
        user,

        username:
          profile.username,

        isAdmin:
          tokenResult.claims.admin ===
          true,

        isSubscriber:
          profile.subscriptionActive ===
          true
      };

      showLoggedInStatus();

      await loadPhotoGallery();

    } catch (error) {

      console.error(
        "Unable to check login:",
        error
      );

      if (accountStatusText) {

        accountStatusText.textContent =
          "Unable to check login";

      }

      await loadPhotoGallery();

    }

  }
);


/* =========================
   LOG OUT
========================= */

mainLogoutButton
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );

        window.location.href =
          "template.html";

      } catch (error) {

        console.error(
          "Unable to log out:",
          error
        );

        alert(
          "Unable to log out. Please try again."
        );

      }

    }
  );


/* =========================
   PHOTO ACCESS
========================= */

function canViewPhoto(photo) {

  if (
    photo.access ===
    "free"
  ) {

    return true;

  }

  return (
    currentViewer.isAdmin ||
    currentViewer.isSubscriber
  );

}


/* =========================
   LOAD PHOTO GALLERY
========================= */

async function loadPhotoGallery() {

  if (!photoGallery) {
    return;
  }

  photoGallery.innerHTML =
    "";

  showElement(
    photoGalleryLoading
  );

  hideElement(
    photoGalleryEmpty
  );

  hideElement(
    photoGalleryError
  );

  try {

const photosQuery =
  query(
    collection(
      db,
      "creator_content"
    ),
    orderBy(
      "createdAt",
      "desc"
    )
  );

photosSnapshot.forEach(
  (documentSnapshot) => {

    const data =
      documentSnapshot.data();

    if (
      data.type !== "photo"
    ) {
      return;
    }

    photos.push({
      id:
        documentSnapshot.id,

      ...data
    });

  }
);

    hideElement(
      photoGalleryLoading
    );

    if (!photos.length) {

      showElement(
        photoGalleryEmpty
      );

      return;

    }

    renderPhotoGallery(
      photos
    );

  } catch (error) {

    console.error(
      "Unable to load photo gallery:",
      error
    );

    hideElement(
      photoGalleryLoading
    );

    showElement(
      photoGalleryError
    );

  }

}


/* =========================
   RENDER PHOTO GALLERY
========================= */

function renderPhotoGallery(photos) {

  if (!photoGallery) {
    return;
  }

  photoGallery.innerHTML =
    photos
      .map(
        (photo) => {

          const allowed =
            canViewPhoto(
              photo
            );

          const accessLabel =
            photo.access ===
            "subscription"
              ? "Subscribers Only"
              : "Free";

          if (!allowed) {

            return `
              <article
                class="gallery-photo-card locked-photo-card"
              >

                <div class="gallery-photo-locked">

                  <span class="gallery-lock-icon">
                    🔒
                  </span>

                  <strong>
                    Subscribers Only
                  </strong>

                  <p>
                    Log in with an active subscription
                    to view this photograph.
                  </p>

                </div>

                <div class="gallery-information">

                  <span class="photo-access-badge">
                    ${escapeHtml(accessLabel)}
                  </span>

                  <h3>
                    ${escapeHtml(photo.title || "Exclusive Photo")}
                  </h3>

                  <p>
                    ${escapeHtml(photo.description || "")}
                  </p>

                </div>

              </article>
            `;

          }

          return `
            <article
              class="gallery-photo-card"
            >

              <button
                type="button"
                class="gallery-photo-button"
                data-photo-id="${escapeHtml(photo.id)}"
              >

                <div class="gallery-photo-image-wrap">

                  <img
                    src="${escapeHtml(photo.downloadURL || "")}"
                    alt="${escapeHtml(photo.title || "Gallery photo")}"
                    class="gallery-photo-image"
                    loading="lazy"
                  >

                  <span class="gallery-photo-watermark">
                    ${escapeHtml(currentViewer.username)}
                  </span>

                </div>

              </button>

              <div class="gallery-information">

                <span class="photo-access-badge">
                  ${escapeHtml(accessLabel)}
                </span>

                <h3>
                  ${escapeHtml(photo.title || "Gallery Photo")}
                </h3>

                <p>
                  ${escapeHtml(photo.description || "")}
                </p>

              </div>

            </article>
          `;

        }
      )
      .join("");


  const photoButtons =
    photoGallery.querySelectorAll(
      ".gallery-photo-button"
    );

  photoButtons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const photo =
            photos.find(
              (item) =>
                item.id ===
                button.dataset.photoId
            );

          if (photo) {

            openPhotoViewer(
              photo
            );

          }

        }
      );

    }
  );

}


/* =========================
   PHOTO VIEWER
========================= */

function openPhotoViewer(photo) {

  if (
    !photoViewer ||
    !canViewPhoto(photo)
  ) {

    return;

  }

  photoViewerImage.src =
    photo.downloadURL || "";

  photoViewerImage.alt =
    photo.title ||
    "Gallery photo";

  photoViewerWatermark.textContent =
    currentViewer.username || "";

  photoViewerAccess.textContent =
    photo.access ===
    "subscription"
      ? "Subscribers Only"
      : "Free";

  photoViewerTitle.textContent =
    photo.title ||
    "Gallery Photo";

  photoViewerDescription.textContent =
    photo.description || "";

  showElement(
    photoViewer
  );

  photoViewer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "viewer-open"
  );

}


function closeViewer() {

  if (!photoViewer) {
    return;
  }

  hideElement(
    photoViewer
  );

  photoViewer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "viewer-open"
  );

  photoViewerImage.src =
    "";

}


closePhotoViewer
  ?.addEventListener(
    "click",
    closeViewer
  );


photoViewer
  ?.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        photoViewer
      ) {

        closeViewer();

      }

    }
  );


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key ===
      "Escape"
    ) {

      closeViewer();

    }

  }
);
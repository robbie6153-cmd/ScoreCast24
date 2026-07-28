"use strict";


/* =========================
   PAGE ELEMENTS
========================= */

const startScreen =
  document.getElementById(
    "startScreen"
  );

const gameContainer =
  document.getElementById(
    "gameContainer"
  );

const startButton =
  document.getElementById(
    "startButton"
  );

const restartButton =
  document.getElementById(
    "restartButton"
  );

const soundButton =
  document.getElementById(
    "soundButton"
  );

const leftButton =
  document.getElementById(
    "leftButton"
  );

const rightButton =
  document.getElementById(
    "rightButton"
  );

const fireButton =
  document.getElementById(
    "fireButton"
  );

const messageOverlay =
  document.getElementById(
    "messageOverlay"
  );

const messageTitle =
  document.getElementById(
    "messageTitle"
  );

const messageText =
  document.getElementById(
    "messageText"
  );

const scoreDisplay =
  document.getElementById(
    "scoreDisplay"
  );

const livesDisplay =
  document.getElementById(
    "livesDisplay"
  );

const canvas =
  document.getElementById(
    "gameCanvas"
  );

const context =
  canvas.getContext("2d");

const normalMusic =
  document.getElementById(
    "normalMusic"
  );

const dangerMusic =
  document.getElementById(
    "dangerMusic"
  );


/* =========================
   CANVAS SETTINGS
========================= */

const GAME_WIDTH = 900;
const GAME_HEIGHT = 650;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;


/* =========================
   IMAGE LOADING
========================= */

function loadImage(source) {
  const image = new Image();
  image.src = source;
  return image;
}

const playerImage =
  loadImage("fun.jpg");

const barrierImage =
  loadImage("barrier.jpg");

const alienImages = [
  loadImage("alien1.jpg"),
  loadImage("alien2.jpg"),
  loadImage("alien3.jpg")
];


/* =========================
   GAME CONSTANTS
========================= */

const PLAYER_WIDTH = 56;
const PLAYER_HEIGHT = 56;

const PLAYER_Y =
  GAME_HEIGHT -
  PLAYER_HEIGHT -
  15;

const PLAYER_SPEED = 480;

const PLAYER_BULLET_SPEED = 720;
const ALIEN_BULLET_SPEED = 310;

const RAPID_FIRE_DELAY = 125;

const ALIEN_WIDTH = 58;
const ALIEN_HEIGHT = 43;

const ALIEN_COLUMNS = 9;
const ALIEN_ROWS = 3;

const ALIEN_HORIZONTAL_GAP = 25;
const ALIEN_VERTICAL_GAP = 22;

const ALIEN_START_X = 75;
const ALIEN_START_Y = 70;

const ALIEN_DROP_DISTANCE = 24;

const BARRIER_WIDTH = 115;
const BARRIER_HEIGHT = 62;
const BARRIER_Y = 475;

const DANGER_LINE_Y = 350;

const STAR_COUNT = 90;


/* =========================
   GAME VARIABLES
========================= */

let animationFrameId = null;

let lastFrameTime = 0;
let lastPlayerShotTime = 0;
let lastAlienShotTime = 0;

let gameRunning = false;
let gameOver = false;
let soundEnabled = true;
let dangerMusicActive = false;

let score = 0;
let lives = 3;

let alienDirection = 1;
let alienSpeed = 52;

let leftPressed = false;
let rightPressed = false;
let firePressed = false;

let touchDragging = false;

let player = null;
let aliens = [];
let playerBullets = [];
let alienBullets = [];
let barriers = [];
let stars = [];
let explosions = [];


/* =========================
   OBJECT CREATION
========================= */

function createPlayer() {
  return {
    x:
      (GAME_WIDTH / 2) -
      (PLAYER_WIDTH / 2),

    y: PLAYER_Y,

    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,

    invulnerableUntil: 0
  };
}


function createAliens() {
  const createdAliens = [];

  for (
    let row = 0;
    row < ALIEN_ROWS;
    row += 1
  ) {
    for (
      let column = 0;
      column < ALIEN_COLUMNS;
      column += 1
    ) {
      const health =
        3 - row;

      createdAliens.push({
        x:
          ALIEN_START_X +
          column *
          (
            ALIEN_WIDTH +
            ALIEN_HORIZONTAL_GAP
          ),

        y:
          ALIEN_START_Y +
          row *
          (
            ALIEN_HEIGHT +
            ALIEN_VERTICAL_GAP
          ),

        width: ALIEN_WIDTH,
        height: ALIEN_HEIGHT,

        row,
        column,

        health,
        maximumHealth: health,

        alive: true,

        flashUntil: 0
      });
    }
  }

  return createdAliens;
}


function createBarriers() {
  const barrierGap =
    (
      GAME_WIDTH -
      (BARRIER_WIDTH * 3)
    ) / 4;

  return [
    {
      x: barrierGap,
      y: BARRIER_Y,
      width: BARRIER_WIDTH,
      height: BARRIER_HEIGHT,
      health: 10,
      maximumHealth: 10
    },

    {
      x:
        barrierGap * 2 +
        BARRIER_WIDTH,

      y: BARRIER_Y,
      width: BARRIER_WIDTH,
      height: BARRIER_HEIGHT,
      health: 10,
      maximumHealth: 10
    },

    {
      x:
        barrierGap * 3 +
        BARRIER_WIDTH * 2,

      y: BARRIER_Y,
      width: BARRIER_WIDTH,
      height: BARRIER_HEIGHT,
      health: 10,
      maximumHealth: 10
    }
  ];
}


function createStars() {
  const createdStars = [];

  for (
    let index = 0;
    index < STAR_COUNT;
    index += 1
  ) {
    createdStars.push({
      x:
        Math.random() *
        GAME_WIDTH,

      y:
        Math.random() *
        GAME_HEIGHT,

      size:
        Math.random() * 2.2 +
        0.4,

      speed:
        Math.random() * 20 +
        8,

      brightness:
        Math.random() * 0.7 +
        0.3
    });
  }

  return createdStars;
}


/* =========================
   GAME START AND RESET
========================= */

function startGame() {
  cancelAnimationFrame(
    animationFrameId
  );

  score = 0;
  lives = 3;

  alienDirection = 1;
  alienSpeed = 52;

  playerBullets = [];
  alienBullets = [];
  explosions = [];

  player =
    createPlayer();

  aliens =
    createAliens();

  barriers =
    createBarriers();

  stars =
    createStars();

  leftPressed = false;
  rightPressed = false;
  firePressed = false;
  touchDragging = false;

  lastFrameTime =
    performance.now();

  lastPlayerShotTime = 0;
  lastAlienShotTime = 0;

  gameRunning = true;
  gameOver = false;
  dangerMusicActive = false;

  startScreen.classList.add(
    "hidden"
  );

  gameContainer.classList.remove(
    "hidden"
  );

  messageOverlay.classList.add(
    "hidden"
  );

  updateScoreDisplay();
  updateLivesDisplay();

  startNormalMusic();

  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );
}


/* =========================
   MUSIC
========================= */

function playAudio(audioElement) {
  if (!soundEnabled) {
    return;
  }

  const playPromise =
    audioElement.play();

  if (
    playPromise &&
    typeof playPromise.catch ===
      "function"
  ) {
    playPromise.catch(
      () => {
        // Browser may wait for another user interaction.
      }
    );
  }
}


function stopAudio(audioElement) {
  audioElement.pause();
  audioElement.currentTime = 0;
}


function startNormalMusic() {
  if (!soundEnabled) {
    return;
  }

  if (dangerMusicActive) {
    return;
  }

  dangerMusic.pause();

  if (normalMusic.paused) {
    playAudio(normalMusic);
  }
}


function startDangerMusic() {
  if (!soundEnabled) {
    return;
  }

  if (dangerMusicActive) {
    return;
  }

  dangerMusicActive = true;

  normalMusic.pause();
  normalMusic.currentTime = 0;

  dangerMusic.currentTime = 0;
  playAudio(dangerMusic);
}


function stopAllMusic() {
  stopAudio(normalMusic);
  stopAudio(dangerMusic);
}


function toggleSound() {
  soundEnabled =
    !soundEnabled;

  soundButton.textContent =
    soundEnabled
      ? "SOUND ON"
      : "SOUND OFF";

  if (!soundEnabled) {
    stopAllMusic();
    return;
  }

  if (!gameRunning) {
    return;
  }

  if (dangerMusicActive) {
    playAudio(dangerMusic);
  } else {
    playAudio(normalMusic);
  }
}


/* =========================
   MAIN GAME LOOP
========================= */

function gameLoop(currentTime) {
  if (!gameRunning) {
    return;
  }

  const deltaTime =
    Math.min(
      (
        currentTime -
        lastFrameTime
      ) / 1000,
      0.04
    );

  lastFrameTime =
    currentTime;

  updateGame(
    deltaTime,
    currentTime
  );

  drawGame(
    currentTime
  );

  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );
}


/* =========================
   GAME UPDATES
========================= */

function updateGame(
  deltaTime,
  currentTime
) {
  updateStars(
    deltaTime
  );

  updatePlayer(
    deltaTime,
    currentTime
  );

  updateAliens(
    deltaTime
  );

  updatePlayerBullets(
    deltaTime
  );

  updateAlienBullets(
    deltaTime
  );

  updateExplosions(
    deltaTime
  );

  checkPlayerBulletCollisions(
    currentTime
  );

  checkAlienBulletCollisions(
    currentTime
  );

  checkAlienDanger();

  attemptAlienShot(
    currentTime
  );

  removeFinishedObjects();

  checkWinCondition();
}


function updateStars(deltaTime) {
  for (const star of stars) {
    star.y +=
      star.speed *
      deltaTime;

    if (
      star.y >
      GAME_HEIGHT
    ) {
      star.y = 0;
      star.x =
        Math.random() *
        GAME_WIDTH;
    }
  }
}


function updatePlayer(
  deltaTime,
  currentTime
) {
  if (leftPressed) {
    player.x -=
      PLAYER_SPEED *
      deltaTime;
  }

  if (rightPressed) {
    player.x +=
      PLAYER_SPEED *
      deltaTime;
  }

  player.x =
    clamp(
      player.x,
      0,
      GAME_WIDTH -
      player.width
    );

  if (
    firePressed &&
    currentTime -
      lastPlayerShotTime >=
      RAPID_FIRE_DELAY
  ) {
    firePlayerBullet(
      currentTime
    );
  }
}


function updateAliens(deltaTime) {
  const livingAliens =
    aliens.filter(
      alien => alien.alive
    );

  if (
    livingAliens.length === 0
  ) {
    return;
  }

  let shouldDrop = false;

  for (
    const alien of livingAliens
  ) {
    const nextX =
      alien.x +
      alienSpeed *
      alienDirection *
      deltaTime;

    if (
      nextX <= 10 ||
      nextX +
        alien.width >=
        GAME_WIDTH - 10
    ) {
      shouldDrop = true;
      break;
    }
  }

  if (shouldDrop) {
    alienDirection *= -1;

    for (
      const alien of livingAliens
    ) {
      alien.y +=
        ALIEN_DROP_DISTANCE;
    }

    alienSpeed += 4;
  } else {
    for (
      const alien of livingAliens
    ) {
      alien.x +=
        alienSpeed *
        alienDirection *
        deltaTime;
    }
  }

  for (
    const alien of livingAliens
  ) {
    if (
      alien.y +
        alien.height >=
        BARRIER_Y + 20
    ) {
      endGame(
        false,
        "THE ALIENS LANDED!"
      );

      return;
    }
  }
}


function updatePlayerBullets(
  deltaTime
) {
  for (
    const bullet of playerBullets
  ) {
    bullet.y -=
      PLAYER_BULLET_SPEED *
      deltaTime;
  }
}


function updateAlienBullets(
  deltaTime
) {
  for (
    const bullet of alienBullets
  ) {
    bullet.y +=
      ALIEN_BULLET_SPEED *
      deltaTime;
  }
}


function updateExplosions(
  deltaTime
) {
  for (
    const explosion of explosions
  ) {
    explosion.life -=
      deltaTime;

    explosion.radius +=
      80 *
      deltaTime;
  }
}


/* =========================
   SHOOTING
========================= */

function firePlayerBullet(
  currentTime
) {
  lastPlayerShotTime =
    currentTime;

  playerBullets.push({
    x:
      player.x +
      player.width / 2 -
      3,

    y:
      player.y - 15,

    width: 6,
    height: 19
  });
}


function attemptAlienShot(
  currentTime
) {
  const livingAliens =
    aliens.filter(
      alien => alien.alive
    );

  if (
    livingAliens.length === 0
  ) {
    return;
  }

  const shotDelay =
    Math.max(
      320,
      950 -
      (
        27 -
        livingAliens.length
      ) *
      20
    );

  if (
    currentTime -
      lastAlienShotTime <
      shotDelay
  ) {
    return;
  }

  lastAlienShotTime =
    currentTime;

  const bottomAliens =
    getBottomAliensByColumn();

  if (
    bottomAliens.length === 0
  ) {
    return;
  }

  const shooter =
    bottomAliens[
      Math.floor(
        Math.random() *
        bottomAliens.length
      )
    ];

  alienBullets.push({
    x:
      shooter.x +
      shooter.width / 2 -
      4,

    y:
      shooter.y +
      shooter.height,

    width: 8,
    height: 19
  });
}


function getBottomAliensByColumn() {
  const bottomAliens = [];

  for (
    let column = 0;
    column < ALIEN_COLUMNS;
    column += 1
  ) {
    const aliensInColumn =
      aliens
        .filter(
          alien =>
            alien.alive &&
            alien.column === column
        )
        .sort(
          (
            firstAlien,
            secondAlien
          ) =>
            secondAlien.y -
            firstAlien.y
        );

    if (
      aliensInColumn.length > 0
    ) {
      bottomAliens.push(
        aliensInColumn[0]
      );
    }
  }

  return bottomAliens;
}


/* =========================
   COLLISION DETECTION
========================= */

function rectanglesOverlap(
  first,
  second
) {
  return (
    first.x <
      second.x +
      second.width &&

    first.x +
      first.width >
      second.x &&

    first.y <
      second.y +
      second.height &&

    first.y +
      first.height >
      second.y
  );
}


function checkPlayerBulletCollisions(
  currentTime
) {
  for (
    const bullet of playerBullets
  ) {
    if (bullet.destroyed) {
      continue;
    }

    for (
      const alien of aliens
    ) {
      if (
        !alien.alive ||
        bullet.destroyed
      ) {
        continue;
      }

      if (
        rectanglesOverlap(
          bullet,
          alien
        )
      ) {
        bullet.destroyed = true;

        alien.health -= 1;
        alien.flashUntil =
          currentTime + 110;

        createExplosion(
          bullet.x,
          bullet.y,
          0.18
        );

        if (
          alien.health <= 0
        ) {
          alien.alive = false;

          score +=
            alien.maximumHealth *
            100;

          createExplosion(
            alien.x +
              alien.width / 2,

            alien.y +
              alien.height / 2,

            0.42
          );

          updateScoreDisplay();
        } else {
          score += 20;
          updateScoreDisplay();
        }
      }
    }

    checkBulletAgainstBarriers(
      bullet,
      1
    );
  }
}


function checkAlienBulletCollisions(
  currentTime
) {
  for (
    const bullet of alienBullets
  ) {
    if (bullet.destroyed) {
      continue;
    }

    checkBulletAgainstBarriers(
      bullet,
      1
    );

    if (
      bullet.destroyed
    ) {
      continue;
    }

    if (
      rectanglesOverlap(
        bullet,
        player
      )
    ) {
      bullet.destroyed = true;

      if (
        currentTime <
        player.invulnerableUntil
      ) {
        continue;
      }

      loseLife(
        currentTime
      );
    }
  }
}


function checkBulletAgainstBarriers(
  bullet,
  damage
) {
  for (
    const barrier of barriers
  ) {
    if (
      barrier.health <= 0 ||
      bullet.destroyed
    ) {
      continue;
    }

    if (
      rectanglesOverlap(
        bullet,
        barrier
      )
    ) {
      bullet.destroyed = true;
      barrier.health -= damage;

      createExplosion(
        bullet.x,
        bullet.y,
        0.12
      );
    }
  }
}


function loseLife(currentTime) {
  lives -= 1;

  updateLivesDisplay();

  dangerMusicActive = false;
  startDangerMusic();

  createExplosion(
    player.x +
      player.width / 2,

    player.y +
      player.height / 2,

    0.7
  );

  alienBullets = [];

  if (lives <= 0) {
    endGame(
      false,
      "GAME OVER"
    );

    return;
  }

  player.x =
    GAME_WIDTH / 2 -
    player.width / 2;

  player.invulnerableUntil =
    currentTime + 1800;
}


function checkAlienDanger() {
  const livingAliens =
    aliens.filter(
      alien => alien.alive
    );

  if (
    livingAliens.length === 0
  ) {
    return;
  }

  const lowestAlienY =
    Math.max(
      ...livingAliens.map(
        alien =>
          alien.y +
          alien.height
      )
    );

  if (
    lowestAlienY >=
    DANGER_LINE_Y
  ) {
    startDangerMusic();
  }
}


/* =========================
   GAME CONDITIONS
========================= */

function checkWinCondition() {
  const anyAliensAlive =
    aliens.some(
      alien => alien.alive
    );

  if (!anyAliensAlive) {
    endGame(
      true,
      "YOU SAVED EARTH!"
    );
  }
}


function endGame(
  playerWon,
  title
) {
  if (gameOver) {
    return;
  }

  gameRunning = false;
  gameOver = true;

  leftPressed = false;
  rightPressed = false;
  firePressed = false;

  stopAllMusic();

  if (
    !playerWon &&
    soundEnabled
  ) {
    dangerMusic.currentTime = 0;
    playAudio(dangerMusic);
  }

  messageTitle.textContent =
    title;

  messageText.textContent =
    playerWon
      ? `Victory! Final score: ${score}`
      : `Final score: ${score}`;

  messageOverlay.classList.remove(
    "hidden"
  );
}


/* =========================
   CLEANUP
========================= */

function removeFinishedObjects() {
  playerBullets =
    playerBullets.filter(
      bullet =>
        !bullet.destroyed &&
        bullet.y +
          bullet.height >
          0
    );

  alienBullets =
    alienBullets.filter(
      bullet =>
        !bullet.destroyed &&
        bullet.y <
          GAME_HEIGHT +
          bullet.height
    );

  explosions =
    explosions.filter(
      explosion =>
        explosion.life > 0
    );
}


/* =========================
   EXPLOSIONS
========================= */

function createExplosion(
  x,
  y,
  life
) {
  explosions.push({
    x,
    y,
    life,
    maximumLife: life,
    radius: 5
  });
}


/* =========================
   DRAWING
========================= */

function drawGame(currentTime) {
  context.clearRect(
    0,
    0,
    GAME_WIDTH,
    GAME_HEIGHT
  );

  drawBackground();
  drawStars();
  drawDangerLine();
  drawBarriers();
  drawAliens(currentTime);
  drawPlayerBullets();
  drawAlienBullets();
  drawPlayer(currentTime);
  drawExplosions();
}


function drawBackground() {
  const gradient =
    context.createLinearGradient(
      0,
      0,
      0,
      GAME_HEIGHT
    );

  gradient.addColorStop(
    0,
    "#07142d"
  );

  gradient.addColorStop(
    0.55,
    "#020713"
  );

  gradient.addColorStop(
    1,
    "#000000"
  );

  context.fillStyle =
    gradient;

  context.fillRect(
    0,
    0,
    GAME_WIDTH,
    GAME_HEIGHT
  );
}


function drawStars() {
  for (
    const star of stars
  ) {
    context.globalAlpha =
      star.brightness;

    context.fillStyle =
      "#ffffff";

    context.beginPath();

    context.arc(
      star.x,
      star.y,
      star.size,
      0,
      Math.PI * 2
    );

    context.fill();
  }

  context.globalAlpha = 1;
}


function drawDangerLine() {
  context.save();

  context.globalAlpha = 0.14;
  context.strokeStyle = "#ff0000";
  context.lineWidth = 2;

  context.setLineDash([
    14,
    13
  ]);

  context.beginPath();

  context.moveTo(
    0,
    DANGER_LINE_Y
  );

  context.lineTo(
    GAME_WIDTH,
    DANGER_LINE_Y
  );

  context.stroke();

  context.restore();
}


function drawPlayer(currentTime) {
  if (
    currentTime <
    player.invulnerableUntil
  ) {
    const flash =
      Math.floor(
        currentTime / 100
      ) % 2;

    if (flash === 0) {
      return;
    }
  }

  drawImageSafely(
    playerImage,
    player.x,
    player.y,
    player.width,
    player.height,
    "#39ff7a"
  );
}


function drawAliens(currentTime) {
  for (
    const alien of aliens
  ) {
    if (!alien.alive) {
      continue;
    }

    if (
      currentTime <
      alien.flashUntil
    ) {
      context.save();

      context.shadowBlur = 24;
      context.shadowColor =
        "#ffffff";

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        alien.x,
        alien.y,
        alien.width,
        alien.height
      );

      context.restore();

      continue;
    }

    drawImageSafely(
      alienImages[alien.row],
      alien.x,
      alien.y,
      alien.width,
      alien.height,
      "#ff32cf"
    );

    drawAlienHealth(
      alien
    );
  }
}


function drawAlienHealth(alien) {
  if (
    alien.maximumHealth <= 1
  ) {
    return;
  }

  const healthWidth =
    alien.width *
    (
      alien.health /
      alien.maximumHealth
    );

  context.fillStyle =
    "rgba(0, 0, 0, 0.7)";

  context.fillRect(
    alien.x,
    alien.y - 7,
    alien.width,
    4
  );

  context.fillStyle =
    alien.health === 1
      ? "#ff3434"
      : "#ffe600";

  context.fillRect(
    alien.x,
    alien.y - 7,
    healthWidth,
    4
  );
}


function drawBarriers() {
  for (
    const barrier of barriers
  ) {
    if (
      barrier.health <= 0
    ) {
      continue;
    }

    const healthRatio =
      barrier.health /
      barrier.maximumHealth;

    context.save();

    context.globalAlpha =
      0.4 +
      healthRatio * 0.6;

    if (
      barrier.health <= 3
    ) {
      const shake =
        Math.random() * 4 -
        2;

      drawImageSafely(
        barrierImage,
        barrier.x + shake,
        barrier.y,
        barrier.width,
        barrier.height,
        "#00d9ff"
      );
    } else {
      drawImageSafely(
        barrierImage,
        barrier.x,
        barrier.y,
        barrier.width,
        barrier.height,
        "#00d9ff"
      );
    }

    context.restore();

    context.fillStyle =
      "rgba(0, 0, 0, 0.65)";

    context.fillRect(
      barrier.x,
      barrier.y +
        barrier.height +
        4,

      barrier.width,
      5
    );

    context.fillStyle =
      healthRatio > 0.4
        ? "#40ff63"
        : "#ff3232";

    context.fillRect(
      barrier.x,
      barrier.y +
        barrier.height +
        4,

      barrier.width *
        healthRatio,

      5
    );
  }
}


function drawPlayerBullets() {
  for (
    const bullet of playerBullets
  ) {
    const gradient =
      context.createLinearGradient(
        bullet.x,
        bullet.y,
        bullet.x,
        bullet.y +
          bullet.height
      );

    gradient.addColorStop(
      0,
      "#ffffff"
    );

    gradient.addColorStop(
      0.35,
      "#fff700"
    );

    gradient.addColorStop(
      1,
      "#ff6a00"
    );

    context.fillStyle =
      gradient;

    context.shadowBlur = 12;
    context.shadowColor =
      "#fff700";

    context.fillRect(
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height
    );

    context.shadowBlur = 0;
  }
}


function drawAlienBullets() {
  for (
    const bullet of alienBullets
  ) {
    context.fillStyle =
      "#ff254f";

    context.shadowBlur = 12;
    context.shadowColor =
      "#ff0044";

    context.fillRect(
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height
    );

    context.shadowBlur = 0;
  }
}


function drawExplosions() {
  for (
    const explosion of explosions
  ) {
    const lifeRatio =
      explosion.life /
      explosion.maximumLife;

    context.save();

    context.globalAlpha =
      Math.max(
        0,
        lifeRatio
      );

    const gradient =
      context.createRadialGradient(
        explosion.x,
        explosion.y,
        0,

        explosion.x,
        explosion.y,
        explosion.radius
      );

    gradient.addColorStop(
      0,
      "#ffffff"
    );

    gradient.addColorStop(
      0.25,
      "#fff000"
    );

    gradient.addColorStop(
      0.6,
      "#ff5200"
    );

    gradient.addColorStop(
      1,
      "rgba(255, 0, 0, 0)"
    );

    context.fillStyle =
      gradient;

    context.beginPath();

    context.arc(
      explosion.x,
      explosion.y,
      explosion.radius,
      0,
      Math.PI * 2
    );

    context.fill();
    context.restore();
  }
}


function drawImageSafely(
  image,
  x,
  y,
  width,
  height,
  fallbackColour
) {
  if (
    image.complete &&
    image.naturalWidth > 0
  ) {
    context.drawImage(
      image,
      x,
      y,
      width,
      height
    );

    return;
  }

  context.fillStyle =
    fallbackColour;

  context.fillRect(
    x,
    y,
    width,
    height
  );
}


/* =========================
   DISPLAY UPDATES
========================= */

function updateScoreDisplay() {
  scoreDisplay.textContent =
    String(score);
}


function updateLivesDisplay() {
  livesDisplay.textContent =
    String(lives);
}


/* =========================
   KEYBOARD CONTROLS
========================= */

document.addEventListener(
  "keydown",
  event => {
    if (
      event.code ===
        "ArrowLeft" ||
      event.code ===
        "KeyA"
    ) {
      leftPressed = true;
      event.preventDefault();
    }

    if (
      event.code ===
        "ArrowRight" ||
      event.code ===
        "KeyD"
    ) {
      rightPressed = true;
      event.preventDefault();
    }

    if (
      event.code ===
      "Space"
    ) {
      firePressed = true;
      event.preventDefault();
    }
  }
);


document.addEventListener(
  "keyup",
  event => {
    if (
      event.code ===
        "ArrowLeft" ||
      event.code ===
        "KeyA"
    ) {
      leftPressed = false;
    }

    if (
      event.code ===
        "ArrowRight" ||
      event.code ===
        "KeyD"
    ) {
      rightPressed = false;
    }

    if (
      event.code ===
      "Space"
    ) {
      firePressed = false;
    }
  }
);


/* =========================
   CANVAS TOUCH CONTROLS
========================= */

function getCanvasPosition(
  clientX,
  clientY
) {
  const rectangle =
    canvas.getBoundingClientRect();

  return {
    x:
      (
        clientX -
        rectangle.left
      ) *
      (
        canvas.width /
        rectangle.width
      ),

    y:
      (
        clientY -
        rectangle.top
      ) *
      (
        canvas.height /
        rectangle.height
      )
  };
}


function movePlayerToPointer(
  clientX,
  clientY
) {
  if (
    !gameRunning ||
    !player
  ) {
    return;
  }

  const position =
    getCanvasPosition(
      clientX,
      clientY
    );

  player.x =
    clamp(
      position.x -
        player.width / 2,
      0,
      GAME_WIDTH -
        player.width
    );
}


canvas.addEventListener(
  "pointerdown",
  event => {
    if (!gameRunning) {
      return;
    }

    touchDragging = true;
    firePressed = true;

    canvas.setPointerCapture(
      event.pointerId
    );

    movePlayerToPointer(
      event.clientX,
      event.clientY
    );

    event.preventDefault();
  }
);


canvas.addEventListener(
  "pointermove",
  event => {
    if (!touchDragging) {
      return;
    }

    movePlayerToPointer(
      event.clientX,
      event.clientY
    );

    event.preventDefault();
  }
);


canvas.addEventListener(
  "pointerup",
  event => {
    touchDragging = false;
    firePressed = false;

    if (
      canvas.hasPointerCapture(
        event.pointerId
      )
    ) {
      canvas.releasePointerCapture(
        event.pointerId
      );
    }

    event.preventDefault();
  }
);


canvas.addEventListener(
  "pointercancel",
  () => {
    touchDragging = false;
    firePressed = false;
  }
);


/* =========================
   BUTTON CONTROLS
========================= */

function addHoldControl(
  button,
  onStart,
  onEnd
) {
  button.addEventListener(
    "pointerdown",
    event => {
      onStart();

      button.classList.add(
        "button-active"
      );

      button.setPointerCapture(
        event.pointerId
      );

      event.preventDefault();
    }
  );

  const stopControl =
    event => {
      onEnd();

      button.classList.remove(
        "button-active"
      );

      if (
        event.pointerId !==
          undefined &&
        button.hasPointerCapture(
          event.pointerId
        )
      ) {
        button.releasePointerCapture(
          event.pointerId
        );
      }

      event.preventDefault();
    };

  button.addEventListener(
    "pointerup",
    stopControl
  );

  button.addEventListener(
    "pointercancel",
    stopControl
  );

  button.addEventListener(
    "pointerleave",
    event => {
      if (
        event.buttons === 0
      ) {
        stopControl(event);
      }
    }
  );
}


addHoldControl(
  leftButton,

  () => {
    leftPressed = true;
  },

  () => {
    leftPressed = false;
  }
);


addHoldControl(
  rightButton,

  () => {
    rightPressed = true;
  },

  () => {
    rightPressed = false;
  }
);


addHoldControl(
  fireButton,

  () => {
    firePressed = true;
  },

  () => {
    firePressed = false;
  }
);


/* =========================
   GENERAL BUTTON EVENTS
========================= */

startButton.addEventListener(
  "click",
  startGame
);

restartButton.addEventListener(
  "click",
  startGame
);

soundButton.addEventListener(
  "click",
  toggleSound
);


/* =========================
   SAFETY EVENTS
========================= */

window.addEventListener(
  "blur",
  () => {
    leftPressed = false;
    rightPressed = false;
    firePressed = false;
    touchDragging = false;
  }
);


document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      leftPressed = false;
      rightPressed = false;
      firePressed = false;
      touchDragging = false;

      normalMusic.pause();
      dangerMusic.pause();
    } else if (
      gameRunning &&
      soundEnabled
    ) {
      if (dangerMusicActive) {
        playAudio(dangerMusic);
      } else {
        playAudio(normalMusic);
      }
    }
  }
);


/* =========================
   HELPER FUNCTIONS
========================= */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}
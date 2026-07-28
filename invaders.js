"use strict";


/* =========================
   PAGE ELEMENTS
========================= */

const startScreen =
  document.getElementById(
    "startScreen"
  );

const gameScreen =
  document.getElementById(
    "gameScreen"
  );

const startButton =
  document.getElementById(
    "startButton"
  );

const homeButton =
  document.getElementById(
    "homeButton"
  );

const gameOverHomeButton =
  document.getElementById(
    "gameOverHomeButton"
  );

const restartButton =
  document.getElementById(
    "restartButton"
  );

const nextWaveButton =
  document.getElementById(
    "nextWaveButton"
  );

const pauseButton =
  document.getElementById(
    "pauseButton"
  );

const resumeButton =
  document.getElementById(
    "resumeButton"
  );

const pausePanel =
  document.getElementById(
    "pausePanel"
  );

const gameOverPanel =
  document.getElementById(
    "gameOverPanel"
  );

const levelCompletePanel =
  document.getElementById(
    "levelCompletePanel"
  );

const scoreDisplay =
  document.getElementById(
    "scoreDisplay"
  );

const livesDisplay =
  document.getElementById(
    "livesDisplay"
  );

const finalScoreDisplay =
  document.getElementById(
    "finalScoreDisplay"
  );

const gameContainer =
  document.getElementById(
    "gameContainer"
  );

const canvas =
  document.getElementById(
    "gameCanvas"
  );

const ctx =
  canvas.getContext(
    "2d"
  );

const moveLeftButton =
  document.getElementById(
    "moveLeftButton"
  );

const moveRightButton =
  document.getElementById(
    "moveRightButton"
  );

const fireButton =
  document.getElementById(
    "fireButton"
  );


/* =========================
   IMAGES
========================= */

const alien1Image =
  document.getElementById(
    "alien1Image"
  );

const alien2Image =
  document.getElementById(
    "alien2Image"
  );

const alien3Image =
  document.getElementById(
    "alien3Image"
  );

const barrierImage =
  document.getElementById(
    "barrierImage"
  );

const gunImage =
  document.getElementById(
    "gunImage"
  );


/* =========================
   AUDIO
========================= */

const gameMusic =
  document.getElementById(
    "gameMusic"
  );

const deathMusic =
  document.getElementById(
    "deathMusic"
  );

gameMusic.volume = 0.45;
deathMusic.volume = 0.75;


/* =========================
   GAME SETTINGS
========================= */

const GAME_WIDTH = 900;
const GAME_HEIGHT = 1100;

const PLAYER_SIZE = 84;
const PLAYER_SPEED = 520;

const PLAYER_BULLET_WIDTH = 8;
const PLAYER_BULLET_HEIGHT = 28;
const PLAYER_BULLET_SPEED = 850;

const ENEMY_BULLET_WIDTH = 9;
const ENEMY_BULLET_HEIGHT = 24;
const ENEMY_BULLET_SPEED = 320;

const RAPID_FIRE_DELAY = 145;

const ALIEN_WIDTH = 72;
const ALIEN_HEIGHT = 54;
const ALIEN_GAP_X = 14;
const ALIEN_GAP_Y = 22;

const TOP_ALIEN_COUNT = 8;
const MIDDLE_ALIEN_COUNT = 8;
const BOTTOM_ALIEN_COUNT = 10;

const BARRIER_WIDTH = 155;
const BARRIER_HEIGHT = 92;
const BARRIER_COUNT = 3;

const STARTING_LIVES = 3;

const ALIEN_DROP_DISTANCE = 30;


/* =========================
   GAME STATE
========================= */

let animationFrameId = null;
let lastTime = 0;

let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let waveComplete = false;

let score = 0;
let lives = STARTING_LIVES;
let wave = 1;

let alienDirection = 1;
let alienSpeed = 48;

let enemyFireTimer = 0;
let enemyFireDelay = 900;

let lastPlayerShot = 0;

let moveLeft = false;
let moveRight = false;
let firing = false;

let touchDragging = false;

let player = null;
let aliens = [];
let playerBullets = [];
let enemyBullets = [];
let barriers = [];
let explosions = [];

let canvasScaleX = 1;
let canvasScaleY = 1;


/* =========================
   PLAYER
========================= */

function createPlayer() {
  player = {
    x:
      GAME_WIDTH / 2 -
      PLAYER_SIZE / 2,

    y:
      GAME_HEIGHT -
      PLAYER_SIZE -
      44,

    width:
      PLAYER_SIZE,

    height:
      PLAYER_SIZE,

    invulnerable:
      false,

    invulnerableTimer:
      0
  };
}


/* =========================
   ALIENS
========================= */

function createAlienRow({
  count,
  row,
  health,
  image,
  points
}) {
  const totalWidth =
    count * ALIEN_WIDTH +
    (count - 1) * ALIEN_GAP_X;

  const startX =
    (GAME_WIDTH - totalWidth) / 2;

  const startY =
    120 +
    row *
      (
        ALIEN_HEIGHT +
        ALIEN_GAP_Y
      );

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    aliens.push({
      x:
        startX +
        index *
          (
            ALIEN_WIDTH +
            ALIEN_GAP_X
          ),

      y:
        startY,

      width:
        ALIEN_WIDTH,

      height:
        ALIEN_HEIGHT,

      health:
        health,

      maxHealth:
        health,

      image:
        image,

      points:
        points,

      alive:
        true,

      flashTimer:
        0
    });
  }
}


function createAliens() {
  aliens = [];

  createAlienRow({
    count:
      TOP_ALIEN_COUNT,

    row:
      0,

    health:
      3,

    image:
      alien1Image,

    points:
      30
  });

  createAlienRow({
    count:
      MIDDLE_ALIEN_COUNT,

    row:
      1,

    health:
      2,

    image:
      alien2Image,

    points:
      20
  });

  createAlienRow({
    count:
      BOTTOM_ALIEN_COUNT,

    row:
      2,

    health:
      1,

    image:
      alien3Image,

    points:
      10
  });
}


/* =========================
   BARRIERS
========================= */

function createBarriers() {
  barriers = [];

  const sideGap =
    (
      GAME_WIDTH -
      BARRIER_COUNT *
        BARRIER_WIDTH
    ) /
    (
      BARRIER_COUNT +
      1
    );

  for (
    let index = 0;
    index < BARRIER_COUNT;
    index += 1
  ) {
    barriers.push({
      x:
        sideGap +
        index *
          (
            BARRIER_WIDTH +
            sideGap
          ),

      y:
        GAME_HEIGHT -
        245,

      width:
        BARRIER_WIDTH,

      height:
        BARRIER_HEIGHT,

      health:
        12,

      maxHealth:
        12,

      alive:
        true
    });
  }
}


/* =========================
   CANVAS SIZE
========================= */

function resizeCanvas() {
  canvas.width =
    GAME_WIDTH;

  canvas.height =
    GAME_HEIGHT;

  const rect =
    canvas.getBoundingClientRect();

  canvasScaleX =
    GAME_WIDTH /
    rect.width;

  canvasScaleY =
    GAME_HEIGHT /
    rect.height;
}


window.addEventListener(
  "resize",
  resizeCanvas
);


/* =========================
   START AND RESET
========================= */

function resetGame() {
  score = 0;
  lives = STARTING_LIVES;
  wave = 1;

  alienSpeed = 48;
  alienDirection = 1;

  enemyFireTimer = 0;
  enemyFireDelay = 900;

  playerBullets = [];
  enemyBullets = [];
  explosions = [];

  createPlayer();
  createAliens();
  createBarriers();

  updateScoreDisplay();
  updateLivesDisplay();
}


function startGame() {
  cancelAnimationFrame(
    animationFrameId
  );

  resizeCanvas();
  resetGame();

  startScreen.classList.add(
    "hidden"
  );

  gameScreen.classList.remove(
    "hidden"
  );

  pausePanel.classList.add(
    "hidden"
  );

  gameOverPanel.classList.add(
    "hidden"
  );

  levelCompletePanel.classList.add(
    "hidden"
  );

  gameRunning = true;
  gamePaused = false;
  gameOver = false;
  waveComplete = false;

  lastTime =
    performance.now();

  startGameMusic();

  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );
}


function restartGame() {
  stopDeathMusic();
  startGame();
}


function returnHome() {
  gameRunning = false;
  gamePaused = false;
  gameOver = false;
  waveComplete = false;

  cancelAnimationFrame(
    animationFrameId
  );

  stopAllAudio();

  clearControls();

  gameScreen.classList.add(
    "hidden"
  );

  pausePanel.classList.add(
    "hidden"
  );

  gameOverPanel.classList.add(
    "hidden"
  );

  levelCompletePanel.classList.add(
    "hidden"
  );

  startScreen.classList.remove(
    "hidden"
  );
}


/* =========================
   NEXT WAVE
========================= */

function startNextWave() {
  wave += 1;

  alienSpeed =
    Math.min(
      145,
      48 +
      (wave - 1) * 13
    );

  enemyFireDelay =
    Math.max(
      340,
      900 -
      (wave - 1) * 80
    );

  alienDirection = 1;
  enemyFireTimer = 0;

  playerBullets = [];
  enemyBullets = [];
  explosions = [];

  createPlayer();
  createAliens();
  createBarriers();

  waveComplete = false;
  gamePaused = false;
  gameRunning = true;

  levelCompletePanel.classList.add(
    "hidden"
  );

  startGameMusic();

  lastTime =
    performance.now();

  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );
}


/* =========================
   MAIN GAME LOOP
========================= */

function gameLoop(currentTime) {
  if (
    !gameRunning ||
    gameOver ||
    waveComplete
  ) {
    return;
  }

  const deltaTime =
    Math.min(
      (
        currentTime -
        lastTime
      ) /
      1000,

      0.04
    );

  lastTime =
    currentTime;

  if (!gamePaused) {
    updateGame(
      deltaTime,
      currentTime
    );
  }

  drawGame();

  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );
}


/* =========================
   UPDATE GAME
========================= */

function updateGame(
  deltaTime,
  currentTime
) {
  updatePlayer(
    deltaTime
  );

  updatePlayerFiring(
    currentTime
  );

  updatePlayerBullets(
    deltaTime
  );

  updateAliens(
    deltaTime
  );

  updateEnemyFiring(
    deltaTime
  );

  updateEnemyBullets(
    deltaTime
  );

  updateExplosions(
    deltaTime
  );

  updateInvulnerability(
    deltaTime
  );

  checkPlayerBulletCollisions();
  checkEnemyBulletCollisions();
  checkAlienBarrierCollisions();
  checkAlienPlayerCollision();
  checkWaveComplete();
}


/* =========================
   PLAYER MOVEMENT
========================= */

function updatePlayer(
  deltaTime
) {
  if (moveLeft) {
    player.x -=
      PLAYER_SPEED *
      deltaTime;
  }

  if (moveRight) {
    player.x +=
      PLAYER_SPEED *
      deltaTime;
  }

  player.x =
    Math.max(
      0,
      Math.min(
        GAME_WIDTH -
        player.width,

        player.x
      )
    );
}


/* =========================
   PLAYER FIRING
========================= */

function updatePlayerFiring(
  currentTime
) {
  if (!firing) {
    return;
  }

  if (
    currentTime -
    lastPlayerShot <
    RAPID_FIRE_DELAY
  ) {
    return;
  }

  firePlayerBullet();

  lastPlayerShot =
    currentTime;
}


function firePlayerBullet() {
  if (
    !gameRunning ||
    gamePaused ||
    gameOver ||
    waveComplete
  ) {
    return;
  }

  playerBullets.push({
    x:
      player.x +
      player.width / 2 -
      PLAYER_BULLET_WIDTH / 2,

    y:
      player.y -
      PLAYER_BULLET_HEIGHT,

    width:
      PLAYER_BULLET_WIDTH,

    height:
      PLAYER_BULLET_HEIGHT
  });
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

  playerBullets =
    playerBullets.filter(
      bullet =>
        bullet.y +
        bullet.height >
        0
    );
}


/* =========================
   ALIEN MOVEMENT
========================= */

function updateAliens(
  deltaTime
) {
  const livingAliens =
    aliens.filter(
      alien =>
        alien.alive
    );

  if (
    livingAliens.length === 0
  ) {
    return;
  }

  let leftEdge =
    Infinity;

  let rightEdge =
    -Infinity;

  for (
    const alien of livingAliens
  ) {
    leftEdge =
      Math.min(
        leftEdge,
        alien.x
      );

    rightEdge =
      Math.max(
        rightEdge,
        alien.x +
        alien.width
      );
  }

  const distance =
    alienSpeed *
    alienDirection *
    deltaTime;

  const willHitRight =
    alienDirection > 0 &&
    rightEdge +
      distance >=
      GAME_WIDTH -
      10;

  const willHitLeft =
    alienDirection < 0 &&
    leftEdge +
      distance <=
      10;

  if (
    willHitRight ||
    willHitLeft
  ) {
    alienDirection *= -1;

    for (
      const alien of livingAliens
    ) {
      alien.y +=
        ALIEN_DROP_DISTANCE;
    }
  } else {
    for (
      const alien of livingAliens
    ) {
      alien.x +=
        distance;
    }
  }

  for (
    const alien of livingAliens
  ) {
    if (
      alien.flashTimer >
      0
    ) {
      alien.flashTimer -=
        deltaTime;
    }
  }
}


/* =========================
   ENEMY FIRING
========================= */

function updateEnemyFiring(
  deltaTime
) {
  enemyFireTimer +=
    deltaTime * 1000;

  if (
    enemyFireTimer <
    enemyFireDelay
  ) {
    return;
  }

  enemyFireTimer = 0;

  const shooters =
    getBottomAliens();

  if (
    shooters.length === 0
  ) {
    return;
  }

  const shooter =
    shooters[
      Math.floor(
        Math.random() *
        shooters.length
      )
    ];

  enemyBullets.push({
    x:
      shooter.x +
      shooter.width / 2 -
      ENEMY_BULLET_WIDTH / 2,

    y:
      shooter.y +
      shooter.height,

    width:
      ENEMY_BULLET_WIDTH,

    height:
      ENEMY_BULLET_HEIGHT
  });
}


function getBottomAliens() {
  const livingAliens =
    aliens.filter(
      alien =>
        alien.alive
    );

  const columnGroups =
    new Map();

  for (
    const alien of livingAliens
  ) {
    const column =
      Math.round(
        alien.x /
        (
          ALIEN_WIDTH +
          ALIEN_GAP_X
        )
      );

    const current =
      columnGroups.get(
        column
      );

    if (
      !current ||
      alien.y >
      current.y
    ) {
      columnGroups.set(
        column,
        alien
      );
    }
  }

  return Array.from(
    columnGroups.values()
  );
}


function updateEnemyBullets(
  deltaTime
) {
  for (
    const bullet of enemyBullets
  ) {
    bullet.y +=
      ENEMY_BULLET_SPEED *
      deltaTime;
  }

  enemyBullets =
    enemyBullets.filter(
      bullet =>
        bullet.y <
        GAME_HEIGHT +
        bullet.height
    );
}


/* =========================
   COLLISION HELPERS
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


/* =========================
   PLAYER BULLET COLLISIONS
========================= */

function checkPlayerBulletCollisions() {
  for (
    let bulletIndex =
      playerBullets.length - 1;

    bulletIndex >= 0;

    bulletIndex -= 1
  ) {
    const bullet =
      playerBullets[
        bulletIndex
      ];

    let bulletRemoved = false;

    for (
      const alien of aliens
    ) {
      if (!alien.alive) {
        continue;
      }

      if (
        rectanglesOverlap(
          bullet,
          alien
        )
      ) {
        playerBullets.splice(
          bulletIndex,
          1
        );

        bulletRemoved = true;

        damageAlien(
          alien
        );

        break;
      }
    }

    if (bulletRemoved) {
      continue;
    }

    for (
      const barrier of barriers
    ) {
      if (!barrier.alive) {
        continue;
      }

      if (
        rectanglesOverlap(
          bullet,
          barrier
        )
      ) {
        playerBullets.splice(
          bulletIndex,
          1
        );

        damageBarrier(
          barrier,
          1
        );

        break;
      }
    }
  }
}


function damageAlien(
  alien
) {
  alien.health -= 1;
  alien.flashTimer = 0.1;

  if (
    alien.health <= 0
  ) {
    alien.alive = false;

    score +=
      alien.points;

    createExplosion(
      alien.x +
      alien.width / 2,

      alien.y +
      alien.height / 2,

      42
    );

    updateScoreDisplay();

    increaseAlienSpeed();
  }
}


function increaseAlienSpeed() {
  const livingCount =
    aliens.filter(
      alien =>
        alien.alive
    ).length;

  const totalCount =
    aliens.length;

  const destroyedRatio =
    1 -
    livingCount /
    totalCount;

  alienSpeed =
    Math.min(
      180,

      48 +
      (wave - 1) *
        13 +
      destroyedRatio *
        80
    );
}


/* =========================
   ENEMY BULLET COLLISIONS
========================= */

function checkEnemyBulletCollisions() {
  for (
    let bulletIndex =
      enemyBullets.length - 1;

    bulletIndex >= 0;

    bulletIndex -= 1
  ) {
    const bullet =
      enemyBullets[
        bulletIndex
      ];

    let bulletRemoved = false;

    for (
      const barrier of barriers
    ) {
      if (!barrier.alive) {
        continue;
      }

      if (
        rectanglesOverlap(
          bullet,
          barrier
        )
      ) {
        enemyBullets.splice(
          bulletIndex,
          1
        );

        damageBarrier(
          barrier,
          1
        );

        bulletRemoved = true;

        break;
      }
    }

    if (bulletRemoved) {
      continue;
    }

    if (
      !player.invulnerable &&
      rectanglesOverlap(
        bullet,
        player
      )
    ) {
      enemyBullets.splice(
        bulletIndex,
        1
      );

      loseLife();
    }
  }
}


/* =========================
   BARRIER DAMAGE
========================= */

function damageBarrier(
  barrier,
  amount
) {
  barrier.health -=
    amount;

  if (
    barrier.health <= 0
  ) {
    barrier.health = 0;
    barrier.alive = false;

    createExplosion(
      barrier.x +
      barrier.width / 2,

      barrier.y +
      barrier.height / 2,

      55
    );
  }
}


/* =========================
   ALIEN COLLISIONS
========================= */

function checkAlienBarrierCollisions() {
  for (
    const alien of aliens
  ) {
    if (!alien.alive) {
      continue;
    }

    for (
      const barrier of barriers
    ) {
      if (!barrier.alive) {
        continue;
      }

      if (
        rectanglesOverlap(
          alien,
          barrier
        )
      ) {
        damageBarrier(
          barrier,
          barrier.maxHealth
        );
      }
    }
  }
}


function checkAlienPlayerCollision() {
  for (
    const alien of aliens
  ) {
    if (!alien.alive) {
      continue;
    }

    if (
      rectanglesOverlap(
        alien,
        player
      ) ||
      alien.y +
        alien.height >=
        player.y
    ) {
      endGame();

      return;
    }
  }
}


/* =========================
   PLAYER LIFE
========================= */

function loseLife() {
  if (
    player.invulnerable ||
    gameOver
  ) {
    return;
  }

  lives -= 1;

  updateLivesDisplay();

  createExplosion(
    player.x +
    player.width / 2,

    player.y +
    player.height / 2,

    65
  );

  if (
    lives <= 0
  ) {
    endGame();

    return;
  }

  player.x =
    GAME_WIDTH / 2 -
    player.width / 2;

  player.invulnerable = true;
  player.invulnerableTimer = 2;

  enemyBullets = [];
}


function updateInvulnerability(
  deltaTime
) {
  if (
    !player.invulnerable
  ) {
    return;
  }

  player.invulnerableTimer -=
    deltaTime;

  if (
    player.invulnerableTimer <=
    0
  ) {
    player.invulnerable = false;
    player.invulnerableTimer = 0;
  }
}


/* =========================
   WAVE AND GAME OVER
========================= */

function checkWaveComplete() {
  const anyAlive =
    aliens.some(
      alien =>
        alien.alive
    );

  if (anyAlive) {
    return;
  }

  waveComplete = true;
  gameRunning = false;

  stopGameMusic();

  setTimeout(
    () => {
      levelCompletePanel.classList.remove(
        "hidden"
      );
    },

    350
  );
}


function endGame() {
  if (gameOver) {
    return;
  }

  gameOver = true;
  gameRunning = false;

  clearControls();

  stopGameMusic();
  playDeathMusic();

  finalScoreDisplay.textContent =
    String(
      score
    );

  setTimeout(
    () => {
      gameOverPanel.classList.remove(
        "hidden"
      );
    },

    350
  );

  drawGame();
}


/* =========================
   EXPLOSIONS
========================= */

function createExplosion(
  x,
  y,
  size
) {
  explosions.push({
    x:
      x,

    y:
      y,

    size:
      size,

    life:
      0.35,

    maxLife:
      0.35
  });
}


function updateExplosions(
  deltaTime
) {
  for (
    const explosion of explosions
  ) {
    explosion.life -=
      deltaTime;
  }

  explosions =
    explosions.filter(
      explosion =>
        explosion.life >
        0
    );
}


/* =========================
   DRAW GAME
========================= */

function drawGame() {
  ctx.clearRect(
    0,
    0,
    GAME_WIDTH,
    GAME_HEIGHT
  );

  drawBackground();
  drawStars();
  drawAliens();
  drawBarriers();
  drawPlayerBullets();
  drawEnemyBullets();
  drawPlayer();
  drawExplosions();
  drawWaveNumber();
}


function drawBackground() {
  ctx.fillStyle =
    "#02030a";

  ctx.fillRect(
    0,
    0,
    GAME_WIDTH,
    GAME_HEIGHT
  );
}


function drawStars() {
  ctx.fillStyle =
    "rgba(255, 255, 255, 0.65)";

  const starPositions = [
    [58, 74],
    [145, 42],
    [239, 87],
    [332, 39],
    [422, 77],
    [519, 31],
    [620, 83],
    [705, 49],
    [830, 92],
    [90, 340],
    [187, 295],
    [291, 372],
    [401, 305],
    [507, 348],
    [604, 302],
    [734, 360],
    [847, 316],
    [44, 650],
    [160, 585],
    [280, 690],
    [388, 610],
    [505, 670],
    [650, 590],
    [770, 678],
    [858, 615],
    [100, 912],
    [220, 850],
    [365, 935],
    [530, 870],
    [690, 940],
    [810, 865]
  ];

  for (
    const [
      x,
      y
    ] of starPositions
  ) {
    ctx.fillRect(
      x,
      y,
      3,
      3
    );
  }
}


function drawAliens() {
  for (
    const alien of aliens
  ) {
    if (!alien.alive) {
      continue;
    }

    ctx.save();

    if (
      alien.flashTimer >
      0
    ) {
      ctx.globalAlpha = 0.45;
    }

    drawImageSafely(
      alien.image,
      alien.x,
      alien.y,
      alien.width,
      alien.height,
      "#39ff14"
    );

    drawAlienHealth(
      alien
    );

    ctx.restore();
  }
}


function drawAlienHealth(
  alien
) {
  if (
    alien.maxHealth <= 1 ||
    alien.health ===
      alien.maxHealth
  ) {
    return;
  }

  const barWidth =
    alien.width;

  const barHeight =
    6;

  const healthRatio =
    alien.health /
    alien.maxHealth;

  ctx.fillStyle =
    "rgba(0, 0, 0, 0.8)";

  ctx.fillRect(
    alien.x,
    alien.y - 10,
    barWidth,
    barHeight
  );

  ctx.fillStyle =
    "#ffeb3b";

  ctx.fillRect(
    alien.x,
    alien.y - 10,
    barWidth *
      healthRatio,
    barHeight
  );
}


function drawBarriers() {
  for (
    const barrier of barriers
  ) {
    if (!barrier.alive) {
      continue;
    }

    const healthRatio =
      barrier.health /
      barrier.maxHealth;

    ctx.save();

    ctx.globalAlpha =
      0.3 +
      healthRatio *
        0.7;

    drawImageSafely(
      barrierImage,
      barrier.x,
      barrier.y,
      barrier.width,
      barrier.height,
      "#00d95f"
    );

    ctx.restore();

    ctx.fillStyle =
      "rgba(0, 0, 0, 0.7)";

    ctx.fillRect(
      barrier.x,
      barrier.y +
        barrier.height +
        7,
      barrier.width,
      6
    );

    ctx.fillStyle =
      "#26ff75";

    ctx.fillRect(
      barrier.x,
      barrier.y +
        barrier.height +
        7,
      barrier.width *
        healthRatio,
      6
    );
  }
}


function drawPlayer() {
  if (
    player.invulnerable
  ) {
    const visible =
      Math.floor(
        player.invulnerableTimer *
        10
      ) %
        2 ===
      0;

    if (!visible) {
      return;
    }
  }

  drawImageSafely(
    gunImage,
    player.x,
    player.y,
    player.width,
    player.height,
    "#ffffff"
  );
}


function drawPlayerBullets() {
  for (
    const bullet of playerBullets
  ) {
    ctx.fillStyle =
      "#fff700";

    ctx.shadowColor =
      "#fff700";

    ctx.shadowBlur = 14;

    ctx.fillRect(
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height
    );

    ctx.shadowBlur = 0;
  }
}


function drawEnemyBullets() {
  for (
    const bullet of enemyBullets
  ) {
    ctx.fillStyle =
      "#ff3030";

    ctx.shadowColor =
      "#ff3030";

    ctx.shadowBlur = 12;

    ctx.fillRect(
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height
    );

    ctx.shadowBlur = 0;
  }
}


function drawExplosions() {
  for (
    const explosion of explosions
  ) {
    const progress =
      explosion.life /
      explosion.maxLife;

    const radius =
      explosion.size *
      (
        1 -
        progress * 0.4
      );

    ctx.save();

    ctx.globalAlpha =
      progress;

    ctx.beginPath();

    ctx.arc(
      explosion.x,
      explosion.y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#ffea00";

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      explosion.x,
      explosion.y,
      radius * 0.55,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#ff4d00";

    ctx.fill();

    ctx.restore();
  }
}


function drawWaveNumber() {
  ctx.save();

  ctx.fillStyle =
    "rgba(255, 255, 255, 0.8)";

  ctx.font =
    "bold 23px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    `WAVE ${wave}`,
    GAME_WIDTH / 2,
    40
  );

  ctx.restore();
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
    image &&
    image.complete &&
    image.naturalWidth > 0
  ) {
    ctx.drawImage(
      image,
      x,
      y,
      width,
      height
    );

    return;
  }

  ctx.fillStyle =
    fallbackColour;

  ctx.fillRect(
    x,
    y,
    width,
    height
  );
}


/* =========================
   SCORE AND LIVES
========================= */

function updateScoreDisplay() {
  scoreDisplay.textContent =
    String(
      score
    );
}


function updateLivesDisplay() {
  livesDisplay.textContent =
    String(
      lives
    );
}


/* =========================
   AUDIO FUNCTIONS
========================= */

function startGameMusic() {
  deathMusic.pause();
  deathMusic.currentTime = 0;

  gameMusic.currentTime = 0;

  const playPromise =
    gameMusic.play();

  if (
    playPromise !== undefined
  ) {
    playPromise.catch(
      () => {
        // The browser may block audio
        // until another screen tap.
      }
    );
  }
}


function stopGameMusic() {
  gameMusic.pause();
  gameMusic.currentTime = 0;
}


function playDeathMusic() {
  deathMusic.currentTime = 0;

  const playPromise =
    deathMusic.play();

  if (
    playPromise !== undefined
  ) {
    playPromise.catch(
      () => {
        // Audio may be blocked by
        // the browser.
      }
    );
  }
}


function stopDeathMusic() {
  deathMusic.pause();
  deathMusic.currentTime = 0;
}


function stopAllAudio() {
  stopGameMusic();
  stopDeathMusic();
}


/* =========================
   PAUSE
========================= */

function pauseGame() {
  if (
    !gameRunning ||
    gameOver ||
    waveComplete
  ) {
    return;
  }

  gamePaused = true;

  clearControls();

  pausePanel.classList.remove(
    "hidden"
  );

  gameMusic.pause();
}


function resumeGame() {
  if (
    gameOver ||
    waveComplete
  ) {
    return;
  }

  gamePaused = false;

  pausePanel.classList.add(
    "hidden"
  );

  const playPromise =
    gameMusic.play();

  if (
    playPromise !== undefined
  ) {
    playPromise.catch(
      () => {}
    );
  }

  lastTime =
    performance.now();
}


/* =========================
   KEYBOARD CONTROLS
========================= */

document.addEventListener(
  "keydown",
  event => {
    const key =
      event.key.toLowerCase();

    if (
      key ===
        "arrowleft" ||
      key ===
        "a"
    ) {
      event.preventDefault();
      moveLeft = true;
    }

    if (
      key ===
        "arrowright" ||
      key ===
        "d"
    ) {
      event.preventDefault();
      moveRight = true;
    }

    if (
      event.code ===
      "Space"
    ) {
      event.preventDefault();

      if (!firing) {
        firing = true;
        firePlayerBullet();
        lastPlayerShot =
          performance.now();
      }
    }

    if (
      key ===
      "p"
    ) {
      if (gamePaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  }
);


document.addEventListener(
  "keyup",
  event => {
    const key =
      event.key.toLowerCase();

    if (
      key ===
        "arrowleft" ||
      key ===
        "a"
    ) {
      moveLeft = false;
    }

    if (
      key ===
        "arrowright" ||
      key ===
        "d"
    ) {
      moveRight = false;
    }

    if (
      event.code ===
      "Space"
    ) {
      firing = false;
    }
  }
);


/* =========================
   MOBILE BUTTON CONTROLS
========================= */

function beginLeftMovement(
  event
) {
  event.preventDefault();
  moveLeft = true;
}


function endLeftMovement(
  event
) {
  event.preventDefault();
  moveLeft = false;
}


function beginRightMovement(
  event
) {
  event.preventDefault();
  moveRight = true;
}


function endRightMovement(
  event
) {
  event.preventDefault();
  moveRight = false;
}


function beginFiring(
  event
) {
  event.preventDefault();

  if (!firing) {
    firing = true;
    firePlayerBullet();

    lastPlayerShot =
      performance.now();
  }
}


function endFiring(
  event
) {
  event.preventDefault();
  firing = false;
}


moveLeftButton.addEventListener(
  "pointerdown",
  beginLeftMovement
);

moveLeftButton.addEventListener(
  "pointerup",
  endLeftMovement
);

moveLeftButton.addEventListener(
  "pointercancel",
  endLeftMovement
);

moveLeftButton.addEventListener(
  "pointerleave",
  endLeftMovement
);


moveRightButton.addEventListener(
  "pointerdown",
  beginRightMovement
);

moveRightButton.addEventListener(
  "pointerup",
  endRightMovement
);

moveRightButton.addEventListener(
  "pointercancel",
  endRightMovement
);

moveRightButton.addEventListener(
  "pointerleave",
  endRightMovement
);


fireButton.addEventListener(
  "pointerdown",
  beginFiring
);

fireButton.addEventListener(
  "pointerup",
  endFiring
);

fireButton.addEventListener(
  "pointercancel",
  endFiring
);

fireButton.addEventListener(
  "pointerleave",
  endFiring
);


/* =========================
   DRAG PLAYER ON CANVAS
========================= */

function getCanvasPointerX(
  event
) {
  const rect =
    canvas.getBoundingClientRect();

  return (
    event.clientX -
    rect.left
  ) *
    (
      GAME_WIDTH /
      rect.width
    );
}


canvas.addEventListener(
  "pointerdown",
  event => {
    if (
      !gameRunning ||
      gamePaused ||
      gameOver ||
      waveComplete
    ) {
      return;
    }

    event.preventDefault();

    touchDragging = true;
    firing = true;

    canvas.setPointerCapture(
      event.pointerId
    );

    const pointerX =
      getCanvasPointerX(
        event
      );

    player.x =
      pointerX -
      player.width / 2;

    player.x =
      Math.max(
        0,
        Math.min(
          GAME_WIDTH -
          player.width,

          player.x
        )
      );

    firePlayerBullet();

    lastPlayerShot =
      performance.now();
  }
);


canvas.addEventListener(
  "pointermove",
  event => {
    if (!touchDragging) {
      return;
    }

    event.preventDefault();

    const pointerX =
      getCanvasPointerX(
        event
      );

    player.x =
      pointerX -
      player.width / 2;

    player.x =
      Math.max(
        0,
        Math.min(
          GAME_WIDTH -
          player.width,

          player.x
        )
      );
  }
);


function endCanvasTouch(
  event
) {
  event.preventDefault();

  touchDragging = false;
  firing = false;

  if (
    canvas.hasPointerCapture(
      event.pointerId
    )
  ) {
    canvas.releasePointerCapture(
      event.pointerId
    );
  }
}


canvas.addEventListener(
  "pointerup",
  endCanvasTouch
);

canvas.addEventListener(
  "pointercancel",
  endCanvasTouch
);


/* =========================
   BUTTON EVENTS
========================= */

startButton.addEventListener(
  "click",
  startGame
);

restartButton.addEventListener(
  "click",
  restartGame
);

nextWaveButton.addEventListener(
  "click",
  startNextWave
);

pauseButton.addEventListener(
  "click",
  pauseGame
);

resumeButton.addEventListener(
  "click",
  resumeGame
);

homeButton.addEventListener(
  "click",
  returnHome
);

gameOverHomeButton.addEventListener(
  "click",
  returnHome
);


/* =========================
   PAGE SAFETY
========================= */

function clearControls() {
  moveLeft = false;
  moveRight = false;
  firing = false;
  touchDragging = false;
}


window.addEventListener(
  "blur",
  () => {
    clearControls();

    if (
      gameRunning &&
      !gamePaused &&
      !gameOver &&
      !waveComplete
    ) {
      pauseGame();
    }
  }
);


document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.hidden &&
      gameRunning &&
      !gamePaused &&
      !gameOver &&
      !waveComplete
    ) {
      pauseGame();
    }
  }
);


/* =========================
   INITIAL PAGE
========================= */

resizeCanvas();
updateScoreDisplay();
updateLivesDisplay();
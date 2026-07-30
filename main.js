"use strict";

// used by the castle icon in the nav to fully reset both games (set inside
// initGame/initFortGame below)
let resetQuizFn = null;
let resetFortFn = null;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// sound effects - reused Audio objects instead of making a new one each play
const pageTransitionSound = new Audio("Audio/Walk-On-Stone.mp3");

// background music, loops forever. can't autoplay until the user clicks
// something first, so it actually starts inside the portcullis intro below
const backgroundMusic = new Audio("Audio/Medieval-Castle.mp3");
backgroundMusic.loop = true;
backgroundMusic.volume = 0.32;
let backgroundMusicStarted = false;

function startBackgroundMusic() {
  if (backgroundMusicStarted) return;
  backgroundMusicStarted = true;
  backgroundMusic.play().catch(function () {
    backgroundMusicStarted = false; // retry next interaction if blocked
  });
}
const gateOpeningSound = new Audio("Audio/Gate-Opening.mp3");
const swordClashSound = new Audio("Audio/Sword-Clash.mp3");
const arrowSound = new Audio("Audio/Arrow.mp3");
const ramSlamSound = new Audio("Audio/Battering-Ram_Slam.mp3");
const lancerSound = new Audio("Audio/Lancer.mp3");
const soldierCrySound = new Audio("Audio/Soldier-Cry.mp3");
const logRollSound = new Audio("Audio/Log.mp3");
// heavy units get their own clanking sound each (made in spawnEnemy) since
// more than one heavy can be walking at once

function playSound(audioEl) {
  if (prefersReducedMotion()) return;
  try {
    audioEl.currentTime = 0; // restart if spammed
    audioEl.play().catch(function () {}); // ignore autoplay block
  } catch (err) {
    // ignore
  }
}

// ============================================
// PAGE MANAGEMENT SYSTEM
// (same pattern as Prac08: hideall() + show())
// ============================================

const homebtn = document.querySelector("#homebtn"); // nav logo icon
const navhomebtn = document.querySelector("#navhomebtn"); // "Home" link in menu
const herobtn = document.querySelector("#herobtn"); // "Enter the castle" button
const anatomybtn = document.querySelector("#anatomybtn");
const defensesbtn = document.querySelector("#defensesbtn");
const evolutionbtn = document.querySelector("#evolutionbtn");
const gamebtn = document.querySelector("#gamebtn");

const navButtons = document.querySelectorAll("#primary-menu button");
var allpages = document.querySelectorAll(".page");

// tracks if the gate intro already played + which page we're on, so the
// quick page-wipe only plays on real navigation, not during the intro
let introComplete = false;
let currentPageId = null;

function hideall() {
  for (let onepage of allpages) {
    onepage.style.display = "none";
  }
}

function show(pageId) {
  hideall();
  let onepage = document.querySelector("#" + pageId);
  onepage.style.display = (pageId === "home") ? "flex" : "block"; // home needs flex to center

  playSound(pageTransitionSound);

  // quick portcullis wipe when switching pages (not during the first intro)
  if (introComplete && pageId !== currentPageId) {
    const overlay = document.getElementById("portcullis-overlay");
    if (overlay) {
      overlay.classList.remove("quick-wipe");
      void overlay.offsetWidth; // force reflow so it can replay
      overlay.classList.add("quick-wipe");
      setTimeout(function () {
        overlay.classList.remove("quick-wipe");
      }, 450);
    }
  }
  currentPageId = pageId;

  // highlight the active nav button
  navButtons.forEach(function (btn) {
    btn.removeAttribute("aria-current");
  });
  const activeBtnId = pageId === "home" ? "navhomebtn" : pageId + "btn";
  const activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) activeBtn.setAttribute("aria-current", "page");

  setMenuState(false); // close mobile menu after navigating
  window.scrollTo(0, 0);
}

homebtn.addEventListener("click", function () {
  show("home");
  // castle icon = full reset, not just navigation: resets both games and
  // replays the gate intro from scratch
  if (typeof resetQuizFn === "function") resetQuizFn();
  if (typeof resetFortFn === "function") resetFortFn();

  const overlay = document.getElementById("portcullis-overlay");
  const homeSection = document.getElementById("home");
  const prompt = document.getElementById("interact-prompt");
  if (overlay && homeSection && prompt) {
    homeSection.classList.remove("visible");
    overlay.classList.remove("lift");
    prompt.classList.remove("hide");
    prompt.disabled = false;
    overlay.style.pointerEvents = "auto";
    overlay.setAttribute("aria-hidden", "false");
    introComplete = false;
    void overlay.offsetWidth;
    initPortcullisIntro(); // re-callable since handlers use onclick, not addEventListener
  }
});
navhomebtn.addEventListener("click", function () { show("home"); });
herobtn.addEventListener("click", function () { show("anatomy"); });
anatomybtn.addEventListener("click", function () { show("anatomy"); });
defensesbtn.addEventListener("click", function () { show("defenses"); });
evolutionbtn.addEventListener("click", function () { show("evolution"); });
gamebtn.addEventListener("click", function () { show("game"); });


// ============================================
// CASTLE GATE INTRO
// ============================================
// closed gate + "Interact to Start" -> click/Enter/Space -> creak, lift,
// home fades in. Only plays fully on first load; nav just does a quick
// wipe after that (see show() above).

function initPortcullisIntro() {
  const overlay = document.getElementById("portcullis-overlay");
  const homeSection = document.getElementById("home");
  const prompt = document.getElementById("interact-prompt");

  if (!overlay || !homeSection || !prompt) return;

  let isRunning = false;

  function completeIntro() {
    introComplete = true;
    homeSection.classList.add("visible");
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    prompt.disabled = true;

    const homeTitle = document.getElementById("home-title");
    if (homeTitle && typeof homeTitle.focus === "function") {
      homeTitle.focus({ preventScroll: true });
    }
  }

  function startSequence() {
    if (isRunning) return;
    isRunning = true;
    prompt.classList.add("hide");
    prompt.disabled = true;

    startBackgroundMusic(); // first guaranteed user gesture on the whole site
    playSound(gateOpeningSound); // ~2.7s clip — lift below is timed to match it

    if (prefersReducedMotion()) {
      overlay.classList.add("lift");
      completeIntro();
      return;
    }

    overlay.classList.add("lift"); // starts immediately, no jitter stage anymore

    // fires slightly before the gate's own opacity fade finishes (2.7s), so
    // Home's 1s fade-in overlaps the gate's exit instead of leaving a blank
    // gap between "gate's gone" and "Home has started appearing"
    setTimeout(completeIntro, 2000);
  }

  overlay.setAttribute("aria-hidden", "false");
  overlay.onkeydown = function (event) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    if (typeof prompt.focus === "function") prompt.focus();
  };
  prompt.onclick = startSequence;
  prompt.onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startSequence();
    }
  };

  if (typeof prompt.focus === "function") {
    prompt.focus({ preventScroll: true });
  }
}


// ============================================
// JS-DRIVEN POSITION ANIMATION
// ============================================
// moves the arrow icon every frame from JS (not a CSS transition/keyframe)

function initHeroArrowDrift() {
  const arrow = document.getElementById("hero-arrow");
  if (!arrow || prefersReducedMotion()) return;

  function frame(timestamp) {
    // gentle side-to-side drift, a few pixels either way
    const offsetPx = Math.sin(timestamp / 500) * 4;
    arrow.style.left = offsetPx.toFixed(2) + "px";
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}


// ============================================
// HAMBURGER MENU (mobile nav)
// ============================================

const hamBtn = document.querySelector("#hamIcon");
const menuItemsList = document.querySelector("#primary-menu");

function setMenuState(isOpen) {
  menuItemsList.classList.toggle("menuShow", isOpen);
  hamBtn.classList.toggle("is-open", isOpen);
  hamBtn.setAttribute("aria-expanded", String(isOpen));
  hamBtn.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  document.body.classList.toggle("menu-open", isOpen);
}

hamBtn.addEventListener("click", function () {
  const isOpen = hamBtn.getAttribute("aria-expanded") !== "true";
  setMenuState(isOpen);
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  if (hamBtn.getAttribute("aria-expanded") !== "true") return;
  setMenuState(false);
  hamBtn.focus();
});

const siteNav = hamBtn.closest("nav");
document.addEventListener("click", function (event) {
  if (hamBtn.getAttribute("aria-expanded") === "true" && !siteNav.contains(event.target)) {
    setMenuState(false);
  }
});

window.addEventListener("resize", function () {
  if (window.innerWidth > 1050) setMenuState(false);
});


// ============================================
// BACK TO TOP BUTTON
// ============================================

function initBackToTop() {
  const topButton = document.getElementById("topBtn");
  if (!topButton) return;

  function updateVisibility() {
    topButton.hidden = window.scrollY <= window.innerHeight;
  }

  topButton.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
}


// ============================================
// AUDIO FEEDBACK
// ============================================
// Short tones generated with the Web Audio API — no external sound file
// needed. A rising two-note chime for correct answers, a low buzz for wrong.

function playTone(frequencies, durationMs) {
  if (prefersReducedMotion()) return; // treat as a "reduce extra stimulus" signal too
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const noteDuration = durationMs / 1000 / frequencies.length;

    frequencies.forEach(function (freq, index) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      const startTime = ctx.currentTime + index * noteDuration;
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);
      oscillator.connect(gainNode).connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    });
  } catch (err) {
    // Web Audio unsupported or blocked — fail silently, audio is a nice-to-have
  }
}

function playCorrectSound() {
  playTone([523.25, 783.99], 260); // C5 -> G5 chime
}

function playIncorrectSound() {
  playTone([160], 260); // low buzz
}


// ============================================
// SIEGE DEFENSE MINI-GAME
// ============================================

function initGame() {
  const quizForm = document.getElementById("quiz-form");
  const scorebox = document.getElementById("scorebox");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnReset = document.getElementById("btnReset");

  if (!quizForm || !scorebox || !btnReset) return;

  // answer key - checked against what FormData reads from the form
  const corrAnsArray = {
    q1: "b", q2: "b", q3: "b", q4: "b", q5: "b", q6: "b", q7: "c", q8: "a",
  };

  const questionIds = Object.keys(corrAnsArray);

  // event delegation: one change listener on the form instead of one per radio
  quizForm.addEventListener("change", function (event) {
    if (event.target.type !== "radio") return;
    const fieldset = event.target.closest(".quiz-question");
    if (!fieldset) return;
    fieldset.querySelectorAll("label").forEach(function (label) {
      label.classList.remove("selected");
    });
    const chosenLabel = event.target.closest("label");
    if (chosenLabel) chosenLabel.classList.add("selected");
  });

  quizForm.addEventListener("submit", function (event) {
    event.preventDefault(); // single page app, don't actually submit

    // FormData grabs the name + every answer at once
    const formData = new FormData(quizForm);
    const playerName = (formData.get("playerName") || "").toString().trim();

    let score = 0;

    questionIds.forEach(function (qid) {
      const fieldset = quizForm.querySelector('.quiz-question[data-qid="' + qid + '"]');
      if (!fieldset) return;

      fieldset.classList.remove("correct", "incorrect");

      const givenAnswer = formData.get(qid);
      const isCorrect = givenAnswer === corrAnsArray[qid];

      if (isCorrect) score++;
      fieldset.classList.add(isCorrect ? "correct" : "incorrect"); // green/red feedback
    });

    const total = questionIds.length;
    const greeting = playerName ? playerName + ", your score" : "Score";
    scorebox.textContent = greeting + ": " + score + " / " + total;

    if (score >= total / 2) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    // swap to the retake button instead of needing a refresh
    btnSubmit.hidden = true;
    btnReset.hidden = false;

    scorebox.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  });

  function resetQuiz(scrollTo) {
    quizForm.reset();
    quizForm.querySelectorAll(".quiz-question").forEach(function (fieldset) {
      fieldset.classList.remove("correct", "incorrect");
    });
    quizForm.querySelectorAll("label.selected").forEach(function (label) {
      label.classList.remove("selected");
    });
    scorebox.textContent = "Not submitted";
    btnReset.hidden = true;
    btnSubmit.hidden = false;
    if (scrollTo) {
      quizForm.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }

  btnReset.addEventListener("click", function () { resetQuiz(true); });
  resetQuizFn = function () { resetQuiz(false); };
}


// ============================================
// PROTECT THE FORT — real-time defense mini-game
// ============================================

function initFortGame() {
  const startForm = document.getElementById("fort-start-form");
  const gameSection = document.getElementById("fort-game");
  const arena = document.getElementById("game-arena");
  const fortIcon = arena ? arena.querySelector(".fort-icon") : null;
  const playerIcon = document.getElementById("player-icon");
  const hpFill = document.getElementById("fort-hp-fill");
  const hpText = document.getElementById("fort-hp-text");
  const scoreEl = document.getElementById("fort-score");
  const messageEl = document.getElementById("fort-message");
  const btnShoot = document.getElementById("btnShoot");
  const btnVolley = document.getElementById("btnVolley");
  const btnBrace = document.getElementById("btnBrace");
  const btnLog = document.getElementById("btnLog");
  const btnRestart = document.getElementById("btnFortRestart");

  if (!startForm || !gameSection || !arena) return;

  const MAX_HP = 100;
  const CENTER = 50; // fort/player sit at (50%, 50%) — the middle of the arena
  const SHOOT_COOLDOWN_MS = 600;
  const VOLLEY_COOLDOWN_MS = 6000;
  const LOG_COOLDOWN_MS = 9500;
  const LOG_HIT_RADIUS = 9; // wider than a normal arrow, since it rolls through multiple enemies
  const LOG_KNOCKBACK = 14; // % of arena radius the log pushes hit enemies back by
  const HIT_THRESHOLD = 5; // % distance counted as a projectile "hitting" something
  const SPAWN_RADIUS_X = 46;
  const SPAWN_RADIUS_Y = 44;
  const BOSS_ANGLE_DEG = 90; // fixed "front gate" direction (straight down), only the boss always uses this
  const BOW_ROTATION_OFFSET = 45; // calibrates the bow image's natural diagonal rest orientation to the computed aim angle
  const BLOCK_DAMAGE_REDUCTION = 0.6; // bracing cuts incoming damage by 60%

  // base stats before a wave's speed/damage multipliers (and the chosen
  // difficulty's own multipliers) are applied
  const BASE_STATS = {
    soldier: { hp: 1, speed: 0.5, stopAtRadius: 9, attackEvery: 1400, damage: 8, sound: soldierCrySound, spriteClass: "photo-icon icon-photo-soldier" },
    archer: { hp: 1, speed: 0.42, stopAtRadius: 30, attackEvery: 1800, damage: 5, sound: arrowSound, spriteClass: "photo-icon icon-photo-archer", ranged: true },
    lancer: { hp: 1, speed: 0.85, stopAtRadius: 9, attackEvery: 1600, damage: 14, sound: lancerSound, spriteClass: "photo-icon icon-photo-lancer" },
    heavy: { hp: 3, speed: 0.28, stopAtRadius: 9, attackEvery: 1900, damage: 12, sound: swordClashSound, spriteClass: "photo-icon icon-photo-heavy", loopSoundSrc: "Audio/Armor-Clanking.mp3" },
    boss: { hp: 4, speed: 0.2, stopAtRadius: 11, attackEvery: 2600, damage: 20, sound: ramSlamSound, spriteClass: "photo-icon icon-photo-boss" },
  };

  // Each wave ramps difficulty up: more enemies, faster spawns, tougher
  // stats, and a mix that leans harder into lancers/heavies later on.
  const WAVES = [
    { totalEnemies: 6, spawnMs: 2200, bossCount: 0, mix: { soldier: 0.6, archer: 0.25, lancer: 0.1, heavy: 0.05 }, speedMult: 1.0, dmgMult: 1.0 },
    { totalEnemies: 9, spawnMs: 1800, bossCount: 1, mix: { soldier: 0.45, archer: 0.25, lancer: 0.15, heavy: 0.15 }, speedMult: 1.15, dmgMult: 1.1 },
    { totalEnemies: 12, spawnMs: 1500, bossCount: 1, mix: { soldier: 0.35, archer: 0.25, lancer: 0.2, heavy: 0.2 }, speedMult: 1.3, dmgMult: 1.2 },
    { totalEnemies: 16, spawnMs: 1200, bossCount: 2, mix: { soldier: 0.3, archer: 0.2, lancer: 0.25, heavy: 0.25 }, speedMult: 1.5, dmgMult: 1.35 },
  ];

  // Player-chosen difficulty scales on top of the wave's own ramp above.
  const DIFFICULTY = {
    easy: { enemyCountMult: 0.7, spawnMsMult: 1.3, speedMult: 0.85, dmgMult: 0.8 },
    normal: { enemyCountMult: 1.0, spawnMsMult: 1.0, speedMult: 1.0, dmgMult: 1.0 },
    hard: { enemyCountMult: 1.3, spawnMsMult: 0.75, speedMult: 1.2, dmgMult: 1.25 },
  };

  let fortHp, score, running, enemies, projectiles, nextId;
  let tickInterval, spawnInterval, waveTransitionTimeout;
  let shootReady, volleyReady, logReady;
  let playerName = "";
  let difficulty = "normal";
  let isBlocking = false;
  let waveNumber, waveQueue, waveActive;

  function setBlocking(state) {
    isBlocking = state;
    if (fortIcon) fortIcon.classList.toggle("blocking", state);
    btnBrace.classList.toggle("is-active", state);
  }

  function resetState() {
    fortHp = MAX_HP;
    score = 0;
    running = false;
    enemies = [];
    projectiles = [];
    nextId = 1;
    shootReady = true;
    volleyReady = true;
    logReady = true;
    waveNumber = 0;
    waveQueue = [];
    waveActive = false;
    setBlocking(false);
    arena.querySelectorAll(".enemy, .projectile").forEach(function (el) { el.remove(); });
    updateHud();
    messageEl.textContent = "";
    btnRestart.hidden = true;
    btnShoot.disabled = false;
    btnVolley.disabled = false;
    btnLog.disabled = false;
    btnShoot.textContent = "Shoot Arrow";
    btnVolley.textContent = "Arrow Volley (3x)";
    btnLog.textContent = "Log Roll";
  }

  function updateHud() {
    const pct = Math.max(0, (fortHp / MAX_HP) * 100);
    hpFill.style.width = pct + "%"; // UPDATE CSS PROPERTIES USING JS
    hpFill.style.backgroundColor = pct < 30 ? "#c9605f" : "";
    hpText.textContent = fortHp + " / " + MAX_HP; // UPDATE CONTENT USING JS
    scoreEl.textContent = "Score: " + score + " — Wave " + (waveNumber || 1) + " / " + WAVES.length;
  }

  function flashFort() {
    if (!fortIcon) return;
    fortIcon.classList.remove("hit-flash");
    void fortIcon.offsetWidth;
    fortIcon.classList.add("hit-flash");
  }

  function damageFort(amount, sound) {
    const actualAmount = isBlocking ? Math.round(amount * (1 - BLOCK_DAMAGE_REDUCTION)) : amount;
    fortHp = Math.max(0, fortHp - actualAmount);
    playSound(sound);
    flashFort();
    updateHud();
    if (fortHp <= 0 && running) endGame();
  }

  // builds the shuffled list of enemy types to spawn for a given wave, with
  // its boss(es) guaranteed to be in the mix somewhere
  function pickWeightedType(mix) {
    const roll = Math.random();
    let cumulative = 0;
    const entries = Object.entries(mix);
    for (let i = 0; i < entries.length; i++) {
      cumulative += entries[i][1];
      if (roll <= cumulative) return entries[i][0];
    }
    return entries[entries.length - 1][0]; // fallback for floating-point edge cases
  }

  function buildWaveQueue(waveConfig) {
    const diff = DIFFICULTY[difficulty];
    const totalEnemies = Math.max(1, Math.round(waveConfig.totalEnemies * diff.enemyCountMult));
    const queue = [];
    for (let i = 0; i < waveConfig.bossCount; i++) queue.push("boss");
    const remaining = totalEnemies - waveConfig.bossCount;
    for (let i = 0; i < remaining; i++) {
      queue.push(pickWeightedType(waveConfig.mix));
    }
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    return queue;
  }

  function spawnEnemy() {
    if (!running || waveQueue.length === 0) return;
    const type = waveQueue.pop();
    const waveConfig = WAVES[waveNumber - 1];
    const base = BASE_STATS[type];

    // the battering ram always comes from the fixed "gate" direction;
    // every other enemy can spawn from anywhere around the fort
    const angleDeg = type === "boss" ? BOSS_ANGLE_DEG : Math.random() * 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    const startX = CENTER + SPAWN_RADIUS_X * Math.cos(angleRad);
    const startY = CENTER + SPAWN_RADIUS_Y * Math.sin(angleRad);

    const el = document.createElement("div");
    el.className = "enemy";
    el.dataset.id = String(nextId++);
    el.style.left = startX + "%";
    el.style.top = startY + "%";

    const sprite = document.createElement("div");
    sprite.className = base.spriteClass;
    el.appendChild(sprite);

    const hpBar = document.createElement("div");
    hpBar.className = "enemy-hp";
    const hpBarFill = document.createElement("div");
    hpBarFill.className = "enemy-hp-fill";
    hpBar.appendChild(hpBarFill);
    el.appendChild(hpBar);

    arena.appendChild(el);

    enemies.push({
      id: el.dataset.id,
      type: type,
      el: el,
      hpFillEl: hpBarFill,
      hp: base.hp,
      maxHp: base.hp,
      x: startX,
      y: startY,
      speed: base.speed * waveConfig.speedMult * DIFFICULTY[difficulty].speedMult,
      damage: Math.round(base.damage * waveConfig.dmgMult * DIFFICULTY[difficulty].dmgMult),
      stopAtRadius: base.stopAtRadius,
      attackEvery: base.attackEvery,
      ranged: !!base.ranged,
      sound: base.sound,
      lastAttack: 0,
      loopSound: null,
      approaching: true,
    });

    // heavy units get their own sound loop while walking (in case more
    // than one heavy is on screen at once)
    if (base.loopSoundSrc && !prefersReducedMotion()) {
      const loopAudio = new Audio(base.loopSoundSrc);
      loopAudio.loop = true;
      loopAudio.volume = 0.6;
      loopAudio.play().catch(function () {});
      enemies[enemies.length - 1].loopSound = loopAudio;
    }
  }

  // angle: 0 = right, 90 = down (y increases downward), matches both
  // atan2 and CSS rotate() so movement and image rotation use one number
  function fireProjectile(fromX, fromY, toX, toY, enemyShot) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    const el = document.createElement("div");
    el.className = "projectile" + (enemyShot ? " enemy-shot" : "");
    el.style.left = fromX + "%";
    el.style.top = fromY + "%";
    // Arrow.png points left by default (180°); rotate so it faces angleDeg
    el.style.transform = "translate(-50%, -50%) rotate(" + (angleDeg - 180) + "deg)";
    arena.appendChild(el);

    projectiles.push({
      el: el,
      x: fromX,
      y: fromY,
      dx: dx / dist,
      dy: dy / dist,
      speed: enemyShot ? 1.7 : 3.6,
      enemyShot: !!enemyShot,
    });
  }

  function killEnemy(enemy) {
    if (enemy.loopSound) {
      enemy.loopSound.pause();
      enemy.loopSound.currentTime = 0;
    }
    enemy.el.remove();
    enemies = enemies.filter(function (e) { return e.id !== enemy.id; });
    score++;
    playCorrectSound();
    updateHud();
  }

  function findNearestEnemy() {
    let nearest = null;
    let nearestDist = Infinity;
    enemies.forEach(function (e) {
      const d = Math.hypot(e.x - CENTER, e.y - CENTER);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    });
    return nearest;
  }

  // free aim, desktop only - "pointer: fine" means mouse/trackpad, false on touch
  const isDesktopPointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
  let mouseAimX = null;
  let mouseAimY = null;

  if (isDesktopPointer) {
    arena.addEventListener("mousemove", function (event) {
      const rect = arena.getBoundingClientRect();
      mouseAimX = ((event.clientX - rect.left) / rect.width) * 100;
      mouseAimY = ((event.clientY - rect.top) / rect.height) * 100;
      if (playerIcon) {
        const angleDeg = (Math.atan2(mouseAimY - CENTER, mouseAimX - CENTER) * 180) / Math.PI;
        playerIcon.style.transform = "translate(-50%, -50%) rotate(" + (angleDeg + BOW_ROTATION_OFFSET) + "deg)";
      }
    });
    arena.addEventListener("mouseleave", function () {
      mouseAimX = null;
      mouseAimY = null;
    });
  }

  // untargeted shots: aim at the cursor on desktop, else nearest enemy
  function getAimPoint() {
    if (isDesktopPointer && mouseAimX !== null && mouseAimY !== null) {
      return { x: mouseAimX, y: mouseAimY };
    }
    const nearest = findNearestEnemy();
    return nearest ? { x: nearest.x, y: nearest.y } : null;
  }

  function tick() {
    if (!running) return;

    // move + act on each enemy — full 2D movement toward the fort at centre
    enemies.forEach(function (enemy) {
      const now = Date.now();
      const dx = CENTER - enemy.x;
      const dy = CENTER - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > enemy.stopAtRadius) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
        enemy.el.style.left = enemy.x + "%"; // JS-DRIVEN CSS POSITION ANIMATION
        enemy.el.style.top = enemy.y + "%"; // JS-DRIVEN CSS POSITION ANIMATION
        return;
      }

      if (enemy.approaching) {
        enemy.approaching = false;
        if (enemy.loopSound) enemy.loopSound.pause(); // stop clanking once it's in position to attack
      }

      if (now - enemy.lastAttack >= enemy.attackEvery) {
        enemy.lastAttack = now;
        if (enemy.ranged) {
          playSound(arrowSound);
          fireProjectile(enemy.x, enemy.y, CENTER, CENTER, true); // fired FROM the archer TOWARD the fort
        } else {
          damageFort(enemy.damage, enemy.sound);
        }
      }
    });

    // move projectiles + check collisions
    projectiles.forEach(function (p) {
      p.x += p.dx * p.speed;
      p.y += p.dy * p.speed;
      p.el.style.left = p.x + "%"; // JS-DRIVEN CSS POSITION ANIMATION
      p.el.style.top = p.y + "%"; // JS-DRIVEN CSS POSITION ANIMATION

      const distFromCenter = Math.hypot(p.x - CENTER, p.y - CENTER);

      if (p.enemyShot) {
        if (distFromCenter <= 6) {
          damageFort(BASE_STATS.archer.damage, arrowSound);
          p.dead = true;
        } else if (distFromCenter > 65) {
          p.dead = true;
        }
      } else if (p.isLog) {
        // rolls THROUGH enemies rather than stopping at the first one —
        // damages and knocks back every enemy it passes, once each
        enemies.forEach(function (enemy) {
          if (p.hitIds.has(enemy.id)) return;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) > LOG_HIT_RADIUS) return;

          p.hitIds.add(enemy.id);
          enemy.hp--;
          enemy.hpFillEl.style.width = Math.max(0, (enemy.hp / enemy.maxHp) * 100) + "%";

          // knock the enemy further from the fort along its own outward path
          const enemyDist = Math.hypot(enemy.x - CENTER, enemy.y - CENTER) || 1;
          enemy.x += ((enemy.x - CENTER) / enemyDist) * LOG_KNOCKBACK;
          enemy.y += ((enemy.y - CENTER) / enemyDist) * LOG_KNOCKBACK;
          enemy.el.style.left = enemy.x + "%";
          enemy.el.style.top = enemy.y + "%";
          enemy.lastAttack = Date.now(); // pushed back, so it can't attack again instantly

          if (enemy.hp <= 0) killEnemy(enemy);
        });
        if (distFromCenter > 70) p.dead = true;
      } else {
        const hit = enemies.find(function (e) {
          return !e.dead && Math.hypot(e.x - p.x, e.y - p.y) <= HIT_THRESHOLD;
        });
        if (hit) {
          hit.hp--;
          hit.hpFillEl.style.width = Math.max(0, (hit.hp / hit.maxHp) * 100) + "%";
          p.dead = true;
          if (hit.hp <= 0) killEnemy(hit);
        } else if (distFromCenter > 65) {
          p.dead = true;
        }
      }
    });

    projectiles.forEach(function (p) {
      if (p.dead) p.el.remove();
    });
    projectiles = projectiles.filter(function (p) { return !p.dead; });

    // wave complete? move to the next one (or win) once nothing is left
    // spawning or alive
    if (waveActive && waveQueue.length === 0 && enemies.length === 0) {
      advanceWave();
    }
  }

  function startCooldown(button, ms, setReady, resetLabel) {
    button.disabled = true;
    setReady(false);
    setTimeout(function () {
      button.disabled = false;
      setReady(true);
      button.textContent = resetLabel;
    }, ms);
  }

  function playerShoot(targetEnemy) {
    if (!running || !shootReady || isBlocking) return;
    const target = targetEnemy || getAimPoint();
    if (!target) return;
    playSound(arrowSound);
    fireProjectile(CENTER, CENTER, target.x, target.y, false);
    startCooldown(btnShoot, SHOOT_COOLDOWN_MS, function (v) { shootReady = v; }, "Shoot Arrow");
  }

  // rotates an aim point around the fort's centre by a small angle, so the
  // volley's 3 arrows fan out slightly instead of all converging on one spot
  function computeSpreadTarget(baseX, baseY, spreadDeg) {
    const dx = baseX - CENTER;
    const dy = baseY - CENTER;
    const dist = Math.hypot(dx, dy) || 1;
    const baseAngle = Math.atan2(dy, dx);
    const newAngle = baseAngle + (spreadDeg * Math.PI) / 180;
    return {
      x: CENTER + Math.cos(newAngle) * dist,
      y: CENTER + Math.sin(newAngle) * dist,
    };
  }

  function fireSpreadBurst() {
    const aim = getAimPoint();
    if (!aim) return;
    [-9, 0, 9].forEach(function (spreadDeg) {
      const t = computeSpreadTarget(aim.x, aim.y, spreadDeg);
      playSound(arrowSound);
      fireProjectile(CENTER, CENTER, t.x, t.y, false);
    });
  }

  function playerVolley() {
    if (!running || !volleyReady || isBlocking) return;
    fireSpreadBurst(); // first burst of 3, slightly fanned out
    setTimeout(function () {
      if (running && !isBlocking) fireSpreadBurst(); // second burst
    }, 450);
    startCooldown(btnVolley, VOLLEY_COOLDOWN_MS, function (v) { volleyReady = v; }, "Arrow Volley (3x)");
  }

  // Clash Royale "The Log" style: rolls toward the nearest enemy and hits
  // everything along the way instead of stopping at the first target
  function fireLog() {
    if (!running || !logReady || isBlocking) return;
    const target = findNearestEnemy();
    const targetX = target ? target.x : CENTER + SPAWN_RADIUS_X; // default direction if nothing's out there
    const targetY = target ? target.y : CENTER;

    const dx = targetX - CENTER;
    const dy = targetY - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    const el = document.createElement("div");
    el.className = "projectile log-roll";
    el.style.left = CENTER + "%";
    el.style.top = CENTER + "%";
    el.style.transform = "translate(-50%, -50%) rotate(" + (angleDeg - 180) + "deg)";
    const spinner = document.createElement("div");
    spinner.className = "log-spin";
    el.appendChild(spinner);
    arena.appendChild(el);

    playSound(logRollSound);
    projectiles.push({
      el: el,
      x: CENTER,
      y: CENTER,
      dx: dx / dist,
      dy: dy / dist,
      speed: 2.6,
      isLog: true,
      hitIds: new Set(),
    });

    startCooldown(btnLog, LOG_COOLDOWN_MS, function (v) { logReady = v; }, "Log Roll");
  }

  function startWave(number) {
    waveNumber = number;
    waveQueue = buildWaveQueue(WAVES[number - 1]);
    waveActive = true;
    updateHud();
    messageEl.textContent = "Wave " + number + " incoming!";
    clearInterval(spawnInterval);
    const spawnMs = WAVES[number - 1].spawnMs * DIFFICULTY[difficulty].spawnMsMult;
    spawnInterval = setInterval(spawnEnemy, spawnMs); // USE OF TIMED EVENTS
  }

  function advanceWave() {
    waveActive = false;
    clearInterval(spawnInterval);

    if (waveNumber >= WAVES.length) {
      winGame();
      return;
    }

    messageEl.textContent = "Wave " + waveNumber + " cleared! Next wave incoming...";
    waveTransitionTimeout = setTimeout(function () {
      if (running) startWave(waveNumber + 1);
    }, 2500);
  }

  function winGame() {
    running = false;
    clearInterval(tickInterval);
    clearInterval(spawnInterval);
    btnShoot.disabled = true;
    btnVolley.disabled = true;
    playCorrectSound();
    const who = playerName ? playerName + ", you" : "You";
    messageEl.textContent = who + " defended the fort through all " + WAVES.length + " waves! Final score: " + score;
    btnRestart.hidden = false;
  }

  function endGame() {
    running = false;
    clearInterval(tickInterval);
    clearInterval(spawnInterval);
    clearTimeout(waveTransitionTimeout);
    btnShoot.disabled = true;
    btnVolley.disabled = true;
    playIncorrectSound();
    const who = playerName ? playerName + ", your" : "Your";
    messageEl.textContent = who + " fort has fallen on wave " + waveNumber + "! Final score: " + score;
    btnRestart.hidden = false;
  }

  function startGame() {
    resetState();
    running = true;
    tickInterval = setInterval(tick, 50); // USE OF TIMED EVENTS
    startWave(1);
  }

  // FormData grabs the name + difficulty in one go, same as the quiz
  startForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(startForm);
    playerName = (formData.get("playerName") || "").toString().trim();
    difficulty = (formData.get("difficulty") || "normal").toString();
    if (!DIFFICULTY[difficulty]) difficulty = "normal";
    startForm.hidden = true;
    gameSection.hidden = false;
    startGame();
  });

  btnShoot.addEventListener("click", function () { playerShoot(null); });
  btnVolley.addEventListener("click", playerVolley);
  btnLog.addEventListener("click", fireLog);

  // brace/block: hold to reduce damage, works on mouse, touch, and keyboard
  btnBrace.addEventListener("mousedown", function () { setBlocking(true); });
  btnBrace.addEventListener("touchstart", function (e) { e.preventDefault(); setBlocking(true); }, { passive: false });
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(function (evt) {
    btnBrace.addEventListener(evt, function () { setBlocking(false); });
  });

  document.addEventListener("keydown", function (event) {
    if (!running) return;
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (typing) return;

    if (event.key === "Shift" && !isBlocking) {
      setBlocking(true);
    } else if (event.code === "Space") {
      event.preventDefault();
      playerShoot(null);
    } else if (event.key === "v" || event.key === "V") {
      playerVolley();
    } else if (event.key === "c" || event.key === "C") {
      fireLog();
    }
  });

  document.addEventListener("keyup", function (event) {
    if (event.key === "Shift") setBlocking(false);
  });

  // event delegation: one listener on the arena, not one per enemy.
  // tapping an enemy targets it, tapping empty space aims at nearest
  arena.addEventListener("click", function (event) {
    const enemyEl = event.target.closest(".enemy");
    if (enemyEl) {
      const targetEnemy = enemies.find(function (e) { return e.id === enemyEl.dataset.id; });
      playerShoot(targetEnemy);
    } else {
      playerShoot(null);
    }
  });

  btnRestart.addEventListener("click", startGame); // reset without refresh

  // castle icon reset: stop the run entirely and go back to the start screen
  resetFortFn = function () {
    clearInterval(tickInterval);
    clearInterval(spawnInterval);
    clearTimeout(waveTransitionTimeout);
    running = false;
    resetState();
    gameSection.hidden = true;
    startForm.hidden = false;
    startForm.reset();
  };
}

// ============================================
// FULLSCREEN TOGGLE (cross-browser)
// ============================================

function enterFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if (document.documentElement.mozRequestFullScreen) { // Firefox
    document.documentElement.mozRequestFullScreen();
  } else if (document.documentElement.webkitRequestFullscreen) { // Chrome/Safari/Opera
    document.documentElement.webkitRequestFullscreen();
  } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
    document.documentElement.msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

function initFullscreenToggle() {
  const btnFullscreen = document.getElementById("btnFullscreen");
  if (!btnFullscreen) return;

  btnFullscreen.addEventListener("click", function () {
    const isFullscreen =
      document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    if (!isFullscreen) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  });
}

function initMusicMuteToggle() {
  const btnMute = document.getElementById("btnMuteMusic");
  if (!btnMute) return;

  btnMute.addEventListener("click", function () {
    backgroundMusic.muted = !backgroundMusic.muted;
    btnMute.querySelector("span").textContent = backgroundMusic.muted ? "🔇" : "🔊";
    btnMute.title = backgroundMusic.muted ? "Unmute background music" : "Mute background music";
  });
}

// ============================================
// RUN EVERYTHING
// ============================================

setMenuState(false);
show("home");
initPortcullisIntro();
initHeroArrowDrift();
initBackToTop();
initGame();
initFortGame();
initFullscreenToggle();
initMusicMuteToggle();

// Coral Bay Heist — bootstrap and game loop. Builds the world, owns the
// shared state, steps every system once a frame, and exposes the small
// test hooks the playtests read (window.__game).
import { buildCity, ZONES, WORLD_W, WORLD_H } from './city.js';
import { SoundEngine } from './audio.js';
import { attachInput } from './input.js';
import { saveGame, loadSaveData, applySave, hasSave } from './save.js';
import { makePlayer, updateOnFoot, updateDriving, tryEnterCar, damagePlayer } from './player.js';
import { buildTraffic, updateTraffic, updatePeds } from './traffic.js';
import { updatePolice, setWanted } from './police.js';
import { updateMissions } from './missions.js';
import { playerShoot, updateBullets, updateEnemies, updateParticles } from './combat.js';
import { render, VIEW_W, VIEW_H } from './render.js';
import { stageShot } from './shots.js';
import { clamp } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export function newGameState(seed) {
  const G = {
    seed,
    time: 0,
    screen: 'title',
    city: buildCity(seed),
    player: makePlayer(ZONES.spawn.x, ZONES.spawn.y),
    money: 250,
    health: 100,
    wanted: 0,
    heat: 0,
    cars: [],
    traffic: [],
    peds: [],
    police: [],
    cops: [],
    enemies: [],
    bullets: [],
    particles: [],
    missionIndex: 0,
    missionDone: [false, false, false],
    dropsCollected: 0,
    stats: { carsStolen: 0, busts: 0, wasted: 0, missionsDone: 0, shotsFired: 0, rivalsDown: 0, pedsHit: 0 },
    camera: { x: ZONES.spawn.x - 640, y: ZONES.spawn.y - 360 },
    keys: {},
    pressed: new Set(),
    mouse: { x: 640, y: 360, down: false, seen: false },
    sound: new SoundEngine(),
    toast: '',
    toastUntil: 0,
    banner: null,
    shotMode: null,
    shotFrozen: false,
    lastPoliceTopUp: 0,
    lastRamSound: 0,
    _lastToast: '',
  };
  G.damagePlayer = (n) => damagePlayer(G, n);
  buildTraffic(G);
  return G;
}

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;
const G = newGameState(seed);

function respawn(G) {
  G.player = makePlayer(ZONES.spawn.x, ZONES.spawn.y);
  G.health = 100;
  G.wanted = 0;
  G.heat = 0;
  G.police = [];
  G.cops = [];
  G.enemies = [];
  G.bullets = [];
  G.screen = 'play';
  G.camera.x = G.player.x - 640;
  G.camera.y = G.player.y - 360;
  G.toast = 'Back on the streets. Stay sharp.';
}

function startNewGame() {
  const fresh = newGameState(seed);
  Object.assign(G, fresh);
  G.damagePlayer = (n) => damagePlayer(G, n);
  G.screen = 'play';
  G.toast = 'Mama June needs a package at the Old Docks. Go.';
}

function startFromSave() {
  const data = loadSaveData();
  if (!data) { startNewGame(); return; }
  const fresh = newGameState(seed);
  Object.assign(G, fresh);
  G.damagePlayer = (n) => damagePlayer(G, n);
  applySave(G, data);
  G.screen = 'play';
  G.toast = `Welcome back, Rae. $${Math.floor(G.money).toLocaleString('en-US')} in your pocket.`;
}

// Key handling for menus and one-shot actions.
G.onKey = (code) => {
  if (code === 'Escape') {
    if (G.screen === 'play') G.screen = 'paused';
    else if (G.screen === 'paused') G.screen = 'play';
    return;
  }
  if (code === 'Enter' || code === 'NumpadEnter') {
    if (G.screen === 'title') {
      if (hasSave()) startFromSave();
      else startNewGame();
    } else if (G.screen === 'busted' || G.screen === 'wasted') {
      if (G.screen === 'busted') G.money = Math.max(0, G.money - 250);
      respawn(G);
    }
    return;
  }
  if (code === 'KeyN' && G.screen === 'title') { startNewGame(); return; }
  if (G.screen !== 'play') return;
  if (code === 'KeyE') tryEnterCar(G);
  if (code === 'KeyQ') {
    const data = saveGame(G);
    G.toast = data ? 'Game saved.' : 'Save failed — storage unavailable.';
    G.toastUntil = G.time + 2.5;
    G.sound.pickup();
  }
  if (code === 'Space') playerShoot(G);
};

G.onMouseDown = () => {
  G.mouse.seen = true;
  if (G.screen === 'play') playerShoot(G);
};

attachInput(G, canvas);

function updateCamera(G) {
  const tx = clamp(G.player.x - VIEW_W / 2, -40, WORLD_W - VIEW_W + 40);
  const ty = clamp(G.player.y - VIEW_H / 2, -40, WORLD_H - VIEW_H + 40);
  G.camera.x += (tx - G.camera.x) * 0.12;
  G.camera.y += (ty - G.camera.y) * 0.12;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  G.time += dt;

  // Toast lifetime follows the last toast text set.
  if (G.toast !== G._lastToast) {
    G._lastToast = G.toast;
    if (G.toast) G.toastUntil = G.time + 4;
  }

  if (G.screen === 'play' && !G.shotFrozen) {
    if (G.player.onFoot) updateOnFoot(G, dt);
    else updateDriving(G, dt);
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updatePolice(G, dt);
    updateMissions(G, dt);
    updateBullets(G, dt);
    updateEnemies(G, dt);
    updateParticles(G, dt);
    updateCamera(G);
    // Slow health recovery when the heat is off.
    if (G.wanted === 0 && G.health < 100) G.health = Math.min(100, G.health + 2 * dt);
    G.sound.siren(G.wanted > 0 && G.police.length > 0, dt);
    if (G.player.onFoot) G.sound.engine(0, false);
  } else if (G.screen === 'paused') {
    G.sound.engine(0, false);
    G.sound.siren(false, 0);
  } else if (G.screen === 'title' && !G.shotFrozen) {
    // Attract mode: traffic cruises behind the title.
    updateTraffic(G, dt);
    updatePeds(G, dt);
    G.camera.x = 320 + Math.sin(G.time * 0.05) * 260;
    G.camera.y = 260 + Math.cos(G.time * 0.04) * 120;
  } else if (G.shotFrozen) {
    // Frozen for a screenshot: keep the siren lights blinking.
    for (const car of G.police) car.sirenPhase += dt * 6;
  }

  render(G, ctx);
  G.pressed.clear();
  requestAnimationFrame(frame);
}

// Deterministic screenshot staging (?shot=start|drive|chase|mission).
const shot = params.get('shot');
if (shot) {
  stageShot(G, shot);
  // Freeze after staging; the loop still renders every frame.
  G.shotFrozen = true;
}
requestAnimationFrame(frame);

// Test hooks: the playtests read state and teleport the player; they never
// fake a mechanic — every action still runs through the real code paths.
window.__game = {
  state: G,
  teleport(x, y) {
    G.player.x = x;
    G.player.y = y;
    if (G.player.car) { G.player.car.x = x; G.player.car.y = y; }
    G.camera.x = clamp(x - VIEW_W / 2, -40, WORLD_W - VIEW_W + 40);
    G.camera.y = clamp(y - VIEW_H / 2, -40, WORLD_H - VIEW_H + 40);
  },
  setWanted(n) { setWanted(G, n); },
  damage(n) {
    G.health -= n;
    if (G.health <= 0) {
      G.health = 0;
      if (G.screen === 'play') {
        G.screen = 'wasted';
        G.stats.wasted += 1;
        G.sound.wasted();
      }
    }
  },
  addMoney(n) { G.money += n; },
  save() { return saveGame(G); },
  load() { return loadSaveData(); },
  newGame() { startNewGame(); },
};

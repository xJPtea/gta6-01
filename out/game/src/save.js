// Save and load through localStorage. A save holds the money, the story
// progress, the player position and the run stats; police and traffic are
// rebuilt fresh on load, which is how a real open-world save behaves.
export const SAVE_KEY = 'coralBayHeistSave.v1';

export function saveGame(G) {
  try {
    const data = {
      money: G.money,
      health: G.health,
      missionIndex: G.missionIndex,
      missionDone: G.missionDone.slice(),
      dropsCollected: G.dropsCollected,
      stats: { ...G.stats },
      player: { x: Math.round(G.player.x), y: Math.round(G.player.y) },
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSaveData() !== null;
}

export function applySave(G, data) {
  if (!data) return false;
  G.money = data.money ?? G.money;
  G.health = data.health ?? 100;
  G.missionIndex = data.missionIndex ?? 0;
  G.missionDone = Array.isArray(data.missionDone) ? data.missionDone.slice(0, 3) : [false, false, false];
  while (G.missionDone.length < 3) G.missionDone.push(false);
  G.dropsCollected = data.dropsCollected ?? 0;
  if (data.stats) G.stats = { ...G.stats, ...data.stats };
  if (data.player) { G.player.x = data.player.x; G.player.y = data.player.y; }
  G.player.onFoot = true;
  G.player.car = null;
  return true;
}

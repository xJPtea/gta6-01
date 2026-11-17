// The story of Coral Bay Heist: Rae "Reef" Marlowe, a getaway driver who
// owes the fixer Mama June one last job. Three missions, each with a live
// objective on the HUD, a payout, and a banner when it lands.
import { dist } from './rng.js';
import { ZONES } from './city.js';
import { saveGame } from './save.js';
import { setWanted } from './police.js';

export const MISSIONS = [
  {
    name: 'Mission 1 — The Drop',
    brief: 'Mama June needs a package at the Old Docks. Get it there, quiet or loud.',
    objective: 'Deliver the package to the Old Docks',
    payout: 500,
  },
  {
    name: 'Mission 2 — Three Drops',
    brief: 'Three cash drops are waiting across Coral Bay. Collect them all, then bring the car home to the garage.',
    objective: 'Collect the cash drops',
    payout: 900,
  },
  {
    name: 'Mission 3 — The Ambush',
    brief: 'The Salt Crew set a trap at the garage. Deal with them, then lose the heat and reach the safehouse.',
    objective: 'Survive the ambush, then reach the Safehouse',
    payout: 1500,
  },
];

export function missionObjective(G) {
  if (G.missionIndex >= MISSIONS.length) return 'Free roam — Coral Bay is yours. Earn cash, dodge the PD.';
  const m = MISSIONS[G.missionIndex];
  if (G.missionIndex === 1) {
    const left = ZONES.drops.length - G.dropsCollected;
    if (left > 0) return `${m.objective} (${G.dropsCollected}/${ZONES.drops.length})`;
    return "Return the car to Rae's Garage";
  }
  if (G.missionIndex === 2) {
    if (G.enemies.length > 0) return `Take out the Salt Crew (${G.enemies.length} left)`;
    return 'Reach the Safehouse';
  }
  return m.objective;
}

export function missionTarget(G) {
  if (G.missionIndex === 0) return ZONES.docks;
  if (G.missionIndex === 1) {
    if (G.dropsCollected < ZONES.drops.length) return ZONES.drops[G.dropsCollected];
    return ZONES.garage;
  }
  if (G.missionIndex === 2) {
    return G.enemies.length > 0
      ? { x: G.enemies[0].x, y: G.enemies[0].y }
      : ZONES.safehouse;
  }
  return null;
}

function completeMission(G) {
  const m = MISSIONS[G.missionIndex];
  G.money += m.payout;
  G.missionDone[G.missionIndex] = true;
  G.stats.missionsDone += 1;
  G.banner = { text: `${m.name} COMPLETE  +$${m.payout}`, until: G.time + 3.5 };
  G.sound.cash();
  G.missionIndex += 1;
  if (G.missionIndex === 1) {
    G.dropsCollected = 0;
    G.toast = 'New job from Mama June: three cash drops across town.';
  } else if (G.missionIndex === 2) {
    startAmbush(G);
  } else if (G.missionIndex >= MISSIONS.length) {
    G.banner = { text: 'STORY COMPLETE — Coral Bay is yours. +$1,500', until: G.time + 4 };
    G.toast = 'Free roam: steal cars, dodge the PD, keep the cash coming.';
  }
  saveGame(G);
}

function startAmbush(G) {
  // Four rivals of the Salt Crew jump Rae at the garage.
  const spots = [
    [ZONES.garage.x - 90, ZONES.garage.y - 60],
    [ZONES.garage.x + 90, ZONES.garage.y - 70],
    [ZONES.garage.x - 70, ZONES.garage.y + 90],
    [ZONES.garage.x + 100, ZONES.garage.y + 80],
  ];
  for (const [x, y] of spots) {
    G.enemies.push({ x, y, angle: 0, health: 3, shootCooldown: 1.2, speed: 95, color: '#7a2c2c' });
  }
  setWanted(G, 2);
  G.banner = { text: 'AMBUSH! The Salt Crew is here.', until: G.time + 3 };
  G.toast = 'Take them out, then reach the Safehouse.';
}

export function updateMissions(G, dt) {
  if (G.missionIndex >= MISSIONS.length) return;
  const p = G.player;
  if (G.missionIndex === 0) {
    if (dist(p.x, p.y, ZONES.docks.x, ZONES.docks.y) < ZONES.docks.r) {
      completeMission(G);
    }
  } else if (G.missionIndex === 1) {
    if (G.dropsCollected < ZONES.drops.length) {
      const drop = ZONES.drops[G.dropsCollected];
      if (dist(p.x, p.y, drop.x, drop.y) < 62) {
        G.dropsCollected += 1;
        G.money += 150;
        G.sound.pickup();
        G.toast = `Cash drop ${G.dropsCollected}/${ZONES.drops.length} collected (+$150).`;
        if (G.dropsCollected >= ZONES.drops.length) {
          G.toast = "All drops collected. Bring the car home to Rae's Garage.";
        }
      }
    } else if (dist(p.x, p.y, ZONES.garage.x, ZONES.garage.y) < ZONES.garage.r) {
      completeMission(G);
    }
  } else if (G.missionIndex === 2) {
    if (G.enemies.length === 0 && dist(p.x, p.y, ZONES.safehouse.x, ZONES.safehouse.y) < ZONES.safehouse.r) {
      completeMission(G);
    }
  }
}

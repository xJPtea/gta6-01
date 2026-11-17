// Coral Bay: the city itself. A road grid over a sun-soaked bay town, with
// pastel buildings, palm-lined streets, a beach on the west edge, the Old
// Docks yard, Rae's garage lot and a safehouse. Everything is placed from a
// seeded stream, so seed 1 always builds the same map.
import { makeRng, clamp } from './rng.js';

export const WORLD_W = 2200;
export const WORLD_H = 1700;
export const ROAD_W = 76;

export const V_ROADS = [200, 500, 800, 1100, 1400, 1700, 2000];
export const H_ROADS = [200, 500, 800, 1100, 1400];

// Named places the story and the missions use. All coordinates are world
// coordinates, shared by the missions, the screenshots and the playtests.
export const ZONES = {
  spawn: { x: 500, y: 1100 },
  docks: { x: 600, y: 560, r: 95, name: 'Old Docks' },
  garage: { x: 1250, y: 1250, r: 85, name: "Rae's Garage" },
  safehouse: { x: 1850, y: 1550, r: 95, name: 'Safehouse' },
  drops: [
    { x: 1400, y: 500, name: 'Harbor Lights' },
    { x: 800, y: 1100, name: 'Palm Court' },
    { x: 1700, y: 800, name: 'Marina Gate' },
  ],
};

const PALETTE = [
  '#e8a0a0', '#f2c184', '#f7e08a', '#a8d8a0', '#9ec8e8',
  '#d8a8d8', '#e8b4a0', '#b8d8c8', '#e8d8a8', '#c8b8e8',
];
const ROOFS = ['#8a5a4a', '#5a6a7a', '#7a5a3a', '#4a6a5a', '#6a4a5a'];

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const containers = [];
  const parks = [];

  // Blocks are the rectangles between neighbouring roads.
  const xs = [0, ...V_ROADS, WORLD_W];
  const ys = [0, ...H_ROADS, WORLD_H];
  const blockKey = (bx, by) => `${bx},${by}`;

  // Open lots: the docks yard, the garage lot, the safehouse lot and parks
  // stay free of buildings so missions can always be reached.
  const openBlocks = new Set([
    blockKey(2, 2), // docks yard: roads x 500..800, y 500..800
    blockKey(4, 4), // garage lot: roads x 1100..1400, y 1100..1400
    blockKey(6, 5), // safehouse lot: roads x 1700..2000, y 1400..1700
    blockKey(1, 4), // park: Coral Park
    blockKey(5, 1), // park: Marina Green
  ]);
  const parkBlocks = new Set([blockKey(1, 4), blockKey(5, 1)]);

  for (let by = 0; by < ys.length - 1; by += 1) {
    for (let bx = 0; bx < xs.length - 1; bx += 1) {
      const x0 = xs[bx] + ROAD_W / 2 + 14;
      const x1 = xs[bx + 1] - ROAD_W / 2 - 14;
      const y0 = ys[by] + ROAD_W / 2 + 14;
      const y1 = ys[by + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      // The beach strip is water and sand, not buildings.
      if (x1 < 190) continue;
      const key = blockKey(bx, by);
      if (parkBlocks.has(key)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let i = 0; i < 6; i += 1) {
          palms.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20) });
        }
        continue;
      }
      if (openBlocks.has(key)) continue;
      // One or two buildings per block, with a margin for the sidewalk.
      const horizontal = rng.chance(0.5);
      if (horizontal && x1 - x0 > 190) {
        const w = (x1 - x0) / 2 - 16;
        buildings.push(makeBuilding(rng, x0 + 8, y0 + 10, w, y1 - y0 - 20));
        buildings.push(makeBuilding(rng, x0 + w + 24, y0 + 10, w, y1 - y0 - 20));
      } else if (!horizontal && y1 - y0 > 190) {
        const h = (y1 - y0) / 2 - 16;
        buildings.push(makeBuilding(rng, x0 + 10, y0 + 8, x1 - x0 - 20, h));
        buildings.push(makeBuilding(rng, x0 + 10, y0 + h + 24, x1 - x0 - 20, h));
      } else {
        buildings.push(makeBuilding(rng, x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16));
      }
    }
  }

  // Shipping containers stacked in the docks yard.
  const dockColors = ['#c8643c', '#3c78b4', '#5aa05a', '#b4a03c', '#96509a'];
  for (let i = 0; i < 7; i += 1) {
    containers.push({
      x: 560 + (i % 3) * 78,
      y: 640 + Math.floor(i / 3) * 52,
      w: 64, h: 38,
      color: dockColors[i % dockColors.length],
    });
  }

  // Palms along the main avenues.
  for (const rx of V_ROADS) {
    for (let y = 120; y < WORLD_H; y += 260) {
      if (rng.chance(0.6)) palms.push({ x: rx + ROAD_W / 2 + 16, y: y + rng.range(-20, 20) });
      if (rng.chance(0.5)) palms.push({ x: rx - ROAD_W / 2 - 16, y: y + 130 + rng.range(-20, 20) });
    }
  }

  return { buildings, palms, containers, parks };
}

function makeBuilding(rng, x, y, w, h) {
  return {
    x, y, w, h,
    color: rng.pick(PALETTE),
    roof: rng.pick(ROOFS),
    windows: rng.int(2, 4),
    tall: rng.chance(0.3),
  };
}

// True when a circle of radius r at (x, y) overlaps any building.
export function hitBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// True when the point is on a road (used for traffic and spawning).
export function onRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

// The nearest point on a road centreline to (x, y). Used to spawn police
// and parked cars where they can actually drive.
export function nearestRoadPoint(x, y) {
  let best = null; let bd = 1e9;
  for (const rx of V_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bd) { bd = d; best = { x: rx, y: clamp(y, 60, WORLD_H - 60) }; }
  }
  for (const ry of H_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bd) { bd = d; best = { x: clamp(x, 60, WORLD_W - 60), y: ry }; }
  }
  return best;
}

// Move an entity with axis-separated collision so it slides along walls
// instead of sticking to them.
export function moveWithCollision(city, ent, dx, dy, r) {
  const nx = ent.x + dx;
  if (!hitBuilding(city, nx, ent.y, r) && nx > 30 && nx < WORLD_W - 30) ent.x = nx;
  const ny = ent.y + dy;
  if (!hitBuilding(city, ent.x, ny, r) && ny > 30 && ny < WORLD_H - 30) ent.y = ny;
}

// Traffic and pedestrians. Traffic cars cruise the road grid in lanes and
// wrap around the world edges; parked cars wait at the kerb to be stolen;
// pedestrians stroll the sidewalks and run from trouble.
import { makeRng, clamp, dist } from './rng.js';
import { V_ROADS, H_ROADS, ROAD_W, WORLD_W, WORLD_H, onRoad, ZONES } from './city.js';

export const CAR_COLORS = [
  '#c8452c', '#2c6ac8', '#e8c832', '#38a05a', '#e8e8e8',
  '#30343c', '#c87ab0', '#e08a2c', '#5ab8c8', '#8a5ac8',
];

export function makeCar(x, y, angle, color, opts = {}) {
  return {
    x, y, angle, speed: 0, color,
    driver: opts.driver ?? false,
    parked: opts.parked ?? false,
    police: false,
  };
}

export function buildTraffic(G) {
  const rng = makeRng(G.seed + 101);
  G.cars = [];
  // Parked cars at the kerb, on the roads themselves so they are never
  // wedged inside a building block. Some have a driver sitting in them.
  const spots = [
    [519, 1010, -Math.PI / 2], [481, 1190, Math.PI / 2],
    [519, 560, -Math.PI / 2], [519, 700, -Math.PI / 2], [481, 940, Math.PI / 2],
    [819, 519, 0], [781, 819, Math.PI], [1119, 260, Math.PI / 2],
    [1419, 819, 0], [481, 1419, -Math.PI / 2], [1719, 1119, Math.PI],
    [819, 1419, Math.PI / 2], [219, 1119, 0], [519, 219, Math.PI],
    [2019, 519, Math.PI / 2], [1119, 1419, 0], [1419, 219, -Math.PI / 2],
    [819, 219, 0], [2019, 1119, -Math.PI / 2],
  ];
  for (const [x, y, a] of spots) {
    G.cars.push(makeCar(x, y, a, rng.pick(CAR_COLORS), {
      parked: true, driver: rng.chance(0.45),
    }));
  }
  // The cars by Rae's starting corner are always empty: the first steal
  // of a run is a clean getaway, so the police response to a later wanted
  // level arrives fresh instead of already parked on top of her.
  for (const car of G.cars) {
    if (dist(car.x, car.y, ZONES.spawn.x, ZONES.spawn.y) < 300) car.driver = false;
  }
  // Moving traffic on the roads.
  G.traffic = [];
  for (let i = 0; i < 14; i += 1) {
    const vertical = rng.chance(0.5);
    const dir = rng.chance(0.5) ? 1 : -1;
    if (vertical) {
      const rx = rng.pick(V_ROADS);
      G.traffic.push({
        x: rx + (dir === 1 ? 19 : -19),
        y: rng.range(60, WORLD_H - 60),
        angle: dir === 1 ? Math.PI / 2 : -Math.PI / 2,
        speed: rng.range(90, 150), color: rng.pick(CAR_COLORS),
        vertical: true, road: rx, dir,
      });
    } else {
      const ry = rng.pick(H_ROADS);
      G.traffic.push({
        x: rng.range(60, WORLD_W - 60),
        y: ry + (dir === 1 ? 19 : -19),
        angle: dir === 1 ? 0 : Math.PI,
        speed: rng.range(90, 150), color: rng.pick(CAR_COLORS),
        vertical: false, road: ry, dir,
      });
    }
  }
  // Pedestrians on the sidewalks.
  G.peds = [];
  for (let i = 0; i < 26; i += 1) {
    const vertical = rng.chance(0.5);
    let x; let y;
    if (vertical) {
      const rx = rng.pick(V_ROADS);
      x = rx + (rng.chance(0.5) ? ROAD_W / 2 + 12 : -ROAD_W / 2 - 12);
      y = rng.range(80, WORLD_H - 80);
    } else {
      const ry = rng.pick(H_ROADS);
      x = rng.range(80, WORLD_W - 80);
      y = ry + (rng.chance(0.5) ? ROAD_W / 2 + 12 : -ROAD_W / 2 - 12);
    }
    G.peds.push({
      x, y, angle: rng.range(0, Math.PI * 2),
      speed: rng.range(28, 52), state: 'walk',
      color: rng.pick(['#e8b4a0', '#c8a078', '#8a6a4a', '#f0c8a0', '#a07858']),
      shirt: rng.pick(['#c8452c', '#2c6ac8', '#e8c832', '#38a05a', '#e8e8e8', '#8a5ac8']),
      panic: 0,
    });
  }
}

export function updateTraffic(G, dt) {
  const p = G.player;
  for (const t of G.traffic) {
    // Slow down for the car ahead on the same lane.
    let target = t.speed;
    for (const o of G.traffic) {
      if (o === t || o.vertical !== t.vertical || o.road !== t.road) continue;
      const ahead = t.vertical ? (o.y - t.y) * t.dir : (o.x - t.x) * t.dir;
      const side = t.vertical ? Math.abs(o.x - t.x) : Math.abs(o.y - t.y);
      if (ahead > 0 && ahead < 90 && side < 30) { target = 0; break; }
    }
    // And for the player's car right in front.
    if (!p.onFoot && p.car) {
      const d = dist(t.x, t.y, p.car.x, p.car.y);
      if (d < 80) {
        const ahead = t.vertical
          ? (p.car.y - t.y) * t.dir : (p.car.x - t.x) * t.dir;
        if (ahead > 0) target = 0;
      }
    }
    const cur = target === 0 ? Math.max(0, Math.abs(t.speed) - 260 * dt) : Math.abs(t.speed);
    const sp = target === 0 ? cur : Math.min(150, Math.abs(t.speed) + 60 * dt);
    t.speed = sp;
    // Advance along the lane direction.
    if (t.vertical) t.y += t.dir * sp * dt;
    else t.x += t.dir * sp * dt;
    if (t.vertical) {
      if (t.y > WORLD_H + 40) t.y = -40;
      if (t.y < -40) t.y = WORLD_H + 40;
    } else {
      if (t.x > WORLD_W + 40) t.x = -40;
      if (t.x < -40) t.x = WORLD_W + 40;
    }
    // Running a pedestrian over is a crime and the pedestrian flees.
    for (const ped of G.peds) {
      if (ped.state !== 'flee' && dist(t.x, t.y, ped.x, ped.y) < 26) {
        ped.state = 'flee';
        ped.panic = 3;
      }
    }
  }
  // The player's car running someone over is a crime too.
  if (!p.onFoot && p.car && Math.abs(p.car.speed) > 60) {
    for (const ped of G.peds) {
      if (ped.state !== 'flee' && dist(p.car.x, p.car.y, ped.x, ped.y) < 26) {
        ped.state = 'flee';
        ped.panic = 5;
        G.stats.pedsHit += 1;
        G.sound.crash();
      }
    }
  }
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    if (ped.state === 'flee') {
      ped.panic -= dt;
      const a = Math.atan2(ped.y - G.player.y, ped.x - G.player.x);
      ped.x += Math.cos(a) * 165 * dt;
      ped.y += Math.sin(a) * 165 * dt;
      ped.angle = a;
      if (ped.panic <= 0) ped.state = 'walk';
    } else {
      // Stroll: pick a new heading now and then, stay near the sidewalks.
      if (Math.random() < dt * 0.12) ped.angle += (Math.random() - 0.5) * 1.6;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 60 || ped.x > WORLD_W - 60 || ped.y < 60 || ped.y > WORLD_H - 60) {
        ped.angle += Math.PI;
      }
    }
    ped.x = clamp(ped.x, 40, WORLD_W - 40);
    ped.y = clamp(ped.y, 40, WORLD_H - 40);
  }
}

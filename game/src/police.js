// The wanted level and the Coral Bay PD. Crimes raise heat, heat sets the
// star level, and the level decides how many police cars and foot cops hunt
// Rae. Police cars chase and cut her off; foot cops run her down on foot,
// and one touch while she is on foot means BUSTED.
import { clamp, dist, turnToward, angleTo, makeRng } from './rng.js';
import { moveWithCollision, nearestRoadPoint, WORLD_W, WORLD_H } from './city.js';

const HEAT_FOR_LEVEL = [0, 12, 32, 56, 80, 96];

export function addHeat(G, amount) {
  G.heat = clamp(G.heat + amount, 0, 100);
  const want = G.heat > 92 ? 5 : G.heat > 72 ? 4 : G.heat > 48 ? 3
    : G.heat > 24 ? 2 : G.heat > 6 ? 1 : 0;
  if (want > G.wanted) setWanted(G, want);
  else G.wanted = Math.max(G.wanted, want);
}

export function setWanted(G, level) {
  G.wanted = clamp(level, 0, 5);
  G.heat = HEAT_FOR_LEVEL[G.wanted];
  if (G.wanted > 0) spawnPolice(G);
  else { G.police = []; G.cops = []; }
}

// Fill the response up to the level's strength: 2 cars per star, 1 foot
// cop per star plus one. Called on setWanted and topped up over time.
export function spawnPolice(G) {
  const rng = makeRng((G.seed + 202 + G.wanted * 17 + Math.floor(G.time)) >>> 0);
  const wantCars = Math.min(10, G.wanted * 2);
  const wantCops = Math.min(6, G.wanted + 1);
  while (G.police.length < wantCars) {
    const a = rng.range(0, Math.PI * 2);
    // Far enough out that the chase is still closing in a few seconds in.
    const d = rng.range(650, 850);
    // Spawn on a road so the car can actually drive to the player.
    const spot = nearestRoadPoint(
      clamp(G.player.x + Math.cos(a) * d, 60, WORLD_W - 60),
      clamp(G.player.y + Math.sin(a) * d, 60, WORLD_H - 60),
    );
    G.police.push({
      x: spot.x, y: spot.y,
      angle: rng.range(0, Math.PI * 2), speed: 0,
      color: '#1c2c4a', police: true, sirenPhase: rng.range(0, 6),
      stuck: 0, detour: 0, detourDir: 1, px: spot.x, py: spot.y,
    });
  }
  while (G.cops.length < wantCops) {
    const a = rng.range(0, Math.PI * 2);
    // Foot cops run in from off-screen; they take a few seconds to arrive.
    const d = rng.range(480, 580);
    const spot = nearestRoadPoint(
      clamp(G.player.x + Math.cos(a) * d, 60, WORLD_W - 60),
      clamp(G.player.y + Math.sin(a) * d, 60, WORLD_H - 60),
    );
    G.cops.push({
      x: spot.x, y: spot.y,
      angle: 0, speed: 150, color: '#24344f',
      stuck: 0, detour: 0, detourDir: 1, px: spot.x, py: spot.y,
    });
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Heat cools off only when the police have lost her.
  if (G.wanted > 0) {
    const nearest = nearestPoliceDist(G);
    if (nearest > 420) {
      G.heat = Math.max(0, G.heat - 2.2 * dt);
      const want = G.heat > 92 ? 5 : G.heat > 72 ? 4 : G.heat > 48 ? 3
        : G.heat > 24 ? 2 : G.heat > 6 ? 1 : 0;
      if (want < G.wanted) {
        G.wanted = want;
        if (G.wanted === 0) { G.police = []; G.cops = []; G.toast = 'You lost the cops.'; }
      }
    }
    // Top the response back up if cars were wrecked or left behind.
    if (G.time - (G.lastPoliceTopUp || 0) > 4) {
      G.lastPoliceTopUp = G.time;
      spawnPolice(G);
    }
  }

  for (const car of G.police) {
    const d = dist(car.x, car.y, p.x, p.y);
    let target = angleTo(car.x, car.y, p.x, p.y);
    const maxSpeed = 300 + G.wanted * 42;
    // A car wedged against a building detours sideways for a moment
    // instead of pushing at the wall forever.
    const moved = dist(car.x, car.y, car.px || car.x, car.py || car.y);
    if (car.speed > 60 && moved < 2) car.stuck = (car.stuck || 0) + dt;
    else car.stuck = 0;
    if (car.stuck > 0.5) {
      car.stuck = 0;
      car.detour = 0.9;
      car.detourDir = Math.random() < 0.5 ? 1 : -1;
    }
    if (car.detour > 0) {
      car.detour -= dt;
      target = angleTo(car.x, car.y, p.x, p.y) + car.detourDir * Math.PI * 0.55;
    }
    car.px = car.x; car.py = car.y;
    // On foot, the cars pull up short and let the foot cops do the arrest.
    // Brake early so they stop clear of her instead of ramming through.
    const holdDist = p.onFoot ? 120 : 46;
    if (d > holdDist + 140) {
      car.angle = turnToward(car.angle, target, 3.2 * dt);
      car.speed = Math.min(maxSpeed, car.speed + 420 * dt);
    } else if (d > holdDist) {
      car.angle = turnToward(car.angle, target, 3.2 * dt);
      car.speed = Math.max(0, car.speed - 700 * dt);
    } else {
      car.speed = Math.max(0, car.speed - 500 * dt);
      car.angle = turnToward(car.angle, target, 1.2 * dt);
    }
    moveWithCollision(G.city, car,
      Math.cos(car.angle) * car.speed * dt,
      Math.sin(car.angle) * car.speed * dt, 20);
    car.sirenPhase += dt * 6;
    // A fast ram on foot hurts; a slow nudge does not.
    if (p.onFoot && d < 34 && car.speed > 150) {
      G.damagePlayer(6);
    }
    // A police car that hits the player's car hard dents them both.
    if (!p.onFoot && p.car && d < 46) {
      p.car.speed *= 0.9;
      car.speed *= 0.85;
      if (Math.abs(p.car.speed) > 120 && G.time - (G.lastRamSound || 0) > 0.5) {
        G.lastRamSound = G.time;
        G.sound.crash();
      }
    }
  }

  for (const cop of G.cops) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    let target = angleTo(cop.x, cop.y, p.x, p.y);
    // A cop wedged on a building corner slides sideways around it.
    const moved = dist(cop.x, cop.y, cop.px || cop.x, cop.py || cop.y);
    if (moved < 1.5) cop.stuck = (cop.stuck || 0) + dt;
    else cop.stuck = 0;
    if (cop.stuck > 0.4) {
      cop.stuck = 0;
      cop.detour = 0.7;
      cop.detourDir = Math.random() < 0.5 ? 1 : -1;
    }
    if (cop.detour > 0) {
      cop.detour -= dt;
      target = angleTo(cop.x, cop.y, p.x, p.y) + cop.detourDir * Math.PI * 0.55;
    }
    cop.px = cop.x; cop.py = cop.y;
    cop.angle = target;
    // Foot cops sprint at a player on foot; they cannot catch a car.
    const speed = p.onFoot ? 150 : 90;
    moveWithCollision(G.city, cop,
      Math.cos(target) * speed * dt,
      Math.sin(target) * speed * dt, 12);
    // A cop has to hold Rae for a moment to make the arrest: she can
    // still break away, which keeps a chase tense instead of instant.
    if (p.onFoot && d < 26) {
      G.bustTimer = (G.bustTimer || 0) + dt;
      G.toast = 'The cops are grabbing you — run!';
      if (G.bustTimer > 0.8) {
        G.bustTimer = 0;
        G.screen = 'busted';
        G.stats.busts += 1;
        G.sound.engine(0, false);
        G.sound.siren(false, 0);
        G.sound.busted();
        return;
      }
    } else {
      G.bustTimer = 0;
    }
  }
}

export function nearestPoliceDist(G) {
  let best = 1e9;
  for (const c of G.police) best = Math.min(best, dist(c.x, c.y, G.player.x, G.player.y));
  for (const c of G.cops) best = Math.min(best, dist(c.x, c.y, G.player.x, G.player.y));
  return best;
}

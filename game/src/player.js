// The player on foot and behind the wheel. On foot Rae walks with WASD or
// the arrows; near a car, E steals it (a driver is pulled out first, which
// is a crime), E again steps out. Driving is arcade-style: W accelerates,
// S brakes and reverses, A/D steer, and the car slides along walls.
import { clamp, dist } from './rng.js';
import { moveWithCollision, hitBuilding } from './city.js';
import { addHeat } from './police.js';

export const WALK_SPEED = 155;
export const CAR_ACCEL = 340;
export const CAR_MAX_SPEED = 470;
export const CAR_REVERSE_MAX = 170;

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null, fireCooldown: 0, hurtCooldown: 0,
  };
}

export function nearestCar(G, maxDist) {
  let best = null; let bd = maxDist;
  for (const c of G.cars) {
    const d = dist(G.player.x, G.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Try to enter the nearest car. Returns true when Rae gets in.
export function tryEnterCar(G) {
  const p = G.player;
  if (!p.onFoot) {
    exitCar(G);
    return true;
  }
  const car = nearestCar(G, 78);
  if (!car) return false;
  if (car.police) return false;
  if (car.driver) {
    // Pull the driver out: they run off on foot and the theft is a crime.
    spawnFleeingDriver(G, car);
    car.driver = false;
    G.stats.carsStolen += 1;
    addHeat(G, 26);
    G.sound.steal();
    G.toast = 'Car stolen! The owner called it in.';
  } else {
    G.sound.steal();
    G.toast = 'You took the car.';
  }
  p.car = car;
  p.onFoot = false;
  car.speed = 0;
  p.angle = car.angle;
  p.x = car.x; p.y = car.y;
  return true;
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.speed = 0;
  p.car = null;
  p.onFoot = true;
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 30;
  p.y = car.y + Math.sin(side) * 30;
  if (hitBuilding(G.city, p.x, p.y, 12)) {
    p.x = car.x - Math.cos(side) * 30;
    p.y = car.y - Math.sin(side) * 30;
  }
  p.speed = 0;
}

function spawnFleeingDriver(G, car) {
  G.peds.push({
    x: car.x + 26, y: car.y + 10, angle: 0,
    speed: 150, state: 'flee', fleeX: car.x + 300, fleeY: car.y - 200,
    color: '#e8b4a0', panic: 4,
  });
}

// Damage the player; reaching 0 health ends the run as WASTED.
// (Heat and the wanted level live in police.js.)

// On-foot movement: WASD/arrows, facing follows the movement direction.
export function updateOnFoot(G, dt) {
  const p = G.player;
  let mx = 0; let my = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) my -= 1;
  if (G.keys.KeyS || G.keys.ArrowDown) my += 1;
  if (G.keys.KeyA || G.keys.ArrowLeft) mx -= 1;
  if (G.keys.KeyD || G.keys.ArrowRight) mx += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.angle = Math.atan2(my, mx);
    moveWithCollision(G.city, p, mx * WALK_SPEED * dt, my * WALK_SPEED * dt, 12);
    p.speed = WALK_SPEED;
  } else {
    p.speed = 0;
  }
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
}

// Arcade driving: accelerate, brake, reverse, steer harder at low speed.
export function updateDriving(G, dt) {
  const p = G.player;
  const car = p.car;
  if (!car) { p.onFoot = true; return; }
  const fwd = G.keys.KeyW || G.keys.ArrowUp;
  const back = G.keys.KeyS || G.keys.ArrowDown;
  const left = G.keys.KeyA || G.keys.ArrowLeft;
  const right = G.keys.KeyD || G.keys.ArrowRight;
  if (fwd) car.speed += CAR_ACCEL * dt;
  if (back) car.speed -= (car.speed > 0 ? CAR_ACCEL * 1.3 : CAR_ACCEL * 0.8) * dt;
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * 120 * dt;
  if (Math.abs(car.speed) < 4 && !fwd && !back) car.speed = 0;
  car.speed = clamp(car.speed, -CAR_REVERSE_MAX, CAR_MAX_SPEED);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const steerPower = 2.4 * clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += steer * steerPower * dt * Math.sign(car.speed);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Slide along walls: try each axis separately, lose some speed on a hit.
  if (!hitBuilding(G.city, nx, car.y, 20)) car.x = nx;
  else if (Math.abs(car.speed) > 60) { car.speed *= 0.55; G.sound.crash(); }
  if (!hitBuilding(G.city, car.x, ny, 20)) car.y = ny;
  else if (Math.abs(car.speed) > 60) { car.speed *= 0.55; }
  car.x = clamp(car.x, 24, 2176);
  car.y = clamp(car.y, 24, 1676);
  // Bumping traffic slows both cars.
  for (const other of G.cars) {
    if (other === car || other.police) continue;
    if (dist(car.x, car.y, other.x, other.y) < 44) {
      car.speed *= 0.92;
      other.x += Math.sign(other.x - car.x || 1) * 12 * dt * 60 * 0.16;
    }
  }
  p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
  G.sound.engine(Math.abs(car.speed) / CAR_MAX_SPEED, true);
}

// Damage the player; reaching 0 health ends the run as WASTED.
export function damagePlayer(G, amount) {
  if (G.screen !== 'play' || G.player.hurtCooldown > 0) return;
  G.health -= amount;
  G.player.hurtCooldown = 0.6;
  if (G.health <= 0) {
    G.health = 0;
    G.screen = 'wasted';
    G.stats.wasted += 1;
    G.sound.engine(0, false);
    G.sound.siren(false, 0);
    G.sound.wasted();
  }
}

// Combat: Rae shoots on foot with a mouse click or Space, aiming at the
// cursor or her facing. Rivals of the Salt Crew shoot back. Bullets are
// simple tracers with a short life; hits spark particles and raise heat
// when the target is a cop or a bystander.
import { dist } from './rng.js';
import { moveWithCollision } from './city.js';
import { addHeat } from './police.js';

export const BULLET_SPEED = 780;

export function playerShoot(G) {
  const p = G.player;
  if (!p.onFoot || p.fireCooldown > 0 || G.screen !== 'play') return;
  p.fireCooldown = 0.28;
  const aim = aimAngle(G);
  G.bullets.push({
    x: p.x + Math.cos(aim) * 22, y: p.y + Math.sin(aim) * 22,
    vx: Math.cos(aim) * BULLET_SPEED, vy: Math.sin(aim) * BULLET_SPEED,
    life: 0.7, from: 'player',
  });
  p.angle = aim;
  G.stats.shotsFired += 1;
  G.sound.shot();
  addHeat(G, 2);
}

// Aim at the mouse cursor in world space; Space fires along the facing.
export function aimAngle(G) {
  const p = G.player;
  const wx = G.camera.x + G.mouse.x;
  const wy = G.camera.y + G.mouse.y;
  if (G.mouse.seen) return Math.atan2(wy - p.y, wx - p.x);
  return p.angle;
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  for (const b of [...G.bullets]) {
    if (b.from === 'player') {
      for (const e of G.enemies) {
        if (dist(b.x, b.y, e.x, e.y) < 20) {
          e.health -= 1;
          b.life = 0;
          spawnHitSparks(G, b.x, b.y);
          if (e.health <= 0) {
            G.enemies = G.enemies.filter((x) => x !== e);
            G.money += 50;
            G.stats.rivalsDown += 1;
            G.toast = 'Salt Crew down (+$50).';
            G.sound.pickup();
          }
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const cop of G.cops) {
        if (dist(b.x, b.y, cop.x, cop.y) < 18) {
          G.cops = G.cops.filter((x) => x !== cop);
          b.life = 0;
          addHeat(G, 30);
          G.toast = 'You shot a cop! The whole PD is coming.';
          spawnHitSparks(G, b.x, b.y);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const ped of G.peds) {
        if (ped.state !== 'flee' && dist(b.x, b.y, ped.x, ped.y) < 16) {
          ped.state = 'flee';
          ped.panic = 5;
          b.life = 0;
          addHeat(G, 12);
          spawnHitSparks(G, b.x, b.y);
          break;
        }
      }
    } else {
      // Enemy bullets hurt Rae.
      if (dist(b.x, b.y, G.player.x, G.player.y) < 15) {
        b.life = 0;
        G.damagePlayer(8);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
}

function spawnHitSparks(G, x, y) {
  for (let i = 0; i < 8; i += 1) {
    const a = Math.random() * Math.PI * 2;
    G.particles.push({
      x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
      life: 0.35, max: 0.35, color: '#ffd94d', size: 3,
    });
  }
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    const d = dist(e.x, e.y, p.x, p.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 260) {
      moveWithCollision(G.city, e, Math.cos(e.angle) * e.speed * dt, Math.sin(e.angle) * e.speed * dt, 12);
    } else if (d < 150) {
      moveWithCollision(G.city, e, -Math.cos(e.angle) * e.speed * 0.5 * dt, -Math.sin(e.angle) * e.speed * 0.5 * dt, 12);
    }
    e.shootCooldown -= dt;
    if (e.shootCooldown <= 0 && d < 420 && G.screen === 'play') {
      e.shootCooldown = 1.1 + Math.random() * 0.7;
      const spread = (Math.random() - 0.5) * 0.35;
      const a = e.angle + spread;
      G.bullets.push({
        x: e.x + Math.cos(a) * 22, y: e.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
        life: 0.8, from: 'enemy',
      });
      G.sound.enemyShot();
    }
  }
}

export function updateParticles(G, dt) {
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
}

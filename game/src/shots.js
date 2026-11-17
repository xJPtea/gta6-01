// Deterministic screenshot staging. ?shot=<name>&seed=1 puts the game in a
// fixed, good-looking state and freezes the simulation so the capture is
// stable: the title screen, a drive through traffic, a police chase, and
// an on-foot mission firefight. Real play never passes through here.
import { ZONES, nearestRoadPoint } from './city.js';
import { setWanted } from './police.js';
import { tryEnterCar } from './player.js';

export function stageShot(G, name) {
  G.shotMode = name;
  if (name === 'start') {
    G.screen = 'title';
    G.camera.x = 500;
    G.camera.y = 300;
  } else if (name === 'drive') {
    startPlay(G);
    // Put Rae in a car heading east on the 800 road, traffic all around.
    const car = G.cars.find((c) => c.parked && Math.abs(c.y - 800) < 60)
      || G.cars.find((c) => c.parked);
    G.player.x = car.x + 30;
    G.player.y = car.y;
    tryEnterCar(G);
    setWanted(G, 0); // a clean drive: no heat for the screenshot
    G.player.car.angle = 0;
    G.player.car.speed = 240;
    G.player.car.x = 800;
    G.player.car.y = 800;
    G.player.x = 800;
    G.player.y = 800;
    // A couple of traffic cars right ahead and behind for the shot.
    G.traffic[0].x = 980; G.traffic[0].y = 781; G.traffic[0].angle = 0; G.traffic[0].dir = 1; G.traffic[0].vertical = false;
    G.traffic[1].x = 640; G.traffic[1].y = 819; G.traffic[1].angle = Math.PI; G.traffic[1].dir = -1; G.traffic[1].vertical = false;
    G.traffic[2].x = 1100; G.traffic[2].y = 800; G.traffic[2].angle = 0; G.traffic[2].dir = 1; G.traffic[2].vertical = false;
  } else if (name === 'chase') {
    startPlay(G);
    const car = G.cars.find((c) => c.parked) || G.cars[0];
    G.player.x = car.x + 30;
    G.player.y = car.y;
    tryEnterCar(G);
    G.player.car.angle = 0;
    G.player.car.speed = 300;
    G.player.car.x = 1000;
    G.player.car.y = 800;
    G.player.x = 1000;
    G.player.y = 800;
    setWanted(G, 3);
    // Pull the response in close so the chase reads in one frame.
    G.police.forEach((cop, i) => {
      const a = -0.6 - i * 0.5;
      const spot = nearestRoadPoint(
        G.player.x + Math.cos(a) * (150 + i * 55),
        G.player.y + Math.sin(a) * (150 + i * 55),
      );
      cop.x = spot.x;
      cop.y = spot.y;
      cop.angle = Math.atan2(G.player.y - cop.y, G.player.x - cop.x);
      cop.speed = 320;
    });
    G.cops.forEach((cop, i) => {
      cop.x = G.player.x - 120 - i * 40;
      cop.y = G.player.y + 60 + i * 30;
    });
    G.toast = 'Lose the cops — reach the Old Docks!';
  } else if (name === 'mission') {
    startPlay(G);
    G.missionIndex = 1;
    G.dropsCollected = 1;
    G.player.x = ZONES.drops[1].x - 40;
    G.player.y = ZONES.drops[1].y + 30;
    G.player.angle = Math.PI / 4;
    // Two rivals closing in, one already down to half health.
    G.enemies.push(
      { x: ZONES.drops[1].x + 90, y: ZONES.drops[1].y - 60, angle: Math.PI, health: 3, shootCooldown: 1.5, speed: 95, color: '#7a2c2c' },
      { x: ZONES.drops[1].x + 140, y: ZONES.drops[1].y + 80, angle: Math.PI, health: 2, shootCooldown: 2, speed: 95, color: '#7a2c2c' },
    );
    G.bullets.push({
      x: G.player.x + 30, y: G.player.y - 10,
      vx: 700, vy: -180, life: 0.4, from: 'player',
    });
    G.toast = 'Cash drop 2 of 3 — the Salt Crew found you first.';
  }
  G.shotFrozen = true;
  updateCamera(G);
  window.__shotDone = true;
}

function startPlay(G) {
  G.screen = 'play';
  G.player.x = ZONES.spawn.x;
  G.player.y = ZONES.spawn.y;
  G.player.onFoot = true;
  G.player.car = null;
}

function updateCamera(G) {
  G.camera.x = G.player.x - 640;
  G.camera.y = G.player.y - 360;
}

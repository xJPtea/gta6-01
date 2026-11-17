// Everything the player sees: the sun-soaked city, the cars and people in
// it, the HUD with its minimap and wanted stars, and the title, busted and
// wasted screens. The camera follows Rae; the world is drawn in world
// coordinates, the HUD in screen coordinates.
import { V_ROADS, H_ROADS, ROAD_W, WORLD_W, WORLD_H, ZONES } from './city.js';
import { missionObjective, missionTarget, MISSIONS } from './missions.js';
import { hasSave } from './save.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export function drawCar(ctx, x, y, angle, color, police, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-24, -12, 48, 28);
  // Body.
  ctx.fillStyle = color;
  roundRect(ctx, -22, -13, 44, 26, 7);
  ctx.fill();
  // Cabin and windows.
  ctx.fillStyle = police ? '#dfe8f2' : '#1e2a33';
  roundRect(ctx, -6, -11, 16, 22, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(8, -11, 4, 22);
  // Wheels.
  ctx.fillStyle = '#16181c';
  ctx.fillRect(-16, -15, 10, 5);
  ctx.fillRect(-16, 10, 10, 5);
  ctx.fillRect(8, -15, 10, 5);
  ctx.fillRect(8, 10, 10, 5);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(20, -10, 3, 5);
  ctx.fillRect(20, 5, 3, 5);
  if (police) {
    // Flashing light bar.
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2d7bff';
    ctx.fillRect(-4, -13, 8, 5);
    ctx.fillStyle = on ? '#2d7bff' : '#ff2d2d';
    ctx.fillRect(-4, 8, 8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, skin, scale) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 2, 10 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(7 * s, 0, 5.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(4 * s, -3 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(G, ctx) {
  const cam = G.camera;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  // Ground: sand, then the bay on the west edge.
  ctx.fillStyle = '#d9c08a';
  ctx.fillRect(cam.x - 40, cam.y - 40, VIEW_W + 80, VIEW_H + 80);
  ctx.fillStyle = '#3f8fbf';
  ctx.fillRect(cam.x - 40, cam.y - 40, 130 - cam.x + 40 > 0 ? 130 - (cam.x - 40) : 0, VIEW_H + 80);
  ctx.fillStyle = '#5aa8d8';
  ctx.fillRect(cam.x - 40, cam.y - 40, 118 - (cam.x - 40) > 0 ? 118 - (cam.x - 40) : 0, VIEW_H + 80);
  // Beach sand strip.
  ctx.fillStyle = '#ecd9a0';
  ctx.fillRect(118, cam.y - 40, 46, VIEW_H + 80);

  // Parks.
  for (const park of G.city.parks) {
    ctx.fillStyle = '#7fae62';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#8fbf70';
    ctx.beginPath(); ctx.arc(park.x + park.w * 0.3, park.y + park.h * 0.4, 26, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(park.x + park.w * 0.7, park.y + park.h * 0.6, 32, 0, Math.PI * 2); ctx.fill();
  }

  // Roads with sidewalks and dashed centre lines.
  for (const rx of V_ROADS) {
    ctx.fillStyle = '#b9b2a0';
    ctx.fillRect(rx - ROAD_W / 2 - 8, cam.y - 40, ROAD_W + 16, VIEW_H + 80);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(rx - ROAD_W / 2, cam.y - 40, ROAD_W, VIEW_H + 80);
    ctx.strokeStyle = '#e8d44d';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.beginPath(); ctx.moveTo(rx, cam.y - 40); ctx.lineTo(rx, cam.y + VIEW_H + 40); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const ry of H_ROADS) {
    ctx.fillStyle = '#b9b2a0';
    ctx.fillRect(cam.x - 40, ry - ROAD_W / 2 - 8, VIEW_W + 80, ROAD_W + 16);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(cam.x - 40, ry - ROAD_W / 2, VIEW_W + 80, ROAD_W);
    ctx.strokeStyle = '#e8d44d';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.beginPath(); ctx.moveTo(cam.x - 40, ry); ctx.lineTo(cam.x + VIEW_W + 40, ry); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mission markers: the docks yard, the garage, the safehouse, the drops.
  drawZone(ctx, G, ZONES.docks, '#ffd94d', 'OLD DOCKS');
  drawZone(ctx, G, ZONES.garage, '#7ad8ff', "RAE'S GARAGE");
  drawZone(ctx, G, ZONES.safehouse, '#7dff8a', 'SAFEHOUSE');
  if (G.missionIndex === 1) {
    for (let i = 0; i < ZONES.drops.length; i += 1) {
      if (i < G.dropsCollected) continue;
      drawDropMarker(ctx, G, ZONES.drops[i], i === G.dropsCollected);
    }
  }
  // Pulsing ring on the current objective.
  const target = missionTarget(G);
  if (target && G.screen === 'play') {
    const pulse = 1 + Math.sin(G.time * 4) * 0.12;
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Docks containers.
  for (const c of G.city.containers) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(c.x + 3, c.y + 3, c.w, c.h);
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }

  // Buildings with a drop shadow, a coloured roof and lit windows.
  for (const b of G.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, Math.max(10, b.h * 0.22));
    ctx.fillStyle = 'rgba(255,255,220,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor((b.h * 0.7) / 30));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        ctx.fillRect(b.x + 12 + i * 34, b.y + b.h * 0.3 + j * 30, 12, 14);
      }
    }
  }

  // Palms.
  for (const palm of G.city.palms) {
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(palm.x - 2, palm.y - 2, 4, 10);
    ctx.fillStyle = '#3f8f4a';
    ctx.beginPath(); ctx.arc(palm.x, palm.y - 4, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#57a85a';
    ctx.beginPath(); ctx.arc(palm.x - 5, palm.y - 7, 7, 0, Math.PI * 2); ctx.fill();
  }

  // Parked cars, traffic, the player, police, rivals, pedestrians.
  for (const car of G.cars) drawCar(ctx, car.x, car.y, car.angle, car.color, false, G.time);
  for (const t of G.traffic) drawCar(ctx, t.x, t.y, t.angle, t.color, false, G.time);
  for (const cop of G.cops) {
    drawPerson(ctx, cop.x, cop.y, cop.angle, '#24344f', '#e8b4a0', 1.05);
    ctx.fillStyle = '#24344f';
    ctx.fillRect(cop.x - 7, cop.y - 12, 14, 4);
  }
  for (const e of G.enemies) {
    drawPerson(ctx, e.x, e.y, e.angle, '#7a2c2c', '#c8a078', 1.1);
    // Health pips above a rival.
    ctx.fillStyle = '#222';
    ctx.fillRect(e.x - 14, e.y - 22, 28, 5);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(e.x - 13, e.y - 21, 26 * (e.health / 3), 3);
  }
  for (const ped of G.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.color, 1);
  for (const car of G.police) drawCar(ctx, car.x, car.y, car.angle, car.color, true, G.time);

  // Rae: on foot a person with a teal jacket; in a car the car itself.
  const p = G.player;
  if (p.onFoot) {
    drawPerson(ctx, p.x, p.y, p.angle, '#1f9e8a', '#f0c8a0', 1.1);
    // A held pistol when she has fired recently.
    if (p.fireCooldown > 0.1) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 10, p.y + Math.sin(p.angle) * 10);
      ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
      ctx.stroke();
    }
  }

  // Bullets as short tracers, particles as sparks.
  for (const b of G.bullets) {
    ctx.strokeStyle = b.from === 'player' ? '#ffe9a8' : '#ff9a8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // World edge: the city limits.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, WORLD_W - 40, WORLD_H - 40);

  ctx.restore();

  // ---- HUD (screen space) ----
  if (G.screen === 'play' || G.screen === 'paused') drawHud(G, ctx);
  if (G.screen === 'title') drawTitle(G, ctx);
  if (G.screen === 'busted') drawEndScreen(ctx, 'BUSTED', '#2d7bff', 'The Coral Bay PD caught Rae. The crew posts bail — $250 gone.', G);
  if (G.screen === 'wasted') drawEndScreen(ctx, 'WASTED', '#ff2d2d', 'Rae is down. Mama June is not happy.', G);
  if (G.screen === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press ESC to keep playing', VIEW_W / 2, VIEW_H / 2 + 34);
  }
}

function drawZone(ctx, G, zone, color, label) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, zone.x, zone.y - zone.r - 8);
}

function drawDropMarker(ctx, G, drop, active) {
  const s = active ? 1 + Math.sin(G.time * 5) * 0.15 : 1;
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c6a2c';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(drop.name.toUpperCase(), drop.x, drop.y + 34);
}

function drawHud(G, ctx) {
  // Wanted stars, top left.
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < G.wanted ? '★' : '☆';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 14, 12, 190, 44, 8);
  ctx.fill();
  ctx.fillStyle = G.wanted > 0 ? '#ffd94d' : '#c8c8c8';
  ctx.fillText(stars, 24, 44);

  // Money and health, bottom left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 14, VIEW_H - 86, 230, 72, 8);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`$${Math.floor(G.money).toLocaleString('en-US')}`, 26, VIEW_H - 52);
  ctx.fillStyle = '#222';
  ctx.fillRect(26, VIEW_H - 40, 200, 12);
  ctx.fillStyle = G.health > 30 ? '#7dff8a' : '#ff4d4d';
  ctx.fillRect(26, VIEW_H - 40, 200 * (G.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Health ${Math.ceil(G.health)}`, 26, VIEW_H - 22);

  // Speed, bottom right, while driving.
  if (!G.player.onFoot && G.player.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, VIEW_W - 154, VIEW_H - 86, 140, 72, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(G.player.car.speed) * 0.36)}`, VIEW_W - 44, VIEW_H - 40);
    ctx.font = '14px sans-serif';
    ctx.fillText('km/h', VIEW_W - 26, VIEW_H - 22);
    ctx.textAlign = 'left';
  }

  // Mission objective, top centre.
  const obj = missionObjective(G);
  ctx.font = 'bold 17px sans-serif';
  const w = ctx.measureText(obj).width + 36;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, VIEW_W / 2 - w / 2, 12, w, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW_W / 2, 36);
  ctx.textAlign = 'left';
  if (G.missionIndex < MISSIONS.length) {
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(MISSIONS[G.missionIndex].name, VIEW_W / 2, 66);
    ctx.textAlign = 'left';
  }

  // Distance to the objective.
  const target = missionTarget(G);
  if (target) {
    const d = Math.round(Math.hypot(target.x - G.player.x, target.y - G.player.y));
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${d}m`, VIEW_W / 2, 88);
    ctx.textAlign = 'left';
  }

  // Toast line under the objective.
  if (G.toast && G.time < G.toastUntil) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.toast, VIEW_W / 2, 116);
    ctx.textAlign = 'left';
  }
  // Banner for a completed mission.
  if (G.banner && G.time < G.banner.until) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const bw = ctx.measureText(G.banner.text).width + 48;
    roundRect(ctx, VIEW_W / 2 - bw / 2, VIEW_H / 2 - 130, bw, 46, 8);
    ctx.fill();
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.banner.text, VIEW_W / 2, VIEW_H / 2 - 100);
    ctx.textAlign = 'left';
  }

  // Controls hint, bottom centre.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move / drive   •   E steal or exit car   •   Click / Space shoot   •   Q save   •   ESC pause', VIEW_W / 2, VIEW_H - 12);
  ctx.textAlign = 'left';

  drawMinimap(G, ctx);
}

function drawMinimap(G, ctx) {
  const mw = 220; const mh = 132;
  const mx = VIEW_W - mw - 14; const my = 14;
  const sx = mw / WORLD_W; const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#c9b183';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 3;
  for (const rx of V_ROADS) {
    ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke();
  }
  for (const ry of H_ROADS) {
    ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke();
  }
  // Mission target.
  const target = missionTarget(G);
  if (target) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, 5 + Math.sin(G.time * 4) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police in blue, the player in white.
  ctx.fillStyle = '#2d7bff';
  for (const car of G.police) {
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CORAL BAY', mx, my + mh + 18);
}

function drawTitle(G, ctx) {
  ctx.fillStyle = 'rgba(10,16,28,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('CORAL BAY', VIEW_W / 2, 220);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('HEIST', VIEW_W / 2, 310);
  ctx.fillStyle = '#7ad8ff';
  ctx.font = '22px sans-serif';
  ctx.fillText('An open-world crime story — steal cars, dodge the PD, run Mama June’s jobs.', VIEW_W / 2, 356);
  const blink = Math.floor(G.time * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(hasSave() ? 'Press ENTER to continue your save' : 'Press ENTER to start', VIEW_W / 2, 440);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '17px sans-serif';
  ctx.fillText('WASD — move / drive      E — steal or exit a car      Click / Space — shoot', VIEW_W / 2, 500);
  ctx.fillText('Q — save      ESC — pause      N — new game', VIEW_W / 2, 530);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '15px sans-serif';
  ctx.fillText('Rae “Reef” Marlowe owes Mama June one last job. Three missions. One city. No mercy.', VIEW_W / 2, 580);
  ctx.fillText('100% original — a game of its own, in the spirit of the open-world crime classics.', VIEW_W / 2, 606);
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, word, color, line, G) {
  ctx.fillStyle = 'rgba(10,10,16,0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 96px sans-serif';
  ctx.fillText(word, VIEW_W / 2, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText(line, VIEW_W / 2, 380);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Cash: $${Math.floor(G.money).toLocaleString('en-US')}   •   Missions done: ${G.stats.missionsDone}   •   Cars stolen: ${G.stats.carsStolen}`, VIEW_W / 2, 420);
  const blink = Math.floor(G.time * 2) % 2 === 0;
  if (blink) {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Press ENTER to get back out there', VIEW_W / 2, 490);
  }
  ctx.textAlign = 'left';
}

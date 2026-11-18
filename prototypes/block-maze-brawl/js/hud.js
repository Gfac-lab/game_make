// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// The 2D layer over the 3D view: crosshair, hit marks, where a hit came from, health, ammo,
// the slot strip, the score, the kill feed, match point, scope and the scoreboard.
// Also the weapon icons (side views built from blocks), used here and on the menus.
'use strict';

/** Weapon icons as block side views in a 100×40 box, facing right: [x, y, w, h, colour]. */
const ICONS = {
  rifle:    [[2, 12, 20, 12, '#ff8a2a'], [20, 12, 56, 9, '#3b4150'], [76, 14, 22, 4, '#23262e'], [47, 21, 8, 13, '#23262e'], [61, 21, 7, 11, '#23262e'], [38, 8, 14, 4, '#222'], [58, 9, 16, 3, '#ff8a2a']],
  sniper:   [[2, 14, 22, 12, '#5b6b3a'], [22, 15, 50, 7, '#5b6b3a'], [72, 16, 27, 3, '#23262e'], [32, 6, 28, 7, '#1d1f24'], [35, 13, 3, 3, '#1d1f24'], [54, 13, 3, 3, '#1d1f24'], [56, 22, 6, 9, '#23262e'], [70, 22, 2, 11, '#23262e'], [75, 22, 2, 11, '#23262e']],
  uzi:      [[30, 12, 40, 12, '#1c1f26'], [70, 15, 11, 5, '#23262e'], [44, 24, 9, 16, '#2f6cf0'], [34, 8, 24, 4, '#2f6cf0']],
  rpg:      [[2, 11, 9, 18, '#2c3a22'], [9, 14, 70, 12, '#4f7a3a'], [79, 12, 10, 16, '#6b5a3a'], [89, 14, 8, 12, '#e0332e'], [96, 17, 4, 6, '#e0332e'], [30, 26, 6, 10, '#23262e'], [52, 26, 6, 9, '#23262e'], [42, 8, 9, 6, '#23262e']],
  pistol:   [[28, 12, 44, 10, '#6c7482'], [34, 22, 11, 16, '#23262e'], [45, 22, 9, 3, '#23262e'], [68, 9, 3, 3, '#23262e']],
  revolver: [[52, 14, 42, 6, '#c9d2dc'], [40, 11, 14, 13, '#9aa4b0'], [30, 12, 12, 10, '#c9d2dc'], [24, 21, 12, 16, '#9a5a2c'], [90, 11, 3, 3, '#23262e']],
  fist:     [[30, 10, 40, 24, '#ffd23f'], [64, 11, 8, 6, '#e9bb2e'], [64, 18, 8, 6, '#e9bb2e'], [64, 25, 8, 6, '#e9bb2e'], [36, 4, 20, 8, '#ffd23f'], [10, 14, 22, 16, '#f4f4f8']],
  knife:    [[8, 16, 30, 8, '#1d1f24'], [38, 11, 5, 18, '#6c7482'], [43, 15, 44, 7, '#e6edf3'], [87, 16, 9, 4, '#e6edf3'], [43, 15, 44, 2, '#ffffff']],
  scythe:   [[2, 20, 82, 5, '#9a5a2c'], [12, 18, 6, 9, '#6b3a1c'], [76, 4, 8, 18, '#dfe6ee'], [60, 2, 18, 6, '#dfe6ee'], [48, 5, 14, 5, '#dfe6ee'], [40, 9, 9, 4, '#dfe6ee']],
  grenade:  [[34, 12, 30, 26, '#3f7f3a'], [32, 22, 34, 4, '#2f5f2a'], [42, 5, 14, 8, '#8a8f96'], [56, 6, 6, 16, '#ffcc33'], [30, 3, 10, 4, '#ffcc33']],
  c4:       [[16, 12, 68, 22, '#d9c48c'], [38, 6, 24, 8, '#26282e'], [56, 7, 4, 4, '#ff2222'], [16, 19, 68, 2, '#e0332e'], [16, 26, 68, 2, '#2f6cf0']],
};
/** Draws weapon id's icon into the box (x, y, w, h), keeping its 100×40 shape. */
function drawWeaponIcon(g, id, x, y, w, h, alpha = 1, mono = null) {
  const k = Math.min(w / 100, h / 40), ox = x + (w - 100 * k) / 2, oy = y + (h - 40 * k) / 2;
  g.save(); g.globalAlpha *= alpha;
  for (const [rx, ry, rw, rh, c] of ICONS[id]) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(ox + (rx + 1.5) * k, oy + (ry + 1.5) * k, rw * k, rh * k);
  }
  for (const [rx, ry, rw, rh, c] of ICONS[id]) { g.fillStyle = mono || c; g.fillRect(ox + rx * k, oy + ry * k, rw * k, rh * k); }
  g.restore();
}
/** A small drawn key (head ring of blocks and a toothed shaft). */
function drawKeyIcon(g, x, y, s, color = '#ffcc33') {
  g.save(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, y + 1 + s * 0.3, s, s * 0.4);
  g.fillStyle = color;
  g.fillRect(x, y + s * 0.2, s * 0.42, s * 0.6);
  g.fillStyle = '#7a5a10'; g.fillRect(x + s * 0.13, y + s * 0.38, s * 0.16, s * 0.24);
  g.fillStyle = color; g.fillRect(x + s * 0.4, y + s * 0.42, s * 0.6, s * 0.16);
  g.fillRect(x + s * 0.72, y + s * 0.58, s * 0.1, s * 0.18); g.fillRect(x + s * 0.88, y + s * 0.58, s * 0.1, s * 0.24);
  g.restore();
}

const HUDF = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","WenQuanYi Zen Hei",system-ui,sans-serif';
function htext(s, x, y, size, c, align = 'center', weight = '800', stroke = true) {
  ctx.font = `${weight} ${size}px ${HUDF}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(15,20,40,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = c; ctx.fillText(s, x, y);
}
function panel(x, y, w, h, c = 'rgba(20,26,48,0.55)') {
  ctx.fillStyle = c; roundRect(ctx, x, y, w, h, 10); ctx.fill();
}
const hex = n => '#' + n.toString(16).padStart(6, '0');

function drawHUD() {
  ctx.clearRect(0, 0, W, H);
  if (scene === 'figures') { drawFiguresLabels(); return; }
  if (!M || scene === 'title') return;
  const p = M.player, cx = W / 2, cy = H / 2;
  const id = curW(p), def = WEAPONS[id];

  if (p.alive) {
    // Sniper scope.
    if (M.zoom && def.scope) {
      const r = H * 0.44;
      ctx.fillStyle = '#0b0d12'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill();
      ctx.strokeStyle = '#0b0d12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
      ctx.fillStyle = '#e0332e'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
      for (let i = 1; i <= 4; i++) { ctx.fillStyle = '#0b0d12'; ctx.fillRect(cx + i * 28 - 1, cy - 6, 2, 12); ctx.fillRect(cx - i * 28 - 1, cy - 6, 2, 12); ctx.fillRect(cx - 6, cy + i * 28 - 1, 12, 2); }
    } else drawCrosshair(cx, cy, p, id, def);
    // Hit marker: four ticks, red on a kill.
    if (M.hitMark) {
      const k = M.hitMark.life, s = M.hitMark.kill ? 15 : 10, c = M.hitMark.kill ? '#ff3b3b' : M.hitMark.head ? '#ffd23f' : '#ffffff';
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 5); ctx.strokeStyle = c; ctx.lineWidth = M.hitMark.kill ? 4 : 3;
      ctx.beginPath();
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(cx + dx * 6, cy + dy * 6); ctx.lineTo(cx + dx * (6 + s), cy + dy * (6 + s)); }
      ctx.stroke(); ctx.restore();
    }
    // Where hits came from.
    for (const h of M.hurtMarks) {
      const rel = angDiff(h.ang, p.yaw), R = 130;
      const phi = Math.atan2(-Math.cos(rel), -Math.sin(rel));
      ctx.save(); ctx.globalAlpha = Math.min(1, h.life * 1.4); ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R, phi - 0.32, phi + 0.32); ctx.stroke(); ctx.restore();
    }
    // Reload bar under the crosshair.
    if (p.reloadT > 0) {
      const k = 1 - p.reloadT / p.reloadMax;
      panel(cx - 60, cy + 40, 120, 26);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx - 54, cy + 58, 108 * k, 4);
      htext('재장전', cx, cy + 49, 15, '#fff', 'center', '700', false);
    }
    // Low health: red at the edges.
    const hpk = p.hp / tune.max_health;
    if (hpk < 0.35) {
      const gr = ctx.createRadialGradient(cx, cy, H * 0.35, cx, cy, H * 0.85);
      gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(220,0,0,${0.45 * (1 - hpk / 0.35) + 0.1})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
  }

  drawScoreTop();
  drawFeed();
  if (p.alive) { drawHealth(p); drawWeaponPanel(p); }
  if (M.matchPoint) {
    const mp = M.matchPoint, a = Math.min(1, mp.life * 2);
    ctx.save(); ctx.globalAlpha = a;
    panel(cx - 220, 112, 440, 54, mp.you ? 'rgba(40,170,90,0.85)' : 'rgba(220,60,60,0.85)');
    htext(`매치 포인트!  ${mp.name}  ${tune.kill_target - 1}킬`, cx, 139, 26, '#fff');
    ctx.restore();
  }
  if (p.alive && M.introT > 0 && !M.over) {
    ctx.save(); ctx.globalAlpha = Math.min(1, M.introT);
    const lines = isTouchUI()
      ? ['왼쪽 스틱: 이동  ·  오른쪽 드래그: 조준  ·  발사 버튼: 공격', '무기: 교체  ·  투척: 수류탄/C4  ·  먼저 ' + tune.kill_target + '킬 하면 승리!']
      : ['WASD 이동 · 마우스 조준 · 클릭 사격 · 우클릭 줌 · Shift 질주 · Space 점프', '1~4 무기 · G 투척(C4는 한 번 더 눌러 기폭) · R 재장전 · 먼저 ' + tune.kill_target + '킬 하면 승리!'];
    panel(cx - 400, H - 250, 800, 74);
    lines.forEach((l, i) => htext(l, cx, H - 230 + i * 32, 19, '#fff', 'center', '700', false));
    ctx.restore();
  }
  if (p.alive && !isTouchUI() && !document.pointerLockElement && !M.over && scene === 'play' && (!noLock || M.introT > 0)) {
    panel(cx - 230, cy - 120, 460, 40, 'rgba(20,26,48,0.7)');
    htext(noLock ? '마우스를 누른 채 끌어서 조준해요 (방향키로도 회전)' : '화면을 클릭하면 마우스로 조준해요 (방향키로도 회전)', cx, cy - 100, 18, '#fff', 'center', '700', false);
  }
  if (p.c4 && !p.c4.dead) htext('C4 설치됨 — G(투척)를 한 번 더 눌러 기폭!', cx, H - 150, 20, '#ffd23f');
  if (!p.alive && M.killedBy && !M.over) {
    const kb = M.killedBy;
    htext(kb === p ? '내 폭발에 당했다!' : `${kb.name}에게 당했다`, cx, 190, 30, '#ff8a7a');
  }
  if (M.over) {
    const win = M.winner === p;
    ctx.save(); ctx.globalAlpha = Math.min(1, (2.2 - M.endT) * 2);
    panel(cx - 300, cy - 70, 600, 140, win ? 'rgba(40,170,90,0.88)' : 'rgba(40,46,80,0.88)');
    htext(win ? '승리!' : '경기 종료', cx, cy - 22, 56, '#fff');
    htext(win ? `먼저 ${tune.kill_target}킬 달성!` : `${M.winner.name} 승리 · 내 킬 ${p.kills}`, cx, cy + 34, 24, '#fff', 'center', '700');
    ctx.restore();
  }
  if (down.has('Tab') || touch.board) drawScoreboard();
}

function drawCrosshair(cx, cy, p, id, def) {
  ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
  if (def.kind === 'melee') {
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 9, cy); ctx.stroke();
  } else if (def.kind === 'grenade' || def.kind === 'c4') {
    ctx.strokeRect(cx - 5, cy - 5, 10, 10);
    ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 22); ctx.stroke();
  } else {
    const spread = def.kind === 'gun' ? spreadOf(p, id) : 0.01;
    const gap = 5 + Math.tan(spread) * H / (2 * Math.tan(camera.fov * DEG / 2)) + M.recoil * 120;
    ctx.beginPath();
    ctx.moveTo(cx - gap - 10, cy); ctx.lineTo(cx - gap, cy); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + 10, cy);
    ctx.moveTo(cx, cy - gap - 10); ctx.lineTo(cx, cy - gap); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + 10);
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
  ctx.restore();
}

function drawScoreTop() {
  const cx = W / 2, p = M.player;
  const ranked = M.actors.slice().sort((a, b) => b.kills - a.kills);
  const leader = ranked[0];
  panel(cx - 170, 12, 340, 82);
  htext(`내 킬  ${p.kills} / ${tune.kill_target}`, cx, 40, 28, '#fff');
  const lead = leader === p ? (ranked[1] ? `2등 ${ranked[1].name}  ${ranked[1].kills}킬` : '') : `1등 ${leader.name}  ${leader.kills}킬`;
  htext((leader === p ? '내가 1등!  ·  ' : '') + lead, cx, 74, 17, leader === p ? '#ffe066' : '#d8e4ff', 'center', '700', false);
  const mm = Math.floor(M.t / 60), ss = Math.floor(M.t % 60);
  htext(`${mm}:${String(ss).padStart(2, '0')}`, cx + 150, 26, 16, '#e6ecff', 'right', '800', true);
}

function drawFeed() {
  let y = 26;
  const right = W - 16;
  for (const f of M.feed.slice(-5)) {
    const a = Math.min(1, f.life);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = `800 17px ${HUDF}`;
    const kn = f.killer === f.victim ? '' : f.killer.name, vn = f.victim.name;
    const wk = ctx.measureText(kn).width, wv = ctx.measureText(vn).width;
    const w = wk + wv + 92;
    const mine = f.killer.isPlayer || f.victim.isPlayer;
    panel(right - w, y - 15, w, 30, mine ? 'rgba(255,210,63,0.35)' : 'rgba(20,26,48,0.55)');
    htext(vn, right - 8, y, 17, f.victim.isPlayer ? '#fff' : hex(f.victim.look.shirt), 'right', '800', true);
    drawWeaponIcon(ctx, f.weapon, right - 8 - wv - 70, y - 13, 60, 26);
    if (kn) htext(kn, right - wv - 84, y, 17, f.killer.isPlayer ? '#fff' : hex(f.killer.look.shirt), 'right', '800', true);
    ctx.restore();
    y += 36;
  }
}

function drawHealth(p) {
  const x = 20, y = isTouchUI() ? 74 : H - 86, k = Math.max(0, p.hp / tune.max_health);
  panel(x, y, 260, 66);
  ctx.fillStyle = '#ff4d5a'; ctx.fillRect(x + 22, y + 18, 10, 30); ctx.fillRect(x + 12, y + 28, 30, 10);
  htext(`${Math.ceil(p.hp)}`, x + 56, y + 33, 34, '#fff', 'left');
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 124, y + 26, 120, 14);
  ctx.fillStyle = k > 0.5 ? '#3ddc84' : k > 0.25 ? '#ffd23f' : '#ff4d5a'; ctx.fillRect(x + 124, y + 26, 120 * k, 14);
  for (let i = 1; i < 5; i++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 124 + i * 24, y + 26, 2, 14); }
  htext('체력 (회복 없음)', x + 184, y + 54, 14, '#c6d0f0', 'center', '700', false);
}

function drawWeaponPanel(p) {
  const id = curW(p), def = WEAPONS[id], am = p.ammo[id];
  const w = 362, x = isTouchUI() ? W / 2 - w / 2 : W - w - 20, y = H - 120;
  // Slot strip.
  SLOTS.forEach((sl, i) => {
    const sx = x + i * 84, sy = y - 6, sel = sl.id === p.cur, wid = p.loadout[sl.id];
    panel(sx, sy, 78, 40, sel ? 'rgba(255,210,63,0.9)' : 'rgba(20,26,48,0.55)');
    htext(sl.key, sx + 10, sy + 12, 13, sel ? '#3a2a00' : '#c6d0f0', 'center', '800', false);
    drawWeaponIcon(ctx, wid, sx + 16, sy + 6, 58, 28, sel ? 1 : 0.8);
  });
  panel(x, y + 40, w, 70);
  drawWeaponIcon(ctx, id, x + 10, y + 50, 110, 50);
  htext(def.name, x + 134, y + 60, 18, '#c6d0f0', 'left', '800', false);
  let ammoText = '', low = false;
  if (def.kind === 'gun') { ammoText = `${am.mag} / ∞`; low = am.mag <= Math.ceil(ws(id, 'mag') * 0.25); }
  else if (def.kind === 'rocket') { ammoText = `${am.mag} | ${am.reserve}`; low = am.mag + am.reserve <= 1; }
  else if (def.kind === 'grenade' || def.kind === 'c4') { ammoText = `× ${am.uses}`; low = am.uses === 0; }
  else ammoText = '근접';
  htext(ammoText, x + w - 16, y + 88, 32, low ? '#ff6b6b' : '#fff', 'right');
  const tid = p.loadout.throw, tam = p.ammo[tid];
  if (p.cur !== 'throw') htext(`G ${WEAPONS[tid].name} ×${tam.uses}`, x + 134, y + 90, 15, '#c6d0f0', 'left', '700', false);
}

function drawScoreboard() {
  const ranked = M.actors.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const w = 520, h = 70 + ranked.length * 34, x = W / 2 - w / 2, y = H / 2 - h / 2;
  panel(x, y, w, h, 'rgba(20,26,48,0.85)');
  htext(`점수판 · 먼저 ${tune.kill_target}킬`, W / 2, y + 26, 22, '#fff');
  htext('킬', x + 380, y + 54, 15, '#c6d0f0', 'center', '700', false); htext('데스', x + 450, y + 54, 15, '#c6d0f0', 'center', '700', false);
  ranked.forEach((a, i) => {
    const ry = y + 84 + i * 34;
    if (a.isPlayer) { ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.fillRect(x + 10, ry - 15, w - 20, 30); }
    htext(`${i + 1}`, x + 34, ry, 18, '#fff', 'center', '800', false);
    ctx.fillStyle = hex(a.look.shirt); ctx.fillRect(x + 58, ry - 9, 18, 18);
    htext(a.name + (a.alive ? '' : '  (리스폰 중)'), x + 88, ry, 18, '#fff', 'left', '700', false);
    htext(String(a.kills), x + 380, ry, 18, '#fff', 'center', '800', false);
    htext(String(a.deaths), x + 450, ry, 18, '#c6d0f0', 'center', '700', false);
  });
}

function drawFiguresLabels() {
  for (const f of figList) {
    const s = toScreen(f.x, -0.25, 0.6);
    if (!s) continue;
    htext(f.sub, s.x, s.y + 6, 18, '#fff');
    htext(f.label, s.x, s.y + 30, 14, '#e8f0ff', 'center', '700');
  }
  htext('블록 미로 대난투 — 봇과 무기 11종', W / 2, 36, 26, '#fff');
}

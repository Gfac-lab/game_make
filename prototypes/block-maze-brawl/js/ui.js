// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// The menus (title with armory and loadout, the death loadout screen, pause, results), mouse
// look with pointer lock, and the tablet's touch controls.
'use strict';

const $ = id => document.getElementById(id);
let touchMode = params.get('touch') === '1' || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
function isTouchUI() { return touchMode; }
CONFIG.mouse_sens.value = save.sens || CONFIG.mouse_sens.value;
if (save.touchSens) CONFIG.touch_sens.value = save.touchSens;

/** A canvas with a weapon icon on it, for the menus. */
function iconCanvas(id, w, h, dim) {
  const c = document.createElement('canvas');
  const r = Math.min(2, devicePixelRatio || 1);
  c.width = w * r; c.height = h * r; c.style.width = w + 'px'; c.style.height = h + 'px';
  const g = c.getContext('2d'); g.scale(r, r);
  drawWeaponIcon(g, id, 2, 2, w - 4, h - 4, dim ? 0.35 : 1);
  return c;
}
function keyCanvas(s) {
  const c = document.createElement('canvas'); c.width = s * 2; c.height = s * 2; c.style.width = s + 'px'; c.style.height = s + 'px';
  const g = c.getContext('2d'); g.scale(2, 2); drawKeyIcon(g, 0, 0, s); return c;
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

// ---- Title: difficulty, map, armory, loadout ---------------------------------------------
function renderTitle() {
  const ds = $('diffSeg'); ds.innerHTML = '';
  for (const k of ['easy', 'normal', 'hard']) {
    const b = el('button', 'seg-b' + (save.difficulty === k ? ' on' : ''), DIFFS[k]);
    b.onclick = () => { save.difficulty = k; writeSave(); sfx.ui(); renderTitle(); };
    ds.appendChild(b);
  }
  const ms = $('mapSel'); ms.innerHTML = '';
  for (const k of ['small', 'large']) {
    const b = el('button', 'map-b' + (save.map === k ? ' on' : ''));
    b.appendChild(mapPreview(k));
    b.appendChild(el('div', 'map-n', MAPS[k]));
    b.appendChild(el('div', 'map-d', k === 'small' ? '빽빽한 골목 · 근접전' : '긴 복도 · 스나이퍼'));
    b.onclick = () => { save.map = k; writeSave(); sfx.ui(); reset(); renderTitle(); };
    ms.appendChild(b);
  }
  $('keysTitle').innerHTML = ''; $('keysTitle').appendChild(keyCanvas(26)); $('keysTitle').appendChild(el('span', '', ` 열쇠 ${save.keys}개`));
  const arm = $('armory'); arm.innerHTML = '';
  for (const id of WEAPON_IDS) {
    const owned = save.unlocked.includes(id), price = weaponPrice(id);
    const card = el('div', 'wcard' + (owned ? ' owned' : ''));
    card.appendChild(iconCanvas(id, 96, 40, !owned));
    card.appendChild(el('div', 'wname', WEAPONS[id].name));
    card.appendChild(el('div', 'wslot', SLOTS.find(s => s.id === WEAPONS[id].slot).name));
    if (owned) card.appendChild(el('div', 'wown', WEAPONS[id].starter ? '기본' : '보유'));
    else {
      const b = el('button', 'buy' + (save.keys >= price ? '' : ' poor'));
      b.appendChild(keyCanvas(16)); b.appendChild(el('span', '', ` ${price} 해금`));
      b.onclick = () => {
        if (buyWeapon(id)) { sfx.buy(); save.loadout[WEAPONS[id].slot] = id; writeSave(); }
        else { sfx.empty(); flashMsg(`열쇠가 ${price - save.keys}개 더 필요해요. 경기에서 킬을 하면 열쇠를 받아요!`); }
        renderTitle();
      };
      card.appendChild(b);
    }
    arm.appendChild(card);
  }
  renderLoadout($('loadTitle'));
  $('sens').value = CONFIG.mouse_sens.value;
}
function flashMsg(s) { const m = $('msg'); m.textContent = s; m.classList.add('show'); clearTimeout(flashMsg.t); flashMsg.t = setTimeout(() => m.classList.remove('show'), 2200); }

/** Four slot columns; tap an unlocked weapon to take it. Locked ones show their price. */
function renderLoadout(box) {
  box.innerHTML = '';
  for (const sl of SLOTS) {
    const col = el('div', 'lcol');
    col.appendChild(el('div', 'lhead', `${sl.key} · ${sl.name}`));
    for (const id of weaponsInSlot(sl.id)) {
      const owned = save.unlocked.includes(id), on = save.loadout[sl.id] === id;
      const chip = el('button', 'chip' + (on ? ' on' : '') + (owned ? '' : ' locked'));
      chip.appendChild(iconCanvas(id, 64, 26, !owned));
      chip.appendChild(el('span', '', owned ? WEAPONS[id].name : `${WEAPONS[id].name} · 잠김`));
      chip.onclick = () => {
        if (!owned) { sfx.empty(); flashMsg('잠긴 무기는 경기 전 타이틀의 무기고에서 열쇠로 해금해요'); return; }
        save.loadout[sl.id] = id; writeSave(); sfx.ui(); renderLoadout(box);
      };
      col.appendChild(chip);
    }
    box.appendChild(col);
  }
}
/** A small top-down drawing of the maze type, from the same seed the match uses. */
function mapPreview(type) {
  const keep = seed; seed = Number(params.get('seed')) || CONFIG.seed;
  const m = genMaze(type); seed = keep;
  const c = document.createElement('canvas'), s = 120; c.width = c.height = s * 2; c.style.width = c.style.height = s + 'px';
  const g = c.getContext('2d'), k = s * 2 / m.N;
  g.fillStyle = hex(FLOOR_COLOR); g.fillRect(0, 0, s * 2, s * 2);
  for (let z = 0; z < m.N; z++) for (let x = 0; x < m.N; x++) if (m.g[z * m.N + x]) {
    const edge = x === 0 || z === 0 || x === m.N - 1 || z === m.N - 1;
    const zone = (x < m.N / 2 ? 0 : 1) + (z < m.N / 2 ? 0 : 2);
    g.fillStyle = edge ? '#f3f1ea' : m.plazaTiles.has(z * m.N + x) ? hex(PLAZA_COLOR) : hex(ZONE_COLORS[zone]);
    g.fillRect(x * k, z * k, k + 0.5, k + 0.5);
  }
  return c;
}

// ---- Starting, death, pause, results ------------------------------------------------------
function startMatch() {
  startAudio();
  reset(); scene = 'play';
  lockPointer();
  if (save.autoFull === undefined ? touchMode : save.autoFull) enterFull(true);
}
// ---- Fullscreen (and landscape on a tablet) ------------------------------------------------
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function fsSupported() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
}
function lockLandscape() {
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* this device keeps its own rotation */ }
}
/** Goes fullscreen; quiet=true when it is the automatic one at match start. */
function enterFull(quiet) {
  if (fsElement()) return;
  if (!fsSupported()) { if (!quiet) flashMsg(FS_NO); return; }
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
  try {
    const r = req.call(d, { navigationUI: 'hide' });
    if (r && r.then) r.then(lockLandscape).catch(() => { if (!quiet) flashMsg(FS_NO); });
    else lockLandscape();
  } catch (e) { if (!quiet) flashMsg(FS_NO); }
}
const FS_NO = '이 화면에서는 전체화면이 막혀 있어요. 게임 파일을 브라우저로 직접 열거나, 공유 링크의 새 탭에서 열어 보세요.';
function toggleFull() {
  sfx.ui();
  if (fsElement()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; try { const r = ex.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) { /* already out */ } }
  else enterFull(false);
}
function updateFsUi() {
  const on = !!fsElement();
  for (const id of ['fsTitle', 'fsPause']) { const b = $(id); if (b) b.textContent = on ? '전체화면 끄기' : '전체화면'; }
  const t = $('tFull'); if (t) t.textContent = on ? '창 모드' : '전체화면';
  const c = $('autoFull'); if (c) c.checked = save.autoFull === undefined ? touchMode : save.autoFull;
}
document.addEventListener('fullscreenchange', updateFsUi);
document.addEventListener('webkitfullscreenchange', updateFsUi);
/** A tablet held upright: ask to turn it, and pause a running match until it is. */
function isPortraitTouch() { return touchMode && innerHeight > innerWidth * 1.05; }

function toTitle() { unlockPointer(); scene = 'title'; reset(); renderTitle(); }
let lockedOnce = false, quietUnlock = false;
function lockPointer() {
  if (touchMode || noLock || !glCanvas.requestPointerLock) return;
  try { const r = glCanvas.requestPointerLock(); if (r && r.catch) r.catch(() => { noLock = true; }); } catch (e) { noLock = true; }
}
function unlockPointer() { if (document.pointerLockElement) { quietUnlock = true; document.exitPointerLock(); } }
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) { lockedOnce = true; return; }
  if (quietUnlock) { quietUnlock = false; return; }
  if (scene === 'play' && M && M.player.alive && !M.over && lockedOnce) scene = 'pause';
});

function renderResults() {
  const r = finishMatch(), p = M.player, win = M.winner === p;
  $('resTitle').textContent = win ? '승리! 먼저 ' + tune.kill_target + '킬 달성' : `${M.winner.name} 승리`;
  $('resTitle').className = win ? 'win' : '';
  const t = $('resTable'); t.innerHTML = '';
  const hdr = el('tr'); ['순위', '이름', '킬', '데스'].forEach(h => hdr.appendChild(el('th', '', h))); t.appendChild(hdr);
  r.ranked.forEach((a, i) => {
    const tr = el('tr', a.isPlayer ? 'me' : '');
    tr.appendChild(el('td', '', String(i + 1)));
    const n = el('td', 'nm'); const sw = el('i', 'sw'); sw.style.background = hex(a.look.shirt); n.appendChild(sw); n.appendChild(el('span', '', a.name)); tr.appendChild(n);
    tr.appendChild(el('td', '', String(a.kills))); tr.appendChild(el('td', '', String(a.deaths)));
    t.appendChild(tr);
  });
  const k = $('resKeys'); k.innerHTML = '';
  k.appendChild(keyCanvas(30));
  k.appendChild(el('span', 'big', ` +${r.total}`));
  k.appendChild(el('span', 'small', `  킬 ${p.kills}개 → ${r.fromKills}${r.bonus ? ` · ${r.rank}등 보너스 +${r.bonus}` : ''}  ·  보유 ${save.keys}개`));
  const next = WEAPON_IDS.filter(id => !save.unlocked.includes(id)).sort((a, b) => weaponPrice(a) - weaponPrice(b))[0];
  $('resNext').textContent = next
    ? (save.keys >= weaponPrice(next) ? `${WEAPONS[next].name}을(를) 해금할 수 있어요! 무기고로 가 보세요.` : `다음 해금: ${WEAPONS[next].name} (열쇠 ${weaponPrice(next)}개)`)
    : '모든 무기를 해금했어요!';
}

function renderDeath() {
  const kb = M.killedBy, p = M.player;
  $('deathTitle').textContent = kb === p ? '내 폭발에 당했다!' : `${kb ? kb.name : '누군가'}에게 당했다`;
  renderLoadout($('loadDeath'));
}

let domState = '';
/** Shows the right overlay for the scene; called every frame, cheap when nothing changed. */
function syncDom() {
  const dead = scene === 'play' && M && !M.player.alive && !M.over;
  const st = `${scene}|${dead}|${touchMode}`;
  if (st !== domState) {
    const wasDead = domState.includes('|true|');
    domState = st;
    $('menu').classList.toggle('show', scene === 'title');
    $('pause').classList.toggle('show', scene === 'pause');
    $('results').classList.toggle('show', scene === 'results');
    $('death').classList.toggle('show', dead);
    if (scene === 'title') renderTitle();
    updateFsUi();
    if (dead && !wasDead) { renderDeath(); unlockPointer(); }
    if (scene === 'pause') { $('sensP').value = CONFIG.mouse_sens.value; $('tsensP').value = CONFIG.touch_sens.value; $('muteBtn').textContent = muted ? '소리 켜기 (M)' : '소리 끄기 (M)'; }
  }
  const portrait = isPortraitTouch();
  $('rotate').classList.toggle('show', portrait && scene !== 'title');
  if (portrait && scene === 'play' && M && M.player.alive && !M.over) scene = 'pause';
  $('touch').classList.toggle('show', touchMode && !portrait && scene === 'play' && M && M.player.alive && !M.over);
  if (dead) {
    const left = tune.respawn_min - M.deathT, auto = Math.max(0, Math.ceil(tune.respawn_auto - M.deathT));
    const b = $('spawnBtn');
    b.disabled = left > 0;
    b.textContent = left > 0 ? `출전 대기 ${Math.ceil(left)}초` : (touchMode ? '출전!' : '출전! (Space)');
    $('spawnHint').textContent = `${auto}초 뒤 이 로드아웃으로 자동 출전`;
  }
}

// ---- Wiring the buttons -------------------------------------------------------------------
$('startBtn').onclick = () => { sfx.ui(); startMatch(); };
$('spawnBtn').onclick = () => { respawnPlayer(); if (M.player.alive) lockPointer(); };
$('resumeBtn').onclick = () => { scene = 'play'; lockPointer(); };
$('muteBtn').onclick = () => { setMuted(!muted); $('muteBtn').textContent = muted ? '소리 켜기 (M)' : '소리 끄기 (M)'; };
$('quitBtn').onclick = () => toTitle();
$('fsTitle').onclick = $('fsPause').onclick = () => toggleFull();
$('autoFull').onchange = e => { save.autoFull = e.target.checked; writeSave(); };
$('againBtn').onclick = () => startMatch();
$('armoryBtn').onclick = () => toTitle();
$('sens').oninput = $('sensP').oninput = e => { CONFIG.mouse_sens.value = Number(e.target.value); save.sens = CONFIG.mouse_sens.value; writeSave(); };
$('tsensP').oninput = e => { CONFIG.touch_sens.value = Number(e.target.value); save.touchSens = CONFIG.touch_sens.value; writeSave(); };

// ---- Mouse: pointer lock look, buttons, wheel -------------------------------------------------
// Where pointer lock is refused (some embedded pages), hold a mouse button and drag to aim.
let noLock = false;
document.addEventListener('pointerlockerror', () => { noLock = true; });
glCanvas.addEventListener('mousedown', e => {
  if (touchMode || scene !== 'play' || !M.player.alive) return;
  if (document.pointerLockElement !== glCanvas && !noLock) { lockPointer(); return; }
  const c = 'Mouse' + e.button; down.add(c); hit.add(c);
});
addEventListener('mouseup', e => down.delete('Mouse' + e.button));
addEventListener('mousemove', e => {
  const dragging = noLock && (e.buttons & 3);
  if ((document.pointerLockElement !== glCanvas && !dragging) || scene !== 'play' || !M.player.alive) return;
  const k = 0.0022 * tune.mouse_sens * (M.zoom ? camera.fov / tune.fov : 1);
  M.player.yaw -= e.movementX * k;
  M.player.pitch = Math.max(-1.45, Math.min(1.45, M.player.pitch - e.movementY * k));
});
addEventListener('wheel', e => { if (scene === 'play') mouseWheel = Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => { if (e.code === 'Tab') e.preventDefault(); });

// ---- Touch: left stick, right-side drag to look, buttons ---------------------------------------
(function touchControls() {
  const layer = $('touch'), stick = $('stick'), knob = $('knob');
  let stickId = null, lookId = null, so = { x: 0, y: 0 }, last = { x: 0, y: 0 }, fireLook = null;
  const R = 62;
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !touchMode) { touchMode = true; domState = ''; } }, true);
  function look(dx, dy) {
    if (!M || !M.player.alive) return;
    const k = 0.0058 * tune.touch_sens * (M.zoom ? camera.fov / tune.fov : 1);
    M.player.yaw -= dx * k;
    M.player.pitch = Math.max(-1.45, Math.min(1.45, M.player.pitch - dy * k * 0.8));
  }
  layer.addEventListener('pointerdown', e => {
    if (e.target !== layer) return;
    e.preventDefault();
    if (e.clientX < innerWidth * 0.42 && stickId === null) {
      stickId = e.pointerId; so = { x: e.clientX, y: e.clientY };
      stick.style.left = (so.x - 75) + 'px'; stick.style.top = (so.y - 75) + 'px'; stick.classList.add('on');
    } else if (lookId === null) { lookId = e.pointerId; last = { x: e.clientX, y: e.clientY }; }
    try { layer.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  });
  layer.addEventListener('pointermove', e => {
    if (e.pointerId === stickId) {
      let dx = e.clientX - so.x, dy = e.clientY - so.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      touch.mx = dx / R; touch.my = dy / R; touch.active = true;
    } else if (e.pointerId === lookId) { look(e.clientX - last.x, e.clientY - last.y); last = { x: e.clientX, y: e.clientY }; }
  });
  const end = e => {
    if (e.pointerId === stickId) { stickId = null; touch.mx = touch.my = 0; touch.active = false; knob.style.transform = ''; stick.classList.remove('on'); stick.style.left = ''; stick.style.top = ''; }
    if (e.pointerId === lookId) lookId = null;
  };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end);
  // Fire: hold to shoot, and drag on it to aim while shooting.
  const fire = $('tFire');
  fire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); touch.fire = true; touch.firePressed = true; fireLook = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { fire.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } });
  fire.addEventListener('pointermove', e => { if (fireLook && e.pointerId === fireLook.id) { look(e.clientX - fireLook.x, e.clientY - fireLook.y); fireLook.x = e.clientX; fireLook.y = e.clientY; } });
  const fireEnd = () => { touch.fire = false; fireLook = null; };
  fire.addEventListener('pointerup', fireEnd); fire.addEventListener('pointercancel', fireEnd);
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); startAudio(); fn(); });
  tap('tJump', () => { touch.jump = true; });
  tap('tReload', () => { touch.reload = true; });
  tap('tSwap', () => { touch.swap = true; });
  tap('tThrow', () => { touch.throwIt = true; });
  tap('tZoom', () => { touch.zoom = !touch.zoom; $('tZoom').classList.toggle('on', touch.zoom); });
  tap('tPause', () => { scene = 'pause'; });
  tap('tFull', () => toggleFull());
  const board = $('tBoard');
  board.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); touch.board = true; });
  board.addEventListener('pointerup', () => { touch.board = false; }); board.addEventListener('pointercancel', () => { touch.board = false; });
})();

// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// The match: actors (you and the bots), weapons, projectiles, damage, bot brains, respawns,
// the score and the end. Runs only on the fixed step.
'use strict';

const DIFFS = { easy: '쉬움', normal: '보통', hard: '어려움' };
const MAPS = { small: '좁은 미로', large: '큰 미로' };
const R_ACTOR = 0.4;           // collision radius (m)
const DEG = Math.PI / 180;

let M = null;                  // the current match; window.game.state reads it
const CHAR_CACHE = {};

/** Starts a new match with the saved settings: builds the maze, the actors and their first spawns. */
function newMatch() {
  clearFx();
  buildLevel(save.map);
  const actors = [];
  const player = makeActor(PLAYER_LOOK, true);
  actors.push(player);
  const n = tune.bot_count;
  for (let i = 0; i < n; i++) actors.push(makeActor(BOT_LOOKS[i % BOT_LOOKS.length], false));
  M = {
    t: 0, score: 0, gained: '', actors, player, proj: [], feed: [], over: false, winner: null, endT: 0,
    hitMark: null, hurtMarks: [], matchPoint: null, matchPointShown: false, shake: 0, recoil: 0, killedBy: null,
    diff: save.difficulty, map: save.map, introT: 4.5, zoom: false, deathT: 0, vmKick: 0, vmSwing: 0, vmReload: 0,
    vmThrow: 0, walkBob: 0, firstDeath: true, keysEarned: null,
  };
  for (const a of actors) spawn(a, true);
  equip(player, 'primary', true);
  return M;
}

/** A combatant. The player has no model in the world; bots have a blocky figure. */
function makeActor(look, isPlayer) {
  const a = {
    name: look.name, look, isPlayer, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vy: 0, yaw: 0, pyaw: 0, pitch: 0,
    hp: 0, alive: false, kills: 0, deaths: 0, loadout: Object.assign({}, save.loadout), cur: 'primary',
    ammo: {}, cool: 0, reloadT: 0, reloadMax: 0, respawnT: 0, onGround: true, moving: 0, walkPhase: 0,
    lastAttacker: null, lastKiller: null, c4: null, swingT: 0, swingW: null, swingAnim: 0, fireAnim: 0,
    ai: isPlayer ? null : { path: null, goal: null, target: null, react: 0, err: { y: 0, p: 0 }, errT: 0, strafe: 1,
      strafeT: 0, think: 0, lastSeen: null, lastSeenT: 0, stuckT: 0, throwCd: 3, c4T: 0, wanderT: 0 },
    model: null, held: null, heldModels: {},
  };
  if (!isPlayer) {
    // One figure per look, kept across matches.
    const c = CHAR_CACHE[look.name] || (CHAR_CACHE[look.name] = { model: makeCharacter(look), heldModels: {} });
    c.model.hand.clear();
    a.model = c.model; a.heldModels = c.heldModels;
    a.model.group.visible = false;
  }
  return a;
}

/** Puts an actor back into the maze: full health, fresh ammo, far from whoever killed it. */
function spawn(a, first) {
  const others = M.actors.filter(o => o !== a && o.alive);
  let best = null, bestS = -Infinity;
  for (let i = 0; i < 24; i++) {
    const [tx, tz] = L.floors[Math.floor(rng() * L.floors.length)];
    const x = tileCenter(tx), z = tileCenter(tz);
    let near = 60;
    for (const o of others) {
      const d = Math.hypot(o.x - x, o.z - z);
      near = Math.min(near, d - (d < 25 && lineOfSight(x, z, o.x, o.z) ? 18 : 0));
    }
    let s = near;
    if (a.lastKiller && a.lastKiller.alive) s += 0.5 * Math.min(60, Math.hypot(a.lastKiller.x - x, a.lastKiller.z - z));
    if (s > bestS) { bestS = s; best = [tx, tz]; }
  }
  a.x = a.px = tileCenter(best[0]); a.z = a.pz = tileCenter(best[1]); a.y = a.py = 0; a.vy = 0;
  // Face the longest open direction.
  let by = 0, bd = -1;
  for (let k = 0; k < 4; k++) {
    const yaw = k * Math.PI / 2, d = rayWall(a.x, a.z, -Math.sin(yaw), -Math.cos(yaw), 60);
    if (d > bd) { bd = d; by = yaw; }
  }
  a.yaw = a.pyaw = by; a.pitch = 0;
  a.hp = tune.max_health; a.alive = true; a.respawnT = 0; a.lastAttacker = null;
  a.cool = 0.3; a.reloadT = 0; a.swingT = 0; a.c4 = null;
  if (!a.isPlayer) {
    const pick = slot => { const ids = weaponsInSlot(slot); return ids[Math.floor(rng() * ids.length)]; };
    a.loadout = { primary: pick('primary'), secondary: pick('secondary'), melee: pick('melee'), throw: pick('throw') };
    const r = rng();
    a.cur = r < 0.55 ? 'primary' : r < 0.75 ? 'secondary' : 'melee';
    Object.assign(a.ai, { path: null, goal: null, target: null, lastSeen: null, throwCd: 2 + rng() * 4, c4T: 0, stuckT: 0 });
    a.model.group.visible = true;
    a.model.group.position.set(a.x, 0, a.z);
    L.scene.add(a.model.group);
  }
  a.ammo = {};
  for (const sl of SLOTS) {
    const id = a.loadout[sl.id], def = WEAPONS[id];
    if (def.kind === 'gun') a.ammo[id] = { mag: ws(id, 'mag') };
    else if (def.kind === 'rocket') a.ammo[id] = { mag: 1, reserve: Math.max(0, weaponCount(id) - 1) };
    else if (def.kind === 'grenade' || def.kind === 'c4') a.ammo[id] = { uses: weaponCount(id) };
    else a.ammo[id] = {};
  }
  if (a.isPlayer) { equip(a, 'primary', true); if (!first) M.introT = 0; }
}

/** Switches to a slot; drawing a weapon takes a moment and cancels a reload. */
function equip(a, slot, instant) {
  if (a.cur === slot && !instant) return;
  a.cur = slot; a.reloadT = 0; a.swingT = 0;
  if (!instant) a.cool = Math.max(a.cool, 0.28);
  if (a.isPlayer) { M.zoom = false; M.vmReload = 0; sfx.equip(); }
}
function curW(a) { return a.loadout[a.cur]; }

/** The direction an actor aims, from yaw and pitch, with optional extra spread (radians). */
function aimDir(yaw, pitch, spread) {
  let y = yaw, p = pitch;
  if (spread > 0) {
    const r = Math.sqrt(rng()) * spread, t = rng() * Math.PI * 2;
    y += Math.cos(t) * r; p += Math.sin(t) * r;
  }
  return { x: -Math.sin(y) * Math.cos(p), y: Math.sin(p), z: -Math.cos(y) * Math.cos(p) };
}
function eyeOf(a) { return { x: a.x, y: a.y + EYE, z: a.z }; }
/** Where shots and tracers leave from: the gun's muzzle, roughly. */
function muzzleOf(a) {
  const f = aimDir(a.yaw, a.pitch, 0), rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw);
  return a.isPlayer
    ? { x: a.x + f.x * 0.6 + rx * 0.18, y: a.y + EYE - 0.16 + f.y * 0.6, z: a.z + f.z * 0.6 + rz * 0.18 }
    : { x: a.x + f.x * 0.9 + rx * 0.3, y: a.y + 1.35 + f.y * 0.9, z: a.z + f.z * 0.9 + rz * 0.3 };
}

/** The current spread of a gun in radians, wider when moving or in the air. */
function spreadOf(a, id) {
  let s = ws(id, 'spread');
  if (WEAPONS[id].scope && a.isPlayer && M.zoom) s = 0.05;
  else if (a.isPlayer && M.zoom) s *= 0.55;
  if (a.moving > 0.3) s *= 1.6;
  if (!a.onGround) s *= 2.2;
  return s * DEG;
}

/** Trigger: does whatever the held weapon does, if it is ready. */
function attack(a, pressedNow) {
  if (!a.alive || a.cool > 0 || a.reloadT > 0) return;
  const id = curW(a), def = WEAPONS[id];
  if (!def.auto && !pressedNow) return;
  const am = a.ammo[id];
  switch (def.kind) {
    case 'gun': {
      if (am.mag <= 0) { if (pressedNow && a.isPlayer) { sfx.empty(); a.queue = 0; } startReload(a); return; }
      am.mag--; a.cool = ws(id, 'rate'); a.fireAnim = 1;
      fireHitscan(a, id);
      if (a.isPlayer) {
        M.recoil += ws(id, 'recoil') * DEG; M.vmKick = 1;
        if (am.mag <= Math.ceil(ws(id, 'mag') * 0.25) && am.mag > 0) sfx.lowAmmo();
      }
      if (am.mag <= 0) a.autoReload = true;
      break;
    }
    case 'rocket': {
      if (am.mag <= 0) { if (pressedNow && a.isPlayer) { sfx.empty(); a.queue = 0; } startReload(a); return; }
      am.mag--; a.cool = ws(id, 'rate'); a.fireAnim = 1;
      const e = eyeOf(a), d = aimDir(a.yaw, a.pitch, ws(id, 'spread') * DEG), m = muzzleOf(a);
      launch(a, 'rocket', m.x, m.y, m.z, d.x * 34, d.y * 34, d.z * 34);
      sfx.shot(id, e);
      alertBots(a, 30);
      if (a.isPlayer) { M.recoil += ws(id, 'recoil') * DEG; M.vmKick = 1.4; }
      if (am.mag <= 0 && am.reserve > 0) a.autoReload = true;
      break;
    }
    case 'melee': {
      a.cool = ws(id, 'rate'); a.swingT = 0.09; a.swingW = id; a.swingAnim = 1;
      if (a.isPlayer) M.vmSwing = 1;
      sfx.swing(id, eyeOf(a));
      break;
    }
    case 'grenade':
    case 'c4':
      throwItem(a, id);
      break;
  }
}

/** The throw slot without switching to it (G): throws, or sets off a placed C4. */
function throwItem(a, id) {
  id = id || a.loadout.throw;
  const def = WEAPONS[id], am = a.ammo[id];
  if (def.kind === 'c4' && a.c4 && !a.c4.dead) { explode(a.c4.x, a.c4.y, a.c4.z, 'c4', a); a.c4.dead = true; a.c4 = null; return; }
  if (!am || am.uses <= 0) { if (a.isPlayer) { sfx.empty(); a.queue = 0; } return; }
  if (a.cool > 0.05 && a.cur === 'throw') return;
  am.uses--; a.cool = Math.max(a.cool, ws(id, 'rate'));
  const d = aimDir(a.yaw, a.pitch + 0.12, 0), sp = tune.throw_speed * (def.kind === 'c4' ? 0.8 : 1);
  const m = muzzleOf(a);
  const p = launch(a, def.kind, m.x, m.y, m.z, d.x * sp, d.y * sp + 2, d.z * sp);
  if (def.kind === 'c4') a.c4 = p;
  if (a.isPlayer) M.vmThrow = 1;
  sfx.throwSnd(eyeOf(a));
}

function startReload(a) {
  const id = curW(a), def = WEAPONS[id], am = a.ammo[id];
  if (a.reloadT > 0) return;
  if (def.kind === 'gun' && am.mag < ws(id, 'mag')) { a.reloadT = a.reloadMax = ws(id, 'reload'); }
  else if (def.kind === 'rocket' && am.mag === 0 && am.reserve > 0) { a.reloadT = a.reloadMax = ws(id, 'reload'); }
  else return;
  if (a.isPlayer) { sfx.reload(); M.zoom = false; }
}
function finishReload(a) {
  const id = curW(a), def = WEAPONS[id], am = a.ammo[id];
  if (def.kind === 'gun') am.mag = ws(id, 'mag');
  else if (def.kind === 'rocket' && am.reserve > 0) { am.mag = 1; am.reserve--; }
}

/** A hitscan shot: the first wall, floor, body or head along the aim. */
function fireHitscan(a, id) {
  const o = eyeOf(a);
  let yaw = a.yaw, pitch = a.pitch;
  if (!a.isPlayer) { yaw += a.ai.err.y; pitch += a.ai.err.p; }
  const d = aimDir(yaw, pitch, spreadOf(a, id));
  const range = ws(id, 'range');
  let tBest = rayWorld(o, d, range), victim = null, head = false;
  for (const b of M.actors) {
    if (b === a || !b.alive) continue;
    const th = rayBox(o, d, b.x - 0.26, b.y + 1.46, b.z - 0.26, b.x + 0.26, b.y + 1.96, b.z + 0.26);
    const tb = rayBox(o, d, b.x - 0.46, b.y, b.z - 0.46, b.x + 0.46, b.y + 1.46, b.z + 0.46);
    if (th < tBest) { tBest = th; victim = b; head = true; }
    if (tb < tBest) { tBest = tb; victim = b; head = false; }
  }
  const hp = { x: o.x + d.x * tBest, y: o.y + d.y * tBest, z: o.z + d.z * tBest };
  spawnTracer(muzzleOf(a), hp);
  const mz = muzzleOf(a);
  if (!a.isPlayer) spawnFlash(mz.x, mz.y, mz.z, 0.22);
  sfx.shot(id, o);
  alertBots(a, 30);
  if (victim) {
    const dmg = ws(id, 'damage') * (head ? tune.headshot_mult : 1);
    spawnDebris(hp.x, hp.y, hp.z, head ? 6 : 4, [victim.look.shirt, victim.look.skin], 3, 0.09);
    hurt(victim, dmg, a, id, head);
  } else if (tBest < range) {
    spawnDebris(hp.x - d.x * 0.05, hp.y, hp.z - d.z * 0.05, 3, [surfaceColor(hp), 0xffffff], 2.5, 0.08);
  }
}
/** The colour of whatever a shot struck, for the chips it throws. */
function surfaceColor(p) {
  if (p.y < 0.05) return FLOOR_COLOR;
  const tx = tileOf(p.x), tz = tileOf(p.z);
  const zone = (tx < L.N / 2 ? 0 : 1) + (tz < L.N / 2 ? 0 : 2);
  return ZONE_COLORS[zone];
}

/** A rocket, grenade or C4 in flight. */
function launch(owner, type, x, y, z, vx, vy, vz) {
  const mesh = makeWeapon(type === 'rocket' ? 'rpg' : type);
  if (type === 'rocket') { mesh.clear(); part(mesh, 0.12, 0.12, 0.4, 0, 0, 0, 0x4f7a3a); part(mesh, 0.1, 0.1, 0.14, 0, 0, -0.26, 0xe0332e); part(mesh, 0.2, 0.02, 0.1, 0, 0, 0.18, 0x2c3a22); }
  if (type !== 'rocket') mesh.scale.setScalar(1.6);
  L.scene.add(mesh);
  const p = { type, owner, x, y, z, vx, vy, vz, life: type === 'grenade' ? tune.grenade_fuse : 12, stuck: false, dead: false, mesh, spin: 0 };
  M.proj.push(p);
  return p;
}
function stepProjectiles(dt) {
  for (const p of M.proj) {
    if (p.dead) continue;
    p.life -= dt;
    if (p.type === 'rocket') {
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      let boom = isWall(tileOf(nx), tileOf(nz)) || ny <= 0.05 || p.life <= 0;
      if (!boom) for (const b of M.actors) {
        if (!b.alive || b === p.owner) continue;
        if (Math.hypot(b.x - nx, b.z - nz) < 0.6 && ny > b.y - 0.1 && ny < b.y + 2.0) { boom = true; break; }
      }
      if (boom) { explode(p.x, Math.max(0.2, p.y), p.z, 'rpg', p.owner); p.dead = true; continue; }
      p.x = nx; p.y = ny; p.z = nz;
      if (rng() < 0.6) spawnDebris(p.x, p.y, p.z, 1, [0xdddddd, 0xbbbbbb], 0.6, 0.12);
    } else {
      if (!p.stuck) {
        p.vy -= tune.gravity * dt;
        let nx = p.x + p.vx * dt, nz = p.z + p.vz * dt, ny = p.y + p.vy * dt;
        const bounce = p.type === 'grenade' ? 0.45 : 0;
        if (isWall(tileOf(nx), tileOf(p.z))) { if (p.type === 'c4') { p.stuck = true; nx = p.x; } else { p.vx *= -bounce; nx = p.x; } }
        if (isWall(tileOf(nx), tileOf(nz))) { if (p.type === 'c4') { p.stuck = true; nz = p.z; } else { p.vz *= -bounce; nz = p.z; } }
        if (ny < 0.08) {
          ny = 0.08;
          if (p.type === 'c4') p.stuck = true;
          else { p.vy = Math.abs(p.vy) * bounce; p.vx *= 0.7; p.vz *= 0.7; if (Math.abs(p.vy) > 1.5) sfx.bounce({ x: p.x, y: p.y, z: p.z }); }
        }
        p.x = nx; p.y = ny; p.z = nz; p.spin += dt * 9;
        if (p.stuck) { p.vx = p.vy = p.vz = 0; sfx.bounce({ x: p.x, y: p.y, z: p.z }); }
      }
      if (p.type === 'grenade' && p.life <= 0) { explode(p.x, p.y + 0.2, p.z, 'grenade', p.owner); p.dead = true; }
      if (p.type === 'c4' && (p.owner.c4 !== p || !p.owner.alive)) { if (!p.owner.alive) p.dead = true; }
    }
  }
  for (const p of M.proj) if (p.dead && p.mesh) { L.scene.remove(p.mesh); p.mesh = null; }
  M.proj = M.proj.filter(p => !p.dead);
}

/** A blast: hurts everyone in its radius that it can reach, the thrower a little less. */
function explode(x, y, z, id, owner) {
  const r = ws(id, 'radius'), dmg = ws(id, 'damage');
  // Nudge the centre out of the wall it struck so line of sight works.
  const cx = isWall(tileOf(x), tileOf(z)) ? x - Math.sign(x - tileCenter(tileOf(x))) * 0.3 : x;
  const cz = isWall(tileOf(x), tileOf(z)) ? z - Math.sign(z - tileCenter(tileOf(z))) * 0.3 : z;
  spawnBlast(cx, y, cz, r * 0.55);
  sfx.boom({ x: cx, y, z: cz });
  alertBots(owner, 40);
  for (const b of M.actors) {
    if (!b.alive) continue;
    const d = Math.hypot(b.x - cx, b.y + 1 - y, b.z - cz);
    if (d > r || !lineOfSight(cx, cz, b.x, b.z)) continue;
    let k = Math.pow(1 - d / r, 0.6) * 0.85 + 0.15;
    if (b === owner) k *= tune.self_damage;
    b.vy = Math.max(b.vy, 4 * (1 - d / r)); b.onGround = false;
    hurt(b, dmg * k, owner, id, false, cx, cz);
  }
  if (M.player.alive) {
    const dp = Math.hypot(M.player.x - cx, M.player.z - cz);
    if (dp < 16) M.shake = Math.max(M.shake, 0.6 * (1 - dp / 16));
  }
}

/** Melee lands a moment after the swing starts: the nearest in front, or all of them for the scythe. */
function meleeHit(a) {
  const id = a.swingW, range = ws(id, 'range'), arc = Math.cos(WEAPONS[id].arc * DEG);
  const f = aimDir(a.yaw, 0, 0);
  const hits = [];
  for (const b of M.actors) {
    if (b === a || !b.alive) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > range + R_ACTOR || Math.abs(b.y - a.y) > 1.6) continue;
    if (d > 0.01 && (dx * f.x + dz * f.z) / d < arc) continue;
    if (!lineOfSight(a.x, a.z, b.x, b.z)) continue;
    hits.push([d, b]);
  }
  hits.sort((p, q) => p[0] - q[0]);
  const list = WEAPONS[id].sweep ? hits : hits.slice(0, 1);
  for (const [, b] of list) {
    spawnDebris(b.x, b.y + 1.1, b.z, 5, [b.look.shirt, b.look.skin], 3, 0.1);
    sfx.thud(eyeOf(b));
    hurt(b, ws(id, 'damage'), a, id, false);
  }
}

/** Damage: marks for you, a turn for a bot, a kill at zero. */
function hurt(b, amount, by, id, head, fx_, fz_) {
  if (!b.alive || M.over && M.endT <= 0) return;
  b.hp -= amount;
  b.lastAttacker = by;
  const sx = fx_ !== undefined ? fx_ : by.x, sz = fz_ !== undefined ? fz_ : by.z;
  if (b.isPlayer && by !== b) {
    M.hurtMarks.push({ ang: Math.atan2(-(sx - b.x), -(sz - b.z)), life: 1.1 });
    M.shake = Math.max(M.shake, 0.18); sfx.hurt();
  }
  if (by.isPlayer && b !== by) { M.hitMark = { life: 0.28, kill: false, head }; sfx.tick(head); }
  if (!b.isPlayer && by !== b && b.alive) {
    const ai = b.ai;
    if (!ai.target || !ai.target.alive) { ai.lastSeen = { x: by.x, z: by.z }; ai.lastSeenT = 4; }
  }
  if (b.hp <= 0) kill(b, by, id);
}

function kill(b, by, id) {
  b.alive = false; b.hp = 0; b.deaths++; b.respawnT = 0; b.lastKiller = by;
  if (b.c4) { b.c4.dead = true; b.c4 = null; }
  if (by !== b) by.kills++;
  M.feed.push({ killer: by, victim: b, weapon: id, life: 6 });
  if (M.feed.length > 6) M.feed.shift();
  events.push({ type: 'kill', killer: by.name, victim: b.name, weapon: id });
  // Burst into blocks.
  const cols = [b.look.shirt, b.look.pants, b.look.skin, b.look.shirt];
  spawnDebris(b.x, b.y + 1.0, b.z, 22, cols, 5, 0.26);
  if (b.model) b.model.group.visible = false;
  if (by.isPlayer && b !== by) { M.hitMark = { life: 0.45, kill: true }; sfx.kill(); }
  if (b.isPlayer) { M.killedBy = by; M.deathT = 0; M.zoom = false; sfx.death(); }
  else sfx.pop(eyeOf(b));
  M.score = M.player.kills;
  const target = tune.kill_target;
  if (by !== b && by.kills >= target && !M.over) {
    M.over = true; M.winner = by; M.endT = 2.2;
    events.push({ type: 'win', winner: by.name });
    sfx.fanfare(by.isPlayer);
  } else if (by !== b && by.kills === target - 1 && !M.over) {
    M.matchPoint = { name: by.name, life: 2.8, you: by.isPlayer }; sfx.matchPoint();
  }
}

/** A gunshot is heard: idle bots nearby come to look. */
function alertBots(src, radius) {
  for (const b of M.actors) {
    if (b.isPlayer || !b.alive || b === src) continue;
    if (b.ai.target && b.ai.target.alive) continue;
    if (Math.hypot(b.x - src.x, b.z - src.z) < radius) { b.ai.lastSeen = { x: src.x, z: src.z }; b.ai.lastSeenT = 3.5; b.ai.path = null; }
  }
}

/** Moves with wall sliding, one axis at a time. */
function moveActor(a, dx, dz) {
  if (!blocked(a.x + dx, a.z, R_ACTOR)) a.x += dx;
  if (!blocked(a.x, a.z + dz, R_ACTOR)) a.z += dz;
}
function gravityStep(a, dt) {
  a.vy -= tune.gravity * dt; a.y += a.vy * dt;
  if (a.y <= 0) { a.y = 0; a.vy = 0; a.onGround = true; } else a.onGround = false;
}

// ---- You -----------------------------------------------------------------------------------
const touch = { mx: 0, my: 0, fire: false, firePressed: false, zoom: false, active: false };
let mouseWheel = 0;
function playerStep(p, dt) {
  if (!p.alive) return;
  const turn = tune.key_turn_speed * dt * (M.zoom ? 0.4 : 1);
  if (down.has('ArrowLeft')) p.yaw += turn;
  if (down.has('ArrowRight')) p.yaw -= turn;
  if (down.has('ArrowUp')) p.pitch += turn * 0.7;
  if (down.has('ArrowDown')) p.pitch -= turn * 0.7;
  p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));
  let fx = (down.has('KeyD') ? 1 : 0) - (down.has('KeyA') ? 1 : 0) + touch.mx;
  let fz = (down.has('KeyS') ? 1 : 0) - (down.has('KeyW') ? 1 : 0) + touch.my;
  const len = Math.hypot(fx, fz);
  if (len > 1) { fx /= len; fz /= len; }
  const sprinting = (down.has('ShiftLeft') || down.has('ShiftRight') || len > 0.95 && touch.active && touch.my < -0.9) && fz < 0 && !M.zoom;
  let sp = sprinting ? tune.sprint_speed : tune.move_speed;
  if (M.zoom) sp *= 0.55;
  if (WEAPONS[curW(p)].kind === 'melee') sp *= 1.08;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const dx = (c * fx + s * fz) * sp * dt, dz = (-s * fx + c * fz) * sp * dt;
  const bx = p.x, bz = p.z;
  moveActor(p, dx, dz);
  p.moving = Math.hypot(p.x - bx, p.z - bz) / dt / tune.move_speed;
  if ((pressed('Space') || touch.jump) && p.onGround) { p.vy = tune.jump_speed; p.onGround = false; sfx.jump(); }
  touch.jump = false;
  gravityStep(p, dt);
  if (p.moving > 0.1 && p.onGround) { p.walkPhase += dt * 9 * Math.min(1.5, p.moving); }

  // Weapons.
  for (let i = 0; i < 4; i++) if (pressed('Digit' + (i + 1))) equip(p, SLOTS[i].id);
  if (pressed('KeyQ') || mouseWheel !== 0 || touch.swap) {
    const dir = mouseWheel < 0 ? -1 : 1;
    const i = SLOTS.findIndex(s => s.id === p.cur);
    equip(p, SLOTS[(i + dir + 4) % 4].id);
  }
  mouseWheel = 0; touch.swap = false;
  if (pressed('KeyR') || touch.reload) startReload(p);
  touch.reload = false;
  if (pressed('KeyG') || touch.throwIt) throwItem(p);
  touch.throwIt = false;
  const def = WEAPONS[curW(p)];
  if (def.kind !== 'gun') touch.zoom = false;
  const wantZoom = (down.has('Mouse2') || down.has('KeyE') || touch.zoom) && def.kind === 'gun' && p.reloadT <= 0;
  M.zoom = wantZoom;
  const held = down.has('Mouse0') || down.has('KeyF') || touch.fire;
  const now = hit.has('Mouse0') || hit.has('KeyF') || touch.firePressed;
  touch.firePressed = false;
  // A tap during the draw or between shots is kept for a moment, so semi-auto shots are never lost.
  if (now) p.queue = 0.22;
  p.queue = Math.max(0, (p.queue || 0) - dt);
  if (held || p.queue > 0) {
    const before = p.cool;
    attack(p, p.queue > 0);
    if (p.cool > before || p.reloadT > 0) p.queue = 0;
  }
  if (p.autoReload && p.cool <= 0) { p.autoReload = false; startReload(p); }
}

// ---- Bots ----------------------------------------------------------------------------------
function diffVal(name) { return tune[`${name}_${M.diff}`]; }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
/** True when bot b would notice o: in sight range, in its view cone or very close, and no wall between. */
function canSee(b, o) {
  const dx = o.x - b.x, dz = o.z - b.z, d = Math.hypot(dx, dz);
  if (d > tune.bot_sight) return false;
  if (d > 7) {
    const want = Math.atan2(-dx, -dz);
    if (Math.abs(angDiff(want, b.yaw)) > tune.bot_fov * DEG / 2) return false;
  }
  return lineOfSight(b.x, b.z, o.x, o.z);
}
function wanderGoal(b) {
  const p = M.player;
  if (p.alive && rng() < tune.bot_hunt_player) {
    const ptx = tileOf(p.x), ptz = tileOf(p.z);
    const near = L.floors.filter(([x, z]) => Math.abs(x - ptx) + Math.abs(z - ptz) <= 6);
    if (near.length) return near[Math.floor(rng() * near.length)];
  }
  return L.floors[Math.floor(rng() * L.floors.length)];
}
function followPath(b, dt, speed) {
  const ai = b.ai;
  if (!ai.path || !ai.path.length) return false;
  const [tx, tz] = ai.path[0], cx = tileCenter(tx), cz = tileCenter(tz);
  const dx = cx - b.x, dz = cz - b.z, d = Math.hypot(dx, dz);
  if (d < 0.6) { ai.path.shift(); return true; }
  moveActor(b, dx / d * speed * dt, dz / d * speed * dt);
  return true;
}
function botStep(b, dt) {
  if (!b.alive) return;
  const ai = b.ai, speed = tune.bot_speed;
  const id = curW(b), def = WEAPONS[id];
  ai.think -= dt;
  if (ai.think <= 0) {
    ai.think = 0.15;
    let best = null, bd = Infinity;
    for (const o of M.actors) {
      if (o === b || !o.alive) continue;
      const d = Math.hypot(o.x - b.x, o.z - b.z);
      const sees = canSee(b, o) || (o === b.lastAttacker && d < 30 && lineOfSight(b.x, b.z, o.x, o.z));
      if (sees && d < bd) { bd = d; best = o; }
    }
    if (best && best !== ai.target) {
      ai.react = diffVal('bot_react') * (0.8 + rng() * 0.5);
    }
    ai.target = best;
    if (best) { ai.lastSeen = { x: best.x, z: best.z }; ai.lastSeenT = 4; ai.path = null; }
  }
  const bx = b.x, bz = b.z;
  let faceYaw = null, facePitch = 0;
  const t = ai.target && ai.target.alive ? ai.target : null;
  if (t) {
    ai.react -= dt;
    const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
    const ux = dx / d, uz = dz / d;
    const pref = def.pref;
    let mx = 0, mz = 0;
    if (d > pref + 2) { mx += ux; mz += uz; }
    else if (d < pref - 3 && def.kind !== 'melee') { mx -= ux * 0.8; mz -= uz * 0.8; }
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafe = rng() < 0.5 ? -1 : 1; ai.strafeT = 0.5 + rng() * 0.9; if (rng() < 0.15 && b.onGround) b.vy = tune.jump_speed * 0.9; }
    if (def.kind !== 'melee') { mx += -uz * ai.strafe * 0.8; mz += ux * ai.strafe * 0.8; }
    const ml = Math.hypot(mx, mz);
    if (ml > 0.01) moveActor(b, mx / ml * speed * dt, mz / ml * speed * dt);
    // Aim at the chest (sometimes the head when hard), feet for rockets.
    const aimY = def.kind === 'rocket' ? 0.4 : M.diff === 'hard' && ai.headAim ? 1.7 : 1.15;
    faceYaw = Math.atan2(-dx, -dz);
    facePitch = Math.atan2(t.y + aimY - (b.y + EYE), d);
    ai.errT -= dt;
    if (ai.errT <= 0) {
      const e = diffVal('bot_aim') * DEG;
      ai.err = { y: (rng() * 2 - 1) * e, p: (rng() * 2 - 1) * e * 0.6 };
      ai.errT = 0.35 + rng() * 0.35; ai.headAim = rng() < 0.3;
    }
    // Fire when ready, roughly on target and in range.
    const aimed = Math.abs(angDiff(faceYaw, b.yaw)) < 0.14 + 0.6 / Math.max(1, d);
    if (ai.react <= 0 && aimed) {
      if (def.kind === 'melee') { if (d < ws(id, 'range') * 0.95) attack(b, true); }
      else if (d < ws(id, 'range') && !(def.kind === 'rocket' && d < 4)) attack(b, true);
    }
    // Throwables now and then at middle range.
    ai.throwCd -= dt;
    const tid = b.loadout.throw, tam = b.ammo[tid];
    if (ai.throwCd <= 0 && d > 7 && d < 18 && tam && tam.uses > 0 && rng() < 0.03 && ai.react <= 0) {
      const savePitch = b.pitch; b.yaw = faceYaw; b.pitch = 0.1 + d * 0.012;
      throwItem(b, tid); b.pitch = savePitch;
      ai.throwCd = tune.bot_throw_cooldown * (0.7 + rng() * 0.6);
      if (WEAPONS[tid].kind === 'c4') ai.c4T = 1.3;
    }
  } else {
    ai.lastSeenT -= dt;
    if (ai.lastSeen && ai.lastSeenT > 0) {
      if (!ai.path) ai.path = findPath(tileOf(b.x), tileOf(b.z), tileOf(ai.lastSeen.x), tileOf(ai.lastSeen.z)) || [];
      if (!followPath(b, dt, speed)) ai.lastSeen = null;
    } else {
      ai.wanderT -= dt;
      if (!ai.path || !ai.path.length || ai.wanderT <= 0) {
        const [gx, gz] = wanderGoal(b);
        ai.path = findPath(tileOf(b.x), tileOf(b.z), gx, gz) || [];
        ai.wanderT = 9;
      }
      followPath(b, dt, speed * 0.85);
    }
    const mdx = b.x - bx, mdz = b.z - bz;
    if (Math.hypot(mdx, mdz) > 0.001) faceYaw = Math.atan2(-mdx, -mdz);
  }
  // C4: set it off when someone is near it, or soon after it lands.
  if (b.c4 && !b.c4.dead) {
    ai.c4T -= dt;
    let near = false;
    for (const o of M.actors) if (o !== b && o.alive && Math.hypot(o.x - b.c4.x, o.z - b.c4.z) < ws('c4', 'radius') * 0.6) near = true;
    const selfFar = Math.hypot(b.x - b.c4.x, b.z - b.c4.z) > ws('c4', 'radius') * 0.8;
    if ((near && selfFar) || ai.c4T < -2.5) throwItem(b, 'c4');
  }
  // Turn toward what it wants to face, at the difficulty's turn speed.
  if (faceYaw !== null) {
    const maxT = diffVal('bot_turn') * dt, dy = angDiff(faceYaw, b.yaw);
    b.yaw += Math.max(-maxT, Math.min(maxT, dy));
    b.pitch += Math.max(-maxT, Math.min(maxT, facePitch - b.pitch));
  }
  // Stuck on a corner: pick a new goal.
  const moved = Math.hypot(b.x - bx, b.z - bz);
  b.moving = moved / dt / tune.move_speed;
  if (moved < speed * dt * 0.2) { ai.stuckT += dt; if (ai.stuckT > 0.8) { ai.path = null; ai.wanderT = 0; ai.stuckT = 0; ai.strafe *= -1; } }
  else ai.stuckT = 0;
  gravityStep(b, dt);
  if (b.moving > 0.1) b.walkPhase += dt * 9 * Math.min(1.4, b.moving);
  if (b.autoReload && b.cool <= 0) { b.autoReload = false; startReload(b); }
}

// ---- The match step -------------------------------------------------------------------------
function matchStep(dt) {
  M.t += dt;
  if (M.over) { M.endT -= dt; dt *= 0.35; }
  for (const a of M.actors) { a.px = a.x; a.py = a.y; a.pz = a.z; a.pyaw = a.yaw; }
  const p = M.player;
  playerStep(p, dt);
  for (const a of M.actors) if (!a.isPlayer) botStep(a, dt);
  for (const a of M.actors) {
    if (!a.alive) {
      a.respawnT += dt;
      if (!a.isPlayer && a.respawnT >= tune.bot_respawn && !M.over) spawn(a);
      continue;
    }
    if (a.cool > 0) a.cool -= dt;
    if (a.reloadT > 0) { a.reloadT -= dt; if (a.reloadT <= 0) { a.reloadT = 0; finishReload(a); } }
    if (a.swingT > 0) { a.swingT -= dt; if (a.swingT <= 0) meleeHit(a); }
    a.swingAnim = Math.max(0, a.swingAnim - dt * 3.2);
    a.fireAnim = Math.max(0, a.fireAnim - dt * 8);
  }
  stepProjectiles(dt);
  updateFx(dt);
  // Your death: the loadout screen, then a respawn when you choose (or on the auto timer).
  if (!p.alive && !M.over) {
    M.deathT += dt;
    if (M.deathT >= tune.respawn_auto) respawnPlayer();
  }
  // Fading marks.
  if (M.hitMark) { M.hitMark.life -= dt; if (M.hitMark.life <= 0) M.hitMark = null; }
  for (const h of M.hurtMarks) h.life -= dt;
  M.hurtMarks = M.hurtMarks.filter(h => h.life > 0);
  for (const f of M.feed) f.life -= dt;
  M.feed = M.feed.filter(f => f.life > 0);
  if (M.matchPoint) { M.matchPoint.life -= dt; if (M.matchPoint.life <= 0) M.matchPoint = null; }
  M.shake = Math.max(0, M.shake - dt * 1.6);
  M.recoil *= Math.exp(-dt * 9);
  M.vmKick = Math.max(0, M.vmKick - dt * 9); M.vmSwing = Math.max(0, M.vmSwing - dt * 3.4);
  M.vmThrow = Math.max(0, M.vmThrow - dt * 3);
  M.introT = Math.max(0, M.introT - dt);
  M.score = p.kills;
}
/** Called by the loadout screen's button, Space, or the auto timer. */
function respawnPlayer() {
  const p = M.player;
  if (p.alive || M.over) return;
  if (M.deathT < tune.respawn_min) return;
  p.loadout = Object.assign({}, save.loadout);
  spawn(p);
  writeSave();
  M.firstDeath = false;
}

/** Ranks and keys at the end. Keys are added to the save once. */
function finishMatch() {
  if (M.keysEarned) return M.keysEarned;
  const ranked = M.actors.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const rank = ranked.indexOf(M.player) + 1;
  const fromKills = M.player.kills * tune.keys_per_kill;
  const bonus = rank === 1 ? tune.keys_rank1 : rank <= 3 ? tune.keys_rank23 : 0;
  M.keysEarned = { ranked, rank, fromKills, bonus, total: fromKills + bonus };
  save.keys += M.keysEarned.total; save.matches = (save.matches || 0) + 1; writeSave();
  M.gained = `${rank}등 · 열쇠 +${M.keysEarned.total}`;
  return M.keysEarned;
}

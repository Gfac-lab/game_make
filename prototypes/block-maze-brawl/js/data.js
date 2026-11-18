// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// Weapons, loadout slots, bot names and the save (keys, unlocked weapons, last loadout).
'use strict';

/** The four loadout slots, in key order 1..4. */
const SLOTS = [
  { id: 'primary', name: '주무기', key: '1' },
  { id: 'secondary', name: '보조', key: '2' },
  { id: 'melee', name: '근접', key: '3' },
  { id: 'throw', name: '투척', key: '4' },
];

/**
 * Every weapon. Numbers come from config.js through ws(id, stat).
 * kind: gun (hitscan) | rocket | melee | grenade | c4. pref: the range a bot likes to fight at (m).
 */
const WEAPONS = {
  rifle:    { name: '라이플',   slot: 'primary',   kind: 'gun',    auto: true,  pref: 14, starter: true },
  sniper:   { name: '스나이퍼', slot: 'primary',   kind: 'gun',    auto: false, pref: 28, scope: true },
  uzi:      { name: '우지',     slot: 'primary',   kind: 'gun',    auto: true,  pref: 6 },
  rpg:      { name: 'RPG',      slot: 'primary',   kind: 'rocket', auto: false, pref: 15 },
  pistol:   { name: '권총',     slot: 'secondary', kind: 'gun',    auto: false, pref: 10, starter: true },
  revolver: { name: '리볼버',   slot: 'secondary', kind: 'gun',    auto: false, pref: 12 },
  fist:     { name: '맨주먹',   slot: 'melee',     kind: 'melee',  auto: true,  pref: 1.2, starter: true, arc: 40 },
  knife:    { name: '칼',       slot: 'melee',     kind: 'melee',  auto: true,  pref: 1.3, arc: 40 },
  scythe:   { name: '낫',       slot: 'melee',     kind: 'melee',  auto: true,  pref: 2.0, arc: 70, sweep: true },
  grenade:  { name: '수류탄',   slot: 'throw',     kind: 'grenade', auto: false, pref: 12, starter: true },
  c4:       { name: 'C4',       slot: 'throw',     kind: 'c4',     auto: false, pref: 10 },
};
for (const id in WEAPONS) WEAPONS[id].id = id;
const WEAPON_IDS = Object.keys(WEAPONS);

/** A weapon's tuning value, read live from config.js (e.g. ws('rifle', 'damage')). */
function ws(id, stat) {
  const c = CONFIG[`${id}_${stat}`];
  return c ? c.value : 0;
}
/** The keys a weapon costs; starters cost nothing. */
function weaponPrice(id) { return WEAPONS[id].starter ? 0 : (CONFIG[`price_${id}`] ? CONFIG[`price_${id}`].value : 0); }
function weaponsInSlot(slot) { return WEAPON_IDS.filter(id => WEAPONS[id].slot === slot); }
/** Uses per life for rockets and throwables; guns have endless reserve. */
function weaponCount(id) { return ws(id, 'count') || 0; }

const BOT_LOOKS = [
  { name: 'BOT 블루',   shirt: 0x2f7bf5, pants: 0x1e3a6e, skin: 0xffd23f },
  { name: 'BOT 레몬',   shirt: 0xffd43b, pants: 0x6b4f1d, skin: 0xf2c49b },
  { name: 'BOT 민트',   shirt: 0x2fd6a0, pants: 0x205c4a, skin: 0xb5835a },
  { name: 'BOT 코랄',   shirt: 0xff6f5e, pants: 0x5a2a2a, skin: 0xffd23f },
  { name: 'BOT 포도',   shirt: 0x9a5cf0, pants: 0x3a2466, skin: 0xf6d7b8 },
  { name: 'BOT 오렌지', shirt: 0xff9a2e, pants: 0x3d3d4a, skin: 0x8d5a3b },
  { name: 'BOT 핑크',   shirt: 0xff7ac8, pants: 0x4a2a55, skin: 0xffd23f },
  { name: 'BOT 라임',   shirt: 0x9be33b, pants: 0x2e4a1c, skin: 0xe8b88a },
  { name: 'BOT 하늘',   shirt: 0x5ecbf5, pants: 0x24485a, skin: 0xffd23f },
  { name: 'BOT 체리',   shirt: 0xe0304a, pants: 0x222831, skin: 0xc68a62 },
  { name: 'BOT 모카',   shirt: 0xa0704a, pants: 0x3a2a1e, skin: 0xffe0bd },
];
const PLAYER_LOOK = { name: '나', shirt: 0xffffff, pants: 0x2b2f3a, skin: 0xffd23f };

// ---- The save: one key in this browser's storage; every read and write is guarded ----------
const SAVE_KEY = 'blockMazeBrawl.v1';
const save = loadSave();
function defaultSave() {
  return {
    keys: 0,
    unlocked: WEAPON_IDS.filter(id => WEAPONS[id].starter),
    loadout: { primary: 'rifle', secondary: 'pistol', melee: 'fist', throw: 'grenade' },
    difficulty: 'normal', map: 'small', sens: 1, matches: 0,
  };
}
function loadSave() {
  const d = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      Object.assign(d, s);
      d.unlocked = Array.from(new Set([...defaultSave().unlocked, ...(s.unlocked || [])])).filter(id => WEAPONS[id]);
      for (const sl of SLOTS) if (!d.unlocked.includes(d.loadout[sl.id]) || WEAPONS[d.loadout[sl.id]].slot !== sl.id) d.loadout[sl.id] = defaultSave().loadout[sl.id];
    }
  } catch (e) { /* private window or blocked storage: play with a fresh save */ }
  return d;
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked: progress lasts this visit */ }
}
/** Spend keys to unlock a weapon for good. Returns true when bought. */
function buyWeapon(id) {
  if (save.unlocked.includes(id)) return false;
  const p = weaponPrice(id);
  if (save.keys < p) return false;
  save.keys -= p; save.unlocked.push(id); writeSave();
  return true;
}
// The address may pick the map or difficulty (?map=large&diff=hard), for a shared link or a check.
if (params.get('map') in { small: 1, large: 1 }) save.map = params.get('map');
if (params.get('diff') in { easy: 1, normal: 1, hard: 1 }) save.difficulty = params.get('diff');

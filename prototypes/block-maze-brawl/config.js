// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Match ----
  kill_target: { value: 20, min: 5, max: 50, step: 1 },          // kills to win
  bot_count: { value: 7, min: 1, max: 11, step: 1 },              // bots in the match
  respawn_min: { value: 3, min: 1, max: 8, step: 0.5 },           // s before you may respawn
  respawn_auto: { value: 10, min: 4, max: 30, step: 1 },          // s until auto respawn with last loadout
  bot_respawn: { value: 3, min: 1, max: 8, step: 0.5 },           // s
  max_health: { value: 100, min: 50, max: 300, step: 10 },        // no regen: refills only on respawn
  headshot_mult: { value: 1.6, min: 1, max: 3, step: 0.1 },

  // ---- Keys and the armory ----
  keys_per_kill: { value: 1, min: 0, max: 5, step: 1 },
  keys_rank1: { value: 5, min: 0, max: 20, step: 1 },             // bonus for 1st place
  keys_rank23: { value: 2, min: 0, max: 10, step: 1 },            // bonus for 2nd and 3rd
  price_knife: { value: 4, min: 0, max: 60, step: 1 },
  price_revolver: { value: 6, min: 0, max: 60, step: 1 },
  price_uzi: { value: 8, min: 0, max: 60, step: 1 },
  price_scythe: { value: 8, min: 0, max: 60, step: 1 },
  price_sniper: { value: 12, min: 0, max: 60, step: 1 },
  price_c4: { value: 12, min: 0, max: 60, step: 1 },
  price_rpg: { value: 15, min: 0, max: 60, step: 1 },

  // ---- Player movement ----
  move_speed: { value: 7, min: 3, max: 14, step: 0.5 },           // m/s
  sprint_speed: { value: 10, min: 5, max: 18, step: 0.5 },        // m/s
  jump_speed: { value: 7, min: 3, max: 12, step: 0.5 },           // m/s up
  gravity: { value: 20, min: 8, max: 40, step: 1 },               // m/s²
  mouse_sens: { value: 1, min: 0.2, max: 3, step: 0.05 },         // the pause screen sets it
  touch_sens: { value: 1, min: 0.2, max: 3, step: 0.05 },
  melee_speed_mult: { value: 1.15, min: 1, max: 1.5, step: 0.01 },   // run faster with a melee weapon out
  key_turn_speed: { value: 2.6, min: 0.5, max: 6, step: 0.1 },    // rad/s, arrow keys turn
  fov: { value: 75, min: 60, max: 100, step: 1 },                 // degrees
  zoom_fov: { value: 22, min: 10, max: 50, step: 1 },             // sniper scope

  // ---- Bots ----  easy / normal / hard
  bot_react_easy: { value: 0.6, min: 0.1, max: 1.5, step: 0.05 },   // s before first shot at a new target
  bot_react_normal: { value: 0.42, min: 0.1, max: 1.5, step: 0.05 },
  bot_react_hard: { value: 0.27, min: 0.05, max: 1.5, step: 0.05 },
  bot_aim_easy: { value: 6.5, min: 0, max: 15, step: 0.25 },        // deg of aim error
  bot_aim_normal: { value: 3.6, min: 0, max: 15, step: 0.25 },
  bot_aim_hard: { value: 1.9, min: 0, max: 15, step: 0.25 },
  bot_turn_easy: { value: 3.2, min: 1, max: 15, step: 0.25 },       // rad/s
  bot_turn_normal: { value: 5, min: 1, max: 15, step: 0.25 },
  bot_turn_hard: { value: 7.5, min: 1, max: 15, step: 0.25 },
  bot_speed: { value: 6.3, min: 2, max: 12, step: 0.25 },           // m/s
  bot_sight: { value: 55, min: 10, max: 120, step: 1 },              // m
  bot_fov: { value: 120, min: 40, max: 360, step: 5 },               // deg; very close always noticed
  bot_hunt_player: { value: 0.45, min: 0, max: 1, step: 0.05 },     // share of wander goals near you
  bot_throw_cooldown: { value: 7, min: 1, max: 30, step: 0.5 },      // s between grenade/C4 throws

  // ---- Explosives ----
  grenade_fuse: { value: 2.2, min: 0.5, max: 5, step: 0.1 },
  throw_speed: { value: 15, min: 5, max: 30, step: 0.5 },
  self_damage: { value: 0.5, min: 0, max: 1, step: 0.05 },          // your own blast hurts you this much
};

// Each weapon's numbers: damage, time between attacks (s), magazine, reload (s), spread (deg),
// recoil (deg), range (m), radius (m, explosives). Added as flat entries: rifle_damage, rifle_rate...
(function () {
  const W = (id, v) => {
    const spec = {
      damage: [1, 250, 1], rate: [0.03, 3, 0.01], mag: [1, 100, 1], reload: [0.2, 5, 0.1],
      spread: [0, 15, 0.1], recoil: [0, 10, 0.1], range: [1, 200, 0.5], radius: [0.5, 12, 0.25],
      count: [0, 10, 1],
    };
    for (const k in v) {
      const [min, max, step] = spec[k];
      CONFIG[`${id}_${k}`] = { value: v[k], min, max, step };
    }
  };
  W('rifle',    { damage: 22, rate: 0.1,  mag: 30, reload: 1.8, spread: 1.1, recoil: 0.7, range: 120 });
  W('sniper',   { damage: 100, rate: 1.15, mag: 5,  reload: 2.4, spread: 7,   recoil: 4.5, range: 200 }); // spread is unscoped
  W('uzi',      { damage: 15, rate: 0.055,mag: 32, reload: 1.5, spread: 3.2, recoil: 0.45, range: 60 });
  W('rpg',      { damage: 120,rate: 0.6,  mag: 1,  reload: 2.0, spread: 0.3, recoil: 5,   range: 120, radius: 4.2, count: 4 });
  W('pistol',   { damage: 25, rate: 0.22, mag: 12, reload: 1.3, spread: 1.3, recoil: 1.6, range: 80 });
  W('revolver', { damage: 63, rate: 0.55, mag: 6,  reload: 2.2, spread: 0.9, recoil: 4,   range: 100 });
  W('fist',     { damage: 25, rate: 0.42, range: 2.1 });
  W('knife',    { damage: 45, rate: 0.38, range: 2.3 });
  W('scythe',   { damage: 75, rate: 0.85, range: 3.3 });
  W('grenade',  { damage: 110,rate: 0.8,  radius: 5,   count: 2 });
  W('c4',       { damage: 150,rate: 0.6,  radius: 5.5, count: 1 });
})();

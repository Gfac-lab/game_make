// PROTOTYPE - NOT FOR PRODUCTION
// Question: 키우고 → 팔고 → 뽑고 → 합치는 고리가 10분 넘게 '한 번만 더'를 만드는가?
// Date: 2026-11-18
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Start ----
  start_coins: { value: 10, min: 0, max: 1000, step: 5 },        // coins at a new farm
  start_carrot_seeds: { value: 3, min: 0, max: 20, step: 1 },    // carrot seeds at a new farm

  // ---- Player and camera ----
  walk_speed: { value: 6, min: 2, max: 14, step: 0.5 },          // units per second
  cam_distance: { value: 11, min: 5, max: 22, step: 0.5 },       // units behind the player
  cam_pitch: { value: 0.62, min: 0.2, max: 1.3, step: 0.02 },    // radians above the horizon
  cam_turn_keys: { value: 2.2, min: 0.5, max: 5, step: 0.1 },    // Q/E turn, radians per second
  cam_turn_drag: { value: 0.008, min: 0.002, max: 0.02, step: 0.001 }, // radians per dragged px
  interact_range: { value: 2.4, min: 1, max: 5, step: 0.1 },     // units to the thing you act on
  pickup_range: { value: 1.7, min: 0.5, max: 4, step: 0.1 },     // units to walk over goods

  // ---- Field and pads ----
  field_start_rows: { value: 2, min: 1, max: 6, step: 1 },       // rows of 3 plots at start
  field_max_rows: { value: 8, min: 1, max: 8, step: 1 },        // rows deep, at most
  field_start_cols: { value: 3, min: 1, max: 5, step: 1 },       // columns at start
  field_max_cols: { value: 5, min: 1, max: 5, step: 1 },         // columns wide, at most
  field_col_cost: { value: 400, min: 10, max: 50000, step: 10 }, // first new column, coins
  field_col_growth: { value: 4, min: 1.2, max: 10, step: 0.1 },
  field_row_cost: { value: 60, min: 10, max: 2000, step: 10 },   // first new row, coins
  field_row_growth: { value: 3, min: 1.2, max: 6, step: 0.1 },   // each next row costs this much more
  pads_start: { value: 2, min: 1, max: 8, step: 1 },             // helper pads at start
  pads_max: { value: 8, min: 1, max: 10, step: 1 },
  pad_cost: { value: 120, min: 10, max: 5000, step: 10 },        // first new pad, coins
  pad_growth: { value: 2.4, min: 1.2, max: 6, step: 0.1 },

  // ---- Crops: seed cost (coins), grow time (seconds), sell price (coins) ----
  carrot_cost: { value: 5, min: 1, max: 100, step: 1 },
  carrot_grow: { value: 8, min: 2, max: 120, step: 1 },
  carrot_sell: { value: 10, min: 1, max: 200, step: 1 },
  strawberry_cost: { value: 15, min: 1, max: 300, step: 1 },
  strawberry_grow: { value: 16, min: 2, max: 180, step: 1 },
  strawberry_sell: { value: 13, min: 1, max: 300, step: 1 },
  strawberry_harvests: { value: 3, min: 1, max: 10, step: 1 },   // picks before the plot is empty
  strawberry_regrow: { value: 9, min: 2, max: 120, step: 1 },    // seconds between picks
  corn_cost: { value: 40, min: 1, max: 800, step: 5 },
  corn_grow: { value: 28, min: 2, max: 240, step: 1 },
  corn_sell: { value: 72, min: 1, max: 1500, step: 1 },
  pumpkin_cost: { value: 110, min: 1, max: 2000, step: 5 },
  pumpkin_grow: { value: 48, min: 2, max: 300, step: 1 },
  pumpkin_sell: { value: 200, min: 1, max: 4000, step: 5 },
  watermelon_cost: { value: 300, min: 1, max: 5000, step: 10 },
  watermelon_grow: { value: 75, min: 2, max: 400, step: 1 },
  watermelon_sell: { value: 520, min: 1, max: 9000, step: 10 },
  pineapple_cost: { value: 900, min: 1, max: 20000, step: 10 },
  pineapple_grow: { value: 105, min: 2, max: 600, step: 1 },
  pineapple_sell: { value: 1500, min: 1, max: 40000, step: 10 },
  dragonfruit_cost: { value: 2800, min: 1, max: 60000, step: 50 },
  dragonfruit_grow: { value: 140, min: 2, max: 800, step: 1 },
  dragonfruit_sell: { value: 4600, min: 1, max: 120000, step: 50 },
  starmelon_cost: { value: 9000, min: 1, max: 200000, step: 100 },
  starmelon_grow: { value: 190, min: 2, max: 1000, step: 1 },
  starmelon_sell: { value: 15000, min: 1, max: 400000, step: 100 },

  // ---- Giant golden crops: a ripe crop sometimes grows huge and golden ----
  giant_chance: { value: 0.07, min: 0, max: 1, step: 0.01 },     // chance each ripening
  giant_mult: { value: 6, min: 1, max: 50, step: 0.5 },          // sells for this many times the price
  giant_scale: { value: 1.75, min: 1, max: 3, step: 0.05 },      // how much bigger it looks

  // ---- Shop gear: sprinklers (placed), watering can and farm tools (one in hand) ----
  sprinkler_cost: { value: 300, min: 10, max: 20000, step: 10 },
  sprinkler_value: { value: 0.6, min: 0, max: 5, step: 0.05 },   // + growth speed in reach
  sprinkler_radius: { value: 3.6, min: 1, max: 12, step: 0.1 },
  gsprinkler_cost: { value: 4000, min: 10, max: 200000, step: 100 },
  gsprinkler_value: { value: 1.5, min: 0, max: 10, step: 0.1 },
  gsprinkler_radius: { value: 5.5, min: 1, max: 15, step: 0.1 },
  can_cost: { value: 150, min: 10, max: 20000, step: 10 },       // watering can
  can_value: { value: 1.2, min: 0, max: 10, step: 0.1 },         // + growth speed near you
  can_radius: { value: 4, min: 1, max: 12, step: 0.1 },
  hoe_cost: { value: 600, min: 10, max: 50000, step: 10 },       // hoe
  hoe_value: { value: 0.35, min: 0, max: 5, step: 0.05 },        // + growth speed, whole field
  rake_cost: { value: 2000, min: 10, max: 100000, step: 50 },    // rake
  rake_value: { value: 0.08, min: 0, max: 1, step: 0.01 },       // + giant crop chance
  shovel_cost: { value: 1500, min: 10, max: 300000, step: 100 }, // golden shovel
  shovel_value: { value: 0.3, min: 0, max: 1, step: 0.01 },      // + double-harvest chance

  // ---- Hired farmhands: plant your seeds, harvest, and sell at the shop ----
  worker_cost: { value: 500, min: 10, max: 100000, step: 10 },   // first farmhand, coins
  worker_cost_growth: { value: 5, min: 1.2, max: 20, step: 0.1 },
  workers_max: { value: 3, min: 1, max: 6, step: 1 },
  worker_speed: { value: 3.6, min: 0.5, max: 12, step: 0.1 },    // units per second
  worker_work_time: { value: 0.7, min: 0.1, max: 5, step: 0.1 }, // seconds per plant or harvest
  worker_carry: { value: 8, min: 1, max: 50, step: 1 },          // crops carried before a trip to the shop

  // ---- Gacha ----
  gacha_cost: { value: 25, min: 1, max: 1000, step: 1 },         // first normal pull, coins
  gacha_cost_growth: { value: 1.09, min: 1, max: 1.5, step: 0.01 }, // each pull costs this much more
  gacha_cost_cap: { value: 55, min: 0, max: 100, step: 1 },      // pulls after which the price stops rising
  gacha_premium_cost: { value: 1500, min: 50, max: 50000, step: 50 }, // golden pull, coins
  // Chance weights per tier, normal pull: 일반, 에픽, 희귀, 전설, 시크릿, 신, 신을 낳은 신, 레전드 오브 레전드
  w0_normal: { value: 60, min: 0, max: 100, step: 0.5 },
  w1_normal: { value: 26, min: 0, max: 100, step: 0.5 },
  w2_normal: { value: 9.5, min: 0, max: 100, step: 0.5 },
  w3_normal: { value: 3.5, min: 0, max: 100, step: 0.1 },
  w4_normal: { value: 0.8, min: 0, max: 100, step: 0.05 },
  w5_normal: { value: 0.17, min: 0, max: 10, step: 0.01 },
  w6_normal: { value: 0.03, min: 0, max: 10, step: 0.005 },
  w7_normal: { value: 0.005, min: 0, max: 10, step: 0.001 },
  // golden pull: no 일반, much better odds up top
  w0_premium: { value: 0, min: 0, max: 100, step: 0.5 },
  w1_premium: { value: 40, min: 0, max: 100, step: 0.5 },
  w2_premium: { value: 32, min: 0, max: 100, step: 0.5 },
  w3_premium: { value: 18, min: 0, max: 100, step: 0.5 },
  w4_premium: { value: 7, min: 0, max: 100, step: 0.1 },
  w5_premium: { value: 2.2, min: 0, max: 100, step: 0.1 },
  w6_premium: { value: 0.6, min: 0, max: 100, step: 0.05 },
  w7_premium: { value: 0.12, min: 0, max: 100, step: 0.01 },

  // ---- Helpers: what each does at 1 star ----
  star_bonus: { value: 0.5, min: 0, max: 3, step: 0.05 },        // +this power per star above 1
  star_max: { value: 10, min: 1, max: 99, step: 1 },
  goods_cap: { value: 4, min: 1, max: 20, step: 1 },             // goods waiting by a pad before it rests
  helper_sell_base: { value: 5, min: 1, max: 1000, step: 1 },   // coins for selling a 일반 helper at 1 star
  helper_sell_growth: { value: 3, min: 1, max: 20, step: 0.5 },  // x per tier up
  chicken_every: { value: 10, min: 1, max: 120, step: 1 },       // seconds per egg
  chicken_value: { value: 16, min: 1, max: 1000, step: 1 },      // egg sell price
  tulip_value: { value: 0.3, min: 0, max: 5, step: 0.05 },       // + growth speed nearby
  tulip_radius: { value: 9, min: 1, max: 20, step: 0.5 },
  cow_every: { value: 16, min: 1, max: 120, step: 1 },
  cow_value: { value: 45, min: 1, max: 2000, step: 1 },          // milk sell price
  rabbit_value: { value: 0.25, min: 0, max: 1, step: 0.01 },     // chance a harvest is doubled
  sheep_every: { value: 22, min: 1, max: 120, step: 1 },
  sheep_value: { value: 110, min: 1, max: 5000, step: 5 },       // wool sell price
  cherry_value: { value: 0.7, min: 0, max: 5, step: 0.05 },      // + growth speed nearby
  cherry_radius: { value: 12, min: 1, max: 20, step: 0.5 },
  sunflower_value: { value: 0.35, min: 0, max: 5, step: 0.05 },  // + crop sell price
  beehive_every: { value: 14, min: 1, max: 120, step: 1 },
  beehive_value: { value: 160, min: 1, max: 9000, step: 5 },     // honey sell price
  moneytree_every: { value: 12, min: 1, max: 120, step: 1 },
  moneytree_value: { value: 250, min: 1, max: 20000, step: 10 }, // coins per drop
  unicorn_value: { value: 1.5, min: 0, max: 10, step: 0.1 },     // + growth speed, whole farm
  unicorn_double: { value: 0.15, min: 0, max: 1, step: 0.01 },   // + double-harvest chance
  dragon_every: { value: 10, min: 1, max: 120, step: 1 },
  dragon_value: { value: 1500, min: 1, max: 99999, step: 50 },   // coins per drop
  turtle_value: { value: 1, min: 0, max: 10, step: 0.1 },        // + power to every other helper

  // ---- Feel ----
  petal_count: { value: 70, min: 0, max: 300, step: 5 },         // falling cherry petals
  reveal_time: { value: 2.2, min: 0.5, max: 6, step: 0.1 },      // seconds of the gacha reveal
};

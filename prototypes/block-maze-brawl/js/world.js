// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// The world: the maze, its bright toy-block look, the blocky figures and weapons, and the
// effects (tracers, block debris, blasts). Also the grid queries the game asks: walls, rays, sight.
'use strict';

const TILE = 3;          // metres per maze tile (a corridor is one tile wide)
const WALL_H = 3.6;      // wall height in metres
const EYE = 1.62;        // eye height above the feet
const ZONE_COLORS = [0x9fd6f7, 0xffe48f, 0x9fe8cb, 0xffb2a6]; // pastel sky, lemon, mint, coral
const PLAZA_COLOR = 0xcdbbf7;   // pastel lilac pillars in the open squares
const EDGE_COLOR = 0xfaf6ee;    // the outer wall, cream
const FLOOR_COLOR = 0xf3efe6;   // the floor: smooth pastel cream tiles

// ---- three.js setup ------------------------------------------------------------------------
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !CHEAP });
renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(2, devicePixelRatio || 1));
renderer.shadowMap.enabled = !CHEAP;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;
const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();             // the weapon in your hands, drawn over the world
const vmCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
const vmSun = new THREE.DirectionalLight(0xffffff, 1.4); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);
function fitGL() {
  renderer.setSize(innerWidth, innerHeight, false);
  glCanvas.style.width = innerWidth + 'px'; glCanvas.style.height = innerHeight + 'px';
  camera.aspect = vmCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); vmCamera.updateProjectionMatrix();
}
addEventListener('resize', fitGL); fitGL();

const matCache = new Map();
/** A flat toy-plastic material, shared per colour. */
function mat(color, opts) {
  const k = color + (opts ? JSON.stringify(opts) : '');
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {})));
  return matCache.get(k);
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
/** A box part: size w×h×d at (x,y,z) inside parent. */
function part(parent, w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(boxGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}

// ---- Textures drawn in code ----------------------------------------------------------------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
// The floor: smooth square tiles, two soft tones in a checker, with a faint bevel.
const floorTex = canvasTex(256, 256, (g, w) => {
  const h = w / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#ffffff' : '#eef0f6'; g.fillRect(i * h, j * h, h, h);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(i * h, j * h, h, 3); g.fillRect(i * h, j * h, 3, h);
    g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i * h, j * h + h - 3, h, 3); g.fillRect(i * h + h - 3, j * h, 3, h);
  }
}, true);
// A wall block face: smooth plastic with a soft light edge and a soft shadow edge, no seams.
const blockTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#f1f1f4');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h);
  g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, h - 5, w, 5); g.fillRect(w - 5, 0, 5, h);
});
/** The blocky face: two eyes and a smile on the head's skin colour. */
function faceTex(skin, mood) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#' + skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1b1b22';
    g.fillRect(19, 22, 7, 11); g.fillRect(38, 22, 7, 11);
    g.lineWidth = 4; g.strokeStyle = '#1b1b22'; g.beginPath();
    if (mood === 'grin') g.arc(32, 36, 12, 0.15 * Math.PI, 0.85 * Math.PI); else g.arc(32, 38, 10, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  });
}
function tagTex(name, color) {
  return canvasTex(256, 64, (g) => {
    g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(250, g.measureText(name).width + 34);
    g.fillStyle = 'rgba(20,24,40,0.72)'; roundRect(g, 128 - w / 2, 8, w, 48, 12); g.fill();
    g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fillRect(128 - w / 2 + 8, 16, 6, 32);
    g.fillStyle = '#fff'; g.fillText(name, 132, 33);
  });
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---- The maze ------------------------------------------------------------------------------
/**
 * Builds a maze grid for 'small' or 'large'. 1 = wall tile, 0 = floor tile.
 * A backtracker maze, braided so most dead ends loop, with open squares (plazas) and, on the
 * large map, long straight lanes for the sniper.
 */
function genMaze(type) {
  const cells = type === 'large' ? 12 : 7;
  const N = cells * 2 + 1;
  const g = new Uint8Array(N * N).fill(1);
  const at = (x, z) => g[z * N + x];
  const set = (x, z, v) => { if (x > 0 && z > 0 && x < N - 1 && z < N - 1) g[z * N + x] = v; };
  const seen = new Uint8Array(cells * cells);
  const stack = [[Math.floor(rng() * cells), Math.floor(rng() * cells)]];
  seen[stack[0][1] * cells + stack[0][0]] = 1; set(stack[0][0] * 2 + 1, stack[0][1] * 2 + 1, 0);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const opts = dirs.filter(([dx, dz]) => {
      const nx = cx + dx, nz = cz + dz;
      return nx >= 0 && nz >= 0 && nx < cells && nz < cells && !seen[nz * cells + nx];
    });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dz] = opts[Math.floor(rng() * opts.length)];
    const nx = cx + dx, nz = cz + dz;
    seen[nz * cells + nx] = 1;
    set(cx * 2 + 1 + dx, cz * 2 + 1 + dz, 0); set(nx * 2 + 1, nz * 2 + 1, 0);
    stack.push([nx, nz]);
  }
  // Braid: open most dead ends so fights loop instead of trapping.
  const braid = type === 'large' ? 0.7 : 0.85;
  for (let cz = 0; cz < cells; cz++) for (let cx = 0; cx < cells; cx++) {
    const x = cx * 2 + 1, z = cz * 2 + 1;
    const open = dirs.filter(([dx, dz]) => !at(x + dx, z + dz));
    if (open.length === 1 && rng() < braid) {
      const shut = dirs.filter(([dx, dz]) => at(x + dx, z + dz) && x + dx * 2 > 0 && z + dz * 2 > 0 && x + dx * 2 < N - 1 && z + dz * 2 < N - 1);
      if (shut.length) { const [dx, dz] = shut[Math.floor(rng() * shut.length)]; set(x + dx, z + dz, 0); }
    }
  }
  const plazaTiles = new Set();
  const plaza = (cx, cz, r, pillars) => {
    for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) { set(x, z, 0); plazaTiles.add(z * N + x); }
    for (const [px, pz] of pillars) set(cx + px, cz + pz, 1);
  };
  const c = (N - 1) / 2;
  if (type === 'large') {
    for (const lane of [5, 19]) for (let x = 1; x < N - 1; x++) set(x, lane, 0);   // two long east-west lanes
    for (let z = 1; z < N - 1; z++) set(13, z, 0);                                    // one north-south lane
    plaza(c, c, 2, [[-1, -1], [1, 1]]);
    plaza(7, 13, 1, []); plaza(19, 11, 1, []);
  } else {
    plaza(c, c, 2, [[-1, -1], [1, -1], [-1, 1], [1, 1]]);
  }
  return { N, g, plazaTiles, type };
}

/** The current level: grid, meshes and the three.js scene. */
const L = { N: 0, g: null, scene: null, floors: [], type: 'small' };
function isWall(tx, tz) { return tx < 0 || tz < 0 || tx >= L.N || tz >= L.N || L.g[tz * L.N + tx] === 1; }
function tileOf(v) { return Math.floor(v / TILE); }
function tileCenter(t) { return (t + 0.5) * TILE; }

/** Builds the level's scene for a maze type. Disposes the last one. */
function buildLevel(type) {
  const m = genMaze(type);
  if (L.disposables) for (const d of L.disposables) d.dispose();
  L.disposables = [];
  L.N = m.N; L.g = m.g; L.type = type;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe6ff);
  scene.fog = new THREE.Fog(0xd6efff, 45, type === 'large' ? 150 : 110);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0e8f6, 1.75));
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xfff6ea, 1.0);
  const size = L.N * TILE, mid = size / 2;
  sun.position.set(mid + 30, 60, mid + 18); sun.target.position.set(mid, 0, mid);
  sun.castShadow = !CHEAP;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -mid - 4, right: mid + 4, top: mid + 4, bottom: -mid - 4, near: 1, far: 160 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  // The smooth tiled floor: one checker square per half tile.
  const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(L.N, L.N);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ color: FLOOR_COLOR, map: ft }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(mid, 0, mid); floor.receiveShadow = true;
  L.disposables.push(ft, floor.geometry, floor.material);
  scene.add(floor);
  // A wider baseplate beyond the walls, so the world never ends at the edge.
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size * 4), new THREE.MeshLambertMaterial({ color: 0xd9f0e4 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set(mid, -0.02, mid); scene.add(outer);
  L.disposables.push(outer.geometry, outer.material);

  // The walls: one instanced block per wall tile, tinted by zone.
  const walls = [];
  L.floors = [];
  for (let z = 0; z < L.N; z++) for (let x = 0; x < L.N; x++) {
    if (L.g[z * L.N + x]) walls.push([x, z]); else L.floors.push([x, z]);
  }
  const wallMat = new THREE.MeshLambertMaterial({ map: blockTex });
  const wallGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
  const im = new THREE.InstancedMesh(wallGeo, wallMat, walls.length);
  const q = new THREE.Matrix4(), col = new THREE.Color();
  walls.forEach(([x, z], i) => {
    q.makeTranslation(tileCenter(x), WALL_H / 2, tileCenter(z));
    im.setMatrixAt(i, q);
    const edge = x === 0 || z === 0 || x === L.N - 1 || z === L.N - 1;
    const zone = (x < L.N / 2 ? 0 : 1) + (z < L.N / 2 ? 0 : 2);
    col.setHex(edge ? EDGE_COLOR : m.plazaTiles.has(z * L.N + x) ? PLAZA_COLOR : ZONE_COLORS[zone]);
    im.setColorAt(i, col);
  });
  im.castShadow = true; im.receiveShadow = true;
  L.disposables.push(wallGeo, wallMat, im);
  scene.add(im);
  // A thin lighter cap on each wall, so the tops read as smooth rounded blocks.
  const capGeo = new THREE.BoxGeometry(TILE * 0.96, 0.12, TILE * 0.96);
  const cap = new THREE.InstancedMesh(capGeo, new THREE.MeshLambertMaterial(), walls.length);
  walls.forEach(([x, z], i) => {
    im.getColorAt(i, col); col.lerp(new THREE.Color(0xffffff), 0.45);
    q.makeTranslation(tileCenter(x), WALL_H + 0.06, tileCenter(z)); cap.setMatrixAt(i, q); cap.setColorAt(i, col);
  });
  scene.add(cap);
  L.disposables.push(capGeo, cap.material, cap);

  // Blocky clouds far off.
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    const a = (i / 14) * Math.PI * 2, r = size * 0.9 + rng() * 40;
    cl.position.set(mid + Math.cos(a) * r, 34 + rng() * 18, mid + Math.sin(a) * r);
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    for (let k = 0; k < 4; k++) part(cl, 6 + rng() * 6, 2.5 + rng() * 2, 5 + rng() * 4, k * 4 - 6, rng() * 1.5, rng() * 3, cm);
    cl.traverse(o => { o.castShadow = false; });
    scene.add(cl);
  }

  scene.add(fx.group);
  L.scene = scene;
  return scene;
}

// ---- Grid queries -------------------------------------------------------------------------
/** Distance along a horizontal ray (dx,dz normalised) to the first wall, or Infinity. */
function rayWall(ox, oz, dx, dz, maxD) {
  let tx = tileOf(ox), tz = tileOf(oz);
  if (isWall(tx, tz)) return 0;
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const ddx = dx !== 0 ? Math.abs(TILE / dx) : Infinity, ddz = dz !== 0 ? Math.abs(TILE / dz) : Infinity;
  let mx = dx !== 0 ? ((dx > 0 ? (tx + 1) * TILE - ox : ox - tx * TILE) / Math.abs(dx)) : Infinity;
  let mz = dz !== 0 ? ((dz > 0 ? (tz + 1) * TILE - oz : oz - tz * TILE) / Math.abs(dz)) : Infinity;
  let t = 0;
  for (let i = 0; i < 400; i++) {
    if (mx < mz) { t = mx; mx += ddx; tx += sx; } else { t = mz; mz += ddz; tz += sz; }
    if (t > maxD) return Infinity;
    if (isWall(tx, tz)) return t;
  }
  return Infinity;
}
/** Distance along a 3D ray to a wall or the floor. */
function rayWorld(o, d, maxD) {
  const h = Math.hypot(d.x, d.z);
  let t = Infinity;
  if (h > 1e-6) t = rayWall(o.x, o.z, d.x / h, d.z / h, maxD * h) / h;
  if (d.y < -1e-6) t = Math.min(t, -o.y / d.y);
  return Math.min(t, maxD);
}
/** True when nothing stands between two points (walls are full height). */
function lineOfSight(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  if (d < 1e-4) return true;
  return rayWall(ax, az, dx / d, dz / d, d) >= d - 0.05;
}
/** Ray against an axis-aligned box; returns entry distance or Infinity. */
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return Infinity; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmax < 0 ? Infinity : Math.max(0, tmin);
}
/** True when a circle of radius r at (x,z) overlaps a wall tile. */
function blocked(x, z, r) {
  const x0 = tileOf(x - r), x1 = tileOf(x + r), z0 = tileOf(z - r), z1 = tileOf(z + r);
  for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) if (isWall(tx, tz)) return true;
  return false;
}
/** Breadth-first path over floor tiles; returns tile list from (after) start to goal, or null. */
function findPath(sx, sz, gx, gz) {
  const N = L.N; if (isWall(gx, gz) || isWall(sx, sz)) return null;
  const prev = new Int32Array(N * N).fill(-1), start = sz * N + sx, goal = gz * N + gx;
  const queue = [start]; prev[start] = start;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (cur === goal) break;
    const cx = cur % N, cz = (cur / N) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, nz = cz + dz;
      if (isWall(nx, nz)) continue;
      const ni = nz * N + nx;
      if (prev[ni] !== -1) continue;
      prev[ni] = cur; queue.push(ni);
    }
  }
  if (prev[goal] === -1) return null;
  const path = [];
  for (let c = goal; c !== start; c = prev[c]) path.push([c % N, (c / N) | 0]);
  return path.reverse();
}

// ---- Weapons as toy blocks (barrel toward -z) ----------------------------------------------
const GUNMETAL = 0x3b4150, DARK = 0x23262e, WOOD = 0x9a5a2c, STEEL = 0xc9d2dc;
/** Builds a weapon model; each has its own silhouette. */
function makeWeapon(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'rifle':
      part(g, 0.09, 0.12, 0.62, 0, 0, 0, GUNMETAL);
      part(g, 0.04, 0.04, 0.32, 0, 0.02, -0.46, DARK);
      part(g, 0.08, 0.14, 0.22, 0, -0.02, 0.38, 0xff8a2a);            // orange stock
      part(g, 0.06, 0.2, 0.08, 0, -0.15, -0.08, DARK, 0.25);           // magazine
      part(g, 0.06, 0.14, 0.06, 0, -0.12, 0.12, DARK, -0.3);           // grip
      part(g, 0.05, 0.05, 0.16, 0, 0.1, 0, 0x222222);                  // sight
      part(g, 0.07, 0.03, 0.2, 0, 0.075, -0.24, 0xff8a2a);
      break;
    case 'sniper':
      part(g, 0.08, 0.1, 0.8, 0, 0, 0, 0x5b6b3a);
      part(g, 0.035, 0.035, 0.6, 0, 0.02, -0.68, DARK);
      part(g, 0.07, 0.07, 0.34, 0, 0.12, -0.02, 0x1d1f24);             // scope
      part(g, 0.09, 0.09, 0.05, 0, 0.12, -0.2, 0x1d1f24);
      part(g, 0.09, 0.09, 0.05, 0, 0.12, 0.16, 0x1d1f24);
      part(g, 0.07, 0.16, 0.26, 0, -0.04, 0.48, 0x5b6b3a);             // stock
      part(g, 0.05, 0.12, 0.05, 0, -0.1, 0.18, DARK, -0.3);
      part(g, 0.02, 0.16, 0.02, 0.04, -0.1, -0.5, DARK, 0.4);          // bipod
      part(g, 0.02, 0.16, 0.02, -0.04, -0.1, -0.5, DARK, 0.4);
      break;
    case 'uzi':
      part(g, 0.08, 0.12, 0.3, 0, 0, 0, 0x1c1f26);
      part(g, 0.035, 0.035, 0.08, 0, 0.02, -0.19, DARK);
      part(g, 0.05, 0.28, 0.06, 0, -0.18, 0.02, 0x2f6cf0);             // long blue mag through the grip
      part(g, 0.06, 0.04, 0.16, 0, 0.08, 0.06, 0x2f6cf0);
      break;
    case 'rpg':
      part(g, 0.14, 0.14, 1.0, 0, 0, 0.05, 0x4f7a3a);
      part(g, 0.18, 0.18, 0.08, 0, 0, 0.55, 0x2c3a22);
      part(g, 0.16, 0.16, 0.12, 0, 0, -0.5, 0x6b5a3a);
      part(g, 0.1, 0.1, 0.14, 0, 0, -0.62, 0xe0332e);                  // red warhead
      part(g, 0.05, 0.05, 0.08, 0, 0, -0.72, 0xe0332e);
      part(g, 0.05, 0.14, 0.05, 0, -0.13, 0.05, DARK, -0.2);
      part(g, 0.05, 0.12, 0.05, 0, -0.12, -0.2, DARK);
      part(g, 0.06, 0.06, 0.12, 0, 0.11, -0.1, DARK);
      break;
    case 'pistol':
      part(g, 0.06, 0.07, 0.22, 0, 0, 0, 0x6c7482);
      part(g, 0.055, 0.15, 0.07, 0, -0.1, 0.06, DARK, -0.25);
      part(g, 0.02, 0.03, 0.02, 0, 0.05, -0.09, DARK);
      break;
    case 'revolver':
      part(g, 0.04, 0.045, 0.26, 0, 0.02, -0.12, STEEL);
      part(g, 0.08, 0.08, 0.08, 0, 0, 0.02, 0x9aa4b0);                 // cylinder
      part(g, 0.05, 0.06, 0.1, 0, 0.01, 0.1, STEEL);
      part(g, 0.06, 0.16, 0.08, 0, -0.11, 0.15, WOOD, -0.45);           // wooden grip
      part(g, 0.02, 0.03, 0.02, 0, 0.06, -0.22, DARK);
      break;
    case 'fist':
      part(g, 0.16, 0.14, 0.16, 0, 0, -0.05, PLAYER_LOOK.skin);
      part(g, 0.16, 0.05, 0.04, 0, 0.03, -0.14, 0xe9bb2e);
      part(g, 0.05, 0.06, 0.08, 0.1, -0.02, -0.06, PLAYER_LOOK.skin);   // thumb
      break;
    case 'knife':
      part(g, 0.035, 0.05, 0.13, 0, 0, 0.05, 0x1d1f24);
      part(g, 0.05, 0.08, 0.025, 0, 0, -0.02, 0x6c7482);
      part(g, 0.012, 0.06, 0.24, 0, 0.005, -0.15, 0xe6edf3);
      part(g, 0.012, 0.03, 0.06, 0, 0.022, -0.29, 0xe6edf3, 0.5);
      break;
    case 'scythe':
      part(g, 0.05, 0.05, 1.5, 0, 0, -0.2, WOOD);                       // long handle
      part(g, 0.06, 0.06, 0.08, 0.06, 0, 0.1, 0x6b3a1c);
      part(g, 0.02, 0.12, 0.42, 0, 0.12, -0.92, 0xdfe6ee, 0.2);         // curved blade in three bricks
      part(g, 0.02, 0.11, 0.3, 0, 0.0, -1.22, 0xdfe6ee, -0.4);
      part(g, 0.02, 0.08, 0.2, 0, -0.14, -1.36, 0xdfe6ee, -0.95);
      g.rotation.x = 0.0;
      break;
    case 'grenade':
      part(g, 0.1, 0.12, 0.1, 0, 0, 0, 0x3f7f3a);
      part(g, 0.11, 0.03, 0.11, 0, 0.02, 0, 0x2f5f2a);
      part(g, 0.05, 0.04, 0.05, 0, 0.08, 0, 0x8a8f96);
      part(g, 0.02, 0.1, 0.03, 0.05, 0.06, 0, 0xffcc33, 0, 0, -0.3);   // lever
      part(g, 0.04, 0.04, 0.01, -0.05, 0.1, 0, 0xffcc33);              // pin ring
      break;
    case 'c4':
      part(g, 0.18, 0.08, 0.12, 0, 0, 0, 0xd9c48c);
      part(g, 0.06, 0.03, 0.04, 0.03, 0.055, 0, 0x26282e);
      part(g, 0.02, 0.02, 0.02, 0.03, 0.08, 0, 0xff2222);              // red light
      part(g, 0.19, 0.012, 0.02, 0, 0.0, 0.035, 0xe0332e);             // wires
      part(g, 0.19, 0.012, 0.02, 0, 0.0, -0.035, 0x2f6cf0);
      break;
  }
  return g;
}

// ---- Blocky figures -----------------------------------------------------------------------
/**
 * A blocky toy figure: head with a face, torso, two arms and two legs. Feet at y=0, facing -z.
 * Returns { group, armL, armR, legL, legR, hand, tag }.
 */
function makeCharacter(look, withTag = true) {
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.2, 0.75, 0); legR.position.set(0.2, 0.75, 0);
  part(legL, 0.38, 0.75, 0.42, 0, -0.375, 0, look.pants); part(legR, 0.38, 0.75, 0.42, 0, -0.375, 0, look.pants);
  part(legL, 0.39, 0.12, 0.44, 0, -0.69, -0.01, 0x1e1e24); part(legR, 0.39, 0.12, 0.44, 0, -0.69, -0.01, 0x1e1e24);
  body.add(legL, legR);
  part(body, 0.8, 0.72, 0.44, 0, 1.11, 0, look.shirt);
  part(body, 0.82, 0.08, 0.46, 0, 0.78, 0, look.pants);               // belt line
  part(body, 0.28, 0.2, 0.02, 0, 1.2, -0.23, 0xffffff, 0, 0, 0).material = mat(0xffffff, { transparent: true, opacity: 0.35 });
  const head = new THREE.Mesh(boxGeo, [mat(look.skin), mat(look.skin), mat(look.skin), mat(look.skin), mat(look.skin),
    new THREE.MeshLambertMaterial({ map: faceTex(look.skin, look === PLAYER_LOOK ? 'grin' : 'smile') })]);
  head.scale.set(0.46, 0.44, 0.46); head.position.set(0, 1.69, 0); head.castShadow = true; body.add(head);
  part(body, 0.22, 0.06, 0.22, 0, 1.94, 0, look.skin);                // the stud on top of the head
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.56, 1.42, 0); armR.position.set(0.56, 1.42, 0);
  part(armL, 0.3, 0.7, 0.32, 0, -0.33, 0, look.shirt); part(armR, 0.3, 0.7, 0.32, 0, -0.33, 0, look.shirt);
  part(armL, 0.29, 0.14, 0.31, 0, -0.62, 0, look.skin); part(armR, 0.29, 0.14, 0.31, 0, -0.62, 0, look.skin);
  body.add(armL, armR);
  const hand = new THREE.Group(); hand.position.set(0, -0.66, 0); hand.rotation.x = -Math.PI / 2; armR.add(hand);
  let tag = null;
  if (withTag) {
    tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(look.name, look.shirt), depthWrite: false }));
    tag.scale.set(1.9, 0.48, 1); tag.position.set(0, 2.45, 0); group.add(tag);
  }
  return { group, body, head, armL, armR, legL, legR, hand, tag };
}

// ---- Effects: block debris, tracers, blasts, flashes --------------------------------------
const fx = { group: new THREE.Group() };
(function initFx() {
  const MAXD = 600;
  fx.debris = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial(), MAXD);
  fx.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fx.debris.frustumCulled = false;
  fx.parts = [];
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAXD; i++) { fx.debris.setMatrixAt(i, zero); fx.debris.setColorAt(i, new THREE.Color(1, 1, 1)); }
  fx.group.add(fx.debris);
  fx.tracers = [];
  for (let i = 0; i < 40; i++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0 }));
    ln.frustumCulled = false; fx.group.add(ln); fx.tracers.push({ ln, life: 0 });
  }
  fx.blasts = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Group();
    const c1 = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true }));
    const c2 = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true }));
    c2.rotation.set(0.6, 0.8, 0.3);
    b.add(c1, c2); b.visible = false; fx.group.add(b); fx.blasts.push({ b, c1, c2, life: 0, r: 1 });
  }
  fx.flashes = [];
  const fg = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
    f.visible = false; fg.add(f); fx.flashes.push({ f, life: 0 });
  }
  fx.group.add(fg);
  fx.light = new THREE.PointLight(0xffa040, 0, 16);
  fx.group.add(fx.light); fx.lightLife = 0;
})();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
/** Throws n little blocks from a point: hits, kills and blasts. */
function spawnDebris(x, y, z, n, colors, speed, size) {
  for (let i = 0; i < n; i++) {
    if (fx.parts.length >= 600) fx.parts.shift();
    const a = rng() * Math.PI * 2, up = rng();
    fx.parts.push({
      x, y, z, vx: Math.cos(a) * speed * (0.3 + rng()), vy: speed * (0.4 + up), vz: Math.sin(a) * speed * (0.3 + rng()),
      rx: rng() * 6, ry: rng() * 6, sp: (rng() - 0.5) * 14, life: 1.2 + rng() * 1.2, size: size * (0.6 + rng() * 0.7),
      color: colors[Math.floor(rng() * colors.length)],
    });
  }
}
function spawnTracer(a, b) {
  const t = fx.tracers.find(t => t.life <= 0) || fx.tracers[0];
  const p = t.ln.geometry.attributes.position.array;
  p[0] = a.x; p[1] = a.y; p[2] = a.z; p[3] = b.x; p[4] = b.y; p[5] = b.z;
  t.ln.geometry.attributes.position.needsUpdate = true; t.life = 0.07;
}
function spawnBlast(x, y, z, r) {
  const b = fx.blasts.find(b => b.life <= 0) || fx.blasts[0];
  b.b.position.set(x, y, z); b.life = 0.45; b.r = r; b.b.visible = true;
  if (!CHEAP) { fx.light.position.set(x, y + 1, z); fx.light.intensity = 60; fx.lightLife = 0.25; }
  spawnDebris(x, y, z, 26, [0xffd23f, 0xff7a2a, 0xe0332e, 0x8a8f96, 0x55585f], 9, 0.28);
}
function spawnFlash(x, y, z, s) {
  const f = fx.flashes.find(f => f.life <= 0) || fx.flashes[0];
  f.f.position.set(x, y, z); f.f.scale.set(s, s, s); f.f.rotation.set(rng() * 3, rng() * 3, rng() * 3); f.life = 0.05; f.f.visible = true;
}
/** Advances every effect by dt seconds (on the fixed step). */
function updateFx(dt) {
  const g = tune.gravity;
  for (const p of fx.parts) {
    p.life -= dt; p.vy -= g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.sp * dt; p.ry += p.sp * 0.7 * dt;
    if (p.y < p.size / 2) { p.y = p.size / 2; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; p.sp *= 0.6; }
    if (isWall(tileOf(p.x), tileOf(p.z)) && p.y < WALL_H) { p.vx *= -0.4; p.vz *= -0.4; p.x += p.vx * dt * 2; p.z += p.vz * dt * 2; }
  }
  fx.parts = fx.parts.filter(p => p.life > 0);
  for (const t of fx.tracers) if (t.life > 0) t.life -= dt;
  for (const b of fx.blasts) if (b.life > 0) b.life -= dt;
  for (const f of fx.flashes) if (f.life > 0) f.life -= dt;
  if (fx.lightLife > 0) fx.lightLife -= dt;
}
/** Writes the effects into their meshes for this frame. */
function drawFx() {
  const n = fx.parts.length;
  for (let i = 0; i < 600; i++) {
    if (i < n) {
      const p = fx.parts[i], s = p.size * Math.min(1, p.life * 2);
      _q.setFromEuler(_e.set(p.rx, p.ry, 0)); _m4.compose(_v.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
      fx.debris.setMatrixAt(i, _m4); fx.debris.setColorAt(i, _c.setHex(p.color));
    } else fx.debris.setMatrixAt(i, _m4.makeScale(0, 0, 0));
  }
  fx.debris.instanceMatrix.needsUpdate = true; if (fx.debris.instanceColor) fx.debris.instanceColor.needsUpdate = true;
  for (const t of fx.tracers) t.ln.material.opacity = Math.max(0, t.life / 0.07) * 0.9;
  for (const b of fx.blasts) {
    b.b.visible = b.life > 0;
    if (b.life > 0) {
      const k = 1 - b.life / 0.45, s = b.r * (0.4 + k * 1.3);
      b.c1.scale.set(s, s, s); b.c2.scale.set(s * 0.8, s * 0.8, s * 0.8);
      b.c1.material.opacity = 0.85 * (1 - k); b.c2.material.opacity = 0.9 * (1 - k);
    }
  }
  for (const f of fx.flashes) f.f.visible = f.life > 0;
  fx.light.intensity = fx.lightLife > 0 ? 60 * fx.lightLife / 0.25 : 0;
}
function clearFx() {
  fx.parts.length = 0;
  for (const t of fx.tracers) t.life = 0;
  for (const b of fx.blasts) b.life = 0;
  for (const f of fx.flashes) f.life = 0;
}

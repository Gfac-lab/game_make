// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// Draws the 3D world each frame: the bots' blocky figures and their weapons, your camera, the
// weapon in your hands, the title fly-over and the figures line-up.
'use strict';

const TWO_HANDED = { rifle: 1, sniper: 1, uzi: 1, rpg: 1, scythe: 1 };
const lerp = (a, b, k) => a + (b - a) * k;
function lerpAng(a, b, k) { return a + angDiff(b, a) * k; }

/** Puts weapon id in a figure's hand, building each model once per figure. */
function holdWeapon(a, model, id) {
  if (a.held === id) return;
  if (a.held && a.heldModels[a.held]) model.hand.remove(a.heldModels[a.held]);
  if (!a.heldModels[id]) {
    const w = makeWeapon(id);
    w.scale.setScalar(id === 'fist' ? 0.001 : id === 'scythe' ? 1.1 : 1.35);
    if (id === 'scythe') w.position.set(0, 0, 0.35);
    a.heldModels[id] = w;
  }
  model.hand.add(a.heldModels[id]); a.held = id;
}
/** Poses a figure: walking legs, arms holding the weapon, a swing or a recoil. */
function poseFigure(model, a, id, pitch) {
  const def = WEAPONS[id], walk = Math.sin(a.walkPhase) * 0.65 * Math.min(1, a.moving || 0);
  model.legL.rotation.x = walk; model.legR.rotation.x = -walk;
  const aim = Math.PI / 2 + pitch;
  model.armR.rotation.set(0, 0, 0); model.armL.rotation.set(0, 0, 0);
  if (def.kind === 'gun' || def.kind === 'rocket') {
    model.armR.rotation.x = aim + a.fireAnim * 0.18;
    if (TWO_HANDED[id]) { model.armL.rotation.x = aim - 0.1; model.armL.rotation.z = -0.55; model.armR.rotation.z = 0.12; }
    else model.armL.rotation.x = -walk * 0.8;
  } else if (def.kind === 'melee') {
    const s = Math.sin(a.swingAnim * Math.PI);
    if (id === 'scythe') { model.armR.rotation.x = aim * 0.7 + s * 0.9; model.armR.rotation.y = -s * 1.2; model.armL.rotation.x = aim * 0.6; model.armL.rotation.z = -0.4; }
    else if (id === 'fist') { model.armR.rotation.x = 0.9 + s * 0.8; model.armL.rotation.x = 0.9 - s * 0.3; }
    else { model.armR.rotation.x = 0.7 + s * 1.1; model.armL.rotation.x = -walk * 0.8; }
  } else {
    model.armR.rotation.x = 0.6 + a.fireAnim * 1.6; model.armL.rotation.x = -walk * 0.8;
  }
}

function syncBots(alpha) {
  for (const a of M.actors) {
    if (a.isPlayer) continue;
    const m = a.model;
    m.group.visible = a.alive;
    if (!a.alive) continue;
    m.group.position.set(lerp(a.px, a.x, alpha), lerp(a.py, a.y, alpha), lerp(a.pz, a.z, alpha));
    m.group.rotation.y = lerpAng(a.pyaw, a.yaw, alpha);
    const id = curW(a);
    holdWeapon(a, m, id);
    poseFigure(m, a, id, a.pitch);
    m.head.rotation.x = a.pitch * 0.5;
  }
  for (const p of M.proj) if (p.mesh) {
    p.mesh.position.set(p.x, p.y, p.z);
    if (p.type === 'rocket') { p.mesh.rotation.order = 'YXZ'; p.mesh.rotation.y = Math.atan2(-p.vx, -p.vz); p.mesh.rotation.x = Math.atan2(p.vy, Math.hypot(p.vx, p.vz)); }
    else if (!p.stuck) p.mesh.rotation.set(p.spin, p.spin * 0.6, 0);
  }
}

// ---- The weapon in your hands ------------------------------------------------------------
const VM = {
  rifle:    { pos: [0.2, -0.2, -0.42], s: 1 },
  sniper:   { pos: [0.2, -0.2, -0.36], s: 0.95 },
  uzi:      { pos: [0.19, -0.18, -0.36], s: 1.2 },
  rpg:      { pos: [0.22, -0.16, -0.18], s: 0.85 },
  pistol:   { pos: [0.17, -0.16, -0.36], s: 1.35 },
  revolver: { pos: [0.17, -0.16, -0.34], s: 1.25 },
  fist:     { pos: [0.21, -0.25, -0.44], s: 0.72 },
  knife:    { pos: [0.2, -0.19, -0.36], s: 1.3 },
  scythe:   { pos: [0.3, -0.32, -0.22], s: 0.55 },
  grenade:  { pos: [0.19, -0.18, -0.34], s: 1.4 },
  c4:       { pos: [0.19, -0.18, -0.34], s: 1.25 },
};
const vmRoot = new THREE.Group(); vmScene.add(vmRoot);
const vmModels = {};
let vmFlash = null;
function vmModel(id) {
  if (vmModels[id]) return vmModels[id];
  const g = new THREE.Group();
  const w = makeWeapon(id); g.add(w);
  // A blocky forearm and hand under the grip, in your white sleeve.
  const arm = new THREE.Group();
  part(arm, 0.1, 0.1, 0.1, 0, -0.12, 0.1, PLAYER_LOOK.skin);
  part(arm, 0.12, 0.12, 0.42, 0.02, -0.17, 0.34, 0xf4f4f8);
  if (id !== 'fist') g.add(arm);
  if (id === 'fist') { const l = makeWeapon('fist'); l.position.set(-0.34, 0.02, 0.06); g.add(l); g.userData.left = l;
    const a2 = new THREE.Group(); part(a2, 0.13, 0.13, 0.4, 0, -0.03, 0.26, 0xf4f4f8); g.add(a2); const a3 = a2.clone(); a3.position.x = -0.34; g.add(a3); }
  if (id === 'scythe') w.rotation.set(0.5, 0, 0.5);
  const box = new THREE.Box3().setFromObject(w);
  g.userData.muzzleZ = box.min.z;
  g.visible = false; vmRoot.add(g); vmModels[id] = g;
  return g;
}
(function () {
  vmFlash = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(boxGeo, m); b.scale.set(0.09, 0.09, 0.09); b.rotation.set(i * 0.8, i * 0.5, i * 0.7); vmFlash.add(b); }
  const core = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })); core.scale.setScalar(0.04); vmFlash.add(core);
  vmScene.add(vmFlash);
})();
function drawViewmodel(p) {
  const id = curW(p), def = WEAPONS[id];
  for (const k in vmModels) vmModels[k].visible = false;
  vmFlash.visible = false;
  if (!p.alive || (M.zoom && def.scope) || scene === 'results') return;
  const g = vmModel(id), base = VM[id];
  g.visible = true;
  const bob = Math.sin(p.walkPhase) * 0.012 * Math.min(1.4, p.moving), bob2 = Math.abs(Math.cos(p.walkPhase)) * 0.01 * Math.min(1.4, p.moving);
  let x = base.pos[0] + bob, y = base.pos[1] - bob2, z = base.pos[2], rx = 0, ry = 0, rz = 0;
  if (M.zoom && def.kind === 'gun') { x = 0.0; y = -0.12; }
  z += M.vmKick * 0.06; rx += M.vmKick * 0.14;
  if (p.reloadT > 0) { const k = Math.sin(Math.PI * (1 - p.reloadT / p.reloadMax)); y -= k * 0.22; rx -= k * 0.7; rz += k * 0.3; }
  if (p.cool > 0 && def.kind !== 'gun' && def.kind !== 'melee') { y -= Math.min(1, p.cool * 2) * 0.1; }
  const s = Math.sin(M.vmSwing * Math.PI);
  if (def.kind === 'melee') {
    if (id === 'scythe') { rz -= s * 1.6; ry += s * 0.8; x -= s * 0.25; y += s * 0.1; }
    else if (id === 'fist') { z -= s * 0.28; if (g.userData.left) g.userData.left.position.z = 0.06 + s * 0.1; }
    else { z -= s * 0.3; rx -= s * 0.3; ry += s * 0.4; }
  }
  if (M.vmThrow > 0) { const k = Math.sin(M.vmThrow * Math.PI); z -= k * 0.25; y += k * 0.12; rx -= k * 0.8; }
  g.position.set(x, y - 0.03, z - 0.04); g.rotation.set(rx, ry, rz); g.scale.setScalar(base.s * 0.64);
  if (M.vmKick > 0.7 && (def.kind === 'gun' || def.kind === 'rocket')) {
    vmFlash.visible = true;
    vmFlash.position.set(x, y - 0.03, z - 0.04 + g.userData.muzzleZ * base.s * 0.64 - 0.03);
    vmFlash.rotation.z = M.t * 40;
  }
}

// ---- Camera --------------------------------------------------------------------------------
function placeCamera(alpha) {
  const p = M.player;
  if (p.alive) {
    const bob = Math.abs(Math.sin(p.walkPhase)) * 0.05 * Math.min(1.4, p.moving) * (p.onGround ? 1 : 0);
    camera.position.set(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha) + EYE + bob, lerp(p.pz, p.z, alpha));
    const sh = M.shake * 0.05;
    camera.rotation.set(p.pitch + M.recoil + Math.sin(M.t * 61) * sh, p.yaw + Math.sin(M.t * 47) * sh, 0);
    const def = WEAPONS[curW(p)];
    const target = M.zoom ? (def.scope ? tune.zoom_fov : tune.fov * 0.78) : tune.fov;
    camera.fov = lerp(camera.fov, target, 0.35);
  } else {
    // Death cam: rise above where you fell and turn to whoever got you.
    const k = Math.min(1, M.deathT / 1.2);
    camera.position.set(p.x, p.y + EYE + k * 2.2, p.z);
    const kb = M.killedBy;
    if (kb && kb.alive && kb !== p) {
      const yaw = Math.atan2(-(kb.x - p.x), -(kb.z - p.z));
      const pit = Math.atan2(kb.y + 1.2 - camera.position.y, Math.hypot(kb.x - p.x, kb.z - p.z));
      camera.rotation.set(lerp(p.pitch, pit, k), lerpAng(p.yaw, yaw, k), 0);
    } else camera.rotation.set(lerp(p.pitch, -0.5, k), p.yaw, 0);
    camera.fov = lerp(camera.fov, tune.fov, 0.2);
  }
  camera.updateProjectionMatrix();
}

/** The title screen's slow fly-over of the maze. */
function placeTitleCamera() {
  const mid = L.N * TILE / 2, t = clock.now() * 0.06;
  camera.position.set(mid + Math.cos(t) * mid * 0.95, L.N * TILE * 0.42, mid + Math.sin(t) * mid * 0.95);
  camera.fov = 55; camera.updateProjectionMatrix();
  camera.lookAt(mid, 0, mid);
}

// ---- The figures line-up (?scene=figures) ----------------------------------------------------
let figScene = null, figList = [];
function buildFigures() {
  figScene = new THREE.Scene();
  figScene.background = new THREE.Color(0xbfe6ff);
  figScene.add(new THREE.HemisphereLight(0xffffff, 0xe8dff0, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 12, 10); figScene.add(sun);
  const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(16, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 12), new THREE.MeshLambertMaterial({ color: FLOOR_COLOR, map: ft }));
  floor.rotation.x = -Math.PI / 2; figScene.add(floor);
  const back = new THREE.Mesh(new THREE.BoxGeometry(48, 3.6, 3), new THREE.MeshLambertMaterial({ color: 0xffe48f, map: blockTex }));
  back.position.set(0, 1.8, -4.5); figScene.add(back);
  figList = [];
  WEAPON_IDS.forEach((id, i) => {
    const look = BOT_LOOKS[i % BOT_LOOKS.length];
    const m = makeCharacter(look, false);
    const x = (i - (WEAPON_IDS.length - 1) / 2) * 2.05;
    m.group.position.set(x, 0, 0); m.group.rotation.y = Math.PI - 0.45;
    const fake = { held: null, heldModels: {}, walkPhase: 0, moving: 0, fireAnim: 0, swingAnim: id === 'scythe' ? 0.35 : 0 };
    holdWeapon(fake, m, id); poseFigure(m, fake, id, 0);
    figScene.add(m.group);
    figList.push({ x, label: look.name, sub: WEAPONS[id].name });
  });
  return figScene;
}
function renderFigures() {
  if (!figScene) buildFigures();
  camera.position.set(0, 3.2, 14.5); camera.fov = 58; camera.updateProjectionMatrix();
  camera.lookAt(0, 1.0, 0);
  renderer.clear(); renderer.render(figScene, camera);
}
/** Screen position (logical HUD px) of a world point, or null behind the camera. */
function toScreen(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(camera);
  if (v.z > 1) return null;
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
}

/** Draws the world for the current scene. */
function renderWorld(alpha) {
  renderer.clear();
  if (scene === 'figures') { renderFigures(); return; }
  if (!M || !L.scene) return;
  if (scene === 'title') { placeTitleCamera(); syncBots(1); drawFx(); renderer.render(L.scene, camera); return; }
  syncBots(scene === 'play' ? alpha : 1);
  placeCamera(scene === 'play' ? alpha : 1);
  drawFx();
  renderer.render(L.scene, camera);
  drawViewmodel(M.player);
  renderer.clearDepth();
  renderer.render(vmScene, vmCamera);
}

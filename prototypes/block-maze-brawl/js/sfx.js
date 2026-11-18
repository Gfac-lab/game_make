// PROTOTYPE - NOT FOR PRODUCTION
// Question: 미로에서 매번 다른 무기를 든 봇들과 벌이는 빠른 개인전이 재밌고, 열쇠 해금과 로드아웃이 한 판 더를 부르는가?
// Date: 2026-11-18
// Every sound is made in Web Audio: each gun its own crack, blasts, hit ticks and the kill chime.
// Sounds placed in the world are quieter far away and panned left or right.
'use strict';

const sfx = (() => {
  let noiseBuf = null;
  function A() { return audio && !muted ? audio : null; }
  function noise(ac) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
    }
    return noiseBuf;
  }
  /** Loudness and pan for a sound at pos, heard from the camera. */
  function place(pos) {
    if (!pos) return { g: 1, pan: 0 };
    const cp = camera.position, dx = pos.x - cp.x, dz = pos.z - cp.z, d = Math.hypot(dx, dz, pos.y - cp.y);
    const yaw = camera.rotation.y, right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const muffled = lineOfSight(cp.x, cp.z, pos.x, pos.z) ? 1 : 0.55;
    return { g: muffled / (1 + d / 9), pan: d > 0.5 ? Math.max(-0.9, Math.min(0.9, right / d)) : 0 };
  }
  function out(a, pl) {
    const g = a.ac.createGain(); g.gain.value = pl.g;
    if (a.ac.createStereoPanner) { const p = a.ac.createStereoPanner(); p.pan.value = pl.pan; g.connect(p).connect(a.out); }
    else g.connect(a.out);
    return g;
  }
  function burst({ dur = 0.1, freq = 1000, to = null, q = 1, type = 'bandpass', vol = 0.4, pos = null, delay = 0 }) {
    const a = A(); if (!a) return;
    const pl = place(pos); if (pl.g < 0.02) return;
    const t = a.ac.currentTime + delay;
    const src = a.ac.createBufferSource(); src.buffer = noise(a.ac);
    const f = a.ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(out(a, pl));
    src.start(t, Math.abs(Math.sin(t * 91)) * 0.5); src.stop(t + dur + 0.02);
  }
  function osc({ freq = 440, to = null, dur = 0.1, type = 'sine', vol = 0.2, pos = null, delay = 0 }) {
    const a = A(); if (!a) return;
    const pl = place(pos); if (pl.g < 0.02) return;
    const t = a.ac.currentTime + delay;
    const o = a.ac.createOscillator(), g = a.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out(a, pl)); o.start(t); o.stop(t + dur + 0.02);
  }
  const SHOTS = {
    rifle:    p => { burst({ dur: 0.14, freq: 950, q: 0.7, vol: 0.5, pos: p }); osc({ freq: 130, to: 45, dur: 0.08, type: 'square', vol: 0.18, pos: p }); },
    sniper:   p => { burst({ dur: 0.05, freq: 3500, type: 'highpass', vol: 0.5, pos: p }); burst({ dur: 0.55, freq: 1800, to: 300, type: 'lowpass', vol: 0.8, pos: p }); osc({ freq: 85, to: 28, dur: 0.35, vol: 0.55, pos: p }); },
    uzi:      p => { burst({ dur: 0.06, freq: 1700, q: 0.9, vol: 0.38, pos: p }); osc({ freq: 220, to: 90, dur: 0.04, type: 'square', vol: 0.12, pos: p }); },
    rpg:      p => { burst({ dur: 0.55, freq: 700, to: 180, type: 'lowpass', vol: 0.55, pos: p }); osc({ freq: 70, to: 40, dur: 0.25, vol: 0.4, pos: p }); },
    pistol:   p => { burst({ dur: 0.1, freq: 1300, q: 0.8, vol: 0.45, pos: p }); osc({ freq: 190, to: 60, dur: 0.06, type: 'square', vol: 0.14, pos: p }); },
    revolver: p => { burst({ dur: 0.24, freq: 650, q: 0.6, vol: 0.65, pos: p }); osc({ freq: 105, to: 38, dur: 0.16, type: 'square', vol: 0.22, pos: p }); },
  };
  return {
    shot(id, p) { (SHOTS[id] || SHOTS.pistol)(p); },
    swing(id, p) {
      if (id === 'scythe') burst({ dur: 0.28, freq: 500, to: 2600, type: 'bandpass', q: 2, vol: 0.35, pos: p });
      else if (id === 'knife') burst({ dur: 0.12, freq: 1500, to: 4500, type: 'bandpass', q: 3, vol: 0.28, pos: p });
      else burst({ dur: 0.1, freq: 700, to: 1400, type: 'bandpass', q: 1.5, vol: 0.25, pos: p });
    },
    thud(p) { osc({ freq: 140, to: 60, dur: 0.12, type: 'triangle', vol: 0.35, pos: p }); burst({ dur: 0.06, freq: 500, type: 'lowpass', vol: 0.3, pos: p }); },
    boom(p) { burst({ dur: 1.1, freq: 900, to: 90, type: 'lowpass', vol: 0.95, pos: p }); osc({ freq: 58, to: 24, dur: 0.9, vol: 0.85, pos: p }); burst({ dur: 0.08, freq: 3000, type: 'highpass', vol: 0.4, pos: p }); },
    tick(head) { osc({ freq: head ? 2600 : 1900, dur: 0.05, vol: 0.22 }); if (head) osc({ freq: 3200, dur: 0.05, vol: 0.16, delay: 0.04 }); },
    kill() { osc({ freq: 660, dur: 0.11, type: 'triangle', vol: 0.3 }); osc({ freq: 990, dur: 0.18, type: 'triangle', vol: 0.3, delay: 0.08 }); },
    pop(p) { osc({ freq: 420, to: 950, dur: 0.12, type: 'square', vol: 0.18, pos: p }); burst({ dur: 0.15, freq: 1200, vol: 0.25, pos: p }); },
    hurt() { osc({ freq: 230, to: 110, dur: 0.12, type: 'square', vol: 0.16 }); burst({ dur: 0.08, freq: 400, type: 'lowpass', vol: 0.3 }); },
    death() { osc({ freq: 420, to: 70, dur: 0.6, type: 'sawtooth', vol: 0.22 }); },
    empty() { osc({ freq: 1200, dur: 0.025, type: 'square', vol: 0.14 }); },
    lowAmmo() { osc({ freq: 1550, dur: 0.03, vol: 0.1, delay: 0.02 }); },
    reload() { burst({ dur: 0.04, freq: 2500, type: 'highpass', vol: 0.3 }); burst({ dur: 0.05, freq: 1800, type: 'highpass', vol: 0.3, delay: 0.35 }); burst({ dur: 0.05, freq: 2200, type: 'highpass', vol: 0.32, delay: 0.7 }); },
    equip() { burst({ dur: 0.06, freq: 2000, type: 'highpass', vol: 0.18 }); },
    throwSnd(p) { burst({ dur: 0.16, freq: 600, to: 1500, q: 1.2, vol: 0.25, pos: p }); },
    bounce(p) { osc({ freq: 880, dur: 0.05, type: 'triangle', vol: 0.18, pos: p }); },
    jump() { osc({ freq: 300, to: 520, dur: 0.08, vol: 0.08 }); },
    matchPoint() { [523, 659, 784].forEach((f, i) => osc({ freq: f, dur: 0.18, type: 'triangle', vol: 0.22, delay: i * 0.1 })); },
    fanfare(win) {
      const notes = win ? [523, 659, 784, 1047, 1319] : [523, 466, 392, 330];
      notes.forEach((f, i) => osc({ freq: f, dur: 0.3, type: 'triangle', vol: 0.25, delay: i * 0.13 }));
    },
    ui() { osc({ freq: 720, dur: 0.04, type: 'triangle', vol: 0.15 }); },
    buy() { [880, 1175, 1568].forEach((f, i) => osc({ freq: f, dur: 0.12, type: 'triangle', vol: 0.2, delay: i * 0.07 })); },
  };
})();

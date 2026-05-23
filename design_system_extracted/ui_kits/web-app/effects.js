// ────────────────────────────────────────────────────────────────────────
// effects.js — AAA juice helpers (plain JS, loaded before babel scripts)
// Provides: AudioBus (Web Audio synthesised SFX, no asset files needed),
// shake(ms), flash(), domainExpansion(), tilt(el), particles(el).
// ────────────────────────────────────────────────────────────────────────

(function () {
  // Toggle via window.__JJK_AAA = false to disable globally
  function aaa() { return window.__JJK_AAA !== false; }

  // ── AudioBus ─────────────────────────────────────────────────────────
  // No SFX binaries shipped with this prototype. We synthesise short tones
  // with Web Audio: a bass thump for Draw, a metallic shing for Keep, a
  // crumbling rumble for Pass, a UI click for hover. Real production swap
  // would replace `play()` with HTMLAudio loads from /sfx/*.mp3.
  const AudioBus = (function () {
    let ctx = null;
    let muted = false;
    const ensure = () => {
      if (!ctx && typeof AudioContext !== 'undefined') {
        ctx = new AudioContext();
      }
      return ctx;
    };
    function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.22, slide = 0, attack = 0.01, release = 0.08 }) {
      if (muted) return;
      const c = ensure(); if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      const t = c.currentTime;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + release + 0.02);
    }
    function noise({ dur = 0.18, vol = 0.18, bp = 1200, q = 8 }) {
      if (muted) return;
      const c = ensure(); if (!c) return;
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filt = c.createBiquadFilter();
      filt.type = 'bandpass'; filt.frequency.value = bp; filt.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(filt); filt.connect(g); g.connect(c.destination);
      src.start();
    }
    return {
      mute(v) { muted = !!v; },
      isMuted() { return muted; },
      hover() { if (!aaa()) return; tone({ freq: 880, type: 'sine', dur: 0.04, vol: 0.05, attack: 0.005, release: 0.02 }); },
      click() { if (!aaa()) return; tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.06 }); },
      draw()  { if (!aaa()) return; tone({ freq: 110, type: 'sawtooth', dur: 0.2, vol: 0.18, slide: -60 }); noise({ dur: 0.25, vol: 0.06, bp: 240, q: 2 }); },
      keep()  { if (!aaa()) return; noise({ dur: 0.16, vol: 0.18, bp: 4200, q: 14 }); tone({ freq: 2200, type: 'triangle', dur: 0.12, vol: 0.08, slide: 1200 }); },
      pass()  { if (!aaa()) return; noise({ dur: 0.32, vol: 0.14, bp: 800, q: 1 }); tone({ freq: 220, type: 'sawtooth', dur: 0.32, vol: 0.06, slide: -120 }); },
      ult()   { if (!aaa()) return;
                noise({ dur: 0.6, vol: 0.22, bp: 80, q: 1 });
                tone({ freq: 60, type: 'sine', dur: 0.55, vol: 0.3, slide: -20 });
                setTimeout(() => tone({ freq: 1800, type: 'sawtooth', dur: 0.25, vol: 0.18, slide: -1200 }), 350);
              },
    };
  })();

  // ── shake() — apply screen‑shake animation to the app stage ─────────
  function shake(ms = 400) {
    if (!aaa()) return;
    const stage = document.querySelector('.app-stage');
    if (!stage) return;
    stage.classList.remove('shake'); void stage.offsetWidth;
    stage.classList.add('shake');
    setTimeout(() => stage.classList.remove('shake'), ms);
  }

  // ── flash() — fullscreen white pop ───────────────────────────────────
  function flash() {
    if (!aaa()) return;
    const el = document.createElement('div');
    el.className = 'hit-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 360);
  }

  // ── domainExpansion() — red curtain + 領域展開 reveal ────────────────
  function domainExpansion() {
    if (!aaa()) return;
    const el = document.createElement('div');
    el.className = 'domain-curtain';
    document.body.appendChild(el);
    AudioBus.ult();
    shake(900);
    setTimeout(() => el.remove(), 950);
  }

  // ── tilt(el) — mouse‑tracking 3D card tilt + foil angle ──────────────
  function tilt(el) {
    if (!el || !aaa()) return () => {};
    const maxDeg = 12;
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -maxDeg;
      const ry = ((x - cx) / cx) *  maxDeg;
      el.classList.add('tilting');
      el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
      const card = el.querySelector('.char-card');
      if (card) {
        const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
        card.style.setProperty('--foil-angle', angle + 'deg');
      }
    };
    const handleLeave = () => {
      el.classList.remove('tilting');
      el.style.transform = `perspective(1400px) rotateX(0) rotateY(0) scale3d(1,1,1)`;
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleLeave);
    };
  }

  // ── Parallax shrine layers ───────────────────────────────────────────
  function attachParallax(rootEl) {
    if (!rootEl || !aaa()) return () => {};
    const layers = rootEl.querySelectorAll('.shrine-layer');
    const handle = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = ((e.clientX ?? e.touches?.[0]?.clientX ?? w / 2) - w / 2) / w;
      const y = ((e.clientY ?? e.touches?.[0]?.clientY ?? h / 2) - h / 2) / h;
      layers.forEach((l, i) => {
        const depth = (i + 1) * 14;
        l.style.transform = `translate(${-x * depth}px, ${-y * depth}px)`;
      });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }

  // ── Embers (cursed dust particles) ──────────────────────────────────
  function spawnEmbers(container, n = 14) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const e = document.createElement('div');
      e.className = 'ember';
      e.style.left = (Math.random() * 100) + '%';
      e.style.bottom = '-8px';
      e.style.animationDuration = (8 + Math.random() * 10) + 's';
      e.style.animationDelay = (Math.random() * 12) + 's';
      e.style.transform = `scale(${0.6 + Math.random() * 1.2})`;
      container.appendChild(e);
    }
  }

  window.JJK = { AudioBus, shake, flash, domainExpansion, tilt, attachParallax, spawnEmbers, aaa };
})();

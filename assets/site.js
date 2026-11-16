// Shared by every page: storage, theme, sound, top bar, toasts, sharing, confetti, helpers.
const ROOT = new URL("../", document.currentScript.src);   // site root, from any page depth

// localStorage can throw (private mode, in-app browsers): never let that break the page.
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("ww:" + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem("ww:" + key, JSON.stringify(value)); } catch {} },
};

// ---------- theme: Cubist by day, Blue Period by night ----------
const THEME_COLOURS = { cubist: "#d9c7a3", blueperiod: "#0b1626" };
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set("theme", t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOURS[t];
}

// ---------- sound: soft wooden knocks, nothing beepy ----------
const sfx = (() => {
  let ctx = null, muted = store.get("muted", false);
  function play(notes, type = "triangle", vol = 0.08) {
    if (muted) return;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch { return; }
    const t0 = ctx.currentTime + 0.01;
    for (const [f, at, len] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + at);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at); o.stop(t0 + at + len + 0.02);
    }
  }
  return {
    get muted() { return muted; },
    setMuted(m) { muted = m; store.set("muted", m); },
    key:  () => play([[520, 0, .05]], "sine", .05),
    del:  () => play([[330, 0, .05]], "sine", .05),
    flip: () => play([[392, 0, .09]], "triangle", .09),
    bad:  () => play([[180, 0, .12], [150, .1, .16]], "triangle", .1),
    win:  () => play([[523, 0, .2], [659, .1, .2], [784, .2, .2], [1047, .3, .5]], "triangle", .09),
    lose: () => play([[392, 0, .25], [330, .18, .25], [262, .36, .45]], "triangle", .09),
    ok:   () => play([[660, 0, .1], [880, .08, .18]], "sine", .07),
  };
})();

// ---------- icons (simple line drawings) ----------
const ICON = {
  sun:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4"/><path d="M12 7l5 5-5 5-5-5z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="miter"><path d="M15 3 8 6 6 13l4 7 9-2-6-5z"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 9h4l6-5v16l-6-5H3z"/><path d="M17 8l3 4-3 4"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 9h4l6-5v16l-6-5H3z"/><path d="M16 9l6 6M22 9l-6 6"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M8 8l4-4 4 4-4 5v2"/><path d="M12 19v2"/></svg>',
};

// ---------- top bar, built from <body data-page="play|dictionary"> ----------
function buildShell() {
  const page = document.body.dataset.page;
  const bar = document.createElement("header");
  bar.className = "topbar";
  bar.innerHTML = `
    <a class="logo" href="${ROOT}" aria-label="Wolof Wordle home"><span>Wolof Wordle</span></a>
    <nav class="nav" aria-label="Main">
      <a href="${ROOT}" ${page === "play" ? 'aria-current="page"' : ""}>Play</a>
      <a href="${ROOT}dictionary/" ${page === "dictionary" ? 'aria-current="page"' : ""}>Dictionary</a>
    </nav>
    <div class="tools">
      ${page === "play" ? `<button class="iconbtn" id="helpBtn" aria-label="How to play">${ICON.help}</button>` : ""}
      <button class="iconbtn" id="themeBtn"></button>
      <button class="iconbtn" id="muteBtn"></button>
    </div>`;
  document.body.prepend(bar);
  const themeBtn = bar.querySelector("#themeBtn"), muteBtn = bar.querySelector("#muteBtn");
  const paint = () => {
    const day = document.documentElement.dataset.theme === "cubist";
    themeBtn.innerHTML = day ? ICON.moon : ICON.sun;
    themeBtn.setAttribute("aria-label", day ? "Switch to the Blue Period (dark)" : "Switch to Cubist (light)");
    themeBtn.title = day ? "Blue Period" : "Cubist";
    muteBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound;
    muteBtn.setAttribute("aria-label", sfx.muted ? "Turn sound on" : "Turn sound off");
  };
  themeBtn.onclick = () => { setTheme(document.documentElement.dataset.theme === "cubist" ? "blueperiod" : "cubist"); paint(); };
  muteBtn.onclick = () => { sfx.setMuted(!sfx.muted); paint(); sfx.key(); };
  paint();
}

// ---------- small helpers ----------
function toast(msg, ms = 1800) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), ms);
}

async function shareText(text) {
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(text); toast("Copied. Paste it in WhatsApp!"); }
  catch { prompt("Copy this:", text); }
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// "Jërëjëf" -> "jerejef", "ñaar" -> "naar", "ŋ" -> "n": how people type Wolof on a phone.
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ŋ/gi, "n").toLowerCase();

// Day number in Gambian time (GMT), used for the daily word. Same epoch as PK Arcade, so the
// daily word number carries on from the old site.
const dayNumber = (epoch = Date.UTC(2026, 0, 1)) => Math.floor((Date.now() - epoch) / 86400000);

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Win confetti: falling cubist shards in the painting's colours.
function confetti(ms = 2000) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = Object.assign(document.createElement("canvas"), { className: "fx" });
  document.body.appendChild(c);
  const x = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight;
  const css = getComputedStyle(document.documentElement);
  const cols = ["--ochre", "--slate", "--umber", "--paper", "--ink"].map(v => css.getPropertyValue(v).trim());
  const bits = Array.from({ length: 70 }, () => ({
    x: Math.random() * W, y: -30 - Math.random() * H * 0.5, vx: (Math.random() - .5) * 2.4, vy: 2 + Math.random() * 3.5,
    r: Math.random() * 6, vr: (Math.random() - .5) * 0.12, s: 10 + Math.random() * 16, c: cols[Math.floor(Math.random() * cols.length)],
    k: [Math.random(), Math.random(), Math.random()],
  }));
  const start = performance.now();
  (function frame(t) {
    x.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.vy += 0.04; b.r += b.vr;
      x.save(); x.translate(b.x, b.y); x.rotate(b.r);
      x.beginPath(); x.moveTo(0, -b.s * (0.5 + b.k[0] / 2)); x.lineTo(b.s * (0.4 + b.k[1] / 2), b.s / 2); x.lineTo(-b.s * (0.3 + b.k[2] / 2), b.s / 3); x.closePath();
      x.fillStyle = b.c; x.fill(); x.lineWidth = 1.6; x.strokeStyle = "#2a2420"; x.stroke(); x.restore();
    }
    if (t - start < ms) requestAnimationFrame(frame); else c.remove();
  })(start);
}

buildShell();

// Offline: the service worker keeps a copy of the site on the phone.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register(new URL("sw.js", ROOT)).then(r => r.update()).catch(() => {}));
  // when a new version of the site takes over, reload once so it shows straight away
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}

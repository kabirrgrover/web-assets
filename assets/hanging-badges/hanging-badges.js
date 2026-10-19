/*!
 * <hanging-badges> v1.0.0
 * Team ID badges hanging from a rope. They sway with spring physics, shimmer
 * holographically on hover, and flip on click / tap / Enter to a profile back.
 *
 * Zero dependencies. Optional: load qrcode-generator (window.qrcode) for real,
 * scannable QR codes. Without it a decorative QR pattern is drawn instead.
 *
 * Usage:
 *   <script src="hanging-badges.js"></script>
 *   <hanging-badges eyebrow="People · Studio"></hanging-badges>
 *   <script>document.querySelector('hanging-badges').people = [...]</script>
 *
 * MIT License.
 */
(() => {
  if (customElements.get('hanging-badges')) return;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const rng = (seed) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return seed / 4294967296; };

  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  /* Fallback portrait: soft two-tone gradient with initials. */
  function avatarSVG(name) {
    const h = hash(name || 'x');
    const hue = h % 360, hue2 = (hue + 40 + (h >> 9) % 60) % 360;
    const id = 'g' + h.toString(36);
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="${id}" cx="30%" cy="25%" r="90%">
          <stop offset="0" stop-color="hsl(${hue} 80% 88%)"/>
          <stop offset="1" stop-color="hsl(${hue2} 55% 70%)"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#${id})"/>
      <circle cx="50" cy="118" r="44" fill="hsl(${hue2} 40% 52% / .35)"/>
      <circle cx="50" cy="44" r="21" fill="hsl(${hue} 60% 96% / .55)"/>
      <text x="50" y="51" text-anchor="middle" dominant-baseline="middle" font-family="inherit"
        font-size="17" font-weight="600" letter-spacing="-.5" fill="hsl(${hue2} 45% 30%)">${esc(initials(name))}</text>
    </svg>`;
  }

  /* QR: real if window.qrcode (qrcode-generator) is present, else decorative. */
  function qrSVG(text) {
    let n, dark;
    const lib = HangingBadges.qrcode || window.qrcode;
    if (lib && text) {
      try {
        const q = lib(0, 'M'); q.addData(text); q.make();
        n = q.getModuleCount(); dark = (r, c) => q.isDark(r, c);
      } catch (e) { /* fall through */ }
    }
    if (!dark) {
      n = 25; const r = rng(hash(text || 'qr'));
      const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.52));
      const finder = (r0, c0) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const edge = i === 0 || i === 6 || j === 0 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r0 + i][c0 + j] = edge || core; } };
      const clear = (r0, c0) => { for (let i = -1; i < 8; i++) for (let j = -1; j < 8; j++) {
        const a = r0 + i, b = c0 + j; if (a >= 0 && b >= 0 && a < n && b < n) grid[a][b] = false; } };
      clear(0, 0); clear(0, n - 7); clear(n - 7, 0);
      finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
      dark = (r0, c0) => grid[r0][c0];
    }
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="var(--hb-qr-bg)"/><path d="${d}" fill="var(--hb-qr-fg)"/></svg>`;
  }

  const CSS = `
  :host{
    --hb-card-bg:#f4f4f6; --hb-card-fg:#16161a; --hb-muted:#6f6f7a; --hb-line:#dcdce2;
    --hb-rope:#9a9aa4; --hb-pin:#b9bac4; --hb-btn-bg:#1b1b20; --hb-btn-fg:#fff;
    --hb-shadow:0 1px 0 rgba(255,255,255,.7) inset, 0 18px 40px -18px rgba(30,25,60,.28), 0 4px 10px -4px rgba(30,25,60,.12);
    --hb-holo:linear-gradient(118deg,#f6c3e1 0%,#c9dcf8 22%,#cdf1e4 40%,#fbf1c7 56%,#dccbf7 74%,#f5c4dd 90%,#c9dcf8 100%);
    --hb-holo-fg:#1d1b26; --hb-holo-muted:#4f4a5e; --hb-holo-line:rgba(40,30,70,.16);
    --hb-shimmer:linear-gradient(115deg,#ffd1ec 0%,#cfe2ff 25%,#d4fbe9 45%,#fff2c2 62%,#e3d0ff 80%,#ffd1ec 100%);
    --hb-shimmer-blend:multiply; --hb-shimmer-opacity:.75;
    --hb-qr-fg:#16161a; --hb-qr-bg:transparent; --hb-focus:#7a6ff0;
    --hb-font:inherit; --hb-font-display:var(--hb-font); --hb-font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
    display:block; position:relative; font-family:var(--hb-font); color:var(--hb-card-fg);
    -webkit-tap-highlight-color:transparent;
  }
  :host(.hb-dark){
    --hb-card-bg:#1f1f26; --hb-card-fg:#f1f0f6; --hb-muted:#9c9aab; --hb-line:#34343f;
    --hb-rope:#62626e; --hb-pin:#6c6c7a; --hb-btn-bg:#f1f0f6; --hb-btn-fg:#16161a;
    --hb-shadow:0 1px 0 rgba(255,255,255,.06) inset, 0 22px 44px -18px rgba(0,0,0,.7), 0 4px 10px -4px rgba(0,0,0,.5);
    --hb-holo:linear-gradient(118deg,#5b3a63 0%,#2f4670 22%,#2c5a50 40%,#6a5a2e 56%,#4b3a78 74%,#5b3a63 90%,#2f4670 100%);
    --hb-holo-fg:#f6f2ff; --hb-holo-muted:#d2cbe6; --hb-holo-line:rgba(255,255,255,.18);
    --hb-shimmer:linear-gradient(115deg,#ff7ac4 0%,#6fa8ff 25%,#58e6b0 45%,#ffd36a 62%,#a57bff 80%,#ff7ac4 100%);
    --hb-shimmer-blend:soft-light; --hb-shimmer-opacity:.9;
    --hb-qr-fg:#f6f2ff; --hb-focus:#a79fff;
  }
  *{box-sizing:border-box}
  .row{position:relative; width:100%}
  .rope{position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none}
  .rope path{fill:none; stroke:var(--hb-rope); stroke-width:1.4; stroke-linecap:round}
  .rope circle{fill:var(--hb-pin)}
  .hanger{position:absolute; transform-origin:50% 0; will-change:transform; z-index:1}
  .hanger:hover,.hanger:focus-within{z-index:3}
  .string{position:absolute; left:50%; top:0; width:1.2px; margin-left:-.6px; background:var(--hb-rope)}
  .clip{position:absolute; left:50%; width:22px; height:16px; margin-left:-11px; z-index:2; pointer-events:none}
  .clip::before{content:""; position:absolute; left:50%; top:0; width:13px; height:13px; margin-left:-6.5px;
    border-radius:50%; border:2.5px solid var(--hb-pin); background:transparent}
  .clip::after{content:""; position:absolute; left:0; right:0; bottom:0; height:6px; border-radius:3px 3px 2px 2px; background:var(--hb-pin)}
  .card{position:absolute; left:0; perspective:1100px; cursor:pointer; outline:none; container-type:inline-size; border-radius:7cqw}
  .card:focus-visible .face{box-shadow:var(--hb-shadow), 0 0 0 3px var(--hb-focus)}
  .tilt,.flip{position:absolute; inset:0; transform-style:preserve-3d}
  .flip{transition:transform .9s cubic-bezier(.3,1.35,.45,1)}
  .card.flipped .flip{transform:rotateY(180deg)}
  .face{position:absolute; inset:0; border-radius:7cqw; overflow:hidden; backface-visibility:hidden; -webkit-backface-visibility:hidden;
    box-shadow:var(--hb-shadow); display:flex; flex-direction:column}
  .front{background:var(--hb-card-bg); padding:6.4cqw 6.4cqw 5.6cqw}
  .back{transform:rotateY(180deg); background:var(--hb-holo); background-size:240% 240%;
    background-position:calc(var(--mx,50) * 1%) calc(var(--my,50) * 1%); color:var(--hb-holo-fg); padding:6.4cqw}
  .glare{position:absolute; inset:0; pointer-events:none; border-radius:inherit;
    background:radial-gradient(circle at calc(var(--mx,50) * 1%) calc(var(--my,50) * 1%), rgba(255,255,255,.55), rgba(255,255,255,0) 48%);
    opacity:var(--hov,0); transition:opacity .35s}
  .back .glare{opacity:calc(.35 + var(--hov,0) * .4)}
  .shimmer{position:absolute; inset:0; pointer-events:none; border-radius:inherit; background:var(--hb-shimmer);
    background-size:260% 260%; background-position:calc(var(--mx,50) * 1%) calc(var(--my,50) * 1%);
    mix-blend-mode:var(--hb-shimmer-blend); opacity:calc(var(--hov,0) * var(--hb-shimmer-opacity)); transition:opacity .35s}
  .top{display:flex; justify-content:space-between; align-items:center; font-family:var(--hb-font-mono);
    font-size:3.1cqw; letter-spacing:.12em; text-transform:uppercase; color:var(--hb-muted); margin-bottom:4.2cqw}
  .back .top{color:var(--hb-holo-muted)}
  .photo{position:relative; width:100%; aspect-ratio:1/.93; border-radius:4.4cqw; overflow:hidden; background:var(--hb-line); flex:none}
  .photo img,.photo svg{width:100%; height:100%; object-fit:cover; display:block}
  .name{font-family:var(--hb-font-display); font-size:8.6cqw; font-weight:500; letter-spacing:-.025em; line-height:1.1; margin:5.2cqw 0 .8cqw}
  .role{font-size:4.8cqw; color:var(--hb-muted); line-height:1.3}
  .foot{margin-top:auto; padding-top:4.2cqw; border-top:1px solid var(--hb-line); display:flex; justify-content:space-between; align-items:center;
    font-family:var(--hb-font-mono); font-size:3.1cqw; letter-spacing:.12em; text-transform:uppercase}
  .arrow{width:9.4cqw; height:9.4cqw; border-radius:50%; background:var(--hb-btn-bg); color:var(--hb-btn-fg); display:grid; place-items:center; flex:none}
  .arrow svg{width:46%; height:46%}
  .spacer{flex:1; min-height:4cqw}
  .ret{width:8.6cqw; height:8.6cqw; border-radius:50%; background:rgba(255,255,255,.45); display:grid; place-items:center; color:var(--hb-holo-fg)}
  :host(.hb-dark) .ret{background:rgba(255,255,255,.12)}
  .ret svg{width:50%; height:50%}
  .who{display:flex; gap:3.4cqw; align-items:center}
  .mini{width:12.5cqw; height:12.5cqw; border-radius:50%; overflow:hidden; flex:none; background:var(--hb-holo-line)}
  .mini img,.mini svg{width:100%; height:100%; object-fit:cover; display:block}
  .who .name{font-size:6.2cqw; margin:0}
  .who .role{font-size:3.7cqw; color:var(--hb-holo-muted)}
  .loc{display:flex; gap:1.6cqw; align-items:center; font-size:3.5cqw; color:var(--hb-holo-muted); margin:3.6cqw 0 2.6cqw}
  .loc svg{width:3.4cqw; height:3.4cqw}
  .bio{font-size:4.2cqw; line-height:1.42; margin:0 0 4.4cqw; padding-bottom:4.4cqw; border-bottom:1px solid var(--hb-holo-line);
    display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden}
  .lbl{font-family:var(--hb-font-mono); font-size:2.9cqw; letter-spacing:.12em; text-transform:uppercase; color:var(--hb-holo-muted)}
  .proj{list-style:none; margin:1.6cqw 0 0; padding:0}
  .proj li{font-size:4cqw; padding:2.4cqw 0; border-bottom:1px solid var(--hb-holo-line); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .contact{display:flex; justify-content:space-between; align-items:flex-end; gap:3cqw; padding-top:4cqw; border-top:1px solid var(--hb-holo-line)}
  .contact a,.contact span.mail{display:block; color:inherit; text-decoration:none; font-size:3.7cqw; margin-top:1.2cqw; overflow-wrap:anywhere}
  .contact a:hover{text-decoration:underline}
  .qr{width:24cqw; flex:none; text-align:center}
  .qr svg{width:100%; display:block}
  .qr .lbl{font-size:2.5cqw; margin-top:1.2cqw; display:block}
  @media (prefers-reduced-motion: reduce){ .flip{transition:transform .01s} .glare,.shimmer{transition:none} }
  `;

  const ICON_ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 11.5l7-7M6 4.5h5.5V10"/></svg>';
  const ICON_RET = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5L3.5 6 6 8.5"/><path d="M3.5 6H9a3.5 3.5 0 010 7H7"/></svg>';
  const ICON_PIN = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 008 1.5zm0 6.2a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4z"/></svg>';

  class HangingBadges extends HTMLElement {
    static get observedAttributes() { return ['people', 'eyebrow', 'back-eyebrow', 'max-card-width', 'sway', 'theme', 'cta-label']; }

    constructor() {
      super();
      this._people = [];
      this._states = [];
      this._raf = 0;
      this._visible = true;
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="stage" part="stage"></div>`;
      this._stage = this.shadowRoot.querySelector('.stage');
      this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this._tick = this._tick.bind(this);
    }

    /* ---------- public API ---------- */
    get people() { return this._people; }
    set people(v) { this._people = Array.isArray(v) ? v : []; this._render(); }
    flip(i, force) { const s = this._states[i]; if (s) this._setFlip(s, force ?? !s.flipped); }
    flipAll(state = false) { this._states.forEach((s) => this._setFlip(s, state)); }

    connectedCallback() {
      if (!this._people.length) {
        const json = this.querySelector('script[type="application/json"]');
        const attr = this.getAttribute('people');
        try { if (json) this._people = JSON.parse(json.textContent); else if (attr) this._people = JSON.parse(attr); } catch (e) { console.warn('[hanging-badges] invalid people JSON', e); }
      }
      this._ro = new ResizeObserver(() => this._layout());
      this._ro.observe(this);
      this._io = new IntersectionObserver((es) => { this._visible = es[0].isIntersecting; if (this._visible) this._start(); });
      this._io.observe(this);
      this._mo = new MutationObserver(() => this._applyTheme());
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this._mq = matchMedia('(prefers-color-scheme: dark)');
      this._onMq = () => this._applyTheme();
      this._mq.addEventListener('change', this._onMq);
      this._onVis = () => { if (!document.hidden) this._start(); };
      document.addEventListener('visibilitychange', this._onVis);
      this._applyTheme();
      this._render();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._raf = 0;
      this._ro?.disconnect(); this._io?.disconnect(); this._mo?.disconnect();
      this._mq?.removeEventListener('change', this._onMq);
      document.removeEventListener('visibilitychange', this._onVis);
    }
    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      if (name === 'theme') return this._applyTheme();
      if (name === 'people') { try { this._people = JSON.parse(newV || '[]'); } catch (e) { return; } }
      if (this.isConnected) this._render();
    }

    /* ---------- theme ---------- */
    _applyTheme() {
      const t = this.getAttribute('theme') || 'auto';
      const root = document.documentElement;
      let dark;
      if (t === 'dark') dark = true;
      else if (t === 'light') dark = false;
      else {
        const dt = root.getAttribute('data-theme');
        dark = dt === 'dark' || root.classList.contains('dark') || (dt !== 'light' && !root.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches);
      }
      this.classList.toggle('hb-dark', !!dark);
    }

    /* ---------- render ---------- */
    _render() {
      if (!this.isConnected) return;
      const eyebrow = this.getAttribute('eyebrow') ?? 'People · Studio';
      const backEyebrow = this.getAttribute('back-eyebrow') ?? 'Profile';
      const cta = this.getAttribute('cta-label') ?? 'View profile';
      this._stage.innerHTML = '';
      this._states = this._people.map((p, i) => {
        const num = String(i + 1).padStart(2, '0');
        const photo = p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" draggable="false">` : avatarSVG(p.name);
        const qrText = p.qr || (p.url ? p.url : p.email ? `mailto:${p.email}` : p.name);
        const projects = (p.projects || []).slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('');
        const email = p.email ? `<a href="mailto:${esc(p.email)}" data-nolift>${esc(p.email)}</a>` : p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" data-nolift>${esc(p.url.replace(/^https?:\/\//, ''))}</a>` : '';

        const hanger = document.createElement('div');
        hanger.className = 'hanger';
        hanger.innerHTML = `
          <div class="string"></div><div class="clip"></div>
          <div class="card" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(p.name)}, ${esc(p.role || '')}. Flip badge">
            <div class="tilt"><div class="flip">
              <div class="face front" part="front">
                <div class="top"><span>${esc(eyebrow)}</span><span>#${num}</span></div>
                <div class="photo">${photo}</div>
                <div class="name">${esc(p.name)}</div>
                <div class="role">${esc(p.role || '')}</div>
                <div class="spacer"></div>
                <div class="foot"><span>${esc(cta)}</span><span class="arrow">${ICON_ARROW}</span></div>
                <div class="shimmer"></div><div class="glare"></div>
              </div>
              <div class="face back" part="back" aria-hidden="true">
                <div class="top"><span>${esc(backEyebrow)} / ${num}</span><span class="ret">${ICON_RET}</span></div>
                <div class="who"><div class="mini">${photo}</div><div><div class="name">${esc(p.name)}</div><div class="role">${esc(p.role || '')}</div></div></div>
                ${p.location ? `<div class="loc">${ICON_PIN}<span>${esc(p.location)}</span></div>` : '<div style="height:3.6cqw"></div>'}
                ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
                ${projects ? `<div class="lbl">${esc(p.projectsLabel || 'Selected projects')}</div><ul class="proj">${projects}</ul>` : ''}
                <div class="spacer"></div>
                <div class="contact">
                  <div style="min-width:0"><div class="lbl">${esc(p.contactLabel || "Let's connect")}</div>${email}</div>
                  <div class="qr">${qrSVG(qrText)}<span class="lbl">Scan me</span></div>
                </div>
                <div class="glare"></div>
              </div>
            </div></div>
          </div>`;
        const r = rng(hash((p.name || '') + i));
        const s = {
          i, p, hanger, card: hanger.querySelector('.card'), tilt: hanger.querySelector('.tilt'),
          back: hanger.querySelector('.back'), front: hanger.querySelector('.front'),
          theta: (r() - 0.5) * 22, omega: 0, tx: 0, ty: 0, ttx: 0, tty: 0,
          phase: r() * Math.PI * 2, freq: 0.55 + r() * 0.35, lenSeed: r(), flipped: false, lastX: null, hov: 0, thov: 0,
        };
        this._bind(s);
        return s;
      });
      this._layout();
      this._start();
    }

    _layout() {
      const n = this._states.length;
      if (!n) return;
      const cw = this.clientWidth || 800;
      const maxW = parseFloat(this.getAttribute('max-card-width')) || 280;
      const minSlot = Math.min(maxW * 0.62, 190);
      let perRow = Math.max(1, Math.min(n, Math.floor(cw / minSlot)));
      const rows = Math.ceil(n / perRow);
      perRow = Math.ceil(n / rows);
      const slot = cw / perRow;
      const W = Math.min(maxW, slot * 0.84);
      const H = W * 1.47;
      const s = W / 280;
      this._stage.innerHTML = '';
      for (let r = 0; r < rows; r++) {
        const items = this._states.slice(r * perRow, r * perRow + perRow);
        const m = items.length;
        const offset = (cw - m * slot) / 2;
        const x0 = offset + slot * 0.08, x1 = offset + m * slot - slot * 0.08;
        const y0 = 14, sag = Math.min(34, (x1 - x0) * 0.028);
        const pts = items.map((st, k) => {
          const x = offset + slot * (k + 0.5);
          const t = (x - x0) / (x1 - x0);
          return { x, y: y0 + 4 * sag * t * (1 - t) };
        });
        const lens = items.map((st) => (22 + st.lenSeed * 52) * s);
        const rowH = y0 + sag + Math.max(...lens) + H + 46 * s;
        const row = document.createElement('div');
        row.className = 'row';
        row.style.height = rowH + 'px';
        row.innerHTML = `<svg class="rope" aria-hidden="true"><path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 + 2 * sag} ${x1} ${y0}"/>${pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.2"/>`).join('')}</svg>`;
        items.forEach((st, k) => {
          const { x, y } = pts[k], len = lens[k];
          Object.assign(st.hanger.style, { left: x - W / 2 + 'px', top: y + 'px', width: W + 'px', height: len + H + 'px' });
          st.hanger.querySelector('.string').style.height = len + 4 + 'px';
          st.hanger.querySelector('.clip').style.top = len - 9 + 'px';
          Object.assign(st.card.style, { top: len + 'px', width: W + 'px', height: H + 'px' });
          row.appendChild(st.hanger);
        });
        this._stage.appendChild(row);
      }
    }

    /* ---------- interaction ---------- */
    _bind(s) {
      const c = s.card;
      c.addEventListener('pointermove', (e) => {
        const rect = c.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
        s.ttx = -(py - 0.5) * 14; s.tty = (px - 0.5) * 18 * (s.flipped ? -1 : 1);
        c.style.setProperty('--mx', (px * 100).toFixed(1));
        c.style.setProperty('--my', (py * 100).toFixed(1));
        if (s.lastX != null && !this._reduced.matches) {
          const dx = e.clientX - s.lastX;
          s.omega += Math.max(-14, Math.min(14, dx)) * 1.6;
        }
        s.lastX = e.clientX; s.thov = 1; this._start();
      });
      c.addEventListener('pointerleave', () => { s.ttx = 0; s.tty = 0; s.lastX = null; s.thov = 0; });
      c.addEventListener('click', (e) => {
        if (e.target.closest('[data-nolift]')) { e.stopPropagation(); return; }
        this._setFlip(s, !s.flipped);
      });
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._setFlip(s, !s.flipped); }
      });
    }

    _setFlip(s, state) {
      if (s.flipped === state) return;
      s.flipped = state;
      s.card.classList.toggle('flipped', state);
      s.card.setAttribute('aria-pressed', String(state));
      s.front.setAttribute('aria-hidden', String(state));
      s.back.setAttribute('aria-hidden', String(!state));
      s.tty = -s.tty;
      if (!this._reduced.matches) s.omega += (state ? 1 : -1) * (38 + Math.random() * 20);
      this.dispatchEvent(new CustomEvent('badge-flip', { detail: { index: s.i, person: s.p, flipped: state }, bubbles: true, composed: true }));
      this._start();
    }

    /* ---------- physics ---------- */
    _start() { if (!this._raf && this._visible && this.isConnected) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); } }
    _tick(now) {
      this._raf = 0;
      const dt = Math.min(0.033, (now - this._last) / 1000); this._last = now;
      const reduced = this._reduced.matches;
      const sway = reduced ? 0 : parseFloat(this.getAttribute('sway') ?? '1');
      const t = now / 1000;
      let active = sway > 0;
      for (const s of this._states) {
        if (reduced) { s.theta = 0; s.omega = 0; }
        const target = sway * 0.9 * Math.sin(t * s.freq * 2 + s.phase);
        const acc = -26 * (s.theta - target) - 2.1 * s.omega;
        s.omega += acc * dt; s.theta += s.omega * dt;
        s.theta = Math.max(-28, Math.min(28, s.theta));
        const k = 1 - Math.pow(0.0015, dt);
        const tt = reduced ? 0 : 1;
        s.tx += (s.ttx * tt - s.tx) * k; s.ty += (s.tty * tt - s.ty) * k; s.hov += (s.thov - s.hov) * k;
        s.hanger.style.transform = `rotate(${s.theta.toFixed(3)}deg)`;
        s.tilt.style.transform = `rotateX(${s.tx.toFixed(2)}deg) rotateY(${s.ty.toFixed(2)}deg)`;
        s.card.style.setProperty('--hov', s.hov.toFixed(3));
        if (Math.abs(s.omega) > 0.02 || Math.abs(s.theta - target) > 0.02 || Math.abs(s.tx - s.ttx) > 0.02 || Math.abs(s.ty - s.tty) > 0.02 || Math.abs(s.hov - s.thov) > 0.002) active = true;
      }
      if (active && this._visible && !document.hidden) this._raf = requestAnimationFrame(this._tick);
    }
  }

  HangingBadges.qrcode = null; // set to a qrcode-generator factory if not using the global
  window.HangingBadges = HangingBadges;
  customElements.define('hanging-badges', HangingBadges);
})();

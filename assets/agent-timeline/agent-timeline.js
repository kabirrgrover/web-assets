/*!
 * <agent-timeline> v1.0.0
 * A live, scrolling activity timeline for AI agents. Framework-free web component.
 * Drop in with <script src="agent-timeline.js"></script> and use <agent-timeline>.
 * MIT License.
 */
(function () {
  'use strict';

  const MIN = 60000;

  /* ---------- Icon registry ---------- */
  // Default icons are neutral monogram tiles. Swap in real logos with
  // AgentTimeline.registerIcon('notion', { src: 'https://cdn.simpleicons.org/notion' })
  const ICONS = {
    google:  { label: 'G',  bg: '#ffffff', fg: '#3b78e7', ring: true },
    notion:  { label: 'N',  bg: '#ffffff', fg: '#111111', ring: true },
    slack:   { label: '#',  bg: '#ffffff', fg: '#d6336c', ring: true },
    figma:   { label: 'F',  bg: '#f0532d', fg: '#ffffff' },
    github:  { label: 'GH', bg: '#1f2328', fg: '#ffffff' },
    linear:  { label: 'L',  bg: '#5e6ad2', fg: '#ffffff' },
    hubspot: { label: 'H',  bg: '#ff7a59', fg: '#ffffff' },
    stripe:  { label: 'S',  bg: '#635bff', fg: '#ffffff' },
    jira:    { label: 'J',  bg: '#2684ff', fg: '#ffffff' },
    gmail:   { label: 'M',  bg: '#ffffff', fg: '#d93025', ring: true },
    drive:   { label: 'D',  bg: '#ffffff', fg: '#1e8e3e', ring: true },
    sheets:  { label: 'S',  bg: '#1e8e3e', fg: '#ffffff' },
    postgres:{ label: 'PG', bg: '#336791', fg: '#ffffff' },
    aws:     { label: 'A',  bg: '#232f3e', fg: '#ff9900' },
    vercel:  { label: '▲',  bg: '#000000', fg: '#ffffff' },
    supabase:{ label: 'S',  bg: '#1c1c1c', fg: '#3ecf8e' },
    web:     { label: '◎',  bg: '#ffffff', fg: '#555555', ring: true },
    code:    { label: '</>',bg: '#2b2d31', fg: '#ffffff' },
  };

  // Agent avatar glyphs (generic shapes, recolorable).
  const GLYPHS = {
    burst: (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round">${[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map(a => { const r = a * Math.PI / 180, x = Math.cos(r) * 8, y = Math.sin(r) * 8; return `<line x1="${12 - x}" y1="${12 - y}" x2="${12 + x}" y2="${12 + y}"/>`; }).join('')}</svg>`,
    knot:  (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z"/><path d="M12 3.5v8.5l7.4 4.25M12 12l-7.4 4.25M4.6 7.75L12 12l7.4-4.25"/></svg>`,
    spark: (c) => `<svg viewBox="0 0 24 24"><path fill="${c}" d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z"/></svg>`,
    orbit: (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><circle cx="12" cy="12" r="3.2" fill="${c}"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/></svg>`,
    square:(c) => `<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3.5" fill="${c}"/></svg>`,
    dot:   (c) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" fill="${c}"/></svg>`,
  };

  const STATUS_LABEL = { running: 'Running', done: 'Done', failed: 'Failed', 'needs-input': 'Needs you', queued: 'Queued' };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function iconHTML(spec) {
    if (!spec) return '';
    const def = typeof spec === 'string' ? (ICONS[spec] || { label: spec.slice(0, 2).toUpperCase(), bg: '#8a8f98', fg: '#fff' }) : spec;
    if (def.src) return `<img class="ic img" src="${esc(def.src)}" alt="" draggable="false">`;
    if (def.svg) return `<span class="ic svg">${def.svg}</span>`;
    const small = String(def.label).length > 1 ? ' sm' : '';
    return `<span class="ic mono${def.ring ? ' ring' : ''}${small}" style="background:${def.bg};color:${def.fg}">${esc(def.label)}</span>`;
  }

  function avatarHTML(a) {
    const av = a.avatar || {};
    if (av.src) return `<img src="${esc(av.src)}" alt="">`;
    if (av.svg) return av.svg;
    const g = GLYPHS[av.glyph || 'burst'] || GLYPHS.burst;
    return g(av.color || '#d4683f');
  }

  function fmtDur(ms) {
    const m = Math.max(0, Math.round(ms / MIN));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  function fmtWin(min) { return min >= 60 && min % 60 === 0 ? `${min / 60}h` : `${min}m`; }

  /* ---------- Styles ---------- */
  const CSS = `
:host{display:block;font-family:var(--at-font, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif);-webkit-font-smoothing:antialiased;container-type:inline-size}
*{box-sizing:border-box}
.card{
  --bg:#ffffff;--line:#ececee;--line-soft:#f3f3f5;--fg:#18181b;--muted:#8b8b93;--muted-2:#a6a6ad;
  --chip:#efeff1;--chip-fg:#4a4a52;--avatar-bg:#ffffff;--avatar-line:#ececee;
  --run:#1f6fd1;--run-bg:#e6f1fd;--run-bg-2:#d6e8fb;--run-cap:#5b9ce8;--run-shine:rgba(255,255,255,.65);
  --done-bg:#efeff1;--done-fg:#55555d;
  --fail-bg:#fde3e3;--fail-fg:#c9302c;
  --need-bg:#fdecd8;--need-bg-2:#fbe3c7;--need-fg:#b8500e;--need-chip:#fff6ec;--need-dot:#e0702b;
  --link:#7f9bd6;--tip-bg:#232326;--tip-fg:#f4f4f5;--tip-muted:#a1a1aa;
  --pop-bg:#ffffff;--pop-line:#e7e7ea;--btn:#ffffff;--btn-fg:#18181b;--btn-primary:#1f1f22;--btn-primary-fg:#ffffff;
  --shadow:0 1px 2px rgba(16,16,20,.04),0 8px 28px -12px rgba(16,16,20,.10);
  --pop-shadow:0 12px 32px -8px rgba(16,16,20,.22),0 2px 6px rgba(16,16,20,.06);
  --spark:#3a7be0;
  position:relative;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:var(--at-radius,16px);
  box-shadow:var(--shadow);overflow:visible;transition:background-color .45s ease,border-color .45s ease,color .45s ease;
}
.card[data-mode=dark]{
  --bg:#1c1c1f;--line:#2a2a2e;--line-soft:#242428;--fg:#f2f2f3;--muted:#8e8e96;--muted-2:#6f6f77;
  --chip:#2c2c31;--chip-fg:#c2c2c8;--avatar-bg:#1f1f23;--avatar-line:#2e2e33;
  --run:#7fb3f5;--run-bg:#1b2a44;--run-bg-2:#23395c;--run-cap:#5b9ce8;--run-shine:rgba(140,185,255,.18);
  --done-bg:#29292d;--done-fg:#b4b4bb;
  --fail-bg:#3a1d1f;--fail-fg:#f1736d;
  --need-bg:#3a2a1a;--need-bg-2:#45311b;--need-fg:#f5a35f;--need-chip:#2c2117;--need-dot:#e0702b;
  --link:#6c7385;--tip-bg:#e9e9ec;--tip-fg:#18181b;--tip-muted:#6b6b73;
  --pop-bg:#26262a;--pop-line:#36363b;--btn:#2e2e33;--btn-fg:#f2f2f3;--btn-primary:#f2f2f3;--btn-primary-fg:#18181b;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -12px rgba(0,0,0,.5);
  --pop-shadow:0 14px 36px -8px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.3);
  --spark:#4b84e6;
}
header{display:flex;align-items:center;gap:14px;padding:14px 18px 13px 20px;border-bottom:1px solid var(--line);transition:border-color .45s}
header .sp{width:14px;height:14px;flex:none}
header h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em}
.stat{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.stat i{width:7px;height:7px;border-radius:50%;background:var(--run)}
.stat.need{color:var(--need-fg)}
.stat.need i{background:var(--need-dot)}
.stat[hidden]{display:none}
.range{margin-left:auto;font:inherit;font-size:13px;font-weight:500;color:var(--fg);background:var(--chip);border:0;border-radius:8px;padding:5px 10px;cursor:pointer;transition:background-color .45s,color .45s;font-variant-numeric:tabular-nums}
.range:hover{filter:brightness(.97)}
.range:focus-visible,.bar:focus-visible,.btn:focus-visible,.needchip:focus-visible{outline:2px solid var(--run);outline-offset:2px}
.wrap{display:grid;grid-template-columns:var(--at-label-width,190px) minmax(0,1fr);padding:0 18px 14px 20px}
.axis{grid-column:2;position:relative;height:40px}
.tick{position:absolute;top:13px;transform:translateX(-50%);font-size:12px;color:var(--muted-2);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:.01em}
.now{position:absolute;right:0;top:9px;font-size:12px;font-weight:500;color:var(--run);background:var(--run-bg);border-radius:6px;padding:3px 7px;transition:background-color .45s}
.labels{grid-column:1;display:flex;flex-direction:column}
.agent{height:var(--row);display:flex;align-items:center;gap:11px;min-width:0}
.av{width:28px;height:28px;flex:none;border-radius:8px;background:var(--avatar-bg);border:1px solid var(--avatar-line);display:grid;place-items:center;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:background-color .45s,border-color .45s}
.av svg,.av img{width:17px;height:17px;display:block}
.who{min-width:0;display:flex;flex-direction:column;gap:1px}
.nm{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500;line-height:1.25;white-space:nowrap}
.nm span:first-child{overflow:hidden;text-overflow:ellipsis}
.md{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{font-size:11px;font-weight:500;padding:1px 6px;border-radius:5px;background:var(--chip);color:var(--chip-fg);line-height:17px;flex:none;animation:pop .3s ease}
.badge.need{background:var(--need-bg);color:var(--need-fg)}
.track{grid-column:2;position:relative;height:calc(var(--row) * var(--rows));
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 30px);mask-image:linear-gradient(90deg,transparent 0,#000 30px)}
.clip{position:absolute;inset:0;overflow:hidden}
.vline{position:absolute;top:0;bottom:0;width:1px;background:var(--line-soft);transition:background-color .45s}
.hline{position:absolute;left:0;right:0;height:1px;background:var(--line-soft);transition:background-color .45s}
svg.links{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
svg.links path{fill:none;stroke:var(--link);stroke-width:1.3;stroke-dasharray:3 3;stroke-linecap:round;transition:stroke .45s}
.bar{position:absolute;height:var(--bar);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;white-space:nowrap;overflow:hidden;
  font-size:13.5px;font-weight:450;cursor:default;will-change:transform,width;outline:none;
  background:var(--done-bg);color:var(--done-fg);transition:background-color .45s,color .45s,opacity .35s;animation:barIn .45s cubic-bezier(.2,.8,.2,1)}
.bar .t{overflow:hidden;text-overflow:ellipsis;min-width:0}
.bar .ics{display:flex;gap:4px;flex:none}
.bar.running{color:var(--run);background:linear-gradient(90deg,var(--run-bg) 0%,var(--run-bg-2) 100%);border-radius:8px 9px 9px 8px;box-shadow:inset -2.5px 0 0 var(--run-cap)}
.bar.running::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,var(--run-shine) 50%,transparent 70%);background-size:220% 100%;animation:shine 2.6s linear infinite;pointer-events:none}
.bar.failed{background:var(--fail-bg);color:var(--fail-fg)}
.bar.needs-input{background:linear-gradient(90deg,var(--need-bg),var(--need-bg-2));color:var(--need-fg);cursor:pointer;padding-right:5px}
.bar.queued{background:transparent;color:var(--muted);box-shadow:inset 0 0 0 1px var(--line);border-style:dashed}
.needchip{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;color:var(--need-fg);background:var(--need-chip);border:0;border-radius:6px;padding:3px 8px;cursor:pointer;flex:none}
.needchip svg{width:10px;height:10px}
.bar.needs-input .needchip{animation:pulse 2s ease-in-out infinite}
.ic{width:17px;height:17px;flex:none;display:inline-grid;place-items:center;border-radius:5px;font-size:10px;font-weight:700;line-height:1;letter-spacing:-.02em;font-family:ui-sans-serif,system-ui,sans-serif}
.ic.sm{font-size:8px}
.ic.ring{box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.card[data-mode=dark] .ic.ring{box-shadow:none}
.ic.img{object-fit:contain;border-radius:3px}
.ic.svg svg{width:100%;height:100%}
.tip{position:absolute;z-index:5;pointer-events:none;background:var(--tip-bg);color:var(--tip-fg);border-radius:9px;padding:9px 12px 10px;font-size:12.5px;line-height:1.5;
  min-width:170px;max-width:280px;box-shadow:0 10px 26px -8px rgba(0,0,0,.35);opacity:0;transform:translateY(-3px);transition:opacity .15s,transform .15s,background-color .45s}
.tip.on{opacity:1;transform:none}
.tip .h{color:var(--tip-muted);font-size:12px;margin-bottom:3px;white-space:nowrap}
.tip ul{margin:0;padding:0 0 0 2px;list-style:none}
.tip li{display:flex;gap:7px}
.tip li::before{content:"";width:4px;height:4px;border-radius:50%;background:var(--tip-muted);margin-top:.68em;flex:none}
.pop{position:absolute;z-index:6;width:min(310px,calc(100% - 24px));background:var(--pop-bg);border:1px solid var(--pop-line);border-radius:14px;box-shadow:var(--pop-shadow);padding:14px 14px 12px 15px;
  opacity:0;transform:translateY(4px) scale(.98);transform-origin:bottom right;transition:opacity .16s,transform .16s;pointer-events:none}
.pop.on{opacity:1;transform:none;pointer-events:auto}
.pop h3{margin:0 0 4px;font-size:14px;font-weight:600}
.pop p{margin:0 0 12px;font-size:13px;line-height:1.45;color:var(--muted)}
.pop .row{display:flex;justify-content:flex-end;gap:7px}
.btn{font:inherit;font-size:13px;font-weight:500;border-radius:8px;padding:6px 12px;border:1px solid var(--pop-line);background:var(--btn);color:var(--btn-fg);cursor:pointer}
.btn.primary{background:var(--btn-primary);color:var(--btn-primary-fg);border-color:transparent}
.btn:hover{filter:brightness(.96)}
.empty{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;color:var(--muted)}
@keyframes shine{from{background-position:120% 0}to{background-position:-120% 0}}
@keyframes barIn{from{opacity:0;filter:blur(2px)}to{opacity:1;filter:none}}
@keyframes pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,112,43,0)}50%{box-shadow:0 0 0 3px rgba(224,112,43,.18)}}
@container (max-width:560px){
  .wrap{grid-template-columns:var(--at-label-width-sm,118px) minmax(0,1fr);padding:0 12px 10px 14px}
  header{padding:12px 12px 11px 14px;gap:10px;flex-wrap:wrap}
  .md{font-size:11.5px}.nm{font-size:13px}.av{width:24px;height:24px}
  .bar{font-size:12.5px;padding:0 8px;gap:6px}
  .tick{font-size:11px}
  .badge{font-size:0;width:7px;height:7px;padding:0;border-radius:50%;background:var(--muted-2)}
  .badge.need{background:var(--need-dot)}
  .needchip{font-size:0;gap:0;padding:4px 6px}
}
@media (prefers-reduced-motion:reduce){.bar.running::after,.needchip{animation:none!important}.bar{animation:none}}
`;

  const SPARK = `<svg class="sp" viewBox="0 0 24 24"><path fill="var(--spark)" d="M10 1.5c.6 5.6 3.9 8.9 9.5 9.5-5.6.6-8.9 3.9-9.5 9.5C9.4 14.9 6.1 11.6.5 11 6.1 10.4 9.4 7.1 10 1.5z"/><circle cx="20" cy="20" r="2.2" fill="var(--spark)"/></svg>`;
  const WARN = `<svg viewBox="0 0 12 12"><path fill="currentColor" d="M6 .8 11.6 11H.4z"/></svg>`;

  /* ---------- Component ---------- */
  class AgentTimeline extends HTMLElement {
    static get observedAttributes() { return ['theme', 'window', 'speed', 'title', 'row-height']; }

    static registerIcon(name, def) { ICONS[name] = def; }
    static get icons() { return ICONS; }
    static registerGlyph(name, fn) { GLYPHS[name] = fn; }

    constructor() {
      super();
      this._agents = [];
      this._tasks = new Map();
      this._els = new Map();
      this._speed = 1;
      this._simBase = Date.now();
      this._perfBase = performance.now();
      this._ranges = [15, 30, 60];
      this._win = 30;
      this._hover = null;
      this._popTask = null;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${CSS}</style>
<div class="card" part="card">
  <header part="header">${SPARK}<h2 class="ttl">Agents</h2>
    <span class="stat run"><i></i><span class="runN">0 running</span></span>
    <span class="stat need" hidden><i></i><span class="needN"></span></span>
    <button class="range" type="button" title="Change time window">Last 30m</button>
  </header>
  <div class="wrap">
    <div class="axis"></div>
    <div class="labels"></div>
    <div class="track"><div class="clip"><div class="grid"></div><svg class="links"></svg><div class="bars"></div></div></div>
  </div>
  <div class="tip" role="tooltip"></div>
  <div class="pop" role="dialog" aria-modal="false"><h3></h3><p></p><div class="row"><button class="btn rej" type="button">Reject</button><button class="btn primary ok" type="button">Approve</button></div></div>
</div>`;
      const $ = (s) => root.querySelector(s);
      this.$ = { card: $('.card'), axis: $('.axis'), labels: $('.labels'), track: $('.track'), grid: $('.grid'), links: $('svg.links'), bars: $('.bars'),
        tip: $('.tip'), pop: $('.pop'), runN: $('.runN'), needN: $('.needN'), need: $('.stat.need'), run: $('.stat.run'), range: $('.range'), ttl: $('.ttl') };
      this._frame = this._frame.bind(this);
      this.$.range.addEventListener('click', () => {
        const i = this._ranges.indexOf(this._win);
        this.windowMinutes = this._ranges[(i + 1) % this._ranges.length];
      });
      this.$.pop.querySelector('.ok').addEventListener('click', () => this._resolve(true));
      this.$.pop.querySelector('.rej').addEventListener('click', () => this._resolve(false));
      this._onDocClick = (e) => { if (this._popTask && !e.composedPath().includes(this.$.pop) && !e.composedPath().some(n => n.classList && n.classList.contains('needs-input'))) this._closePop(); };
      this._onKey = (e) => { if (e.key === 'Escape') this._closePop(); };
    }

    connectedCallback() {
      this._applyTheme();
      this._mq = matchMedia('(prefers-color-scheme: dark)');
      this._mqH = () => this._applyTheme();
      this._mq.addEventListener('change', this._mqH);
      this._mo = new MutationObserver(this._mqH);
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this._ro = new ResizeObserver(() => this._layoutStatic());
      this._ro.observe(this.$.track);
      document.addEventListener('pointerdown', this._onDocClick, true);
      document.addEventListener('keydown', this._onKey);
      this._render();
      this._raf = requestAnimationFrame(this._frame);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      this._mq && this._mq.removeEventListener('change', this._mqH);
      this._mo && this._mo.disconnect();
      this._ro && this._ro.disconnect();
      document.removeEventListener('pointerdown', this._onDocClick, true);
      document.removeEventListener('keydown', this._onKey);
    }
    attributeChangedCallback(n, _o, v) {
      if (n === 'theme') this._applyTheme();
      else if (n === 'window') this.windowMinutes = parseFloat(v) || 30;
      else if (n === 'speed') this.speed = parseFloat(v) || 1;
      else if (n === 'title') this.$.ttl.textContent = v || 'Agents';
      else if (n === 'row-height') this._render();
    }

    /* ----- Clock ----- */
    now() { return this._simBase + (performance.now() - this._perfBase) * this._speed; }
    get speed() { return this._speed; }
    set speed(v) { const n = this.now(); this._speed = Math.max(0, +v || 0); this._simBase = n; this._perfBase = performance.now(); }
    /** Convert minutes relative to the component clock into a timestamp. ago(9) = 9 minutes ago. */
    ago(min) { return this.now() - min * MIN; }
    resetClock(ts = Date.now()) { this._simBase = ts; this._perfBase = performance.now(); }

    get windowMinutes() { return this._win; }
    set windowMinutes(v) { this._win = Math.max(1, +v); this.$.range.textContent = `Last ${fmtWin(this._win)}`; this._layoutStatic(); }
    set ranges(arr) { if (Array.isArray(arr) && arr.length) this._ranges = arr.slice(); }

    /* ----- Data API ----- */
    setData({ agents = [], tasks = [] } = {}) {
      this._agents = agents.map(a => ({ ...a }));
      this._tasks.clear();
      tasks.forEach(t => this._tasks.set(t.id, this._norm(t)));
      this._render();
    }
    getData() { return { agents: this._agents.map(a => ({ ...a })), tasks: [...this._tasks.values()].map(t => ({ ...t })) }; }
    setAgents(agents) { this._agents = agents.map(a => ({ ...a })); this._render(); }
    addAgent(agent) { this._agents.push({ ...agent }); this._render(); }
    removeAgent(id) { this._agents = this._agents.filter(a => a.id !== id); [...this._tasks.values()].forEach(t => t.agent === id && this._tasks.delete(t.id)); this._render(); }
    addTask(task) { const t = this._norm(task); this._tasks.set(t.id, t); this._render(); return t.id; }
    updateTask(id, patch) {
      const t = this._tasks.get(id); if (!t) return;
      const next = this._norm({ ...t, ...patch });
      if ((next.status === 'done' || next.status === 'failed') && next.end == null) next.end = this.now();
      if ((next.status === 'running' || next.status === 'needs-input') && !('end' in patch)) next.end = null;
      this._tasks.set(id, next);
      this._render();
    }
    /** Mark a running task done now. Optionally hand off to a new task (gets an `after` link). */
    completeTask(id, handoff) {
      this.updateTask(id, { status: 'done', end: this.now() });
      if (handoff) return this.addTask({ start: this.now(), status: 'running', ...handoff, after: [...(handoff.after || []), id] });
    }
    removeTask(id) { this._tasks.delete(id); this._render(); }
    getTask(id) { const t = this._tasks.get(id); return t ? { ...t } : null; }
    clear() { this._tasks.clear(); this._render(); }

    _norm(t) {
      const o = { status: 'running', icons: [], steps: [], after: [], ...t };
      if (o.id == null) o.id = 't' + Math.random().toString(36).slice(2, 9);
      if (o.startMin != null) { o.start = this.ago(-o.startMin); delete o.startMin; }
      if (o.endMin != null) { o.end = this.ago(-o.endMin); delete o.endMin; }
      if (o.start == null) o.start = this.now();
      if (o.start instanceof Date) o.start = +o.start;
      if (o.end instanceof Date) o.end = +o.end;
      if (o.end === undefined) o.end = (o.status === 'running' || o.status === 'needs-input' || o.status === 'queued') ? null : this.now();
      if (!Array.isArray(o.after)) o.after = o.after ? [o.after] : [];
      return o;
    }

    _agentState(id) {
      let running = false, needs = false;
      for (const t of this._tasks.values()) if (t.agent === id) { if (t.status === 'running') running = true; if (t.status === 'needs-input') needs = true; }
      return needs ? 'needs' : running ? 'running' : 'idle';
    }

    /* ----- Theme ----- */
    _applyTheme() {
      const attr = this.getAttribute('theme');
      let mode;
      if (attr === 'dark' || attr === 'light') mode = attr;
      else {
        const dt = document.documentElement.getAttribute('data-theme');
        mode = (dt === 'dark' || dt === 'light') ? dt : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
      this.$.card.dataset.mode = mode;
    }

    /* ----- Rendering ----- */
    _render() {
      if (!this.isConnected) return;
      const rowH = parseFloat(this.getAttribute('row-height')) || 54;
      const card = this.$.card;
      card.style.setProperty('--row', rowH + 'px');
      card.style.setProperty('--bar', Math.round(rowH * 0.57) + 'px');
      card.style.setProperty('--rows', Math.max(1, this._agents.length));
      this._rowH = rowH;

      // labels
      this.$.labels.innerHTML = this._agents.map(a => {
        const st = this._agentState(a.id);
        const badge = st === 'needs' ? `<span class="badge need">Needs you</span>` : st === 'idle' ? `<span class="badge">Idle</span>` : '';
        return `<div class="agent" data-id="${esc(a.id)}"><div class="av">${avatarHTML(a)}</div><div class="who"><div class="nm"><span>${esc(a.name)}</span>${badge}</div>${a.model ? `<div class="md">${esc(a.model)}</div>` : ''}</div></div>`;
      }).join('');

      // header stats
      const running = this._agents.filter(a => [...this._tasks.values()].some(t => t.agent === a.id && t.status === 'running')).length;
      const needN = [...this._tasks.values()].filter(t => t.status === 'needs-input').length;
      this.$.runN.textContent = `${running} running`;
      this.$.needN.textContent = `${needN} need you`;
      this.$.need.hidden = needN === 0;

      // bars (keyed)
      const rowIndex = new Map(this._agents.map((a, i) => [a.id, i]));
      const seen = new Set();
      for (const t of this._tasks.values()) {
        if (!rowIndex.has(t.agent)) continue;
        seen.add(t.id);
        let el = this._els.get(t.id);
        if (!el) {
          el = document.createElement('div');
          el.addEventListener('pointerenter', (e) => this._showTip(el._id, e));
          el.addEventListener('pointermove', (e) => this._moveTip(e));
          el.addEventListener('pointerleave', () => this._hideTip());
          el.addEventListener('focus', () => this._showTip(el._id));
          el.addEventListener('blur', () => this._hideTip());
          el.addEventListener('click', (e) => this._clickBar(el._id, e));
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._clickBar(el._id, e); } });
          this.$.bars.appendChild(el);
          this._els.set(t.id, el);
        }
        el._id = t.id;
        el.className = `bar ${t.status}`;
        el.tabIndex = 0;
        el.setAttribute('role', t.status === 'needs-input' ? 'button' : 'group');
        el.setAttribute('aria-label', `${t.title}, ${STATUS_LABEL[t.status] || t.status}`);
        const sig = [t.status, t.title, JSON.stringify(t.icons)].join('|');
        if (el._sig !== sig) {
          el._sig = sig;
          el.innerHTML = `${t.icons.length ? `<span class="ics">${t.icons.map(iconHTML).join('')}</span>` : ''}<span class="t">${esc(t.title)}</span>${t.status === 'needs-input' ? `<span class="needchip">${WARN}Needs you</span>` : ''}`;
        }
        el._row = rowIndex.get(t.agent);
      }
      for (const [id, el] of this._els) if (!seen.has(id)) { el.remove(); this._els.delete(id); }
      if (this._popTask && (!this._tasks.get(this._popTask) || this._tasks.get(this._popTask).status !== 'needs-input')) this._closePop();

      this._layoutStatic();
      this._frame(true);
    }

    _ticks() {
      const steps = [1, 2, 5, 10, 15, 30, 60, 120, 240];
      const step = steps.find(s => this._win / s <= 6) || 360;
      const out = [];
      for (let m = step; m < this._win - 0.001; m += step) out.push(m);
      return out.filter(m => m / this._win > 0.04 && m / this._win < 0.97);
    }

    _layoutStatic() {
      const W = this.$.track.clientWidth;
      this._W = W;
      let ticks = this._ticks();
      while (ticks.length > 1 && W / (ticks.length + 1) < 52) ticks = ticks.filter((_, i) => i % 2 === 1);
      this.$.axis.innerHTML = ticks.map(m => `<span class="tick" style="left:${(1 - m / this._win) * 100}%">−${fmtWin(m)}</span>`).join('') + `<span class="now">now</span>`;
      const rows = Math.max(1, this._agents.length);
      this.$.grid.innerHTML =
        ticks.map(m => `<div class="vline" style="left:${(1 - m / this._win) * 100}%"></div>`).join('') +
        Array.from({ length: rows }, (_, i) => `<div class="hline" style="top:${(i + 1) * this._rowH - 1}px"></div>`).join('');
    }

    _x(ts, now) { return (ts - (now - this._win * MIN)) / (this._win * MIN) * this._W; }

    _frame(once) {
      if (once !== true) this._raf = requestAnimationFrame(this._frame);
      if (!this._W) { this._W = this.$.track.clientWidth; if (!this._W) return; }
      const now = this.now();
      const barH = Math.round(this._rowH * 0.57);
      const pos = new Map();
      for (const [id, el] of this._els) {
        const t = this._tasks.get(id); if (!t) continue;
        const end = t.end == null ? now : t.end;
        let x1 = this._x(t.start, now), x2 = this._x(end, now);
        if (x2 < -40 || x1 > this._W + 40) { if (!el._hid) { el.style.visibility = 'hidden'; el._hid = true; } continue; }
        if (el._hid) { el.style.visibility = ''; el._hid = false; }
        x2 = Math.min(x2, this._W);
        const w = Math.max(x2 - x1, 6);
        const y = el._row * this._rowH + (this._rowH - barH) / 2 - 1;
        el.style.transform = `translate3d(${x1.toFixed(2)}px,${y}px,0)`;
        el.style.width = w.toFixed(2) + 'px';
        pos.set(id, { x1, x2: x1 + w, y, h: barH });
      }
      // dependency links
      let d = '';
      for (const t of this._tasks.values()) {
        const b = pos.get(t.id); if (!b) continue;
        for (const dep of t.after) {
          const a = pos.get(dep); if (!a) continue;
          const sx = a.x2 + 2, sy = a.y + a.h / 2, ex = b.x1 - 3, ey = b.y + b.h / 2;
          const down = ey > sy;
          const y1 = sy + (down ? 2 : -2), y2 = ey;
          const dx = Math.max(10, Math.min(28, Math.abs(ex - sx) / 2));
          d += `M${sx.toFixed(1)} ${y1.toFixed(1)}C${(sx + dx).toFixed(1)} ${y1.toFixed(1)} ${(ex - dx).toFixed(1)} ${y2.toFixed(1)} ${ex.toFixed(1)} ${y2.toFixed(1)}`;
        }
      }
      if (d !== this._lastD) { this.$.links.innerHTML = d ? `<path d="${d}"/>` : ''; this._lastD = d; }
      if (this._hover) this._fillTip(this._hover);
      if (this._popTask) this._placePop();
    }

    /* ----- Tooltip ----- */
    _fillTip(id) {
      const t = this._tasks.get(id); if (!t) return;
      const a = this._agents.find(x => x.id === t.agent);
      const dur = fmtDur((t.end == null ? this.now() : t.end) - t.start);
      const head = `${esc(a ? a.name : '')} · ${STATUS_LABEL[t.status] || t.status} · ${dur}`;
      const body = t.steps && t.steps.length ? `<ul>${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : (t.detail ? `<div>${esc(t.detail)}</div>` : `<div>${esc(t.title)}</div>`);
      const html = `<div class="h">${head}</div>${body}`;
      if (html !== this._tipHTML) { this.$.tip.innerHTML = html; this._tipHTML = html; }
    }
    _showTip(id, e) {
      if (this._popTask === id) return;
      this._hover = id; this._fillTip(id);
      const el = this._els.get(id);
      this._tipX = e ? e.clientX : el.getBoundingClientRect().left + 30;
      this._positionTip();
      this.$.tip.classList.add('on');
      this.dispatchEvent(new CustomEvent('task-hover', { detail: { task: this.getTask(id) } }));
    }
    _moveTip(e) { if (!this._hover) return; this._tipX = e.clientX; this._positionTip(); }
    _positionTip() {
      const el = this._els.get(this._hover); if (!el) return;
      const cr = this.$.card.getBoundingClientRect(), br = el.getBoundingClientRect(), tip = this.$.tip;
      const tw = tip.offsetWidth || 220, th = tip.offsetHeight || 70;
      let left = this._tipX - cr.left - 24;
      left = Math.max(8, Math.min(left, cr.width - tw - 8));
      let top = br.bottom - cr.top + 8;
      if (top + th > cr.height + 40 && br.top - cr.top - th - 8 > 0) top = br.top - cr.top - th - 8;
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }
    _hideTip() { this._hover = null; this.$.tip.classList.remove('on'); }

    /* ----- Approvals ----- */
    _clickBar(id, e) {
      const t = this._tasks.get(id); if (!t) return;
      this.dispatchEvent(new CustomEvent('task-click', { detail: { task: this.getTask(id) } }));
      if (t.status !== 'needs-input') return;
      if (this._popTask === id) return this._closePop();
      this._hideTip();
      this._popTask = id;
      const p = t.prompt || {};
      this.$.pop.querySelector('h3').textContent = p.title || t.title;
      this.$.pop.querySelector('p').textContent = p.body || 'This agent is waiting for your approval to continue.';
      this.$.pop.querySelector('.ok').textContent = p.approveLabel || 'Approve';
      this.$.pop.querySelector('.rej').textContent = p.rejectLabel || 'Reject';
      this._placePop();
      this.$.pop.classList.add('on');
      setTimeout(() => this.$.pop.querySelector('.ok').focus({ preventScroll: true }), 30);
    }
    _placePop() {
      const el = this._els.get(this._popTask); if (!el) return;
      const cr = this.$.card.getBoundingClientRect(), br = el.getBoundingClientRect(), pop = this.$.pop;
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let left = br.right - cr.left - pw;
      left = Math.max(12, Math.min(left, cr.width - pw - 12));
      let top = br.top - cr.top - ph - 8;
      if (top < 8) top = br.bottom - cr.top + 8;
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
    _closePop() { this._popTask = null; this.$.pop.classList.remove('on'); }
    _resolve(ok) {
      const id = this._popTask; if (!id) return;
      this._closePop();
      const ev = new CustomEvent(ok ? 'task-approve' : 'task-reject', { detail: { task: this.getTask(id) }, cancelable: true });
      if (!this.dispatchEvent(ev)) return; // listener called preventDefault(): you handle state
      if (ok) this.updateTask(id, { status: 'running' });
      else this.updateTask(id, { status: 'failed', end: this.now() });
    }
  }

  if (!customElements.get('agent-timeline')) customElements.define('agent-timeline', AgentTimeline);
  window.AgentTimeline = AgentTimeline;
})();

/*!
 * <topic-cards> v1.0.0
 * An agent chat where every conversation becomes a card. Swipe sideways and the
 * chat blurs back while your topics fan out as soft gradient cards, with a chip
 * strip above the composer. Open a card to jump into that thread, or open the
 * Cards grid to see what the agent is working on and what you bookmarked.
 *
 * Zero dependencies. Shadow DOM, so it will not leak styles into your page.
 *
 * Usage:
 *   <script src="topic-cards.js"></script>
 *   <topic-cards autoplay style="width:390px;height:844px"></topic-cards>
 *   <script>document.querySelector('topic-cards').topics = [...]</script>
 *
 * MIT License.
 */
(() => {
  if (typeof window === 'undefined' || customElements.get('topic-cards')) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const plain = (s) => String(s ?? '').replace(/\*\*/g, '');
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const sleep = (ms, sig) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    if (sig) sig.addEventListener('abort', () => { clearTimeout(t); rej(new Error('abort')); }, { once: true });
  });
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // palette fallback from the title: three related hues
  const autoColors = (seed) => {
    const h = hash(seed) % 360;
    return [`hsl(${h} 78% 62%)`, `hsl(${(h + 25) % 360} 85% 84%)`, `hsl(${(h + 340) % 360} 70% 52%)`];
  };

  const I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/></svg>',
    markOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15h6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  };
  const eyes = (cls = '') => `<span class="eyes ${cls}" aria-hidden="true"><i></i><i></i></span>`;

  const STYLE = `
:host{display:block;position:relative;width:100%;height:100%;min-height:520px;overflow:hidden;contain:layout paint;
  --tc-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif;
  --tc-safe-top:0px;--tc-safe-bottom:0px;
  --tc-bg:#ffffff;--tc-bg-2:#f2f2f6;--tc-fg:#0d0d10;--tc-muted:#8a8a93;--tc-line:rgba(0,0,0,.08);
  --tc-user:#141416;--tc-user-fg:#fff;--tc-agent:#f0f0f3;--tc-agent-fg:#111114;
  --tc-glass:rgba(255,255,255,.72);--tc-glass-line:rgba(0,0,0,.07);--tc-accent:#0a84ff;--tc-dark-card:#141416;
  font-family:var(--tc-font);color:var(--tc-fg);background:var(--tc-bg);-webkit-font-smoothing:antialiased;
  -webkit-tap-highlight-color:transparent}
:host([data-mode=dark]){--tc-bg:#0b0b0d;--tc-bg-2:#141417;--tc-fg:#f4f4f6;--tc-muted:#8d8d97;--tc-line:rgba(255,255,255,.09);
  --tc-user:#f2f2f4;--tc-user-fg:#0d0d10;--tc-agent:#1c1c20;--tc-agent-fg:#ececf0;
  --tc-glass:rgba(28,28,32,.7);--tc-glass-line:rgba(255,255,255,.08);--tc-dark-card:#202024}
*{box-sizing:border-box}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--tc-accent);outline-offset:2px}
.screen{position:absolute;inset:0;overflow:hidden;background:var(--tc-bg)}

/* ---------- chat ---------- */
.chat{position:absolute;inset:0;background:var(--tc-bg);transform-origin:0 0;will-change:transform}
.head{position:absolute;left:0;right:0;top:0;z-index:3;padding:calc(var(--tc-safe-top) + 6px) 14px 26px;display:grid;grid-template-columns:44px 1fr 44px;align-items:start;
  background:linear-gradient(var(--tc-bg) calc(100% - 26px),transparent)}
.who{grid-column:2;justify-self:center;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11.5px;font-weight:500}
.who small{display:flex;align-items:center;gap:2px}
.who small svg{width:10px;height:10px;opacity:.45}
.avatar{width:44px;height:44px;border-radius:50%;background:var(--tc-dark-card);display:grid;place-items:center;font-size:13px;color:#fff;position:relative;overflow:hidden}
.avatar.topic{border-radius:12px;width:40px;height:40px;font-size:11px}
.hbtn{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;color:var(--tc-muted)}
.hbtn svg{width:22px;height:22px}
.hbtn.mark{color:var(--tc-accent);justify-self:end}
.hbtn.backb{justify-self:start;color:var(--tc-fg)}
.scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;
  padding:calc(var(--tc-safe-top) + 92px) 16px calc(var(--tc-safe-bottom) + 112px);transition:filter .45s ease,transform .45s ease,opacity .45s ease}
.scroll::-webkit-scrollbar{display:none}
.msgs{display:flex;flex-direction:column;gap:6px;min-height:100%;justify-content:flex-end}
.stamp{align-self:center;font-size:10.5px;color:var(--tc-muted);margin:12px 0 4px;font-weight:500}
.b{max-width:78%;padding:9px 13px;border-radius:19px;font-size:14px;line-height:1.38;word-wrap:break-word;animation:pop .32s cubic-bezier(.2,.9,.3,1.2) both}
.b b{font-weight:650}
.b.user{align-self:flex-end;background:var(--tc-user);color:var(--tc-user-fg);border-bottom-right-radius:6px}
.b.agent{align-self:flex-start;background:var(--tc-agent);color:var(--tc-agent-fg);border-bottom-left-radius:6px}
.b.agent.link{cursor:pointer}
.b.agent.link:hover{filter:brightness(.97)}
.att{align-self:flex-end;width:62%;aspect-ratio:4/3;border-radius:16px;overflow:hidden;position:relative;margin-top:2px;animation:pop .32s both}
.att img{width:100%;height:100%;object-fit:cover;display:block}
.att.doc{display:grid;place-items:center;color:rgba(255,255,255,.9)}
.att.doc svg{width:34px;height:34px;position:relative;z-index:1}
.read{align-self:flex-end;font-size:10px;color:var(--tc-muted);margin:-2px 4px 0}
.ref{align-self:flex-start;display:flex;gap:10px;align-items:center;padding:8px 12px 8px 8px;border-radius:14px;background:var(--tc-agent);font-size:12px;max-width:70%}
.ref .sw{width:34px;height:34px;border-radius:9px;position:relative;overflow:hidden;flex:none}
.ref b{display:block;font-weight:600}
.ref span{color:var(--tc-muted);font-size:11px}
.typing{align-self:flex-start;padding:12px 14px;border-radius:19px;border-bottom-left-radius:6px;background:var(--tc-agent);color:var(--tc-fg);font-size:11px}
.typing .eyes i{background:currentColor}
@keyframes pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}

/* ---------- deck ---------- */
.veil{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;background:linear-gradient(180deg,rgba(255,255,255,0) 20%,rgba(255,255,255,.35) 60%,rgba(255,255,255,.6));transition:opacity .4s}
:host([data-mode=dark]) .veil{background:linear-gradient(180deg,rgba(0,0,0,0) 20%,rgba(0,0,0,.35) 60%,rgba(0,0,0,.6))}
.screen[data-view=deck] .scroll{filter:blur(14px) saturate(1.1);transform:scale(.985);opacity:.85}
.screen[data-view=deck] .veil{opacity:1;pointer-events:auto}
.deck{position:absolute;left:0;right:0;bottom:calc(var(--tc-safe-bottom) + 118px);z-index:5;pointer-events:none;opacity:0;transform:translateX(18%);transition:opacity .35s ease,transform .5s cubic-bezier(.2,.8,.2,1)}
.screen[data-view=deck] .deck{opacity:1;transform:none;pointer-events:auto}
.track{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:14px 11%;cursor:grab;overscroll-behavior-x:contain}
.track::-webkit-scrollbar{display:none}
.track.dragging{scroll-snap-type:none;cursor:grabbing}
.track > .card{flex:0 0 78%;aspect-ratio:1/.9;scroll-snap-align:center}
.card{position:relative;border-radius:26px;overflow:hidden;text-align:left;color:#fff;isolation:isolate;
  box-shadow:0 18px 40px -18px rgba(20,20,40,.45),0 2px 6px rgba(0,0,0,.06);transition:transform .25s ease,opacity .25s ease;will-change:transform}
.card .top{position:absolute;left:16px;right:16px;top:14px;display:flex;justify-content:space-between;gap:8px;white-space:nowrap;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.82;font-weight:500;z-index:2}
.card .body{position:absolute;left:16px;right:16px;bottom:14px;z-index:2}
.card h3{margin:0 0 4px;font-size:22px;letter-spacing:-.02em;font-weight:650;line-height:1.05;text-shadow:0 1px 12px rgba(0,0,0,.08)}
.card p{margin:0;font-size:11.5px;line-height:1.38;opacity:.9;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card > .eyes{position:absolute;left:50%;top:33%;transform:translate(-50%,-50%);font-size:17px;z-index:2}
.card.dark{background:var(--tc-dark-card)}
.card.dark .mesh{display:none}
.card .swatches{display:flex;gap:6px;margin-bottom:12px}
.card .swatches span{width:26px;height:26px;border-radius:8px;position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.12)}

/* mesh gradient */
.mesh{position:absolute;inset:0;z-index:0;overflow:hidden;background:var(--c1)}
.mesh::before{content:"";position:absolute;inset:-35%;
  background:radial-gradient(38% 42% at 22% 28%,var(--c2),transparent 70%),radial-gradient(46% 50% at 82% 74%,var(--c3),transparent 72%),
  radial-gradient(30% 32% at 62% 22%,rgba(255,255,255,.7),transparent 70%),radial-gradient(40% 40% at 30% 85%,var(--c1),transparent 70%);
  filter:blur(14px);animation:drift var(--dur,16s) ease-in-out infinite alternate;animation-delay:var(--delay,0s)}
.mesh::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.2),rgba(0,0,0,0) 58%)}
@keyframes drift{0%{transform:translate(0,0) rotate(0) scale(1)}50%{transform:translate(4%,-3%) rotate(14deg) scale(1.06)}100%{transform:translate(-4%,3%) rotate(-10deg) scale(1.02)}}

/* eyes */
.eyes{display:inline-flex;gap:.5em;animation:look 7s ease-in-out infinite}
.eyes i{width:.6em;height:.6em;border-radius:50%;background:#fff;display:block;animation:blink 4.6s infinite}
@keyframes blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.12)}}
@keyframes look{0%,30%,100%{transform:translateX(0)}38%,52%{transform:translateX(-.2em)}60%,74%{transform:translateX(.22em)}}

/* ---------- dock ---------- */
.dock{position:absolute;left:0;right:0;bottom:0;z-index:6;padding:0 14px calc(var(--tc-safe-bottom) + 14px);display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none}
.dock > *{pointer-events:auto}
.pager{width:42%;height:18px;border-radius:9px;background:var(--tc-bg-2);box-shadow:inset 0 0 0 1px var(--tc-glass-line);position:relative;transition:opacity .3s,transform .3s}
.pager .pd{position:absolute;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:var(--tc-fg);transition:left .45s cubic-bezier(.2,.8,.2,1)}
.chips{position:absolute;bottom:calc(var(--tc-safe-bottom) + 72px);left:14px;right:14px;height:46px;border-radius:23px;background:var(--tc-glass);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:inset 0 0 0 1px var(--tc-glass-line),0 8px 24px -14px rgba(0,0,0,.25);display:flex;gap:4px;align-items:center;padding:0 5px;overflow-x:auto;scrollbar-width:none;
  opacity:0;transform:translateY(8px);transition:opacity .3s,transform .35s;pointer-events:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex:none;display:flex;align-items:center;gap:7px;height:36px;padding:0 12px 0 6px;border-radius:18px;font-size:12px;color:var(--tc-muted);white-space:nowrap;transition:background .25s,color .25s}
.chip .sw{width:24px;height:24px;border-radius:7px;position:relative;overflow:hidden;flex:none}
.chip .sw.dark{background:var(--tc-dark-card)}
.chip.on{background:var(--tc-bg);color:var(--tc-fg);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.screen[data-view=deck] .chips{opacity:1;transform:none;pointer-events:auto}
.screen[data-view=deck] .pager{opacity:0;transform:scale(.9);pointer-events:none}
.bar{width:100%;display:flex;gap:10px;align-items:center}
.plusb{width:48px;height:48px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--tc-glass);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 0 0 1px var(--tc-glass-line),0 6px 18px -12px rgba(0,0,0,.3)}
.plusb svg{width:20px;height:20px}
.field{flex:1;min-width:0;height:48px;border-radius:24px;display:flex;align-items:center;padding:0 8px 0 18px;background:var(--tc-glass);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 0 0 1px var(--tc-glass-line),0 6px 18px -12px rgba(0,0,0,.3)}
.field input{flex:1;min-width:0;border:0;background:none;font:inherit;font-size:15px;color:var(--tc-fg);outline:none}
.field input::placeholder{color:var(--tc-muted)}
.sendb{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:var(--tc-muted);flex:none;transition:background .2s,color .2s}
.sendb svg{width:18px;height:18px}
.sendb.go{background:var(--tc-fg);color:var(--tc-bg)}

/* ---------- grid ---------- */
.grid{position:absolute;inset:0;z-index:8;background:var(--tc-bg-2);overflow-y:auto;scrollbar-width:none;padding:calc(var(--tc-safe-top) + 14px) 16px calc(var(--tc-safe-bottom) + 28px);
  opacity:0;visibility:hidden;transform:scale(1.03);transition:opacity .35s,transform .45s cubic-bezier(.2,.8,.2,1),visibility 0s .45s}
.grid::-webkit-scrollbar{display:none}
.screen[data-view=grid] .grid{opacity:1;visibility:visible;transform:none;transition:opacity .35s,transform .45s cubic-bezier(.2,.8,.2,1),visibility 0s}
.grid h2{margin:0;font-size:32px;letter-spacing:-.03em;font-weight:700}
.grid .sub{color:var(--tc-muted);font-size:14px;margin-top:2px}
.sect{display:flex;align-items:center;gap:7px;margin:22px 2px 12px;font-size:13.5px;font-weight:600;color:var(--tc-muted)}
.sect .dot{width:6px;height:6px;border-radius:50%;background:var(--tc-fg)}
.sect em{font-style:normal;font-weight:500;opacity:.7}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tiles .card{aspect-ratio:.74;border-radius:20px}
.tiles .card h3{font-size:19px}
.tiles .card .top{left:13px;right:13px;top:12px;font-size:8.5px}
.tiles .card .top span:first-child{overflow:hidden;text-overflow:ellipsis}
.tiles .card p{font-size:10.5px}
.tiles .card > .eyes{top:36%;font-size:14px}
.rule{height:1px;background:var(--tc-line);margin:22px 0 0}
.gclose{position:absolute;right:14px;top:calc(var(--tc-safe-top) + 14px);width:34px;height:34px;border-radius:50%;background:var(--tc-glass);box-shadow:inset 0 0 0 1px var(--tc-glass-line);display:grid;place-items:center;color:var(--tc-fg)}
.gclose svg{width:16px;height:16px;transform:rotate(-90deg)}

.fx{position:absolute;inset:0;z-index:20;pointer-events:none}
.fx .card{position:absolute;margin:0}
.screen[data-busy] *{pointer-events:none!important}
@media (prefers-reduced-motion:reduce){.mesh::before,.eyes,.eyes i{animation:none}.b,.att{animation:none}}
`;

  const DEFAULT_AGENT = { name: 'Agent' };

  class TopicCards extends HTMLElement {
    static get observedAttributes() { return ['theme']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._topics = [];
      this._agent = DEFAULT_AGENT;
      this._view = 'chat';
      this._current = 'all';
      this._ready = false;
    }

    // ---------- data ----------
    set topics(v) {
      this._topics = (v || []).map((t, i) => this._norm(t, i));
      if (!this._ready) return;
      this._current = 'all'; this._renderAll();
      if (this.hasAttribute('autoplay') && !this._tourAc) requestAnimationFrame(() => this.tour());
    }
    get topics() { return this._topics; }
    set agent(v) { this._agent = { ...DEFAULT_AGENT, ...(v || {}) }; if (this._ready) this._renderChat(); }
    get agent() { return this._agent; }
    get view() { return this._view; }
    get current() { return this._current; }

    _norm(t, i) {
      const title = t.title || `Topic ${i + 1}`;
      const id = t.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const colors = t.colors && t.colors.length ? [...t.colors] : autoColors(title);
      while (colors.length < 3) colors.push(colors[colors.length - 1]);
      return { id, title, date: t.date || '', colors, working: !!t.working, bookmarked: !!t.bookmarked, summary: t.summary || '', messages: (t.messages || []).slice(), icon: t.icon };
    }
    _t(id) { return this._topics.find((t) => t.id === id); }
    _summary(t) {
      if (t.summary) return t.summary;
      const a = [...t.messages].reverse().find((m) => m.from !== 'user' && m.text);
      return plain(a ? a.text : t.messages.length ? t.messages[t.messages.length - 1].text : '');
    }
    _vars(t, k = 0) {
      const h = hash(t.id);
      return `--c1:${t.colors[0]};--c2:${t.colors[1]};--c3:${t.colors[2]};--delay:${-(h % 9000) / 1000 - k}s;--dur:${13 + (h % 6)}s`;
    }

    // ---------- lifecycle ----------
    connectedCallback() {
      if (this._ready) return;
      if (!this._topics.length) {
        try {
          const src = this.getAttribute('topics') || (this.querySelector('script[type="application/json"]') || {}).textContent;
          if (src) { const d = JSON.parse(src); if (Array.isArray(d)) this.topics = d; else { if (d.agent) this._agent = { ...DEFAULT_AGENT, ...d.agent }; this.topics = d.topics || []; } }
        } catch (e) { console.warn('[topic-cards] could not parse topics JSON', e); }
      }
      this._build();
      this._ready = true;
      this._applyTheme();
      this._renderAll();
      if (this.hasAttribute('autoplay') && this._topics.length) requestAnimationFrame(() => this.tour());
    }
    disconnectedCallback() { this.stopTour(); this._mq && this._mq.removeEventListener('change', this._onMq); }
    attributeChangedCallback(n) { if (n === 'theme' && this._ready) this._applyTheme(); }
    _applyTheme() {
      const t = this.getAttribute('theme') || 'light';
      if (!this._mq) { this._mq = matchMedia('(prefers-color-scheme: dark)'); this._onMq = () => this._applyTheme(); this._mq.addEventListener('change', this._onMq); }
      this.dataset.mode = t === 'auto' ? (this._mq.matches ? 'dark' : 'light') : t;
    }

    _build() {
      const r = this.shadowRoot;
      r.innerHTML = `<style>${STYLE}</style>
      <div class="screen" data-view="chat">
        <section class="chat" part="chat">
          <div class="scroll"><div class="msgs" role="log" aria-live="polite"></div></div>
          <header class="head"></header>
        </section>
        <div class="veil"></div>
        <div class="deck" part="deck"><div class="track" role="listbox" aria-label="Topics"></div></div>
        <div class="chips" role="tablist" aria-label="Topics"></div>
        <div class="dock">
          <button class="pager" aria-label="Browse topics"><span class="pd"></span></button>
          <form class="bar">
            <button class="plusb" type="button" aria-label="New topic">${I.plus}</button>
            <label class="field"><input enterkeyhint="send" autocomplete="off" aria-label="Message" placeholder="Message"><button class="sendb" type="submit" aria-label="Send">${I.mic}</button></label>
          </form>
        </div>
        <section class="grid" part="grid" aria-label="Cards"></section>
        <div class="fx"></div>
      </div>`;
      const $ = (s) => r.querySelector(s);
      this.$ = { screen: $('.screen'), chat: $('.chat'), head: $('.head'), scroll: $('.scroll'), msgs: $('.msgs'), veil: $('.veil'), deck: $('.deck'), track: $('.track'),
        chips: $('.chips'), pager: $('.pager'), pd: $('.pd'), form: $('.bar'), input: $('input'), send: $('.sendb'), plus: $('.plusb'), grid: $('.grid'), fx: $('.fx') };
      this._bind();
    }

    // ---------- render ----------
    _renderAll() { this._renderChat(); this._renderDeck(); this._renderGrid(); this._renderPager(); }

    _renderChat() {
      const { head, msgs, input } = this.$;
      const t = this._current === 'all' ? null : this._t(this._current);
      if (!t) {
        this._current = 'all';
        head.innerHTML = `<span></span><button class="who" data-act="grid" aria-label="Open cards"><span class="avatar">${eyes()}</span><small>${esc(this._agent.name)} ${I.chev}</small></button><span></span>`;
        input.placeholder = 'Message';
        let html = '';
        this._topics.slice().reverse().forEach((tp) => { html += this._msgsHTML(tp, true); });
        msgs.innerHTML = html || `<div class="stamp">Say hi to start your first topic</div>`;
      } else {
        head.innerHTML = `<button class="hbtn backb" data-act="all" aria-label="All messages">${I.back}</button>
          <div class="who"><span class="avatar topic"><span class="mesh" style="${this._vars(t)}"></span>${t.working ? `<span style="position:relative;z-index:1">${eyes()}</span>` : ''}</span><small>${esc(t.title)}</small></div>
          <button class="hbtn mark" data-act="mark" aria-pressed="${t.bookmarked}" aria-label="${t.bookmarked ? 'Remove bookmark' : 'Bookmark'}">${t.bookmarked ? I.markOn : I.mark}</button>`;
        input.placeholder = `Continue ${t.title}`;
        msgs.innerHTML = this._msgsHTML(t, false);
      }
      requestAnimationFrame(() => { this.$.scroll.scrollTop = this.$.scroll.scrollHeight; });
    }

    _msgsHTML(t, linked) {
      let h = t.date ? `<div class="stamp">${esc(t.date)}</div>` : '';
      t.messages.forEach((m) => {
        if (m.image) h += `<div class="att"><img src="${esc(m.image)}" alt="${esc(m.alt || '')}"></div>`;
        if (m.attachment) h += `<div class="att doc"><span class="mesh" style="${this._vars(t)}"></span>${I.doc}</div>`;
        if (m.text) h += `<div class="b ${m.from === 'user' ? 'user' : 'agent'}${linked && m.from !== 'user' ? ' link' : ''}" ${linked && m.from !== 'user' ? `data-open="${esc(t.id)}" title="Open ${esc(t.title)}"` : ''}>${md(m.text)}</div>`;
        if (m.ref) h += `<div class="ref"><span class="sw"><span class="mesh" style="${this._vars(t)}"></span></span><div><b>${esc(m.ref.title)}</b><span>${esc(m.ref.meta || '')}</span></div></div>`;
        if (m.read) h += `<div class="read">${esc(m.read)}</div>`;
      });
      if (t.working && t.typing) h += `<div class="typing">${eyes()}</div>`;
      return h;
    }

    _cardHTML(t, i, n, tag = 'button') {
      const right = t.working ? 'Working…' : `${i + 1}/${n}`;
      return `<${tag} class="card" data-id="${esc(t.id)}" role="option" aria-label="${esc(t.title)}" style="${this._vars(t)}">
        <span class="mesh"></span>
        <span class="top"><span>${esc(t.date)}</span><span>${right}</span></span>
        ${t.working ? eyes() : ''}
        <span class="body"><h3>${esc(t.title)}</h3><p>${esc(this._summary(t))}</p></span></${tag}>`;
    }
    _cardsCardHTML() {
      const bm = this._topics.filter((t) => t.bookmarked);
      const sw = (bm.length ? bm : this._topics).slice(0, 5).map((t) => `<span><span class="mesh" style="${this._vars(t)}"></span></span>`).join('');
      return `<button class="card dark" data-id="__cards" role="option" aria-label="All cards">
        <span class="top"><span>Bookmarked</span><span></span></span>
        <span class="body"><span class="swatches">${sw}</span><h3>Cards</h3><p>${this._topics.length} topics · tap to see them all</p></span></button>`;
    }

    _renderDeck() {
      const n = this._topics.length;
      this.$.track.innerHTML = this._topics.map((t, i) => this._cardHTML(t, i, n)).join('') + this._cardsCardHTML();
      this.$.chips.innerHTML = this._topics.map((t) => `<button class="chip" role="tab" data-id="${esc(t.id)}"><span class="sw"><span class="mesh" style="${this._vars(t)}"></span></span>${esc(t.title)}</button>`).join('')
        + `<button class="chip" role="tab" data-id="__cards"><span class="sw dark"></span>Cards</button>`;
    }

    _renderGrid() {
      const work = this._topics.filter((t) => t.working);
      const bm = this._topics.filter((t) => t.bookmarked);
      const n = this._topics.length;
      const last = this._topics.length ? this._summary(this._topics[0]) : 'No topics yet.';
      const all = `<button class="card dark" data-id="all" aria-label="All messages"><span class="top"><span>${esc(this._agent.name)} · Today</span><span>${n} topics</span></span>${eyes()}
        <span class="body"><h3>All messages</h3><p>${esc(last)}</p></span></button>`;
      const idx = (t) => this._topics.indexOf(t);
      this.$.grid.innerHTML = `<button class="gclose" data-act="all" aria-label="Back to chat">${I.back}</button>
        <h2>Cards</h2><div class="sub">${bm.length} bookmarked</div>
        <div class="sect"><span class="dot"></span>Working <em>${work.length}</em></div>
        <div class="tiles">${all}${work.map((t) => this._cardHTML(t, idx(t), n, 'button')).join('')}</div>
        <div class="rule"></div>
        <div class="sect">Bookmarked <em>${bm.length}</em></div>
        <div class="tiles">${bm.map((t) => this._cardHTML(t, idx(t), n, 'button')).join('') || '<p style="color:var(--tc-muted);font-size:13px">Bookmark a topic to keep it here.</p>'}</div>`;
    }

    _renderPager() {
      const n = this._topics.length + 1;
      const i = this._current === 'all' ? n - 1 : Math.max(0, this._topics.findIndex((t) => t.id === this._current));
      this.$.pd.style.left = `${12 + (76 * i) / Math.max(1, n - 1)}%`;
    }

    // ---------- deck behaviour ----------
    _cards() { return [...this.$.track.children]; }
    _centerIndex() {
      const tr = this.$.track, mid = tr.scrollLeft + tr.clientWidth / 2;
      let best = 0, bd = Infinity;
      this._cards().forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    _scrollToCard(i, smooth = true) {
      const c = this._cards()[i]; if (!c) return;
      const tr = this.$.track;
      tr.scrollTo({ left: c.offsetLeft - (tr.clientWidth - c.offsetWidth) / 2, behavior: smooth && !reduce() ? 'smooth' : 'auto' });
    }
    _onTrackScroll() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        const tr = this.$.track, mid = tr.scrollLeft + tr.clientWidth / 2;
        this._cards().forEach((c) => {
          const d = Math.min(1, Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) / c.offsetWidth);
          c.style.transform = `scale(${1 - d * 0.08}) translateY(${d * 10}px)`;
          c.style.opacity = String(1 - d * 0.45);
        });
        const i = this._centerIndex();
        if (i !== this._chipIndex) this._setChip(i);
      });
    }
    _setChip(i) {
      this._chipIndex = i;
      const chips = [...this.$.chips.children];
      chips.forEach((c, k) => { c.classList.toggle('on', k === i); c.setAttribute('aria-selected', k === i); });
      const c = chips[i]; if (!c) return;
      const box = this.$.chips;
      box.scrollTo({ left: c.offsetLeft - (box.clientWidth - c.offsetWidth) / 2, behavior: reduce() ? 'auto' : 'smooth' });
    }

    // ---------- views ----------
    _setView(v) {
      if (this._view === v) return;
      this._view = v;
      this.$.screen.dataset.view = v;
      if (v !== 'grid') this.$.chat.style.visibility = '';
      this.dispatchEvent(new CustomEvent('view-change', { detail: { view: v, topic: this._current } }));
    }

    /** Fan the topics out as cards. */
    browse(id) {
      if (!this._topics.length) return;
      if (this._view === 'grid') this._setView('chat');
      const target = id || this._current;
      const i = target === 'all' ? this._topics.length : Math.max(0, this._topics.findIndex((t) => t.id === target));
      this._setView('deck');
      requestAnimationFrame(() => { this._scrollToCard(i, false); this._onTrackScroll(); this._setChip(i); });
    }

    /** Back out of the deck or grid to the current chat. */
    close() { if (this._view !== 'chat') this._setView('chat'); }

    /** Open a topic thread ('all' for the main feed). Animates from wherever you are. */
    async open(id = 'all') {
      if (this._busy) return;
      if (id === '__cards') return this.showCards();
      const t = id === 'all' ? null : this._t(id);
      if (id !== 'all' && !t) return;
      const was = this._view;
      if (was === 'deck') {
        const card = this._cards().find((c) => c.dataset.id === id);
        this._current = id; this._renderChat(); this._renderPager();
        if (card) await this._flyToFull(card); else this._setView('chat');
        this._setView('chat');
      } else if (was === 'grid') {
        const tile = this.$.grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        this._current = id; this._renderChat(); this._renderPager();
        await this._growChatFrom(tile);
      } else {
        this._current = id; this._renderChat(); this._renderPager();
        if (!reduce()) this.$.msgs.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
      }
      this.dispatchEvent(new CustomEvent('topic-open', { detail: { id, topic: t } }));
    }

    /** Show the Cards grid (Working + Bookmarked). */
    async showCards() {
      if (this._busy) return;
      this._renderGrid();
      if (this._view === 'deck') this.$.screen.dataset.view = 'chat';
      this._setView('grid');
      const tile = this.$.grid.querySelector('.card[data-id="all"]');
      await this._shrinkChatTo(tile);
    }

    // ---------- motion ----------
    _rect(el) {
      const s = this.$.screen.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, W: s.width, H: s.height };
    }
    async _flyToFull(card) {
      this._busy = true; this.$.screen.dataset.busy = '';
      const r = this._rect(card);
      const ghost = card.cloneNode(true);
      ghost.style.cssText += `;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;transform:none;opacity:1`;
      this.$.fx.append(ghost);
      card.style.visibility = 'hidden';
      this._setView('chat');
      const dur = reduce() ? 1 : 480;
      const a = ghost.animate([
        { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', borderRadius: '26px', opacity: 1 },
        { left: '0px', top: '0px', width: r.W + 'px', height: r.H + 'px', borderRadius: '0px', opacity: 0.92, offset: 0.7 },
        { left: '0px', top: '0px', width: r.W + 'px', height: r.H + 'px', borderRadius: '0px', opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(.3,.7,.1,1)', fill: 'forwards' });
      await a.finished.catch(() => {});
      ghost.remove(); card.style.visibility = '';
      this._busy = false; delete this.$.screen.dataset.busy;
    }
    _thumb(tile) {
      const r = this._rect(tile), s = r.w / r.W;
      return { tf: `translate(${r.x}px,${r.y}px) scale(${s})`, clip: `inset(0px 0px ${Math.max(0, r.H - r.h / s)}px 0px round ${20 / s}px)` };
    }
    async _shrinkChatTo(tile) {
      if (!tile) return;
      this._busy = true; this.$.screen.dataset.busy = '';
      const chat = this.$.chat;
      chat.style.zIndex = 9;
      const th = this._thumb(tile);
      const a = chat.animate([
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
        { transform: th.tf, clipPath: th.clip, opacity: 1, offset: 0.85 },
        { transform: th.tf, clipPath: th.clip, opacity: 0 },
      ], { duration: reduce() ? 1 : 560, easing: 'cubic-bezier(.4,0,.1,1)' });
      await a.finished.catch(() => {});
      chat.style.zIndex = ''; chat.style.visibility = 'hidden';
      this._busy = false; delete this.$.screen.dataset.busy;
    }
    async _growChatFrom(tile) {
      const chat = this.$.chat;
      chat.style.visibility = '';
      if (!tile) { this._setView('chat'); return; }
      this._busy = true; this.$.screen.dataset.busy = '';
      chat.style.zIndex = 9;
      const th = this._thumb(tile);
      const a = chat.animate([
        { transform: th.tf, clipPath: th.clip, opacity: 0 },
        { transform: th.tf, clipPath: th.clip, opacity: 1, offset: 0.12 },
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
      ], { duration: reduce() ? 1 : 560, easing: 'cubic-bezier(.3,.7,.1,1)' });
      await a.finished.catch(() => {});
      this._setView('chat');
      chat.style.zIndex = '';
      this._busy = false; delete this.$.screen.dataset.busy;
    }

    // ---------- messages API ----------
    /** Append a message to a topic. msg: { from:'user'|'agent', text, image?, attachment?, ref?, read? } */
    addMessage(id, msg) {
      const t = this._t(id); if (!t) return;
      t.messages.push(msg);
      this._refresh(id);
    }
    /** Agent reply: appends, clears the working state. */
    reply(id, text, extra = {}) {
      const t = this._t(id); if (!t) return;
      t.typing = false; t.working = !!extra.keepWorking;
      t.messages.push({ from: 'agent', text, ...extra });
      t.summary = '';
      this._refresh(id);
    }
    setWorking(id, on = true, typing = on) {
      const t = this._t(id); if (!t) return;
      t.working = on; t.typing = typing; this._refresh(id);
    }
    /** Create a topic and put it first. Returns the topic. */
    addTopic(data) {
      const t = this._norm(data, this._topics.length);
      let base = t.id, k = 2; while (this._t(t.id)) t.id = `${base}-${k++}`;
      this._topics.unshift(t);
      this._renderDeck(); this._renderGrid(); this._renderPager();
      this.dispatchEvent(new CustomEvent('topic-create', { detail: { topic: t } }));
      return t;
    }
    toggleBookmark(id, on) {
      const t = this._t(id); if (!t) return;
      t.bookmarked = on == null ? !t.bookmarked : !!on;
      this._refresh(id);
      this.dispatchEvent(new CustomEvent('bookmark', { detail: { id, bookmarked: t.bookmarked } }));
    }
    _refresh(id) {
      if (this._current === 'all' || this._current === id) this._renderChat();
      this._renderDeck(); this._renderGrid();
    }

    _send(text) {
      text = text.trim(); if (!text) return;
      let id = this._current;
      if (id === 'all') {
        // a new message on the main feed starts a new topic
        const small = /^(a|an|the|for|to|of|and|or|in|on|with|my|is|it|be|at|by)$/i;
        const words = text.replace(/[?.!,]+/g, '').split(/\s+/).slice(0, 4);
        while (words.length > 1 && small.test(words[words.length - 1])) words.pop();
        const title = words.join(' ');
        const now = new Date();
        const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const t = this.addTopic({ title: title.charAt(0).toUpperCase() + title.slice(1), date, working: true, messages: [] });
        id = t.id; t.typing = true;
      } else {
        const t = this._t(id); t.working = true; t.typing = true;
      }
      this._t(id).messages.push({ from: 'user', text });
      this._refresh(id);
      this.dispatchEvent(new CustomEvent('topic-send', { detail: { id, text, topic: this._t(id) } }));
    }

    // ---------- input ----------
    _bind() {
      const $ = this.$;
      const stopTourOnUser = (e) => { if (e.isTrusted) this.stopTour(); };
      ['pointerdown', 'keydown', 'wheel'].forEach((ev) => this.shadowRoot.addEventListener(ev, stopTourOnUser, { passive: true }));

      this.shadowRoot.addEventListener('click', (e) => {
        if (this._dragMoved) { this._dragMoved = false; return; }
        const act = e.target.closest('[data-act]');
        if (act) {
          const a = act.dataset.act;
          if (a === 'grid') this.showCards();
          else if (a === 'all') this.open('all');
          else if (a === 'mark') this.toggleBookmark(this._current);
          return;
        }
        const op = e.target.closest('[data-open]');
        if (op) { this.open(op.dataset.open); return; }
        const card = e.target.closest('.card');
        if (card && (this._view === 'deck' || this._view === 'grid')) {
          if (this._view === 'deck') {
            const i = this._cards().indexOf(card);
            if (i !== this._centerIndex()) { this._scrollToCard(i); return; }
          }
          this.open(card.dataset.id); return;
        }
        const chip = e.target.closest('.chip');
        if (chip) { const i = [...$.chips.children].indexOf(chip); this._scrollToCard(i); this._setChip(i); return; }
      });
      $.veil.addEventListener('click', () => this.close());
      $.pager.addEventListener('click', () => this.browse());
      $.plus.addEventListener('click', () => { this.open('all'); $.input.focus(); });

      $.input.addEventListener('input', () => {
        const has = !!$.input.value.trim();
        $.send.classList.toggle('go', has); $.send.innerHTML = has ? I.send : I.mic;
      });
      $.form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this._view !== 'chat') this.close();
        this._send($.input.value); $.input.value = ''; $.input.dispatchEvent(new Event('input'));
      });

      $.track.addEventListener('scroll', () => this._onTrackScroll(), { passive: true });

      // mouse drag on the track (touch uses native scrolling)
      let drag = null;
      $.track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { x: e.clientX, left: $.track.scrollLeft, moved: false };
      });
      window.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; $.track.classList.add('dragging'); }
        if (drag.moved) $.track.scrollLeft = drag.left - dx;
      });
      window.addEventListener('pointerup', () => {
        if (!drag) return;
        if (drag.moved) { this._dragMoved = true; $.track.classList.remove('dragging'); const i = this._centerIndex(); this._scrollToCard(i); setTimeout(() => (this._dragMoved = false), 0); }
        drag = null;
      });

      // horizontal swipe on the chat opens the deck
      let sw = null;
      $.scroll.addEventListener('pointerdown', (e) => { if (this._view === 'chat') sw = { x: e.clientX, y: e.clientY }; });
      $.scroll.addEventListener('pointermove', (e) => {
        if (!sw) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.4) { sw = null; this.browse(); }
      });
      $.scroll.addEventListener('pointerup', () => (sw = null));
      $.scroll.addEventListener('pointercancel', () => (sw = null));
      let wheelAcc = 0;
      $.scroll.addEventListener('wheel', (e) => {
        if (this._view !== 'chat' || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
        wheelAcc += e.deltaX; if (Math.abs(wheelAcc) > 60) { wheelAcc = 0; this.browse(); }
      }, { passive: true });

      this.addEventListener('keydown', (e) => {
        if (e.composedPath()[0] === $.input) return;
        if (this._view === 'deck') {
          const i = this._centerIndex();
          if (e.key === 'ArrowRight') { e.preventDefault(); this._scrollToCard(i + 1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); this._scrollToCard(Math.max(0, i - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); this.open(this._cards()[i].dataset.id); }
          else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        } else if (this._view === 'chat' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); this.browse(); }
        else if (this._view === 'grid' && e.key === 'Escape') { e.preventDefault(); this.open('all'); }
      });
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    }

    // ---------- guided tour ----------
    /** Plays a looping walkthrough until the user touches it. */
    async tour() {
      this.stopTour();
      const ids = this._topics.map((t) => t.id);
      if (ids.length < 2) return;
      const ac = (this._tourAc = new AbortController());
      const s = ac.signal;
      const pick = (k) => ids[Math.min(ids.length - 1, k)];
      try {
        while (!s.aborted) {
          if (this._view !== 'chat' || this._current !== 'all') { await this.open('all'); }
          await sleep(1800, s);
          this.browse(pick(0)); await sleep(1100, s);
          const stop1 = Math.min(3, ids.length - 1);
          for (let i = 1; i <= stop1; i++) { this._scrollToCard(i); await sleep(800, s); }
          await sleep(500, s);
          await this.open(ids[stop1]); await sleep(2200, s);
          this.browse(); await sleep(700, s);
          for (let i = stop1 + 1; i <= ids.length; i++) { this._scrollToCard(i); await sleep(420, s); }
          await sleep(900, s);
          await this.showCards(); await sleep(2400, s);
          const w = this._topics.find((t) => t.working && t.id !== ids[stop1]) || this._topics[0];
          await this.open(w.id); await sleep(2400, s);
        }
      } catch (e) { /* aborted */ }
    }
    stopTour() { if (this._tourAc) { this._tourAc.abort(); this._tourAc = null; } }
  }

  customElements.define('topic-cards', TopicCards);
  window.TopicCards = TopicCards;
})();

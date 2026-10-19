/*!
 * <emoji-nav> v1.0
 * Quiet nav links that light up on hover while an emoji pops in beside them.
 * Dependency-free web component. Works in plain HTML, React, Vue, Svelte, Next, etc.
 *
 * Usage:
 *   Load emoji-nav.js once with a normal script tag (src="emoji-nav.js"), then:
 *   <emoji-nav>
 *     <a href="/work"   data-emoji="💼">Work</a>
 *     <a href="/about"  data-emoji="🙋‍♀️">About</a>
 *     <a href="/resume" data-emoji="📝">Resume</a>
 *   </emoji-nav>
 *
 * Item attributes (on each direct child, any element: a, button, span):
 *   data-emoji="💼"        the emoji to show
 *   data-icon="/me.png"    any image URL instead of an emoji (wins over data-emoji)
 *
 * Element attributes (all optional):
 *   emoji-set="fluent"     "fluent" = Microsoft Fluent 3D emoji images (same look on every OS)
 *                          "native" = the system emoji font, zero network
 *   emoji-base="url/"      self-host the Fluent set: folder holding <codepoints>.webp files
 *   show-current           keep the item with aria-current lit when nothing else is hovered
 *   side="left"            emoji on the "left" (default) or "right" of the label
 *
 * CSS custom properties:
 *   --en-idle        resting label color            (default #c3c7cf)
 *   --en-ink         lit label color                (default #111216)
 *   --en-gap         space between items            (default 2.4em)
 *   --en-size        emoji size, relative to label  (default 1.45em)
 *   --en-tilt        resting tilt of the emoji      (default -6deg)
 *   --en-from-tilt   tilt it springs in from        (default -22deg)
 *   --en-in          enter duration                 (default 300ms)
 *   --en-out         exit duration                  (default 180ms)
 *
 * Lit states: :hover, :focus-visible, and [aria-current] with show-current.
 * Events: "emojinav:enter" / "emojinav:leave" bubble from the item, detail: { item, index }
 */
(() => {
  if (typeof window === 'undefined' || customElements.get('emoji-nav')) return;

  const FLUENT = 'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/';

  const CSS = `
:where(emoji-nav){display:flex;flex-wrap:wrap;align-items:center;gap:.4em var(--en-gap);
  --en-idle:#c3c7cf;--en-ink:#111216;--en-gap:2.4em;--en-size:1.45em;
  --en-tilt:-6deg;--en-from-tilt:-22deg;--en-in:300ms;--en-out:180ms;
  padding-inline:calc(var(--en-size) + .3em) 0}
:where(emoji-nav[side=right]){padding-inline:0 calc(var(--en-size) + .3em)}
emoji-nav>.en-item{position:relative;color:var(--en-idle);text-decoration:none;
  transition:color var(--en-out) ease;-webkit-tap-highlight-color:transparent;outline-offset:4px;border-radius:2px}
emoji-nav>.en-item:is(:hover,:focus-visible),
emoji-nav[show-current]:not(:has(>.en-item:is(:hover,:focus-visible)))>[aria-current]:not([aria-current=false]){
  color:var(--en-ink);transition-duration:var(--en-in)}
emoji-nav .en-icon{position:absolute;right:calc(100% + .2em);bottom:.38em;
  font-size:var(--en-size);width:1em;height:1em;line-height:1;display:grid;place-items:center;
  pointer-events:none;user-select:none;-webkit-user-select:none;
  opacity:0;transform-origin:60% 90%;
  transform:translateY(.32em) scale(.5) rotate(var(--en-from-tilt));
  transition:opacity var(--en-out) ease,transform var(--en-out) cubic-bezier(.4,0,.9,.6)}
emoji-nav[side=right] .en-icon{right:auto;left:calc(100% + .2em);transform-origin:40% 90%;
  transform:translateY(.32em) scale(.5) rotate(calc(var(--en-from-tilt) * -1))}
emoji-nav>.en-item:is(:hover,:focus-visible)>.en-icon,
emoji-nav[show-current]:not(:has(>.en-item:is(:hover,:focus-visible)))>[aria-current]:not([aria-current=false])>.en-icon{
  opacity:1;transform:translateY(0) scale(1) rotate(var(--en-tilt));
  transition:opacity calc(var(--en-in) * .55) ease,transform var(--en-in) cubic-bezier(.3,1.6,.55,1)}
emoji-nav[side=right]>.en-item:is(:hover,:focus-visible)>.en-icon,
emoji-nav[side=right][show-current]:not(:has(>.en-item:is(:hover,:focus-visible)))>[aria-current]:not([aria-current=false])>.en-icon{
  transform:translateY(0) scale(1) rotate(calc(var(--en-tilt) * -1))}
emoji-nav .en-icon img{width:100%;height:100%;object-fit:contain;display:block;-webkit-user-drag:none}
@media (prefers-reduced-motion:reduce){
  emoji-nav .en-icon,emoji-nav[side=right] .en-icon,
  emoji-nav>.en-item>.en-icon{transform:rotate(var(--en-tilt))!important;transition:opacity .15s ease!important}
}`;

  const injectCSS = () => {
    if (document.getElementById('emoji-nav-css')) return;
    const s = document.createElement('style');
    s.id = 'emoji-nav-css';
    s.textContent = CSS;
    document.head.prepend(s); // first in <head> so page CSS always wins
  };

  // "🙋‍♀️" -> "1f64b-200d-2640-fe0f"
  const toHex = (str) => [...str].map((c) => c.codePointAt(0).toString(16)).join('-');

  class EmojiNav extends HTMLElement {
    static get observedAttributes() { return ['emoji-set', 'emoji-base']; }

    connectedCallback() {
      injectCSS();
      this._sync();
      if (!this._mo) {
        this._mo = new MutationObserver((list) => {
          if (list.some((m) => m.type === 'childList' || m.target !== this)) this._queue();
        });
      }
      this._mo.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-emoji', 'data-icon'] });
      if (!this._bound) {
        this._bound = true;
        this.addEventListener('pointerover', (e) => this._relay(e, 'enter'));
        this.addEventListener('pointerout', (e) => this._relay(e, 'leave'));
        this.addEventListener('focusin', (e) => this._relay(e, 'enter'));
        this.addEventListener('focusout', (e) => this._relay(e, 'leave'));
      }
    }

    disconnectedCallback() { this._mo && this._mo.disconnect(); }

    attributeChangedCallback() { if (this.isConnected) this._queue(true); }

    // batch changes from one tick into a single pass; a pass is a no-op when nothing changed
    _queue(force) {
      this._force = this._force || !!force;
      if (this._queued) return;
      this._queued = true;
      queueMicrotask(() => {
        const f = this._force;
        this._queued = false;
        this._force = false;
        this._sync(f);
      });
    }

    get items() { return [...this.children].filter((el) => el.classList.contains('en-item')); }

    _relay(e, kind) {
      const item = e.target.closest && e.target.closest('emoji-nav > .en-item');
      if (!item || item.parentElement !== this) return;
      const other = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('emoji-nav > .en-item');
      if (other === item) return; // moving within the same item
      item.dispatchEvent(new CustomEvent('emojinav:' + kind, {
        bubbles: true, detail: { item, index: this.items.indexOf(item) },
      }));
    }

    _sync(force) {
      const set = (this.getAttribute('emoji-set') || 'fluent').toLowerCase();
      const base = this.getAttribute('emoji-base') || FLUENT;
      for (const el of this.children) {
        if (el.tagName === 'TEMPLATE' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
        el.classList.add('en-item');
        const emoji = el.dataset.emoji || '';
        const icon = el.dataset.icon || '';
        const key = icon ? 'i:' + icon : emoji ? set + ':' + base + ':' + emoji : '';
        let span = [...el.children].find((c) => c.classList.contains('en-icon'));
        if (!key) { if (span) span.remove(); continue; }
        if (span && span.dataset.key === key && !force) continue;
        if (!span) {
          span = document.createElement('span');
          span.className = 'en-icon';
          span.setAttribute('aria-hidden', 'true');
          el.prepend(span);
        }
        span.dataset.key = key;
        span.textContent = '';
        span._gen = (span._gen || 0) + 1;
        if (icon) this._img(span, [icon], '');
        else if (set === 'native') span.textContent = emoji;
        else {
          const hex = toHex(emoji);
          const tries = [base + hex + '.webp'];
          if (hex.includes('-fe0f')) tries.push(base + hex.replace(/-fe0f/g, '') + '.webp');
          else tries.push(base + hex + '-fe0f.webp');
          this._img(span, tries, emoji);
        }
      }
    }

    _img(span, urls, fallbackText) {
      const gen = (span._gen = (span._gen || 0) + 1);
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      let i = 0;
      img.onerror = () => {
        if (span._gen !== gen) return; // a newer emoji replaced this one
        i += 1;
        if (i < urls.length) img.src = urls[i];
        else { img.remove(); span.textContent = fallbackText; }
      };
      img.src = urls[0];
      span.appendChild(img);
    }
  }

  customElements.define('emoji-nav', EmojiNav);
})();

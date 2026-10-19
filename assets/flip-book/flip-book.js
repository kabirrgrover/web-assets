/*!
 * <flip-book> v1.0
 * A dependency-free 3D page-curl book as a web component.
 * Any HTML element can be a page. Works in plain HTML, React, Vue, Svelte, Next, etc.
 *
 * Usage:
 *   Load flip-book.js once with a normal script tag (src="flip-book.js"), then:
 *   <flip-book autoplay interval="1800">
 *     <section>Cover</section>
 *     <section>Inside cover</section>
 *     <section>Page 2</section>
 *     ...
 *   </flip-book>
 *
 * Attributes (all optional):
 *   autoplay            flip on a timer
 *   interval="1800"     ms between autoplay flips
 *   duration="900"      ms per flip
 *   segments="16"       strips per page; more = smoother curl, more DOM
 *   curl="70"           how far (deg) the outer edge leads the spine
 *   loop                when autoplay reaches the end, riffle back to the start (on by default with autoplay; set loop="false" to stop)
 *   resume="5000"       ms of idle after user input before autoplay resumes
 *   ratio="0.72"        page width / height
 *   tilt="0"            rotateX of the book in deg
 *   start="0"           spread to open on (0 = closed on front cover)
 *   no-drag             disable pointer dragging
 *   no-center           do not slide the closed book to the center
 *
 * Page attributes:
 *   data-hard           page is stiff (no curl), good for covers
 *
 * CSS custom properties:
 *   --fb-paper          page background (default #fbfbf8)
 *   --fb-edge           page-edge color for the stack thickness
 *   --fb-shadow         drop shadow color
 *
 * Methods: next(), prev(), goTo(spread), play(), pause()
 * Props:   spread (current), spreads (count), pages (count)
 * Events:  "flip"      detail: { spread, spreads, direction }
 *          "flipend"   detail: { spread, spreads }
 *
 * Pages are size containers, so page CSS can use cqw / cqh units to scale with the book.
 */
(() => {
  if (typeof window === 'undefined' || customElements.get('flip-book')) return;

  const CSS = `
flip-book{display:block;position:relative;width:100%;aspect-ratio:calc(2 * var(--fb-ratio,.72));
  --fb-paper:#fbfbf8;--fb-edge:#d9d9d2;--fb-shadow:rgba(20,24,40,.22);
  user-select:none;-webkit-user-select:none;touch-action:pan-y;outline:none;-webkit-tap-highlight-color:transparent}
flip-book:focus-visible{outline:2px solid currentColor;outline-offset:8px;border-radius:2px}
flip-book .fb-stage{position:absolute;inset:0;perspective:var(--fb-persp,2400px);perspective-origin:50% 40%}
flip-book .fb-shift,flip-book .fb-book{position:absolute;inset:0;transform-style:preserve-3d}
flip-book .fb-shift{transition:transform .9s cubic-bezier(.65,0,.35,1)}
flip-book .fb-book{transform:rotateX(var(--fb-tilt,0deg))}
flip-book .fb-base{position:absolute;top:0;width:50%;height:100%;background:var(--fb-paper);transition:opacity .3s}
flip-book .fb-base-l{left:0}
flip-book .fb-drop{position:absolute;top:0;width:50%;height:100%;transform:translateZ(-2px);transition:opacity .45s;pointer-events:none;box-shadow:0 18px 40px -8px var(--fb-shadow),0 2px 6px rgba(0,0,0,.08)}
flip-book .fb-drop-l{left:0}
flip-book .fb-drop-r{left:50%}
flip-book .fb-base-r{left:50%}
flip-book .fb-cast{position:absolute;top:0;width:50%;height:100%;pointer-events:none;opacity:0}
flip-book .fb-cast-l{left:0;background:linear-gradient(to left,rgba(0,0,0,.45),rgba(0,0,0,.12) 60%,rgba(0,0,0,0))}
flip-book .fb-cast-r{left:50%;background:linear-gradient(to right,rgba(0,0,0,.45),rgba(0,0,0,.12) 60%,rgba(0,0,0,0))}
flip-book .fb-leaf{position:absolute;top:0;left:50%;width:50%;height:100%;transform-origin:0 50%;transform-style:preserve-3d}
flip-book .fb-face{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--fb-paper);container-type:size}
flip-book .fb-back{transform:rotateY(180deg)}
flip-book .fb-face::after,flip-book .fb-slice::after{content:"";position:absolute;inset:0;pointer-events:none}
flip-book .fb-front::after{background:linear-gradient(to right,rgba(0,0,0,.16),rgba(0,0,0,.04) 6%,rgba(0,0,0,0) 14%)}
flip-book .fb-back::after{background:linear-gradient(to left,rgba(0,0,0,.16),rgba(0,0,0,.04) 6%,rgba(0,0,0,0) 14%)}
flip-book .fb-curl{position:absolute;inset:0;transform-style:preserve-3d;display:none}
flip-book .fb-leaf.is-curling>.fb-face{display:none}
flip-book .fb-leaf.is-curling>.fb-curl{display:block}
flip-book .fb-strip{position:absolute;top:0;left:100%;width:100%;height:100%;transform-origin:0 50%;transform-style:preserve-3d}
flip-book .fb-curl>.fb-strip{left:0}
flip-book .fb-slice{position:absolute;top:0;bottom:0;left:0;right:-1px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--fb-paper)}
flip-book .fb-slice-b{transform:rotateY(180deg);left:-1px;right:0}
flip-book .fb-slice-f::after{background:rgba(0,0,0,var(--fb-sf,0))}
flip-book .fb-slice-b::after{background:rgba(0,0,0,var(--fb-sb,0))}
flip-book .fb-inner{position:absolute;top:0;height:100%;container-type:size}
flip-book .fb-page{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;margin:0!important;overflow:hidden;box-sizing:border-box}
flip-book .fb-face>.fb-inner{left:0;width:100%}
`;

  function injectCSS() {
    if (document.getElementById('flip-book-css')) return;
    const s = document.createElement('style');
    s.id = 'flip-book-css';
    s.textContent = CSS;
    document.head.prepend(s);
  }

  const div = (cls) => { const d = document.createElement('div'); d.className = cls; return d; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  class FlipBook extends HTMLElement {
    connectedCallback() {
      if (this._built) { this._observe(); return; }
      injectCSS();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._setup(), { once: true });
      } else {
        this._setup();
      }
    }

    disconnectedCallback() {
      clearTimeout(this._timer);
      clearTimeout(this._resumeTimer);
      this._io && this._io.disconnect();
      this._ro && this._ro.disconnect();
    }

    // ---------- options ----------
    _num(name, def) { const v = parseFloat(this.getAttribute(name)); return Number.isFinite(v) ? v : def; }
    get _duration() { return reduceMotion() ? 250 : this._num('duration', 900); }
    get _interval() { return this._num('interval', 1800); }
    get _curl() { return reduceMotion() ? 0 : this._num('curl', 70); }
    get _loop() { const v = this.getAttribute('loop'); return v === null ? this.hasAttribute('autoplay') : v !== 'false'; }

    // ---------- public api ----------
    get spread() { return this._target || 0; }
    get spreads() { return (this._leaves ? this._leaves.length : 0) + 1; }
    get pages() { return this._pageCount || 0; }
    next() { return this._flip(1); }
    prev() { return this._flip(-1); }
    goTo(spread, { stagger } = {}) {
      spread = clamp(Math.round(spread), 0, this._leaves.length);
      const diff = spread - this._target;
      if (!diff) return;
      const dir = Math.sign(diff);
      const gap = stagger != null ? stagger : Math.min(140, this._duration * 0.18);
      for (let k = 0; k < Math.abs(diff); k++) setTimeout(() => this._flip(dir, { duration: this._duration * 0.75 }), k * gap);
    }
    play() { this._playing = true; this._schedule(); }
    pause() { this._playing = false; clearTimeout(this._timer); }

    // ---------- build ----------
    _setup() {
      if (this._built) return;
      this._built = true;
      const pages = [...this.children].filter((n) => n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'TEMPLATE');
      this._pageCount = pages.length;
      this.textContent = '';
      this.style.setProperty('--fb-ratio', this._num('ratio', 0.72));
      this.style.setProperty('--fb-tilt', this._num('tilt', 0) + 'deg');
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
      if (!this.hasAttribute('aria-roledescription')) this.setAttribute('aria-roledescription', 'book');

      this._N = clamp(Math.round(this._num('segments', 16)), 2, 48);
      const stage = div('fb-stage');
      this._shift = div('fb-shift');
      this._book = div('fb-book');
      this._baseL = div('fb-base fb-base-l');
      this._baseR = div('fb-base fb-base-r');
      this._castL = div('fb-cast fb-cast-l');
      this._castR = div('fb-cast fb-cast-r');
      this._dropL = div('fb-drop fb-drop-l');
      this._dropR = div('fb-drop fb-drop-r');
      this._book.append(this._dropL, this._dropR, this._baseL, this._baseR);

      this._leaves = [];
      for (let i = 0; i < pages.length; i += 2) {
        const leafEl = div('fb-leaf');
        const frontPage = pages[i];
        const backPage = pages[i + 1] || Object.assign(document.createElement('div'), { className: 'fb-blank' });
        const front = this._face(frontPage, 'fb-face fb-front');
        const back = this._face(backPage, 'fb-face fb-back');
        const curl = div('fb-curl');
        leafEl.append(front, back, curl);
        this._book.append(leafEl);
        this._leaves.push({
          el: leafEl, front: frontPage, back: backPage, curl, strips: null, p: 0,
          hard: frontPage.hasAttribute('data-hard') || backPage.hasAttribute('data-hard'),
        });
      }
      this._book.append(this._castL, this._castR);
      this._shift.append(this._book);
      stage.append(this._shift);
      this.append(stage);

      this._anims = new Map();
      this._target = 0;
      const start = clamp(Math.round(this._num('start', 0)), 0, this._leaves.length);
      this._leaves.forEach((l, i) => { l.p = i < start ? 1 : 0; this._renderFlat(i); });
      this._target = start;
      this._updateChrome();
      this._bind();
      this._observe();
      if (this.hasAttribute('autoplay')) this.play();
    }

    _face(page, cls) {
      const f = div(cls);
      const inner = div('fb-inner');
      page.classList.add('fb-page');
      inner.append(page);
      f.append(inner);
      return f;
    }

    _buildStrips(leaf) {
      if (leaf.strips) return;
      const N = this._N;
      const strips = [];
      let parent = leaf.curl;
      for (let i = 0; i < N; i++) {
        const s = div('fb-strip');
        if (i === 0) s.style.width = (100 / N) + '%';
        const sf = div('fb-slice fb-slice-f');
        const sb = div('fb-slice fb-slice-b');
        const fi = div('fb-inner');
        const bi = div('fb-inner');
        fi.style.width = bi.style.width = (N * 100) + '%';
        fi.style.left = (-i * 100) + '%';
        bi.style.left = (-(N - 1 - i) * 100) + '%';
        fi.append(leaf.front.cloneNode(true));
        bi.append(leaf.back.cloneNode(true));
        sf.append(fi);
        sb.append(bi);
        s.append(sf, sb);
        parent.append(s);
        parent = s;
        strips.push(s);
      }
      // clones should not be found by assistive tech or duplicate ids in a way that matters
      leaf.curl.setAttribute('aria-hidden', 'true');
      leaf.curl.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      leaf.strips = strips;
    }

    // ---------- rendering ----------
    _z(i, animOrder) {
      const L = this._leaves.length;
      if (animOrder != null) return L + 3 + animOrder;
      return this._leaves[i].p >= 0.5 ? i + 1 : L - i;
    }

    _renderFlat(i) {
      const leaf = this._leaves[i];
      leaf.el.classList.remove('is-curling');
      leaf.el.style.transform = `translateZ(${this._z(i)}px) rotateY(${-180 * leaf.p}deg)`;
    }

    _renderCurl(i, p, dir, order) {
      const leaf = this._leaves[i];
      this._buildStrips(leaf);
      leaf.el.classList.add('is-curling');
      leaf.el.style.transform = `translateZ(${this._z(i, order)}px)`;
      const N = this._N;
      const base = 180 * p;
      const bend = (leaf.hard ? 0 : this._curl) * Math.sin(Math.PI * p);
      let prev = 0;
      for (let k = 0; k < N; k++) {
        const f = Math.pow((k + 0.5) / N, 1.6);
        const a = clamp(base + dir * bend * f, 0, 180);
        const s = leaf.strips[k];
        s.style.transform = `rotateY(${-(a - prev)}deg)`;
        const c = Math.cos(a * Math.PI / 180);
        s.style.setProperty('--fb-sf', ((1 - c) * 0.22).toFixed(3));
        s.style.setProperty('--fb-sb', ((1 + c) * 0.22).toFixed(3));
        prev = a;
      }
    }

    _updateCasts() {
      let l = 0, r = 0;
      this._anims.forEach((a) => {
        const s = Math.sin(Math.PI * a.p);
        if (a.p < 0.5) r = Math.max(r, s * 0.55); else l = Math.max(l, s * 0.55);
      });
      if (this._drag && this._drag.active) {
        const p = this._drag.p, s = Math.sin(Math.PI * p);
        if (p < 0.5) r = Math.max(r, s * 0.55); else l = Math.max(l, s * 0.55);
      }
      this._castL.style.opacity = l.toFixed(3);
      this._castR.style.opacity = r.toFixed(3);
      const L = this._leaves.length;
      this._castL.style.transform = this._castR.style.transform = `translateZ(${L + 1.5}px)`;
    }

    _updateChrome() {
      const L = this._leaves.length;
      const t = this._target;
      const flipped = this._leaves.filter((l) => l.p >= 0.5).length;
      const center = !this.hasAttribute('no-center');
      let x = 0;
      if (center && t === 0) x = -25;
      else if (center && t === L) x = 25;
      this._shift.style.transform = `translateX(${x}%)`;
      // stack thickness on the outer edges
      const edge = (n, side) => {
        const layers = Math.min(6, Math.ceil(n / 2));
        const sh = [];
        for (let k = 1; k <= layers; k++) sh.push(`${side * k}px ${k * 0.6}px 0 var(--fb-edge)`);
        return sh.join(',');
      };
      // a base only shows once there is a real stack on that side, so a turning cover never reveals a blank slab
      const onLeft = Math.max(t, flipped), onRight = L - Math.min(t, flipped);
      this._baseL.style.opacity = onLeft >= 2 ? 1 : 0;
      this._baseR.style.opacity = onRight >= 2 ? 1 : 0;
      this._baseL.style.boxShadow = edge(onLeft, -1);
      this._baseR.style.boxShadow = edge(onRight, 1);
      this._baseL.style.transform = this._baseR.style.transform = 'translateZ(-1px)';
      this._dropL.style.opacity = t >= 1 ? 1 : 0;
      this._dropR.style.opacity = t <= L - 1 ? 1 : 0;
      this.setAttribute('aria-label', `Spread ${t + 1} of ${L + 1}`);
    }

    // ---------- animation ----------
    _flip(dir, opts = {}) {
      const L = this._leaves.length;
      if (!L) return false;
      let i;
      if (dir > 0) { if (this._target >= L) return false; i = this._target; this._target++; }
      else { if (this._target <= 0) return false; i = this._target - 1; this._target--; }
      const leaf = this._leaves[i];
      const existing = this._anims.get(i);
      const from = existing ? existing.p : leaf.p;
      const to = dir > 0 ? 1 : 0;
      const dur = (opts.duration || this._duration) * Math.max(0.25, Math.abs(to - from));
      this._order = (this._order || 0) + 1;
      this._anims.set(i, { from, to, p: from, dir, start: performance.now(), dur, order: this._order });
      this._updateChrome();
      this.dispatchEvent(new CustomEvent('flip', { detail: { spread: this._target, spreads: L + 1, direction: dir } }));
      this._tick();
      return true;
    }

    _tick() {
      if (this._raf) return;
      const step = (now) => {
        this._raf = 0;
        let done = [];
        this._anims.forEach((a, i) => {
          const t = clamp((now - a.start) / a.dur, 0, 1);
          a.p = a.from + (a.to - a.from) * ease(t);
          if (t >= 1) done.push(i);
          else this._renderCurl(i, a.p, a.dir, a.order);
        });
        done.forEach((i) => {
          const a = this._anims.get(i);
          this._anims.delete(i);
          this._leaves[i].p = a.to;
          this._renderFlat(i);
        });
        // resting leaves need their z re-sorted once neighbours settle
        if (done.length) this._leaves.forEach((l, i) => { if (!this._anims.has(i) && !(this._drag && this._drag.leaf === i)) this._renderFlat(i); });
        this._updateCasts();
        if (done.length) {
          this._updateChrome();
          if (!this._anims.size) this.dispatchEvent(new CustomEvent('flipend', { detail: { spread: this._target, spreads: this._leaves.length + 1 } }));
        }
        if (this._anims.size) this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }

    // ---------- autoplay ----------
    _schedule() {
      clearTimeout(this._timer);
      if (!this._playing || !this._visible) return;
      const L = this._leaves.length;
      const atEnd = this._target >= L;
      const wait = atEnd ? this._interval * 1.6 : this._interval;
      this._timer = setTimeout(() => {
        if (!this._playing) return;
        if (this._target >= L) {
          if (this._loop) {
            this.goTo(0);
            this._timer = setTimeout(() => this._schedule(), L * 140 + this._duration + this._interval);
            return;
          }
          this._playing = false;
          return;
        }
        this.next();
        this._schedule();
      }, wait);
    }

    _userActed() {
      if (!this.hasAttribute('autoplay')) return;
      this.pause();
      clearTimeout(this._resumeTimer);
      this._resumeTimer = setTimeout(() => this.play(), this._num('resume', 5000));
    }

    _observe() {
      this._visible = true;
      if ('IntersectionObserver' in window && !this._io) {
        this._io = new IntersectionObserver(([e]) => {
          this._visible = e.isIntersecting;
          if (this._visible && this._playing) this._schedule();
        });
      }
      this._io && this._io.observe(this);
      if ('ResizeObserver' in window && !this._ro) {
        this._ro = new ResizeObserver(([e]) => {
          const w = e.contentRect.width;
          this.style.setProperty('--fb-persp', Math.round(w * 2.6) + 'px');
        });
      }
      this._ro && this._ro.observe(this);
    }

    // ---------- input ----------
    _bind() {
      this.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this._userActed(); this.next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this._userActed(); this.prev(); }
        else if (e.key === 'Home') { e.preventDefault(); this._userActed(); this.goTo(0); }
        else if (e.key === 'End') { e.preventDefault(); this._userActed(); this.goTo(this._leaves.length); }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearTimeout(this._timer); else if (this._playing) this._schedule();
      });

      this.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = this._book.getBoundingClientRect();
        const spine = r.left + r.width / 2;
        this._drag = { x0: e.clientX, y0: e.clientY, side: e.clientX >= spine ? 1 : -1, pageW: r.width / 2, active: false, id: e.pointerId, t0: performance.now() };
      });
      this.addEventListener('pointermove', (e) => {
        const d = this._drag;
        if (!d || e.pointerId !== d.id || this.hasAttribute('no-drag')) return;
        const dx = e.clientX - d.x0;
        if (!d.active) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - d.y0)) return;
          const dir = d.side > 0 ? 1 : -1;
          const L = this._leaves.length;
          const i = dir > 0 ? this._target : this._target - 1;
          if (i < 0 || i >= L || this._anims.has(i)) { this._drag = null; return; }
          d.active = true; d.dir = dir; d.leaf = i;
          this._userActed();
          try { this.setPointerCapture(e.pointerId); } catch (_) {}
        }
        const amt = clamp((-dx * d.dir) / (d.pageW * 1.5), 0, 1);
        d.p = d.dir > 0 ? amt : 1 - amt;
        d.lastX = e.clientX; d.lastT = performance.now();
        this._renderCurl(d.leaf, d.p, d.dir, 99);
        this._updateCasts();
      });
      const end = (e) => {
        const d = this._drag;
        if (!d || e.pointerId !== d.id) return;
        this._drag = null;
        if (!d.active) {
          if (e.type === 'pointerup' && Math.abs(e.clientX - d.x0) < 8) { this._userActed(); d.side > 0 ? this.next() : this.prev(); }
          return;
        }
        const progress = d.dir > 0 ? d.p : 1 - d.p;
        const commit = progress > 0.3;
        const leaf = this._leaves[d.leaf];
        leaf.p = d.p; // hand the current position to the animator
        if (commit) {
          this._flip(d.dir);
        } else {
          const to = d.dir > 0 ? 0 : 1;
          this._order = (this._order || 0) + 1;
          this._anims.set(d.leaf, { from: d.p, to, p: d.p, dir: -d.dir, start: performance.now(), dur: this._duration * 0.6 * Math.max(0.3, progress), order: this._order });
          this._tick();
        }
      };
      this.addEventListener('pointerup', end);
      this.addEventListener('pointercancel', end);
    }
  }

  customElements.define('flip-book', FlipBook);
})();

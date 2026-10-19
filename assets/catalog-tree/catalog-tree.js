/*!
 * catalog-tree v1.0
 * A root node branches to category pills; the active category fans out into a
 * scattered field of thumbnails joined by curved lines. Switching categories
 * collapses the field back into its node and bursts the next one out.
 * Hover lifts a thumbnail and darkens its branch; click opens a lightbox.
 *
 * Usage:
 *   const tree = CatalogTree.mount(el, { categories, items, initial })
 *   tree.setCategory('physical'); tree.open('item-id'); tree.destroy();
 *
 * No dependencies. Works as a plain <script> (window.CatalogTree) or ES/CJS import.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.CatalogTree = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var X_ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 3l14 14M17 3L3 17"/></svg>';

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var DEFAULTS = {
    rootLabel: 'Catalog',
    categories: [],          // [{ id, label }]
    items: [],               // [{ id, title, category, thumb, images?: [], ratio? }]
    initial: null,           // category id shown first
    breakpoint: 720,         // below this width the tree runs top-down
    hoverScale: 1.45,
    density: 1.1,            // >1 leaves more empty cells in the scatter
    seed: 11,                // change for a different arrangement
    padding: 24,
    intro: true,             // animate the first category out on mount
    lightbox: true,
    blurTargets: null,       // extra elements to blur while the lightbox is open
    onCategory: null,        // fn(categoryId)
    onOpen: null,            // fn(item) ; return false to skip the built-in lightbox
    onClose: null
  };

  function CatalogTree(host, options) {
    if (!(this instanceof CatalogTree)) return new CatalogTree(host, options);
    if (typeof host === 'string') host = document.querySelector(host);
    if (!host) throw new Error('CatalogTree: host element not found');
    this.host = host;
    this.o = Object.assign({}, DEFAULTS, options || {});
    this.reduced = reducedMotion();
    this.cats = this.o.categories.map(function (c) { return { id: c.id, label: c.label, ax: 0, ay: 0, count: 0 }; });
    this.catById = {};
    var self = this;
    this.cats.forEach(function (c) { self.catById[c.id] = c; });
    this.items = this.o.items.map(function (d, i) {
      var c = self.catById[d.category];
      if (c) c.count++;
      return { d: d, i: i, x: 0, y: 0, s: 0, o: 0, vx: 0, vy: 0, vs: 0, tx: 0, ty: 0, ts: 0, to: 0, h: 0, th: 0, w: 60, hh: 40, start: 0, el: null, path: null };
    });
    this.active = this.o.initial && this.catById[this.o.initial] ? this.o.initial : (this.cats[0] && this.cats[0].id);
    this.hot = null;
    this._tick = this._tick.bind(this);
    this._raf = 0;
    this._build();
    this._layout(true);
    var t = null;
    this._ro = new ResizeObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { self._layout(false); }, 60);
    });
    this._ro.observe(host);
  }

  CatalogTree.mount = function (host, options) { return new CatalogTree(host, options); };

  CatalogTree.prototype._build = function () {
    var self = this, host = this.host;
    host.classList.add('ct-host');
    host.innerHTML = '';

    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'ct-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    this.gTrunk = document.createElementNS(SVGNS, 'g');
    this.gTrunk.setAttribute('class', 'ct-trunk');
    this.gBranch = document.createElementNS(SVGNS, 'g');
    this.svg.appendChild(this.gTrunk);
    this.svg.appendChild(this.gBranch);
    host.appendChild(this.svg);

    this.field = el('div', 'ct-field', host);
    this.label = el('div', 'ct-label', host);

    this.rootNode = el('div', 'ct-node ct-root', host);
    this.rootNode.innerHTML = '<span></span><span class="ct-count"></span>';
    this.rootNode.firstChild.textContent = this.o.rootLabel;
    this.rootNode.lastChild.textContent = this.items.length;

    this.cats.forEach(function (c) {
      var b = el('button', 'ct-node', host);
      b.type = 'button';
      b.innerHTML = '<span></span><span class="ct-count"></span>';
      b.firstChild.textContent = c.label;
      b.lastChild.textContent = c.count;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { self.setCategory(c.id); });
      c.node = b;
      c.trunk = document.createElementNS(SVGNS, 'path');
      self.gTrunk.appendChild(c.trunk);
    });

    this.items.forEach(function (it) {
      var b = el('button', 'ct-item', self.field);
      b.type = 'button';
      b.setAttribute('aria-label', 'Open ' + (it.d.title || 'item'));
      var img = el('img', null, b);
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = it.d.thumb;
      if (!it.d.ratio) {
        img.addEventListener('load', function () {
          if (img.naturalWidth && img.naturalHeight) {
            it.d.ratio = img.naturalWidth / img.naturalHeight;
            self._layout(false);
          }
        }, { once: true });
      }
      b.addEventListener('pointerenter', function () { self._setHot(it); });
      b.addEventListener('pointerleave', function () { if (self.hot === it) self._setHot(null); });
      b.addEventListener('focus', function () { self._setHot(it); });
      b.addEventListener('blur', function () { if (self.hot === it) self._setHot(null); });
      b.addEventListener('click', function () { self.open(it.d.id); });
      it.el = b;
      it.path = document.createElementNS(SVGNS, 'path');
      self.gBranch.appendChild(it.path);
    });
  };

  CatalogTree.prototype._setHot = function (it) {
    if (this.hot && this.hot !== it) {
      this.hot.th = 0;
      this.hot.el.classList.remove('is-hot');
      this.hot.path.classList.remove('is-hot');
    }
    this.hot = it;
    if (it) {
      it.th = 1;
      it.el.classList.add('is-hot');
      it.path.classList.add('is-hot');
      // keep the hot branch drawn on top of its siblings
      this.gBranch.appendChild(it.path);
      this.label.textContent = it.d.title || '';
      this.label.classList.add('is-on');
    } else {
      this.label.classList.remove('is-on');
    }
    this._wake();
  };

  CatalogTree.prototype._layout = function (initial) {
    var o = this.o, W = this.host.clientWidth, H = this.host.clientHeight, pad = o.padding;
    if (!W || !H) return;
    var vertical = W < o.breakpoint;
    this.vertical = vertical;
    var rn = this.rootNode, rw = rn.offsetWidth, rh = rn.offsetHeight;
    var self = this, maxCatW = 0, rowW = 0, gapRow = 8;
    this.cats.forEach(function (c) {
      c.w = c.node.offsetWidth; c.h = c.node.offsetHeight;
      maxCatW = Math.max(maxCatW, c.w); rowW += c.w;
    });
    rowW += gapRow * (this.cats.length - 1);
    var field, rootAnchor;

    if (!vertical) {
      var rx = pad, ry = H / 2 - rh / 2;
      place(rn, rx, ry);
      rootAnchor = [rx + rw, H / 2];
      var cx = rx + rw + Math.max(48, Math.min(90, W * 0.05)), step = rh + 22;
      this.cats.forEach(function (c, k) {
        var cy = H / 2 + (k - (self.cats.length - 1) / 2) * step;
        place(c.node, cx, cy - c.h / 2);
        c.ax = cx + c.w; c.ay = cy;
        c.inX = cx; c.inY = cy;
      });
      var fx0 = cx + maxCatW + Math.max(70, Math.min(200, W * 0.11));
      field = { x0: fx0, x1: W - pad, y0: pad, y1: H - pad };
    } else {
      var rx2 = W / 2 - rw / 2, ry2 = pad;
      place(rn, rx2, ry2);
      rootAnchor = [W / 2, ry2 + rh];
      var cyTop = ry2 + rh + 34, x = W / 2 - rowW / 2;
      this.cats.forEach(function (c) {
        place(c.node, x, cyTop);
        c.ax = x + c.w / 2; c.ay = cyTop + c.h;
        c.inX = x + c.w / 2; c.inY = cyTop;
        x += c.w + gapRow;
      });
      field = { x0: pad, x1: W - pad, y0: cyTop + rh + 64, y1: H - pad };
    }
    this.rootAnchor = rootAnchor;

    // trunk curves root -> categories
    this.cats.forEach(function (c) {
      var a = rootAnchor, b = [c.inX, c.inY], d;
      if (!vertical) {
        var mx = (a[0] + b[0]) / 2;
        d = 'M' + a[0] + ' ' + a[1] + 'C' + mx + ' ' + a[1] + ' ' + mx + ' ' + b[1] + ' ' + b[0] + ' ' + b[1];
      } else {
        var my = (a[1] + b[1]) / 2;
        d = 'M' + a[0] + ' ' + a[1] + 'C' + a[0] + ' ' + my + ' ' + b[0] + ' ' + my + ' ' + b[0] + ' ' + b[1];
      }
      c.trunk.setAttribute('d', d);
    });

    // scatter each category into the field (stable per category + size)
    var byCat = {};
    this.items.forEach(function (it) { (byCat[it.d.category] = byCat[it.d.category] || []).push(it); });
    Object.keys(byCat).forEach(function (cid) { self._scatter(field, byCat[cid], cid); });

    this._applyTargets(initial ? (o.intro ? 'intro' : 'snap') : 'resize');
    this._syncNodes();
  };

  function place(n, x, y) { n.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; }

  CatalogTree.prototype._scatter = function (f, list, cid) {
    var n = list.length; if (!n) return;
    var fw = Math.max(80, f.x1 - f.x0), fh = Math.max(80, f.y1 - f.y0);
    var slots = Math.ceil(n * this.o.density);
    var cols = Math.max(1, Math.round(Math.sqrt(slots * fw / fh)));
    var rows = Math.ceil(slots / cols);
    while (cols * rows < n) rows++;
    var cw = fw / cols, ch = fh / rows;
    var r = rng(hash(cid) ^ this.o.seed);
    var cells = [];
    for (var k = 0; k < cols * rows; k++) cells.push(k);
    for (var j = cells.length - 1; j > 0; j--) { var q = Math.floor(r() * (j + 1)); var t = cells[j]; cells[j] = cells[q]; cells[q] = t; }
    list.forEach(function (it, idx) {
      var cell = cells[idx], col = cell % cols, row = Math.floor(cell / cols);
      var ratio = it.d.ratio || 1.5;
      var base = Math.min(cw, ch * ratio);
      var w = base * 0.84 * (0.72 + r() * 0.4), h = w / ratio;
      if (h > ch * 0.84) { h = ch * 0.84; w = h * ratio; }
      if (w > cw * 0.9) { w = cw * 0.9; h = w / ratio; }
      it.w = w; it.hh = h;
      it.px = f.x0 + (col + 0.5) * cw + (r() - 0.5) * Math.max(0, cw - w) * 0.8;
      it.py = f.y0 + (row + 0.5) * ch + (r() - 0.5) * Math.max(0, ch - h) * 0.8;
      it.el.style.width = w + 'px';
      it.el.style.height = h + 'px';
    });
  };

  // mode: 'intro' | 'snap' | 'resize' | 'switch'
  CatalogTree.prototype._applyTargets = function (mode, prev) {
    var self = this, now = performance.now(), snap = mode === 'snap' || this.reduced;
    var incoming = [];
    this.items.forEach(function (it) {
      var c = self.catById[it.d.category];
      var on = it.d.category === self.active;
      if (on) {
        it.tx = it.px; it.ty = it.py; it.ts = 1; it.to = 1;
        incoming.push(it);
      } else {
        it.tx = c ? c.ax : 0; it.ty = c ? c.ay : 0; it.ts = 0.04; it.to = 0;
      }
      it._drawn = false;
      it.el.tabIndex = on ? 0 : -1;
      it.el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (snap) {
        it.x = it.tx; it.y = it.ty; it.s = it.ts; it.o = it.to; it.vx = it.vy = it.vs = 0; it.start = 0;
      }
    });
    if (!snap && (mode === 'intro' || mode === 'switch')) {
      var c = this.catById[this.active];
      // outgoing items leave now; incoming wait a beat, then stagger by distance
      incoming.sort(function (a, b) {
        return Math.hypot(a.px - c.ax, a.py - c.ay) - Math.hypot(b.px - c.ax, b.py - c.ay);
      });
      var base = mode === 'switch' ? 260 : 120;
      var stepMs = Math.min(9, 520 / Math.max(1, incoming.length));
      incoming.forEach(function (it, k) {
        if (mode === 'intro' || it.o < 0.05) {
          it.x = c.ax; it.y = c.ay; it.s = 0.04; it.o = 0; it.vx = it.vy = it.vs = 0;
        }
        it.start = now + base + k * stepMs;
      });
      this.items.forEach(function (it) { if (it.d.category !== self.active) it.start = now; });
    }
    this._wake();
  };

  CatalogTree.prototype._syncNodes = function () {
    var self = this;
    this.cats.forEach(function (c) {
      var on = c.id === self.active;
      c.node.classList.toggle('is-active', on);
      c.node.setAttribute('aria-pressed', on ? 'true' : 'false');
      c.trunk.classList.toggle('is-active', on);
    });
  };

  CatalogTree.prototype.setCategory = function (id) {
    if (!this.catById[id] || id === this.active) return;
    this._setHot(null);
    this.active = id;
    this._syncNodes();
    this._applyTargets('switch');
    if (this.o.onCategory) this.o.onCategory(id);
  };

  CatalogTree.prototype._wake = function () {
    this._idle = false;
    if (!this._raf && !this._destroyed) { this._last = 0; this._raf = requestAnimationFrame(this._tick); }
  };

  CatalogTree.prototype._tick = function (t) {
    this._raf = 0;
    if (this._destroyed) return;
    var dt = this._last ? Math.min(3, (t - this._last) / 16.667) : 1;
    this._last = t;
    var K = 0.085, D = Math.pow(0.72, dt), fo = 1 - Math.pow(0.8, dt), fh = 1 - Math.pow(0.72, dt);
    var moving = false, vertical = this.vertical, hs = this.o.hoverScale - 1;
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (t >= it.start) {
        it.vx = (it.vx + (it.tx - it.x) * K * dt) * D; it.x += it.vx * dt;
        it.vy = (it.vy + (it.ty - it.y) * K * dt) * D; it.y += it.vy * dt;
        it.vs = (it.vs + (it.ts - it.s) * K * dt) * D; it.s += it.vs * dt;
        it.o += (it.to - it.o) * fo;
      }
      it.h += (it.th - it.h) * fh;
      var settled = Math.abs(it.tx - it.x) < 0.05 && Math.abs(it.ty - it.y) < 0.05 && Math.abs(it.ts - it.s) < 0.001 &&
        Math.abs(it.vx) + Math.abs(it.vy) < 0.02 && Math.abs(it.to - it.o) < 0.002 && Math.abs(it.th - it.h) < 0.002;
      if (settled) { it.x = it.tx; it.y = it.ty; it.s = it.ts; it.o = it.to; it.h = it.th; }
      else moving = true;
      if (settled && it._drawn) continue;
      it._drawn = settled;
      this._draw(it, vertical, hs);
    }
    if (this.hot) {
      var h = this.hot, sc = Math.max(0, h.s) * (1 + hs * h.h);
      var lx = h.x - this.label.offsetWidth / 2, ly = h.y + (h.hh * sc) / 2 + 8;
      this.label.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px)';
    }
    if (moving) this._raf = requestAnimationFrame(this._tick);
    else this._last = 0;
  };

  CatalogTree.prototype._draw = function (it, vertical, hs) {
    var sc = Math.max(0, it.s) * (1 + hs * it.h);
    var e = it.el;
    if (it.o < 0.005) {
      if (e.style.visibility !== 'hidden') { e.style.visibility = 'hidden'; it.path.style.visibility = 'hidden'; }
      return;
    }
    if (e.style.visibility === 'hidden') { e.style.visibility = ''; it.path.style.visibility = ''; }
    e.style.transform = 'translate3d(' + (it.x - it.w / 2).toFixed(2) + 'px,' + (it.y - it.hh / 2).toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
    e.style.opacity = Math.min(1, it.o).toFixed(3);
    var c = this.catById[it.d.category]; if (!c) return;
    var ax = c.ax, ay = c.ay, ex, ey, d;
    if (!vertical) {
      ex = it.x - (it.w * sc) / 2; ey = it.y;
      var dx = ex - ax;
      d = 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'C' + (ax + dx * 0.5).toFixed(1) + ' ' + ay.toFixed(1) + ' ' +
        (ex - dx * 0.3).toFixed(1) + ' ' + ey.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
    } else {
      ex = it.x; ey = it.y - (it.hh * sc) / 2;
      var dy = ey - ay;
      d = 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'C' + ax.toFixed(1) + ' ' + (ay + dy * 0.5).toFixed(1) + ' ' +
        ex.toFixed(1) + ' ' + (ey - dy * 0.3).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
    }
    it.path.setAttribute('d', d);
    it.path.style.opacity = Math.min(1, it.o).toFixed(3);
  };

  /* ---------- Lightbox ---------- */

  CatalogTree.prototype.open = function (id, index) {
    var it = null;
    for (var i = 0; i < this.items.length; i++) if (this.items[i].d.id === id) { it = this.items[i]; break; }
    if (!it) return;
    if (this.o.onOpen && this.o.onOpen(it.d) === false) return;
    if (!this.o.lightbox) return;
    this._buildLightbox();
    var lb = this.lb, self = this;
    this.lbItem = it;
    this.lbImages = (it.d.images && it.d.images.length) ? it.d.images : [it.d.thumb];
    this.lbIndex = Math.max(0, Math.min(index || 0, this.lbImages.length - 1));
    this.lbReturn = document.activeElement;
    lb.title.textContent = it.d.title || '';
    lb.strip.innerHTML = '';
    this.lbImages.forEach(function (src, k) {
      var b = el('button', null, lb.strip);
      b.type = 'button';
      b.setAttribute('aria-label', 'Image ' + (k + 1) + ' of ' + self.lbImages.length);
      var im = el('img', null, b); im.src = src; im.alt = '';
      b.addEventListener('click', function () { self._show(k); });
    });
    lb.strip.hidden = this.lbImages.length < 2;
    this._sizeStage();
    this._show(this.lbIndex, true);
    lb.root.hidden = false;
    this._blur(true);
    document.documentElement.style.overflow = 'hidden';

    // FLIP from the thumbnail into the stage
    var from = it.el.getBoundingClientRect(), to = lb.stage.getBoundingClientRect(), st = lb.stage.style;
    if (!this.reduced && from.width) {
      st.transition = 'none';
      st.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')';
      lb.stage.getBoundingClientRect();
      st.transition = 'transform 0.55s cubic-bezier(.2,.75,.15,1)';
      st.transform = 'none';
    }
    requestAnimationFrame(function () { lb.root.classList.add('is-open'); lb.close.focus({ preventScroll: true }); });
    this._setHot(null);
  };

  CatalogTree.prototype.close = function () {
    if (!this.lb || this.lb.root.hidden) return;
    var lb = this.lb, it = this.lbItem, self = this, st = lb.stage.style;
    lb.root.classList.remove('is-open');
    this._blur(false);
    var done = function () {
      lb.root.hidden = true; st.transition = 'none'; st.transform = 'none';
      document.documentElement.style.overflow = '';
      if (self.lbReturn && self.lbReturn.focus) self.lbReturn.focus({ preventScroll: true });
      if (self.o.onClose) self.o.onClose(it && it.d);
    };
    if (this.reduced || !it || it.o < 0.5) { done(); return; }
    var from = it.el.getBoundingClientRect(), to = lb.stage.getBoundingClientRect();
    st.transition = 'transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.4s';
    st.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')';
    setTimeout(done, 380);
  };

  CatalogTree.prototype._blur = function (on) {
    var targets = [this.host].concat(this.o.blurTargets ? [].slice.call(this.o.blurTargets) : []);
    targets.forEach(function (t) { if (t) { t.classList.add('ct-blur-target'); t.classList.toggle('ct-blurred', on); } });
  };

  CatalogTree.prototype._sizeStage = function () {
    if (!this.lb || !this.lbItem) return;
    var ratio = this.lbItem.d.stageRatio || this.lbItem.d.ratio || 1.6;
    var vw = window.innerWidth, vh = window.innerHeight;
    var stripH = this.lbImages.length > 1 ? 60 : 0;
    var maxW = Math.min(980, vw - 32), maxH = Math.max(160, vh - 150 - stripH);
    var w = Math.min(maxW, maxH * ratio), h = w / ratio;
    this.lb.stage.style.width = w + 'px';
    this.lb.stage.style.height = h + 'px';
    this.lb.panel.style.width = w + 'px';
  };

  CatalogTree.prototype._show = function (k, instant) {
    var lb = this.lb, n = this.lbImages.length;
    k = (k + n) % n;
    this.lbIndex = k;
    var cur = lb.img, src = this.lbImages[k];
    if (instant || this.reduced) { cur.src = src; }
    else if (cur.getAttribute('src') !== src) {
      var next = cur.cloneNode(); next.style.opacity = '0'; next.src = src;
      lb.stage.appendChild(next);
      var fade = function () {
        requestAnimationFrame(function () { next.style.opacity = '1'; cur.style.opacity = '0'; });
        setTimeout(function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 380);
      };
      if (next.complete) fade(); else next.onload = next.onerror = fade;
      lb.img = next;
    }
    [].forEach.call(lb.strip.children, function (b, i) { b.classList.toggle('is-active', i === k); });
    var act = lb.strip.children[k];
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  CatalogTree.prototype.next = function () { if (this.lbImages) this._show(this.lbIndex + 1); };
  CatalogTree.prototype.prev = function () { if (this.lbImages) this._show(this.lbIndex - 1); };

  CatalogTree.prototype._buildLightbox = function () {
    if (this.lb) return;
    var self = this;
    var root = el('div', 'ct-lb', document.body);
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    // copy the host's theme tokens onto the lightbox (it lives in <body>)
    var cs = getComputedStyle(this.host);
    ['--ct-bg', '--ct-text', '--ct-muted', '--ct-pill-bg', '--ct-line-hot', '--ct-thumb-bg', '--ct-stage-bg', '--ct-overlay', '--ct-radius', '--ct-font'].forEach(function (v) {
      var val = cs.getPropertyValue(v); if (val) root.style.setProperty(v, val.trim());
    });
    if (!root.style.getPropertyValue('--ct-font') || root.style.getPropertyValue('--ct-font') === 'inherit') root.style.fontFamily = cs.fontFamily;
    var bd = el('div', 'ct-lb-backdrop', root);
    var panel = el('div', 'ct-lb-panel', root);
    var head = el('div', 'ct-lb-head', panel);
    var title = el('span', 'ct-lb-title', head);
    title.id = 'ct-lb-title-' + Math.random().toString(36).slice(2, 8);
    root.setAttribute('aria-labelledby', title.id);
    var close = el('button', 'ct-lb-close', head);
    close.type = 'button'; close.setAttribute('aria-label', 'Close'); close.innerHTML = X_ICON;
    var stage = el('div', 'ct-lb-stage', panel);
    var img = el('img', null, stage); img.alt = '';
    var strip = el('div', 'ct-lb-strip', panel);
    bd.addEventListener('click', function () { self.close(); });
    close.addEventListener('click', function () { self.close(); });
    stage.addEventListener('click', function (e) {
      var r = stage.getBoundingClientRect();
      if (self.lbImages.length > 1) (e.clientX - r.left > r.width / 2) ? self.next() : self.prev();
    });
    this._onKey = function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); self.close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); self.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); self.prev(); }
      else if (e.key === 'Tab') {
        var f = [].slice.call(root.querySelectorAll('button:not([hidden])')).filter(function (b) { return b.offsetParent; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    this._onResize = function () { if (!root.hidden) self._sizeStage(); };
    document.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onResize);
    this.lb = { root: root, panel: panel, title: title, close: close, stage: stage, img: img, strip: strip };
  };

  CatalogTree.prototype.destroy = function () {
    this._destroyed = true;
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    if (this.lb) {
      document.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      this.lb.root.remove();
    }
    this.host.innerHTML = '';
    this.host.classList.remove('ct-host');
  };

  return CatalogTree;
});

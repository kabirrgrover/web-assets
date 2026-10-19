/*!
 * RopeScroll v1.0
 * Vertical scroll drives a horizontal scene. A rope draws itself across the
 * scene, a rider climbs along it just behind the tip, and items sharpen out
 * of a blur as they enter from the right.
 *
 * No dependencies, no stylesheet: styles are injected once on first use.
 * Usage:
 *   <script src="rope-scroll.js"></script>
 *   const scene = RopeScroll.create(document.querySelector('#scene'), config);
 *   scene.refresh();   // re-measure (call after fonts/images load if needed)
 *   scene.destroy();   // remove listeners and DOM
 *
 * Coordinates are "design units": the scene is always 1000 units tall and
 * `config.width` units wide. The whole scene scales to fit the viewport, so
 * the composition stays identical on every screen.
 */
(function (global) {
  'use strict';

  var DESIGN_H = 1000;
  var NS = 'http://www.w3.org/2000/svg';

  var DEFAULTS = {
    width: 5000,          // scene width in design units
    path: [],             // [[x, y], ...] anchor points the rope passes through
    tension: 0.5,         // curve smoothness (0 = straight segments, 0.5 = catmull-rom, 1 = loose)
    lead: 0.75,           // where the drawing tip sits across the viewport (0 = left edge, 1 = right edge)
    smooth: 0.12,         // scroll easing per frame (1 = no easing)
    revealSpan: 0.32,     // portion of viewport width over which items sharpen in
    maxBlur: 14,          // px of blur for items that have not entered yet
    minScaleWidth: 600,   // on narrow screens, show at least this many units across
    scale: 1,             // global multiplier on the fitted scale
    ropeWidth: 3.2,       // stroke width in design units
    tipRadius: 7,         // radius of the dot on the end of the rope
    rider: null,          // see README
    items: [],            // see README
    emojiSet: 'fluent',   // 'fluent' = Microsoft Fluent 3D emoji images (same on every OS), 'native' = system font
    emojiBase: 'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/',
    debug: false,         // authoring overlay (also: add #debug to the URL, or press Shift+D)
    label: 'Scrolling scene'
  };

  var CSS = "/* RopeScroll v1.0 styles. Theme by overriding the --rs-* tokens on .rs or any ancestor. */\n.rs {\n  --rs-ink: #151515;\n  --rs-muted: #7b7a77;\n  --rs-rope: #111111;\n  --rs-shadow: rgba(20, 18, 16, 0.22);\n  --rs-bubble: #1d8cff;\n  --rs-bubble-ink: #ffffff;\n  --rs-display: \"Newsreader\", \"Iowan Old Style\", Georgia, serif;\n  --rs-sans: \"DM Sans\", ui-sans-serif, system-ui, sans-serif;\n  position: relative;\n  color: var(--rs-ink);\n}\n.rs-viewport {\n  position: sticky;\n  top: 0;\n  height: 100vh;\n  overflow: hidden;\n  width: 100%;\n}\n.rs-stage {\n  position: absolute;\n  left: 0;\n  top: 0;\n  transform-origin: 0 0;\n  will-change: transform;\n}\n\n/* Rope */\n.rs-rope { position: absolute; inset: 0 auto auto 0; overflow: visible; z-index: 1; pointer-events: none; }\n.rs-rope path {\n  fill: none;\n  stroke: var(--rs-rope);\n  stroke-linecap: round;\n  stroke-linejoin: round;\n}\n.rs-tip { fill: var(--rs-rope); transition: opacity .2s; }\n\n/* Items */\n.rs-item { position: absolute; z-index: 2; }\n.rs-reveal {\n  display: flex;\n  align-items: center;\n  gap: 28px;\n  will-change: filter, opacity, transform;\n}\n.rs-item--stack .rs-reveal { flex-direction: column; align-items: flex-start; gap: 18px; }\n.rs-item--stack-center .rs-reveal { flex-direction: column; align-items: center; text-align: center; gap: 18px; }\n.rs-item--row-reverse .rs-reveal { flex-direction: row-reverse; text-align: right; }\n\n.rs-media {\n  position: relative;\n  margin: 0;\n  width: var(--size);\n  height: var(--size);\n  flex: none;\n}\n.rs-float {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  display: grid;\n  place-items: center;\n  animation: rs-float 7s ease-in-out infinite;\n  animation-delay: var(--delay, 0s);\n  transition: scale .35s cubic-bezier(.2, .8, .2, 1);\n}\n.rs-item:hover .rs-float { scale: 1.05; }\n.rs-float--still { animation: none; }\n.rs-float img { width: 100%; height: 100%; object-fit: contain; user-select: none; }\n.rs-emoji {\n  font-size: calc(var(--size) * 0.8);\n  line-height: 1;\n  font-family: \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif;\n  user-select: none;\n}\n.rs-shadow {\n  position: absolute;\n  left: 18%;\n  right: 18%;\n  bottom: -7%;\n  height: 13%;\n  border-radius: 50%;\n  background: radial-gradient(closest-side, var(--rs-shadow), transparent);\n  filter: blur(4px);\n}\n@keyframes rs-float {\n  0%, 100% { translate: 0 0; }\n  50% { translate: 0 -10px; }\n}\n\n.rs-copy { max-width: 380px; min-width: 0; }\n.rs-eyebrow {\n  margin: 0 0 8px;\n  font: 400 17px/1.4 var(--rs-sans);\n  color: var(--rs-muted);\n}\n.rs-title {\n  margin: 0;\n  font: 500 44px/1.02 var(--rs-display);\n  letter-spacing: -0.015em;\n  color: var(--rs-ink);\n  text-wrap: balance;\n}\n.rs-body {\n  margin: 12px 0 0;\n  font: 400 17px/1.45 var(--rs-sans);\n  color: var(--rs-muted);\n}\n.rs-cta {\n  display: inline-block;\n  margin-top: 22px;\n  font: 500 19px/1 var(--rs-sans);\n  color: var(--rs-ink);\n  text-decoration: none;\n  border-bottom: 2px solid currentColor;\n  padding-bottom: 4px;\n}\n.rs-cta:hover { opacity: .7; }\n.rs-cta:focus-visible { outline: 3px solid var(--rs-bubble); outline-offset: 6px; border-radius: 2px; }\n\n/* Rider */\n.rs-rider {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: var(--size);\n  height: var(--size);\n  z-index: 3;\n  will-change: transform;\n}\n.rs-rider-btn {\n  all: unset;\n  display: block;\n  width: 100%;\n  height: 100%;\n  cursor: pointer;\n}\n.rs-rider-btn:focus-visible { outline: 3px solid var(--rs-bubble); outline-offset: 4px; border-radius: 12px; }\n.rs-rider-body {\n  display: grid;\n  place-items: center;\n  width: 100%;\n  height: 100%;\n  font-size: calc(var(--size) * 0.82);\n  line-height: 1;\n  transition: translate .3s cubic-bezier(.2, .8, .2, 1);\n}\n.rs-rider-body img { width: 100%; height: 100%; object-fit: contain; }\n.rs-rider:hover .rs-rider-body { translate: 0 -6px; }\n.rs-bubble {\n  position: absolute;\n  left: 50%;\n  bottom: 100%;\n  translate: -50% 0;\n  rotate: calc(var(--rs-tilt, 0deg) * -1);\n  scale: .4;\n  opacity: 0;\n  transform-origin: 50% 100%;\n  padding: 9px 18px;\n  border-radius: 22px;\n  background: var(--rs-bubble);\n  color: var(--rs-bubble-ink);\n  font: 500 18px/1.2 var(--rs-sans);\n  white-space: nowrap;\n  pointer-events: none;\n  transition: scale .35s cubic-bezier(.3, 1.6, .5, 1), opacity .2s, translate .35s cubic-bezier(.3, 1.6, .5, 1);\n}\n.rs-rider:hover .rs-bubble,\n.rs-rider.is-open .rs-bubble,\n.rs-rider:has(.rs-rider-btn:focus-visible) .rs-bubble {\n  scale: 1;\n  opacity: 1;\n  translate: -50% -10px;\n}\n\n/* Debug overlay */\n.rs-debug line.rs-dbg-grid { stroke: #1d8cff; stroke-opacity: .12; stroke-width: 1; }\n.rs-debug line.rs-dbg-grid--major { stroke-opacity: .35; }\n.rs-debug text { font: 500 13px ui-monospace, Menlo, monospace; fill: #1d8cff; }\n.rs-debug .rs-dbg-pt { fill: #ff3d6e; fill-opacity: .9; stroke: #fff; stroke-width: 2; }\n.rs-debug .rs-dbg-label { fill: #ff3d6e; }\n.rs--debug .rs-item { outline: 1px dashed rgba(29, 140, 255, .6); }\n.rs--debug .rs-item::before {\n  content: attr(data-rs-debug);\n  position: absolute;\n  top: -20px;\n  left: 0;\n  font: 500 12px ui-monospace, Menlo, monospace;\n  color: #1d8cff;\n  white-space: nowrap;\n}\n.rs-dbg-hud {\n  position: absolute;\n  left: 12px;\n  bottom: 12px;\n  z-index: 10;\n  padding: 8px 12px;\n  border-radius: 8px;\n  background: rgba(10, 10, 10, .85);\n  color: #fff;\n  font: 500 12px ui-monospace, Menlo, monospace;\n  pointer-events: none;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .rs-float { animation: none; }\n  .rs-bubble, .rs-rider-body, .rs-float { transition: none; }\n}\n";
  function injectStyles() {
    if (document.getElementById('rope-scroll-styles')) return;
    var st = document.createElement('style');
    st.id = 'rope-scroll-styles';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function toHex(str) {
    return Array.from(str).map(function (c) { return c.codePointAt(0).toString(16); }).join('-');
  }
  // Emoji as a Fluent 3D image, falling back to the system emoji if no image exists.
  function emojiNode(ch, parent, cfg, alt) {
    if (cfg.emojiSet !== 'fluent') {
      var s = el('span', 'rs-emoji', parent);
      s.textContent = ch;
      if (alt) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', alt); }
      else s.setAttribute('aria-hidden', 'true');
      return s;
    }
    var hex = toHex(ch), base = cfg.emojiBase;
    var tries = [base + hex + '.webp'];
    tries.push(hex.indexOf('-fe0f') > -1 ? base + hex.replace(/-fe0f/g, '') + '.webp' : base + hex + '-fe0f.webp');
    var img = el('img', 'rs-emoji-img', parent), k = 0;
    img.alt = alt || '';
    img.decoding = 'async';
    img.draggable = false;
    img.onerror = function () {
      k++;
      if (k < tries.length) { img.src = tries[k]; return; }
      img.onerror = null;
      var fb = document.createElement('span');
      fb.className = 'rs-emoji';
      fb.textContent = ch;
      img.replaceWith(fb);
    };
    img.src = tries[0];
    return img;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Cardinal spline through every anchor point, emitted as cubic beziers.
  function splinePath(pts, tension) {
    if (!pts || pts.length < 2) return '';
    var k = tension / 3;
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = p1[1] + (p2[1] - p0[1]) * k;
      var c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = p2[1] - (p3[1] - p1[1]) * k;
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  function buildMedia(m, parent, delay, cfg) {
    var fig = el('figure', 'rs-media', parent);
    fig.style.setProperty('--size', (m.size || 180) + 'px');
    if (m.shadow !== false) el('span', 'rs-shadow', fig);
    var fl = el('div', 'rs-float', fig);
    fl.style.setProperty('--delay', (-delay) + 's');
    if (m.float === false) fl.classList.add('rs-float--still');
    if (m.src) {
      var img = el('img', '', fl);
      img.src = m.src;
      img.alt = m.alt || '';
      img.decoding = 'async';
      img.draggable = false;
    } else if (m.emoji) {
      emojiNode(m.emoji, fl, cfg, m.alt);
    } else if (m.html) {
      fl.innerHTML = m.html;
    }
    if (m.rotate) fl.style.rotate = m.rotate + 'deg';
    return fig;
  }

  function create(root, userConfig) {
    var cfg = {};
    for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
    for (k in userConfig) cfg[k] = userConfig[k];

    injectStyles();
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) cfg.smooth = 1;

    // ---------- DOM ----------
    root.classList.add('rs');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', cfg.label);
    var viewport = el('div', 'rs-viewport', root);
    var stage = el('div', 'rs-stage', viewport);
    stage.style.width = cfg.width + 'px';
    stage.style.height = DESIGN_H + 'px';

    var rope = svg('svg', { class: 'rs-rope', width: cfg.width, height: DESIGN_H, viewBox: '0 0 ' + cfg.width + ' ' + DESIGN_H, 'aria-hidden': 'true' }, stage);
    var path = svg('path', { d: splinePath(cfg.path, cfg.tension) }, rope);
    path.style.strokeWidth = cfg.ropeWidth;
    var tip = svg('circle', { class: 'rs-tip', r: cfg.tipRadius, cx: -99, cy: -99 }, rope);

    var items = (cfg.items || []).map(function (it, i) {
      var art = el('article', 'rs-item rs-item--' + (it.layout || (it.media ? 'row' : 'text')), stage);
      art.style.left = it.x + 'px';
      art.style.top = it.y + 'px';
      if (it.z != null) art.style.zIndex = it.z;
      if (it.className) art.className += ' ' + it.className;
      var rev = el('div', 'rs-reveal', art);
      if (it.gap != null) rev.style.gap = it.gap + 'px';
      if (it.media) buildMedia(it.media, rev, i * 1.37, cfg);
      if (it.eyebrow || it.title || it.body || it.cta) {
        var copy = el('div', 'rs-copy', rev);
        if (it.copyWidth) copy.style.maxWidth = it.copyWidth + 'px';
        if (it.eyebrow) { var e = el('p', 'rs-eyebrow', copy); e.textContent = it.eyebrow; }
        if (it.title) {
          var h = el(it.heading || 'h2', 'rs-title', copy);
          h.textContent = it.title;
          if (it.titleSize) h.style.fontSize = it.titleSize + 'px';
        }
        if (it.body) { var b = el('p', 'rs-body', copy); b.textContent = it.body; }
        if (it.cta) {
          var a = el('a', 'rs-cta', copy);
          a.href = it.cta.href || '#';
          a.textContent = it.cta.label;
          if (/^https?:/.test(a.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        }
      }
      return { cfg: it, node: art, rev: rev, last: -1 };
    });

    var rider = null;
    if (cfg.rider) {
      var rc = cfg.rider;
      var rnode = el('div', 'rs-rider', stage);
      var rsize = rc.size || 120;
      rnode.style.setProperty('--size', rsize + 'px');
      var btn = el('button', 'rs-rider-btn', rnode);
      btn.type = 'button';
      btn.setAttribute('aria-label', rc.bubble || rc.alt || 'Climber');
      var body = el('span', 'rs-rider-body', btn);
      if (rc.src) { var ri = el('img', '', body); ri.src = rc.src; ri.alt = ''; ri.draggable = false; }
      else if (rc.html) body.innerHTML = rc.html;
      else emojiNode(rc.emoji || '\u{1F9A5}', body, cfg, '');
      if (rc.flip) body.style.scale = '-1 1';
      var bubble = null;
      if (rc.bubble) {
        bubble = el('span', 'rs-bubble', rnode);
        bubble.textContent = rc.bubble;
        bubble.setAttribute('aria-hidden', 'true');
      }
      btn.addEventListener('click', function () { rnode.classList.toggle('is-open'); });
      rider = {
        node: rnode, size: rsize,
        anchor: rc.anchor || [0.5, 0.12],
        lag: rc.lag != null ? rc.lag : 260,
        tilt: rc.tilt != null ? rc.tilt : 0.6,
        maxTilt: rc.maxTilt != null ? rc.maxTilt : 32
      };
    }

    // ---------- Path sampling ----------
    var STEP = 4, total = 0, sx, sy, runMax, n = 0;
    function samplePath() {
      total = path.getTotalLength();
      n = Math.max(2, Math.ceil(total / STEP) + 1);
      sx = new Float32Array(n); sy = new Float32Array(n); runMax = new Float32Array(n);
      var m = -Infinity;
      for (var i = 0; i < n; i++) {
        var p = path.getPointAtLength(Math.min(total, i * STEP));
        sx[i] = p.x; sy[i] = p.y;
        m = Math.max(m, p.x); runMax[i] = m;
      }
      path.style.strokeDasharray = total + ' ' + (total + 10);
    }
    // First length at which the rope has reached design-x `ux` (loops handled by running max).
    function lengthForX(ux) {
      if (ux <= runMax[0]) return 0;
      if (ux >= runMax[n - 1]) return total;
      var lo = 0, hi = n - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (runMax[mid] < ux) lo = mid + 1; else hi = mid; }
      return Math.min(total, lo * STEP);
    }
    function pointAt(len) {
      var f = clamp(len, 0, total) / STEP, i = Math.min(n - 2, Math.floor(f)), t = f - i;
      return {
        x: sx[i] + (sx[i + 1] - sx[i]) * t,
        y: sy[i] + (sy[i + 1] - sy[i]) * t,
        a: Math.atan2(sy[i + 1] - sy[i], sx[i + 1] - sx[i]) * 180 / Math.PI
      };
    }

    // ---------- Layout ----------
    var vw = 0, vh = 0, s = 1, offY = 0, range = 0;
    var cur = 0, target = 0, dirty = true, raf = 0, alive = true, lastW = 0, lastH = 0;

    function measure(force) {
      var w = document.documentElement.clientWidth, h = window.innerHeight;
      // Ignore small height changes from mobile URL bars so the page doesn't jump.
      if (!force && w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w; lastH = h; vw = w; vh = h;
      s = Math.min(vh / DESIGN_H, vw / cfg.minScaleWidth) * cfg.scale;
      offY = (vh - DESIGN_H * s) / 2;
      range = Math.max(0, cfg.width * s - vw);
      viewport.style.height = vh + 'px';
      root.style.height = (vh + range) + 'px';
      dirty = true;
      readScroll();
      cur = target;
    }

    function readScroll() {
      var top = root.getBoundingClientRect().top;
      var p = range > 0 ? clamp(-top / range, 0, 1) : 0;
      target = p * range;
    }

    function render() {
      stage.style.transform = 'translate3d(' + (-cur).toFixed(2) + 'px,' + offY.toFixed(2) + 'px,0) scale(' + s + ')';

      var len = lengthForX((cur + vw * cfg.lead) / s);
      path.style.strokeDashoffset = (total - len).toFixed(1);
      var tp = pointAt(len);
      tip.setAttribute('cx', tp.x.toFixed(1));
      tip.setAttribute('cy', tp.y.toFixed(1));
      tip.style.opacity = len > 1 ? 1 : 0;

      if (rider) {
        var rp = pointAt(Math.max(0, len - rider.lag));
        var a = rp.a; if (a > 90) a -= 180; if (a < -90) a += 180;
        var tilt = clamp(a * rider.tilt, -rider.maxTilt, rider.maxTilt);
        rider.node.style.transform = 'translate(' + (rp.x - rider.anchor[0] * rider.size).toFixed(1) + 'px,' +
          (rp.y - rider.anchor[1] * rider.size).toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
        rider.node.style.transformOrigin = (rider.anchor[0] * 100) + '% ' + (rider.anchor[1] * 100) + '%';
        rider.node.style.setProperty('--rs-tilt', tilt.toFixed(2) + 'deg');
      }

      var span = vw * cfg.revealSpan;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var left = it.cfg.x * s - cur;
        var r = clamp((vw - left) / span, 0, 1);
        r = 1 - (1 - r) * (1 - r);
        r = Math.round(r * 200) / 200;
        if (r === it.last) continue;
        it.last = r;
        var inv = 1 - r;
        it.rev.style.opacity = (0.12 + 0.88 * r).toFixed(3);
        it.rev.style.filter = (reduceMotion || inv === 0) ? '' : 'blur(' + (inv * cfg.maxBlur).toFixed(2) + 'px)';
        it.rev.style.transform = reduceMotion ? '' : 'translate3d(' + (inv * 40).toFixed(1) + 'px,0,0)';
      }
      if (debug) debug.update();
    }

    function tick() {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      var d = target - cur;
      if (Math.abs(d) > 0.05) { cur += d * cfg.smooth; dirty = true; }
      else if (cur !== target) { cur = target; dirty = true; }
      if (dirty) { dirty = false; render(); }
    }

    function onScroll() { readScroll(); }
    function onResize() { measure(false); }

    // Map sideways trackpad swipes onto vertical scroll while inside the scene.
    function onWheel(e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      var top = root.getBoundingClientRect().top;
      var p = range > 0 ? -top / range : 0;
      if ((p <= 0 && e.deltaX < 0) || (p >= 1 && e.deltaX > 0)) return;
      e.preventDefault();
      window.scrollBy(0, e.deltaX);
    }

    // ---------- Debug overlay ----------
    var debug = null;
    function makeDebug() {
      var g = svg('g', { class: 'rs-debug' }, rope);
      for (var x = 0; x <= cfg.width; x += 100) {
        svg('line', { x1: x, y1: 0, x2: x, y2: DESIGN_H, class: x % 500 ? 'rs-dbg-grid' : 'rs-dbg-grid rs-dbg-grid--major' }, g);
        if (x % 500 === 0) { var t = svg('text', { x: x + 6, y: 18 }, g); t.textContent = x; }
      }
      for (var y = 0; y <= DESIGN_H; y += 100) {
        svg('line', { x1: 0, y1: y, x2: cfg.width, y2: y, class: y % 500 ? 'rs-dbg-grid' : 'rs-dbg-grid rs-dbg-grid--major' }, g);
        var ty = svg('text', { x: 6, y: y - 4 }, g); ty.textContent = y;
      }
      cfg.path.forEach(function (p, i) {
        svg('circle', { cx: p[0], cy: p[1], r: 9, class: 'rs-dbg-pt' }, g);
        var lt = svg('text', { x: p[0] + 12, y: p[1] - 10, class: 'rs-dbg-label' }, g);
        lt.textContent = i + ' [' + p[0] + ',' + p[1] + ']';
      });
      items.forEach(function (it, i) {
        it.node.setAttribute('data-rs-debug', 'item ' + i + ' [' + it.cfg.x + ',' + it.cfg.y + ']');
      });
      var hud = el('div', 'rs-dbg-hud', viewport);
      var mx = 0, my = 0;
      function coords() {
        return [Math.round((mx + cur) / s), Math.round((my - offY) / s)];
      }
      function move(e) {
        var r = viewport.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; upd();
      }
      function upd() {
        var c = coords();
        hud.textContent = 'cursor [' + c[0] + ', ' + c[1] + ']  ·  scroll ' + Math.round(cur / s) + 'u  ·  click to copy';
      }
      function click(e) {
        if (e.target.closest('a,button')) return;
        var c = coords(), txt = '[' + c[0] + ', ' + c[1] + ']';
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
        hud.textContent = 'copied ' + txt;
      }
      viewport.addEventListener('mousemove', move);
      viewport.addEventListener('click', click);
      root.classList.add('rs--debug');
      return {
        update: upd,
        destroy: function () {
          g.remove(); hud.remove(); root.classList.remove('rs--debug');
          viewport.removeEventListener('mousemove', move);
          viewport.removeEventListener('click', click);
          items.forEach(function (it) { it.node.removeAttribute('data-rs-debug'); });
        }
      };
    }
    function setDebug(on) {
      if (on && !debug) debug = makeDebug();
      else if (!on && debug) { debug.destroy(); debug = null; }
      dirty = true;
    }
    function onKey(e) {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !/input|textarea|select/i.test(e.target.tagName)) setDebug(!debug);
    }

    // ---------- Boot ----------
    samplePath();
    measure(true);
    if (cfg.debug || location.hash === '#debug') setDebug(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    root.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dirty = true; });
    raf = requestAnimationFrame(tick);

    return {
      refresh: function () { samplePath(); measure(true); },
      setDebug: setDebug,
      /** Scroll the page so the scene sits at design-x `ux`. */
      scrollToUnit: function (ux, behavior) {
        var y = window.scrollY + root.getBoundingClientRect().top + clamp(ux * s, 0, range);
        window.scrollTo({ top: y, behavior: behavior || 'smooth' });
      },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        root.removeEventListener('wheel', onWheel);
        window.removeEventListener('keydown', onKey);
        setDebug(false);
        root.innerHTML = ''; root.style.height = ''; root.classList.remove('rs');
      }
    };
  }

  var api = { create: create, splinePath: splinePath, version: '1.0.0' };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.RopeScroll = api;
})(typeof window !== 'undefined' ? window : this);

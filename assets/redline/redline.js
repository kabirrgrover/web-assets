/*!
 * Redline v1.0
 * Live revision player for AI chat responses.
 * Shows the model editing its own draft: strikethroughs, inserts, margin notes,
 * moved blocks and table cleanups, then commits each pass with smooth layout.
 *
 * Zero dependencies. Drop in with a script tag pointing at redline.js.
 * Edits use CriticMarkup:  {--deleted--}  {++inserted++}  {~~old~>new~~}  {==highlight==}
 * Citations written as [1] render as citation markers.
 * MIT License.
 */
(function (root) {
  'use strict';

  var STYLE_ID = 'redline-style';
  var CANCEL = { cancelled: true };

  var CSS = [
    '.rl{--rl-speed:1;--rl-ink:#d4342a;--rl-fg:#1d1f23;--rl-muted:#6b7079;--rl-border:#e3e5e9;--rl-head:#f6f7f9;',
    '--rl-bubble:#eef0f3;--rl-cite-bg:#e7ecfb;--rl-cite-fg:#3756c7;--rl-surface:transparent;',
    '--rl-font:inherit;--rl-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--rl-hand:"Caveat","Segoe Print","Bradley Hand",cursive;',
    'color:var(--rl-fg);font-family:var(--rl-font);position:relative}',
    '.rl *{box-sizing:border-box}',
    '.rl-grid{display:grid;grid-template-columns:minmax(0,var(--rl-col,680px)) var(--rl-margin,200px);gap:0 28px;justify-content:center}',
    '.rl-narrow .rl-grid{grid-template-columns:minmax(0,1fr)}',
    '.rl-narrow .rl-margin{display:none}',
    '.rl-col{min-width:0;display:flex;flex-direction:column}',
    '.rl-margin{position:relative;pointer-events:none}',
    '.rl-q{margin-left:auto;width:fit-content;max-width:85%;background:var(--rl-bubble);padding:9px 14px;border-radius:16px;font-size:14px;line-height:1.45;margin-bottom:26px}',
    '.rl-doc{display:flex;flex-direction:column;gap:14px;font-size:15px;line-height:1.62;transition:gap calc(300ms / var(--rl-speed))}',
    '.rl-doc p,.rl-doc ul{margin:0}',
    '.rl-doc ul{padding-left:1.3em}',
    '.rl-doc li+li{margin-top:5px}',
    '.rl-block{transition:font-weight calc(320ms / var(--rl-speed)),outline-color calc(220ms / var(--rl-speed));border-radius:6px;outline:1.5px solid transparent;outline-offset:6px}',
    '.rl-h{font-weight:600}',
    '.rl-foot{font-size:12px;color:var(--rl-muted);margin-top:-4px}',
    /* edits */
    '.rl-del{text-decoration:none;color:inherit;background-image:linear-gradient(var(--rl-ink),var(--rl-ink));background-repeat:no-repeat;background-position:0 58%;background-size:0% 1.5px;-webkit-box-decoration-break:clone;box-decoration-break:clone;',
    'transition:background-size calc(260ms / var(--rl-speed)) ease-out,color calc(160ms / var(--rl-speed)),opacity calc(240ms / var(--rl-speed))}',
    '.rl-del.rl-on{background-size:100% 1.5px;color:var(--rl-ink)}',
    '.rl-del.rl-out{opacity:0}',
    '.rl-ins{text-decoration:none;color:var(--rl-ink);opacity:0;transition:opacity calc(240ms / var(--rl-speed)),color calc(420ms / var(--rl-speed))}',
    '.rl-ins.rl-on{opacity:1}',
    '.rl-ins.rl-settled{opacity:1;color:inherit}',
    '.rl-hl{background:transparent;color:inherit;border-radius:3px;transition:background-color calc(240ms / var(--rl-speed))}',
    '.rl-hl.rl-on{background:color-mix(in srgb,var(--rl-ink) 16%,transparent)}',
    '.rl-boxed{outline-color:var(--rl-ink)}',
    /* citations */
    '.rl-cite{font-size:.78em;color:var(--rl-muted);font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.rl-cite::before{content:"["}.rl-cite::after{content:"]"}',
    '.rl-cites-pill .rl-cite{display:inline-grid;place-items:center;min-width:1.5em;height:1.5em;padding:0 .35em;border-radius:999px;background:var(--rl-cite-bg);color:var(--rl-cite-fg);font-size:.66em;font-weight:600;vertical-align:.18em;margin:0 .15em;line-height:1}',
    '.rl-cites-pill .rl-cite::before,.rl-cites-pill .rl-cite::after{content:none}',
    '.rl-cites-pill .rl-cite+.rl-cite{margin-left:.1em}',
    /* scannable mode */
    '.rl-scan .rl-doc{gap:18px}',
    '.rl-scan .rl-doc li::marker{color:var(--rl-muted)}',
    '.rl-scan .rl-doc li+li{margin-top:7px}',
    '.rl-lead{font-weight:600}',
    /* tables */
    '.rl-table{overflow-x:auto;border:1px solid var(--rl-border);border-radius:10px;background:var(--rl-surface)}',
    '.rl-table table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.35;min-width:520px}',
    '.rl-table th,.rl-table td{padding:9px 12px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--rl-border);vertical-align:top}',
    '.rl-table th+th,.rl-table td+td{border-left:1px solid var(--rl-border)}',
    '.rl-table tr:last-child td{border-bottom:0}',
    '.rl-table th{background:var(--rl-head);font-weight:600}',
    '.rl-table th small{display:block;font-weight:400;font-size:11px;color:var(--rl-muted);margin-top:1px}',
    '.rl-c{display:inline-block}',
    '.rl-num-right .rl-num{text-align:right}',
    '.rl-mono td.rl-num{font-family:var(--rl-mono);font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.rl-nm{color:var(--rl-muted);opacity:.75}',
    '.rl-agg td{color:var(--rl-muted);background:var(--rl-head)}',
    '.rl-chip{display:inline-flex;align-items:center;gap:6px;padding:2px 9px 2px 3px;border:1px solid var(--rl-border);border-radius:999px;font-weight:600;font-size:12.5px;background:var(--rl-surface)}',
    '.rl-chip i{font-style:normal;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c,#555);color:#fff;font-size:9.5px;font-weight:700;letter-spacing:-.02em}',
    '.rl-chip b{font-weight:500;color:var(--rl-muted);font-size:11px}',
    /* margin notes */
    '.rl-note{position:absolute;left:0;width:max-content;padding:2px 6px 4px 0;font:600 22px/1.05 var(--rl-hand);color:var(--rl-ink);white-space:nowrap;clip-path:inset(0 100% 0 0);',
    'transition:clip-path calc(560ms / var(--rl-speed)) cubic-bezier(.5,.1,.3,1),opacity calc(260ms / var(--rl-speed))}',
    '.rl-note.rl-on{clip-path:inset(0 0 0 0)}',
    '.rl-note.rl-gone{opacity:0}',
    '.rl-arrow{position:absolute;left:-22px;top:0;overflow:visible;transition:opacity calc(260ms / var(--rl-speed))}',
    '.rl-arrow path{fill:none;stroke:var(--rl-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset calc(520ms / var(--rl-speed)) ease-out}',
    '.rl-arrow.rl-on path{stroke-dashoffset:0}',
    '.rl-arrow.rl-gone{opacity:0}',
    /* narrow-mode note chip */
    '.rl-chipnote{display:none}',
    '.rl-narrow .rl-chipnote{display:block;align-self:flex-end;height:26px;margin:-18px 0 4px;font:600 21px/1 var(--rl-hand);color:var(--rl-ink);opacity:0;transition:opacity calc(240ms / var(--rl-speed))}',
    '.rl-narrow .rl-chipnote.rl-on{opacity:1}',
    /* enter */
    '@keyframes rl-in{from{opacity:0}}',
    '.rl-fadein{animation:rl-in calc(420ms / var(--rl-speed)) ease-out both}',
    '.rl-instant *,.rl-instant{transition:none!important;animation:none!important}'
  ].join('\n');

  var CM = /\{--([\s\S]*?)--\}|\{\+\+([\s\S]*?)\+\+\}|\{~~([\s\S]*?)~>([\s\S]*?)~~\}|\{==([\s\S]*?)==\}/g;
  var CITE = /\[(\d{1,3})\]/g;

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function cites(html) {
    return String(html == null ? '' : html)
      .replace(/ (?=\[\d{1,3}\])/g, '&nbsp;')
      .replace(CITE, '<span class="rl-cite">$1</span>');
  }
  function markup(src) {
    return cites(src).replace(CM, function (m, d, i, so, sn, h) {
      if (d != null) return '<del class="rl-del">' + d + '</del>';
      if (i != null) return '<ins class="rl-ins">' + i + '</ins>';
      if (so != null) return '<del class="rl-del">' + so + '</del><ins class="rl-ins">' + sn + '</ins>';
      return '<mark class="rl-hl">' + h + '</mark>';
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function unwrap(n) {
    var p = n.parentNode; if (!p) return;
    while (n.firstChild) p.insertBefore(n.firstChild, n);
    p.removeChild(n);
  }
  function arr(x) { return Array.isArray(x) ? x : [x]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function Redline(host, opts) {
    if (!(this instanceof Redline)) return new Redline(host, opts);
    injectCSS();
    this.host = typeof host === 'string' ? document.querySelector(host) : host;
    this.opts = opts || {};
    this.passes = this.opts.passes || [];
    this.speed = this.opts.speed || 1;
    this.reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.index = 0;
    this.playing = false;
    this._tok = 0;
    this._instant = false;
    this._build();
    var self = this;
    if (root.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self._layoutMode(); });
      this._ro.observe(this.host);
    }
    this._layoutMode();
    if (this.opts.autoplay) setTimeout(function () { self.play(); }, this.opts.autoplayDelay || 600);
  }

  Redline.markup = markup;

  Redline.prototype._build = function () {
    var h = this.host, o = this.opts;
    h.innerHTML = '';
    h.classList.add('rl');
    h.className = h.className.split(' ').filter(function (c) {
      return c === 'rl' || c === 'rl-narrow' || c.indexOf('rl-') !== 0;
    }).join(' ');
    h.style.setProperty('--rl-speed', this.speed);
    this.grid = el('div', 'rl-grid');
    this.col = el('div', 'rl-col');
    this.margin = el('div', 'rl-margin');
    if (o.question) this.col.appendChild(el('div', 'rl-q', o.question));
    this.chipnote = el('div', 'rl-chipnote');
    this.col.appendChild(this.chipnote);
    this.doc = el('div', 'rl-doc');
    this.col.appendChild(this.doc);
    this.grid.appendChild(this.col);
    this.grid.appendChild(this.margin);
    h.appendChild(this.grid);
    this._tables = {};
    var blocks = clone(o.blocks || []);
    for (var i = 0; i < blocks.length; i++) this.doc.appendChild(this._renderBlock(blocks[i]));
  };

  Redline.prototype._layoutMode = function () {
    var w = this.host.clientWidth;
    var narrow = w < (this.opts.narrowBelow || 760);
    this.host.classList.toggle('rl-narrow', narrow);
    this.narrow = narrow;
  };

  Redline.prototype._cell = function (tag, html, num, id) {
    var c = el(tag, num ? 'rl-num' : '');
    c.setAttribute('data-rl', id);
    var inner = el('span', 'rl-c', cites(html));
    inner.setAttribute('data-flip', '');
    c.appendChild(inner);
    return c;
  };

  Redline.prototype._row = function (tb, cells, ri, cls) {
    var cols = tb.columns, tr = el('tr', cls || '');
    for (var c = 0; c < cells.length; c++) {
      tr.appendChild(this._cell('td', cells[c], cols[c] && cols[c].num, tb.id + '.r' + ri + 'c' + c));
    }
    return tr;
  };

  Redline.prototype._renderBlock = function (b) {
    var n, self = this;
    switch (b.type) {
      case 'ul':
      case 'ol':
        n = el(b.type, 'rl-block');
        (b.items || []).forEach(function (t, i) {
          var li = el('li', null, cites(t));
          li.setAttribute('data-rl', b.id + '.' + i);
          n.appendChild(li);
        });
        break;
      case 'table':
        n = el('div', 'rl-block rl-table');
        var t = el('table'), thead = el('thead'), hr = el('tr'), tbody = el('tbody');
        b.columns = (b.columns || []).map(function (c) { return typeof c === 'string' ? { text: c } : c; });
        b.columns.forEach(function (c, i) { hr.appendChild(self._cell('th', c.text, c.num, b.id + '.h' + i)); });
        thead.appendChild(hr);
        b.rowCount = 0;
        (b.rows || []).forEach(function (r) { tbody.appendChild(self._row(b, r, b.rowCount++)); });
        t.appendChild(thead); t.appendChild(tbody); n.appendChild(t);
        this._tables[b.id] = { def: b, tbody: tbody };
        break;
      case 'h':
        n = el('p', 'rl-block rl-h', cites(b.text)); break;
      case 'note':
        n = el('p', 'rl-block rl-foot', cites(b.text)); break;
      default:
        n = el('p', 'rl-block', cites(b.text));
    }
    if (b.className) n.className += ' ' + b.className;
    n.setAttribute('data-rl', b.id);
    n.setAttribute('data-flip', '');
    return n;
  };

  Redline.prototype.find = function (id) {
    return this.host.querySelector('[data-rl="' + String(id).replace(/"/g, '\\"') + '"]');
  };
  Redline.prototype._target = function (id) {
    var n = this.find(id);
    if (!n) return null;
    return (n.firstElementChild && n.firstElementChild.classList.contains('rl-c')) ? n.firstElementChild : n;
  };

  Redline.prototype._wait = function (ms) {
    var tok = this._tok, self = this;
    if (this._instant) return tok === this._tok ? Promise.resolve() : Promise.reject(CANCEL);
    return new Promise(function (res, rej) {
      setTimeout(function () { tok === self._tok ? res() : rej(CANCEL); }, ms / self.speed);
    });
  };
  Redline.prototype._frame = function () {
    var tok = this._tok, self = this;
    if (this._instant) return Promise.resolve();
    return new Promise(function (res, rej) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { tok === self._tok ? res() : rej(CANCEL); }); });
    });
  };

  Redline.prototype._rel = function (e) {
    var p = e.parentElement && e.parentElement.closest('[data-flip]');
    if (!p || !this.host.contains(p)) p = this.doc;
    var r = e.getBoundingClientRect(), pr = p.getBoundingClientRect();
    return { x: r.left - pr.left, y: r.top - pr.top };
  };

  /* FLIP: measure, mutate, animate everything marked data-flip back from its old spot. */
  Redline.prototype._flip = function (mutate) {
    var animate = !this._instant && !this.reduced && !!this.doc.animate;
    var before, h0, self = this;
    if (animate) {
      before = new Map();
      this.host.querySelectorAll('[data-flip]').forEach(function (e) { before.set(e, self._rel(e)); });
      h0 = this.doc.getBoundingClientRect().height;
    }
    mutate();
    if (!animate) return;
    var dur = 420 / this.speed, ease = 'cubic-bezier(.2,.75,.2,1)';
    this.host.querySelectorAll('[data-flip]').forEach(function (e) {
      var b = before.get(e); if (!b) return;
      var a = self._rel(e), dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
      e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: dur, easing: ease });
    });
    var h1 = this.doc.getBoundingClientRect().height;
    if (Math.abs(h1 - h0) > 1) this.doc.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: dur, easing: ease });
  };

  Redline.prototype._showNote = function (p) {
    if (!p.note || this._instant) return null;
    if (this.narrow) {
      this.chipnote.textContent = p.note;
      this.chipnote.classList.add('rl-on');
      return this.chipnote;
    }
    var n = el('div', 'rl-note');
    n.textContent = p.note;
    var a = p.anchor && this.find(p.anchor);
    var mt = this.margin.getBoundingClientRect().top;
    var top = a ? a.getBoundingClientRect().top - mt : 0;
    n.style.top = Math.max(0, top - 6 + (p.noteOffset || 0)) + 'px';
    this.margin.appendChild(n);
    n.getBoundingClientRect();
    n.classList.add('rl-on');
    return n;
  };
  Redline.prototype._hideNote = function (n) {
    if (!n) return;
    if (n === this.chipnote) { n.classList.remove('rl-on'); return; }
    n.classList.add('rl-gone');
    setTimeout(function () { n.remove(); }, 400 / this.speed);
  };

  Redline.prototype._markMove = function (o) {
    var n = this.find(o.move); if (!n) return;
    n.classList.add('rl-boxed');
    if (this.narrow || this._instant) return;
    var ref = o.before ? this.find(o.before) : this.doc.firstElementChild;
    if (!ref || ref === n) return;
    var mt = this.margin.getBoundingClientRect().top;
    var nr = n.getBoundingClientRect(), rr = ref.getBoundingClientRect();
    var y1 = nr.bottom - mt - 2, y0 = rr.top - mt + 4, x = 14;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'rl-arrow');
    svg.setAttribute('width', '30');
    svg.setAttribute('height', String(Math.max(y1, y0) + 10));
    var d = 'M2 ' + y1 + ' Q' + x + ' ' + y1 + ' ' + x + ' ' + (y1 - 12) + ' L' + x + ' ' + (y0 + 12) + ' Q' + x + ' ' + y0 + ' 2 ' + y0;
    var head = 'M8 ' + (y0 - 5) + ' L2 ' + y0 + ' L8 ' + (y0 + 5);
    [d, head].forEach(function (pd) {
      var p = document.createElementNS(svgNS, 'path');
      p.setAttribute('d', pd); p.setAttribute('pathLength', '1');
      svg.appendChild(p);
    });
    this.margin.appendChild(svg);
    svg.getBoundingClientRect();
    svg.classList.add('rl-on');
    this._arrows = (this._arrows || []).concat(svg);
  };

  Redline.prototype._structural = function (o) {
    var self = this, n;
    if (o.rootClass) this.host.classList.toggle(o.rootClass, o.on !== false);
    if (o.addClass) arr(o.addClass).forEach(function (id) { var t = self.find(id); if (t) t.classList.add(o.className); });
    if (o.removeClass) arr(o.removeClass).forEach(function (id) { var t = self.find(id); if (t) t.classList.remove(o.className); });
    if (o.html) {
      n = this._target(o.html);
      if (n) { n.innerHTML = cites(o.content); n.classList.add('rl-fadein'); }
    }
    if (o.move) {
      n = this.find(o.move);
      var ref = o.before ? this.find(o.before) : this.doc.firstElementChild;
      if (n && ref && ref !== n) ref.parentNode.insertBefore(n, ref);
      if (n && o.after) { var a = this.find(o.after); if (a) a.after(n); }
    }
    if (o.remove) arr(o.remove).forEach(function (id) { var t = self.find(id); if (t) t.remove(); });
    if (o.addRows) {
      var tb = this._tables[o.addRows];
      if (tb) o.rows.forEach(function (r) {
        tb.tbody.appendChild(self._row(tb.def, r, tb.def.rowCount++, ((o.className || '') + ' rl-fadein').trim()));
      });
    }
    if (o.addBlock) {
      var b = this._renderBlock(o.addBlock);
      b.classList.add('rl-fadein');
      var after = o.after && this.find(o.after);
      if (after) after.after(b); else this.doc.appendChild(b);
    }
  };

  Redline.prototype._runPass = async function (p, i) {
    var self = this;
    if (this.opts.onPass) this.opts.onPass(i, p);
    var ops = p.ops || [];
    var note = this._showNote(p);
    await this._wait(note ? 420 : 0);

    /* phase 1: mark up */
    ops.forEach(function (o) { if (o.move) self._markMove(o); });
    var marks = [];
    var edits = ops.filter(function (o) { return o.edit != null; });
    if (edits.length) {
      this._flip(function () {
        edits.forEach(function (o) {
          var t = self._target(o.edit); if (!t) return;
          t.innerHTML = markup(o.markup);
          t.querySelectorAll('.rl-del,.rl-ins,.rl-hl').forEach(function (m) { marks.push(m); });
        });
      });
      await this._frame();
      var step = Math.max(14, Math.min(80, 1100 / Math.max(1, marks.length)));
      for (var k = 0; k < marks.length; k++) {
        marks[k].classList.add('rl-on');
        if (!this._instant) await this._wait(step);
      }
    }
    var hasMove = ops.some(function (o) { return o.move; });
    await this._wait((p.hold != null ? p.hold : 650) + (hasMove ? 450 : 0));

    /* phase 2: commit */
    var dels = this.host.querySelectorAll('.rl-del');
    dels.forEach(function (d) { d.classList.add('rl-out'); });
    if (dels.length) await this._wait(240);
    var ins = [];
    this._flip(function () {
      dels.forEach(function (d) { d.remove(); });
      self.host.querySelectorAll('.rl-hl').forEach(unwrap);
      self.host.querySelectorAll('.rl-ins').forEach(function (n) { n.classList.add('rl-settled'); ins.push(n); });
      self.doc.querySelectorAll('li, .rl-doc > .rl-block').forEach(function (b) {
        if (!b.textContent.trim() && !b.querySelector('table,img,svg')) b.remove();
      });
      ops.forEach(function (o) { self._structural(o); });
      self.host.querySelectorAll('.rl-boxed').forEach(function (b) { b.classList.remove('rl-boxed'); });
    });
    (this._arrows || []).forEach(function (a) { a.classList.add('rl-gone'); setTimeout(function () { a.remove(); }, 400); });
    this._arrows = [];
    await this._wait(p.after != null ? p.after : 520);
    ins.forEach(unwrap);
    this._hideNote(note);
    await this._wait(note ? 200 : 0);
  };

  Redline.prototype._emit = function () { if (this.opts.onState) this.opts.onState(this.state()); };
  Redline.prototype.state = function () {
    return { index: this.index, total: this.passes.length, playing: this.playing, done: this.index >= this.passes.length };
  };

  Redline.prototype._run = async function (untilIndex) {
    if (this.playing) return;
    this.playing = true; this._emit();
    var tok = this._tok;
    try {
      while (this.index < untilIndex && this.index < this.passes.length) {
        await this._runPass(this.passes[this.index], this.index);
        this.index++;
        this._emit();
      }
      if (this.index >= this.passes.length && this.opts.onDone) this.opts.onDone();
    } catch (e) {
      if (e !== CANCEL) throw e;
    } finally {
      if (tok === this._tok) { this.playing = false; this._emit(); }
    }
  };

  /** Play all remaining passes. */
  Redline.prototype.play = function () {
    if (this.reduced) return this.skipToEnd();
    return this._run(Infinity);
  };
  /** Play only the next pass. */
  Redline.prototype.step = function () { return this._run(this.index + 1); };
  /** Back to the untouched draft. */
  Redline.prototype.reset = function () {
    this._tok++;
    this.playing = false;
    this.index = 0;
    this._instant = false;
    this._arrows = [];
    this._build();
    this._layoutMode();
    this._emit();
  };
  /** Jump straight to the final, fully revised response. */
  Redline.prototype.skipToEnd = async function () {
    this._tok++;
    this.playing = false;
    var self = this;
    this.host.classList.add('rl-instant');
    this.margin.querySelectorAll('.rl-note,.rl-arrow').forEach(function (n) { n.remove(); });
    this.chipnote.classList.remove('rl-on');
    this._instant = true;
    await this._run(Infinity);
    this._instant = false;
    requestAnimationFrame(function () { self.host.classList.remove('rl-instant'); });
  };
  Redline.prototype.setSpeed = function (s) {
    this.speed = s;
    this.host.style.setProperty('--rl-speed', s);
  };
  /** Replace the draft and passes, e.g. after a new model response. */
  Redline.prototype.load = function (data) {
    if (data.question !== undefined) this.opts.question = data.question;
    if (data.blocks) this.opts.blocks = data.blocks;
    if (data.passes) this.passes = this.opts.passes = data.passes;
    this.reset();
  };
  Redline.prototype.destroy = function () {
    this._tok++;
    if (this._ro) this._ro.disconnect();
    this.host.innerHTML = '';
  };

  root.Redline = Redline;
  if (typeof module === 'object' && module.exports) module.exports = Redline;
})(typeof window !== 'undefined' ? window : this);

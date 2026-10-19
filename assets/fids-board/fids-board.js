/*!
 * fids-board.js
 * A dot-matrix departures-board display as a zero-dependency Web Component.
 *
 *   <script type="module" src="fids-board.js"></script>
 *   <fids-board rows="5" segments="5,15"></fids-board>
 *
 *   const board = document.querySelector('fids-board');
 *   board.setRow(0, ['06:28', 'Los Angeles']);
 *
 * Attributes (all optional, all live):
 *   rows       number of rows                      default 5
 *   segments   comma list of segment widths, cells default "5,15"
 *   gap        gap between segments, in cells      default 1.5
 *   color      lit dot color (any CSS color)       default #f2f2ee
 *   dim        opacity of unlit dots, 0..1         default 0.13
 *   shape      "round" (dots) | "square" (pixels)  default round
 *   speed      ms per flip while scrambling        default 45
 *   stagger    ms delay added per column           default 22
 *   flips      base number of random flips         default 4
 *   interactive  present = rows are clickable (fires "rowclick")
 *
 * Events:
 *   rowclick  detail: { row }
 *   flip      detail: { count }  fired once per animation frame that flipped cells
 *   settled   fired when all animation has finished
 */

// 5x7 glyphs. Each row is 5 bits, left to right.
const RAW_FONT = {
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  'A': '01110 10001 10001 11111 10001 10001 10001',
  'B': '11110 10001 10001 11110 10001 10001 11110',
  'C': '01110 10001 10000 10000 10000 10001 01110',
  'D': '11100 10010 10001 10001 10001 10010 11100',
  'E': '11111 10000 10000 11110 10000 10000 11111',
  'F': '11111 10000 10000 11110 10000 10000 10000',
  'G': '01110 10001 10000 10111 10001 10001 01111',
  'H': '10001 10001 10001 11111 10001 10001 10001',
  'I': '01110 00100 00100 00100 00100 00100 01110',
  'J': '00111 00010 00010 00010 00010 10010 01100',
  'K': '10001 10010 10100 11000 10100 10010 10001',
  'L': '10000 10000 10000 10000 10000 10000 11111',
  'M': '10001 11011 10101 10101 10001 10001 10001',
  'N': '10001 10001 11001 10101 10011 10001 10001',
  'O': '01110 10001 10001 10001 10001 10001 01110',
  'P': '11110 10001 10001 11110 10000 10000 10000',
  'Q': '01110 10001 10001 10001 10101 10010 01101',
  'R': '11110 10001 10001 11110 10100 10010 10001',
  'S': '01111 10000 10000 01110 00001 00001 11110',
  'T': '11111 00100 00100 00100 00100 00100 00100',
  'U': '10001 10001 10001 10001 10001 10001 01110',
  'V': '10001 10001 10001 10001 10001 01010 00100',
  'W': '10001 10001 10001 10101 10101 10101 01010',
  'X': '10001 10001 01010 00100 01010 10001 10001',
  'Y': '10001 10001 10001 01010 00100 00100 00100',
  'Z': '11111 00001 00010 00100 01000 10000 11111',
  ':': '00000 00100 00100 00000 00100 00100 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  "'": '01100 00100 01000 00000 00000 00000 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  '%': '11000 11001 00010 00100 01000 10011 00011',
  '&': '01100 10010 10100 01000 10101 10010 01101',
  '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000',
  '=': '00000 00000 11111 00000 11111 00000 00000',
  '>': '01000 00100 00010 00001 00010 00100 01000',
  '<': '00010 00100 01000 10000 01000 00100 00010',
  '*': '00000 00100 10101 01110 10101 00100 00000',
  '$': '00100 01111 10100 01110 00101 11110 00100',
  '@': '01110 10001 00001 01101 10101 10101 01110',
  '_': '00000 00000 00000 00000 00000 00000 11111',
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const CELL_PITCH = GLYPH_W + 1; // 1 dot spacing between cells
const ROW_GAP = 3;              // dots between rows

const GLYPHS = new Map();
for (const [ch, rows] of Object.entries(RAW_FONT)) {
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  rows.split(' ').forEach((row, y) => {
    for (let x = 0; x < GLYPH_W; x++) bits[y * GLYPH_W + x] = row[x] === '1' ? 1 : 0;
  });
  GLYPHS.set(ch, bits);
}
const BLANK = GLYPHS.get(' ');
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Uppercase, strip accents, map unsupported characters to a space. */
export function normalizeText(str) {
  return String(str ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/./gu, (c) => (GLYPHS.has(c) ? c : ' '));
}

/** Add or override a glyph: defineGlyph('£', ['01110', ...7 rows]) */
export function defineGlyph(ch, rows) {
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  rows.forEach((row, y) => { for (let x = 0; x < GLYPH_W; x++) bits[y * GLYPH_W + x] = row[x] === '1' ? 1 : 0; });
  GLYPHS.set(ch, bits);
}

const randomChar = () => SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];

export class FidsBoard extends HTMLElement {
  static get observedAttributes() {
    return ['rows', 'segments', 'gap', 'color', 'dim', 'shape', 'speed', 'stagger', 'flips', 'interactive'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: block; position: relative; width: 100%; }
        :host([interactive]) canvas { cursor: pointer; }
        canvas { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
      </style>
      <style id="aspect"></style>
      <canvas part="canvas" role="img"></canvas>`;
    this._aspect = root.getElementById('aspect');
    this._canvas = root.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._grid = [];
    this._cols = [];
    this._layout = { p: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
    this._raf = 0;
    this._wasActive = false;
    this.instant = false;
    this._reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    this._ro = new ResizeObserver(() => this._resize());
    this._canvas.addEventListener('click', (e) => this._onClick(e));
    this._build();
  }

  connectedCallback() {
    this._ro.observe(this);
    this._resize();
  }

  disconnectedCallback() {
    this._ro.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (oldV === newV) return;
    if (name === 'rows' || name === 'segments' || name === 'gap') this._build();
    this._resize();
  }

  // ---- attribute getters -------------------------------------------------
  get rows() { return Math.max(1, parseInt(this.getAttribute('rows'), 10) || 5); }
  get segments() {
    const s = (this.getAttribute('segments') || '5,15').split(',').map((n) => parseInt(n, 10)).filter((n) => n > 0);
    return s.length ? s : [5, 15];
  }
  get gap() { const g = parseFloat(this.getAttribute('gap')); return Number.isFinite(g) ? Math.max(0, g) : 1.5; }
  get color() { return this.getAttribute('color') || '#f2f2ee'; }
  get dim() { const d = parseFloat(this.getAttribute('dim')); return Number.isFinite(d) ? d : 0.13; }
  get shape() { return this.getAttribute('shape') === 'square' ? 'square' : 'round'; }
  get speed() { return parseFloat(this.getAttribute('speed')) || 45; }
  get stagger() { const v = parseFloat(this.getAttribute('stagger')); return Number.isFinite(v) ? v : 22; }
  get flips() { const v = parseInt(this.getAttribute('flips'), 10); return Number.isFinite(v) ? Math.max(1, v) : 4; }

  set color(v) { this.setAttribute('color', v); }
  set shape(v) { this.setAttribute('shape', v); }

  // ---- public API --------------------------------------------------------

  /**
   * Set one row. `value` is an array with one string per segment, or a single
   * string that flows across all cells ignoring segment boundaries.
   * options.scramble: flip every cell in a changed segment, not only the cells whose char changed.
   * options.align: array of 'left' | 'right' per segment.
   */
  setRow(row, value, options = {}) {
    if (row < 0 || row >= this._grid.length) return;
    const cells = this._grid[row];
    const segs = this.segments;
    const next = new Array(cells.length).fill(' ');

    if (Array.isArray(value)) {
      let i = 0;
      segs.forEach((w, s) => {
        let t = normalizeText(value[s] ?? '').slice(0, w);
        const align = options.align?.[s] || 'left';
        t = align === 'right' ? t.padStart(w, ' ') : t.padEnd(w, ' ');
        for (let k = 0; k < w; k++) next[i + k] = t[k];
        i += w;
      });
    } else {
      const t = normalizeText(value).slice(0, cells.length);
      for (let k = 0; k < t.length; k++) next[k] = t[k];
    }

    // Which segments changed?
    const changedSeg = new Set();
    cells.forEach((c, i) => { if (c.target !== next[i]) changedSeg.add(this._cols[i].seg); });

    const now = performance.now();
    let order = 0;
    cells.forEach((cell, i) => {
      const seg = this._cols[i].seg;
      const differs = cell.target !== next[i];
      const wide = options.scramble && changedSeg.has(seg) && (next[i] !== ' ' || cell.target !== ' ');
      if (differs || wide || options.force) {
        this._animate(cell, next[i], now + order * this.stagger + Math.random() * 40);
      }
      order++;
    });
    this._kick();
  }

  /** Set many rows: setRows([['06:28','Los Angeles'], ...]) */
  setRows(rows, options) { rows.forEach((r, i) => this.setRow(i, r, options)); }

  /** Current text for a row as an array of segment strings (trimmed). */
  getRow(row) {
    const cells = this._grid[row] || [];
    const out = this.segments.map(() => '');
    cells.forEach((c, i) => { out[this._cols[i].seg] += c.target; });
    return out.map((s) => s.trimEnd());
  }

  /** Re-run the flip animation on lit cells of the given rows (default: all). */
  scramble(rows) {
    const list = rows ?? this._grid.map((_, i) => i);
    const now = performance.now();
    list.forEach((r) => {
      (this._grid[r] || []).forEach((cell, i) => {
        if (cell.target !== ' ') this._animate(cell, cell.target, now + i * this.stagger + Math.random() * 60);
      });
    });
    this._kick();
  }

  /** Blank every cell (animated unless instant). */
  clear() { this._grid.forEach((_, r) => this.setRow(r, '')); }

  // ---- internals ---------------------------------------------------------

  _build() {
    const segs = this.segments;
    const cols = [];
    let x = 0;
    segs.forEach((w, s) => {
      for (let i = 0; i < w; i++) { cols.push({ seg: s, x }); x += CELL_PITCH; }
      if (s < segs.length - 1) x += this.gap * CELL_PITCH;
    });
    this._cols = cols;
    this._unitsW = (cols.length ? cols[cols.length - 1].x : 0) + GLYPH_W;
    this._unitsH = this.rows * GLYPH_H + (this.rows - 1) * ROW_GAP;
    this._aspect.textContent = `:host { aspect-ratio: ${this._unitsW} / ${this._unitsH}; }`;

    // Keep existing cells only when the column layout is unchanged (e.g. adding rows);
    // a new layout would shift old characters into the wrong columns.
    const key = `${segs.join(',')}|${this.gap}`;
    const old = key === this._layoutKey ? this._grid : [];
    this._layoutKey = key;
    this._grid = Array.from({ length: this.rows }, (_, r) =>
      cols.map((_, i) => {
        const prev = old[r]?.[i];
        return prev ? prev : { ch: ' ', target: ' ', flips: 0, next: 0 };
      })
    );
  }

  _animate(cell, target, startAt) {
    cell.target = target;
    if (this.instant || this._reduced.matches) {
      cell.ch = target;
      cell.flips = 0;
      return;
    }
    cell.flips = this.flips + ((Math.random() * this.flips) | 0);
    cell.next = startAt;
  }

  _kick() {
    if (!this._raf) this._raf = requestAnimationFrame(this._loop);
    this._updateLabel();
  }

  _loop = (t) => {
    this._raf = 0;
    let active = false;
    let flipped = 0;
    const speed = this.speed;
    for (const row of this._grid) {
      for (const cell of row) {
        if (cell.flips <= 0) continue;
        active = true;
        if (t < cell.next) continue;
        cell.flips--;
        cell.ch = cell.flips > 0 ? randomChar() : cell.target;
        cell.next = t + speed * (0.7 + Math.random() * 0.6);
        flipped++;
      }
    }
    this._draw();
    if (flipped) this.dispatchEvent(new CustomEvent('flip', { detail: { count: flipped } }));
    if (active) {
      this._raf = requestAnimationFrame(this._loop);
    } else if (this._wasActive) {
      this.dispatchEvent(new CustomEvent('settled'));
    }
    this._wasActive = active;
  };

  _resize() {
    const rect = this.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height || (w * this._unitsH) / this._unitsW;
    if (!w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this._canvas.width = Math.round(w * dpr);
    this._canvas.height = Math.round(h * dpr);
    const p = Math.min(w / this._unitsW, h / this._unitsH);
    this._layout = { p, dpr, w, h, ox: (w - p * this._unitsW) / 2, oy: (h - p * this._unitsH) / 2 };
    this._draw();
  }

  _draw() {
    const ctx = this._ctx;
    const { p, ox, oy, dpr } = this._layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const lit = new Path2D();
    const dim = new Path2D();
    const round = this.shape === 'round';
    const r = p * 0.41;
    const sq = p * 0.9;
    const off = (p - sq) / 2;

    this._grid.forEach((cells, row) => {
      const y0 = oy + row * (GLYPH_H + ROW_GAP) * p;
      cells.forEach((cell, i) => {
        const bits = GLYPHS.get(cell.ch) || BLANK;
        const x0 = ox + this._cols[i].x * p;
        for (let dy = 0; dy < GLYPH_H; dy++) {
          for (let dx = 0; dx < GLYPH_W; dx++) {
            const path = bits[dy * GLYPH_W + dx] ? lit : dim;
            if (round) {
              const cx = x0 + (dx + 0.5) * p;
              const cy = y0 + (dy + 0.5) * p;
              path.moveTo(cx + r, cy);
              path.arc(cx, cy, r, 0, Math.PI * 2);
            } else {
              path.rect(x0 + dx * p + off, y0 + dy * p + off, sq, sq);
            }
          }
        }
      });
    });

    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.dim;
    ctx.fill(dim);
    ctx.globalAlpha = 1;
    ctx.fill(lit);
  }

  _onClick(e) {
    if (!this.hasAttribute('interactive')) return;
    const rect = this._canvas.getBoundingClientRect();
    const { p, oy } = this._layout;
    const y = (e.clientY - rect.top - oy) / p;
    const row = Math.floor((y + ROW_GAP / 2) / (GLYPH_H + ROW_GAP));
    if (row >= 0 && row < this._grid.length) {
      this.dispatchEvent(new CustomEvent('rowclick', { detail: { row } }));
    }
  }

  _updateLabel() {
    const text = this._grid.map((_, r) => this.getRow(r).filter(Boolean).join(' ')).join('; ');
    this._canvas.setAttribute('aria-label', text);
  }
}

if (!customElements.get('fids-board')) customElements.define('fids-board', FidsBoard);

/**
 * Mechanical flap sound, synthesized with Web Audio (no audio files).
 * Browsers only allow audio after a user gesture, so call sound.unlock()
 * from a click or keydown handler once.
 *
 *   const sound = createFlapSound({ volume: 0.6, style: 'clack' });
 *   board.addEventListener('flip', (e) => sound.play(e.detail.count));
 */
export function createFlapSound(opts = {}) {
  let ctx = null;
  let buffer = null;
  let last = 0;
  const api = {
    volume: opts.volume ?? 0.6,
    style: opts.style || 'clack', // 'clack' | 'soft'
    enabled: opts.enabled ?? true,
    unlock() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const len = Math.floor(ctx.sampleRate * 0.025);
        buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    play(count = 1) {
      if (!api.enabled || api.volume <= 0 || !ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (now - last < 0.028) return; // throttle to ~35 clicks/sec
      last = now;
      const soft = api.style === 'soft';
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 0.8 + Math.random() * 0.5;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = soft ? 1400 + Math.random() * 500 : 2800 + Math.random() * 2200;
      filter.Q.value = soft ? 1.4 : 0.7;
      const gain = ctx.createGain();
      gain.gain.value = api.volume * Math.min(1, 0.4 + count * 0.03) * (soft ? 0.55 : 1);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now);
    },
  };
  return api;
}

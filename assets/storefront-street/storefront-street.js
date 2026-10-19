/*!
 * <storefront-street>  v1.0
 * An endlessly scrolling, hand-drawn street of storefronts.
 * Zero dependencies. Drop in with a <script> tag and feed it JSON.
 *
 *   <storefront-street speed="40" height="300">
 *     <script type="application/json">[{ "name": "Crumb & Co.", "type": "shop" }]</script>
 *   </storefront-street>
 *
 * Templates: shop, cafe, walkup, kiosk, gallery, modern, cottage
 * Props:     tree, lamp, signpost, gap
 * Events:    store-select, store-hover   (detail: { store, index })
 * Methods:   play(), pause(), scrollToStore(idOrIndex)
 * Property:  el.stores = [...]
 */
(() => {
  if (customElements.get('storefront-street')) return;

  // Scene geometry, in SVG units. Every item shares this height.
  const H = 304;   // viewBox height
  const G = 290;   // ground line (top of sidewalk)

  // ---------- small utils ----------
  const N = v => Math.round(v * 10) / 10;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shade(hex, amt) {
    let c = String(hex).replace('#', '');
    if (c.length === 3) c = [...c].map(x => x + x).join('');
    const n = parseInt(c, 16); if (Number.isNaN(n)) return hex;
    let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------- drawing primitives (return SVG strings) ----------
  const rect = (x, y, w, h, fill, cls = 'k', extra = '') =>
    `<rect x="${N(x)}" y="${N(y)}" width="${N(Math.max(0, w))}" height="${N(Math.max(0, h))}"${fill ? ` fill="${fill}"` : ''} class="${cls}"${extra ? ' ' + extra : ''}/>`;
  const line = (x1, y1, x2, y2, cls = 'k2') => `<line x1="${N(x1)}" y1="${N(y1)}" x2="${N(x2)}" y2="${N(y2)}" class="${cls}"/>`;
  const circle = (cx, cy, r, fill, cls = 'k') => `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}"${fill ? ` fill="${fill}"` : ''} class="${cls}"/>`;

  function text(x, y, str, { size = 14, maxW = 999, font = 'script', fill = '#fff', anchor = 'middle', spacing = 0 } = {}) {
    const est = String(str).length * size * (font === 'script' ? 0.52 : 0.62) + spacing * String(str).length;
    const fit = est > maxW ? ` textLength="${N(maxW)}" lengthAdjust="spacingAndGlyphs"` : '';
    const ls = spacing ? ` letter-spacing="${spacing}"` : '';
    return `<text x="${N(x)}" y="${N(y)}" text-anchor="${anchor}" font-size="${size}" fill="${fill}" class="t-${font}"${ls}${fit}>${esc(str)}</text>`;
  }

  // A window pane: lit (warm) or glass (cool), with optional mullions and a glint.
  function pane(x, y, w, h, lit, { cols = 1, rows = 1 } = {}) {
    let s = rect(x, y, w, h, null, `k ${lit ? 'lit' : 'glass'}`);
    for (let i = 1; i < cols; i++) s += line(x + (w / cols) * i, y, x + (w / cols) * i, y + h);
    for (let i = 1; i < rows; i++) s += line(x, y + (h / rows) * i, x + w, y + (h / rows) * i);
    if (!lit && w > 10 && h > 12) s += line(x + w * 0.2, y + h * 0.75, x + w * 0.55, y + h * 0.2, 'shine');
    return s;
  }

  const BODY = ['#d9654b', '#e8a33d', '#5f86b0', '#8fb07a', '#c46f9e', '#efe6d8', '#6c5b8f', '#e07f6a'];
  const SKIN = ['#f1c7a5', '#d6a27c', '#a8714f', '#f3d3b8', '#7d5038'];
  const HAIR = ['#2f2a2a', '#5a3a2a', '#8a5a3a', '#1e1e24', '#b88a4a'];

  function person(x, by, s, r) {
    const b = pick(r, BODY), k = pick(r, SKIN), h = pick(r, HAIR);
    return `<path class="k2" fill="${b}" d="M${N(x - 7 * s)} ${N(by)} V${N(by - 9 * s)} Q${N(x - 7 * s)} ${N(by - 15 * s)} ${N(x)} ${N(by - 15 * s)} Q${N(x + 7 * s)} ${N(by - 15 * s)} ${N(x + 7 * s)} ${N(by - 9 * s)} V${N(by)} Z"/>` +
      circle(x, by - 20 * s, 4.6 * s, k, 'k2') +
      `<path fill="${h}" d="M${N(x - 4.8 * s)} ${N(by - 20.5 * s)} a${N(4.8 * s)} ${N(4.6 * s)} 0 0 1 ${N(9.6 * s)} 0 Z"/>`;
  }

  // Lit shop interior with people, an optional counter and pendant lamps.
  function interior(x, y, w, h, r, { people = 2, counter = '#8a5a3c', lamps = 0, s = 1 } = {}) {
    let o = rect(x, y, w, h, null, 'k lit');
    for (let i = 0; i < lamps; i++) {
      const lx = x + (w / (lamps + 1)) * (i + 1);
      o += line(lx, y, lx, y + h * 0.28) + `<path class="k2" fill="#fffaf0" d="M${N(lx - 5)} ${N(y + h * 0.28 + 6)} L${N(lx - 2.5)} ${N(y + h * 0.28)} H${N(lx + 2.5)} L${N(lx + 5)} ${N(y + h * 0.28 + 6)} Z"/>`;
    }
    for (let i = 0; i < people; i++) {
      const px = x + (w / (people + 1)) * (i + 1) + (r() - 0.5) * (w / (people + 2));
      o += person(Math.min(x + w - 8 * s, Math.max(x + 8 * s, px)), y + h - (counter ? 8 : 0), s, r);
    }
    if (counter) o += rect(x, y + h - 10, w, 10, counter, 'k2');
    return o;
  }

  // ---------- building templates ----------
  // Each returns { w, top, body }. Buildings stand on y = G, starting at x = 0.
  const TEMPLATES = {
    // Brick-front bakery with a scalloped awning and a big lit window.
    shop(s, r) {
      const w = s.width || 196, h = s.height || 150, top = G - h;
      const c = s.color || '#b8433b', a = s.accent || '#2f7d55', d = shade(c, -0.35);
      let o = rect(0, top, w, h, c);
      o += rect(-3, top - 3, w + 6, 10, d);
      const n = w > 170 ? 2 : 1, uw = n === 2 ? w * 0.3 : w * 0.45;
      for (let i = 0; i < n; i++) {
        const ux = n === 2 ? (i === 0 ? w * 0.1 : w * 0.6) : (w - uw) / 2;
        o += pane(ux, top + 18, uw, 30, r() < 0.3, { cols: 2 });
        o += rect(ux - 3, top + 48, uw + 6, 4, d, 'k2');
      }
      const ay = top + 64, aw = w * 0.96;
      let sc = `M-4 ${ay} H${N(aw)} V${ay + 22}`;
      const seg = aw / Math.max(6, Math.round(aw / 14));
      for (let x = aw; x > -4 + 0.5; x -= seg) sc += ` q${N(-seg / 2)} 7 ${N(-seg)} 0`;
      o += `<path class="k" fill="${a}" d="${sc} Z"/>`;
      o += text(aw * 0.44, ay + 16, s.name || 'Bakery', { size: 17, maxW: aw * 0.66, fill: s.signColor || '#fffbe8' });
      if (s.sub) o += text(aw - 6, ay + 14, s.sub, { size: 6.5, font: 'block', anchor: 'end', fill: '#fffbe8', maxW: aw * 0.22, spacing: 0.6 });
      o += rect(12, G - 64, 30, 64, shade(c, 0.55));
      o += rect(16, G - 60, 22, 26, null, 'k2 glass');
      o += circle(36, G - 30, 1.6, '#3a3330', 'k2');
      if (s.number) o += text(27, G - 20, s.number, { size: 7, font: 'block', fill: '#3a3330' });
      o += interior(52, G - 60, w - 64, 46, r, { people: Math.max(1, Math.round((w - 64) / 50)), s: 0.9 });
      o += rect(48, G - 12, w - 56, 12, d, 'k2');
      return { w, top: top - 3, body: o };
    },

    // Corner cafe with rooftop railing, oval medallion sign and a tall lit entry.
    cafe(s, r) {
      const w = s.width || 176, h = s.height || 196, top = G - h;
      const c = s.color || '#f3ead8', a = s.accent || '#c8303a';
      let o = '';
      o += line(4, top - 14, w - 4, top - 14, 'k2') + line(4, top - 8, w - 4, top - 8, 'k2');
      for (let x = 4; x <= w - 4; x += 7) o += line(x, top - 14, x, top, 'k2');
      o += rect(0, top, w, h, c);
      for (let x = 4; x < w - 8; x += 13) o += rect(x, top + 4, 9, 8, a, 'k2');
      for (const fx of [0.28, 0.72]) {
        const cx = w * fx;
        o += `<path class="k2" fill="#2c3550" d="M${N(cx - 8)} ${N(top + 34)} V${N(top + 27)} a8 8 0 0 1 16 0 V${N(top + 34)} Z"/>`;
      }
      const cy = top + 76, rx = w * 0.33, ry = 30;
      o += `<ellipse cx="${N(w / 2)}" cy="${N(cy)}" rx="${N(rx)}" ry="${ry}" fill="${a}" class="k"/>`;
      o += `<ellipse cx="${N(w / 2)}" cy="${N(cy)}" rx="${N(rx - 4)}" ry="${ry - 4}" fill="none" stroke="#fff" stroke-width="1.4"/>`;
      o += text(w / 2, cy + 5, s.name || 'Cafe', { size: 18, maxW: rx * 1.55 });
      if (s.sub) o += text(w / 2, cy + 16, s.sub, { size: 5.5, font: 'block', maxW: rx * 1.1, spacing: 0.5 });
      o += rect(14, top + 112, w - 28, 7, a, 'k2');
      o += rect(6, top + 112, 10, G - top - 112, shade(c, -0.08));
      o += rect(w - 16, top + 112, 10, G - top - 112, shade(c, -0.08));
      o += circle(11, top + 124, 3, '#fff6dc', 'k2') + circle(w - 11, top + 124, 3, '#fff6dc', 'k2');
      o += interior(22, top + 124, w - 44, G - top - 124, r, { people: 1, counter: null, lamps: 1 });
      o += line(w / 2, top + 124, w / 2, G, 'k');
      o += rect(22, G - 6, w - 44, 6, shade(a, -0.2), 'k2');
      return { w, top: top - 14, body: o };
    },

    // Three-storey walk-up with fire escape and a colourful ground-floor shop.
    walkup(s, r) {
      const w = s.width || 200, h = s.height || 262, top = G - h;
      const c = s.color || '#d6c29b', a = s.accent || '#d63a82', d = shade(c, -0.5);
      let o = rect(0, top, w, h, c);
      o += rect(-4, top, w + 8, 9, d);
      for (let x = 0; x < w; x += 10) o += rect(x + 1, top + 9, 5, 4, d, 'k2');
      const gf = 92, floors = s.floors || 3, upTop = top + 22, upBot = G - gf - 8, fh = (upBot - upTop) / floors;
      const cols = 4, ww = w * 0.15, gx = (w - cols * ww) / (cols + 1);
      for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
        const x = gx + k * (ww + gx), y = upTop + f * fh + 5, wh = fh - 14;
        o += pane(x, y, ww, wh, r() < 0.35, { rows: 2 });
        o += rect(x - 2, y + wh, ww + 4, 3, d, 'k2');
      }
      // fire escape over the last column
      const fx = gx * 4 + ww * 3 - 8, fw = ww + 16;
      for (let f = 1; f <= floors; f++) {
        const py = upTop + f * fh - 3;
        o += rect(fx, py, fw, 2.5, 'var(--ss-ink)', 'k2');
        o += line(fx, py - 11, fx + fw, py - 11);
        for (let x = fx; x <= fx + fw + 0.1; x += fw / 4) o += line(x, py - 11, x, py);
        if (f < floors) o += line(fx + 3, py, fx + fw - 3, py + fh - 3);
      }
      o += rect(0, G - gf, w, gf, a);
      o += rect(0, G - gf, w, 22, shade(a, -0.18));
      o += text(w / 2, G - gf + 15, String(s.name || 'Shop').toUpperCase(), { size: 11, font: 'block', maxW: w - 20, spacing: 1.5 });
      const sw = w * 0.34;
      o += interior(10, G - gf + 30, sw, 46, r, { people: 2, s: 0.85, counter: shade(a, -0.3) });
      o += interior(w - 10 - sw, G - gf + 30, sw, 46, r, { people: 1, s: 0.85, counter: shade(a, -0.3) });
      o += rect(w / 2 - 13, G - gf + 30, 26, gf - 30, shade(a, 0.55));
      o += rect(w / 2 - 9, G - gf + 34, 18, 22, null, 'k2 glass');
      o += rect(6, G - 14, w - 12, 14, shade(a, -0.12), 'k2');
      return { w, top, body: o };
    },

    // Tiny walk-up window: candy stripes, a chalk menu and a serving hatch.
    kiosk(s, r) {
      const w = s.width || 150, h = s.height || 112, top = G - h;
      const c = s.color || '#ffffff', a = s.accent || '#d4283a';
      let o = rect(w * 0.16, top - 24, 42, 24, a);
      o += text(w * 0.16 + 21, top - 9, s.short || (s.name || '').split(' ')[0], { size: 8, font: 'block', maxW: 34 });
      o += rect(0, top, w, h, c);
      o += rect(-4, top, w + 8, 8, '#fbf7f0');
      const sx = w * 0.28;
      for (let x = 0, i = 0; x < sx - 0.1; x += sx / 5, i++) if (i % 2 === 0) o += rect(x, top + 8, sx / 5, h - 8, a, 'k2');
      const mx = sx + 6, mw = w * 0.22;
      o += rect(mx, top + 14, mw, h - 30, '#2a2a2e');
      for (let y = top + 22; y < top + h - 24; y += 6) o += line(mx + 4, y, mx + mw - 4 - (y % 12 ? 4 : 0), y, 'chalk');
      o += circle(mx + mw / 2, top + h * 0.45, 13, '#fff');
      o += text(mx + mw / 2, top + h * 0.45 + 3, s.badge || 'est.', { size: 7, fill: a, maxW: 22 });
      const hx = mx + mw + 6, hw = w - hx - 6;
      o += interior(hx, top + 14, hw, h * 0.5, r, { people: 1, counter: null, s: 0.85 });
      o += rect(hx - 3, top + 14 + h * 0.5, hw + 6, 5, '#fbf7f0', 'k2');
      o += rect(hx, top + 19 + h * 0.5, hw, G - (top + 19 + h * 0.5), a);
      if (s.number) o += text(w - 8, top + 7, s.number, { size: 5, font: 'block', anchor: 'end', fill: '#3a3330' });
      return { w, top: top - 24, body: o };
    },

    // Wide tea room: big painted sign, round logo, one long glowing window.
    gallery(s, r) {
      const w = s.width || 206, h = s.height || 180, top = G - h;
      const c = s.color || '#f6f1e6', a = s.accent || '#2f6b3a', fr = s.trim || '#8a5a2b';
      let o = rect(0, top, w, h, c);
      o += rect(-3, top - 4, w + 6, 6, fr);
      if (s.sub) o += text(w * 0.36, top + 20, String(s.sub).toUpperCase(), { size: 6, font: 'block', fill: a, maxW: w * 0.4, spacing: 1.2 });
      o += text(w * 0.36, top + 46, String(s.name || 'Tea').toUpperCase(), { size: 24, font: 'block', fill: a, maxW: w * 0.58 });
      o += circle(w * 0.82, top + 34, 21, 'none');
      o += `<circle cx="${N(w * 0.82)}" cy="${N(top + 34)}" r="21" fill="none" stroke="${a}" stroke-width="2.4"/>`;
      o += text(w * 0.82, top + 40, s.mark || (s.name || 'T')[0], { size: 17, fill: a });
      o += rect(4, top + 66, w - 8, h - 66, fr);
      const ix = 10, iy = top + 72, iw = w - 20, ih = h - 66 - 16;
      o += interior(ix, iy, iw, ih, r, { people: 3, lamps: 3, counter: '#9a6a3c', s: 0.9 });
      o += rect(ix + 6, iy + 8, 14, 38, shade(a, 0.35), 'k2');
      o += rect(0, G - 6, w, 6, shade(fr, -0.2), 'k2');
      return { w, top: top - 4, body: o };
    },

    // Dark modern building with a pale upper box and a picket fence beside it.
    modern(s, r) {
      const bw = s.width || 168, h = s.height || 212, top = G - h, x0 = 44;
      const c = s.color || '#3a3a42', a = s.accent || '#c98a3c';
      let o = '';
      for (let x = 2; x < x0 - 4; x += 7) o += `<path class="k2" fill="#f4f2ee" d="M${x} ${G} V${G - 52} L${N(x + 3.5)} ${G - 60} L${x + 7} ${G - 52} V${G} Z"/>`;
      o += line(0, G - 40, x0, G - 40) + line(0, G - 14, x0, G - 14);
      o += rect(x0, top, bw, 82, '#efeeea');
      const pw = (bw - 28) / 3;
      for (let i = 0; i < 3; i++) o += pane(x0 + 8 + i * (pw + 6), top + 14, pw, 46, i === 1 || r() < 0.2);
      o += rect(x0 - 5, top + 82, bw + 10, 8, shade(c, -0.35));
      o += rect(x0, top + 90, bw, h - 90, c);
      o += text(x0 + bw / 2, top + 106, s.name || '', { size: 7, font: 'block', fill: '#d9d4cc', maxW: bw * 0.6, spacing: 1 });
      const lw = bw * 0.26;
      o += pane(x0 + 10, G - 76, lw, 50, r() < 0.6, { cols: 2, rows: 2 });
      o += pane(x0 + bw - 10 - lw, G - 76, lw, 50, true, { cols: 2, rows: 2 });
      o += rect(x0 + bw / 2 - 15, G - 84, 30, 84, a);
      o += rect(x0 + bw / 2 - 10, G - 78, 20, 72, null, 'k2 lit');
      o += circle(x0 + bw / 2 + 7, G - 40, 1.5, '#3a3330', 'k2');
      return { w: x0 + bw, top, body: o };
    },

    // Little gabled shop with a pastel glow and a hand-painted board.
    cottage(s, r) {
      const w = s.width || 158, h = s.height || 196, top = G - h;
      const c = s.color || '#f5f0ea', a = s.accent || '#8b4a2f', roof = s.trim || '#5a3b33', glow = s.glow || '#e7a8e0';
      let o = rect(w - 36, top - 10, 12, 20, roof);
      o += `<path class="k" fill="${roof}" d="M-8 ${top + 34} L10 ${top} H${w - 10} L${w + 8} ${top + 34} Z"/>`;
      o += rect(0, top + 34, w, h - 34, c);
      o += rect(w * 0.16, top + 44, w * 0.52, 28, a);
      o += text(w * 0.42, top + 57, s.name || 'Shop', { size: 10, font: 'block', maxW: w * 0.46 });
      if (s.sub) o += text(w * 0.42, top + 67, s.sub, { size: 5.5, font: 'block', maxW: w * 0.4, spacing: 0.4 });
      o += line(w - 28, top + 44, w - 28, top + 50) + rect(w - 38, top + 50, 20, 14, '#fff', 'k2');
      o += text(w - 28, top + 60, s.badge || 'open', { size: 6, fill: a, maxW: 16 });
      const gw = w * 0.46, gy = top + 82;
      o += rect(8, gy, gw, G - gy - 8, glow);
      for (let i = 1; i < 3; i++) o += line(8 + (gw / 3) * i, gy, 8 + (gw / 3) * i, G - 8);
      o += person(8 + gw * 0.5, G - 8, 0.95, r);
      o += rect(8, G - 8, gw, 8, shade(c, -0.15), 'k2');
      o += rect(w * 0.62, gy + 4, 30, G - gy - 4, shade(glow, 0.35));
      o += rect(w * 0.62 + 5, gy + 9, 20, 30, null, 'k2 lit');
      o += pane(w - 22, gy + 6, 14, 26, true);
      return { w, top: top - 10, body: o };
    }
  };

  // ---------- street props ----------
  const PROPS = {
    tree(p, r, ctx) {
      const w = p.width || 54, cx = w / 2, th = 46 + r() * 16;
      let o = line(cx, G, cx, G - th, 'k');
      o += circle(cx + 3, G - th - 14, 19 + r() * 4, null, 'k2 leaf1');
      o += circle(cx - 6, G - th - 4, 14, null, 'k2 leaf2');
      o += circle(cx + 9, G - th - 2, 10, null, 'k2 leaf1');
      return { w, top: G - th - 36, body: o };
    },
    lamp(p, r, ctx) {
      const w = p.width || 34, cx = w / 2;
      let o = `<circle cx="${cx}" cy="${G - 110}" r="18" fill="url(#hg-${ctx.uid})" class="halo"/>`;
      o += line(cx, G, cx, G - 110, 'k');
      o += `<path class="k" fill="var(--ss-ink)" d="M${cx - 5} ${G - 106} L${cx - 3} ${G - 118} H${cx + 3} L${cx + 5} ${G - 106} Z"/>`;
      o += circle(cx, G - 104, 2.2, null, 'k2 lit');
      return { w, top: G - 128, body: o };
    },
    signpost(p, r, ctx) {
      const w = p.width || 70, x = 30, col = p.color || '#3f7b5a';
      let o = line(x, G, x, G - 124, 'k');
      o += rect(4, G - 122, 54, 12, col, 'k2') + text(31, G - 113, p.label || 'Main St', { size: 6.5, font: 'block', maxW: 46, spacing: 0.5 });
      o += rect(12, G - 106, 38, 10, col, 'k2') + text(31, G - 99, p.sub || 'No. 01', { size: 5.5, font: 'block', maxW: 30 });
      return { w, top: G - 124, body: o };
    },
    gap(p) { return { w: p.width || 24, top: G, body: '' }; }
  };

  const AUTO_PROPS = [['tree'], ['lamp'], ['tree', 'lamp'], ['lamp', 'tree'], ['tree', 'gap'], ['gap', 'tree']];

  const defs = (uid, seed) => `<defs>
    <filter id="f-${uid}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${seed + 7}" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.08  0.75 0 0 0 -0.36" result="ga"/>
      <feComposite in="ga" in2="d" operator="in" result="gm"/>
      <feMerge><feMergeNode in="d"/><feMergeNode in="gm"/></feMerge>
    </filter>
    <radialGradient id="hg-${uid}"><stop offset="0" class="hs0"/><stop offset="1" class="hs1"/></radialGradient>
  </defs>`;

  function sidewalk(x, W) {
    let o = rect(x, G, W, 9, null, 'pave');
    for (let jx = x + 23; jx < x + W; jx += 46) o += line(jx, G + 1, jx - 3, G + 9, 'joint');
    o += line(x, G, x + W, G, 'k') + line(x, G + 9, x + W, G + 9, 'joint');
    return o;
  }

  const CSS = `
  :host{display:block;position:relative;
    --ss-ink:#3b3431;--ss-glass:#b9ccd4;--ss-lit:#f2bd58;--ss-halo:rgba(255,210,120,.55);
    --ss-leaf1:#a9d09a;--ss-leaf2:#88ba7b;--ss-pave:#efebe5;--ss-joint:#b8aea6;
    --ss-tip-bg:#fffdf9;--ss-tip-fg:#2d2724;--ss-tip-muted:#7b716b;--ss-tip-line:#e6ded5;
    --ss-dim:none;-webkit-user-select:none;user-select:none}
  :host([data-night]){
    --ss-ink:#17141b;--ss-glass:#2c3a56;--ss-lit:#ffd27a;--ss-halo:rgba(255,196,110,.75);
    --ss-leaf1:#5e8b59;--ss-leaf2:#4b7547;--ss-pave:#2b2932;--ss-joint:#4a4652;
    --ss-tip-bg:#25232c;--ss-tip-fg:#f1ece6;--ss-tip-muted:#a69d96;--ss-tip-line:#3a3742;
    --ss-dim:brightness(.82) saturate(.92)}
  .vp{position:relative;overflow:hidden;overflow:clip;touch-action:pan-y;cursor:grab;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);
            mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
  .vp.dragging{cursor:grabbing}
  .track{display:flex;align-items:flex-end;width:max-content;will-change:transform}
  .item{display:block;flex:none;margin:0;padding:0;border:0;background:none;font:inherit;color:inherit;line-height:0}
  .item svg{display:block;overflow:visible;filter:var(--ss-dim)}
  .bldg{cursor:pointer;border-radius:4px;outline:none;text-decoration:none}
  .bldg svg .lift{transition:transform .35s cubic-bezier(.2,.8,.2,1)}
  .bldg:hover svg .lift,.bldg:focus-visible svg .lift,.bldg.on svg .lift{transform:translateY(-6px)}
  .bldg:focus-visible{box-shadow:inset 0 -3px 0 var(--ss-focus,#c8303a)}
  .k{stroke:var(--ss-ink);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
  .k2{stroke:var(--ss-ink);stroke-width:1;stroke-linejoin:round;stroke-linecap:round}
  .glass{fill:var(--ss-glass)} .lit{fill:var(--ss-lit)}
  .leaf1{fill:var(--ss-leaf1)} .leaf2{fill:var(--ss-leaf2)}
  .pave{fill:var(--ss-pave)} .joint{stroke:var(--ss-joint);stroke-width:1}
  .shine{stroke:#fff;stroke-opacity:.55;stroke-width:1.2;stroke-linecap:round}
  .chalk{stroke:#e9e4dc;stroke-opacity:.7;stroke-width:1}
  .hs0{stop-color:var(--ss-halo)} .hs1{stop-color:var(--ss-halo);stop-opacity:0}
  :host([data-night]) .halo{animation:ss-pulse 4s ease-in-out infinite}
  @keyframes ss-pulse{50%{opacity:.7}}
  .t-script{font-family:var(--ss-font-script,'Kalam','Caveat','Segoe Print','Bradley Hand',cursive);font-weight:700}
  .t-block{font-family:var(--ss-font-block,'Oswald','Bebas Neue','Arial Narrow',sans-serif);font-weight:500}
  .tip{position:absolute;left:0;top:0;z-index:5;min-width:160px;max-width:240px;padding:10px 12px 11px;
    background:var(--ss-tip-bg);color:var(--ss-tip-fg);border:1px solid var(--ss-tip-line);border-radius:10px;
    box-shadow:0 10px 30px -12px rgba(30,20,15,.35);pointer-events:none;opacity:0;
    transition:opacity .18s ease;font:13px/1.4 var(--ss-font-ui,system-ui,sans-serif);line-height:1.4}
  .tip.show{opacity:1}
  .tip b{display:block;font-size:14px;font-weight:600}
  .tip .m{color:var(--ss-tip-muted);font-size:11.5px;letter-spacing:.02em}
  .tip .n{margin-top:4px}
  .tip::after{content:"";position:absolute;left:var(--ax,50%);bottom:-6px;width:10px;height:10px;margin-left:-5px;
    background:var(--ss-tip-bg);border-right:1px solid var(--ss-tip-line);border-bottom:1px solid var(--ss-tip-line);transform:rotate(45deg)}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  @media (prefers-reduced-motion:reduce){.bldg svg .lift{transition:none}:host([data-night]) .halo{animation:none}}
  `;

  let UID = 0;

  class StorefrontStreet extends HTMLElement {
    static get observedAttributes() { return ['speed', 'height', 'direction', 'paused', 'theme', 'props', 'seed', 'src']; }

    constructor() {
      super();
      this._stores = [];
      this._x = 0; this._v = 0; this._fling = 0; this._setW = 0;
      this._hover = null; this._seek = null; this._paused = false;
      this._id = ++UID;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${CSS}</style>
        <div class="vp" part="viewport"><div class="track" part="track"></div></div>
        <div class="tip" part="tooltip" role="status" aria-live="polite"></div>`;
      this._vp = root.querySelector('.vp');
      this._track = root.querySelector('.track');
      this._tip = root.querySelector('.tip');
      this._tick = this._tick.bind(this);
      this._bind();
    }

    // ----- public API -----
    get stores() { return this._stores; }
    set stores(v) { this._stores = Array.isArray(v) ? v : []; this._render(); }
    play() { this._paused = false; this.removeAttribute('paused'); }
    pause() { this._paused = true; }
    scrollToStore(key) {
      const i = typeof key === 'number' ? key : this._stores.findIndex(s => s.id === key || s.name === key);
      const el = this._track.querySelector(`.bldg[data-i="${i}"][data-c="0"]`);
      if (el) this._seekTo(el);
    }

    get speed() { const v = parseFloat(this.getAttribute('speed')); return Number.isFinite(v) ? v : 36; }
    get heightPx() { const v = parseFloat(this.getAttribute('height')); return Number.isFinite(v) ? v : 300; }

    connectedCallback() {
      if (!this._stores.length) {
        const j = this.querySelector('script[type="application/json"]');
        if (j) { try { this._stores = JSON.parse(j.textContent); } catch (e) { console.warn('[storefront-street] bad JSON', e); } }
      }
      this._mq = matchMedia('(prefers-color-scheme: dark)');
      this._rm = matchMedia('(prefers-reduced-motion: reduce)');
      this._onTheme = () => this._applyTheme();
      this._mq.addEventListener?.('change', this._onTheme);
      this._mo = new MutationObserver(this._onTheme);
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this._applyTheme();
      this._ro = new ResizeObserver(() => this._layoutCopies());
      this._ro.observe(this);
      this._io = new IntersectionObserver(es => { this._visible = es[0].isIntersecting; this._kick(); });
      this._io.observe(this);
      if (this.hasAttribute('src') && !this._stores.length) this._load(this.getAttribute('src'));
      else this._render();
      this._kick();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._raf = 0;
      this._ro?.disconnect(); this._io?.disconnect(); this._mo?.disconnect();
      this._mq?.removeEventListener?.('change', this._onTheme);
    }
    attributeChangedCallback(name, oldV, v) {
      if (!this.isConnected || oldV === v) return;
      if (name === 'height' || name === 'props' || name === 'seed') this._render();
      if (name === 'theme') this._applyTheme();
      if (name === 'paused') this._paused = v !== null;
      if (name === 'src' && v) this._load(v);
    }

    async _load(url) {
      try { const r = await fetch(url); this.stores = await r.json(); }
      catch (e) { console.warn('[storefront-street] could not load', url, e); }
    }

    _applyTheme() {
      const t = this.getAttribute('theme');
      const rootT = document.documentElement.getAttribute('data-theme');
      const night = t === 'dark' || (t !== 'light' && (rootT === 'dark' || (rootT !== 'light' && this._mq?.matches)));
      this.toggleAttribute('data-night', !!night);
    }

    // ----- rendering -----
    _buildSet(copy) {
      const scale = this.heightPx / H;
      const seed0 = parseInt(this.getAttribute('seed') || '7', 10);
      const auto = this.getAttribute('props') !== 'none';
      const parts = [];
      this._stores.forEach((s, i) => {
        const r = rng(hashStr((s.id || s.name || i) + ':' + seed0));
        let before = s.before;
        if (before === undefined) before = auto ? pick(r, AUTO_PROPS) : [];
        for (const p0 of before) {
          const p = typeof p0 === 'string' ? { type: p0 } : p0;
          const fn = PROPS[p.type]; if (!fn) continue;
          const uid = `${this._id}-${copy}-${i}-${parts.length}`;
          const g = fn(p, r, { uid });
          const W = g.w;
          parts.push(`<div class="item prop" aria-hidden="true"><svg viewBox="0 0 ${N(W)} ${H}" width="${N(W * scale)}" height="${N(H * scale)}" focusable="false">${defs(uid, (hashStr(uid) % 90) + 1)}${sidewalk(0, W)}<g filter="url(#f-${uid})">${g.body}</g></svg></div>`);
        }
        const tpl = TEMPLATES[s.type] || TEMPLATES.shop;
        const b = tpl(s, r);
        const pad = s.pad ?? 12, W = b.w + pad * 2;
        const uid = `${this._id}-${copy}-${i}-b`;
        const tag = s.href ? 'a' : 'button';
        const hidden = copy > 0;
        const attrs = [
          `class="item bldg" part="building" data-i="${i}" data-c="${copy}" data-top="${N(b.top)}"`,
          s.href ? `href="${esc(s.href)}" target="${esc(s.target || '_blank')}" rel="noopener"` : 'type="button"',
          hidden ? 'tabindex="-1" aria-hidden="true"' : `aria-label="${esc([s.name, s.meta, s.note].filter(Boolean).join('. '))}"`
        ].join(' ');
        parts.push(`<${tag} ${attrs}><svg viewBox="${-pad} 0 ${N(W)} ${H}" width="${N(W * scale)}" height="${N(H * scale)}" focusable="false" aria-hidden="true">${defs(uid, (hashStr(uid) % 90) + 1)}${sidewalk(-pad, W)}<g class="lift"><g filter="url(#f-${uid})">${b.body}</g></g></svg></${tag}>`);
      });
      return parts.join('');
    }

    _render() {
      if (!this.isConnected) return;
      this._hideTip();
      this._set0 = this._buildSet(0);
      this._track.innerHTML = this._set0;
      this._setW = this._track.scrollWidth;
      this._copies = 1;
      this._layoutCopies(true);
      this.dispatchEvent(new CustomEvent('street-render', { detail: { count: this._stores.length } }));
    }

    _layoutCopies(force) {
      if (!this._set0 || !this._setW) return;
      const need = Math.max(2, Math.ceil(this.clientWidth / this._setW) + 1);
      if (!force && need === this._copies) return;
      let html = this._set0;
      for (let c = 1; c < need; c++) html += this._buildSet(c);
      this._track.innerHTML = html;
      this._copies = need;
      this._setW = this._track.scrollWidth / need;
    }

    // ----- motion -----
    _kick() {
      if (this._raf || !this._visible) return;
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }

    _tick(t) {
      this._raf = 0;
      const dt = Math.min(0.05, (t - this._last) / 1000); this._last = t;
      const dir = this.getAttribute('direction') === 'right' ? -1 : 1;
      const still = this._paused || this._hover || this._focused || this._dragging || (this._rm?.matches && this.getAttribute('motion') !== 'always');
      const target = still ? 0 : this.speed * dir;
      if (!this._dragging) {
        if (this._seek !== null) {
          const d = this._seek - this._x;
          this._x += d * Math.min(1, dt * 7);
          if (Math.abs(d) < 0.5) this._seek = null;
          this._v = 0;
        } else {
          if (Math.abs(this._fling) > 2) { this._x += this._fling * dt; this._fling *= Math.pow(0.05, dt); } else this._fling = 0;
          this._v += (target - this._v) * Math.min(1, dt * 2.5);
          this._x += this._v * dt;
        }
      }
      if (this._setW > 0) {
        const wrapped = ((this._x % this._setW) + this._setW) % this._setW;
        if (this._seek !== null) this._seek += wrapped - this._x;
        this._x = wrapped;
      }
      this._track.style.transform = `translate3d(${-this._x.toFixed(2)}px,0,0)`;
      if (this._hover) this._placeTip(this._hover);
      if (this._visible && !document.hidden) this._raf = requestAnimationFrame(this._tick);
    }

    _seekTo(el) {
      const vw = this._vp.clientWidth;
      let x = el.offsetLeft + el.offsetWidth / 2 - vw / 2;
      if (this._setW) { while (x - this._x > this._setW / 2) x -= this._setW; while (this._x - x > this._setW / 2) x += this._setW; }
      this._seek = x; this._fling = 0;
      this._kick();
    }

    // ----- tooltip -----
    _showTip(el) {
      const s = this._stores[+el.dataset.i]; if (!s) return;
      this._hover = el;
      this._track.querySelectorAll('.bldg.on').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      if (s.tooltip === false) return;
      this._tip.innerHTML = `<b>${esc(s.name)}</b>${s.meta ? `<div class="m">${esc(s.meta)}</div>` : ''}${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}`;
      this._placeTip(el);
      this._tip.classList.add('show');
      this.dispatchEvent(new CustomEvent('store-hover', { detail: { store: s, index: +el.dataset.i } }));
    }
    _placeTip(el) {
      const scale = this.heightPx / H;
      const cx = el.offsetLeft - this._x + el.offsetWidth / 2;
      const top = this._vp.offsetTop + (+el.dataset.top) * scale - 16;
      const tw = this._tip.offsetWidth, hw = this.clientWidth;
      const left = Math.max(8, Math.min(hw - tw - 8, cx - tw / 2));
      this._tip.style.transform = `translate(${left.toFixed(1)}px, ${(top - this._tip.offsetHeight).toFixed(1)}px)`;
      this._tip.style.setProperty('--ax', `${Math.max(14, Math.min(tw - 14, cx - left))}px`);
    }
    _hideTip() {
      this._hover = null;
      this._tip.classList.remove('show');
      this._track.querySelectorAll('.bldg.on').forEach(b => b.classList.remove('on'));
    }

    // ----- input -----
    _bind() {
      const vp = this._vp;
      vp.addEventListener('scroll', () => { vp.scrollLeft = 0; });

      vp.addEventListener('pointerover', e => {
        if (this._dragging || e.pointerType === 'touch') return;
        const b = e.target.closest('.bldg'); if (b && b !== this._hover) this._showTip(b);
      });
      vp.addEventListener('pointerout', e => {
        if (e.pointerType === 'touch') return;
        const b = e.target.closest('.bldg');
        if (b && !b.contains(e.relatedTarget)) this._hideTip();
      });

      let start = 0, last = 0, lastT = 0, moved = false, id = null, vel = 0;
      vp.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        id = e.pointerId; start = last = e.clientX; lastT = performance.now(); moved = false; vel = 0;
        this._dragging = true; this._fling = 0; this._seek = null; this._kick();
      });
      vp.addEventListener('pointermove', e => {
        if (e.pointerId !== id) return;
        const now = performance.now(), dx = e.clientX - last;
        this._x -= dx; last = e.clientX;
        const dts = Math.max(1, now - lastT) / 1000; vel = vel * 0.6 + (-dx / dts) * 0.4; lastT = now;
        if (!moved && Math.abs(e.clientX - start) > 6) {
          moved = true; vp.classList.add('dragging'); this._hideTip();
          try { vp.setPointerCapture(id); } catch (_) {}
        }
      });
      const end = e => {
        if (e.pointerId !== id) return;
        id = null; this._dragging = false; vp.classList.remove('dragging');
        if (moved) { this._fling = Math.max(-2400, Math.min(2400, vel)); this._suppress = true; setTimeout(() => (this._suppress = false), 0); }
      };
      vp.addEventListener('pointerup', end);
      vp.addEventListener('pointercancel', end);

      vp.addEventListener('click', e => {
        if (this._suppress) { e.preventDefault(); e.stopPropagation(); return; }
        const b = e.target.closest('.bldg'); if (!b) return;
        const i = +b.dataset.i, s = this._stores[i];
        if (e.pointerType === 'touch' || e.detail === 0) this._showTip(b);
        const ev = new CustomEvent('store-select', { detail: { store: s, index: i }, cancelable: true, bubbles: true, composed: true });
        if (!this.dispatchEvent(ev) && s?.href) e.preventDefault();
      }, true);

      vp.addEventListener('wheel', e => {
        const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
        if (!dx) return;
        e.preventDefault(); this._x += dx; this._seek = null; this._kick();
      }, { passive: false });

      vp.addEventListener('focusin', e => {
        const b = e.target.closest('.bldg'); if (!b) return;
        vp.scrollLeft = 0;
        let kb = true; try { kb = b.matches(':focus-visible'); } catch (_) {}
        if (!kb) return;
        this._focused = true; this._seekTo(b); this._showTip(b);
      });
      vp.addEventListener('focusout', e => {
        if (!vp.contains(e.relatedTarget)) { this._focused = false; this._hideTip(); }
      });
      vp.addEventListener('keydown', e => {
        if (e.key === 'Escape') { this._hideTip(); e.target.blur?.(); }
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this._kick(); });
    }
  }

  // Expose templates so projects can register their own building types.
  StorefrontStreet.templates = TEMPLATES;
  StorefrontStreet.props = PROPS;
  StorefrontStreet.helpers = { rect, line, circle, text, pane, person, interior, shade, G, H };
  customElements.define('storefront-street', StorefrontStreet);
  window.StorefrontStreet = StorefrontStreet;
})();

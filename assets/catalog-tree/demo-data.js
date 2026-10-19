/* Placeholder catalog for the catalog-tree demo.
   Generates 106 invented projects as SVG data URIs so the demo needs no image files.
   Swap this out for your real { id, title, category, thumb, images } list. */
(function () {
  'use strict';
  var seed = 20261019;
  function r() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function pick(a) { return a[Math.floor(r() * a.length)]; }
  function rr(a, b) { return a + r() * (b - a); }
  function hsl(h, s, l) { return 'hsl(' + Math.round(h) + ' ' + Math.round(s) + '% ' + Math.round(l) + '%)'; }
  function uri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  var FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

  var NAMES = ['Halden', 'Morrow', 'Kestrel', 'Ovid', 'Plinth', 'Sable', 'Tessera', 'Ferro', 'Lumen', 'Quill', 'Brava',
    'Cinder', 'Dune', 'Fathom', 'Gilt', 'Harbor', 'Index', 'Juno', 'Kiln', 'Lark', 'Marrow', 'Nimbus', 'Orchard',
    'Pellet', 'Quarry', 'Rune', 'Saltworks', 'Tandem', 'Umber', 'Vesper', 'Wren', 'Yonder', 'Zenith', 'Basin', 'Copse',
    'Drift', 'Ember', 'Folio', 'Grove', 'Heron', 'Isle', 'Jetty', 'Knoll', 'Loam', 'Mesa', 'Nook', 'Oxbow', 'Pique',
    'Ridge', 'Strata', 'Tidal', 'Vale', 'Wharf', 'Arbor', 'Bramble', 'Cove', 'Delta', 'Estuary', 'Flint', 'Garnet',
    'Hollow', 'Ingot', 'Juniper', 'Keel', 'Lantern', 'Meadow', 'Nettle', 'Onyx', 'Pylon', 'Quarter', 'Reed', 'Shale',
    'Thistle', 'Upland', 'Verve', 'Willow', 'Axiom', 'Bolt', 'Crest', 'Dawn', 'Echo', 'Forge', 'Glyph', 'Haze', 'Iris',
    'Jolt', 'Kite', 'Lyric', 'Mantle', 'Nova', 'Opal', 'Prism', 'Quota', 'Rally', 'Signal', 'Tonic', 'Unity', 'Vista',
    'Weft', 'Yield', 'Zephyr', 'Alder', 'Birch', 'Cedar', 'Dahlia', 'Elder'];
  var HEADS = ['Knowledge Base', 'Field Notes', 'Built to last', 'Shop the range', 'Our process', 'New season',
    'The index', 'Made slowly', 'Plan your visit', 'Good systems', 'Daily ritual', 'Start here'];
  var STAGES = ['#e7e5de', '#dcdad2', '#efede7', '#d3d1c8', '#e9e8ee', '#e3e9e4', '#ece6dd', '#cfcdc2'];

  function svg(w, h, bg, body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>' + body + '</svg>';
  }
  function grad(id, hues, s, l, vertical) {
    var stops = hues.map(function (hh, i) {
      return '<stop offset="' + (i / (hues.length - 1)) + '" stop-color="' + hsl(hh, s, l) + '"/>';
    }).join('');
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' + stops + '</linearGradient>';
  }
  function lines(x, y, w, n, gap, col) {
    var o = '';
    for (var i = 0; i < n; i++) o += '<rect x="' + x + '" y="' + (y + i * gap) + '" width="' + (w * (i === n - 1 ? 0.6 : rr(0.85, 1))) + '" height="' + Math.max(1.5, gap * 0.38) + '" rx="1" fill="' + col + '"/>';
    return o;
  }
  function shadow(x, y, w, h) {
    return '<rect x="' + (x + 4) + '" y="' + (y + 8) + '" width="' + w + '" height="' + h + '" fill="#000" opacity="0.07"/>';
  }

  /* ---- digital ---- */
  function site(W, H, b) {
    var cw = W * 0.6, ch = H * 0.74, x = (W - cw) / 2, y = H * 0.13;
    var band = ch * 0.17, s = '';
    s += '<defs>' + grad('g', b.hues, 70, 62) + grad('c', [b.hues[0] + 20, b.hues[1]], 70, 70, true) + '</defs>';
    s += shadow(x, y, cw, ch) + '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" fill="#fff"/>';
    s += '<text x="' + (x + 12) + '" y="' + (y + 15) + '" font-family="' + FONT + '" font-weight="700" font-size="' + (ch * 0.04) + '" fill="#111">' + b.name + '</text>';
    s += lines(x + cw * 0.3, y + 10, 14, 1, 5, '#bbb') + lines(x + cw * 0.38, y + 10, 14, 1, 5, '#bbb') + lines(x + cw * 0.8, y + 10, 16, 1, 5, '#bbb');
    s += '<rect x="' + x + '" y="' + (y + 24) + '" width="' + cw + '" height="' + band + '" fill="url(#g)"/>';
    s += '<text x="' + (x + 14) + '" y="' + (y + 24 + band + ch * 0.17) + '" font-family="' + FONT + '" font-size="' + (ch * 0.1) + '" letter-spacing="-1" fill="#111">' + b.head + '</text>';
    s += lines(x + 14, y + 24 + band + ch * 0.25, cw * 0.36, 4, 6, '#d6d6d6') + lines(x + cw * 0.55, y + 24 + band + ch * 0.25, cw * 0.38, 6, 5, '#e2e2e2');
    var kw = cw * 0.2, ky = y + ch * 0.6;
    for (var i = 0; i < 3; i++) {
      var kx = x + cw * 0.42 + i * (kw + 9);
      if (kx + kw > W - 4) break;
      s += shadow(kx, ky, kw, ch * 0.5) + '<rect x="' + kx + '" y="' + ky + '" width="' + kw + '" height="' + (ch * 0.5) + '" fill="#fff"/>';
      s += '<rect x="' + (kx + 5) + '" y="' + (ky + 5) + '" width="' + (kw - 10) + '" height="' + (ch * 0.22) + '" fill="' + hsl(b.hues[i % b.hues.length] + i * 25, 65, 68) + '"/>';
      s += lines(kx + 5, ky + ch * 0.3, kw - 10, 3, 5, '#cfcfcf');
    }
    return svg(W, H, b.stage, s);
  }
  function phones(W, H, b) {
    var s = '<defs>' + grad('p', b.hues, 60, 55, true) + '</defs>', n = 3, pw = W * 0.17, ph = pw * 2.05, gap = W * 0.05;
    var x0 = (W - (n * pw + (n - 1) * gap)) / 2, y0 = (H - ph) / 2;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (pw + gap), y = y0 + (i === 1 ? -H * 0.03 : H * 0.03);
      s += shadow(x, y, pw, ph) + '<rect x="' + x + '" y="' + y + '" width="' + pw + '" height="' + ph + '" rx="' + (pw * 0.16) + '" fill="#111"/>';
      s += '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (pw - 8) + '" height="' + (ph - 8) + '" rx="' + (pw * 0.13) + '" fill="#fafafa"/>';
      if (i === 1) s += '<rect x="' + (x + 4) + '" y="' + (y + ph * 0.12) + '" width="' + (pw - 8) + '" height="' + (ph * 0.4) + '" fill="url(#p)"/>';
      else s += '<rect x="' + (x + 10) + '" y="' + (y + ph * 0.14) + '" width="' + (pw - 20) + '" height="' + (pw - 20) + '" rx="4" fill="' + hsl(b.hues[i % 2], 55, 75) + '"/>';
      s += '<text x="' + (x + 10) + '" y="' + (y + ph * 0.66) + '" font-family="' + FONT + '" font-weight="600" font-size="' + (pw * 0.12) + '" fill="#111">' + b.name + '</text>';
      s += lines(x + 10, y + ph * 0.72, pw - 20, 4, 7, '#d4d4d4');
    }
    return svg(W, H, b.stage, s);
  }
  function dash(W, H, b) {
    var s = '', x = W * 0.12, y = H * 0.14, w = W * 0.76, h = H * 0.72, acc = hsl(b.hues[0], 80, 62);
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="#161616"/>';
    s += '<text x="' + (x + 14) + '" y="' + (y + 22) + '" font-family="' + FONT + '" font-weight="700" font-size="' + (h * 0.05) + '" fill="#f2f2f2">' + b.name + '</text>';
    s += lines(x + 14, y + 40, w * 0.18, 6, 12, '#2c2c2c');
    var cx = x + w * 0.28, cy = y + 34, cw = w * 0.66, chh = h * 0.42, pts = [];
    s += '<rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + chh + '" rx="4" fill="#1f1f1f"/>';
    var v = 0.5;
    for (var i = 0; i <= 18; i++) { v = Math.max(0.08, Math.min(0.92, v + rr(-0.16, 0.18))); pts.push((cx + 8 + i * (cw - 16) / 18).toFixed(1) + ',' + (cy + chh - 8 - v * (chh - 16)).toFixed(1)); }
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + acc + '" stroke-width="2"/>';
    for (var k = 0; k < 3; k++) {
      var bx = cx + k * (cw / 3), by = cy + chh + 10, bw = cw / 3 - 8, bh = h - chh - 54;
      s += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="4" fill="#1f1f1f"/>';
      for (var j = 0; j < 6; j++) { var hh = rr(0.2, 0.9) * (bh - 20); s += '<rect x="' + (bx + 8 + j * (bw - 16) / 6) + '" y="' + (by + bh - 8 - hh) + '" width="' + ((bw - 16) / 6 - 3) + '" height="' + hh + '" fill="' + (j === 3 ? acc : '#3a3a3a') + '"/>'; }
    }
    return svg(W, H, b.stage, s);
  }
  function cards(W, H, b) {
    var s = '', cols = 3, rows = 2, g = W * 0.03, cw = (W * 0.76 - g * (cols - 1)) / cols, ch = (H * 0.72 - g) / rows;
    for (var i = 0; i < cols * rows; i++) {
      var x = W * 0.12 + (i % cols) * (cw + g), y = H * 0.14 + Math.floor(i / cols) * (ch + g);
      s += shadow(x, y, cw, ch) + '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" fill="#fff"/>';
      s += '<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (cw - 12) + '" height="' + (ch * 0.55) + '" fill="' + hsl(b.hues[i % b.hues.length] + i * 12, 40, rr(55, 78)) + '"/>';
      s += lines(x + 6, y + ch * 0.68, cw - 12, 3, 7, '#d0d0d0');
    }
    return svg(W, H, b.stage, s);
  }

  /* ---- logo ---- */
  function mark(cx, cy, sz, col, kind) {
    if (kind === 0) return '<circle cx="' + cx + '" cy="' + cy + '" r="' + sz / 2 + '" fill="' + col + '"/>';
    if (kind === 1) return '<rect x="' + (cx - sz / 2) + '" y="' + (cy - sz / 2) + '" width="' + sz + '" height="' + sz + '" fill="' + col + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + sz / 4 + '" fill="currentColor" opacity="0.0"/>';
    if (kind === 2) return '<path d="M' + cx + ' ' + (cy - sz / 2) + 'L' + (cx + sz / 2) + ' ' + (cy + sz / 2) + 'L' + (cx - sz / 2) + ' ' + (cy + sz / 2) + 'Z" fill="' + col + '"/>';
    return '<circle cx="' + (cx - sz / 4) + '" cy="' + cy + '" r="' + sz / 3 + '" fill="none" stroke="' + col + '" stroke-width="' + sz / 7 + '"/><circle cx="' + (cx + sz / 4) + '" cy="' + cy + '" r="' + sz / 3 + '" fill="none" stroke="' + col + '" stroke-width="' + sz / 7 + '"/>';
  }
  function wordmark(W, H, b, v) {
    var schemes = [['#fff', '#111'], ['#111', '#f4f4f4'], [hsl(b.hues[0], 70, 50), '#fff'], ['#efeee9', hsl(b.hues[1], 60, 30)]];
    var sc = schemes[(b.scheme + v) % schemes.length], fs = W * (b.name.length > 7 ? 0.1 : 0.13);
    var s = mark(W * 0.5 - b.name.length * fs * 0.31 - fs * 0.6, H / 2 - fs * 0.33, fs * 0.8, sc[1], b.mark);
    s += '<text x="' + (W * 0.5 + fs * 0.3) + '" y="' + (H / 2) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="' + b.weight + '" font-size="' + fs + '" letter-spacing="' + (b.weight > 600 ? -2 : 1) + '" fill="' + sc[1] + '">' + b.name + '</text>';
    return svg(W, H, sc[0], s);
  }
  function markOnly(W, H, b) {
    var col = hsl(b.hues[0], 65, 48), s = mark(W / 2, H / 2, H * 0.42, col, b.mark);
    return svg(W, H, '#f4f3ef', s);
  }
  function card(W, H, b) {
    var cw = W * 0.42, ch = cw * 0.58, s = '<g transform="rotate(-8 ' + W / 2 + ' ' + H / 2 + ')">';
    s += shadow(W * 0.24, H * 0.26, cw, ch) + '<rect x="' + W * 0.24 + '" y="' + H * 0.26 + '" width="' + cw + '" height="' + ch + '" fill="#fff"/>';
    s += '<text x="' + (W * 0.24 + 14) + '" y="' + (H * 0.26 + ch * 0.32) + '" font-family="' + FONT + '" font-weight="' + b.weight + '" font-size="' + ch * 0.16 + '" fill="#111">' + b.name + '</text>';
    s += lines(W * 0.24 + 14, H * 0.26 + ch * 0.62, cw * 0.4, 3, 7, '#c8c8c8');
    s += '<rect x="' + W * 0.36 + '" y="' + H * 0.42 + '" width="' + cw + '" height="' + ch + '" fill="' + hsl(b.hues[0], 70, 50) + '"/>';
    s += mark(W * 0.36 + cw / 2, H * 0.42 + ch / 2, ch * 0.4, '#fff', b.mark) + '</g>';
    return svg(W, H, '#d9d7cf', s);
  }

  /* ---- physical ---- */
  function bottles(W, H, b) {
    var s = '', n = 3, bw = W * 0.09, g = W * 0.07, x0 = (W - (n * bw + (n - 1) * g)) / 2, base = H * 0.82;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (bw + g), bh = H * rr(0.42, 0.55), col = i === 2 ? '#141414' : hsl(b.hues[i % 2] + i * 20, 70, rr(45, 70));
      s += '<rect x="' + (x + bw * 0.34) + '" y="' + (base - bh - H * 0.12) + '" width="' + bw * 0.32 + '" height="' + H * 0.14 + '" fill="' + col + '" opacity="0.85"/>';
      s += '<rect x="' + x + '" y="' + (base - bh) + '" width="' + bw + '" height="' + bh + '" rx="' + bw * 0.25 + '" fill="' + col + '"/>';
      s += '<rect x="' + (x + 4) + '" y="' + (base - bh * 0.6) + '" width="' + (bw - 8) + '" height="' + bh * 0.28 + '" fill="#fff" opacity="0.9"/>';
      s += '<ellipse cx="' + (x + bw / 2) + '" cy="' + (base + 4) + '" rx="' + bw * 0.7 + '" ry="4" fill="#000" opacity="0.08"/>';
    }
    return svg(W, H, b.stage, s);
  }
  function pack(W, H, b) {
    var s = '', col = hsl(b.hues[0], 30, 28);
    for (var i = 0; i < 3; i++) {
      var x = W * 0.16 + i * W * 0.12, y = H * 0.44, w = W * 0.1, h = H * 0.36;
      s += '<rect x="' + x + '" y="' + (y - 12) + '" width="' + w + '" height="14" rx="2" fill="#2a2a2a"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + col + '"/>';
      s += '<rect x="' + x + '" y="' + (y + h * 0.3) + '" width="' + w + '" height="' + h * 0.3 + '" fill="#f3f1ea"/>';
    }
    var bx = W * 0.56, by = H * 0.22, bw2 = W * 0.26, bh2 = H * 0.6;
    s += '<path d="M' + (bx + 10) + ' ' + by + 'L' + (bx + bw2 - 10) + ' ' + by + 'L' + (bx + bw2) + ' ' + (by + bh2) + 'L' + bx + ' ' + (by + bh2) + 'Z" fill="#c9c9c6"/>';
    s += '<rect x="' + (bx + bw2 * 0.2) + '" y="' + (by + bh2 * 0.35) + '" width="' + bw2 * 0.6 + '" height="' + bh2 * 0.3 + '" fill="#fff"/>';
    s += '<text x="' + (bx + bw2 / 2) + '" y="' + (by + bh2 * 0.53) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="700" font-size="' + bw2 * 0.12 + '" fill="#111">' + b.name + '</text>';
    return svg(W, H, b.stage, s);
  }
  function billboard(W, H, b) {
    var s = '<defs>' + grad('sky', [205, 215], 60, 62, true) + '</defs><rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
    var bw = W * 0.58, bh = bw * 0.36, x = W * 0.21, y = H * 0.2;
    s += '<rect x="' + (x + bw * 0.25) + '" y="' + (y + bh) + '" width="6" height="' + H + '" fill="#555"/><rect x="' + (x + bw * 0.72) + '" y="' + (y + bh) + '" width="6" height="' + H + '" fill="#555"/>';
    s += '<rect x="' + (x - 4) + '" y="' + (y - 4) + '" width="' + (bw + 8) + '" height="' + (bh + 8) + '" fill="#333"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" fill="' + (b.scheme % 2 ? '#111' : '#f5f5f2') + '"/>';
    s += '<text x="' + (x + bw / 2) + '" y="' + (y + bh * 0.62) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="' + bh * 0.34 + '" letter-spacing="-2" fill="' + (b.scheme % 2 ? '#fff' : '#111') + '">' + b.name.toUpperCase() + '</text>';
    return svg(W, H, '#8fb4d6', s);
  }
  function poster(W, H, b) {
    var pw = W * 0.34, ph = pw * 1.3, s = '<g transform="rotate(' + rr(-10, 10).toFixed(1) + ' ' + W / 2 + ' ' + H / 2 + ')">';
    s += shadow((W - pw) / 2, (H - ph) / 2, pw, ph) + '<rect x="' + (W - pw) / 2 + '" y="' + (H - ph) / 2 + '" width="' + pw + '" height="' + ph + '" fill="#111"/>';
    for (var i = 0; i < 3; i++) s += '<text x="' + W / 2 + '" y="' + ((H - ph) / 2 + ph * (0.32 + i * 0.22)) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="900" font-size="' + pw * 0.2 + '" letter-spacing="-2" fill="' + (i === 1 ? hsl(b.hues[0], 80, 60) : '#fff') + '">' + b.name.toUpperCase().slice(0, 6) + '</text>';
    s += '</g>';
    return svg(W, H, b.stage, s);
  }

  var GEN = {
    digital: [site, phones, dash, cards],
    logo: [wordmark, markOnly, card],
    physical: [bottles, pack, billboard, poster]
  };
  var COUNTS = { logo: 24, digital: 60, physical: 22 };

  var items = [], nameIdx = 0;
  ['digital', 'logo', 'physical'].forEach(function (cat) {
    for (var i = 0; i < COUNTS[cat]; i++) {
      var name = NAMES[nameIdx++ % NAMES.length];
      var brand = {
        name: name, head: pick(HEADS), stage: pick(STAGES), scheme: Math.floor(r() * 4), mark: Math.floor(r() * 4),
        weight: pick([500, 700, 800]), hues: [rr(0, 360), rr(0, 360), rr(0, 360)]
      };
      var gens = GEN[cat], first = Math.floor(r() * gens.length);
      var ratio = cat === 'logo' ? pick([1.5, 1.6, 1.33]) : cat === 'physical' ? pick([1.25, 1.4, 1.6, 1.75]) : pick([1.45, 1.6, 1.6, 1.78]);
      var W = 960, H = Math.round(W / ratio), n = 4 + Math.floor(r() * 4), images = [];
      for (var k = 0; k < n; k++) {
        var g = gens[(first + k) % gens.length];
        images.push(uri(g(W, H, brand, k)));
        brand.hues = brand.hues.map(function (hh) { return hh + rr(-20, 20); });
      }
      items.push({ id: cat + '-' + i, title: name, category: cat, ratio: ratio, thumb: images[0], images: images });
    }
  });

  window.DEMO_CATALOG = {
    categories: [{ id: 'logo', label: 'Logo' }, { id: 'digital', label: 'Digital' }, { id: 'physical', label: 'Physical' }],
    items: items
  };
})();

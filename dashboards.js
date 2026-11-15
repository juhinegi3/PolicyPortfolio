/* Powers the interactive dashboard on dashboard-nfhs.html.
   All numbers and the district map come from nfhs-data.json. To update the dashboard,
   replace that file on GitHub with a new one in the same format:
     indicators: [{ n, name, better }]   (better is "Higher" or "Lower")
     values:     [[indicatorNumber, district, state, NFHS-5 value, NFHS-6 value], ...]
     map:        { w, h, paths: { district: SVG path } }  */
(function () {
  'use strict';
  var C1 = '#6f8777', C2 = '#161616', GRID = 'rgba(22,22,22,0.18)', INK2 = 'rgba(22,22,22,0.72)';
  var RED = [178, 84, 64], MID = [233, 230, 223], BLUE = [58, 104, 142];
  var SVGNS = 'http://www.w3.org/2000/svg';
  var data, state = 'All', i1 = 30, i2 = 33, sortKey = 'b', sortDir = -1, byNum = {}, imp = {};

  function $(s) { return document.querySelector(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function svg(t, a, x) { var n = document.createElementNS(SVGNS, t); for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function f1(x) { return r1(x).toFixed(1); }
  function s1(x) { var r = r1(x); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1); }
  function avg(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : NaN; }
  function niceStep(span) { var c = [1, 2, 5, 10, 20, 25, 50]; for (var i = 0; i < c.length; i++) if (span / c[i] <= 6) return c[i]; return 100; }

  /* ---------- tooltip ---------- */
  var tip = null;
  function showTip(t, lines) {
    tip.textContent = '';
    lines.forEach(function (l, i) { tip.appendChild(el('div', i ? 'tip-l' : 'tip-v', l)); });
    tip.hidden = false;
    var b = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), window.innerWidth - w - 8);
    var y = b.top - h - 8; if (y < 8) y = b.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function bindTip(node, lines) {
    node.setAttribute('tabindex', 0);
    node.addEventListener('pointerenter', function () { showTip(node, lines); });
    node.addEventListener('pointerleave', function () { tip.hidden = true; });
    node.addEventListener('focus', function () { showTip(node, lines); });
    node.addEventListener('blur', function () { tip.hidden = true; });
  }

  /* ---------- data ---------- */
  // imp[indicator][district] = { s, a, b, chg, imp }
  function prepare() {
    data.indicators.forEach(function (i) { byNum[i.n] = i; imp[i.n] = {}; });
    data.values.forEach(function (v) {
      var chg = v[4] - v[3], lower = byNum[v[0]].better === 'Lower';
      imp[v[0]][v[1]] = { s: v[2], a: v[3], b: v[4], chg: chg, imp: lower ? -chg : chg };
    });
  }
  function districts(st) {
    return Object.keys(imp[i1]).filter(function (d) { return st === 'All' || imp[i1][d].s === st; });
  }
  function name(n) { return byNum[n].name; }

  /* ---------- map ---------- */
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }).join(',') + ')'; }
  function fill(v, max) {
    var t = Math.min(Math.abs(v) / max, 1);
    if (Math.abs(v) < 0.5) return mix(MID, MID, 0);
    return v > 0 ? mix(MID, BLUE, 0.25 + 0.75 * t) : mix(MID, RED, 0.25 + 0.75 * t);
  }
  function drawMap() {
    var box = $('#c-map'); box.textContent = '';
    var m = data.map, all = Object.keys(imp[i2]);
    var max = Math.max.apply(null, all.map(function (d) { return Math.abs(imp[i2][d].imp); })) || 1;
    var s = svg('svg', { viewBox: '-4 -4 ' + (m.w + 8) + ' ' + (m.h + 8), role: 'img', 'aria-label': 'District map of improvement in ' + name(i2) });
    all.forEach(function (d) {
      var r = imp[i2][d], on = state === 'All' || r.s === state;
      var p = svg('path', { d: m.paths[d], fill: fill(r.imp, max), stroke: '#f4f2ec', 'stroke-width': 0.8, opacity: on ? 1 : 0.18 });
      if (on) bindTip(p, [s1(r.imp) + ' points', d + ', ' + r.s + ': ' + f1(r.a) + ' to ' + f1(r.b)]);
      s.appendChild(p);
    });
    s.appendChild(svg('text', { x: 250, y: 30, 'font-size': 15, fill: '#161616', 'pointer-events': 'none' }, 'Bihar'));
    s.appendChild(svg('text', { x: 20, y: 300, 'font-size': 15, fill: '#161616', 'pointer-events': 'none' }, 'Odisha'));
    box.appendChild(s);
  }

  /* ---------- column chart: average improvement by state ---------- */
  function drawCols() {
    var box = $('#c-cols'); box.textContent = '';
    var W = Math.max(box.clientWidth, 260), H = 280, pl = 40, pr = 8, pt = 24, pb = 34;
    var groups = (state === 'All' ? ['Bihar', 'Odisha'] : [state]).map(function (st) {
      var ds = districts(st);
      return { s: st, a: avg(ds.map(function (d) { return imp[i1][d].imp; })), b: avg(ds.map(function (d) { return imp[i2][d].imp; })), n: ds.length };
    });
    var vals = [0]; groups.forEach(function (g) { vals.push(g.a, g.b); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var step = niceStep((hi - lo) || 1);
    if (lo < 0) lo -= step * 0.6;
    if (hi > 0) hi += step * 0.3;
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; if (hi === lo) hi = lo + step;
    var Y = function (v) { return pt + (H - pt - pb) * (hi - v) / (hi - lo); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Average improvement by state' });
    for (var t = lo; t <= hi + 1e-9; t += step) {
      s.appendChild(svg('line', { x1: pl, x2: W - pr, y1: Y(t), y2: Y(t), stroke: t === 0 ? 'rgba(22,22,22,0.6)' : GRID }));
      s.appendChild(svg('text', { x: pl - 8, y: Y(t) + 4, 'text-anchor': 'end', 'font-size': 13, fill: INK2 }, String(r1(t))));
    }
    var slot = (W - pl - pr) / groups.length, bw = Math.min(54, slot * 0.28);
    groups.forEach(function (g, i) {
      var cx = pl + slot * (i + 0.5);
      [[g.a, cx - bw - 2, C1, name(i1)], [g.b, cx + 2, C2, name(i2)]].forEach(function (b) {
        var y0 = Y(0), y = Y(b[0]), top = Math.min(y, y0), h = Math.max(Math.abs(y - y0), 1);
        s.appendChild(svg('rect', { x: b[1], y: top, width: bw, height: h, fill: b[2] }));
        s.appendChild(svg('text', { x: b[1] + bw / 2, y: b[0] >= 0 ? top - 7 : top + h + 15, 'text-anchor': 'middle', 'font-size': 14, fill: '#161616' }, s1(b[0])));
        var hit = svg('rect', { x: b[1], y: top, width: bw, height: h, fill: 'transparent' });
        bindTip(hit, [s1(b[0]) + ' points', b[3] + ', ' + g.s + ', average of ' + g.n + ' districts']);
        s.appendChild(hit);
      });
      s.appendChild(svg('text', { x: cx, y: H - 10, 'text-anchor': 'middle', 'font-size': 15, fill: '#161616' }, g.s));
    });
    box.appendChild(s);
  }

  /* ---------- scatter plots: one per state ---------- */
  function fit(pts) {
    var n = pts.length, mx = avg(pts.map(function (p) { return p[0]; })), my = avg(pts.map(function (p) { return p[1]; }));
    var sxy = 0, sxx = 0, syy = 0;
    pts.forEach(function (p) { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); syy += (p[1] - my) * (p[1] - my); });
    var b = sxx ? sxy / sxx : 0;
    return { b: b, a: my - b * mx, r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0, n: n };
  }
  function drawScatter(st) {
    var box = $('#c-sc-' + st.toLowerCase()); box.textContent = '';
    var ds = districts(st), pts = ds.map(function (d) { return [imp[i1][d].imp, imp[i2][d].imp, d]; });
    var W = Math.max(box.clientWidth, 240), H = Math.round(Math.min(W * 0.8, 340)), pl = 50, pr = 12, pt = 12, pb = 48;
    function range(k) {
      var v = pts.map(function (p) { return p[k]; }).concat([0]);
      var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), st = niceStep((hi - lo) || 1);
      return { lo: Math.floor(lo / st) * st, hi: Math.ceil(hi / st) * st || st, st: st };
    }
    var rx = range(0), ry = range(1);
    var X = function (v) { return pl + (W - pl - pr) * (v - rx.lo) / (rx.hi - rx.lo); };
    var Y = function (v) { return pt + (H - pt - pb) * (ry.hi - v) / (ry.hi - ry.lo); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': st + ': improvement in ' + name(i1) + ' against ' + name(i2) });
    for (var t = rx.lo; t <= rx.hi + 1e-9; t += rx.st) {
      s.appendChild(svg('line', { x1: X(t), x2: X(t), y1: pt, y2: H - pb, stroke: t === 0 ? 'rgba(22,22,22,0.55)' : GRID }));
      s.appendChild(svg('text', { x: X(t), y: H - pb + 16, 'text-anchor': 'middle', 'font-size': 12, fill: INK2 }, String(r1(t))));
    }
    for (t = ry.lo; t <= ry.hi + 1e-9; t += ry.st) {
      s.appendChild(svg('line', { x1: pl, x2: W - pr, y1: Y(t), y2: Y(t), stroke: t === 0 ? 'rgba(22,22,22,0.55)' : GRID }));
      s.appendChild(svg('text', { x: pl - 6, y: Y(t) + 4, 'text-anchor': 'end', 'font-size': 12, fill: INK2 }, String(r1(t))));
    }
    s.appendChild(svg('text', { x: (pl + W - pr) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#161616' }, 'Indicator 1'));
    s.appendChild(svg('text', { x: 11, y: (pt + H - pb) / 2, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#161616', transform: 'rotate(-90 11 ' + (pt + H - pb) / 2 + ')' }, 'Indicator 2'));
    var f = fit(pts);
    if (pts.length > 2) {
      s.appendChild(svg('line', { x1: X(rx.lo), y1: Y(f.a + f.b * rx.lo), x2: X(rx.hi), y2: Y(f.a + f.b * rx.hi), stroke: C1, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }));
    }
    var clip = svg('clipPath', { id: 'clip-' + st }); clip.appendChild(svg('rect', { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb }));
    s.insertBefore(clip, s.firstChild);
    var tl = s.lastChild; if (pts.length > 2) tl.setAttribute('clip-path', 'url(#clip-' + st + ')');
    pts.forEach(function (p) {
      var c = svg('circle', { cx: X(p[0]), cy: Y(p[1]), r: 5, fill: C2, 'fill-opacity': 0.8, stroke: '#f4f2ec', 'stroke-width': 1 });
      bindTip(c, [p[2], name(i1) + ': ' + s1(p[0]) + ' points', name(i2) + ': ' + s1(p[1]) + ' points']);
      s.appendChild(c);
    });
    box.appendChild(s);
  }

  /* ---------- table ---------- */
  function drawTable() {
    var wrap = $('#tbl-wrap'); wrap.textContent = '';
    var rows = districts(state).map(function (d) { return { d: d, s: imp[i1][d].s, a: imp[i1][d].imp, b: imp[i2][d].imp }; });
    var cols = [{ k: 'd', l: 'District', text: true }, { k: 's', l: 'State', text: true, cls: 'hide-s' },
      { k: 'a', l: name(i1) }, { k: 'b', l: name(i2) }];
    rows.sort(function (p, q) {
      var a = p[sortKey], b = q[sortKey];
      return (typeof a === 'string' ? a.localeCompare(b) : a - b) * sortDir || p.d.localeCompare(q.d);
    });
    var tb = el('table', 'tbl tbl-d'), th = el('thead'), hr = el('tr');
    cols.forEach(function (c) {
      var h = el('th', (c.text ? '' : 'n wrap ') + (c.cls || '')); h.scope = 'col';
      h.setAttribute('aria-sort', sortKey === c.k ? (sortDir > 0 ? 'ascending' : 'descending') : 'none');
      var b = el('button', 'sort', c.l); b.type = 'button';
      b.addEventListener('click', function () {
        if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.text ? 1 : -1; }
        drawTable();
      });
      h.appendChild(b); hr.appendChild(h);
    });
    th.appendChild(hr); tb.appendChild(th);
    var body = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      cols.forEach(function (c, i) {
        var cell = el(i === 0 ? 'th' : 'td', (c.text ? '' : 'n ') + (c.cls || ''));
        if (i === 0) cell.scope = 'row';
        cell.textContent = c.text ? r[c.k] : s1(r[c.k]);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    var tf = el('tfoot'), fr = el('tr');
    cols.forEach(function (c, i) {
      var cell = el(i === 0 ? 'th' : 'td', (c.text ? '' : 'n ') + (c.cls || ''));
      if (i === 0) { cell.scope = 'row'; cell.textContent = 'Average'; }
      else if (!c.text) cell.textContent = s1(avg(rows.map(function (r) { return r[c.k]; })));
      fr.appendChild(cell);
    });
    tf.appendChild(fr); tb.appendChild(tf);
    wrap.appendChild(tb);
  }

  function draw() {
    $('#dir').textContent = 'A positive improvement always means progress, including for indicators where a lower value is better, such as stunting.';
    drawMap(); drawCols(); drawScatter('Bihar'); drawScatter('Odisha'); drawTable();
  }

  function init() {
    tip = $('#tip');
    prepare();
    ['#f-i1', '#f-i2'].forEach(function (id, k) {
      var sel = $(id);
      data.indicators.forEach(function (i) { var o = el('option', '', i.name); o.value = i.n; sel.appendChild(o); });
      sel.value = k ? i2 : i1;
      sel.addEventListener('change', function () { if (k) i2 = +sel.value; else i1 = +sel.value; draw(); });
    });
    $('#f-state').addEventListener('change', function (e) { state = e.target.value; draw(); });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { drawCols(); drawScatter('Bihar'); drawScatter('Odisha'); }, 120); });
    draw();
  }

  fetch('nfhs-data.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; init(); })
    .catch(function () { $('#dir').textContent = 'The dashboard data could not be loaded.'; });
})();

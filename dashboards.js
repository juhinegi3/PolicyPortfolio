/* Powers the Dashboards page.
   All numbers come from nfhs-data.json. To update the dashboard, replace that file on GitHub
   with a new one in the same format:
     indicators: [{ n, name, theme, better }]   (better is "Higher" or "Lower")
     values:     [[indicatorNumber, district, state, NFHS-5 value, NFHS-6 value], ...]  */
(function () {
  'use strict';
  var THEN = '#6f8777', NOW = '#161616', GRID = 'rgba(22,22,22,0.18)', INK2 = 'rgba(22,22,22,0.72)';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var DEFAULT_IND = 'Children under 5 stunted';
  var data, ind, state = 'All', sortKey = 'imp', sortDir = -1;

  function $(s) { return document.querySelector(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function svg(t, a, x) { var n = document.createElementNS(SVGNS, t); for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function f1(x) { return r1(x).toFixed(1); }
  function s1(x) { var r = r1(x); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1); }
  function avg(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }

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
  function hit(g, x, y, w, h, lines) {
    var r = svg('rect', { x: x, y: y, width: w, height: h, fill: 'transparent', tabindex: 0 });
    r.addEventListener('pointerenter', function () { showTip(r, lines); });
    r.addEventListener('pointerleave', function () { tip.hidden = true; });
    r.addEventListener('focus', function () { showTip(r, lines); });
    r.addEventListener('blur', function () { tip.hidden = true; });
    g.appendChild(r);
  }

  /* ---------- data ---------- */
  function rows() {
    return data.values.filter(function (v) {
      return v[0] === ind.n && (state === 'All' || v[2] === state);
    }).map(function (v) {
      var chg = v[4] - v[3];
      return { d: v[1], s: v[2], a: v[3], b: v[4], chg: chg, imp: ind.better === 'Lower' ? -chg : chg };
    });
  }
  function niceMax(m) { var s = [10, 20, 25, 40, 50, 60, 80, 100]; for (var i = 0; i < s.length; i++) if (m <= s[i]) return s[i]; return Math.ceil(m / 10) * 10; }

  /* ---------- chart 1: averages ---------- */
  function chartAvg(R) {
    var box = $('#c-avg'); box.textContent = '';
    var W = Math.max(box.clientWidth, 260), H = 290, pl = 34, pr = 8, pt = 26, pb = 34;
    var states = (state === 'All' ? ['Bihar', 'Odisha'] : [state]).map(function (s) {
      var q = R.filter(function (r) { return r.s === s; });
      return { s: s, a: avg(q.map(function (r) { return r.a; })), b: avg(q.map(function (r) { return r.b; })), n: q.length };
    });
    var maxV = niceMax(Math.max.apply(null, states.map(function (g) { return Math.max(g.a, g.b); })));
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / maxV); };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Average NFHS-5 and NFHS-6 values for ' + ind.name });
    var step = maxV <= 20 ? 5 : maxV <= 50 ? 10 : 20, ticks = [];
    for (var tv = 0; tv <= maxV; tv += step) ticks.push(tv);
    ticks.forEach(function (v) {
      var y = Y(v);
      s.appendChild(svg('line', { x1: pl, x2: W - pr, y1: y, y2: y, stroke: GRID }));
      s.appendChild(svg('text', { x: pl - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 13, fill: INK2 }, String(v)));
    });
    var slot = (W - pl - pr) / states.length, bw = Math.min(54, slot * 0.28);
    states.forEach(function (g, i) {
      var cx = pl + slot * (i + 0.5);
      [[g.a, cx - bw - 2, THEN, 'NFHS-5'], [g.b, cx + 2, NOW, 'NFHS-6']].forEach(function (b) {
        var y = Y(b[0]);
        s.appendChild(svg('rect', { x: b[1], y: y, width: bw, height: Y(0) - y, fill: b[2] }));
        s.appendChild(svg('text', { x: b[1] + bw / 2, y: y - 7, 'text-anchor': 'middle', 'font-size': 15, fill: '#161616' }, f1(b[0])));
        hit(s, b[1], y, bw, Y(0) - y, [f1(b[0]), b[3] + ', ' + g.s + ', average of ' + g.n + ' districts']);
      });
      s.appendChild(svg('text', { x: cx, y: H - 10, 'text-anchor': 'middle', 'font-size': 15, fill: '#161616' }, g.s));
    });
    box.appendChild(s);
  }

  /* ---------- chart 2: top 10 ---------- */
  function chartTop(R) {
    var box = $('#c-top'); box.textContent = '';
    var top = R.slice().sort(function (p, q) { return q.imp - p.imp; }).slice(0, 10);
    var W = Math.max(box.clientWidth, 260), narrow = W < 420, lab = narrow ? 124 : 140, fs = narrow ? 12 : 14.5;
    var rowH = 27, pt = 6, pb = 26, H = pt + rowH * top.length + pb, pr = 40;
    var maxV = Math.max(5, niceMax(Math.max.apply(null, top.map(function (r) { return r.imp; })) * 1.0 || 5));
    if (maxV > 100) maxV = 100;
    var tick = maxV <= 10 ? 2 : maxV <= 25 ? 5 : 10;
    var X = function (v) { return lab + (W - lab - pr) * Math.max(v, 0) / maxV; };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Top 10 districts by improvement in ' + ind.name });
    for (var t = 0; t <= maxV; t += tick) {
      s.appendChild(svg('line', { x1: X(t), x2: X(t), y1: pt, y2: H - pb, stroke: GRID }));
      s.appendChild(svg('text', { x: X(t), y: H - 8, 'text-anchor': 'middle', 'font-size': 13, fill: INK2 }, String(t)));
    }
    top.forEach(function (r, i) {
      var y = pt + i * rowH, bh = 15;
      s.appendChild(svg('text', { x: lab - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': fs, fill: '#161616' }, r.d));
      var w = Math.max(X(r.imp) - X(0), 1);
      s.appendChild(svg('rect', { x: X(0), y: y + (rowH - bh) / 2, width: w, height: bh, fill: NOW }));
      s.appendChild(svg('text', { x: X(0) + w + 6, y: y + rowH / 2 + 4, 'font-size': 13, fill: INK2 }, f1(r.imp)));
      hit(s, 0, y, W, rowH, [f1(r.imp) + ' points', r.d + ', ' + r.s + ': ' + f1(r.a) + ' to ' + f1(r.b)]);
    });
    box.appendChild(s);
  }

  /* ---------- table ---------- */
  function table(R) {
    var wrap = $('#tbl-wrap'); wrap.textContent = '';
    $('#tbl-title').textContent = ind.name + (state === 'All' ? ', all districts' : ', ' + state);
    var cols = [
      { k: 'd', l: 'District', text: true },
      { k: 's', l: 'State', text: true, cls: 'hide-s' },
      { k: 'a', l: 'NFHS-5' }, { k: 'b', l: 'NFHS-6' },
      { k: 'chg', l: 'Change', signed: true, cls: 'hide-s' }, { k: 'imp', l: 'Improvement', signed: true }
    ];
    var sorted = R.slice().sort(function (p, q) {
      var a = p[sortKey], b = q[sortKey];
      return (typeof a === 'string' ? a.localeCompare(b) : a - b) * sortDir || p.d.localeCompare(q.d);
    });
    var tb = el('table', 'tbl tbl-d');
    var th = el('thead'), hr = el('tr');
    cols.forEach(function (c) {
      var h = el('th', (c.text ? '' : 'n ') + (c.cls || '')); h.scope = 'col';
      h.setAttribute('aria-sort', sortKey === c.k ? (sortDir > 0 ? 'ascending' : 'descending') : 'none');
      var b = el('button', 'sort', c.l); b.type = 'button';
      b.addEventListener('click', function () {
        if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.text ? 1 : -1; }
        table(R);
      });
      h.appendChild(b); hr.appendChild(h);
    });
    th.appendChild(hr); tb.appendChild(th);
    var body = el('tbody');
    sorted.forEach(function (r) {
      var tr = el('tr');
      cols.forEach(function (c, i) {
        var v = r[c.k], cell = el(i === 0 ? 'th' : 'td', (c.text ? '' : 'n ') + (c.cls || ''));
        if (i === 0) cell.scope = 'row';
        cell.textContent = c.text ? v : c.signed ? s1(v) : f1(v);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    var tf = el('tfoot'), fr = el('tr');
    cols.forEach(function (c, i) {
      var cell = el(i === 0 ? 'th' : 'td', (c.text ? '' : 'n ') + (c.cls || ''));
      if (i === 0) { cell.scope = 'row'; cell.textContent = 'Average'; }
      else if (!c.text) { var m = avg(R.map(function (r) { return r[c.k]; })); cell.textContent = c.signed ? s1(m) : f1(m); }
      fr.appendChild(cell);
    });
    tf.appendChild(fr); tb.appendChild(tf);
    wrap.appendChild(tb);
  }

  /* ---------- key findings ---------- */
  function findings() {
    var byName = {}; data.indicators.forEach(function (i) { byName[i.name] = i; });
    function gain(st, name) {
      var n = byName[name].n;
      return avg(data.values.filter(function (v) { return v[0] === n && v[2] === st; }).map(function (v) { return v[4] - v[3]; }));
    }
    $('#kf1').textContent = f1(gain('Bihar', 'At least 4 antenatal visits')) + ' vs ' + f1(gain('Bihar', 'Iron-folic acid for 180+ days'));
    $('#kf2').textContent = s1(gain('Bihar', 'Adequate diet, 6-23 months')) + ' pp';
    var st = byName['Children under 5 stunted'].n, wa = byName['Children under 5 wasted'].n, m = {}, c = 0, tot = 0;
    data.values.forEach(function (v) { if (v[2] === 'Odisha' && (v[0] === st || v[0] === wa)) { (m[v[1]] = m[v[1]] || {})[v[0]] = v[4] - v[3]; } });
    Object.keys(m).forEach(function (d) { tot++; if (m[d][st] < 0 && m[d][wa] > 0) c++; });
    $('#kf3').textContent = c + ' of ' + tot;
  }

  function draw() {
    var R = rows();
    $('#dir').textContent = ind.better === 'Lower' ? 'For this indicator, a lower value is better, so a fall counts as an improvement.' : 'For this indicator, a higher value is better.';
    chartAvg(R); chartTop(R); table(R);
  }

  function init() {
    tip = $('#tip');
    var sel = $('#f-ind'), themes = {};
    data.indicators.forEach(function (i) { (themes[i.theme] = themes[i.theme] || []).push(i); });
    Object.keys(themes).forEach(function (t) {
      var g = el('optgroup'); g.label = t;
      themes[t].forEach(function (i) { var o = el('option', '', i.name); o.value = i.n; g.appendChild(o); });
      sel.appendChild(g);
    });
    ind = data.indicators.filter(function (i) { return i.name === DEFAULT_IND; })[0] || data.indicators[0];
    sel.value = ind.n;
    sel.addEventListener('change', function () {
      ind = data.indicators.filter(function (i) { return String(i.n) === sel.value; })[0];
      sortKey = 'imp'; sortDir = -1; draw();
    });
    $('#f-state').addEventListener('change', function (e) { state = e.target.value; draw(); });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { var R = rows(); chartAvg(R); chartTop(R); }, 120); });
    findings(); draw();
  }

  fetch('nfhs-data.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; init(); })
    .catch(function () { $('#dir').textContent = 'The dashboard data could not be loaded.'; });
})();

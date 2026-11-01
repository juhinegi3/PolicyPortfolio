/* Powers the Analyses page.

   The numbers, tables and charts on this page are read from the workbook
   plfs-cleaned-workbook.xlsx (sheet "Analysis_Women"). To update the page, replace that file
   on GitHub with a new version that has the same name, the same sheet name and the same column
   headings. Nothing in this file needs to change.

   Columns read from the sheet (extra columns are ignored):
     State_Standard, WPR_2017-18, WPR_2023-24,
     Own_2017-18, Helper_2017-18, Salaried_2017-18, DailyWage_2017-18,
     Own_2023-24, Helper_2023-24, Salaried_2023-24, DailyWage_2023-24
   Everything else (per 100 figures, changes, shares of the rise) is worked out here. */
(function () {
  'use strict';

  var WORKBOOK = 'plfs-cleaned-workbook.xlsx';
  var SHEET = 'Analysis_Women';
  var KINDS = [
    { key: 'helper', label: 'Unpaid help in a family farm or business', short: 'Unpaid family help', col: 'helper' },
    { key: 'own', label: 'Working on her own account, mostly farming or running something small', short: 'Own account', col: 'own' },
    { key: 'day', label: 'Daily-wage labour', short: 'Daily wage', col: 'dailywage' },
    { key: 'sal', label: 'Salaried job', short: 'Salaried', col: 'salaried' }
  ];
  var THEN = '#6f8777';   /* deeper sage, for 2017-18 */
  var NOW = '#161616';    /* ink, for 2023-24 */
  var GRID = 'rgba(22,22,22,0.18)';
  var INK2 = 'rgba(22,22,22,0.72)';
  var PAPER = '#e0e7ec';
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function signed1(x) { var r = Math.round(x * 10) / 10; return (r > 0 ? '+' : r < 0 ? '\u2212' : '') + Math.abs(r).toFixed(1); }
  function norm(h) { return String(h == null ? '' : h).replace(/\s+/g, '').toLowerCase(); }
  function num(v) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; }

  /* ---------- build the numbers from the sheet ---------- */
  function buildModel(rows) {
    var model = {}, order = [];
    rows.forEach(function (raw) {
      var r = {};
      for (var k in raw) if (raw.hasOwnProperty(k)) r[norm(k)] = raw[k];
      var name = r['state_standard'];
      if (!name) return;
      name = String(name).trim();
      var m = { name: name, wpr17: num(r['wpr_2017-18']), wpr24: num(r['wpr_2023-24']) };
      if (m.wpr17 == null || m.wpr24 == null) return;
      m.rise = m.wpr24 - m.wpr17;
      KINDS.forEach(function (kd) {
        var s17 = num(r[kd.col + '_2017-18']), s24 = num(r[kd.col + '_2023-24']);
        if (s17 == null || s24 == null) { s17 = s17 == null ? 0 : s17; s24 = s24 == null ? 0 : s24; }
        m['s17_' + kd.key] = s17;
        m['s24_' + kd.key] = s24;
        m['p17_' + kd.key] = m.wpr17 * s17 / 100;
        m['p24_' + kd.key] = m.wpr24 * s24 / 100;
        m['chg_' + kd.key] = m['p24_' + kd.key] - m['p17_' + kd.key];
        m['sh_' + kd.key] = m.rise ? m['chg_' + kd.key] / m.rise : 0;
      });
      model[name] = m;
      order.push(name);
    });
    return { byName: model, order: order };
  }

  /* ---------- fill numbers in the writing ---------- */
  function fillText(data) {
    $all('[data-v]').forEach(function (n) {
      var parts = n.getAttribute('data-v').split('.');
      var m = data.byName[parts[0]];
      if (!m || m[parts[1]] == null) return;
      var v = m[parts[1]];
      if (parts[1].indexOf('sh_') === 0) n.textContent = String(Math.round(v * 100));
      else n.textContent = f1(v);
    });
  }

  /* ---------- table: kinds of work (finding 1) ---------- */
  function fillKindsTable(data) {
    var ind = data.byName['India'];
    var tb = $('#tbl-kinds tbody'), tf = $('#tbl-kinds tfoot');
    if (!ind || !tb) return;
    tb.textContent = '';
    KINDS.forEach(function (kd) {
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = kd.label; tr.appendChild(th);
      var a = document.createElement('td'); a.className = 'n'; a.textContent = f1(ind['chg_' + kd.key]); tr.appendChild(a);
      var b = document.createElement('td'); b.className = 'n'; b.textContent = Math.round(ind['sh_' + kd.key] * 100) + '%'; tr.appendChild(b);
      tb.appendChild(tr);
    });
    tf.textContent = '';
    var tr = document.createElement('tr');
    var th = document.createElement('th'); th.scope = 'row'; th.textContent = 'All rural women in work'; tr.appendChild(th);
    var a = document.createElement('td'); a.className = 'n'; a.textContent = f1(ind.rise); tr.appendChild(a);
    var b = document.createElement('td'); b.className = 'n'; b.textContent = '100%'; tr.appendChild(b);
    tf.appendChild(tr);
  }

  /* ---------- table: shares and per 100 (finding 2) ---------- */
  function fillSharesTable(data) {
    var ind = data.byName['India'];
    var tb = $('#tbl-shares tbody');
    if (!ind || !tb) return;
    tb.textContent = '';
    [['helper', 'Unpaid help in a family farm or business'], ['sal', 'Salaried job']].forEach(function (p) {
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = p[1]; tr.appendChild(th);
      ['s17_', 's24_', 'p17_', 'p24_'].forEach(function (pre) {
        var td = document.createElement('td'); td.className = 'n'; td.textContent = f1(ind[pre + p[0]]); tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  /* ---------- tooltip ---------- */
  var tip = null;
  function showTip(target, lines) {
    if (!tip) return;
    tip.textContent = '';
    var v = document.createElement('div'); v.className = 'tip-v'; v.textContent = lines[0]; tip.appendChild(v);
    for (var i = 1; i < lines.length; i++) {
      var l = document.createElement('div'); l.className = 'tip-l'; l.textContent = lines[i]; tip.appendChild(l);
    }
    tip.hidden = false;
    var r = target.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = r.left + r.width / 2 - tw / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
    var y = r.top - th - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function hit(g, x, y, w, h, lines) {
    var r = svg('rect', { x: x, y: y, width: Math.max(w, 24), height: Math.max(h, 24), fill: 'transparent', tabindex: '0', 'class': 'hit' });
    r.addEventListener('pointerenter', function () { showTip(r, lines); });
    r.addEventListener('pointerleave', hideTip);
    r.addEventListener('focus', function () { showTip(r, lines); });
    r.addEventListener('blur', hideTip);
    g.appendChild(r);
  }

  /* bar with a rounded far end and a square end on the baseline (horizontal, growing right) */
  function hbar(x, y, w, h, color) {
    var r = Math.min(4, w / 2, h / 2);
    var d = 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
    return svg('path', { d: d, fill: color });
  }
  /* bar with a rounded top and a square end on the baseline (vertical, growing up) */
  function vbar(x, yTop, w, h, color) {
    var r = Math.min(4, w / 2, h);
    var d = 'M' + x + ',' + (yTop + h) + 'V' + (yTop + r) + 'Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + yTop + ' ' + (x + w) + ',' + (yTop + r) + 'V' + (yTop + h) + 'Z';
    return svg('path', { d: d, fill: color });
  }
  function text(x, y, s, o) {
    o = o || {};
    return svg('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'start', 'font-size': o.size || 14,
      fill: o.fill || '#161616', 'font-family': 'Newsreader, Georgia, serif',
      'font-style': o.italic ? 'italic' : 'normal', 'letter-spacing': o.ls || '0.01em'
    }, s);
  }

  /* ---------- chart 2: shares against per 100 ---------- */
  function chartShares(box, data) {
    var ind = data.byName['India']; if (!ind) return;
    var W = box.clientWidth || 600, narrow = W < 520;
    var H = narrow ? 300 : 300, top = 40, base = H - 78, plotH = base - top;
    var maxV = 50;
    var groups = [
      { title: 'Unpaid help in a family farm or business', k: 'helper' },
      { title: 'Salaried job', k: 'sal' }
    ];
    var gw = W / 2, barW = narrow ? 22 : 30, gap = 4;
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': box.parentNode.getAttribute('aria-label') });
    var g = svg('g', {}); s.appendChild(g);
    groups.forEach(function (grp, gi) {
      var gx = gi * gw;
      g.appendChild(text(gx + (narrow ? 4 : 12), 16, narrow ? (gi ? 'Salaried job' : 'Unpaid family help') : grp.title, { size: narrow ? 14 : 16, italic: true }));
      var clusters = [
        { name: 'Share of working women', unit: '%', a: ind['s17_' + grp.k], b: ind['s24_' + grp.k], lines: narrow ? ['Share of', 'working women'] : ['Share of', 'working women'] },
        { name: 'Per 100 rural women', unit: ' per 100 rural women', a: ind['p17_' + grp.k], b: ind['p24_' + grp.k], lines: ['Per 100', 'rural women'] }
      ];
      var cw = gw / 2;
      clusters.forEach(function (c, ci) {
        var cx = gx + ci * cw + cw / 2;
        var x1 = cx - barW - gap / 2, x2 = cx + gap / 2;
        [[c.a, x1, THEN, '2017–18'], [c.b, x2, NOW, '2023–24']].forEach(function (b) {
          var h = Math.max(2, b[0] / maxV * plotH);
          g.appendChild(vbar(b[1], base - h, barW, h, b[2]));
          g.appendChild(text(b[1] + barW / 2, base - h - 6, f1(b[0]), { anchor: 'middle', size: 14 }));
          hit(g, b[1] - 2, base - h - 22, barW + 4, h + 22, [f1(b[0]) + c.unit, grp.title, b[3]]);
        });
        g.appendChild(text(cx, base + 22, c.lines[0], { anchor: 'middle', size: 13, fill: INK2 }));
        g.appendChild(text(cx, base + 38, c.lines[1], { anchor: 'middle', size: 13, fill: INK2 }));
      });
    });
    g.appendChild(svg('line', { x1: gw, x2: gw, y1: 0, y2: base + 44, stroke: GRID, 'stroke-width': 1 }));
    g.appendChild(svg('line', { x1: 0, x2: W, y1: base, y2: base, stroke: INK2, 'stroke-width': 1 }));
    box.textContent = ''; box.appendChild(s);
  }

  /* ---------- chart 3: states, then and now ---------- */
  function chartStates(box, data) {
    var names = ['India', 'Bihar', 'Assam', 'Jharkhand'].filter(function (n) { return data.byName[n]; });
    if (!names.length) return;
    var W = box.clientWidth || 600, narrow = W < 520;
    var labelW = narrow ? 84 : 120, rowH = 48, topPad = 8, axisH = 56, rightPad = 36;
    var maxV = 60;
    var plotW = W - labelW - rightPad, H = topPad + names.length * rowH + axisH;
    var X = function (v) { return labelW + v / maxV * plotW; };
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': box.parentNode.getAttribute('aria-label') });
    var g = svg('g', {}); s.appendChild(g);
    var plotBottom = topPad + names.length * rowH;
    [0, 20, 40, 60].forEach(function (t) {
      g.appendChild(svg('line', { x1: X(t), x2: X(t), y1: topPad, y2: plotBottom, stroke: GRID, 'stroke-width': 1 }));
      g.appendChild(text(X(t), plotBottom + 20, String(t), { anchor: 'middle', size: 13, fill: INK2 }));
    });
    names.forEach(function (n, i) {
      var m = data.byName[n], cy = topPad + i * rowH + rowH / 2;
      var xa = X(m.wpr17), xb = X(m.wpr24);
      g.appendChild(text(labelW - 14, cy + 5, n === 'India' ? 'All India' : n, { anchor: 'end', size: narrow ? 14 : 16, italic: n === 'India' }));
      g.appendChild(svg('line', { x1: xa, x2: xb, y1: cy, y2: cy, stroke: 'rgba(22,22,22,0.35)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
      g.appendChild(svg('circle', { cx: xa, cy: cy, r: 6, fill: THEN, stroke: PAPER, 'stroke-width': 2 }));
      g.appendChild(svg('circle', { cx: xb, cy: cy, r: 6, fill: NOW, stroke: PAPER, 'stroke-width': 2 }));
      g.appendChild(text(xa - 12, cy - 11, f1(m.wpr17), { anchor: 'middle', size: 14 }));
      g.appendChild(text(xb + 2, cy - 11, f1(m.wpr24), { anchor: 'middle', size: 14 }));
      hit(g, Math.min(xa, xb) - 14, cy - rowH / 2, Math.abs(xb - xa) + 28, rowH, [signed1(m.rise) + ' per 100 rural women', (n === 'India' ? 'All India' : n) + ': ' + f1(m.wpr17) + ' in 2017–18, ' + f1(m.wpr24) + ' in 2023–24']);
    });
    g.appendChild(text(labelW + plotW / 2, H - 6, 'Women in work per 100 rural women', { anchor: 'middle', size: 13, fill: INK2 }));
    box.textContent = ''; box.appendChild(s);
  }

  /* ---------- state-by-state table ---------- */
  function stateTable(data) {
    var wrap = $('#state-table-wrap'); if (!wrap) return;
    var cols = [
      { id: 'name', label: 'State or union territory', get: function (m) { return m.name; }, text: true },
      { id: 'wpr17', label: '2017–18', get: function (m) { return m.wpr17; }, group: 'Rural women in work per 100' },
      { id: 'wpr24', label: '2023–24', get: function (m) { return m.wpr24; }, group: 'Rural women in work per 100' },
      { id: 'rise', label: 'Rise', get: function (m) { return m.rise; }, group: 'Rural women in work per 100', signed: true },
      { id: 'helper', label: 'Unpaid family help', get: function (m) { return m.chg_helper; }, group: 'Change in each kind of work, per 100', signed: true },
      { id: 'own', label: 'Own account', get: function (m) { return m.chg_own; }, group: 'Change in each kind of work, per 100', signed: true },
      { id: 'day', label: 'Daily wage', get: function (m) { return m.chg_day; }, group: 'Change in each kind of work, per 100', signed: true },
      { id: 'sal', label: 'Salaried', get: function (m) { return m.chg_sal; }, group: 'Change in each kind of work, per 100', signed: true }
    ];
    var state = { key: 'name', dir: 1 };
    var india = data.byName['India'];
    var list = data.order.filter(function (n) { return n !== 'India'; }).map(function (n) { return data.byName[n]; });

    var table = document.createElement('table'); table.className = 'tbl tbl-states';
    var cap = document.createElement('caption'); cap.className = 'sr'; cap.textContent = 'Rural women in work per 100 rural women, 2017–18 and 2023–24, and the change in each kind of work, by state'; table.appendChild(cap);
    var thead = document.createElement('thead'), tbody = document.createElement('tbody');
    var r1 = document.createElement('tr'), r2 = document.createElement('tr');
    var first = document.createElement('th'); first.rowSpan = 2; first.scope = 'col'; r1.appendChild(first);
    var gs = [['Rural women in work per 100', 3], ['Change in each kind of work, per 100', 4]];
    gs.forEach(function (g) { var th = document.createElement('th'); th.colSpan = g[1]; th.scope = 'colgroup'; th.className = 'grp'; th.textContent = g[0]; r1.appendChild(th); });
    var buttons = {};
    cols.forEach(function (c, i) {
      var th = document.createElement('th'); th.scope = 'col'; if (!c.text) th.className = 'n';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = c.label; b.className = 'sort';
      b.addEventListener('click', function () {
        if (state.key === c.id) state.dir = -state.dir; else { state.key = c.id; state.dir = c.text ? 1 : -1; }
        render();
      });
      th.appendChild(b); buttons[c.id] = th;
      if (i === 0) { first.className = 'first'; first.appendChild(b); first.removeAttribute('class'); first.className = 'first'; buttons[c.id] = first; }
      else r2.appendChild(th);
    });
    thead.appendChild(r1); thead.appendChild(r2); table.appendChild(thead); table.appendChild(tbody);

    function fmt(c, m) { var v = c.get(m); return c.text ? v : (c.signed ? signed1(v) : f1(v)); }
    function row(m, cls) {
      var tr = document.createElement('tr'); if (cls) tr.className = cls;
      cols.forEach(function (c, i) {
        var cell = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) cell.scope = 'row'; else cell.className = 'n';
        cell.textContent = (i === 0 && m.name === 'India') ? 'All India' : fmt(c, m);
        tr.appendChild(cell);
      });
      return tr;
    }
    function render() {
      var col = cols.filter(function (c) { return c.id === state.key; })[0];
      var rows = list.slice();
      rows.sort(function (a, b) {
        var x = col.get(a), y = col.get(b);
        if (col.text) return state.dir * String(x).localeCompare(String(y));
        return state.dir * (x - y);
      });
      tbody.textContent = '';
      if (india) tbody.appendChild(row(india, 'total'));
      rows.forEach(function (m) { tbody.appendChild(row(m)); });
      cols.forEach(function (c) {
        var th = buttons[c.id];
        th.setAttribute('aria-sort', c.id === state.key ? (state.dir > 0 ? 'ascending' : 'descending') : 'none');
      });
    }
    wrap.textContent = ''; wrap.appendChild(table); render();
  }

  /* ---------- lightbox for the PDF pages ---------- */
  function lightbox() {
    var dlg = $('#lightbox'); if (!dlg || typeof dlg.showModal !== 'function') return;
    var img = $('#lb-img'), cap = $('#lb-caption'), open = $('#lb-open');
    $all('[data-lightbox]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        img.src = a.getAttribute('href');
        img.alt = a.querySelector('img') ? a.querySelector('img').alt : '';
        cap.textContent = a.getAttribute('data-lightbox');
        open.href = a.getAttribute('href');
        dlg.showModal();
        dlg.scrollTop = 0;
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- redraw charts when the width changes ---------- */
  function charts(data) {
    var defs = [['#chart-shares .chart-area', chartShares], ['#chart-states .chart-area', chartStates]];
    var last = 0;
    function draw() {
      defs.forEach(function (d) { var box = $(d[0]); if (box) d[1](box, data); });
      last = window.innerWidth;
    }
    draw();
    var t;
    window.addEventListener('resize', function () {
      if (window.innerWidth === last) return;
      clearTimeout(t); t = setTimeout(draw, 120);
    });
  }

  function failNote() {
    var wrap = $('#state-table-wrap');
    if (wrap) { wrap.textContent = ''; var p = document.createElement('p'); p.className = 'loading'; p.textContent = 'The table could not be loaded just now. The workbook can still be downloaded with the button above.'; wrap.appendChild(p); }
    $all('.chart-area').forEach(function (b) { b.textContent = ''; var p = document.createElement('p'); p.className = 'loading'; p.textContent = 'The chart could not be loaded just now. The same figures are in the table.'; b.appendChild(p); });
  }

  /* ---------- start ---------- */
  function start() {
    tip = $('#tip');
    lightbox();
    if (typeof XLSX === 'undefined') return failNote();
    fetch(WORKBOOK, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('workbook ' + r.status);
      return r.arrayBuffer();
    }).then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array' });
      var ws = wb.Sheets[SHEET];
      if (!ws) throw new Error('Sheet ' + SHEET + ' not found');
      var data = buildModel(XLSX.utils.sheet_to_json(ws, { defval: null }));
      if (!data.byName['India']) throw new Error('No "India" row in the sheet');
      fillText(data);
      fillKindsTable(data);
      fillSharesTable(data);
      stateTable(data);
      charts(data);
    }).catch(function (err) {
      console.warn('Analyses page: ' + err.message);
      failNote();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

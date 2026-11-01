/* Builds the Opinions list and the reading page from the plain text files.
   To change the writing, edit the .txt files. Nothing in this file needs to change. */
(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var ARROW = '<svg class="arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M3 13L13 3M5 3h8v8"/></svg>';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* A file has a few "key: value" lines, a line with three dashes, then the writing.
     Blank lines separate paragraphs. A line starting with "## " is a subheading. */
  function parse(raw) {
    var text = raw.replace(/\r\n?/g, '\n');
    var cut = text.search(/^---\s*$/m);
    var head = cut === -1 ? '' : text.slice(0, cut);
    var rest = cut === -1 ? text : text.slice(cut).replace(/^---\s*\n?/, '');
    var meta = {};
    head.split('\n').forEach(function (line) {
      var i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    var blocks = rest.split(/\n\s*\n/).map(function (b) { return b.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    return { meta: meta, blocks: blocks };
  }

  /* Writes text into an element. [words](https://address) becomes a link that opens in a new tab. */
  function addText(parent, text) {
    var re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.href = m[2];
      a.textContent = m[1];
      a.target = '_blank';
      a.rel = 'noopener';
      parent.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    return parent;
  }

  function plain(t) { return t.replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, '$1'); }
  function words(blocks) { return plain(blocks.join(' ')).split(/\s+/).filter(Boolean).length; }
  function minutes(blocks) { return Math.max(1, Math.round(words(blocks) / 220)); }

  function prettyDate(s) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s || '');
    if (!m) return s || '';
    var month = MONTHS[parseInt(m[2], 10) - 1] || '';
    return m[3] ? parseInt(m[3], 10) + ' ' + month + ' ' + m[1] : month + ' ' + m[1];
  }
  function sortKey(s) { return /^\d{4}-\d{2}$/.test(s || '') ? s + '-00' : (s || ''); }

  function load(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.text();
    });
  }

  function showNotice(mount, msg) {
    mount.textContent = '';
    mount.appendChild(el('p', 'notice', msg));
  }

  /* ---------- Opinions list ---------- */
  function renderList(mount) {
    load('pieces.txt').then(function (raw) {
      var slugs = raw.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l.charAt(0) !== '#'; });
      return Promise.all(slugs.map(function (slug) {
        return load(slug + '.txt').then(function (t) { var p = parse(t); p.slug = slug; return p; })
          .catch(function () { console.warn('Could not load ' + slug + '.txt'); return null; });
      }));
    }).then(function (pieces) {
      pieces = pieces.filter(Boolean).sort(function (a, b) { return sortKey(b.meta.date) < sortKey(a.meta.date) ? -1 : 1; });
      mount.textContent = '';
      if (!pieces.length) return showNotice(mount, 'No pieces yet.');
      var ul = el('ul', 'rows');
      pieces.forEach(function (p) {
        var li = el('li');
        var a = el('a', 'row');
        a.href = 'piece.html?p=' + encodeURIComponent(p.slug);
        a.appendChild(el('span', 'row-date', prettyDate(p.meta.date)));
        var main = el('span', 'row-main');
        main.appendChild(el('h2', 'row-title', p.meta.title || p.slug));
        if (p.meta.summary) main.appendChild(el('p', 'row-summary', p.meta.summary));
        main.appendChild(el('span', 'row-meta', minutes(p.blocks) + ' min read'));
        a.appendChild(main);
        a.insertAdjacentHTML('beforeend', ARROW);
        li.appendChild(a);
        ul.appendChild(li);
      });
      mount.appendChild(ul);
    }).catch(function () {
      showNotice(mount, 'The pieces could not be loaded. If you opened this file straight from your computer, open the live website instead.');
    });
  }

  /* ---------- Reading page ---------- */
  function renderPiece(mount) {
    var slug = new URLSearchParams(location.search).get('p') || '';
    if (!/^[a-z0-9-]+$/i.test(slug)) return showNotice(mount, 'That piece could not be found. Go back to the list of opinions.');
    load(slug + '.txt').then(function (raw) {
      var p = parse(raw);
      var title = p.meta.title || slug;
      document.title = title + ' | Juhi';
      mount.textContent = '';

      var back = el('a', 'back', '← Opinions');
      back.href = 'opinions.html';
      mount.appendChild(back);
      mount.appendChild(el('p', 'byline', prettyDate(p.meta.date) + '  ·  ' + minutes(p.blocks) + ' min read'));
      mount.appendChild(el('h1', null, title));
      if (p.meta.standfirst) mount.appendChild(addText(el('p', 'standfirst'), p.meta.standfirst));
      mount.appendChild(el('hr', 'rule'));

      var body = el('div', 'body');
      p.blocks.forEach(function (b) {
        if (b.indexOf('## ') === 0) body.appendChild(el('h2', null, b.slice(3)));
        else body.appendChild(addText(el('p'), b));
      });
      mount.appendChild(body);

      var foot = el('div', 'read-foot');
      var all = el('a', null, '← All opinions');
      all.href = 'opinions.html';
      foot.appendChild(all);
      if (/^https?:\/\//i.test(p.meta.link || '')) {
        var orig = el('a', null, 'Read the original ↗');
        orig.href = p.meta.link;
        orig.target = '_blank';
        orig.rel = 'noopener';
        foot.appendChild(orig);
      }
      mount.appendChild(foot);
    }).catch(function () {
      showNotice(mount, 'That piece could not be loaded. Go back to the list of opinions.');
    });
  }

  var mount = document.getElementById('mount');
  if (!mount) return;
  if (document.body.getAttribute('data-view') === 'piece') renderPiece(mount); else renderList(mount);
})();

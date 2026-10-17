/* Text scramble / decode layer for THE_RAGHAV_RAMAN.
 * Letters near the pointer and text moving past during a scroll flicker through random
 * glyphs and settle back, like a terminal decoding its output; headings and labels
 * decode left to right as they enter the viewport.
 *
 * Structure stays intact: each text node is moved, unchanged, into one <sx-t> (a custom
 * element, so no existing span/sibling selector matches it). Only while a letter is
 * scrambling is it split out into an <sx-c> that keeps the real character with a
 * transparent fill and paints the glyph on top; once it settles the run is a single text
 * node again, so kerning, widths, wrapping, textContent, search, copy and screen readers
 * are exactly as before. Reduced motion and the page's motion toggle switch it off.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  // Ancient Egyptian hieroglyphs are the scramble alphabet, picked by shape so each sign fits
  // the letter it covers: measured from Noto Sans Egyptian Hieroglyphs, all sit on the baseline.
  const THIN = Array.from('\u{1303E}\u{13124}\u{13125}\u{131CB}\u{13303}\u{13309}\u{13310}\u{13319}\u{1331C}\u{1331F}\u{13320}\u{13322}\u{13350}\u{13357}\u{13359}\u{1335B}\u{13384}\u{13397}\u{13398}\u{133AB}');
  const TALL = Array.from('\u{1304A}\u{13065}\u{13066}\u{1306F}\u{13108}\u{13109}\u{1310A}\u{13119}\u{13120}\u{131B3}\u{131B4}\u{131B6}\u{131CD}\u{131D5}\u{132F8}\u{132F9}\u{132FD}\u{13302}\u{13304}\u{1330B}\u{1330F}\u{13311}\u{1331A}\u{13323}\u{1334B}\u{1334C}\u{1334D}\u{1334E}\u{1334F}\u{13351}\u{13352}\u{13356}\u{13358}\u{1335E}\u{13361}\u{13373}\u{13374}\u{13375}\u{13383}\u{1339B}\u{1339D}\u{133A8}\u{133BF}\u{133C1}\u{133C7}\u{133C8}\u{133D9}\u{133DA}\u{133E3}\u{133EB}\u{133FE}\u{133FF}\u{13400}\u{13401}\u{13402}\u{1342D}');
  const LOW = Array.from('\u{13076}\u{13077}\u{13089}\u{1308A}\u{13091}\u{13093}\u{131F7}\u{131F8}\u{1328C}\u{13292}\u{13295}\u{13296}\u{13298}\u{13299}\u{13349}\u{13378}\u{13379}\u{1337A}\u{1337B}\u{1337C}\u{1337D}\u{1337E}\u{1338F}\u{133AE}\u{133CF}\u{133E5}\u{133E6}\u{133ED}\u{133EE}\u{133F8}\u{133FD}\u{13403}\u{13406}\u{1341E}');
  const WIDE = Array.from('\u{1303F}\u{13079}\u{1307A}\u{1307B}\u{1307C}\u{1307D}\u{1307E}\u{1308B}\u{1308C}\u{1308E}\u{130EC}\u{130FA}\u{13111}\u{13117}\u{13118}\u{1311E}\u{13121}\u{13127}\u{1312D}\u{13132}\u{13133}\u{13134}\u{13135}\u{13136}\u{13137}\u{1313A}\u{131E0}\u{131EB}\u{13275}\u{1329E}\u{1329F}\u{132A0}\u{132B3}\u{132B4}\u{132F0}\u{132F1}\u{132F7}\u{13307}\u{1330E}\u{1331B}\u{13327}\u{1333B}\u{1333C}\u{13347}\u{13377}\u{1337F}\u{13380}\u{13382}\u{13390}\u{13396}\u{1339F}\u{133A2}\u{133B1}\u{133B2}\u{133D2}\u{133D3}\u{133D4}\u{133DB}\u{133DD}\u{133E0}\u{133F3}\u{13408}\u{13409}\u{13413}\u{13414}\u{13416}\u{1341B}\u{1341D}');

  // Letters and digits scramble; spaces and separators (/ · → &) stay put so text keeps its shape.
  const SCRAMBLES = /^[\p{L}\p{N}]/u;
  // Form fields, code, graphics, live regions and text rewritten on a timer stay untouched.
  const SKIP = 'script, style, noscript, template, textarea, input, select, option, svg, canvas, pre, code, iframe, [contenteditable], .sr-only, [aria-live], [role="status"], [role="alert"], #clock, #role, .project-cursor';
  // Short, display-type text decodes as it scrolls into view and glitches on fast scrolls; the name,
  // the lede and paragraphs stay readable and only react to the pointer.
  const DECODE_ON_ENTER = 'h2, h3, h4, .eyebrow, .mono, .brand, .main-nav a, .button, .header-cta, .text-link, .stack-items, .hero-proof, .project-meta, .flow';
  const RADIUS = 78;

  const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter() : null;
  const graphemes = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
  const pick = set => set[Math.random() * set.length | 0];
  // Narrow letters get staffs and reeds, capitals and ascenders standing signs, x-height
  // letters flat signs, m and w the widest ones.
  const setFor = ch => /^[ijlftrI1]$/.test(ch) ? THIN : /^[mw]$/.test(ch) ? WIDE : /^[bdhk]$/.test(ch) || !/\p{Ll}/u.test(ch) ? TALL : LOW;
  const glyphFor = ch => pick(setFor(ch));
  const canAnimate = () => !reduced.matches && !document.body.classList.contains('is-paused') && !document.hidden;
  const isRawText = node => node.nodeType === 3 && node.nodeValue.trim();
  const isOurs = node => node.nodeType === 1 && (node.localName === 'sx-t' || node.localName === 'sx-c');

  const runs = new WeakMap();    // <sx-t> → {el, g: graphemes, byIndex, chars, dirty}
  const blocks = new Map();      // element owning text → {el, runs, chars, w, h}
  const near = new Set();        // blocks within a screen of the viewport
  const active = new Set();      // chars currently showing a glyph
  const dirty = new Set();       // runs whose active letters changed this frame
  const decodedRoots = new WeakSet();
  let started = false, frame = 0;
  let pointerX = 0, pointerY = 0, lastX = 0, lastY = 0, pointerKnown = false, pointerDown = false;
  let lastScroll = scrollY;

  function register(el) {
    // Clones of a mid-scramble run arrive split up; collapse them back to plain text.
    if (el.children.length) el.replaceChildren(el.textContent);
    const run = {el, g: graphemes(el.textContent), byIndex: [], chars: []};
    run.g.forEach((ch, i) => {
      if (!SCRAMBLES.test(ch)) return;
      const c = {run, i, ch, until: 0, glyph: '', el: null, x: 0, y: 0};
      run.byIndex[i] = c;
      run.chars.push(c);
    });
    runs.set(el, run);
    return run;
  }

  // Move an element's own text nodes (never its children's) into runs and collect its letters.
  function split(el) {
    if (!el.isConnected || el.closest(SKIP)) return null;
    for (const node of Array.from(el.childNodes)) {
      if (isRawText(node)) {
        const wrapper = document.createElement('sx-t');
        node.replaceWith(wrapper);
        wrapper.append(node);
        register(wrapper);
      } else if (node.localName === 'sx-t' && !runs.has(node)) register(node);
    }
    let block = blocks.get(el);
    if (!block) blocks.set(el, block = {el, runs: [], chars: [], w: -1, h: -1, display: !!el.closest(DECODE_ON_ENTER)});
    block.runs = Array.from(el.children).filter(n => n.localName === 'sx-t').map(n => runs.get(n));
    block.chars = block.runs.flatMap(run => run.chars);
    block.w = -1;
    return block;
  }

  function textOwners(root) {
    const owners = new Set();
    if (isRawText(root)) owners.add(root.parentElement);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!parent || !node.nodeValue.trim()) continue;
      owners.add(isOurs(parent) ? parent.closest('sx-t').parentElement : parent);
    }
    owners.delete(null);
    return [...owners].filter(el => !el.closest(SKIP));
  }

  function excite(c, until) {
    if (!active.has(c)) {
      c.glyph = glyphFor(c.ch);
      active.add(c);
      dirty.add(c.run);
    }
    c.until = Math.max(c.until, until);
  }

  function settle(c) {
    active.delete(c);
    c.el = null;
    c.until = 0;
    dirty.add(c.run);
  }

  // Rebuild a run: scrambling letters become <sx-c>, everything else stays one text node.
  function render(run) {
    if (!run.el.isConnected) return;
    const nodes = [];
    let plain = '';
    run.g.forEach((ch, i) => {
      const c = run.byIndex[i];
      if (!c || !active.has(c)) { plain += ch; return; }
      if (plain) { nodes.push(plain); plain = ''; }
      if (!c.el) { c.el = document.createElement('sx-c'); c.el.textContent = ch; }
      c.el.setAttribute('data-g', c.glyph);
      nodes.push(c.el);
    });
    if (plain) nodes.push(plain);
    run.el.replaceChildren(...nodes);
  }

  // Letters resolve left to right across the whole root (heading, label, button…).
  function decode(root) {
    if (!canAnimate()) return;
    const chars = textOwners(root).map(split).filter(Boolean).flatMap(block => block.chars);
    const now = performance.now();
    const step = Math.min(30, 650 / Math.max(chars.length, 1));
    chars.forEach((c, i) => excite(c, now + 80 + i * step + Math.random() * 200));
    kick();
  }

  // Letter centres relative to their block, re-measured only when the block changes size.
  function measure(block, rect) {
    block.w = rect.width;
    block.h = rect.height;
    const range = document.createRange();
    const place = (c, r) => { c.x = r.left + r.width / 2 - rect.left; c.y = r.top + r.height / 2 - rect.top; };
    for (const run of block.runs) {
      let i = 0;
      for (const node of run.el.childNodes) {
        if (node.nodeType !== 3) { if (run.byIndex[i]) place(run.byIndex[i], node.getBoundingClientRect()); i++; continue; }
        for (let offset = 0; offset < node.length; i++) {
          const length = run.g[i].length;
          if (run.byIndex[i]) {
            range.setStart(node, offset);
            range.setEnd(node, offset + length);
            place(run.byIndex[i], range.getBoundingClientRect());
          }
          offset += length;
        }
      }
    }
  }

  // Letters within RADIUS of the pointer flicker; the closer, the more likely and the longer.
  function sweep(now, strength, pending) {
    const r2 = RADIUS * RADIUS;
    for (const block of near) {
      const rect = block.el.getBoundingClientRect();
      if (!rect.width || pointerX < rect.left - RADIUS || pointerX > rect.right + RADIUS || pointerY < rect.top - RADIUS || pointerY > rect.bottom + RADIUS) continue;
      if (Math.abs(rect.width - block.w) > 1 || Math.abs(rect.height - block.h) > 1) measure(block, rect);
      for (const c of block.chars) {
        const dx = rect.left + c.x - pointerX, dy = rect.top + c.y - pointerY, d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const falloff = 1 - Math.sqrt(d2) / RADIUS;
        if (Math.random() < falloff * strength + .1) pending.push([c, now + 70 + falloff * 260 + Math.random() * 140]);
      }
    }
  }

  // Scrolling makes a share of on-screen headings and labels glitch, more the faster the page moves.
  function sparkle(now, rate, pending) {
    for (const block of near) {
      if (!block.display || !block.chars.length) continue;
      const rect = block.el.getBoundingClientRect();
      if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) continue;
      let n = Math.floor(block.chars.length * rate + Math.random());
      while (n-- > 0) pending.push([block.chars[Math.random() * block.chars.length | 0], now + 90 + Math.random() * 240]);
    }
  }

  function tick(now) {
    frame = 0;
    const scrollDelta = scrollY - lastScroll;
    const moved = pointerKnown ? Math.hypot(pointerX - lastX, pointerY - lastY) : 0;
    lastScroll = scrollY; lastX = pointerX; lastY = pointerY;

    // Read layout first, then write, so a frame never forces a synchronous reflow.
    const pending = [];
    if (canAnimate()) {
      if (pointerKnown && !pointerDown && (moved > .5 || scrollDelta)) sweep(now, Math.min(1, .3 + (moved + Math.abs(scrollDelta)) / 18), pending);
      if (Math.abs(scrollDelta) > 6) sparkle(now, Math.min(.05, Math.abs(scrollDelta) / 2200), pending);
    }
    pending.forEach(([c, until]) => excite(c, until));

    const settleAll = !canAnimate();
    for (const c of active) {
      if (settleAll || !c.run.el.isConnected || now >= c.until) settle(c);
      else if (Math.random() < .3) {
        c.glyph = glyphFor(c.ch);
        c.el?.setAttribute('data-g', c.glyph);
      }
    }
    dirty.forEach(render);
    dirty.clear();
    if (active.size) kick();
  }

  function kick() { if (!frame) frame = requestAnimationFrame(tick); }

  let nearObserver, decodeObserver;
  function track(el) {
    nearObserver.observe(el);
    if (el.closest(DECODE_ON_ENTER)) decodeObserver.observe(el);
  }

  function start() {
    if (started || reduced.matches) return;
    started = true;
    nearObserver = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
      const block = blocks.get(target) || (isIntersecting ? split(target) : null);
      if (block) isIntersecting ? near.add(block) : near.delete(block);
    }), {rootMargin: '300px 0px'});
    decodeObserver = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      decodeObserver.unobserve(target);
      const root = target.closest(DECODE_ON_ENTER);
      if (!root || decodedRoots.has(root)) return;
      decodedRoots.add(root);
      decode(root);
    }), {rootMargin: '0px 0px -6% 0px'});
    textOwners(document.body).forEach(track);

    // Text the page rewrites later (dialogs, capability map, menu label) joins in automatically.
    new MutationObserver(records => {
      const owners = new Set();
      for (const record of records) {
        const added = Array.from(record.addedNodes);
        if (record.target.closest?.('sx-t') || (added.length && added.every(isOurs))) continue; // our own rendering
        added.forEach(node => textOwners(node).forEach(el => owners.add(el)));
        if (blocks.has(record.target)) owners.add(record.target);
      }
      owners.forEach(el => {
        if (!blocks.has(el)) return track(el);
        const block = blocks.get(el);
        if (!split(el)) { near.delete(block); blocks.delete(el); }
      });
    }).observe(document.body, {childList: true, subtree: true});

    addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !finePointer.matches) return;
      pointerX = event.clientX; pointerY = event.clientY; pointerDown = event.buttons !== 0;
      if (!pointerKnown) { lastX = pointerX; lastY = pointerY; pointerKnown = true; }
      kick();
    }, {passive: true});
    document.documentElement.addEventListener('pointerleave', () => { pointerKnown = false; });
    addEventListener('blur', () => { pointerKnown = false; });
    addEventListener('scroll', kick, {passive: true});
  }

  // Swap a label to new copy and decode it in place (used by the hero role rotator).
  function swap(el, text) {
    el.textContent = text;
    if (!started || !canAnimate()) return;
    const wrapper = document.createElement('sx-t');
    el.replaceChildren(wrapper);
    wrapper.append(text);
    const {chars} = register(wrapper), now = performance.now();
    const step = Math.min(28, 560 / Math.max(chars.length, 1));
    chars.forEach((c, i) => excite(c, now + 60 + i * step + Math.random() * 180));
    kick();
  }

  window.textScramble = {decode, swap};
  start();
  reduced.addEventListener?.('change', start);

  // The hero role rotator rewrites #role's text; decode each new phrase in place.
  const role = document.getElementById('role');
  if (role) {
    swap(role, role.textContent);
    new MutationObserver(() => {
      if (role.firstChild?.nodeType === 3 && canAnimate()) swap(role, role.textContent);
    }).observe(role, {childList: true});
  }
})();

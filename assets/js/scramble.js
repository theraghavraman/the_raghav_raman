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
  // Ancient Egyptian hieroglyphs are the primary scramble alphabet across the whole site.
  // Use real Unicode code points; the original text remains untouched underneath.
  const HIEROGLYPHS = Array.from(
    '\u{13000}\u{13001}\u{13002}\u{13003}\u{13004}\u{13005}\u{13006}\u{13008}\u{13009}\u{1300A}\u{1300B}\u{1300C}\u{1300D}\u{1300E}\u{1300F}\u{13010}\u{13011}\u{13012}\u{13013}\u{13014}\u{13015}\u{13016}\u{13017}\u{13018}\u{13019}\u{1301A}\u{1301B}\u{1301C}\u{1301D}\u{1301E}\u{1301F}\u{13020}\u{13021}\u{13022}\u{13023}\u{13024}\u{13025}\u{13026}\u{13027}\u{13028}\u{13029}\u{1302A}\u{1302B}\u{1302C}\u{1302D}\u{1302E}\u{1302F}\u{13030}\u{13031}\u{13032}\u{13033}\u{13034}\u{13035}\u{13036}\u{13037}\u{13038}\u{13039}\u{1303A}\u{1303B}\u{1303C}\u{1303D}\u{1303E}\u{1303F}\u{13040}\u{13041}\u{13042}\u{13043}\u{13044}\u{13045}\u{13046}\u{13047}\u{13048}\u{13049}\u{1304A}\u{1304B}\u{1304C}\u{1304D}\u{1304E}\u{1304F}\u{13050}\u{13051}\u{13052}\u{13053}\u{13054}\u{13055}\u{13056}\u{13057}\u{13058}\u{13059}\u{1305A}\u{1305B}\u{1305C}\u{1305D}\u{1305E}\u{1305F}\u{13060}\u{13061}\u{13062}\u{13063}\u{13064}\u{13065}\u{13066}\u{13067}\u{13068}\u{13069}\u{1306A}\u{1306B}\u{1306C}\u{1306D}\u{1306E}\u{1306F}\u{13070}\u{13071}\u{13072}\u{13073}\u{13074}\u{13075}\u{13076}\u{13077}\u{13078}\u{13079}\u{1307A}\u{1307B}\u{1307C}\u{1307D}\u{1307E}\u{1307F}\u{13080}\u{13081}\u{13082}\u{13083}\u{13084}\u{13085}\u{13086}\u{13087}\u{13088}\u{13089}\u{1308A}\u{1308B}\u{1308C}\u{1308D}\u{1308E}\u{1308F}\u{13090}\u{13091}\u{13092}\u{13093}\u{13094}\u{13095}\u{13096}\u{13097}\u{13098}\u{13099}\u{1309A}\u{1309B}\u{1309C}\u{1309D}\u{1309E}\u{1309F}\u{130A0}\u{130A1}\u{130A2}\u{130A3}\u{130A4}\u{130A5}\u{130A6}\u{130A7}\u{130A8}\u{130A9}\u{130AA}\u{130AB}\u{130AC}\u{130AD}\u{130AE}\u{130AF}\u{130B0}\u{130B1}\u{130B2}\u{130B3}\u{130B4}\u{130B5}\u{130B6}\u{130B7}\u{130B8}\u{130B9}\u{130BA}\u{130BB}\u{130BC}\u{130BD}\u{130BE}\u{130BF}\u{130C0}\u{130C1}\u{130C2}\u{130C3}\u{130C4}\u{130C5}\u{130C6}\u{130C7}\u{130C8}\u{130C9}\u{130CA}\u{130CB}\u{130CC}\u{130CD}\u{130CE}\u{130CF}\u{130D0}\u{130D1}\u{130D2}\u{130D3}\u{130D4}\u{130D5}\u{130D6}\u{130D7}\u{130D8}\u{130D9}\u{130DA}\u{130DB}\u{130DC}\u{130DD}\u{130DE}\u{130DF}\u{130E0}\u{130E1}\u{130E2}\u{130E3}\u{130E4}\u{130E5}\u{130E6}\u{130E7}\u{130E8}\u{130E9}\u{130EA}\u{130EB}\u{130EC}\u{130ED}\u{130EE}\u{130EF}\u{130F0}\u{130F1}\u{130F2}\u{130F3}\u{130F4}\u{130F5}\u{130F6}\u{130F7}\u{130F8}\u{130F9}\u{130FA}\u{130FB}\u{130FC}\u{130FD}\u{130FE}\u{130FF}'
  );

  // Letters and digits scramble; spaces and separators (/ · → &) stay put so text keeps its shape.
  const SCRAMBLES = /^[\p{L}\p{N}]/u;
  // Form fields, code, graphics, live regions and text rewritten on a timer stay untouched.
  const SKIP = 'script, style, noscript, template, textarea, input, select, option, svg, canvas, pre, code, iframe, [contenteditable], .sr-only, [aria-live], [role="status"], [role="alert"], #clock, #role, .project-cursor';
  // Short, display-type text decodes as it scrolls into view; paragraphs only react to pointer and scroll.
  const DECODE_ON_ENTER = 'h1, h2, h3, h4, .eyebrow, .mono, .brand, .main-nav a, .button, .header-cta, .text-link, .stack-items, .hero-proof, .project-meta, .flow, .hero-lede, .hero-wip-hello';
  const RADIUS = 78;

  const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter() : null;
  const graphemes = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
  const pick = set => set[Math.random() * set.length | 0];
  const glyphFor = () => pick(HIEROGLYPHS);
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
    if (!block) blocks.set(el, block = {el, runs: [], chars: [], w: -1, h: -1});
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

  // Scrolling makes a share of on-screen letters glitch, more the faster the page moves.
  function sparkle(now, rate, pending) {
    for (const block of near) {
      if (!block.chars.length) continue;
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
      if (Math.abs(scrollDelta) > 1) sparkle(now, Math.min(.05, Math.abs(scrollDelta) / 2200), pending);
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

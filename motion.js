/* motion.js — movimiento de Acierta con GSAP: entrada escalonada, cifras que cuentan, barras que crecen, mapa que se arma,
   indicador del menú y el fondo vivo de la portada (diana + partículas, dibujado por código, sin video).
   Respeta prefers-reduced-motion: sin animación, todo queda en su estado final. Si GSAP no carga, el panel funciona igual. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = id => document.getElementById(id), vis = el => el && el.offsetParent !== null;
  let g = null;
  function cargarGsap() {
    return new Promise(res => {
      if (window.gsap) return res(true);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'; s.integrity = 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt'; s.crossOrigin = 'anonymous'; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s); setTimeout(() => res(!!window.gsap), 4000);
    });
  }
  // cifra que cuenta: anima el primer número del nodo conservando separadores, decimales, prefijo y sufijo
  function contar(el, dur) {
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue)) || (el.firstElementChild && /\d/.test(el.firstElementChild.textContent) && !el.firstElementChild.children.length ? el.firstElementChild.firstChild : null);
    if (!tn) return; const m = tn.nodeValue.match(/^(\D*?)(\d[\d,]*)(\.\d+)?(.*)$/s); if (!m) return;
    const fin = parseFloat((m[2] + (m[3] || '')).replace(/,/g, '')), dec = m[3] ? m[3].length - 1 : 0, o = { v: 0 }, txt = tn.nodeValue;
    if (!isFinite(fin) || !fin) return;
    g.to(o, { v: fin, duration: dur || 1.1, ease: 'power3.out', onUpdate: () => { tn.nodeValue = m[1] + o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[4]; }, onComplete: () => { tn.nodeValue = txt; } });
  }
  const sube = (els, o) => els.length && g.fromTo(els, { opacity: 0, y: 14 }, Object.assign({ opacity: 1, y: 0, duration: .55, ease: 'power3.out', stagger: .05, clearProps: 'transform,opacity', overwrite: true }, o || {}));
  function barras(els) { els.forEach(b => { const w = b.style.width; if (!w || w === '0%') return; g.fromTo(b, { width: 0 }, { width: w, duration: .9, ease: 'power3.out', delay: .15, overwrite: true }); }); }

  let ult = null, chipsDe = '';
  function vista() {
    indicador();
    if (!g || RM.matches) return;
    const h = location.hash, hero0 = $('hero'), ch0 = vis(hero0) ? [...hero0.querySelectorAll('.chip')] : [];
    if (h === ult) {   // re-render de la misma vista (p. ej. llegan las alertas): no se repite la entrada; solo entran los avisos nuevos
      if (ch0.length && chipsDe !== h) { chipsDe = h; g.fromTo(ch0, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .5, stagger: .07, ease: 'power3.out', clearProps: 'transform,opacity' }); ch0.forEach(c => { const n = c.querySelector('b'); if (n) contar(n, 1.3); }); }
      return; }
    ult = h; chipsDe = ch0.length ? h : '';
    const q = s => [...document.querySelectorAll(s)].filter(vis);
    // inicio / explorar
    const tiles = q('#tiles .tile');
    if (tiles.length) { sube(tiles, { stagger: .06 }); tiles.forEach(t => { const n = t.querySelector('.num'); if (n) contar(n, 1.2); const pc = t.style.getPropertyValue('--pc'); if (pc) g.fromTo(t, { '--pc': '0%' }, { '--pc': pc, duration: 1.1, ease: 'power3.out', delay: .2 }); }); }
    const hero = $('hero');
    if (vis(hero)) { g.fromTo(hero, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: .7, ease: 'power3.out', clearProps: 'transform,opacity' }); const b = hero.querySelector('.gauge .c b'); if (b) contar(b, 1.4);
      const ch = [...hero.querySelectorAll('.chip')]; if (ch.length) { g.fromTo(ch, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .5, stagger: .07, delay: .25, ease: 'power3.out', clearProps: 'transform,opacity' }); ch.forEach(c => { const n = c.querySelector('b'); if (n) contar(n, 1.3); }); } }
    if (vis($('rowmapa'))) g.fromTo($('rowmapa'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, delay: .1, ease: 'power3.out', clearProps: 'transform,opacity' });
    if (vis($('tcard'))) { g.fromTo($('tcard'), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: .7, delay: .15, ease: 'power3.out', clearProps: 'transform,opacity' }); filas($('tcard')); }
    sube(q('#lens a'), { stagger: .08 });
    // alertas
    const al = q('#alertas .al'); if (al.length) { g.fromTo(al, { opacity: 0, y: 22, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .55, stagger: { each: .045, grid: 'auto', from: 'start' }, ease: 'back.out(1.4)', clearProps: 'transform,opacity' }); al.forEach(a => { const n = a.querySelector('.n'); if (n) contar(n, 1.2); }); }
    // módulos y legal
    const mh = q('#modp .mod-hero')[0]; if (mh) { g.fromTo(mh, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', clearProps: 'transform,opacity' }); g.fromTo(mh.querySelectorAll('.mod-k,h2,p,.mod-busca,.chips'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .07, delay: .15, ease: 'power3.out', clearProps: 'transform,opacity' }); }
    const mf = q('#modp .mod-f'); if (mf.length) g.fromTo(mf, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .55, stagger: .05, delay: .3, ease: 'power3.out', clearProps: 'transform,opacity' });
    sube(q('#modp .legal, #mod-radar, #cmp > *, #cart > *, #ent > *'), { stagger: .08, delay: .1 });
    // fichas UE / CUI
    fichas();
  }
  function filas(c) { const tr = [...c.querySelectorAll('tr.l')].slice(0, 14); if (tr.length) g.fromTo(tr, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: .4, stagger: .035, delay: .3, ease: 'power2.out', clearProps: 'transform,opacity', overwrite: true }); const rb = c.querySelectorAll('.rb i'); barras([...rb].slice(0, 14)); }
  function fichas() {
    if (!g || RM.matches) return;
    const u = $('uep'), f = $('ficha');
    if (vis(u)) { sube([...u.children], { stagger: .09 }); sube([...u.querySelectorAll('.ri-kpi,.go-btn,.pnl')], { stagger: .05, delay: .15 }); u.querySelectorAll('.ri-kpi .n').forEach(n => contar(n, 1.1)); barras([...u.querySelectorAll('.ri-bar')]); }
    if (vis(f)) { sube([...f.children], { stagger: .09 }); barras([...f.querySelectorAll('.bar-track i')]); }
  }
  // mapa: los departamentos aparecen en cascada desde el centro
  function mapa() {
    if (!g || RM.matches) return; const ps = $('mapa').querySelectorAll('path'); if (!ps.length) return;
    g.fromTo(ps, { opacity: 0, scale: .6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .55, ease: 'back.out(1.6)', stagger: { each: .018, from: 'center' }, clearProps: 'transform,opacity', overwrite: true });
    g.fromTo($('mapa').querySelectorAll('text'), { opacity: 0 }, { opacity: 1, duration: .4, delay: .5, clearProps: 'opacity' });
  }
  // indicador dorado del menú: se desliza hasta la sección activa
  function indicador() {
    const secs = $('secs'); if (!secs) return; let ind = $('nav-ind'); if (!ind) { ind = document.createElement('i'); ind.id = 'nav-ind'; ind.setAttribute('aria-hidden', 'true'); secs.appendChild(ind); secs.classList.add('ind'); }
    const on = secs.querySelector(':scope > a.on'); if (!on) { ind.style.opacity = 0; return; }
    const p = { x: on.offsetLeft + 10, width: Math.max(16, on.offsetWidth - 20), opacity: 1 };
    if (g && !RM.matches && ind.style.opacity === '1') g.to(ind, Object.assign({ duration: .5, ease: 'power3.out', overwrite: true }, p)); else { ind.style.transform = `translateX(${p.x}px)`; ind.style.width = p.width + 'px'; ind.style.opacity = 1; if (g) g.set(ind, { x: p.x }); }
  }
  // portada: diana que respira + partículas con hilos (canvas 2D). ponytail: un solo canvas reutilizado; se pausa si no se ve.
  function fondo() {
    const hero = $('hero'); if (!hero) return; const cv = document.createElement('canvas'); cv.id = 'hero-fx'; cv.setAttribute('aria-hidden', 'true');
    const c = cv.getContext('2d'); let w = 0, h = 0, dpr = 1, P = [], mx = -1, my = -1, t0 = performance.now();
    const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; };
    for (let i = 0; i < 34; i++) P.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .00012, vy: -.00004 - Math.random() * .00012, r: .8 + Math.random() * 2.2, a: .15 + Math.random() * .4, o: Math.random() < .35 });
    function pinta(t) {
      if (!w || cv.clientWidth !== w || cv.clientHeight !== h) fit(); if (!w) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      const s = (t - t0) / 1000, cx = w * .94, cy = h * .95, R = Math.min(w, h) * .62;   // la diana asoma por la esquina inferior derecha, detrás de los avisos
      // diana: tres anillos (crema, azul, celeste) con arcos que giran lento y el centro dorado que late
      [[1, 'rgba(245,242,234,.16)', .05], [.72, 'rgba(53,114,190,.34)', -.08], [.44, 'rgba(143,180,224,.3)', .12]].forEach(([k, col, v], i) => {
        c.lineWidth = Math.max(5, R * .07); c.strokeStyle = col; c.beginPath(); c.arc(cx, cy, R * k * (1 + .012 * Math.sin(s * .8 + i)), 0, 6.2832); c.stroke();
        c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineCap = 'round'; c.beginPath(); const a = s * v * 2 + i * 2; c.arc(cx, cy, R * k, a, a + .9); c.stroke(); });
      const lat = 1 + .1 * Math.sin(s * 1.6), gr = c.createRadialGradient(cx - 4, cy - 5, 1, cx, cy, R * .17 * lat); gr.addColorStop(0, '#F3DC8E'); gr.addColorStop(.6, '#C9A552'); gr.addColorStop(1, 'rgba(143,115,48,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R * .17 * lat, 0, 6.2832); c.fill();
      // onda que sale del centro cada 4 s
      const k = (s % 4) / 4; c.strokeStyle = `rgba(243,220,142,${.35 * (1 - k)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R * (.17 + 1.1 * k), 0, 6.2832); c.stroke();
      // partículas e hilos
      for (const p of P) { p.x += p.vx; p.y += p.vy; if (p.y < -.03) { p.y = 1.03; p.x = Math.random(); } if (p.x < -.03) p.x = 1.03; if (p.x > 1.03) p.x = -.03;
        const px = p.x * w, py = p.y * h; if (mx >= 0) { const d = Math.hypot(px - mx, py - my); if (d < 110) { c.strokeStyle = `rgba(243,220,142,${.3 * (1 - d / 110)})`; c.lineWidth = 1; c.beginPath(); c.moveTo(px, py); c.lineTo(mx, my); c.stroke(); } }
        c.fillStyle = p.o ? `rgba(212,178,94,${p.a})` : `rgba(143,180,224,${p.a})`; c.beginPath(); c.arc(px, py, p.r, 0, 6.2832); c.fill(); }
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const dx = (P[i].x - P[j].x) * w, dy = (P[i].y - P[j].y) * h, d = dx * dx + dy * dy; if (d < 6400) { c.strokeStyle = `rgba(143,180,224,${.14 * (1 - d / 6400)})`; c.lineWidth = 1; c.beginPath(); c.moveTo(P[i].x * w, P[i].y * h); c.lineTo(P[j].x * w, P[j].y * h); c.stroke(); } }
    }
    const pon = () => { if (cv.parentNode !== hero) hero.prepend(cv); };
    pon(); new MutationObserver(pon).observe(hero, { childList: true });
    hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }); hero.addEventListener('pointerleave', () => { mx = -1; });
    if (RM.matches) { P.forEach(p => { p.vx = p.vy = 0; }); const fijo = () => requestAnimationFrame(() => pinta(t0 + 1500)); fijo(); addEventListener('resize', fijo); new MutationObserver(fijo).observe(hero, { attributes: true, attributeFilter: ['hidden'] }); return; }   // sin movimiento: un cuadro fijo
    (function f(t) { if (cv.offsetParent !== null && !document.hidden) pinta(t); requestAnimationFrame(f); })(t0);
  }

  function arranca() {
    fondo(); indicador();
    // engancha el enrutador: después de cada go() se anima la vista que quedó
    if (typeof window.go === 'function' && !window.go.__m) { const _go = window.go; window.go = async function () { const r = await _go.apply(this, arguments); try { vista(); } catch (e) { } return r; }; window.go.__m = 1; }
    const mp = $('mapa'); if (mp) new MutationObserver(() => mapa()).observe(mp, { childList: true });
    // las fichas UE/CUI terminan de pintarse después (datos asíncronos): se animan al llegar su contenido, una vez por vista
    const u = $('uep'); if (u) { let k = ''; new MutationObserver(() => { const w = $('uep-wrap'); if (w && w.children.length && k !== location.hash) { k = location.hash; fichas(); } }).observe(u, { childList: true, subtree: true }); }
    addEventListener('resize', indicador);
    cargarGsap().then(ok => { if (!ok) return; g = window.gsap; document.documentElement.classList.add('gsap'); vista(); mapa(); });
  }
  if (document.readyState === 'complete') arranca(); else addEventListener('load', arranca);
  window.Motion = { vista, contar: el => g && !RM.matches && contar(el) };
})();

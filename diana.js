/* diana.js — identidad DIANA (Sistema inteligente de gestión pública, de ARKA PROYECTOS) y su intro cinemática.
   window.DIANA = { iso, wordmark, lockup, favicon, intro }. Sirve en navegador y en node (solo las funciones de texto).
   Geometría de la flecha: la del preloader de arkaproyectos.com.pe (astil 12 px con punta redondeada, punta con muesca). */
(function (root) {
  const G = {"D": "M7.2 -70V0H27.3V-70ZM33.4 0Q45.3 0 53.8 -4.2Q62.4 -8.5 67 -16.3Q71.7 -24.2 71.7 -35Q71.7 -45.9 67 -53.7Q62.4 -61.5 53.8 -65.8Q45.3 -70 33.4 -70H20.4V-53H32.6Q36.1 -53 39.5 -52.3Q42.8 -51.5 45.5 -49.5Q48.2 -47.6 49.8 -44.1Q51.5 -40.5 51.5 -35Q51.5 -29.5 49.8 -25.9Q48.2 -22.4 45.5 -20.5Q42.8 -18.5 39.5 -17.7Q36.1 -17 32.6 -17H20.4V0Z", "I": "M7.2 -70V0H27V-70Z", "A": "M19.5 -11.3H56.5L56 -25.6H20.1ZM37.8 -41.3 47.1 -20.3 46 -15.3 54 0H76L37.8 -74.7L-0.3 0H21.7L29.8 -16L28.6 -20.3Z", "N": "M54.1 -70V-34.4L7.2 -73.5V0H25.8V-35.6L72.7 3.5V-70Z"};   // Jost 800, caja 100, línea base y=0, altura de caps 70
  const W = {"D": 74.9, "I": 34.2, "A": 75.7, "N": 79.9};
  // la "I" es la flecha de ARKA en vertical: la firma de la marca
  const I_ARROW = (gold, pl) => `<g class="dn-i"><rect x="11" y="-50" width="12" height="46" rx="2" fill="${gold}"/><polygon points="17,-72 33,-44 17,-49 1,-44" fill="${gold}"/><path d="M17 -12 l-9 8 M17 -12 l9 8 M17 -4 l-9 8 M17 -4 l9 8" stroke="${pl}" stroke-width="3.6" stroke-linecap="round" fill="none"/></g>`;
  let uid = 0;
  function wordmark(o) {
    o = o || {}; const ink = o.ink || '#F5F2EA', gold = o.gold || 'url(#dn-gold)', pl = o.plumas || ink, tr = o.tracking == null ? 13 : o.tracking;
    let x = 0, parts = [];
    for (const ch of 'DIANA') {
      const body = ch === 'I' ? I_ARROW(gold, pl) : `<path d="${G[ch]}" fill="${ch === 'A' && o.aGold ? gold : ink}"/>`;
      parts.push(`<g class="dn-l" transform="translate(${x.toFixed(1)},0)">${body}</g>`); x += W[ch] + tr;
    }
    return { svg: parts.join(''), w: x - tr };
  }
  // isotipo: diana + flecha. Gradientes en userSpaceOnUse para que funcionen también sobre líneas.
  const DEFS = `<linearGradient id="dn-gold" gradientUnits="userSpaceOnUse" x1="0" y1="-80" x2="80" y2="10"><stop offset="0" stop-color="#E9CF7A"/><stop offset=".55" stop-color="#C9A552"/><stop offset="1" stop-color="#9E8038"/></linearGradient>
<linearGradient id="dn-shaft" gradientUnits="userSpaceOnUse" x1="-60" y1="190" x2="200" y2="210"><stop offset="0" stop-color="#9E8038"/><stop offset=".6" stop-color="#D4B25E"/><stop offset="1" stop-color="#F0D98A"/></linearGradient>
<radialGradient id="dn-core" cx="42%" cy="38%" r="65%"><stop offset="0" stop-color="#F3DC8E"/><stop offset=".55" stop-color="#C9A552"/><stop offset="1" stop-color="#8F7330"/></radialGradient>
<radialGradient id="dn-shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="dn-wave" gradientUnits="userSpaceOnUse" x1="50" y1="50" x2="350" y2="350"><stop offset="0" stop-color="#F3DC8E"/><stop offset="1" stop-color="#C9A552" stop-opacity=".2"/></linearGradient>
<filter id="dn-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur id="dn-blur-v" stdDeviation="0 0"/></filter>
<filter id="dn-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="dn-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".28"/></filter>`;
  function iso(o) {
    o = o || {}; const ring = o.ring || '#F5F2EA', pl = o.plumas || ring, sombra = o.sombra !== false;
    return `<g class="dn-target"${sombra ? ' filter="url(#dn-soft)"' : ''}>
 <circle class="dn-ring dn-r1" cx="200" cy="200" r="150" fill="none" stroke="${ring}" stroke-width="16" transform="rotate(-90 200 200)"/>
 <circle class="dn-ring dn-r2" cx="200" cy="200" r="108" fill="none" stroke="#3572BE" stroke-width="16" transform="rotate(-90 200 200)"/>
 <circle class="dn-ring dn-r3" cx="200" cy="200" r="66" fill="none" stroke="#8FB4E0" stroke-width="16" transform="rotate(-90 200 200)"/>
 <circle class="dn-hl" cx="200" cy="200" r="150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="150 900" transform="rotate(-150 200 200)" opacity=".35"/>
 <circle class="dn-hl" cx="200" cy="200" r="108" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="100 700" transform="rotate(-150 200 200)" opacity=".3"/>
 <g class="dn-core"><circle cx="200" cy="200" r="31" fill="url(#dn-core)"/><circle cx="200" cy="200" r="31" fill="none" stroke="${ring}" stroke-width="3" opacity=".9"/><circle cx="189" cy="188" r="6" fill="#fff" opacity=".55"/></g>
</g>
<g class="dn-arrow" transform="rotate(-28 200 200)"><g class="dn-fly" filter="url(#dn-blur)">
 <line x1="-46" y1="200" x2="150" y2="200" stroke="#0F2A43" stroke-width="18" stroke-linecap="round" opacity=".85"/>
 <line x1="-46" y1="200" x2="150" y2="200" stroke="url(#dn-shaft)" stroke-width="12" stroke-linecap="round"/>
 <line x1="-40" y1="196" x2="140" y2="196" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>
 <polygon points="140,177.5 200,200 140,222.5 151,200" fill="url(#dn-gold)" stroke="#0F2A43" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M-46 200 l-24 -17 M-46 200 l-24 17 M-30 200 l-24 -17 M-30 200 l-24 17" stroke="${pl}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
 <path d="M-46 200 l-24 -17 M-46 200 l-24 17 M-30 200 l-24 -17 M-30 200 l-24 17" stroke="#C9A552" stroke-width="2" stroke-linecap="round" fill="none" opacity=".6"/>
</g></g>`;
  }
  function isoSVG(o) { o = o || {}; const s = o.size || 40; return `<svg viewBox="-30 -20 460 440" width="${s}" height="${s}" aria-label="DIANA"><defs>${DEFS}</defs>${iso(o)}</svg>`; }
  function lockup(o) {
    o = o || {}; const bg = o.bg, ink = o.ink || '#F5F2EA', mut = o.mut || '#8FB4E0', mod = o.mod || '#C6CCD6', gold = o.goldText || '#D4B25E';
    const wm = wordmark({ ink, plumas: ink });
    const W = 1500, H = 460;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Jost,Inter,system-ui,sans-serif">${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}<defs>${DEFS}</defs>
<g transform="translate(70,30)">${iso({ ring: ink, sombra: !!bg })}</g>
<g transform="translate(560,238) scale(2.3)">${wm.svg}</g>
<text x="562" y="300" font-size="27" font-weight="500" letter-spacing="6" fill="${mut}">SISTEMA INTELIGENTE DE GESTIÓN PÚBLICA</text>
<text x="562" y="340" font-size="18" font-weight="500" letter-spacing="2.4" fill="${mod}">INVERSIONES · CONTRATACIONES · PRESUPUESTO · PLANEAMIENTO · SIAF</text>
<text x="562" y="382" font-size="21" font-weight="600" letter-spacing="3.5" fill="${gold}">CON ARKIA, LA IA DE ARKA PROYECTOS</text></svg>`;
  }
  function favicon() {
    if (typeof document === 'undefined') return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="88" fill="#0F2A43"/><defs>${DEFS}</defs><g transform="translate(200,200) scale(.8) translate(-200,-200)">${iso({ sombra: false })}</g></svg>`;
    let l = document.querySelector('link[rel="icon"]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.type = 'image/svg+xml'; l.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  // ---------- intro cinemática (GSAP desde cdnjs; si no carga, deja el logo estático) ----------
  const CSS = `
.dn-stage{position:relative;width:100%;height:100%;min-height:420px;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#173B60 0%,#0F2A43 50%,#08182A 100%);color:#F5F2EA;font-family:Jost,Inter,system-ui,sans-serif;isolation:isolate}
.dn-stage canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.dn-grid{position:absolute;inset:0;z-index:0;background-image:radial-gradient(circle at center,rgba(143,180,224,.12) 0 1px,transparent 1.5px);background-size:34px 34px;mask-image:radial-gradient(ellipse at 50% 45%,#000 20%,transparent 70%);-webkit-mask-image:radial-gradient(ellipse at 50% 45%,#000 20%,transparent 70%);opacity:0}
.dn-lock{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;gap:5.5vw;padding:24px}
.dn-iso{width:min(56vh,460px);height:auto;overflow:visible;transform-style:preserve-3d}
.dn-word{display:flex;flex-direction:column;gap:12px;min-width:0}
.dn-word svg{width:min(44vw,560px);height:auto;overflow:visible}
.dn-word .t{font-weight:500;font-size:min(2.7vh,22px);letter-spacing:.6em;text-transform:uppercase;color:#8FB4E0;opacity:0;white-space:nowrap}
.dn-word .m{font-weight:500;font-size:min(1.9vh,14.5px);letter-spacing:.16em;text-transform:uppercase;color:rgba(245,242,234,.72);opacity:0;white-space:nowrap}
.dn-word .r{height:1.5px;width:0;background:linear-gradient(90deg,#D4B25E,transparent);margin:2px 0}
.dn-word .a{font-size:min(2.2vh,17px);letter-spacing:.1em;color:#D4B25E;opacity:0;white-space:nowrap}
.dn-word .a i{font-family:Fraunces,Georgia,serif;font-style:italic;color:#F5F2EA}
.dn-cta{position:absolute;left:0;right:0;bottom:6vh;z-index:2;display:flex;justify-content:center;gap:12px;opacity:0}
.dn-btn{border:0;border-radius:12px;padding:13px 26px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;background:#F9A825;color:#1C1917;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .15s}
.dn-btn:hover{transform:translateY(-2px)}
.dn-btn.g{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.3)}
@media (max-width:760px){.dn-lock{flex-direction:column;gap:18px}.dn-word{align-items:center;text-align:center}.dn-word svg{width:min(80vw,420px)}.dn-word .t,.dn-word .m,.dn-word .a{white-space:normal}}`;
  function cargarGsap() {
    return new Promise(res => {
      if (root.gsap) return res(true);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s); setTimeout(() => res(!!root.gsap), 4000);
    });
  }
  function particulas(cv) {   // bokeh lento de fondo
    const c = cv.getContext('2d'); let w, h, P = [];
    const fit = () => { w = cv.width = cv.clientWidth * devicePixelRatio; h = cv.height = cv.clientHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
    for (let i = 0; i < 46; i++) P.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3.5, v: .00008 + Math.random() * .00025, a: .08 + Math.random() * .25, g: Math.random() < .3 });
    let on = true; (function f() { if (!on || !cv.isConnected) { on = false; return; } c.clearRect(0, 0, w, h);
      for (const p of P) { p.y -= p.v; if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); } c.beginPath(); c.arc(p.x * w, p.y * h, p.r * devicePixelRatio, 0, 7); c.fillStyle = p.g ? `rgba(212,178,94,${p.a})` : `rgba(143,180,224,${p.a})`; c.fill(); }
      requestAnimationFrame(f); })();
  }
  async function intro(el, o) {
    o = o || {};
    if (!document.getElementById('dn-css')) { const st = document.createElement('style'); st.id = 'dn-css'; st.textContent = CSS; document.head.appendChild(st); }
    const wm = wordmark({ ink: '#F5F2EA', plumas: '#F5F2EA' });
    el.classList.add('dn-stage');
    el.innerHTML = `<canvas></canvas><div class="dn-grid"></div>
<div class="dn-lock">
 <svg class="dn-iso" viewBox="-40 -30 480 460"><defs>${DEFS}</defs>
  <ellipse class="dn-sh" cx="200" cy="372" rx="150" ry="16" fill="url(#dn-shadow)" opacity="0"/>
  ${iso({ sombra: false })}
  <circle class="dn-flash" cx="200" cy="200" r="34" fill="#FFF3C4" filter="url(#dn-glow)" opacity="0"/>
  <g class="dn-waves">${[0, 1, 2].map(() => `<circle class="dn-wave" cx="200" cy="200" r="150" fill="none" stroke="url(#dn-wave)" stroke-width="3" opacity="0"/>`).join('')}</g>
  <g class="dn-sparks"></g>
 </svg>
 <div class="dn-word">
  <svg viewBox="-4 -80 ${wm.w + 8} 92"><defs>${DEFS}<clipPath id="dn-clip">${wm.svg.replace(/class="dn-l"/g, '')}</clipPath></defs>${wm.svg}<rect class="dn-sheen" x="-200" y="-90" width="120" height="110" fill="url(#dn-sheen-g)" clip-path="url(#dn-clip)" transform="skewX(-20)"/><defs><linearGradient id="dn-sheen-g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>
  <div class="t">Sistema inteligente de gestión pública</div>
  <div class="r"></div>
  <div class="m">Inversiones · Contrataciones · Presupuesto · Planeamiento · SIAF</div>
  <div class="a">con <i>Arkia</i>, la IA de ARKA PROYECTOS</div>
 </div>
</div>
${o.botones ? `<div class="dn-cta">${o.botones}</div>` : ''}`;
    particulas(el.querySelector('canvas'));
    const ok = await cargarGsap();
    const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
    const isoEl = $('.dn-iso'), rings = $$('.dn-ring'), letters = $$('.dn-l');
    if (!ok) { $$('.dn-word .t,.dn-word .m,.dn-word .a').forEach(x => x.style.opacity = 1); $('.dn-word .r').style.width = '100%'; if ($('.dn-cta')) $('.dn-cta').style.opacity = 1; o.onDone && o.onDone(); return; }
    const g = root.gsap;
    rings.forEach(r => { const L = 2 * Math.PI * r.r.baseVal.value; r.style.strokeDasharray = L; r.style.strokeDashoffset = L; });
    g.set($$('.dn-hl,.dn-core'), { opacity: 0 }); g.set($('.dn-fly'), { x: -760, scaleX: 2.2, transformOrigin: '200px 200px' }); g.set(letters, { y: 46, opacity: 0, filter: 'blur(8px)' });
    g.set(isoEl, { transformPerspective: 900, rotateX: 62, rotateY: -10, scale: .72, transformOrigin: '50% 60%' });
    const blur = $('#dn-blur-v');
    const tl = g.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => o.onDone && o.onDone() });
    tl.to($('.dn-grid'), { opacity: 1, duration: 1.2 }, 0)
      .to(rings, { strokeDashoffset: 0, duration: 1.1, stagger: .14, ease: 'power2.inOut' }, .1)
      .to(isoEl, { rotateX: 0, rotateY: 0, scale: 1, duration: 1.5, ease: 'expo.out' }, .15)
      .to($('.dn-sh'), { opacity: 1, duration: 1 }, .6)
      .to($$('.dn-hl,.dn-core'), { opacity: 1, duration: .5, stagger: .06 }, .9)
      .fromTo($('.dn-core'), { scale: 0, transformOrigin: '200px 200px' }, { scale: 1, duration: .6, ease: 'back.out(2.2)' }, .9)
      // vuelo de la flecha: desenfoque de movimiento que se apaga al clavar
      .set(blur, { attr: { stdDeviation: '16 0' } }, 1.25)
      .to($('.dn-fly'), { x: 0, scaleX: 1, duration: .55, ease: 'power4.in' }, 1.25)
      .to(blur, { attr: { stdDeviation: '0 0' }, duration: .25 }, 1.7)
      // impacto
      .fromTo($('.dn-flash'), { opacity: 1, scale: .4, transformOrigin: '200px 200px' }, { opacity: 0, scale: 2.6, duration: .6, ease: 'power2.out' }, 1.8)
      .fromTo($$('.dn-wave'), { opacity: .9, scale: .18, transformOrigin: '200px 200px' }, { opacity: 0, scale: 1.35, duration: 1.2, stagger: .16, ease: 'power2.out' }, 1.8)
      .fromTo($('.dn-target'), { scale: 1 }, { scale: 1.05, duration: .13, yoyo: true, repeat: 1, transformOrigin: '50% 50%', ease: 'power1.inOut' }, 1.8)
      .to(isoEl, { x: '+=5', duration: .04, yoyo: true, repeat: 7 }, 1.8)
      .to(isoEl, { x: 0, duration: .1 }, 2.12)
      // letras: desenfoque -> nitidez, luego brillo metálico
      .to(letters, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .7, stagger: .09, ease: 'expo.out' }, 1.95)
      .fromTo($('.dn-sheen'), { x: -220 }, { x: wm.w + 260, duration: 1.1, ease: 'power2.inOut' }, 2.7)
      .to($('.dn-word .t'), { opacity: 1, letterSpacing: '.32em', duration: 1.1, ease: 'power3.out' }, 2.6)
      .to($('.dn-word .r'), { width: '100%', duration: .9, ease: 'power3.out' }, 2.9)
      .to($('.dn-word .m'), { opacity: 1, duration: .8 }, 3.1)
      .to($('.dn-word .a'), { opacity: 1, duration: .8 }, 3.4);
    if ($('.dn-cta')) tl.to($('.dn-cta'), { opacity: 1, duration: .8 }, 3.7);
    // chispas doradas del impacto
    const sp = $('.dn-sparks'); const NS = 'http://www.w3.org/2000/svg';
    tl.call(() => { for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, d = 60 + Math.random() * 130, l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', 200); l.setAttribute('y1', 200); l.setAttribute('x2', 200); l.setAttribute('y2', 200); l.setAttribute('stroke', i % 3 ? '#F3DC8E' : '#fff'); l.setAttribute('stroke-width', 1.5 + Math.random() * 2); l.setAttribute('stroke-linecap', 'round'); sp.appendChild(l);
        g.to(l, { attr: { x1: 200 + Math.cos(a) * d * .55, y1: 200 + Math.sin(a) * d * .55, x2: 200 + Math.cos(a) * d, y2: 200 + Math.sin(a) * d }, opacity: 0, duration: .5 + Math.random() * .5, ease: 'power3.out', onComplete: () => l.remove() }); } }, null, 1.8);
    return tl;
  }
  root.DIANA = { iso, isoSVG, wordmark, lockup, favicon, intro, DEFS };
})(typeof window !== 'undefined' ? window : globalThis);

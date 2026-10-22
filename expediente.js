/* expediente.js — Expediente PPT editable por unidad ejecutora (o de una sola inversión). v2 (22/10/2026)
   Corre en el navegador con PptxGenJS (cargado bajo demanda) y en Node para pruebas.
   construir(px, D) -> Promise<n>: agrega las láminas al objeto PptxGenJS `px`. D = datos ya resueltos (ver index.html: datosExpediente).
   Diseño: mismo estándar que el PPT de Flujo de Caja (Cambria títulos / Calibri texto, portada y cierre oscuros, contenido claro,
   cifras grandes, íconos en círculos, gráficos nativos editables, texto nunca menor de 12 pt). */
(function (root) {
  const W = 13.33, H = 7.5, FH = 'Cambria', FB = 'Calibri';
  const NAVY = '0F2A43', NAVY2 = '163A5C', ORO = 'C9A227', ORO2 = 'E9C46A', AZUL = '1E5AA8', VERDE = '0F6E4F', ROJO = 'B42A2A', AMBAR = 'C77700';
  const TINTA = '1F2A37', MUT = '6B7A8B', HIELO = 'EEF3F9', BORDE = 'DCE4EE', FONDO = 'F6F8FB', CLARO = 'C9D6E5';
  const REG = 'Información en registro';
  const f0 = n => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const f1 = n => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  const fM = n => 'S/ ' + Number((n || 0) / 1e6).toLocaleString('es-PE', { maximumFractionDigits: Math.abs(n) >= 1e9 ? 0 : 1 }) + ' M';
  const fS = n => n == null ? REG : 'S/ ' + f0(n);
  const pct = (a, b) => b ? 100 * a / b : 0;
  const sem = v => v >= 70 ? VERDE : v >= 40 ? AMBAR : ROJO;
  const fecha = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || REG); };
  const corto = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s\S*$/, '') + '…' : s; };
  const MIN = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'al', 'con', 'para', 'por', 'o', 'u']);
  // nombres del MEF vienen en MAYÚSCULAS; en una lámina se leen mejor en Tipo Título (siglas de ≤3 letras y códigos se conservan)
  const titulo = s => String(s || '').toLowerCase().replace(/(^|[\s(\/-])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase()).split(' ')
    .map((w, i) => i && MIN.has(w.toLowerCase()) ? w.toLowerCase() : w).join(' ').replace(/\b(Jr|Av|Aa|Hh|Ca|Pv|Cp|Ug|Ie|Ii|Ee|Ptar|Ubs|Ex|Et|Uei|Opmi|Oarr|Ioarr|Gl|Gr|Gn|I{1,3}|Iv|Vi{0,3}|Ix|Xi{0,3})\b\.?/g, m => m.toUpperCase());
  const fis = v => v == null || v < 0 ? null : +v;
  const sombra = () => ({ type: 'outer', blur: 6, offset: 2, angle: 90, color: NAVY, opacity: 0.12 });

  // ───────────── íconos de trazo e imágenes de fondo (se rasterizan a PNG: en el navegador con canvas, en Node con sharp) ─────────────
  const ICO = { coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>', alert: '<path d="M12 3L2.5 20h19L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.5"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h6M9.5 17h6"/>', bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    pin: '<path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2.1h-5c0-.9-.4-1.6-1-2.1A6 6 0 0 1 12 3z"/>' };
  const svgIco = n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICO[n]}</svg>`;
  const svgFondo = (c1, c2) => `<svg xmlns="http://www.w3.org/2000/svg" width="1333" height="750"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${c1}"/><stop offset="1" stop-color="#${c2}"/></linearGradient><radialGradient id="r" cx="0.82" cy="0.25" r="0.5"><stop offset="0" stop-color="#C9A227" stop-opacity="0.22"/><stop offset="1" stop-color="#C9A227" stop-opacity="0"/></radialGradient></defs><rect width="1333" height="750" fill="url(#g)"/><rect width="1333" height="750" fill="url(#r)"/></svg>`;
  async function png(svg, w, h) {
    if (typeof document !== 'undefined') return new Promise((ok, no) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); ok(c.toDataURL('image/png').replace(/^data:/, '')); }; im.onerror = () => no(new Error('svg')); im.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); });
    const sharp = require('sharp'); return 'image/png;base64,' + (await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer()).toString('base64');
  }
  let IMG = null;
  async function imagenes() {
    if (IMG) return IMG; const o = {};
    await Promise.all([...Object.keys(ICO).map(async n => { o[n] = await png(svgIco(n), 256, 256); }), (async () => { o.f1 = await png(svgFondo(NAVY, NAVY2), 1333, 750); o.f2 = await png(svgFondo(NAVY2, NAVY), 1333, 750); })()]);
    return IMG = o;
  }

  // ───────────── piezas ─────────────
  const T = (s, t, o) => s.addText(t, Object.assign({ fontFace: FB, margin: 0, isTextBox: true }, o));
  const circulo = (s, x, y, d, color, ico) => { s.addShape('ellipse', { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } }); s.addImage({ data: IMG[ico], x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 }); };
  const tarjeta = (s, x, y, w, h, fill) => s.addShape('roundRect', { x, y, w, h, fill: { color: fill || 'FFFFFF' }, line: { color: BORDE, width: 0.75 }, rectRadius: 0.12, shadow: sombra() });
  const pastilla = (s, x, y, w, h, color, texto) => { s.addShape('roundRect', { x, y, w, h, fill: { color }, line: { color, width: 0 }, rectRadius: 0.5 }); T(s, texto, { x, y, w, h, fontSize: 12, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', charSpacing: 1.5 }); };
  function marco(px, D, tit, sub, n, total) {
    const s = px.addSlide(); s.background = { color: FONDO };
    T(s, tit, { x: 0.6, y: 0.38, w: 10.2, h: 0.7, fontFace: FH, fontSize: 34, bold: true, color: NAVY });
    if (sub) T(s, sub, { x: 0.6, y: 1.08, w: 10.6, h: 0.4, fontSize: 15, color: MUT });
    T(s, D.marca.toUpperCase(), { x: W - 2.6, y: 0.45, w: 2.0, h: 0.4, fontSize: 14, bold: true, color: NAVY, align: 'right', charSpacing: 6 });
    T(s, `${titulo(D.ue.nombre)}  ·  datos abiertos del MEF al ${D.corte}${D.anio ? '  ·  año ' + D.anio : ''}`, { x: 0.6, y: H - 0.5, w: W - 2.2, h: 0.3, fontSize: 11, color: MUT });
    if (n) T(s, `${n} / ${total}`, { x: W - 1.6, y: H - 0.5, w: 1.0, h: 0.3, fontSize: 11, color: MUT, align: 'right' });
    return s;
  }
  function kpi(s, x, y, w, h, ico, color, etiqueta, valor, sub) {
    tarjeta(s, x, y, w, h); circulo(s, x + 0.22, y + 0.22, 0.5, color, ico);
    T(s, etiqueta, { x: x + 0.85, y: y + 0.22, w: w - 1.0, h: 0.5, fontSize: 14, color: MUT, valign: 'middle' });
    T(s, valor, { x: x + 0.22, y: y + 0.8, w: w - 0.4, h: 0.6, fontFace: FH, fontSize: 26, bold: true, color: TINTA, fit: 'shrink' });
    if (sub) T(s, sub, { x: x + 0.22, y: y + 1.4, w: w - 0.4, h: 0.3, fontSize: 12.5, color: MUT });
  }
  function dona(s, x, y, w, h, av, etiqueta, color) {
    const c = color || sem(av); s.addChart('doughnut', [{ name: 'Avance', labels: ['Ejecutado', 'Pendiente'], values: [Math.round(av * 10) / 10, Math.max(0, 100 - Math.round(av * 10) / 10)] }],
      { x, y, w, h, holeSize: 72, showLegend: false, showTitle: false, showValue: false, showPercent: false, chartColors: [c, 'E1E6EC'], dataBorder: { pt: 0, color: 'FFFFFF' } });
    T(s, f1(av) + ' %', { x: x + w * 0.15, y: y + h * 0.34, w: w * 0.7, h: h * 0.22, fontFace: FH, fontSize: Math.min(44, Math.round(w * 15)), bold: true, color: TINTA, align: 'center', valign: 'middle', fit: 'shrink' });
    T(s, etiqueta, { x: x + w * 0.15, y: y + h * 0.56, w: w * 0.7, h: 0.3, fontSize: 12, color: MUT, align: 'center' });
  }
  function tabla(s, x, y, w, filas, cols, opts) {
    const head = cols.map(c => ({ text: c.t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontSize: 12, align: c.a || 'left', valign: 'middle', fontFace: FB } }));
    const body = filas.map((r, i) => r.map((v, j) => { const o = typeof v === 'object' && v && v.text != null; return { text: o ? v.text : String(v ?? ''), options: Object.assign({ fontSize: 12, color: TINTA, fontFace: FB, align: cols[j].a || 'left', valign: 'middle', fill: { color: i % 2 ? HIELO : 'FFFFFF' } }, o ? v.options : {}) }; }));
    s.addTable([head, ...body], Object.assign({ x, y, w, colW: cols.map(c => c.w), border: { type: 'solid', pt: 0.5, color: BORDE }, rowH: 0.42, margin: 0.06, autoPage: false }, opts || {}));
  }

  // ───────────── láminas ─────────────
  function portada(px, D) {
    const s = px.addSlide(); s.addImage({ data: IMG.f1, x: 0, y: 0, w: W, h: H });
    const t = D.ue, av = pct(t.dev, t.pim), esCUI = D.tipo === 'cui';
    T(s, D.marca.toUpperCase(), { x: 0.8, y: 0.6, w: 4, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', charSpacing: 10 });
    T(s, (esCUI ? 'FICHA DE INVERSIÓN' : 'EXPEDIENTE DE INVERSIONES') + '  ·  ' + D.anio, { x: 0.8, y: 1.75, w: 8, h: 0.4, fontSize: 14, bold: true, color: ORO2, charSpacing: 3 });
    T(s, titulo(t.nombre), { x: 0.8, y: 2.2, w: 8.0, h: 1.9, fontFace: FH, fontSize: t.nombre.length > 45 ? 38 : 46, bold: true, color: 'FFFFFF', valign: 'top', fit: 'shrink' });
    T(s, [t.nivel, titulo(t.dpto), t.cod ? 'Unidad ejecutora ' + t.cod : ''].filter(Boolean).join('  ·  '), { x: 0.8, y: 4.2, w: 8, h: 0.45, fontSize: 16, color: CLARO });
    if (t.pim) {
      [['PIM ' + D.anio, fM(t.pim)], ['Devengado', fM(t.dev)], [esCUI ? 'Avance físico' : 'Inversiones', esCUI ? (fis(D.cuis[0].avance_fisico) != null ? f1(D.cuis[0].avance_fisico) + ' %' : REG) : f0(t.n_cui)]].forEach(([k, v], i) => {
        T(s, k, { x: 0.8 + i * 2.75, y: 5.1, w: 2.6, h: 0.35, fontSize: 14, color: CLARO }); T(s, v, { x: 0.8 + i * 2.75, y: 5.45, w: 2.6, h: 0.7, fontFace: FH, fontSize: 30, bold: true, color: 'FFFFFF', fit: 'shrink' }); });
      // tarjeta derecha: avance de ejecución del año
      s.addShape('roundRect', { x: 9.15, y: 1.75, w: 3.4, h: 3.55, fill: { color: 'FFFFFF', transparency: 90 }, line: { color: 'FFFFFF', transparency: 70, width: 0.75 }, rectRadius: 0.15 });
      T(s, 'Avance de ejecución ' + D.anio, { x: 9.35, y: 1.95, w: 3.0, h: 0.4, fontSize: 14, color: CLARO });
      T(s, f1(av) + ' %', { x: 9.35, y: 2.35, w: 3.0, h: 1.3, fontFace: FH, fontSize: 64, bold: true, color: 'FFFFFF', fit: 'shrink' });
      T(s, 'devengado sobre el PIM', { x: 9.35, y: 3.6, w: 3.0, h: 0.35, fontSize: 13, color: CLARO });
      pastilla(s, 9.35, 4.3, 3.0, 0.6, sem(av), av >= 70 ? 'RITMO ADECUADO' : av >= 40 ? 'RITMO MODERADO' : 'RITMO LENTO');
    }
    T(s, `Elaborado con ${D.marca}${D.autor ? ' · ' + D.autor : ''} a partir de datos abiertos del MEF (Consulta Amigable y Banco de Inversiones) al ${D.corte}. Herramienta de análisis referencial; no sustituye la información oficial de la entidad.`, { x: 0.8, y: 6.55, w: 11.8, h: 0.6, fontSize: 12, color: '8FA3B8' });
  }
  function resumen(px, D, n, total) {
    const t = D.ue, av = pct(t.dev, t.pim);
    const s = marco(px, D, `¿Cómo va la ejecución ${D.anio}?`, `${f0(t.n_cui)} inversiones con presupuesto  ·  ${t.nivel}${t.dpto ? '  ·  ' + titulo(t.dpto) : ''}`, n, total);
    tarjeta(s, 0.6, 1.7, 3.6, 4.6); dona(s, 0.75, 1.85, 3.3, 2.9, av, 'del PIM devengado');
    T(s, [{ text: fM(t.pim - t.dev), options: { fontFace: FH, fontSize: 26, bold: true, color: TINTA, breakLine: true } }, { text: 'saldo por ejecutar en el año', options: { fontSize: 13, color: MUT } }], { x: 0.8, y: 4.85, w: 3.2, h: 1.3, align: 'center', valign: 'middle' });
    const K = [['coins', AZUL, 'PIM ' + D.anio, t.pim, 'presupuesto vigente del año'], ['doc', AZUL, 'Certificado', t.cert, f1(pct(t.cert, t.pim)) + ' % del PIM'], ['link', AZUL, 'Comprometido', t.comp, f1(pct(t.comp, t.pim)) + ' % del PIM'],
      ['check', VERDE, 'Devengado', t.dev, 'avance ' + f1(av) + ' %'], ['bank', VERDE, 'Girado', t.gir, f1(pct(t.gir, t.dev)) + ' % del devengado'], ['clock', ORO, 'Saldo por ejecutar', t.pim - t.dev, f1(100 - av) + ' % del PIM']];
    K.forEach(([ico, c, k, v, sub], i) => kpi(s, 4.45 + (i % 3) * 2.8, 1.7 + Math.floor(i / 3) * 1.95, 2.6, 1.8, ico, c, k, fM(v), sub));
    const A = D.alertas || {}; const B = [['alert', ROJO, 'Grandes rezagadas', (A.rezago || []).length, 'PIM ≥ S/ 5 M y avance < 20 %'], ['clock', AMBAR, 'F12-B desactualizado', (A.f12b || []).length, 'PIM ≥ S/ 5 M sin registro en 90 días'], ['flag', VERDE, 'Obras por cerrar', (A.por_cerrar || []).length, 'avance físico ≥ 90 %: liquidar y cerrar']];
    B.forEach(([ico, c, k, v, sub], i) => { const x = 4.45 + i * 2.8; tarjeta(s, x, 5.6, 2.6, 0.95); circulo(s, x + 0.18, 5.82, 0.5, c, ico); T(s, String(v), { x: x + 0.78, y: 5.65, w: 0.7, h: 0.85, fontFace: FH, fontSize: 28, bold: true, color: c, valign: 'middle' }); T(s, [{ text: k, options: { bold: true, color: TINTA, fontSize: 12.5, breakLine: true } }, { text: sub, options: { color: MUT, fontSize: 10.5 } }], { x: x + 1.45, y: 5.65, w: 1.15, h: 0.85, valign: 'middle' }); });
  }
  function fuentes(px, D, n, total) {
    if (!D.fuentes.length && !D.funciones.length) return n;
    const s = marco(px, D, '¿De dónde sale y a qué va el dinero?', `PIM y devengado ${D.anio} por fuente de financiamiento y por función  ·  millones de soles`, n, total);
    const graf = (x, titulo_, arr) => {
      const a = arr.slice(0, 5), lab = a.map(v => corto(titulo(v.nombre).replace(/canon y sobrecanon.*participaciones/i, 'Canon, regalías y participaciones'), 34));
      T(s, titulo_, { x, y: 1.7, w: 6.0, h: 0.4, fontSize: 15, bold: true, color: NAVY });
      s.addChart('bar', [{ name: 'PIM', labels: lab, values: a.map(v => +(v.pim / 1e6).toFixed(1)) }, { name: 'Devengado', labels: lab, values: a.map(v => +(v.dev / 1e6).toFixed(1)) }],
        { x, y: 2.1, w: 6.0, h: 4.3, barDir: 'bar', barGrouping: 'clustered', barGapWidthPct: 60, chartColors: [NAVY, VERDE], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontFace: FB, dataLabelFontSize: 11, dataLabelColor: TINTA, dataLabelFormatCode: '#,##0.0',
          catAxisLabelFontFace: FB, catAxisLabelFontSize: 12, catAxisLabelColor: TINTA, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, catAxisOrientation: 'maxMin', showLegend: true, legendPos: 'b', legendFontFace: FB, legendFontSize: 12, legendColor: MUT });
      // avance por fila, a la derecha del título
      T(s, a.map(v => `${corto(titulo(v.nombre), 32)}: ${f1(pct(v.dev, v.pim))} %`).join('   ·   '), { x, y: 6.45, w: 6.0, h: 0.4, fontSize: 11, color: MUT, fit: 'shrink' });
    };
    if (D.fuentes.length) graf(0.6, 'Fuentes de financiamiento', D.fuentes); else T(s, REG, { x: 0.6, y: 2.1, w: 6, h: 0.4, fontSize: 13, color: MUT });
    if (D.funciones.length) graf(6.95, 'Funciones (en qué se gasta)', D.funciones); else T(s, REG, { x: 6.95, y: 2.1, w: 6, h: 0.4, fontSize: 13, color: MUT });
    return n + 1;
  }
  function cartera(px, D, n0, total) {
    const rows = D.cuis, por = 10, pag = Math.max(1, Math.ceil(rows.length / por)); let n = n0;
    const cols = [{ t: 'CUI', w: 1.0 }, { t: 'Inversión', w: 6.3 }, { t: 'PIM', w: 1.3, a: 'right' }, { t: 'Devengado', w: 1.3, a: 'right' }, { t: 'Avance', w: 0.95, a: 'right' }, { t: 'Situación', w: 1.28 }];
    for (let p = 0; p < pag; p++) {
      const s = marco(px, D, `Cartera de inversiones ${D.anio}`, `${f0(rows.length)} inversiones con presupuesto  ·  ordenadas por PIM  ·  página ${p + 1} de ${pag}`, n++, total);
      const filas = rows.slice(p * por, (p + 1) * por).map(c => { const a = pct(c.dev, c.pim); return [c.cui, corto(titulo(c.nombre), 72), fM(c.pim), fM(c.dev), { text: f1(a) + ' %', options: { bold: true, color: sem(a) } }, corto(titulo(c.situacion || ''), 14)]; });
      tabla(s, 0.6, 1.7, 12.13, filas, cols);
    }
    return n;
  }
  function alertas(px, D, n, total) {
    const A = D.alertas || {}; const sets = [['alert', ROJO, 'Inversiones grandes rezagadas', 'rezago', 'PIM ≥ S/ 5 M con avance financiero menor al 20 %'], ['clock', AMBAR, 'F12-B desactualizado', 'f12b', 'PIM ≥ S/ 5 M sin registro de seguimiento en 90 días'], ['flag', VERDE, 'Obras por cerrar', 'por_cerrar', 'avance físico ≥ 90 %: corresponde liquidar y cerrar']];
    if (!sets.some(s => (A[s[3]] || []).length)) return n;
    const s = marco(px, D, 'Alertas tempranas', 'lo que conviene revisar primero  ·  criterios automáticos sobre datos abiertos del MEF', n, total);
    sets.forEach(([ico, c, t, k, sub], i) => {
      const x = 0.6 + i * 4.1, r = (A[k] || []); tarjeta(s, x, 1.7, 3.9, 4.95); circulo(s, x + 0.25, 1.95, 0.6, c, ico);
      T(s, String(r.length), { x: x + 1.0, y: 1.85, w: 1.2, h: 0.8, fontFace: FH, fontSize: 44, bold: true, color: c, valign: 'middle' });
      T(s, [{ text: t, options: { bold: true, color: TINTA, fontSize: 14, breakLine: true } }, { text: sub, options: { color: MUT, fontSize: 11.5 } }], { x: x + 2.1, y: 1.85, w: 1.65, h: 0.8, valign: 'middle' });
      s.addShape('line', { x: x + 0.25, y: 2.85, w: 3.4, h: 0, line: { color: BORDE, width: 0.75 } });
      if (!r.length) { T(s, 'Sin casos.', { x: x + 0.25, y: 3.0, w: 3.4, h: 0.4, fontSize: 13, color: MUT }); return; }
      r.slice(0, 4).forEach((v, j) => { const yy = 3.0 + j * 0.9; T(s, [{ text: 'CUI ' + v.cui + '  ·  ' + fM(v.pim) + (k === 'f12b' && v.ult_f12b ? '  ·  F12-B ' + fecha(v.ult_f12b) : k === 'por_cerrar' && fis(v.avance_fisico) != null ? '  ·  físico ' + f1(v.avance_fisico) + ' %' : '  ·  avance ' + f1(pct(v.dev, v.pim)) + ' %'), options: { bold: true, color: c, fontSize: 12, breakLine: true } }, { text: corto(titulo(v.nombre), 95), options: { color: TINTA, fontSize: 12 } }], { x: x + 0.25, y: yy, w: 3.4, h: 0.85, valign: 'top' }); });
      if (r.length > 4) T(s, `y ${f0(r.length - 4)} más en la cartera`, { x: x + 0.25, y: 6.25, w: 3.4, h: 0.3, fontSize: 12, color: MUT });
    });
    return n + 1;
  }
  function fichaCUI(px, D, c, f, n, total) {
    f = f || {}; const av = pct(c.dev, c.pim), avF = fis(f.av_fis != null ? f.av_fis : c.avance_fisico), costo = f.costo || c.costo, devAc = f.dev_acum != null ? f.dev_acum : c.dev_acum_ant;
    const pref = /IOARR/i.test(f.tipo || c.tipo || '') ? 'IOARR' : /PROGRAMA/i.test(f.tipo || c.tipo || '') ? 'Programa de inversión' : 'Proyecto de inversión';
    const est = (f.situacion || c.situacion || '').toUpperCase(); const estC = /CULMIN|CERRAD/.test(est) ? VERDE : /SUSPEND|PARALIZ/.test(est) ? ROJO : /EJECUCI/.test(est) ? '1B7F3B' : AZUL;
    const s = px.addSlide(); s.background = { color: FONDO };
    T(s, `${pref.toUpperCase()}  ·  CUI ${c.cui}` + (f.f12b || c.ult_f12b ? `  ·  último F12-B ${fecha(f.f12b || c.ult_f12b)}` : ''), { x: 0.6, y: 0.4, w: 9.5, h: 0.35, fontSize: 13, bold: true, color: ORO, charSpacing: 2 });
    T(s, corto(titulo(f.nombre || c.nombre), 200), { x: 0.6, y: 0.75, w: 10.0, h: 1.05, fontFace: FH, fontSize: 20, bold: true, color: NAVY, valign: 'top', fit: 'shrink' });
    T(s, D.marca.toUpperCase(), { x: W - 2.6, y: 0.45, w: 2.0, h: 0.4, fontSize: 14, bold: true, color: NAVY, align: 'right', charSpacing: 6 });
    pastilla(s, W - 2.9, 0.95, 2.3, 0.45, estC, corto(est || 'EN REGISTRO', 18));
    T(s, [f.modalidad && titulo(f.modalidad.split(',')[0]), f.uei && titulo(f.uei), f.paralizada === 'SI' ? 'PARALIZADA' : ''].filter(Boolean).join('  ·  '), { x: 0.6, y: 1.8, w: 12.1, h: 0.35, fontSize: 12.5, color: MUT, fit: 'shrink' });
    const K = [['coins', AZUL, 'Costo actualizado', fS(costo), 'Banco de Inversiones'], ['check', VERDE, 'Devengado acumulado', fS(devAc), f.av_ejec != null ? f1(f.av_ejec) + ' % del costo' : (costo && devAc != null ? f1(pct(devAc, costo)) + ' % del costo' : '')], ['doc', AZUL, 'PIM ' + D.anio, fS(c.pim), 'devengado ' + fS(c.dev) + ' (' + f1(av) + ' %)'], ['clock', ORO, 'Saldo del año', fS(c.pim - c.dev), f1(100 - av) + ' % del PIM por ejecutar']];
    K.forEach(([ico, col, k, v, sub], i) => kpi(s, 0.6 + i * 3.08, 2.3, 2.9, 1.75, ico, col, k, v, sub));
    // situación actual
    tarjeta(s, 0.6, 4.2, 6.4, 2.75); circulo(s, 0.8, 4.4, 0.45, VERDE, 'list'); T(s, 'Situación actual (Formato 12-B)' + (f.f12b ? '  ·  ' + fecha(f.f12b) : ''), { x: 1.4, y: 4.4, w: 5.4, h: 0.45, fontSize: 14, bold: true, color: NAVY, valign: 'middle' });
    const situ = (f.situ_act || '').replace(/\s+/g, ' ').trim(); const acc = (f.acciones || c.acc || '').replace(/\s+/g, ' ').trim();
    T(s, situ ? [{ text: corto(situ, 330), options: { color: TINTA, breakLine: !!acc } }, ...(acc ? [{ text: 'Acciones previstas: ', options: { bold: true, color: NAVY } }, { text: corto(acc, 200), options: { color: TINTA } }] : [])] : REG, { x: 0.8, y: 4.95, w: 6.0, h: 1.9, fontSize: 12.5, color: situ ? TINTA : MUT, valign: 'top', paraSpaceAfter: 6 });
    // avance físico + datos generales
    tarjeta(s, 7.2, 4.2, 5.53, 2.75);
    if (avF != null) dona(s, 7.3, 4.35, 2.2, 2.2, avF, 'avance físico', sem(avF)); else { circulo(s, 7.55, 4.55, 0.6, MUT, 'pin'); T(s, [{ text: 'Avance físico', options: { bold: true, color: TINTA, fontSize: 13, breakLine: true } }, { text: 'sin registro en el F12-B', options: { color: MUT, fontSize: 12 } }], { x: 7.3, y: 5.3, w: 2.2, h: 0.9, align: 'center' }); }
    const dg = [['Inicio de ejecución', fecha(f.inicio || c.ini_fisica)], ['Fin previsto', fecha(f.fin || c.fin_fisica)], ['Expediente técnico', f.et_fecha ? fecha(f.et_fecha) + (f.et_monto ? '  ·  ' + fM(f.et_monto) : '') : REG], ['Beneficiarios', f.beneficiarios || c.beneficiarios ? f0(f.beneficiarios || c.beneficiarios) : REG], ['Ubicación', [c.dist, c.prov, c.dpto].filter(Boolean).map(titulo).join(' / ') || REG]];
    dg.forEach(([k, v], i) => T(s, [{ text: k, options: { color: MUT, fontSize: 11.5, breakLine: true } }, { text: String(v), options: { bold: v !== REG, color: v === REG ? MUT : TINTA, fontSize: 12.5 } }], { x: 9.65, y: 4.35 + i * 0.52, w: 3.0, h: 0.5, valign: 'middle', fit: 'shrink' }));
    // componentes (barra inferior)
    const comps = (f.comp || []).slice(0, 3).map(cp => { const tot = cp.a.reduce((s2, a) => s2 + (+a.c || 0), 0); return corto(titulo(cp.n.replace(/^\d+[\.\)\-]?\s*/, '')), 48) + (tot ? '  ·  ' + fM(tot) : ''); });
    if (comps.length) T(s, [{ text: 'Componentes:  ', options: { bold: true, color: NAVY } }, { text: comps.join('    |    '), options: { color: TINTA } }], { x: 0.6, y: 7.0, w: 12.13, h: 0.3, fontSize: 11, fit: 'shrink' });
    T(s, `${n} / ${total}`, { x: W - 1.6, y: H - 0.5, w: 1.0, h: 0.3, fontSize: 11, color: MUT, align: 'right' });
  }
  function cierre(px, D, n, total) {
    const t = D.ue, av = pct(t.dev, t.pim), A = D.alertas || {}, mes = new Date().getMonth() + 1, meses = Math.max(1, 12 - mes);
    const s = px.addSlide(); s.addImage({ data: IMG.f2, x: 0, y: 0, w: W, h: H });
    T(s, 'Decisiones sugeridas', { x: 0.8, y: 0.5, w: 9, h: 0.75, fontFace: FH, fontSize: 36, bold: true, color: 'FFFFFF' });
    T(s, `para los ${meses} meses que quedan del ${D.anio}  ·  ${titulo(t.nombre)}`, { x: 0.8, y: 1.25, w: 11.5, h: 0.4, fontSize: 15, color: CLARO });
    const S = [];
    if (av < 40) S.push(['alert', ROJO, 'Acelerar el devengado', `Con ${f1(av)} % de avance, quedan ${fM(t.pim - t.dev)} por ejecutar. Se sugiere priorizar las inversiones con certificación y contrato vigentes para evitar reversión de saldos.`]);
    if ((A.rezago || []).length) S.push(['flag', AMBAR, 'Destrabar las grandes rezagadas', `${f0(A.rezago.length)} inversiones de más de S/ 5 M tienen avance menor al 20 %. Se recomienda revisar en comité la causa (expediente, contratación, terreno) y fijar hitos quincenales.`]);
    if ((A.f12b || []).length) S.push(['clock', AZUL, 'Actualizar el seguimiento (F12-B)', `${f0(A.f12b.length)} inversiones grandes llevan más de 90 días sin registro. El registro mensual es obligación de la UEI y sustenta la programación del gasto.`]);
    if ((A.por_cerrar || []).length) S.push(['check', VERDE, 'Cerrar lo que ya está terminado', `${f0(A.por_cerrar.length)} obras superan el 90 % de avance físico. Se sugiere programar recepción, liquidación y el Formato 09 de cierre para liberar saldos.`]);
    if (pct(t.comp, t.pim) < 60 && S.length < 4) S.push(['link', ORO, 'Asegurar los compromisos', `Solo ${f1(pct(t.comp, t.pim))} % del PIM está comprometido. Se recomienda revisar el plan anual de contrataciones y los procesos pendientes de adjudicar.`]);
    if (!S.length) S.push(['check', VERDE, 'Mantener el ritmo', 'Los indicadores no muestran alertas automáticas. Se sugiere sostener el registro mensual del F12-B y la programación de la cartera.']);
    S.slice(0, 4).forEach(([ico, c, k, txt], i) => { const x = 0.8 + i * 2.98, w = 2.78; s.addShape('roundRect', { x, y: 1.95, w, h: 3.6, fill: { color: 'FFFFFF', transparency: 90 }, line: { color: 'FFFFFF', transparency: 70, width: 0.75 }, rectRadius: 0.15 }); circulo(s, x + 0.25, 2.2, 0.6, c, ico); T(s, k, { x: x + 0.25, y: 2.95, w: w - 0.5, h: 0.7, fontFace: FH, fontSize: 17, bold: true, color: 'FFFFFF', valign: 'top', fit: 'shrink' }); T(s, txt, { x: x + 0.25, y: 3.65, w: w - 0.5, h: 1.8, fontSize: 12.5, color: CLARO, valign: 'top', fit: 'shrink' }); });
    s.addShape('roundRect', { x: 0.8, y: 5.8, w: 11.73, h: 0.85, fill: { color: 'E9C46A', transparency: 85 }, line: { color: 'E9C46A', width: 0.75 }, rectRadius: 0.1 });
    T(s, [{ text: 'Aviso: ', options: { bold: true } }, { text: `estas sugerencias fueron elaboradas con inteligencia artificial a partir de datos abiertos del MEF al ${D.corte}. No constituyen información oficial ni reemplazan el análisis de la entidad; recomendamos su revisión por los responsables antes de tomar decisiones.` }], { x: 1.0, y: 5.85, w: 11.33, h: 0.75, fontSize: 12, color: 'FFFFFF', valign: 'middle' });
    T(s, `Fuentes: MEF – Consulta Amigable (Transparencia Económica) y Banco de Inversiones (Invierte.pe), consultados al ${D.corte}  ·  ${D.marca}${D.autor ? ' · ' + D.autor : ''}`, { x: 0.8, y: 6.85, w: 11.73, h: 0.35, fontSize: 11, color: '8FA3B8' });
    T(s, `${n} / ${total}`, { x: W - 1.6, y: H - 0.5, w: 1.0, h: 0.3, fontSize: 11, color: '8FA3B8', align: 'right' });
  }

  async function construir(px, D) {
    await imagenes();
    px.defineLayout({ name: 'W', width: W, height: H }); px.layout = 'W';
    px.author = D.autor || D.marca; px.title = (D.tipo === 'cui' ? 'Ficha ' : 'Expediente ') + titulo(D.ue.nombre);
    if (D.tipo === 'cui') { const c = D.cuis[0]; portada(px, D); fichaCUI(px, D, c, D.fichas[c.cui], 2, 2); return 2; }
    const fichas = D.cuis.filter(c => D.fichas[c.cui]).slice(0, D.maxFichas || 30);
    const nCart = Math.max(1, Math.ceil(D.cuis.length / 10)), hayFF = !!(D.fuentes.length || D.funciones.length), hayAl = D.alertas && ['rezago', 'f12b', 'por_cerrar'].some(k => (D.alertas[k] || []).length);
    const total = 3 + (hayFF ? 1 : 0) + nCart + (hayAl ? 1 : 0) + fichas.length;
    portada(px, D); resumen(px, D, 2, total); let n = fuentes(px, D, 3, total); n = cartera(px, D, n, total); n = alertas(px, D, n, total);
    fichas.forEach(c => fichaCUI(px, D, c, D.fichas[c.cui], n++, total));
    cierre(px, D, n, total);
    return total;
  }
  const api = { construir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Expediente = api;
})(typeof window !== 'undefined' ? window : globalThis);

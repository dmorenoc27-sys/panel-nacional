/* expediente.js — Expediente PPT editable por unidad ejecutora (o de una sola inversión).
   Corre en el navegador con PptxGenJS (cargado bajo demanda) y en Node para pruebas.
   construir(px, D) -> agrega las láminas al objeto PptxGenJS `px`. D = datos ya resueltos (ver index.html: datosExpediente). */
(function (root) {
  const NAVY = '0F2A43', BLUE = '1E88E5', GOLD = 'F9A825', GREEN = '2E7D32', RED = 'D32F2F', AMBER = 'EF8F00', GRAY = '8A94A6', INK = '1C1917', INK2 = '44546A', BG = 'F0F2F5', LINE = 'D5DBE3', SOFT = 'F5F7FA';
  const REG = 'Información en registro';
  const f0 = n => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const f1 = n => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  const fM = n => 'S/ ' + Number((n || 0) / 1e6).toLocaleString('es-PE', { maximumFractionDigits: Math.abs(n) >= 1e9 ? 0 : 1 }) + ' M';
  const fS = n => n == null ? REG : 'S/ ' + f0(n);
  const pct = (a, b) => b ? 100 * a / b : 0;
  const semaforo = v => v >= 70 ? GREEN : v >= 40 ? AMBER : RED;
  const fecha = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || REG); };
  const corto = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s\S*$/, '') + '…' : s; };
  const sh = () => ({ type: 'outer', color: '9AA5B1', blur: 6, offset: 1.5, angle: 90, opacity: 0.25 });

  function marco(px, D, titulo, sub, n, total) {
    const sl = px.addSlide(); sl.background = { color: BG };
    sl.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.62, fill: { color: NAVY } });
    sl.addText(titulo, { x: 0.35, y: 0.08, w: 9.2, h: 0.46, fontSize: 17, bold: true, color: 'FFFFFF', fontFace: 'Arial', valign: 'middle' });
    if (sub) sl.addText(sub, { x: 9.3, y: 0.08, w: 3.7, h: 0.46, fontSize: 9.5, color: 'C9D6E6', fontFace: 'Arial', align: 'right', valign: 'middle' });
    sl.addText(`${D.marca} · ${D.ue.nombre} · datos MEF al ${D.corte}${D.anio ? ' · año ' + D.anio : ''}`, { x: 0.35, y: 7.12, w: 10.5, h: 0.28, fontSize: 8, color: GRAY, fontFace: 'Arial' });
    if (n) sl.addText(`${n} / ${total}`, { x: 11.9, y: 7.12, w: 1.1, h: 0.28, fontSize: 8, color: GRAY, fontFace: 'Arial', align: 'right' });
    return sl;
  }
  function tarjeta(sl, x, y, w, h, color) {
    sl.addShape('roundRect', { x, y, w, h, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 0.5 }, shadow: sh() });
    if (color) sl.addShape('rect', { x, y: y + 0.08, w: 0.07, h: h - 0.16, fill: { color } });
  }
  function kpi(sl, x, y, w, h, etiqueta, valor, sub, color, barra) {
    tarjeta(sl, x, y, w, h, color);
    sl.addText(etiqueta.toUpperCase(), { x: x + 0.2, y: y + 0.1, w: w - 0.3, h: 0.22, fontSize: 7.5, bold: true, color: GRAY, fontFace: 'Arial', charSpacing: 1 });
    sl.addText(valor, { x: x + 0.2, y: y + 0.32, w: w - 0.3, h: 0.42, fontSize: 18, bold: true, color: INK, fontFace: 'Arial', valign: 'middle' });
    if (sub) sl.addText(sub, { x: x + 0.2, y: y + 0.74, w: w - 0.3, h: 0.22, fontSize: 8, color: INK2, fontFace: 'Arial' });
    if (barra != null) {
      sl.addShape('roundRect', { x: x + 0.2, y: y + h - 0.2, w: w - 0.4, h: 0.08, rectRadius: 0.04, fill: { color: 'E6EAF0' } });
      if (barra > 0) sl.addShape('roundRect', { x: x + 0.2, y: y + h - 0.2, w: Math.max(0.08, (w - 0.4) * Math.min(100, barra) / 100), h: 0.08, rectRadius: 0.04, fill: { color: color || BLUE } });
    }
  }
  function dona(sl, x, y, w, h, av, etiqueta) {
    sl.addChart('doughnut', [{ name: 'Avance', labels: ['Ejecutado', 'Pendiente'], values: [Math.round(av), Math.max(0, 100 - Math.round(av))] }],
      { x, y, w, h, holeSize: 66, showLegend: false, showTitle: false, showValue: false, showPercent: false, chartColors: [semaforo(av), 'E1E6EC'] });
    sl.addText(f1(av) + '%', { x: x + w * 0.18, y: y + h * 0.36, w: w * 0.64, h: h * 0.22, fontSize: w > 2 ? 18 : 12, bold: true, color: INK, align: 'center', fontFace: 'Arial' });
    sl.addText(etiqueta, { x: x + w * 0.18, y: y + h * 0.57, w: w * 0.64, h: 0.18, fontSize: 6.5, bold: true, color: GRAY, align: 'center', fontFace: 'Arial' });
  }
  function tabla(sl, x, y, w, filas, cols, opts) {
    // cols: [{t:'PIM', w:1.2, a:'right'}]; filas: arrays de texto o {text,options}
    const head = cols.map(c => ({ text: c.t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontSize: 8, align: c.a || 'left', valign: 'middle', fontFace: 'Arial' } }));
    const body = filas.map((r, i) => r.map((v, j) => typeof v === 'object' && v.text != null ? { text: v.text, options: Object.assign({ fontSize: 8, color: INK, fontFace: 'Arial', align: cols[j].a || 'left', valign: 'middle', fill: { color: i % 2 ? SOFT : 'FFFFFF' } }, v.options) }
      : { text: String(v ?? ''), options: { fontSize: 8, color: INK, fontFace: 'Arial', align: cols[j].a || 'left', valign: 'middle', fill: { color: i % 2 ? SOFT : 'FFFFFF' } } }));
    sl.addTable([head, ...body], Object.assign({ x, y, w, colW: cols.map(c => c.w), border: { type: 'solid', pt: 0.5, color: LINE }, rowH: 0.27, margin: 0.04, autoPage: false }, opts || {}));
  }

  // ───────────── láminas ─────────────
  function portada(px, D) {
    const sl = px.addSlide(); sl.background = { color: NAVY };
    sl.addShape('rect', { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: GOLD } });
    sl.addText(D.marca.toUpperCase(), { x: 0.9, y: 0.7, w: 8, h: 0.35, fontSize: 11, bold: true, color: 'C9D6E6', fontFace: 'Arial', charSpacing: 3 });
    sl.addText(D.tipo === 'cui' ? 'FICHA DE INVERSIÓN' : 'EXPEDIENTE DE INVERSIONES', { x: 0.9, y: 1.7, w: 11.5, h: 0.5, fontSize: 16, bold: true, color: GOLD, fontFace: 'Arial', charSpacing: 2 });
    sl.addText(D.ue.nombre, { x: 0.9, y: 2.25, w: 11.8, h: 1.7, fontSize: D.ue.nombre.length > 60 ? 26 : 34, bold: true, color: 'FFFFFF', fontFace: 'Arial', valign: 'top' });
    sl.addText([D.ue.nivel, D.ue.dpto, D.ue.cod ? 'UE ' + D.ue.cod : ''].filter(Boolean).join('  ·  '), { x: 0.9, y: 4.1, w: 11.5, h: 0.4, fontSize: 14, color: 'C9D6E6', fontFace: 'Arial' });
    const t = D.ue; if (t.pim) {
      const items = [['PIM ' + D.anio, fM(t.pim)], ['Devengado', fM(t.dev)], ['Avance', f1(pct(t.dev, t.pim)) + ' %'], ['Inversiones', f0(t.n_cui)]];
      items.forEach(([k, v], i) => { sl.addText(v, { x: 0.9 + i * 2.6, y: 5.0, w: 2.4, h: 0.5, fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Arial' }); sl.addText(k.toUpperCase(), { x: 0.9 + i * 2.6, y: 5.5, w: 2.4, h: 0.25, fontSize: 8, color: '9FB3CC', fontFace: 'Arial', charSpacing: 1 }); });
    }
    sl.addText(`Datos abiertos del MEF (Consulta Amigable y Banco de Inversiones) al ${D.corte}. Elaborado con ${D.marca}${D.autor ? ' · ' + D.autor : ''}.`, { x: 0.9, y: 6.7, w: 11.5, h: 0.35, fontSize: 9, color: '9FB3CC', fontFace: 'Arial' });
  }
  function resumen(px, D, n, total) {
    const t = D.ue, av = pct(t.dev, t.pim);
    const sl = marco(px, D, 'Resumen ejecutivo', `${D.ue.nivel} · ${D.ue.dpto || ''}`, n, total);
    tarjeta(sl, 0.35, 0.85, 2.3, 2.15, semaforo(av)); dona(sl, 0.45, 0.95, 2.1, 1.7, av, 'AVANCE ' + D.anio);
    sl.addText(`${f0(t.n_cui)} inversiones · ${t.n_ue ? f0(t.n_ue) + ' UE' : 'UE ' + (t.cod || '')}`, { x: 0.4, y: 2.65, w: 2.2, h: 0.3, fontSize: 8, color: INK2, align: 'center', fontFace: 'Arial' });
    const K = [['PIM', t.pim, 'presupuesto del año', BLUE, 100], ['Certificado', t.cert, f1(pct(t.cert, t.pim)) + '% del PIM', BLUE, pct(t.cert, t.pim)], ['Comprometido', t.comp, f1(pct(t.comp, t.pim)) + '% del PIM', BLUE, pct(t.comp, t.pim)],
      ['Devengado', t.dev, 'avance ' + f1(av) + '%', GREEN, av], ['Girado', t.gir, f1(pct(t.gir, t.dev)) + '% del devengado', '00897B', pct(t.gir, t.pim)], ['Saldo por ejecutar', t.pim - t.dev, f1(100 - av) + '% del PIM', GOLD, 100 - av]];
    K.forEach(([k, v, s, c, b], i) => kpi(sl, 2.85 + (i % 3) * 3.42, 0.85 + Math.floor(i / 3) * 1.1, 3.27, 1.02, k, fM(v), s, c, b));
    // fuentes y funciones
    const filas = (arr, n) => arr.slice(0, n).map(x => [corto(x.nombre, 42), fM(x.pim), fM(x.dev), { text: f1(pct(x.dev, x.pim)) + '%', options: { color: semaforo(pct(x.dev, x.pim)), bold: true } }]);
    const cols = [{ t: 'Nombre', w: 2.65 }, { t: 'PIM', w: 1.05, a: 'right' }, { t: 'Devengado', w: 1.05, a: 'right' }, { t: 'Avance', w: 0.75, a: 'right' }];
    sl.addText('¿DE DÓNDE SALE EL DINERO?  ·  fuentes de financiamiento', { x: 0.35, y: 3.2, w: 6, h: 0.25, fontSize: 9, bold: true, color: NAVY, fontFace: 'Arial', charSpacing: 1 });
    if (D.fuentes.length) tabla(sl, 0.35, 3.48, 5.5, filas(D.fuentes, 6), cols); else sl.addText(REG, { x: 0.35, y: 3.5, w: 5.5, h: 0.3, fontSize: 9, color: GRAY });
    sl.addText('¿A QUÉ VA?  ·  funciones', { x: 6.2, y: 3.2, w: 6, h: 0.25, fontSize: 9, bold: true, color: NAVY, fontFace: 'Arial', charSpacing: 1 });
    if (D.funciones.length) tabla(sl, 6.2, 3.48, 5.5, filas(D.funciones, 6), cols); else sl.addText(REG, { x: 6.2, y: 3.5, w: 5.5, h: 0.3, fontSize: 9, color: GRAY });
    // alertas
    const A = D.alertas || {}; const boxes = [['Inversiones grandes rezagadas', (A.rezago || []).length, 'PIM ≥ S/ 5 M y avance < 20 %', RED], ['F12-B desactualizado', (A.f12b || []).length, 'PIM ≥ S/ 5 M sin registro en 90 días', AMBER], ['Obras por cerrar', (A.por_cerrar || []).length, 'avance físico ≥ 90 %: liquidar y cerrar', GREEN]];
    boxes.forEach(([k, v, s, c], i) => { const x = 0.35 + i * 4.3; tarjeta(sl, x, 5.6, 4.05, 1.3, c); sl.addText(String(v), { x: x + 0.25, y: 5.7, w: 1.1, h: 0.9, fontSize: 30, bold: true, color: c, fontFace: 'Arial', valign: 'middle' }); sl.addText([{ text: k, options: { bold: true, color: INK, breakLine: true } }, { text: s, options: { color: INK2, fontSize: 8 } }], { x: x + 1.3, y: 5.75, w: 2.65, h: 0.95, fontSize: 10, fontFace: 'Arial', valign: 'middle' }); });
  }
  function cartera(px, D, n0, total) {
    const rows = D.cuis, por = 14, paginas = Math.max(1, Math.ceil(rows.length / por)); let n = n0;
    const cols = [{ t: 'CUI', w: 0.8 }, { t: 'Inversión', w: 6.35 }, { t: 'PIM', w: 1.05, a: 'right' }, { t: 'Devengado', w: 1.05, a: 'right' }, { t: 'Avance', w: 0.8, a: 'right' }, { t: 'Físico', w: 0.7, a: 'right' }, { t: 'Situación', w: 1.85 }];
    for (let p = 0; p < paginas; p++) {
      const sl = marco(px, D, `Cartera de inversiones ${D.anio}`, `${f0(rows.length)} inversiones con presupuesto · ordenadas por PIM · pág. ${p + 1}/${paginas}`, n++, total);
      const filas = rows.slice(p * por, (p + 1) * por).map(c => { const a = pct(c.dev, c.pim); return [c.cui, corto(c.nombre, 95), fM(c.pim), fM(c.dev), { text: f1(a) + '%', options: { bold: true, color: semaforo(a) } }, c.avance_fisico != null && c.avance_fisico >= 0 ? f1(c.avance_fisico) + '%' : '—', corto(c.situacion || '', 26)]; });
      tabla(sl, 0.35, 0.85, 12.6, filas, cols, { rowH: 0.4 });
    }
    return n;
  }
  function alertas(px, D, n, total) {
    const A = D.alertas || {}; const sets = [['Inversiones grandes rezagadas', 'rezago', RED], ['F12-B desactualizado', 'f12b', AMBER], ['Obras por cerrar', 'por_cerrar', GREEN]];
    if (!sets.some(s => (A[s[1]] || []).length)) return n;
    const sl = marco(px, D, 'Alertas tempranas', 'lo que requiere decisión esta semana', n, total);
    sets.forEach(([t, k, c], i) => {
      const y = 0.85 + i * 2.1, r = (A[k] || []).slice(0, 5);
      tarjeta(sl, 0.35, y, 12.6, 1.95, c);
      sl.addText(`${t}  ·  ${f0((A[k] || []).length)}`, { x: 0.55, y: y + 0.08, w: 8, h: 0.3, fontSize: 11, bold: true, color: c, fontFace: 'Arial' });
      if (r.length) tabla(sl, 0.55, y + 0.42, 12.2, r.map(x => [x.cui, corto(x.nombre, 110), fM(x.pim), { text: f1(pct(x.dev, x.pim)) + '%', options: { bold: true, color: semaforo(pct(x.dev, x.pim)) } }, x.avance_fisico != null && x.avance_fisico >= 0 ? f1(x.avance_fisico) + '%' : '—', x.ult_f12b ? fecha(x.ult_f12b) : '—']),
        [{ t: 'CUI', w: 0.8 }, { t: 'Inversión', w: 7.4 }, { t: 'PIM', w: 1.1, a: 'right' }, { t: 'Avance', w: 0.9, a: 'right' }, { t: 'Físico', w: 0.9, a: 'right' }, { t: 'Últ. F12-B', w: 1.1 }], { rowH: 0.24 });
      else sl.addText('Sin casos.', { x: 0.55, y: y + 0.5, w: 5, h: 0.3, fontSize: 9, color: GRAY });
    });
    return n + 1;
  }
  function fichaCUI(px, D, c, f, n, total) {
    f = f || {}; const av = pct(c.dev, c.pim), avF = f.av_fis != null ? f.av_fis : (c.avance_fisico != null && c.avance_fisico >= 0 ? c.avance_fisico : null);
    const pref = /IOARR/i.test(f.tipo || c.tipo || '') ? 'IOARR' : /PROGRAMA/i.test(f.tipo || c.tipo || '') ? 'PROGRAMA' : 'PROYECTO';
    const est = (f.situacion || c.situacion || '').toUpperCase(); const estC = /CULMIN|CERRAD/.test(est) ? GREEN : /SUSPEND|PARALIZ/.test(est) ? RED : /EJECUCI/.test(est) ? '1B7F3B' : BLUE;
    const sl = marco(px, D, `${pref} · CUI ${c.cui}`, D.ue.nombre, n, total);
    // hero
    tarjeta(sl, 0.35, 0.85, 12.6, 1.55, NAVY);
    sl.addText(corto(f.nombre || c.nombre, 260), { x: 0.6, y: 0.95, w: 8.6, h: 1.0, fontSize: (f.nombre || c.nombre || '').length > 160 ? 9.5 : 11.5, bold: true, color: NAVY, fontFace: 'Arial', valign: 'top' });
    sl.addText([f.modalidad, f.uei].filter(Boolean).join('  ·  ') || (c.tipo || ''), { x: 0.6, y: 1.95, w: 8.6, h: 0.35, fontSize: 8, color: INK2, fontFace: 'Arial' });
    sl.addShape('roundRect', { x: 9.4, y: 1.0, w: 2.0, h: 0.36, rectRadius: 0.06, fill: { color: estC } });
    sl.addText(est || 'EN REGISTRO', { x: 9.4, y: 1.0, w: 2.0, h: 0.36, fontSize: est.length > 16 ? 7.5 : 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Arial' });
    sl.addText('AVANCE FÍSICO', { x: 9.4, y: 1.45, w: 2.0, h: 0.2, fontSize: 7.5, bold: true, color: GRAY, fontFace: 'Arial', charSpacing: 1 });
    sl.addText(avF != null ? f1(avF) + ' %' : REG, { x: 9.4, y: 1.65, w: 2.0, h: 0.5, fontSize: avF != null ? 24 : 9, bold: true, color: avF != null ? semaforo(avF) : GRAY, fontFace: 'Arial' });
    dona(sl, 11.55, 0.9, 1.35, 1.45, av, 'DEL PIM ' + D.anio);
    // KPI
    const K = [['Costo actualizado', fS(f.costo || c.costo), 'Banco de Inversiones', BLUE], ['Devengado acumulado', fS(f.dev_acum), f.av_ejec != null ? f1(f.av_ejec) + ' % del costo' : '', GREEN], ['PIM ' + D.anio, fS(c.pim), 'devengado ' + fS(c.dev), BLUE], ['Saldo del año', fS(c.pim - c.dev), f1(100 - av) + ' % del PIM por ejecutar', GOLD]];
    K.forEach(([k, v, s, col], i) => kpi(sl, 0.35 + i * 3.19, 2.55, 3.04, 1.05, k, v, s, col));
    // situación + datos generales
    tarjeta(sl, 0.35, 3.75, 7.4, 2.05, GREEN);
    sl.addText('SITUACIÓN ACTUAL (F12-B)' + (f.f12b ? '  ·  ' + fecha(f.f12b) : ''), { x: 0.55, y: 3.82, w: 7, h: 0.25, fontSize: 8.5, bold: true, color: NAVY, fontFace: 'Arial', charSpacing: 1 });
    const situ = corto((f.situ_act || '').replace(/\s+/g, ' ').trim(), 620) || REG;
    sl.addText(situ, { x: 0.55, y: 4.1, w: 7.0, h: 1.62, fontSize: situ.length > 420 ? 8 : 9.5, color: situ === REG ? GRAY : INK, fontFace: 'Arial', valign: 'top', align: 'justify', lineSpacingMultiple: 1.08 });
    sl.addShape('roundRect', { x: 7.95, y: 3.75, w: 5.0, h: 2.05, rectRadius: 0.08, fill: { color: 'EDF3FC' }, line: { color: 'C7D8F0', width: 0.5 } });
    sl.addText('DATOS GENERALES', { x: 8.15, y: 3.82, w: 4.6, h: 0.25, fontSize: 8.5, bold: true, color: NAVY, fontFace: 'Arial', charSpacing: 1 });
    const dg = [['Inicio de ejecución', fecha(f.inicio || c.ini_fisica)], ['Fin de ejecución', fecha(f.fin || c.fin_fisica)], ['Último F12-B', f.f12b ? fecha(f.f12b) : (c.ult_f12b ? fecha(c.ult_f12b) : REG)], ['OPMI', corto(f.opmi || REG, 60)], ['Ubicación', [c.dist, c.prov, c.dpto].filter(Boolean).join(' / ') || REG]];
    dg.forEach(([k, v], i) => sl.addText([{ text: k + ':  ', options: { bold: true, color: NAVY } }, { text: String(v), options: { color: v === REG ? GRAY : INK } }], { x: 8.15, y: 4.12 + i * 0.32, w: 4.7, h: 0.3, fontSize: 8.5, fontFace: 'Arial' }));
    // componentes / metas
    tarjeta(sl, 0.35, 5.95, 12.6, 1.1, GOLD);
    const fmt = { '08-A seccion-C': 'Formato 08-A, sección C', '08-B programa': 'Formato 08-B', '08-C ioarr-activos': 'Formato 08-C (activos)', 'productos/acciones': 'productos y acciones' }[f.formato] || '';
    sl.addText('COMPONENTES Y METAS' + (fmt ? '  ·  ' + fmt : ''), { x: 0.55, y: 6.0, w: 8, h: 0.24, fontSize: 8.5, bold: true, color: NAVY, fontFace: 'Arial', charSpacing: 1 });
    const comps = (f.comp || []).slice(0, 4).map(cp => { const tot = cp.a.reduce((s, a) => s + (+a.c || 0), 0); const met = cp.a.filter(a => a.u).slice(0, 2).map(a => a.u).join(', '); return { text: corto(cp.n.replace(/^\d+[\.\)\-]?\s*/, ''), 70) + (tot ? '  —  ' + fS(tot) : '') + (met ? '  (' + corto(met, 40) + ')' : ''), options: { bullet: { code: '2022' }, breakLine: true, color: INK } }; });
    sl.addText(comps.length ? comps : REG, { x: 0.55, y: 6.25, w: 12.2, h: 0.78, fontSize: comps.length > 3 ? 7.5 : 8.5, color: comps.length ? INK : GRAY, fontFace: 'Arial', valign: 'top', paraSpaceAfter: 1 });
  }

  function construir(px, D) {
    px.defineLayout({ name: 'W', width: 13.33, height: 7.5 }); px.layout = 'W';
    px.author = D.autor || D.marca; px.title = (D.tipo === 'cui' ? 'Ficha ' : 'Expediente ') + D.ue.nombre;
    const fichas = D.cuis.filter(c => D.fichas[c.cui] || D.tipo === 'cui').slice(0, D.maxFichas || 30);
    if (D.tipo === 'cui') { const c = D.cuis[0]; portada(px, D); fichaCUI(px, D, c, D.fichas[c.cui], 2, 2); return 2; }
    const nCartera = Math.max(1, Math.ceil(D.cuis.length / 14)), hayAl = D.alertas && ['rezago', 'f12b', 'por_cerrar'].some(k => (D.alertas[k] || []).length);
    const total = 2 + nCartera + (hayAl ? 1 : 0) + fichas.length;
    portada(px, D); resumen(px, D, 2, total); let n = cartera(px, D, 3, total); n = alertas(px, D, n, total);
    fichas.forEach(c => fichaCUI(px, D, c, D.fichas[c.cui], n++, total));
    return total;
  }
  const api = { construir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Expediente = api;
})(typeof window !== 'undefined' ? window : globalThis);

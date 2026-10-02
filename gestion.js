/* gestion.js — módulo GESTIÓN de una unidad ejecutora (fase 3, datos públicos, sin clave).
   Gestion.ui(el, u, {onCui, onAtras})  ·  u = ficha pública de la UE (data/ue/<NN>.json: cuis, serie, ing, transf, ds, pim, dev, gir, corte)
   Lee data/gestion/<ue>.json (cierre, inactivas, procesos, resumen) y data/contrat/<ue>.json (PAC). */
(function () {
  const S = v => v == null ? '—' : 'S/ ' + (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + ' M' : Math.round(v).toLocaleString('es-PE'));
  const N = v => v == null ? '—' : Math.round(v).toLocaleString('es-PE');
  const D = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : '—';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tag = (t, k) => `<span class="tag ${k}">${t}</span>`;
  const lbl = (t, s) => `<div class="pd-lbl" style="margin-top:14px">${t}${s ? `<small>${s}</small>` : ''}</div>`;
  const HOY = new Date(), hoyS = HOY.toISOString().slice(0, 10), ANIO = HOY.getFullYear(), MES = HOY.getMonth() + 1;
  const dias = (a, b) => Math.round((new Date(b || hoyS) - new Date(a)) / 864e5);
  const MESN = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const NIV = { E: 'Gobierno Nacional', R: 'Gobierno Regional', M: 'Gobierno Local', L: 'Gobierno Local' };
  const sem = k => ({ ok: '#1B9E5A', warn: '#E39B1E', bad: '#D64545', p: '#1E5AA8', g: '#5C6BC0' }[k] || '#8A94A6');
  function css() {
    if (document.getElementById('gs-css')) return;
    const st = document.createElement('style'); st.id = 'gs-css'; st.textContent = `
      .gs-top{display:flex;gap:12px;align-items:center;margin:0 0 12px;padding:10px 14px;background:linear-gradient(135deg,#fff 60%,#EEF7F2);border:1px solid var(--line);border-left:5px solid #1B9E5A;border-radius:12px;box-shadow:var(--sh)}
      .gs-top .m{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#1B5E20}.gs-top .n{font-size:17px;font-weight:800;color:var(--p2);line-height:1.15;margin:2px 0}
      .gs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}@media(max-width:1300px){.gs-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      .gs-sub{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.gs-sub>div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:#fff}.gs-sub b.t{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px}.gs-sub .d{font-size:22px;font-weight:800;line-height:1.1;margin:3px 0}.gs-sub small{display:block;font-size:11px;color:var(--ink2)}.gs-sub i{display:block;height:6px;border-radius:3px;background:#ECEFF3;margin-top:6px;overflow:hidden}.gs-sub i b{display:block;height:100%}@media(max-width:760px){.gs-grid{grid-template-columns:1fr 1fr}}
      .gs-p{position:relative;background:#fff;border-radius:14px;padding:14px 16px 12px;border:1px solid rgba(15,42,67,.08);border-left:5px solid var(--c);box-shadow:0 1px 2px rgba(15,42,67,.06),0 6px 16px -8px rgba(15,42,67,.18);cursor:pointer;transition:transform .18s,box-shadow .18s;user-select:none}
      .gs-p:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(15,42,67,.08),0 14px 28px -10px rgba(15,42,67,.32)}
      .gs-p.on{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 78%,#0F2A43));color:#fff;border-color:transparent}.gs-p.on .k,.gs-p.on .s,.gs-p.on .y{color:rgba(255,255,255,.85)}.gs-p.on .v{color:#fff}
      .gs-p::after{content:'▾';position:absolute;right:11px;top:8px;font-size:14px;color:var(--mut)}.gs-p.on::after{transform:rotate(180deg);color:#fff}
      .gs-p .k{font-size:10px;font-weight:800;color:var(--mut);text-transform:uppercase;letter-spacing:.7px;padding-right:16px}.gs-p .v{font-size:21px;font-weight:800;color:var(--c);line-height:1.1;margin-top:4px}
      .gs-p .s{font-size:11px;color:var(--ink2);margin-top:2px}.gs-p .y{font-size:10.5px;color:var(--ink);margin-top:3px}
      .gs-det{margin-top:12px;border-radius:14px;background:#fff;border:1px solid rgba(15,42,67,.08);box-shadow:0 8px 24px -12px rgba(15,42,67,.25);padding:14px 16px;animation:gsIn .28s ease}.gs-det .pd-lbl:first-child{margin-top:0}
      @keyframes gsIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      .gs-chk{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;font-size:11px;font-weight:800;color:#fff}
      .gs-cal{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.gs-cal>div{border:1px solid var(--line);border-left:5px solid var(--c);border-radius:10px;padding:10px 12px;background:#fff}
      .gs-cal b.t{display:block;font-size:12.5px;color:var(--p2)}.gs-cal .d{font-size:20px;font-weight:800;color:var(--c);line-height:1.1;margin:3px 0}.gs-cal small{display:block;font-size:11px;color:var(--ink2)}
      .gs-bars{display:flex;gap:5px;align-items:flex-end;height:110px;padding:8px 2px 0}.gs-bars>div{flex:1;text-align:center;font-size:10px;color:var(--ink2)}.gs-bars i{display:block;border-radius:5px 5px 0 0;margin:2px 4px 0;background:var(--c,var(--p2))}.gs-bars i.n{background:repeating-linear-gradient(45deg,#E39B1E 0 4px,#fff 4px 8px);border:1px dashed #E39B1E}
      .gs-call{margin-top:14px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#0A1B2E,#123E7A);color:#fff}.gs-call b{color:#F2D06B}.gs-call ol{margin:6px 0 0 18px;padding:0;font-size:12px;line-height:1.5}`;
    document.head.appendChild(st);
  }
  const cab = (u, sub, opts) => `<div class="gs-top">${opts.onAtras ? '<button class="btn" id="gs-atras" title="Volver a la ficha de la entidad">← Atrás</button>' : ''}<div style="flex:1;min-width:0"><div class="m">🧭 Módulo de Gestión · Invierte.pe + SIAF + SEACE</div><div class="n">${esc(u.nombre || ('UE ' + u.cod))}</div><div class="mutx" style="font-size:11.5px">Unidad ejecutora ${esc(u.cod)}${NIV[u.nivel] ? ' · ' + NIV[u.nivel] : ''}${sub ? ' · ' + sub : ''}</div></div><button class="btn" id="gs-limpiar" title="Cerrar paneles">🧹 Limpiar</button></div>`;
  const chk = (ok, t) => `<span class="gs-chk" style="background:${ok === true ? '#1B9E5A' : ok === false ? '#D64545' : '#B0BEC5'}" title="${esc(t || '')}">${ok === true ? '✓' : ok === false ? '✗' : '·'}</span>`;

  function vista(el, u, g, pac, opts) {
    css(); const cuis = u.cuis || [], R = g.resumen || {};
    // ---- A4 cierre ----
    const C = g.cierre || [], I = g.inactivas || [];
    const estC = r => { const [, , , , saldo, av, fin, et, f9, etapa, inf, pim, dev] = r; if (f9 === 'SI' && etapa === 'Cierre') return ['Cierre registrado', 'ok']; if (etapa === 'Pendiente de liquidación' || (f9 === 'SI' && inf !== 'SI')) return ['Liquidación pendiente', 'warn']; if (av >= 100 && f9 !== 'SI') return ['Culminada sin Formato 9', 'bad']; if (fin && fin < hoyS && av < 100) return ['Plazo vencido sin culminar', 'bad']; return ['En proceso de cierre', 'p']; };
    const nC = { bad: 0, warn: 0, ok: 0, p: 0 }; C.forEach(r => nC[estC(r)[1]]++);
    const saldoC = C.reduce((a, r) => a + (r[4] > 0 ? r[4] : 0), 0), costoI = I.reduce((a, r) => a + (r[2] || 0), 0);
    // ---- A5 procesos ----
    const P = g.procesos || [], ab = P.filter(p => p[0] === 'abierto'), des = P.filter(p => p[0] === 'desierto'), ct = P.filter(p => p[0] === 'contrato');
    const ctVig = ct.filter(p => p[9] && p[9] >= hoyS), ctVenc = ct.filter(p => p[9] && p[9] < hoyS && !(cuis.find(c => c.cui === p[1])?.avance_fisico >= 100));
    const abDias = p => dias(p[7] || p[6]), abK = p => abDias(p) > 120 ? 'bad' : abDias(p) > 60 ? 'warn' : 'ok';
    const pacY = pac && pac.pac && pac.pac[String(ANIO)], pacPend = pacY ? (pacY.items || []).filter(it => !it[6] && it[1] >= MES) : [], pacAtr = pacY ? (pacY.items || []).filter(it => !it[6] && it[1] && it[1] < MES) : [];
    // ---- A7 proyeccion ----
    const serie = (u.serie || []).slice(0, 12), devAcum = u.dev || serie.reduce((a, b) => a + b, 0), pim = u.pim || 0, mesesHechos = Math.max(1, serie.filter((v, i) => i < MES - 1).length);
    const ult3 = serie.slice(Math.max(0, MES - 4), MES - 1), ritmo = ult3.length ? ult3.reduce((a, b) => a + b, 0) / ult3.length : 0, restan = 12 - (MES - 1);
    const proy = Math.min(pim, devAcum + ritmo * restan), proyPct = pim ? 100 * proy / pim : 0, riesgo = Math.max(0, pim - proy), necesario = restan ? Math.max(0, pim - devAcum) / restan : 0, esperado = Math.round(100 * (MES - 1) / 12);
    const kProy = proyPct >= 90 ? 'ok' : proyPct >= 75 ? 'warn' : 'bad';
    // ---- A6 calendario ----
    const fin = new Date(ANIO, 11, 31), dFin = Math.round((fin - HOY) / 864e5), dGir = Math.round((new Date(ANIO + 1, 0, 31) - HOY) / 864e5), finMes = new Date(ANIO, MES, 0), dMes = Math.round((finMes - HOY) / 864e5);
    const sinGirar = Math.max(0, (u.dev || 0) - (u.gir || 0)), avance = pim ? 100 * devAcum / pim : 0;
    const cal = [
      ['Formato 12-B del mes', `${R.f12b_viejo || 0} ${R.f12b_viejo === 1 ? 'inversión' : 'inversiones'} con PIM sin actualizar hace +45 días`, 'registro mensual del avance físico y financiero (UEI) · Banco de Inversiones', R.f12b_viejo ? 'bad' : 'ok', `${dMes} d`],
      ['Devengado al 31/12', `${avance.toFixed(1)} % ejecutado · esperado ${esperado} %`, `${S(Math.max(0, pim - devAcum))} por devengar en ${restan} mes${restan === 1 ? '' : 'es'}`, avance >= esperado - 5 ? 'ok' : avance >= esperado - 20 ? 'warn' : 'bad', `${dFin} d`],
      ['Girado al 31/01', `${S(sinGirar)} devengado sin girar`, 'lo devengado del año se gira hasta el 31 de enero siguiente', sinGirar > 0.05 * Math.max(1, devAcum) ? 'warn' : 'ok', `${dGir} d`],
      ['PMI ' + (ANIO + 1) + '–' + (ANIO + 3), `${R.pmi_no_con_pim || 0} ${R.pmi_no_con_pim === 1 ? 'inversión' : 'inversiones'} con PIM y sin registro en el PMI`, 'la OPMI registra y consistencia la cartera en el MPMI (primer trimestre; verificar el cronograma anual del MEF)', R.pmi_no_con_pim ? 'warn' : 'ok', 'OPMI'],
      ['Reversiones al 31/12', `${S(riesgo)} en riesgo de no ejecutarse`, 'saldos no devengados de recursos ordinarios y transferencias con plazo revierten al Tesoro', riesgo > 0.1 * pim ? 'bad' : riesgo > 0 ? 'warn' : 'ok', `${dFin} d`],
    ];
    if (u.nivel === 'M') cal.push(['Incentivos municipales (PI)', 'metas con plazo al 31/12', 'ver el módulo Planeamiento para el detalle por meta', 'p', `${dFin} d`]);
    if (u.nivel === 'R') cal.push(['FED (Fondo de Estímulo al Desempeño)', 'compromisos de gestión y cobertura', 'ver el módulo Planeamiento para el detalle', 'p', 'MEF']);
    const nBadCal = cal.filter(c => c[3] === 'bad').length;
    // ---- A1 indice / A2 PMI ----
    const X = g.indice || {}, sub = X.sub || {}, SUBN = { ejecucion: 'Ejecución presupuestal', f12b: 'Formato 12-B al día', cierre: 'Cierre de inversiones', pmi: 'Consistencia con el PMI', procesos: 'Procesos sin demora' };
    const kS = v => v == null ? 'g' : v >= 80 ? 'ok' : v >= 60 ? 'warn' : 'bad', peor = Object.entries(sub).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])[0];
    const PM = g.pmi || {}, pmItems = PM.items || [], PMK = { sin_pmi: ['Con PIM y fuera del PMI', 'bad'], sin_pim: ['Programada en el PMI sin presupuesto', 'warn'], exceso: ['PIM supera en +50 % lo programado', 'p'] };
    // ---- A8 recursos ----
    const ing = u.ing || {}, tr = u.transf || {}, ds = u.ds || [];
    const rubros = (ing.rubros || []).slice().sort((a, b) => b.pim - a.pim), fts = (ing.fuentes || []).slice().sort((a, b) => b.pim - a.pim);
    const recPct = ing.pim ? 100 * ing.rec / ing.pim : null;
    // ---- paneles ----
    const panel = (k, col, ico, t, v, s, y) => `<div class="gs-p" data-p="${k}" style="--c:${col}"><div class="k">${ico} ${t}</div><div class="v">${v}</div><div class="s">${s}</div>${y != null ? `<div class="y">${y}</div>` : ''}</div>`;
    el.innerHTML = `<div style="padding:8px">${cab(u, `${N(R.activas)} inversiones activas · ${N(R.con_pim)} con PIM ${ANIO}`, opts)}
      <div class="gs-grid">
        ${panel('indice', sem(kS(X.puntaje)), '🎯', 'Índice de gestión Acierta', X.puntaje != null ? `${X.puntaje} / 100` : '—', peor ? `lo que más baja: ${SUBN[peor[0]].toLowerCase()} (${peor[1]})` : 'sin datos suficientes', `${Object.values(sub).filter(v => v != null).length} subindicadores · ejecución, F12-B, cierre, PMI, procesos`)}
        ${panel('pmi', PM.n_sin_pmi ? '#D64545' : PM.n_exceso || PM.n_prog_sin_pim ? '#E39B1E' : '#1B9E5A', '🗂️', 'PMI vs presupuesto', PM.n != null ? `${N(PM.n)} en el PMI` : '—', `${PM.n_sin_pmi || 0} con PIM fuera del PMI · ${PM.n_prog_sin_pim || 0} programadas sin PIM`, PM.prog ? `programado ${ANIO}: ${S(PM.prog[0])} · PIM en PMI: ${S(PM.pim_en_pmi)}` : null)}
        ${panel('cierre', nC.bad ? '#D64545' : '#1B9E5A', '🏁', 'Cierre de inversiones', `${C.length} por cerrar`, `${nC.bad} con alerta · ${nC.warn} con liquidación pendiente`, `${I.length} activas sin ejecución hace 2+ años · ${S(costoI)}`)}
        ${panel('proc', ab.some(p => abK(p) === 'bad') ? '#D64545' : ab.length ? '#1E5AA8' : '#1B9E5A', '📑', 'Procesos en curso', `${ab.length} abierto${ab.length === 1 ? '' : 's'}`, `${des.length} desierto${des.length === 1 ? '' : 's'}/nulos (12 meses) · ${ctVig.length} contrato${ctVig.length === 1 ? '' : 's'} vigente${ctVig.length === 1 ? '' : 's'}`, pacY ? `PAC ${ANIO}: ${pacY.n} programados · ${pacY.adj} con buena pro · ${pacAtr.length} atrasados` : 'sin PAC del año')}
        ${panel('cal', sem(nBadCal ? 'bad' : 'ok'), '📅', 'Calendario de plazos', `${nBadCal} vencido${nBadCal === 1 ? '' : 's'}`, `${cal.length} plazos vigilados · ${dFin} días para el cierre del año`, `F12-B · devengado · girado · PMI · reversiones`)}
        ${panel('proy', sem(kProy), '📈', 'Proyección al cierre', `${proyPct.toFixed(0)} %`, `al ritmo actual (${S(ritmo)}/mes) · hoy ${avance.toFixed(1)} %`, riesgo ? `${S(riesgo)} no se ejecutarían · se necesita ${S(necesario)}/mes` : 'cerraría el año al 100 %')}
        ${panel('rec', '#00838F', '💰', 'Recursos por rubro', recPct != null ? `${recPct.toFixed(0) } % recaudado` : '—', ing.pim ? `${S(ing.rec)} de ${S(ing.pim)} de ingresos ${ANIO}` : 'sin datos de ingresos', tr.total ? `transferencias del Tesoro: ${S(tr.total)} · ${ds.length} dispositivo${ds.length === 1 ? '' : 's'} legal${ds.length === 1 ? '' : 'es'}` : null)}
      </div><div id="gs-det"></div>
      <div class="gs-call"><b>Mi entidad: lo mismo, pero con tu SIAF.</b> Expediente por expediente, proveedor, documento, glosa y fase de cada pago, cifrado y solo con tu clave.
        <ol><li>Solicita el acceso con el nombre de la entidad y el código de unidad ejecutora.</li><li>ARKA publica tu paquete cifrado y te entrega la clave por el canal acordado.</li><li>Opcional: con el respaldo del SIAF se activan expedientes, proveedores y fases de pago.</li></ol>
        <div style="margin-top:8px"><a class="btn" href="https://www.arkaproyectos.com.pe" target="_blank" rel="noopener" style="background:#F2D06B;color:#1C1917;border:0">Solicitar Mi entidad →</a></div></div>
      <p class="mutx" style="font-size:10px;margin-top:10px">Fuentes: Banco de Inversiones (detalle, cierre, Formato 9 y 12-B), Consulta Amigable (ejecución y serie mensual), SEACE OCDS (procesos y contratos) y PAC del OECE · corte ${D((g.corte || u.corte || '').slice(0, 10))}. Herramienta de apoyo a la gestión; no reemplaza los registros oficiales.</p></div>`;
    // ---- detalles ----
    const cui = c => `<a class="fc" data-cui="${esc(c)}" style="cursor:pointer;font-weight:700">${esc(c)}</a>`;
    const tbl = (h, rows) => rows.length ? `<div style="overflow-x:auto"><table class="pd-tbl"><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.join('')}</table></div>` : '<p class="mutx" style="font-size:12px;padding:6px 4px">Nada que mostrar.</p>';
    const DET = {
      indice: () => lbl('Subindicadores', 'cada uno de 0 a 100 · el índice es el promedio de los disponibles · reglas explícitas, datos públicos') +
        `<div class="gs-sub">${Object.entries(SUBN).map(([k, t]) => { const v = sub[k]; return `<div><b class="t">${t}</b><div class="d" style="color:${sem(kS(v))}">${v == null ? '—' : v}</div><small>${esc((X.detalle || {})[k] || '')}</small><i><b style="width:${v || 0}%;background:${sem(kS(v))}"></b></i></div>`; }).join('')}</div>` +
        `<p class="mutx" style="font-size:10.5px;margin-top:10px">Cómo se calcula: ejecución = devengado/PIM frente al avance esperado del año; F12-B = inversiones con PIM actualizadas en los últimos 45 días; cierre = inversiones por cerrar sin alerta (sin Formato 9 o con plazo vencido); PMI = inversiones con PIM registradas en el PMI; procesos = abiertos sin más de 120 días desde su último hito. El Banco de Inversiones no publica su puntaje en datos abiertos; este índice es de Acierta y sirve para comparar entidades con la misma regla. Lo que baja cada subindicador está en los demás paneles.</p>`,
      pmi: () => lbl(`Programación multianual (PMI) ${PM.anios ? PM.anios[0] + '–' + PM.anios[3] : ''}`, 'monto programado por año en el Banco de Inversiones · inversiones de la entidad') +
        `<div class="gs-bars" style="--c:#5C6BC0;height:90px">${(PM.prog || []).map((v, i) => `<div title="${PM.anios[i]}: ${S(v)}"><div style="font-size:9.5px;font-weight:700;color:var(--ink)">${v ? (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1e3) + 'k') : '0'}</div><i style="height:${Math.max(3, Math.round(56 * (v || 0) / (Math.max(...(PM.prog || [1]).map(x => x || 0)) || 1)))}px"></i>${PM.anios[i]}</div>`).join('')}</div>` +
        `<div class="pd-row"><b>Inversiones registradas en el PMI</b><span>${N(PM.n)}</span></div><div class="pd-row"><b>PIM ${ANIO} dentro del PMI</b><span>${S(PM.pim_en_pmi)}</span></div><div class="pd-row"><b>PIM ${ANIO} fuera del PMI</b><span style="color:${PM.n_sin_pmi ? '#D64545' : 'inherit'}">${S(PM.pim_sin_pmi)} · ${PM.n_sin_pmi || 0}</span></div><div class="pd-row"><b>Programado ${ANIO} sin presupuesto</b><span>${S(PM.prog_sin_pim)} · ${PM.n_prog_sin_pim || 0}</span></div><div class="pd-row"><b>PIM por encima de lo programado (+50 %)</b><span>${S(PM.exceso)} · ${PM.n_exceso || 0}</span></div>` +
        lbl('Inconsistencias por inversión', `${pmItems.length} · para revisar con la OPMI antes del próximo registro del PMI`) +
        tbl(['CUI', 'Inversión', `PMI ${ANIO}`, `PIM ${ANIO}`, `Devengado ${ANIO}`, 'Situación'], pmItems.map(r => `<tr><td>${cui(r[0])}</td><td style="white-space:normal;font-size:10.5px;min-width:260px;text-align:left">${esc(r[1])}</td><td>${S(r[2])}</td><td>${S(r[3])}</td><td>${S(r[4])}</td><td style="white-space:normal">${tag(PMK[r[5]][0], PMK[r[5]][1])}</td></tr>`)) +
        `<p class="mutx" style="font-size:10.5px">Los años del PMI se leen de las columnas PMI_ANIO_1..4 del Banco de Inversiones (programación ${PM.anios ? PM.anios[0] : ''} en adelante). Una inversión con PIM y fuera del PMI no debería ejecutarse sin registrarla; una programada sin presupuesto queda sin financiamiento salvo modificación.</p>`,
      cierre: () => lbl('Checklist de cierre por inversión', `${C.length} · física 100 %, plazo vencido o Formato 9 en curso · ordenadas por costo`) +
        `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><select id="gs-f" style="padding:6px 10px;border:1.5px solid var(--line);border-radius:999px;font:inherit;font-size:12px;background:#fff"><option value="">Todos los estados</option>${['Culminada sin Formato 9', 'Plazo vencido sin culminar', 'Liquidación pendiente', 'En proceso de cierre', 'Cierre registrado'].map(x => `<option>${x}</option>`).join('')}</select><input type="search" id="gs-q" placeholder="Buscar CUI o nombre…" style="flex:1;min-width:200px;padding:6px 10px;border:1.5px solid var(--line);border-radius:999px;font:inherit;font-size:12px"></div><div id="gs-tabla"></div>` +
        lbl('Para evaluar desactivación o cierre', `${I.length} inversiones activas sin PIM ${ANIO} y sin devengar desde hace 2+ años · costo ${S(costoI)}`) +
        tbl(['CUI', 'Inversión', 'Tipo', 'Costo', 'Devengado acum.', 'Último devengado', 'ET', 'Registrada'], I.map(r => `<tr><td>${cui(r[0])}</td><td style="white-space:normal;font-size:10.5px;min-width:260px;text-align:left">${esc(r[1])}</td><td style="font-size:10px">${esc((r[8] || '').replace('PROYECTO DE INVERSION', 'Proyecto').replace('IOARR', 'IOARR'))}</td><td>${S(r[2])}</td><td>${S(r[3])}</td><td>${r[4] ? r[4].slice(4, 6) + '/' + r[4].slice(0, 4) : tag('nunca', 'bad')}</td><td>${chk(r[6] === 'SI', 'expediente técnico')}</td><td>${D(r[7])}</td></tr>`)) +
        `<p class="mutx" style="font-size:10.5px">Sugerencia: revisar con la OPMI/UEI si corresponde desactivación temporal, cierre o reprogramación en el PMI. La Sección C del Formato 08-A muestra si quedaron componentes con presupuesto vigente.</p>`,
      proc: () => lbl('Procesos abiertos', `${ab.length} · en convocatoria, buena pro, consentido… · días desde el último hito`) +
        tbl(['CUI', 'Proceso', 'Objeto', 'Estado', 'Convocado', 'Buena pro', 'Días', 'Valor ref.', 'Descripción'], ab.sort((a, b) => abDias(b) - abDias(a)).map(p => `<tr><td>${cui(p[1])}</td><td style="font-size:10.5px"><b>${esc(p[3])}</b></td><td>${p[4] === 'works' ? 'Obra' : 'Servicio'}</td><td>${tag(esc(p[5]), abK(p) === 'ok' ? 'p' : abK(p))}</td><td>${D(p[6])}</td><td>${D(p[7])}</td><td><b style="color:${sem(abK(p))}">${abDias(p)}</b></td><td>${S(p[10])}</td><td style="white-space:normal;font-size:10px;min-width:220px;text-align:left">${esc(p[12])}</td></tr>`)) +
        lbl('Desiertos y nulos del último año', `${des.length} · por reconvocar o replantear`) +
        tbl(['CUI', 'Proceso', 'Objeto', 'Estado', 'Convocado', 'Valor ref.', 'Descripción'], des.map(p => `<tr><td>${cui(p[1])}</td><td style="font-size:10.5px"><b>${esc(p[3])}</b></td><td>${p[4] === 'works' ? 'Obra' : 'Servicio'}</td><td>${tag(esc(p[5]), 'warn')}</td><td>${D(p[6])}</td><td>${S(p[10])}</td><td style="white-space:normal;font-size:10px;min-width:220px;text-align:left">${esc(p[12])}</td></tr>`)) +
        lbl('Contratos', `${ctVig.length} vigentes · ${ctVenc.length} con plazo vencido y obra sin culminar · firmados en los últimos 24 meses`) +
        tbl(['CUI', 'Proceso', 'Objeto', 'Contratista', 'Firma', 'Fin de plazo', 'Monto', 'Situación'], ct.sort((a, b) => (b[8] || '').localeCompare(a[8] || '')).map(p => { const v = p[9] && p[9] < hoyS, cul = cuis.find(c => c.cui === p[1])?.avance_fisico >= 100; return `<tr${v && !cul ? ' style="background:#FDF2F2"' : ''}><td>${cui(p[1])}</td><td style="font-size:10.5px"><b>${esc(p[3])}</b></td><td>${p[4] === 'works' ? 'Obra' : 'Servicio'}</td><td style="white-space:normal;font-size:10.5px">${esc(p[11])}</td><td>${D(p[8])}</td><td>${D(p[9])}</td><td>${S(p[13])}</td><td>${cul ? tag('culminada', 'ok') : v ? tag('plazo vencido', 'bad') : tag('vigente', 'ok')}</td></tr>`; })) +
        (pacY ? lbl(`PAC ${ANIO}: lo programado que sigue pendiente`, `${pacPend.length} para los próximos meses · ${pacAtr.length} con mes previsto ya pasado y sin buena pro`) +
          tbl(['Ref.', 'Mes previsto', 'Objeto', 'Procedimiento', 'Descripción', 'Situación'], [...pacAtr, ...pacPend].map(it => `<tr><td>${esc(it[0])}</td><td>${MESN[it[1]] || '—'}</td><td>${{ O: 'Obras', B: 'Bienes', S: 'Servicios', C: 'Consultoría de obra' }[it[2]] || 'Otros'}</td><td style="font-size:10.5px">${esc(it[3])}</td><td style="white-space:normal;font-size:10.5px">${esc(it[4])}</td><td>${it[1] < MES ? tag('atrasado', 'bad') : tag('programado', 'warn')}</td></tr>`)) : ''),
      cal: () => lbl('Plazos vigilados', `semáforo según el estado actual de la entidad · ${dFin} días para el 31/12`) +
        `<div class="gs-cal">${cal.map(([t, v, d, k, q]) => `<div style="--c:${sem(k)}"><b class="t">${t} <span style="float:right;color:${sem(k)}">${q}</span></b><div class="d">${v}</div><small>${d}</small></div>`).join('')}</div>` +
        `<p class="mutx" style="font-size:10.5px;margin-top:10px">Los plazos normativos (cierre del devengado, giro hasta el 31 de enero, registro mensual del Formato 12-B) son los de las directivas de Tesorería e Invierte.pe vigentes; el cronograma del PMI lo fija el MEF cada año y conviene confirmarlo con la OPMI.</p>`,
      proy: () => { const mx = Math.max(...serie, necesario, 1); return lbl('Devengado mensual y ritmo necesario', `${S(devAcum)} ejecutados de ${S(pim)} · rayado = lo que haría falta por mes para llegar al 100 %`) +
        `<div class="gs-bars" style="--c:#1E5AA8">${serie.map((v, i) => `<div title="${MESN[i + 1]}: ${S(i < MES - 1 ? v : necesario)}"><div style="font-size:9.5px;font-weight:700;color:var(--ink)">${i < MES - 1 ? (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v ? Math.round(v / 1e3) + 'k' : '') : ''}</div><i class="${i < MES - 1 ? '' : 'n'}" style="height:${Math.max(3, Math.round(70 * (i < MES - 1 ? v : necesario) / mx))}px"></i>${MESN[i + 1]}</div>`).join('')}</div>` +
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:12px">${[['Ritmo actual', S(ritmo) + '/mes', 'promedio de los últimos 3 meses'], ['Ritmo necesario', S(necesario) + '/mes', `para devengar el 100 % en ${restan} meses`], ['Proyección al 31/12', proyPct.toFixed(1) + ' %', `${S(proy)} al ritmo actual`], ['En riesgo', S(riesgo), 'PIM que no se ejecutaría (reversión o saldo)']].map(([t, v, d]) => `<div class="pd-row" style="display:block"><b style="display:block;font-size:11px;color:var(--mut)">${t}</b><span style="font-size:18px;font-weight:800;color:${sem(kProy)}">${v}</span><small style="display:block;color:var(--ink2)">${d}</small></div>`).join('')}</div>` +
        `<p class="mutx" style="font-size:10.5px;margin-top:8px">Proyección lineal con el promedio de los últimos tres meses; los cierres de año suelen acelerar en noviembre y diciembre, así que es un piso prudente, no un pronóstico.</p>`; },
      rec: () => lbl(`Ingresos ${ANIO} por rubro`, `PIM vs recaudado · ${recPct != null ? recPct.toFixed(1) + ' % recaudado' : ''}`) +
        tbl(['Rubro', 'PIM', 'Recaudado', '%'], rubros.map(r => `<tr><td style="white-space:normal">${esc(r.nombre)}</td><td>${S(r.pim)}</td><td>${S(r.rec)}</td><td>${r.pim ? (100 * r.rec / r.pim).toFixed(0) + ' %' : '—'}</td></tr>`)) +
        lbl('Fuentes de financiamiento', 'ingresos') + tbl(['Fuente', 'PIM', 'Recaudado', '%'], fts.map(r => `<tr><td style="white-space:normal">${esc(r.nombre)}</td><td>${S(r.pim)}</td><td>${S(r.rec)}</td><td>${r.pim ? (100 * r.rec / r.pim).toFixed(0) + ' %' : '—'}</td></tr>`)) +
        (tr.recursos ? lbl('Transferencias del Tesoro Público', `${S(tr.total)} en el año · por recurso`) + tbl(['Recurso', 'Monto'], tr.recursos.slice(0, 15).map(r => `<tr><td style="white-space:normal">${esc(r.nombre)}</td><td>${S(r.monto)}</td></tr>`)) : '') +
        (ds.length ? lbl('Transferencias con dispositivo legal', `${ds.length} · suelen traer finalidad y plazo: lo no ejecutado revierte`) + tbl(['Dispositivo', 'Fecha', 'Rubro', 'Asignado', 'Incorporado', 'Descripción'], ds.map(x => `<tr><td style="font-size:10.5px"><b>${esc(x.ds)}</b></td><td>${esc(x.fecha)}</td><td style="white-space:normal;font-size:10px">${esc(x.rubro || '')}</td><td>${S(x.asignado)}</td><td>${S(x.incorporado)}</td><td style="white-space:normal;font-size:10px">${esc(x.descripcion || '')}</td></tr>`)) : ''),
    };
    const det = el.querySelector('#gs-det'); let abierto = null;
    const filaC = r => { const [cu, nom, costo, devA, saldo, av, fin, et, f9, etapa, inf, pim, dev] = r, [e, k] = estC(r); return `<tr><td>${cui(cu)}</td><td style="white-space:normal;font-size:10.5px;min-width:260px;text-align:left">${esc(nom)}</td><td>${av != null ? av.toFixed(0) + ' %' : '—'}</td><td>${D(fin)}</td><td>${chk(et === 'SI', 'expediente técnico')}</td><td>${chk(f9 === 'SI', 'Formato 9')}${etapa ? `<br><small style="font-size:9.5px">${esc(etapa)}</small>` : ''}</td><td>${chk(inf === 'SI', 'informe de cierre')}</td><td>${S(saldo)}</td><td>${pim ? `${S(dev)} / ${S(pim)}` : '—'}</td><td style="white-space:normal">${tag(e, k)}</td></tr>`; };
    const pintarC = () => { const t = det.querySelector('#gs-tabla'); if (!t) return; const f = det.querySelector('#gs-f').value, q = det.querySelector('#gs-q').value.trim().toLowerCase(); const L = C.filter(r => (!f || estC(r)[0] === f) && (!q || (r[0] + ' ' + r[1]).toLowerCase().includes(q))); t.innerHTML = tbl(['CUI', 'Inversión', 'Físico', 'Fin ejecución', 'ET', 'F9', 'Inf. cierre', 'Saldo por ejecutar', `Dev./PIM ${ANIO}`, 'Situación'], L.map(filaC)) + `<p class="mutx" style="font-size:10.5px">${L.length} de ${C.length} · saldo por ejecutar del conjunto: ${S(saldoC)}</p>`; wire(); };
    const wire = () => el.querySelectorAll('[data-cui]').forEach(a => a.onclick = () => opts.onCui && opts.onCui(a.dataset.cui));
    const abrir = k => {
      el.querySelectorAll('.gs-p').forEach(p => p.classList.toggle('on', p.dataset.p === k && abierto !== k));
      if (abierto === k) { abierto = null; det.innerHTML = ''; return; }
      abierto = k; det.innerHTML = `<div class="gs-det">${DET[k]()}</div>`;
      ['#gs-f', '#gs-q'].forEach(id => { const x = det.querySelector(id); if (x) x.oninput = x.onchange = pintarC; }); pintarC(); wire(); det.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    el.querySelectorAll('.gs-p').forEach(p => p.onclick = () => abrir(p.dataset.p));
    el.querySelector('#gs-limpiar').onclick = () => { abierto = null; det.innerHTML = ''; el.querySelectorAll('.gs-p').forEach(p => p.classList.remove('on')); el.scrollIntoView({ block: 'start' }); };
    const ba = el.querySelector('#gs-atras'); if (ba) ba.onclick = () => opts.onAtras();
  }
  async function ui(el, u, opts) {
    opts = opts || {}; css(); el.innerHTML = '<p class="mutx" style="padding:12px">Cargando gestión…</p>';
    const j = async p => { try { const r = await fetch(p); return r.ok ? await r.json() : null; } catch (e) { return null; } };
    const [g, pac, gi] = await Promise.all([j(`data/gestion/${u.cod}.json`), j(`data/contrat/${u.cod}.json`), j('data/gestion/index.json')]);
    if (!g) { el.innerHTML = `<div style="padding:8px">${cab(u, '', opts)}<div class="card" style="padding:18px;text-align:center"><b style="color:var(--p2)">Sin inversiones activas registradas en el Banco de Inversiones para esta unidad ejecutora</b></div></div>`; const ba = el.querySelector('#gs-atras'); if (ba) ba.onclick = () => opts.onAtras(); el.querySelector('#gs-limpiar').onclick = () => { }; return; }
    if (gi && gi.corte) g.corte = gi.corte;
    vista(el, u, g, pac, opts);
  }
  window.Gestion = { ui };
})();

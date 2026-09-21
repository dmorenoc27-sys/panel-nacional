/* proveedores.js — buscador de proveedores del Estado por RUC (sección Contrataciones, todos los niveles, con y sin clave).
   Datos: Web/data/prov/<NN>.json generados por Scripts/proveedores.py (OECE-CONOSCE: sanciones e inhabilitaciones del Tribunal desde 1998,
   multas, inhabilitaciones por mandato judicial, penalidades 2018->, contratos y adjudicaciones 2018->, arbitrajes, consorcios,
   conformación jurídica del RNP; SUNAT: padrón RUC). Lo que no se publica en descarga masiva se enlaza a los portales oficiales. */
(function () {
  const $q = (el, s) => el.querySelector(s);
  const S = v => v == null ? '—' : 'S/ ' + (v >= 1e6 ? (v / 1e6).toFixed(1) + ' M' : v.toLocaleString('es-PE', { maximumFractionDigits: 0 }));
  const D = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : '—';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoy = () => new Date().toISOString().slice(0, 10);
  const COL = { ok: '#1B9E5A', warn: '#E39B1E', bad: '#D64545', p: '#1E5AA8' };
  const PORTALES = [
    ['SUNAT · Consulta RUC', 'Estado, condición de domicilio, representantes legales y deuda coactiva', 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp'],
    ['OECE · Proveedores sancionados', 'Inhabilitados vigentes por el Tribunal de Contrataciones (consulta en línea)', 'https://www.osce.gob.pe/consultasenlinea/inhabilitados/busqueda.asp'],
    ['OECE · RNP', 'Vigencia de la inscripción en el Registro Nacional de Proveedores', 'https://www.rnp.gob.pe/consultasenlinea/inhabilitados/busqueda_vnv.asp'],
    ['Tribunal de Contrataciones', 'Resoluciones del Tribunal (texto completo de cada sanción)', 'https://www.gob.pe/institucion/oece/colecciones/716-resoluciones-del-tribunal-de-contrataciones-publicas-del-organismo-especializado-para-las-contrataciones-publicas-eficientes-oece'],
    ['CONOSCE · Buscador', 'Procesos, contratos y órdenes de compra del SEACE', 'https://conosce.osce.gob.pe/buscador/'],
    ['Contraloría · INFOBRAS', 'Obras públicas: avance, paralizadas, contratista y supervisor', 'https://apps.contraloria.gob.pe/ciudadano/'],
    ['Contraloría · Informes de control', 'Informes de control con responsabilidades identificadas', 'https://appbp.contraloria.gob.pe/BuscadorCGR/Informes/Inicio.html'],
    ['Poder Judicial · CEJ', 'Expedientes judiciales por nombre o razón social', 'https://cej.pj.gob.pe/cej/forms/busquedaform.html'],
    ['INDECOPI · Mira a quién le compras', 'Sanciones por infracciones al consumidor', 'https://servicio.indecopi.gob.pe/appCPCBuscador/'],
    ['SUNAFIL', 'Infracciones laborales y de seguridad en el trabajo', 'https://www.gob.pe/institucion/sunafil']
  ];
  let IDX = null; const cache = {};
  const idx = () => IDX ? Promise.resolve(IDX) : fetch('data/prov/index.json').then(r => r.ok ? r.json() : null).then(j => (IDX = j || { rucs: 0 })).catch(() => (IDX = { rucs: 0 }));
  const shard = k => cache[k] || (cache[k] = fetch(`data/prov/${k}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({})));
  async function buscar(ruc) { const d = await shard(ruc.slice(-2)); return d[ruc] || null; }

  // ---- veredicto: sanción vigente > antecedentes > limpio ----
  function veredicto(p) {
    const san = p.san || [], vig = san.filter(s => s[7]), res = p.con && p.con.res || 0, pen = p.pen && p.pen.n || 0, arb = p.arb ? p.arb.length : 0;
    if (vig.length) return { col: 'bad', ico: '⛔', t: 'SANCIÓN VIGENTE', s: `${vig.length} sanción${vig.length > 1 ? 'es' : ''} vigente${vig.length > 1 ? 's' : ''} · ${vig[0][0] === 'judicial' ? 'inhabilitación por mandato judicial' : vig[0][0] === 'multa' ? 'multa del Tribunal' : vig[0][2] ? 'inhabilitado hasta el ' + D(vig[0][2]) : 'inhabilitación definitiva'}` };
    const ant = [san.length && `${san.length} sanción${san.length > 1 ? 'es' : ''} anterior${san.length > 1 ? 'es' : ''}`, res && `${res} contrato${res > 1 ? 's' : ''} resuelto${res > 1 ? 's' : ''}`, pen && `${pen} penalidad${pen > 1 ? 'es' : ''}`, arb && `${arb} arbitraje${arb > 1 ? 's' : ''}`].filter(Boolean);
    if (ant.length) return { col: 'warn', ico: '⚠️', t: 'CON ANTECEDENTES', s: ant.join(' · ') };
    return { col: 'ok', ico: '✅', t: 'SIN SANCIONES NI PENALIDADES', s: 'No registra sanciones del Tribunal, inhabilitaciones judiciales, penalidades ni contratos resueltos en las fuentes oficiales' };
  }
  const tile = (ico, v, l, col) => `<div class="card" style="padding:12px 14px;border-left:4px solid ${col || 'var(--p2)'};display:flex;gap:10px;align-items:center"><div style="font-size:20px">${ico}</div><div style="min-width:0"><div style="font-size:17px;font-weight:800;color:${col || 'var(--p2)'};line-height:1.1">${v}</div><div style="font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">${l}</div></div></div>`;
  const lbl = (t, s) => `<div class="pd-lbl" style="margin-top:14px">${t}${s ? `<small>${s}</small>` : ''}</div>`;
  const tbl = (h, rows) => rows.length ? `<div style="overflow-x:auto"><table class="pd-tbl"><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.join('')}</table></div>` : '';
  const tag = (t, k) => `<span class="tag ${k}">${t}</span>`;
  function anios(a) {
    const ks = Object.keys(a).sort(); if (!ks.length) return '';
    const mx = Math.max(...ks.map(k => a[k][1])) || 1;
    return `<div style="display:flex;gap:6px;align-items:flex-end;height:84px;padding:6px 4px 0">${ks.map(k => `<div style="flex:1;text-align:center;font-size:10px;color:var(--ink2)" title="${k}: ${a[k][0]} adjudicaciones · ${S(a[k][1])}"><div style="font-size:9.5px;font-weight:700;color:var(--p2)">${a[k][1] >= 1e6 ? (a[k][1] / 1e6).toFixed(1) + 'M' : a[k][1] >= 1e3 ? Math.round(a[k][1] / 1e3) + 'k' : a[k][1]}</div><div style="height:${Math.max(3, Math.round(50 * a[k][1] / mx))}px;background:var(--p2);border-radius:4px 4px 0 0;margin:2px 6px 0"></div>${k}</div>`).join('')}</div>`;
  }
  function ficha(ruc, p) {
    if (!p) return `<div class="card" style="padding:22px;text-align:center;margin-top:12px"><div style="font-size:30px">🔎</div><b style="font-size:14px;color:var(--p2)">RUC ${ruc}: sin registros en las bases masivas del OECE</b><p class="mutx" style="font-size:12px;margin:6px 0 0">No aparece con adjudicaciones ni contratos del SEACE desde 2018, ni en los registros de sanciones, multas, inhabilitaciones judiciales o penalidades. Puede ser un proveedor sin contratos con el Estado o con solo órdenes de compra. Verifique en los portales oficiales:</p>${portales(ruc)}</div>`;
    const v = veredicto(p), nombre = p.n || (p.sunat && p.sunat[0]) || 'Razón social no disponible', san = p.san || [], adj = p.adj || { n: 0, m: 0, a: {}, e: [], l: [] }, con = p.con || { n: 0, m: 0, res: 0, adic: 0, l: [] }, pen = p.pen || { n: 0, m: 0, l: [] };
    const natural = ruc.startsWith('10');
    const cabecera = `<div class="card" style="padding:16px 18px;margin-top:12px;border-left:6px solid ${COL[v.col]}">
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start"><div style="flex:1;min-width:260px">
        <div style="font-size:10px;font-weight:800;color:var(--mut);letter-spacing:.8px">RUC ${ruc} · ${natural ? 'PERSONA NATURAL CON NEGOCIO' : 'PERSONA JURÍDICA'}</div>
        <div style="font-size:17px;font-weight:800;color:var(--p2);line-height:1.25;margin:3px 0 6px">${esc(nombre)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${p.sunat ? `<span class="tag ${/ACTIVO/i.test(p.sunat[1]) ? 'ok' : 'bad'}">SUNAT ${esc(p.sunat[1])}</span><span class="tag ${/^HABIDO/i.test(p.sunat[2]) ? 'ok' : 'bad'}">${esc(p.sunat[2])}</span>` : '<span class="tag" style="background:var(--sup);color:var(--ink2)">SUNAT: sin padrón cargado</span>'}${p.soc ? `<span class="tag" style="background:#EDF3FC;color:var(--p2)">RNP · ${p.soc.length} socio${p.soc.length > 1 ? 's' : ''}/representante${p.soc.length > 1 ? 's' : ''}</span>` : ''}${p.cons ? `<span class="tag" style="background:#EDF3FC;color:var(--p2)">${p.cons.length} consorcio${p.cons.length > 1 ? 's' : ''}</span>` : ''}</div></div>
        <div style="flex:0 0 auto;min-width:260px;max-width:420px;background:${COL[v.col]}14;border:1px solid ${COL[v.col]}55;border-radius:10px;padding:10px 14px"><div style="font-size:13px;font-weight:800;color:${COL[v.col]}">${v.ico} ${v.t}</div><div style="font-size:11px;color:var(--ink);margin-top:3px">${v.s}</div></div></div></div>`;
    const kpis = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px">
      ${tile('🏆', adj.n.toLocaleString('es-PE'), `adjudicaciones · ${S(adj.m)}`)}${tile('📝', con.n.toLocaleString('es-PE'), `contratos · ${S(con.m)}`)}${tile('❌', con.res, 'contratos resueltos', con.res ? COL.bad : COL.ok)}
      ${tile('⚖️', pen.n, `penalidades · ${S(pen.m)}`, pen.n ? COL.warn : COL.ok)}${tile('⛔', san.length, `sanciones · ${san.filter(s => s[7]).length} vigentes`, san.filter(s => s[7]).length ? COL.bad : san.length ? COL.warn : COL.ok)}${tile('🏛️', (p.arb || []).length, 'arbitrajes', (p.arb || []).length ? COL.warn : COL.ok)}</div>`;
    const sanT = san.length ? lbl('Sanciones, inhabilitaciones y multas', `Tribunal de Contrataciones (desde 1998) · Poder Judicial · ${san.length} registro${san.length > 1 ? 's' : ''}`) +
      tbl(['Tipo', 'Inicio', 'Fin', 'Resolución', 'Motivo / órgano', 'Monto', 'Estado'], san.map(s => `<tr><td>${s[0] === 'inhab' ? 'Inhabilitación' : s[0] === 'multa' ? 'Multa' : 'Mandato judicial'}</td><td>${D(s[1])}</td><td>${s[2] ? D(s[2]) : s[0] === 'inhab' ? '<b>definitiva</b>' : '—'}</td><td>${esc(s[3])}</td><td style="white-space:normal">${esc(s[4] || '')}${s[6] ? ` <small class="mutx">· ${esc(s[6])}</small>` : ''}</td><td>${s[5] ? S(s[5]) : '—'}</td><td>${s[7] ? tag('VIGENTE', 'bad') : tag('cumplida', 'ok')}</td></tr>`)) : '';
    const penT = pen.n ? lbl('Penalidades aplicadas', `${pen.n} · ${S(pen.m)} · registradas por las entidades en el SEACE desde 2018`) +
      tbl(['Fecha', 'Entidad', 'Objeto', 'Tipo', 'Motivo', 'Monto'], pen.l.map(x => `<tr><td>${D(x[0])}</td><td style="white-space:normal">${esc(x[1])}</td><td>${esc(x[5])}</td><td>${esc(x[2])}</td><td style="white-space:normal;font-size:10px">${esc(x[3])}</td><td>${S(x[4])}</td></tr>`)) + (pen.n > pen.l.length ? `<p class="mutx" style="font-size:10.5px">Se muestran las ${pen.l.length} más recientes.</p>` : '') : '';
    const conT = con.n ? lbl('Contratos', `${con.n} · ${S(con.m)}${con.adic ? ' · adicionales ' + S(con.adic) : ''}${con.res ? ` · <b style="color:var(--bad)">${con.res} con resolución de contrato</b>` : ''}`) +
      tbl(['Firma', 'Entidad', 'Proceso', 'Monto', 'Adicional', 'Fin vigencia', 'Situación'], con.l.map(x => `<tr${x[5] ? ' style="background:#FDF2F2"' : ''}><td>${D(x[0])}</td><td style="white-space:normal">${esc(x[1]) || '—'}</td><td style="white-space:normal">${esc(x[2])}${x[8] ? ` <small class="mutx">· ${esc(x[8])}</small>` : ''}</td><td>${S(x[3])}</td><td>${x[4] ? S(x[4]) : '—'}</td><td>${D(x[6])}</td><td>${x[5] ? tag('RESUELTO', 'bad') : x[6] && x[6] < hoy() ? tag('vencido', 'warn') : tag('vigente', 'ok')}${x[7] ? ` <a href="${esc(x[7])}" target="_blank" rel="noopener" title="Ver contrato en el SEACE">↗</a>` : ''}</td></tr>`)) + (con.n > con.l.length ? `<p class="mutx" style="font-size:10.5px">Se muestran ${con.l.length} de ${con.n} (primero los resueltos, luego los más recientes).</p>` : '') : '';
    const arbT = p.arb && p.arb.length ? lbl('Arbitrajes', `${p.arb.length} · controversias registradas en el SEACE`) +
      tbl(['Inicio', 'Entidad', 'Contrato', 'Monto', 'Demandante', 'Tipo', 'Laudo'], p.arb.map(x => `<tr><td>${D(x[5])}</td><td style="white-space:normal">${esc(x[0])}</td><td style="white-space:normal">${esc(x[1])}${x[8] ? ` <small class="mutx">· ${esc(x[8])}</small>` : ''}</td><td>${S(x[2])}</td><td>${esc(x[3])}</td><td>${esc(x[4])}</td><td>${x[6] ? D(x[6]) : tag('en trámite', 'warn')}</td></tr>`)) : '';
    const adjT = adj.n ? lbl('Adjudicaciones en el SEACE', `${adj.n} ítems adjudicados · ${S(adj.m)} · 2018 en adelante`) +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div style="min-width:0"><div style="font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.5px">Monto adjudicado por año</div>${anios(adj.a)}</div>
       <div style="min-width:0"><div style="font-size:10px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Principales entidades contratantes</div>${adj.e.map(e => `<div class="pd-row" style="align-items:center"><span style="font-weight:600">${esc(e[0])}</span><b style="min-width:0;text-align:right;color:var(--ink)">${e[1]} · ${S(e[2])}</b></div>`).join('') || '<p class="mutx">—</p>'}</div></div>` +
      `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:11.5px;font-weight:700;color:var(--p2)">Ver las ${adj.l.length} adjudicaciones más recientes</summary>${tbl(['Buena pro', 'Entidad', 'Objeto', 'Proceso', 'Monto', 'Estado'], adj.l.map(x => `<tr><td>${D(x[0])}</td><td style="white-space:normal">${esc(x[1]) || '—'}</td><td style="white-space:normal">${esc(x[2])}</td><td style="white-space:normal;font-size:10px">${esc(x[5])}</td><td>${S(x[3])}</td><td>${esc(x[4])}</td></tr>`))}</details>` : '';
    const consT = p.cons && p.cons.length ? lbl('Consorcios', `${p.cons.length} · con quién se ha presentado`) +
      tbl(['Año', 'Consorcio', 'RUC consorcio', 'Otros integrantes'], p.cons.map(c => `<tr><td>${esc(c[0])}</td><td style="white-space:normal">${esc(c[2])}</td><td>${esc(c[1])}</td><td style="white-space:normal">${c[3].map(m => `<a class="fc" data-ruc="${esc(m[0])}" style="cursor:pointer">${esc(m[1] || m[0])}</a>`).join(' · ')}</td></tr>`)) : '';
    const socT = p.soc && p.soc.length ? lbl('Socios, representantes y vínculos', 'RNP · conformación jurídica · otras empresas donde figuran las mismas personas') +
      tbl(['Persona', 'Cargo', 'Otras empresas vinculadas'], p.soc.map(s => `<tr><td style="white-space:normal">${esc(s[0])}</td><td>${esc(s[1])}</td><td style="white-space:normal">${s[2].length ? s[2].map(o => `<a class="fc" data-ruc="${esc(o[0])}" style="cursor:pointer">${esc(o[1] || o[0])}</a>${o[2] ? ' ' + tag('sancionada', 'bad') : ''}`).join(' · ') : '<span class="mutx">—</span>'}</td></tr>`)) : '';
    return cabecera + kpis + sanT + penT + conT + arbT + adjT + consT + socT + lbl('Verificar en los portales oficiales', 'lo que no se publica en descarga masiva') + portales(ruc) +
      `<p class="mutx" style="font-size:10px;margin-top:10px">Fuentes: OECE · CONOSCE datos abiertos (sanciones e inhabilitaciones del Tribunal de Contrataciones desde 1998, multas, inhabilitaciones por mandato judicial, penalidades, contratos, adjudicaciones, arbitrajes, consorcios y conformación jurídica del RNP, 2018 en adelante) y SUNAT (padrón RUC). Las órdenes de compra y los contratos anteriores a 2018 no forman parte de la descarga masiva del OECE. Información referencial: confirme en el portal oficial antes de decidir.</p>`;
  }
  const portales = ruc => `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-top:8px">${PORTALES.map(([t, s, u]) => `<a href="${u}" target="_blank" rel="noopener" class="card" style="padding:10px 12px;text-decoration:none;color:inherit;border-left:3px solid var(--p2)"><div style="font-size:12px;font-weight:800;color:var(--p2)">${t} ↗</div><div style="font-size:10.5px;color:var(--ink2);margin-top:2px">${s}</div></a>`).join('')}</div><p class="mutx" style="font-size:10.5px;margin:6px 0 0">Copie el RUC <b>${ruc}</b> en el portal; estos sistemas no permiten enlazar la consulta directa.</p>`;

  function ui(el) {
    el.innerHTML = `<div class="card" style="padding:18px 20px;background:linear-gradient(135deg,#0F2A43,#1E5AA8);color:#fff;border-radius:12px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:260px">
        <div style="font-size:10px;font-weight:800;letter-spacing:1px;opacity:.8">VERIFICACIÓN DE PROVEEDORES DEL ESTADO</div>
        <div style="font-size:17px;font-weight:800;line-height:1.2;margin:3px 0 4px">¿Con quién está contratando?</div>
        <div style="font-size:11.5px;opacity:.9">Sanciones e inhabilitaciones desde 1998, multas, penalidades, contratos resueltos, arbitrajes, consorcios y socios · OECE, Tribunal de Contrataciones, Poder Judicial y SUNAT</div></div>
        <form id="prov-form" style="display:flex;gap:6px;flex:0 0 auto;align-items:center"><input id="prov-ruc" inputmode="numeric" pattern="[0-9]{11}" maxlength="11" placeholder="RUC (11 dígitos)" autocomplete="off" style="width:200px;padding:10px 12px;border:0;border-radius:8px;font:inherit;font-size:15px;font-weight:700;letter-spacing:1px;color:var(--ink)"><button class="btn" style="background:var(--gold);color:#1C1917;border:0;font-weight:800;padding:10px 16px;border-radius:8px">Verificar</button></form></div>
      <div id="prov-meta" style="font-size:10.5px;opacity:.75;margin-top:8px"></div></div><div id="prov-res"></div>`;
    idx().then(i => { $q(el, '#prov-meta').textContent = i.rucs ? `${i.rucs.toLocaleString('es-PE')} proveedores con historial · ${i.sancionados.toLocaleString('es-PE')} sancionados (${i.vigentes.toLocaleString('es-PE')} vigentes) · sanciones desde ${i.desde || 1998} · corte ${D(i.corte)}` : 'La base de proveedores aún no se ha cargado en este portal (Scripts/proveedores.py).'; });
    const res = $q(el, '#prov-res');
    const ir = async ruc => {
      ruc = String(ruc || '').replace(/\D/g, '');
      if (ruc.length !== 11) { res.innerHTML = '<p class="mutx" style="padding:10px 4px">Ingrese los 11 dígitos del RUC.</p>'; return; }
      $q(el, '#prov-ruc').value = ruc; res.innerHTML = '<p class="mutx" style="padding:10px 4px">Consultando…</p>';
      try { res.innerHTML = ficha(ruc, await buscar(ruc)); } catch (e) { res.innerHTML = `<p class="mutx" style="padding:10px 4px">No se pudo consultar (${esc(e.message)}).</p>`; }
      res.querySelectorAll('[data-ruc]').forEach(a => a.onclick = () => ir(a.dataset.ruc));
      res.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    $q(el, '#prov-form').onsubmit = e => { e.preventDefault(); ir($q(el, '#prov-ruc').value); };
    $q(el, '#prov-ruc').focus();
  }
  window.Proveedores = { ui, buscar, ficha };
})();

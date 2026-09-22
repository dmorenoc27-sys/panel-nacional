/* contrataciones.js — vista "Contrataciones" de una unidad ejecutora (todos los niveles, con y sin clave).
   Datos: Web/data/contrat/<ue>.json (Scripts/proveedores.py → generar_entidades): adjudicaciones del SEACE 2018→ por objeto
   (Obras, Bienes, Servicios, Consultoría de obra), tipo de proceso, proveedor, contratos resueltos, penalidades y arbitrajes.
   Contrataciones.ui(el, u, {obras: html de obras vinculadas a inversiones (SEACE por CUI), onCui(cui)}) */
(function () {
  const S = v => v == null ? '—' : 'S/ ' + (v >= 1e6 ? (v / 1e6).toFixed(1) + ' M' : v.toLocaleString('es-PE', { maximumFractionDigits: 0 }));
  const D = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : '—';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const OBJ = { O: ['Obras', '🏗️', '#1E5AA8'], B: ['Bienes', '📦', '#00897B'], S: ['Servicios', '🛠️', '#6A1B9A'], C: ['Consultoría de obra', '📐', '#B8860B'], X: ['Otros', '📄', '#8A94A6'] };
  const ORDEN = ['O', 'B', 'S', 'C', 'X'];
  const ANIO = new Date().getFullYear();
  const tile = (k, r, act) => `<div class="card" style="padding:12px 14px;border-left:5px solid ${OBJ[k][2]}"><div style="font-size:10px;font-weight:800;color:var(--mut);text-transform:uppercase;letter-spacing:.6px">${OBJ[k][1]} ${OBJ[k][0]}</div>
      <div style="font-size:19px;font-weight:800;color:${OBJ[k][2]};line-height:1.15;margin-top:3px">${r ? S(r[1]) : '—'}</div>
      <div style="font-size:11px;color:var(--ink2)">${r ? `${r[0]} proceso${r[0] > 1 ? 's' : ''} adjudicado${r[0] > 1 ? 's' : ''} desde 2018` : 'sin procesos desde 2018'}</div>
      <div style="font-size:10.5px;color:var(--ink);margin-top:2px">${ANIO}: ${act ? `<b>${act[0]}</b> · ${S(act[1])}` : '<span class="mutx">ninguno</span>'}</div></div>`;
  const lbl = (t, s) => `<div class="pd-lbl" style="margin-top:14px">${t}${s ? `<small>${s}</small>` : ''}</div>`;
  const tag = (t, k) => `<span class="tag ${k}">${t}</span>`;
  const prov = (ruc, nombre) => `<a class="fc" data-ruc="${esc(ruc)}" title="Verificar sanciones e historial del RUC ${esc(ruc)}" style="cursor:pointer">${esc(nombre || ruc)}</a>`;

  // ponytail: estilos del modulo inyectados una vez (paneles con profundidad, hover, estado activo y entrada animada del detalle)
  function css() {
    if (document.getElementById('ct-css')) return;
    const st = document.createElement('style'); st.id = 'ct-css'; st.textContent = `
      .ct-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}@media(max-width:1100px){.ct-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.ct-grid{grid-template-columns:1fr}}
      .ct-p{position:relative;overflow:hidden;background:#fff;border-radius:14px;padding:14px 16px 12px;border:1px solid rgba(15,42,67,.08);border-left:5px solid var(--c);box-shadow:0 1px 2px rgba(15,42,67,.06),0 6px 16px -8px rgba(15,42,67,.18);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease;user-select:none}
      .ct-p:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(15,42,67,.08),0 14px 28px -10px rgba(15,42,67,.32)}
      .ct-p:active{transform:translateY(-1px) scale(.995)}
      .ct-p.on{background:linear-gradient(135deg,var(--c) 0%,color-mix(in srgb,var(--c) 78%,#0F2A43) 100%);color:#fff;border-color:transparent;box-shadow:0 10px 26px -8px color-mix(in srgb,var(--c) 70%,transparent)}
      .ct-p.on .ct-k,.ct-p.on .ct-s,.ct-p.on .ct-y{color:rgba(255,255,255,.85)}.ct-p.on .ct-v{color:#fff}
      .ct-p::after{content:'▾';position:absolute;right:11px;top:8px;font-size:14px;color:var(--mut);transition:transform .25s ease}.ct-p.on::after{transform:rotate(180deg);color:#fff}
      .ct-k{font-size:10px;font-weight:800;color:var(--mut);text-transform:uppercase;letter-spacing:.7px;padding-right:16px}.ct-v{font-size:21px;font-weight:800;color:var(--c);line-height:1.1;margin-top:4px;font-variant-numeric:tabular-nums}
      .ct-s{font-size:11px;color:var(--ink2);margin-top:2px}.ct-y{font-size:10.5px;color:var(--ink);margin-top:3px}
      .ct-det{margin-top:12px;border-radius:14px;background:#fff;border:1px solid rgba(15,42,67,.08);box-shadow:0 8px 24px -12px rgba(15,42,67,.25);padding:14px 16px;animation:ctIn .28s ease}
      .ct-det .pd-lbl:first-child{margin-top:0}
      @keyframes ctIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      .ct-hero{position:relative;overflow:hidden;border-radius:16px;background:radial-gradient(900px 300px at 10% -20%,rgba(255,255,255,.14),transparent 60%),linear-gradient(135deg,#0A1B2E 0%,#123E7A 55%,#1E6BB8 100%);color:#fff;padding:18px 20px;box-shadow:0 14px 34px -14px rgba(10,27,46,.6)}
      .ct-hero input{transition:box-shadow .2s ease,transform .2s ease}.ct-hero input:focus{outline:0;box-shadow:0 0 0 4px rgba(255,205,68,.45);transform:scale(1.01)}
      .ct-strip{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}
      .ct-strip .tag{font-size:11px;padding:3px 9px;box-shadow:0 1px 2px rgba(15,42,67,.08)}
      .ct-bars{display:flex;gap:6px;align-items:flex-end;height:96px;padding:8px 4px 0}.ct-bars>div{flex:1;text-align:center;font-size:10px;color:var(--ink2)}.ct-bars i{display:block;border-radius:5px 5px 0 0;margin:2px 5px 0;background:var(--c,var(--p2));transform-origin:bottom;animation:ctGrow .5s ease both}
      @keyframes ctGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
      .ct-seg button{padding:4px 10px;font-size:11.5px;border-radius:999px;transition:background .15s,color .15s}.ct-seg button.on{background:var(--p2);color:#fff}`;
    document.head.appendChild(st);
  }
  // cuenta regresiva de los montos al pintar (movimiento sin librerias)
  function countUp(el) {
    el.querySelectorAll('[data-n]').forEach(x => { const v = +x.dataset.n, t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - k, 3); x.textContent = S(v * e); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  }
  const barras = (pares, col) => { const mx = Math.max(...pares.map(p => p[1])) || 1; return `<div class="ct-bars" style="--c:${col}">${pares.map(([k, v, n]) => `<div title="${k}: ${n} proceso${n === 1 ? '' : 's'} · ${S(v)}"><div style="font-size:9.5px;font-weight:700;color:var(--ink)">${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : v || ''}</div><i style="height:${Math.max(3, Math.round(56 * v / mx))}px"></i>${k}</div>`).join('')}</div>`; };

  function vista(el, u, d, opts) {
    css();
    const anios = Object.keys(d.anios || {}).sort(), act = (d.anios || {})[String(ANIO)] || {};
    const totN = ORDEN.reduce((a, k) => a + (d.res[k] ? d.res[k][0] : 0), 0), totM = ORDEN.reduce((a, k) => a + (d.res[k] ? d.res[k][1] : 0), 0);
    const tipos = Object.entries(d.tipos || {}).sort((a, b) => b[1][1] - a[1][1]);
    const nObras = opts.obras ? (opts.obras.match(/<tr class="l"/g) || []).length : 0;
    const sanc = (d.prov || []).filter(p => p[4]).length, resueltos = d.proc.filter(p => p[10]);
    const nAl = (d.n_res || 0) + (d.pen_tot ? d.pen_tot[0] : 0) + (d.arb ? d.arb.length : 0);
    // ---- paneles ----
    const panel = (k, col, ico, titulo, valor, sub, anio) => `<div class="ct-p" data-p="${k}" style="--c:${col}"><div class="ct-k">${ico} ${titulo}</div><div class="ct-v">${valor}</div><div class="ct-s">${sub}</div>${anio != null ? `<div class="ct-y">${anio}</div>` : ''}</div>`;
    const grid = `<div class="ct-grid">
      ${ORDEN.slice(0, 4).map(k => { const r = d.res[k], a = act[k]; return panel(k, OBJ[k][2], OBJ[k][1], OBJ[k][0], r ? `<span data-n="${r[1]}">${S(r[1])}</span>` : '—', r ? `${r[0]} proceso${r[0] > 1 ? 's' : ''} adjudicado${r[0] > 1 ? 's' : ''} desde 2018` : 'sin procesos desde 2018', `${ANIO}: ${a ? `<b>${a[0]}</b> · ${S(a[1])}` : '<span style="opacity:.7">ninguno</span>'}`); }).join('')}
      ${panel('AL', nAl ? '#D64545' : '#1B9E5A', '⚠️', 'Alertas contractuales', nAl ? `${d.n_res || 0} resuelto${d.n_res === 1 ? '' : 's'}` : 'Sin alertas', `${d.pen_tot ? `${d.pen_tot[0]} penalidad${d.pen_tot[0] > 1 ? 'es' : ''} · ${S(d.pen_tot[1])}` : 'sin penalidades'} · ${d.arb && d.arb.length ? `${d.arb.length} arbitraje${d.arb.length > 1 ? 's' : ''}` : 'sin arbitrajes'}`, d.m_res ? `Monto de contratos resueltos: ${S(d.m_res)}` : null)}
      ${panel('PR', sanc ? '#E39B1E' : '#00838F', '🏢', 'Proveedores', `${(d.prov || []).length} principales`, `por monto adjudicado 2018→${ANIO}`, sanc ? `<b style="color:inherit">${sanc} con sanción</b> del Tribunal` : 'ninguno sancionado')}
      ${panel('EV', '#1E5AA8', '📈', 'Evolución y procedimientos', `<span data-n="${totM}">${S(totM)}</span>`, `${totN} procesos · ${anios[0] || 2018}–${anios[anios.length - 1] || ANIO}`, `${tipos.length} tipos de procedimiento · corte ${D(d.corte)}`)}
      ${panel('OB', '#37474F', '🛣️', 'Obras por inversión (CUI)', nObras ? `${nObras} obra${nObras > 1 ? 's' : ''}` : '—', 'contratista, firma y plazo por CUI · SEACE', nObras ? 'clic para ver el detalle por inversión' : 'sin procesos de obra vinculados')}
    </div>`;
    // ---- detalles ----
    let filtro = 'T', q = '';
    const filas = () => d.proc.filter(p => (filtro === 'T' || p[1] === filtro) && (!q || (p[4] + ' ' + p[6] + ' ' + p[3] + ' ' + p[5]).toLowerCase().includes(q)));
    const filaP = p => `<tr${p[10] ? ' style="background:#FDF2F2"' : ''}><td>${D(p[0])}</td><td><span class="tag" style="background:${OBJ[p[1]][2]}1F;color:${OBJ[p[1]][2]}">${OBJ[p[1]][0]}</span></td><td style="white-space:normal;font-size:10.5px"><b>${esc(p[2])}</b><br><small class="mutx">${esc(p[3])}</small></td><td style="white-space:normal;font-size:10.5px">${esc(p[4])}${p[9] ? ` <a class="fc" data-cui="${esc(p[9])}" style="cursor:pointer;font-weight:700">CUI ${esc(p[9])}</a>` : ''}</td><td style="white-space:normal">${prov(p[5], p[6])}</td><td>${S(p[7])}</td><td>${p[10] ? tag('RESUELTO', 'bad') : tag(p[8] || '—', /Contratado|Consentido/.test(p[8]) ? 'ok' : 'warn')}</td></tr>`;
    const tabla = () => { const L = filas(); return L.length ? `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Buena pro</th><th>Objeto</th><th>Proceso</th><th>Descripción</th><th>Proveedor</th><th>Monto</th><th>Estado</th></tr>${L.map(filaP).join('')}</table></div>${d.proc.length >= 150 ? '<p class="mutx" style="font-size:10.5px">Se muestran los 150 procesos más recientes.</p>' : ''}` : '<p class="mutx" style="font-size:12px;padding:8px 4px">Ningún proceso con ese filtro.</p>'; };
    const listado = k => `${lbl(k === 'T' ? 'Procesos adjudicados' : `Procesos de ${OBJ[k][0].toLowerCase()}`, 'buena pro · SEACE 2018 en adelante')}
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><div class="ct-seg" style="display:flex;gap:4px;flex-wrap:wrap">${[['T', 'Todos'], ...ORDEN.slice(0, 4).map(x => [x, OBJ[x][0]])].map(([x, t]) => `<button class="btn${x === k ? ' on' : ''}" data-f="${x}">${t}</button>`).join('')}</div>
        <input type="search" id="ct-q" placeholder="Buscar por descripción, proveedor, RUC o nomenclatura…" style="flex:1;min-width:220px;padding:6px 10px;border:1.5px solid var(--line);border-radius:999px;font:inherit;font-size:12px"></div><div id="ct-tabla"></div>`;
    const detObj = k => { const r = d.res[k]; const pares = anios.map(y => [y, (d.anios[y][k] || [0, 0])[1], (d.anios[y][k] || [0, 0])[0]]); return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start"><div><div class="pd-lbl">${OBJ[k][1]} ${OBJ[k][0]} por año<small>monto adjudicado</small></div>${r ? barras(pares, OBJ[k][2]) : '<p class="mutx">Sin procesos.</p>'}</div>
      <div><div class="pd-lbl">Resumen<small>2018–${ANIO}</small></div><div class="pd-row"><b>Procesos</b><span>${r ? r[0] : 0}</span></div><div class="pd-row"><b>Adjudicado</b><span>${r ? S(r[1]) : '—'}</span></div><div class="pd-row"><b>Promedio</b><span>${r && r[0] ? S(r[1] / r[0]) : '—'}</span></div><div class="pd-row"><b>${ANIO}</b><span>${act[k] ? `${act[k][0]} · ${S(act[k][1])}` : 'ninguno'}</span></div><div class="pd-row"><b>Resueltos</b><span>${resueltos.filter(p => p[1] === k).length}</span></div></div></div>` + listado(k); };
    const detAL = () => (resueltos.length ? lbl('Contratos resueltos', `${d.n_res} · ${S(d.m_res)} · adjudicaciones cuyo contrato fue resuelto`) + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Buena pro</th><th>Objeto</th><th>Proceso</th><th>Descripción</th><th>Proveedor</th><th>Monto</th><th>Estado</th></tr>${resueltos.map(filaP).join('')}</table></div>` : '') +
      (d.pen && d.pen.length ? lbl('Penalidades aplicadas por la entidad', `${d.pen_tot[0]} · ${S(d.pen_tot[1])}`) + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Fecha</th><th>Proveedor</th><th>Objeto</th><th>Tipo</th><th>Motivo</th><th>Monto</th></tr>${d.pen.map(p => `<tr><td>${D(p[0])}</td><td style="white-space:normal">${prov(p[1], p[2])}</td><td>${esc(p[6])}</td><td>${esc(p[3])}</td><td style="white-space:normal;font-size:10px">${esc(p[5])}</td><td>${S(p[4])}</td></tr>`).join('')}</table></div>` : '') +
      (d.arb && d.arb.length ? lbl('Arbitrajes', 'controversias registradas en el SEACE') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Inicio</th><th>Contratista</th><th>Contrato</th><th>Monto</th><th>Demandante</th><th>Laudo</th></tr>${d.arb.map(a => `<tr><td>${D(a[0])}</td><td>${prov(a[1], a[1])}</td><td style="white-space:normal">${esc(a[2])}${a[6] ? ` <small class="mutx">· ${esc(a[6])}</small>` : ''}</td><td>${S(a[3])}</td><td>${esc(a[4])}</td><td>${a[5] ? D(a[5]) : tag('en trámite', 'warn')}</td></tr>`).join('')}</table></div>` : '') || '<p class="mutx" style="padding:6px 0">Sin contratos resueltos, penalidades ni arbitrajes registrados para esta entidad desde 2018.</p>';
    const detPR = () => d.prov && d.prov.length ? lbl('Principales proveedores', 'por monto adjudicado 2018→ · clic en el nombre para verificar sanciones e historial') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>#</th><th>Proveedor</th><th>RUC</th><th>Procesos</th><th>Adjudicado</th><th>Participación</th><th>Situación</th></tr>${d.prov.map((p, i) => `<tr><td>${i + 1}</td><td style="white-space:normal">${prov(p[0], p[1])}</td><td>${esc(p[0])}</td><td>${p[2]}</td><td>${S(p[3])}</td><td><span class="bar" style="display:inline-block;width:${Math.round(80 * p[3] / (d.prov[0][3] || 1))}px;height:6px;background:var(--p2);border-radius:3px;vertical-align:middle"></span> ${totM ? (100 * p[3] / totM).toFixed(1) : 0} %</td><td>${p[4] ? tag('sancionado', 'bad') : tag('sin sanciones', 'ok')}</td></tr>`).join('')}</table></div>` : '<p class="mutx">Sin proveedores adjudicados desde 2018.</p>';
    const detEV = () => { const pares = anios.map(y => { const r = d.anios[y]; return [y, ORDEN.reduce((a, k) => a + (r[k] ? r[k][1] : 0), 0), ORDEN.reduce((a, k) => a + (r[k] ? r[k][0] : 0), 0)]; });
      return `<div class="pd-lbl">Monto adjudicado por año<small>todos los objetos</small></div>${barras(pares, '#1E5AA8')}` +
        lbl('Por año y objeto', 'procesos · monto adjudicado') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Año</th>${ORDEN.slice(0, 4).map(k => `<th>${OBJ[k][0]}</th>`).join('')}<th>Total</th></tr>${[...anios].reverse().map(y => { const r = d.anios[y]; const t = ORDEN.reduce((a, k) => [a[0] + (r[k] ? r[k][0] : 0), a[1] + (r[k] ? r[k][1] : 0)], [0, 0]); return `<tr${+y === ANIO ? ' class="y"' : ''}><td>${y}</td>${ORDEN.slice(0, 4).map(k => `<td>${r[k] ? `${r[k][0]} · ${S(r[k][1])}` : '—'}</td>`).join('')}<td><b>${t[0]} · ${S(t[1])}</b></td></tr>`; }).join('')}</table></div>` +
        lbl('Por tipo de procedimiento', 'Ley 30225 / Ley 32069') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Procedimiento</th><th>Procesos</th><th>Adjudicado</th><th>Participación</th></tr>${tipos.map(([t, r]) => `<tr><td>${esc(t)}</td><td>${r[0]}</td><td>${S(r[1])}</td><td><span style="display:inline-block;width:${Math.round(90 * r[1] / (tipos[0][1][1] || 1))}px;height:6px;background:var(--p2);border-radius:3px;vertical-align:middle"></span> ${totM ? (100 * r[1] / totM).toFixed(1) : 0} %</td></tr>`).join('')}</table></div>`; };
    const detOB = () => opts.obras ? lbl('Obras vinculadas a las inversiones de la entidad', 'SEACE · proceso, contratista, firma y plazo por CUI') + opts.obras : '<p class="mutx">Sin procesos de obra vinculados a inversiones.</p>';
    const DET = { AL: detAL, PR: detPR, EV: detEV, OB: detOB };
    // ---- armado ----
    el.innerHTML = `<div style="padding:8px">
      <div class="ct-strip"><span class="tag" style="background:#EDF3FC;color:var(--p2)">${totN} procesos · ${S(totM)} adjudicados 2018–${ANIO}</span><span class="tag ${d.n_res ? 'bad' : 'ok'}">${d.n_res || 0} contrato${d.n_res === 1 ? '' : 's'} resuelto${d.n_res === 1 ? '' : 's'}</span><span class="tag ${d.pen_tot ? 'warn' : 'ok'}">${d.pen_tot ? `${d.pen_tot[0]} penalidad${d.pen_tot[0] > 1 ? 'es' : ''}` : 'sin penalidades'}</span><span class="mutx" style="margin-left:auto;font-size:11px">Clic en un panel para desplegar su detalle · SEACE · corte ${D(d.corte)}</span></div>
      ${grid}<div id="ct-det"></div>
      <div id="ct-prov" style="margin-top:14px"></div>
      <p class="mutx" style="font-size:10px;margin-top:10px">Fuente: OECE · CONOSCE datos abiertos (adjudicaciones, contratos, penalidades y arbitrajes del SEACE, 2018 en adelante). Las órdenes de compra y servicio (compras menores a 8 UIT) no forman parte de la descarga masiva del OECE.</p></div>`;
    countUp(el);
    const det = el.querySelector('#ct-det'); let abierto = null;
    const wire = () => {
      el.querySelectorAll('[data-ruc]').forEach(a => a.onclick = () => { const inp = el.querySelector('#prov-ruc'); if (inp) { inp.value = a.dataset.ruc; el.querySelector('#prov-form').requestSubmit ? el.querySelector('#prov-form').requestSubmit() : el.querySelector('#prov-form').dispatchEvent(new Event('submit', { cancelable: true })); } });
      el.querySelectorAll('[data-cui]').forEach(a => a.onclick = () => opts.onCui && opts.onCui(a.dataset.cui));
      det.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => opts.onCui && opts.onCui((tr.dataset.k || tr.dataset.sf || '').replace(/^cui:/, '')));
    };
    const pintarTabla = () => { const t = det.querySelector('#ct-tabla'); if (t) { t.innerHTML = tabla(); det.querySelectorAll('.ct-seg button').forEach(b => b.classList.toggle('on', b.dataset.f === filtro)); wire(); } };
    const abrir = k => {
      el.querySelectorAll('.ct-p').forEach(p => p.classList.toggle('on', p.dataset.p === k && abierto !== k));
      if (abierto === k) { abierto = null; det.innerHTML = ''; return; }
      abierto = k; filtro = ORDEN.includes(k) ? k : 'T'; q = '';
      det.innerHTML = `<div class="ct-det">${DET[k] ? DET[k]() : detObj(k)}</div>`;
      const qi = det.querySelector('#ct-q'); if (qi) qi.oninput = e => { q = e.target.value.trim().toLowerCase(); pintarTabla(); };
      det.querySelectorAll('.ct-seg button').forEach(b => b.onclick = () => { filtro = b.dataset.f; pintarTabla(); });
      pintarTabla(); wire(); det.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    el.querySelectorAll('.ct-p').forEach(p => p.onclick = () => abrir(p.dataset.p));
    if (window.Proveedores) Proveedores.ui(el.querySelector('#ct-prov'), { compacto: true, onCui: opts.onCui, sugerencias: [...new Map([...(d.prov || []).map(p => [p[0], p[1]]), ...d.proc.map(p => [p[5], p[6]])]).entries()] });
  }
  async function ui(el, u, opts) {
    opts = opts || {};
    el.innerHTML = '<p class="mutx" style="padding:12px">Cargando contrataciones…</p>';
    let d = null;
    try { const r = await fetch(`data/contrat/${u.cod}.json`); if (r.ok) d = await r.json(); } catch (e) { }
    if (!d) {
      el.innerHTML = `<div style="padding:8px"><div class="card" style="padding:18px;text-align:center"><div style="font-size:28px">📑</div><b style="color:var(--p2)">Sin procesos de selección registrados en el SEACE desde 2018 para esta unidad ejecutora</b><p class="mutx" style="font-size:11.5px;margin:6px 0 0">Puede que contrate solo por órdenes de compra (menores a 8 UIT) o que sus procesos los lleve otra unidad (sede central del pliego).</p></div>
        ${opts.obras ? lbl('Obras vinculadas a las inversiones de la entidad', 'SEACE · por CUI') + opts.obras : ''}${lbl('Verificar un proveedor', 'sanciones, inhabilitaciones, penalidades y contratos resueltos por RUC')}<div id="ct-prov"></div></div>`;
      el.querySelectorAll('[data-cui]').forEach(a => a.onclick = () => opts.onCui && opts.onCui(a.dataset.cui));
      css(); if (window.Proveedores) Proveedores.ui(el.querySelector('#ct-prov'), { compacto: true, onCui: opts.onCui });
      return;
    }
    vista(el, u, d, opts);
  }
  window.Contrataciones = { ui };
})();

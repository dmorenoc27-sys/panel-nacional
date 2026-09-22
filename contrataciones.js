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

  function vista(el, u, d, opts) {
    const anios = Object.keys(d.anios || {}).sort().reverse(), act = (d.anios || {})[String(ANIO)] || {};
    const totN = ORDEN.reduce((a, k) => a + (d.res[k] ? d.res[k][0] : 0), 0), totM = ORDEN.reduce((a, k) => a + (d.res[k] ? d.res[k][1] : 0), 0);
    let filtro = 'T', q = '';
    const anioTbl = anios.length ? `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Año</th>${ORDEN.slice(0, 4).map(k => `<th>${OBJ[k][0]}</th>`).join('')}<th>Total</th></tr>${anios.map(y => { const r = d.anios[y]; const t = ORDEN.reduce((a, k) => [a[0] + (r[k] ? r[k][0] : 0), a[1] + (r[k] ? r[k][1] : 0)], [0, 0]); return `<tr${+y === ANIO ? ' class="y"' : ''}><td>${y}</td>${ORDEN.slice(0, 4).map(k => `<td>${r[k] ? `${r[k][0]} · ${S(r[k][1])}` : '—'}</td>`).join('')}<td><b>${t[0]} · ${S(t[1])}</b></td></tr>`; }).join('')}</table></div>` : '';
    const tipos = Object.entries(d.tipos || {}).sort((a, b) => b[1][1] - a[1][1]);
    const tiposHTML = tipos.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${tipos.map(([t, r]) => `<span class="tag" style="background:var(--sup);color:var(--ink);font-weight:600">${esc(t)} <b>${r[0]}</b> · ${S(r[1])}</span>`).join('')}</div>` : '';
    const cab = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">${ORDEN.slice(0, 4).map(k => tile(k, d.res[k], act[k])).join('')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;font-size:11.5px;align-items:center">
        <span class="tag" style="background:#EDF3FC;color:var(--p2);font-size:11px">${totN} procesos · ${S(totM)} adjudicados 2018–${ANIO}</span>
        <span class="tag ${d.n_res ? 'bad' : 'ok'}" style="font-size:11px">${d.n_res || 0} contrato${d.n_res === 1 ? '' : 's'} resuelto${d.n_res === 1 ? '' : 's'}${d.m_res ? ' · ' + S(d.m_res) : ''}</span>
        <span class="tag ${d.pen_tot ? 'warn' : 'ok'}" style="font-size:11px">${d.pen_tot ? `${d.pen_tot[0]} penalidad${d.pen_tot[0] > 1 ? 'es' : ''} aplicada${d.pen_tot[0] > 1 ? 's' : ''} · ${S(d.pen_tot[1])}` : 'sin penalidades registradas'}</span>
        <span class="tag ${d.arb && d.arb.length ? 'warn' : 'ok'}" style="font-size:11px">${d.arb && d.arb.length ? `${d.arb.length} arbitraje${d.arb.length > 1 ? 's' : ''}` : 'sin arbitrajes'}</span>
        <span class="mutx" style="margin-left:auto">SEACE · corte ${D(d.corte)}</span></div>`;
    const filas = () => d.proc.filter(p => (filtro === 'T' || p[1] === filtro) && (!q || (p[4] + ' ' + p[6] + ' ' + p[3] + ' ' + p[5]).toLowerCase().includes(q)));
    const tabla = () => { const L = filas(); return L.length ? `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Buena pro</th><th>Objeto</th><th>Proceso</th><th>Descripción</th><th>Proveedor</th><th>Monto</th><th>Estado</th></tr>${L.map(p => `<tr${p[10] ? ' style="background:#FDF2F2"' : ''}><td>${D(p[0])}</td><td><span class="tag" style="background:${OBJ[p[1]][2]}1F;color:${OBJ[p[1]][2]}">${OBJ[p[1]][0]}</span></td><td style="white-space:normal;font-size:10.5px"><b>${esc(p[2])}</b><br><small class="mutx">${esc(p[3])}</small></td><td style="white-space:normal;font-size:10.5px">${esc(p[4])}${p[9] ? ` <a class="fc" data-cui="${esc(p[9])}" style="cursor:pointer;font-weight:700">CUI ${esc(p[9])}</a>` : ''}</td><td style="white-space:normal">${prov(p[5], p[6])}</td><td>${S(p[7])}</td><td>${p[10] ? tag('RESUELTO', 'bad') : tag(p[8] || '—', /Contratado|Consentido/.test(p[8]) ? 'ok' : 'warn')}</td></tr>`).join('')}</table></div>${d.proc.length >= 150 ? '<p class="mutx" style="font-size:10.5px">Se muestran los 150 procesos más recientes.</p>' : ''}` : '<p class="mutx" style="font-size:12px;padding:8px 4px">Ningún proceso con ese filtro.</p>'; };
    const provT = d.prov && d.prov.length ? lbl('Principales proveedores', 'por monto adjudicado 2018→ · clic para verificar sanciones e historial') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Proveedor</th><th>RUC</th><th>Procesos</th><th>Adjudicado</th><th>Situación</th></tr>${d.prov.map(p => `<tr><td style="white-space:normal">${prov(p[0], p[1])}</td><td>${esc(p[0])}</td><td>${p[2]}</td><td>${S(p[3])}</td><td>${p[4] ? tag('sancionado', 'bad') : tag('sin sanciones', 'ok')}</td></tr>`).join('')}</table></div>` : '';
    const penT = d.pen && d.pen.length ? lbl('Penalidades aplicadas por la entidad', `${d.pen_tot[0]} · ${S(d.pen_tot[1])}`) + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Fecha</th><th>Proveedor</th><th>Objeto</th><th>Tipo</th><th>Motivo</th><th>Monto</th></tr>${d.pen.map(p => `<tr><td>${D(p[0])}</td><td style="white-space:normal">${prov(p[1], p[2])}</td><td>${esc(p[6])}</td><td>${esc(p[3])}</td><td style="white-space:normal;font-size:10px">${esc(p[5])}</td><td>${S(p[4])}</td></tr>`).join('')}</table></div>` : '';
    const arbT = d.arb && d.arb.length ? lbl('Arbitrajes', 'controversias registradas en el SEACE') + `<div style="overflow-x:auto"><table class="pd-tbl"><tr><th>Inicio</th><th>Contratista</th><th>Contrato</th><th>Monto</th><th>Demandante</th><th>Laudo</th></tr>${d.arb.map(a => `<tr><td>${D(a[0])}</td><td>${prov(a[1], a[1])}</td><td style="white-space:normal">${esc(a[2])}${a[6] ? ` <small class="mutx">· ${esc(a[6])}</small>` : ''}</td><td>${S(a[3])}</td><td>${esc(a[4])}</td><td>${a[5] ? D(a[5]) : tag('en trámite', 'warn')}</td></tr>`).join('')}</table></div>` : '';
    el.innerHTML = `<div style="padding:8px">${cab}
      ${anioTbl ? lbl('Por año y objeto', 'procesos · monto adjudicado') + anioTbl : ''}
      ${tiposHTML ? lbl('Por tipo de procedimiento') + tiposHTML : ''}
      ${lbl('Procesos adjudicados', 'buena pro · SEACE 2018 en adelante')}
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><div id="ct-seg" style="display:flex;gap:4px;flex-wrap:wrap">${[['T', 'Todos'], ...ORDEN.slice(0, 4).map(k => [k, OBJ[k][0]])].map(([k, t]) => `<button class="btn" data-f="${k}" style="padding:4px 10px;font-size:11.5px">${t}</button>`).join('')}</div>
        <input type="search" id="ct-q" placeholder="Buscar por descripción, proveedor, RUC o nomenclatura…" style="flex:1;min-width:220px;padding:6px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:12px"></div>
      <div id="ct-tabla"></div>
      ${opts.obras ? `<div id="ct-obras">${lbl('Obras vinculadas a las inversiones de la entidad', 'SEACE · proceso, contratista, firma y plazo por CUI')}${opts.obras}</div>` : ''}
      ${provT}${penT}${arbT}
      ${lbl('Verificar un proveedor', 'sanciones, inhabilitaciones, penalidades y contratos resueltos por RUC')}<div id="ct-prov"></div>
      <p class="mutx" style="font-size:10px;margin-top:10px">Fuente: OECE · CONOSCE datos abiertos (adjudicaciones, contratos, penalidades y arbitrajes del SEACE, 2018 en adelante). Las órdenes de compra y servicio (compras menores a 8 UIT) no forman parte de la descarga masiva del OECE.</p></div>`;
    const pintar = () => { el.querySelector('#ct-tabla').innerHTML = tabla(); el.querySelectorAll('#ct-seg button').forEach(b => { const on = b.dataset.f === filtro; b.style.background = on ? 'var(--p2)' : ''; b.style.color = on ? '#fff' : ''; }); const ob = el.querySelector('#ct-obras'); if (ob) ob.style.display = filtro === 'T' || filtro === 'O' ? '' : 'none'; wire(); };
    const wire = () => {
      el.querySelectorAll('[data-ruc]').forEach(a => a.onclick = () => { const inp = el.querySelector('#prov-ruc'); if (inp) { inp.value = a.dataset.ruc; el.querySelector('#prov-form').requestSubmit ? el.querySelector('#prov-form').requestSubmit() : el.querySelector('#prov-form').dispatchEvent(new Event('submit', { cancelable: true })); } });
      el.querySelectorAll('[data-cui]').forEach(a => a.onclick = () => opts.onCui && opts.onCui(a.dataset.cui));
    };
    el.querySelectorAll('#ct-seg button').forEach(b => b.onclick = () => { filtro = b.dataset.f; pintar(); });
    el.querySelector('#ct-q').oninput = e => { q = e.target.value.trim().toLowerCase(); el.querySelector('#ct-tabla').innerHTML = tabla(); wire(); };
    if (window.Proveedores) Proveedores.ui(el.querySelector('#ct-prov'), { compacto: true });
    pintar();
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
      if (window.Proveedores) Proveedores.ui(el.querySelector('#ct-prov'), { compacto: true });
      return;
    }
    vista(el, u, d, opts);
  }
  window.Contrataciones = { ui };
})();

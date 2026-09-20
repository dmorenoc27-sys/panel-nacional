/* entidad.js — módulo "Mi entidad": datos internos del SIAF de una entidad, cifrados; se abren solo con su clave.
   Depende de helpers globales de index.html: $, j, M, N, P, cls, toast, UES, ficha(), ANIO, R. */
(function () {
  const F = n => n == null ? '—' : 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const FASE = { C: 'Compromiso', D: 'Devengado', G: 'Girado', P: 'Pagado', R: 'Rendición' };
  let E = null, META = {}, LAKE = {}, tabE = 'hoy', filtroMeta = '', q = '', modoInv = true, abierto = null;
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function descifrar(ue, clave) {
    const p = await j(`data/entidad/${ue}.enc`);
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(p.salt), iterations: p.iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.iv) }, key, b64(p.data));
    const txt = await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
    return JSON.parse(txt);
  }

  async function login() {
    const el = $('ent'); let lista = [];
    try { lista = await j('data/entidad/index.json'); } catch (e) { }
    el.innerHTML = `<div class="card" style="flex:0 0 auto;max-width:560px;margin:30px auto;padding:0"><div class="pd-hdr"><div class="pd-cui">MI ENTIDAD · ACCESO PRIVADO</div><div class="pd-title">Seguimiento interno con datos del SIAF</div><div class="pd-badges"><span class="pd-badge">Cifrado AES-256</span><span class="pd-badge">La clave nunca sale de tu navegador</span></div></div>
     <div style="padding:16px 18px"><p style="margin:0 0 10px;font-size:12.5px;color:var(--ink2)">Aquí la entidad ve lo que Transparencia no muestra: expediente por expediente, proveedor, documento, glosa y la fase en que está cada pago. La información es de la entidad: se publica cifrada y solo se abre con su clave.</p>
     ${lista.length ? `<label class="mutx" style="font-size:11px">Entidad</label><select id="ent-ue" style="width:100%;margin:4px 0 10px">${lista.map(x => `<option value="${x.ue}">${x.nombre || 'UE ' + x.ue} · SIAF al ${x.corte || ''}</option>`).join('')}</select>` : '<p class="mutx">Aún no hay entidades publicadas.</p>'}
     <label class="mutx" style="font-size:11px">Clave de acceso</label><input type="password" id="ent-clave" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;margin:4px 0 12px" placeholder="••••••••" autocomplete="current-password">
     <div style="display:flex;gap:8px;align-items:center"><button class="btn p" id="ent-ir">Entrar</button><span class="mutx" id="ent-msg" style="font-size:12px"></span></div></div></div>`;
    const ir = async () => { const ue = $('ent-ue')?.value, clave = $('ent-clave').value; if (!ue || !clave) return; $('ent-msg').textContent = 'Descifrando…';
      try { E = await descifrar(ue, clave); await preparar(ue); render(); } catch (e) { console.warn(e); $('ent-msg').textContent = 'Clave incorrecta o archivo no disponible.'; } };
    $('ent-ir').onclick = ir; $('ent-clave').onkeydown = e => { if (e.key === 'Enter') ir(); }; $('ent-clave').focus();
  }

  async function preparar(ue) {
    META = {}; E.metas.forEach(m => META[m.sec_func] = m);
    const uf = await ficha(ue).catch(() => null); if (!SEA_R) SEA_R = await fetch('data/seace/resumen.json').then(r => r.json()).catch(() => ({})); LAKE = {}; (uf?.cuis || []).forEach(c => LAKE[c.cui] = c); E._ue = UES.find(u => u.cod === ue) || { cod: ue, nombre: 'UE ' + ue }; E._uf = uf;
  }
  let SEA_R = null;   // resumen SEACE por CUI: conv, firma, ini, fin, monto, prov, ruc
  const inv = () => E.metas.filter(m => m.es_inv);
  const metasSel = () => modoInv ? inv() : E.metas;
  function tot() { const o = { cert: 0, comp: 0, dev: 0, gir: 0, pag: 0 }; metasSel().forEach(m => { for (const k in o) o[k] += m[k] || 0; }); o.pim = modoInv ? Object.values(LAKE).reduce((s, c) => s + (c.pim || 0), 0) : (E._uf?.pim_total || 0); return o; }
  function nombreMeta(m) { const c = LAKE[m.act_proy]; return c?.nombre || m.nombre_ap || m.nombre || `${m.act_proy} · meta ${m.meta}`; }

  const SW = (k, lbl, c) => `<div class="pd-kpi"><i style="background:${c}"></i><div class="l">${lbl}</div><div class="v">${M(k)} <small style="font-size:10px">M</small></div></div>`;
  const pila = []; let restaurando = false;
  function render() {
    if (!restaurando) { const cur = [tabE, filtroMeta, modoInv, q].join('|'); if (pila[pila.length - 1] !== cur) pila.push(cur); }
    restaurando = false;
    const el = $('ent'), u = E._ue, P_ = E.presupuesto, I = E.ingresos, T = modoInv ? P_.inversiones : P_.total, nAl = E.alertas.dev_sin_girar.length + E.alertas.comp_sin_devengar.length + E.alertas.cert_sin_comp.length;
    const tabs = [['hoy', '🏛 Alcalde'], ['res', 'Resumen'], ['ppto', 'Presupuesto'], ['inv', modoInv ? 'Inversiones' : 'Metas'], ['exp', 'Expedientes' + (filtroMeta ? ' · ' + filtroMeta : '')], ['ing', 'Ingresos'], ['plz', '⏱ Plazos'], ['pi', '🏅 Incentivos Municipales'], ['al', `Alertas (${nAl})`], ['prov', 'Proveedores'], ['cert', 'Certificaciones']];
    const cab = `<div class="pd-cui"><span>MI ENTIDAD · UE ${u.cod}</span><span>· SIAF al ${E.corte}</span><span>· Transparencia al ${R.corte}</span><span class="x" id="ent-salir" title="Cerrar sesión">×</span></div><div class="pd-title">${u.nombre}</div>`;
    // ponytail: vista alcalde = cabecera con el nombre y 6 paneles grandes; lo técnico (KPIs, pestañas, buscador) solo al pedir el detalle
    if (tabE === 'hoy') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">Vista de alta dirección · alcalde y gerencia municipal</span><span class="pd-badge">${u.pi ? 'PI tipo ' + u.pi : ''}</span><button class="btn" id="ent-tec" style="margin-left:auto;background:#fff;color:var(--p2)">Ver detalle técnico ▸</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-tec').onclick = () => { tabE = 'res'; render(); }; $('ent-salir').onclick = () => { E = null; login(); }; cuerpo(); return; }
    // ponytail: Plan de Incentivos también entra sin la cabecera técnica (KPIs, barra HOY, pestañas) — solo cabecera + volver
    if (tabE === 'pi') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">🏅 Plan de Incentivos ${ANIO}</span><button class="btn" id="ent-volver-pi" style="margin-left:auto;background:#fff;color:var(--p2)">‹ Volver</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-volver-pi').onclick = () => { tabE = 'hoy'; render(); }; $('ent-salir').onclick = () => { E = null; login(); }; cuerpo(); return; }
    // ponytail: Inversión pública también entra sin cabecera técnica — lista simple de obras; la ficha de cada una se abre debajo
    if (tabE === 'inv') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">🏗 Inversión pública</span>${abiertos.invLista ? `<input type="search" id="ent-invq" placeholder="Buscar por CUI o nombre…" value="${q}" style="margin-left:auto;padding:6px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:12px;width:240px">` : `<button class="btn" id="ent-ver-lista" style="background:#fff;color:var(--p2);margin-left:auto">📋 Ver lista completa</button>`}<button class="btn" id="ent-volver-inv" style="background:#fff;color:var(--p2)">‹ Volver</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-volver-inv').onclick = () => { tabE = 'hoy'; render(); }; $('ent-salir').onclick = () => { E = null; login(); };
      if ($('ent-invq')) $('ent-invq').oninput = e => { q = e.target.value.trim().toLowerCase(); cuerpo(); };
      if ($('ent-ver-lista')) $('ent-ver-lista').onclick = () => { abiertos.invLista = true; render(); };
      cuerpo(); return; }
    el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}
      <div class="pd-badges"><span class="pd-badge">${N(E.expedientes.length)} expedientes</span><span class="pd-badge">${N(inv().length)} inversiones · ${N(E.metas.length)} metas</span><span class="pd-badge">${N(E.modificaciones.length)} modificaciones presupuestales</span><span class="pd-badge ${nAl ? 'bad' : 'ok'}">${N(nAl)} alertas</span>
      <span class="sw" style="margin-left:auto"><button class="${modoInv ? 'on' : ''}" data-m="1">Solo inversiones</button><button class="${modoInv ? '' : 'on'}" data-m="0">Todo el gasto</button></span></div></div>
      <div class="pd-kpis">${SW(T.pim, 'PIM ' + ANIO, 'var(--gold)')}${SW(T.cert, 'Certificado', 'var(--p2)')}${SW(T.comp, 'Comprometido', 'var(--p)')}${SW(T.dev, 'Devengado', 'var(--ok)')}${SW(T.gir, 'Girado', 'var(--teal)')}${SW(T.pag, 'Pagado', '#5E35B1')}<div class="pd-kpi"><i style="background:var(--${cls(100 * T.dev / (T.pim || 1))})"></i><div class="l">Avance dev / PIM</div><div class="v" style="color:var(--${cls(100 * T.dev / (T.pim || 1))})">${(100 * T.dev / (T.pim || 1)).toFixed(1)} %</div></div></div>${(() => { const h = E._uf; if (!h || !h.pim || tabE === 'hoy') return ''; const dl = (h.dev || 0) - (P_.inversiones.dev || 0); return `<div style="display:flex;gap:18px;align-items:center;padding:6px 16px;background:linear-gradient(90deg,#E8F4FD,#F4F9FE);border-top:1px solid var(--grid);font-size:11.5px;flex-wrap:wrap"><b style="color:var(--p2)">HOY · inversiones según Transparencia (${R.corte.slice(0, 10)})</b><span>PIM <b>${M(h.pim)} M</b></span><span>Certificado <b>${M(h.cert)} M</b></span><span>Comprometido <b>${M(h.comp)} M</b></span><span>Devengado <b>${M(h.dev)} M</b></span><span>Girado <b>${M(h.gir)} M</b></span><span>Avance <b style="color:var(--${cls(100 * h.dev / h.pim)})">${P(100 * h.dev / h.pim)}</b></span>${dl > 1000 ? `<span style="color:var(--ok);font-weight:600">▲ ${M(dl)} M devengados desde el backup SIAF (${E.corte})</span>` : ''}<span class="mutx" style="margin-left:auto">el detalle por expediente/proveedor se actualiza con el respaldo SIAF</span></div>`; })()}</div>
     <div class="card" style="flex:1;min-height:0"><div class="ptabs">${tabs.map(([k, t]) => `<button class="${tabE === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}<button class="btn" id="ent-xls" style="margin-left:auto">⬇ Excel</button></div>
      <div class="filt" ${['res', 'ppto', 'ing', 'pi'].includes(tabE) ? 'hidden' : ''}><input type="search" id="ent-q" placeholder="Buscar en glosas, proveedores, documentos, CUI…" value="${q}"></div><div class="wrap" id="ent-body"></div></div>`;
    el.querySelectorAll('.ptabs button[data-t]').forEach(b => b.onclick = () => { tabE = b.dataset.t; if (tabE !== 'exp') filtroMeta = ''; render(); });
    el.querySelectorAll('.sw button').forEach(b => b.onclick = () => { modoInv = b.dataset.m === '1'; filtroMeta = ''; render(); });
    if ($('ent-q')) $('ent-q').oninput = e => { q = e.target.value.trim().toLowerCase(); cuerpo(); }; $('ent-salir').onclick = () => { E = null; login(); };
    $('ent-xls').onclick = () => { const rows = [...$('ent-body').querySelectorAll('tr:not(.det)')].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g, ' ').trim())); const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'MiEntidad'); XLSX.writeFile(wb, `mi_entidad_${u.cod}_${tabE}.xlsx`); };
    cuerpo();
  }
  const hit = (s) => !q || (s || '').toLowerCase().includes(q);
  const sec = (t, d) => `<div class="pd-lbl" style="margin:14px 8px 6px">${t}${d ? `<small>${d}</small>` : ''}</div>`;
  const barra = (v, max, col) => `<span class="bar" style="width:${Math.round(120 * Math.min(1, (v || 0) / (max || 1)))}px;background:${col || 'var(--p)'}"></span>`;
  // ponytail: un solo patrón para todas las pestañas — paneles resumen, clic = detalle en el mismo panel, clic otra vez = resumen
  const abiertos = {};
  // ponytail: total de beneficiarios = suma del campo "BENEFICIARIO" que trae el SSI por cada CUI (mismo shard cacheado que usa la ficha individual); se calcula una vez por entidad y se guarda aquí
  const benefCache = {};
  async function totalBeneficiarios(items, key) {
    const res = await Promise.all(items.map(it => ssi(it.act_proy).catch(() => null)));
    const total = res.reduce((s, f) => s + (f?.beneficiarios || 0), 0), conDato = res.filter(f => f?.beneficiarios).length;
    return benefCache[key] = { total, conDato };
  }
  function paneles(b, items, nota, min, key) {
    const K = key || tabE, ab = abiertos[K];
    const fit = min === 'fit';
    b.innerHTML = `<div style="display:grid;gap:${fit ? 8 : 10}px;padding:8px;${fit ? `grid-template-columns:repeat(3,1fr);${ab ? '' : 'grid-template-rows:1fr 1fr;'}height:100%;box-sizing:border-box` : `grid-template-columns:repeat(auto-fit,minmax(${min || 270}px,1fr))`}">${items.map(it => { const on = ab === it.id, col = it.color || 'var(--p)'; return `<div class="card pnl" data-p="${it.id}" style="flex:none;cursor:pointer;padding:0;border-left:5px solid ${col};${fit ? 'min-height:0;overflow:auto;display:flex;flex-direction:column;' + (ab && !on ? 'display:none;' : '') : ''}${on ? 'grid-column:1 / -1;' + (fit ? 'grid-row:1 / -1;' : '') + 'box-shadow:0 4px 18px rgba(15,42,67,.14)' : ''};background:${on ? '#fff' : `linear-gradient(135deg,#fff 55%,${it.bg || '#F4F8FC'})`}">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px"><div style="font-size:24px;line-height:1.2">${it.icono || ''}</div><div style="flex:1;min-width:0"><div class="pd-lbl" style="margin:0">${it.titulo}</div><div style="font-size:18px;font-weight:700;color:${col};margin:2px 0;line-height:1.25">${it.valor}</div><div class="mutx" style="font-size:11px;white-space:normal">${it.sub || ''}</div></div>${it.medidor != null ? `<div style="width:56px;height:56px;border-radius:50%;background:conic-gradient(${col} ${Math.min(100, it.medidor)}%,var(--grid) 0);display:grid;place-items:center;flex:none"><div style="width:42px;height:42px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;color:${col}">${Math.round(it.medidor)}%</div></div>` : ''}<div class="mutx" style="font-size:16px">${on ? '▲' : '▼'}</div></div>${it.info ? `<div style="padding:0 14px 12px">${it.info}</div>` : ''}
        ${on ? `<div class="pnl-det" style="border-top:1px solid var(--grid);padding:6px 10px 10px;cursor:default">${it.detalle()}</div>` : ''}</div>`; }).join('')}</div>${nota ? `<p class="mutx" style="font-size:11px;padding:0 16px 8px">${nota}</p>` : ''}`;
    b.querySelectorAll('.pnl').forEach(c => c.onclick = e => { if (e.target.closest('.pnl-det')) return; const id = c.dataset.p; abiertos[K] = abiertos[K] === id ? null : id; cuerpo(); if (abiertos[K]) b.querySelector(`.pnl[data-p="${id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  }
  // ---- vista alcalde: 6 paneles grandes, lenguaje llano, infograma en cada uno; clic = desarrollo + salto a la pestaña técnica ----
  const COLH = { ok: '#1B9E5A', warn: '#E39B1E', bad: '#D64545', p: '#1E5AA8', gris: '#B0BEC5', gold: '#C9A227', teal: '#00897B' };
  const apilada = segs => { const tot = segs.reduce((s, x) => s + x[1], 0) || 1; return `<div style="display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--grid)">${segs.filter(s => s[1]).map(([l, v, c]) => `<div title="${l}: ${v}" style="width:${100 * v / tot}%;background:${c};color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center">${v}</div>`).join('')}</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:11px">${segs.map(([l, v, c]) => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c};margin-right:4px"></i><b>${v}</b> ${l}</span>`).join('')}</div>`; };
  // ponytail: "estado de la cartera" como bloques grandes de color (idea del dashboard MINAM) — mismo dato que apilada(), presentación con más impacto
  const cartera = (segs, total) => `<div class="pd-lbl" style="margin:0 0 6px">ESTADO DE LA CARTERA — ${total} INVERSIONES</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px">${segs.filter(s => s[1]).map(([l, v, c]) => `<div style="background:${c};color:#fff;border-radius:8px;padding:8px 6px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.12)"><div style="font-size:19px;font-weight:800;line-height:1.1">${v}</div><div style="font-size:9px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;opacity:.92;margin-top:2px;line-height:1.2">${l}</div></div>`).join('')}</div>`;
  const barras = filas => `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:5px 10px;align-items:center;font-size:12px">${filas.map(([l, v, max, c, txt]) => `<span style="font-weight:600">${l}</span><div style="height:14px;background:var(--grid);border-radius:4px;overflow:hidden"><div style="width:${Math.min(100, 100 * v / (max || 1))}%;height:100%;background:${c}"></div></div><b style="min-width:70px;text-align:right">${txt}</b>`).join('')}</div>`;
  const ir = (k, txt) => `<div style="margin-top:8px"><button class="btn ir" data-ir="${k}" style="background:var(--p2);color:#fff">${txt || 'Abrir el detalle completo ▸'}</button></div>`;
  const hoyS = () => new Date().toISOString().slice(0, 10);
  // ponytail: vista alcalde = 4 botones grandes de acceso directo, sin datos; cada uno abre su pestana completa
  function hoyAlcalde(b) {
    const BTN = [
      { id: 'inv', icono: '\ud83c\udfd7', t: 'Inversi\u00f3n p\u00fablica', c: '#1E5AA8' },
      { id: 'pi', icono: '\ud83c\udfc5', t: 'Plan de Incentivos', c: '#C9A227' },
      { id: 'sea', icono: '\ud83d\udcd1', t: 'Contrataciones', c: '#00897B' },
      { id: 'al', icono: '\ud83d\udea8', t: 'Alertas', c: '#D64545' }
    ];
    b.innerHTML = `<style>.hoy-btn{transition:transform .18s,box-shadow .18s}.hoy-btn:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(15,42,67,.16)!important}.hoy-btn:active{transform:translateY(-1px)}</style>
    <div style="display:flex;align-items:center;justify-content:center;min-height:100%;padding:24px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:22px;max-width:980px;width:100%">${BTN.map(x => `
        <div class="pnl hoy-btn" data-go="${x.id}" style="border-left:0;border-radius:20px;box-shadow:0 3px 14px rgba(15,42,67,.09);align-items:center;justify-content:center;text-align:center;padding:34px 16px;gap:16px;background:linear-gradient(160deg,#fff 55%,${x.c}14)">
          <div style="width:68px;height:68px;border-radius:50%;background:${x.c}1F;display:grid;place-items:center;font-size:32px">${x.icono}</div>
          <div style="font-size:15px;font-weight:800;color:var(--p2);letter-spacing:-.01em">${x.t}</div>
        </div>`).join('')}</div>
    </div>`;
    b.querySelectorAll('[data-go]').forEach(c => c.onclick = () => { tabE = c.dataset.go; render(); });
  }
  const cap = t => { t = (t || '').replace(/^[\d.\s-]+/, '').toLowerCase(); t = t.charAt(0).toUpperCase() + t.slice(1); return t.length > 34 ? t.slice(0, 32) + '…' : t; };
  const FM = n => 'S/ ' + M(n) + ' M';
  const mlabel = s => META[s] ? (META[s].es_inv ? META[s].act_proy : 'meta ' + META[s].meta) : s;
  // ponytail: estado de ejecución de una inversión a partir de los campos ya cargados en LAKE (sin fetch adicional por CUI)
  const ESTINV = { culminada: ['Culminada', '#2E7D32'], ejecucion: ['En ejecución de obra', '#1565C0'], expediente: ['En expediente técnico', '#8E24AA'], viable: ['Viable · por iniciar', '#F9A825'], paralizada: ['Paralizada / suspendida', '#C62828'] };
  // ponytail: mismos 5 estados y colores que ESTINV, solo que con etiquetas cortas — para que los chips de "estado de la cartera" nunca partan en 2 líneas
  const ESTCHIP = { culminada: 'Culminada', ejecucion: 'En ejecución', expediente: 'Expediente técnico', viable: 'Por iniciar', paralizada: 'Paralizada' };
  // ponytail: mismo patrón "editable por David" del dashboard MINAM (Dashboard_UE003_MINAM/index.html) — array vacío listo para que él agregue normativa/prensa/documentos.
  // Tipos: NORMA=normativa · PRENSA=nota de prensa · DOC=documento fijo · SEG=en seguimiento. pin:true = fijado arriba.
  // Agregar así: {f:'AAAA-MM-DD', t:'NORMA', ti:'Título', d:'detalle corto (opcional)', u:'https://...'}
  const NOVEDADES = [];
  const NOV_TIPO = { NORMA: ['NORMATIVA', '#6A1B9A'], PRENSA: ['PRENSA', '#1565C0'], DOC: ['DOCUMENTO', '#2E7D32'], SEG: ['EN SEGUIMIENTO', '#E65100'] };
  function novHTML() {
    if (!NOVEDADES.length) return '<div style="font-size:11px;color:#90A4AE;padding:8px 4px">Sin novedades por ahora.</div>';
    const hoy = new Date();
    const items = NOVEDADES.slice().sort((a, b) => ((a.pin ? 1 : 0) - (b.pin ? 1 : 0)) || b.f.localeCompare(a.f));
    return items.map(n => {
      const m = NOV_TIPO[n.t] || NOV_TIPO.NORMA;
      const dias = (hoy - new Date(n.f + 'T12:00:00')) / 86400000;
      const nuevo = !n.pin && dias <= 7;
      const fch = n.f.slice(8, 10) + '/' + n.f.slice(5, 7) + '/' + n.f.slice(2, 4);
      return `<a href="${n.u || '#'}" target="_blank" rel="noopener" style="display:block;text-decoration:none;background:#fff;border:1px solid #E5E9EF;border-left:4px solid ${m[1]};border-radius:10px;padding:7px 9px;margin-bottom:7px;box-shadow:0 1px 3px rgba(16,24,40,.05)">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;flex-wrap:wrap">
          ${n.pin ? '<span style="font-size:9px">📌</span>' : ''}
          <span style="font-size:8px;font-weight:900;color:#fff;background:${m[1]};border-radius:4px;padding:1.5px 5px;letter-spacing:.4px">${m[0]}</span>
          ${nuevo ? '<span style="font-size:8px;font-weight:900;color:#fff;background:#C62828;border-radius:4px;padding:1.5px 5px">NUEVO</span>' : ''}
          <span style="font-size:8.5px;font-weight:700;color:#90A4AE;margin-left:auto">${fch}</span>
        </div>
        <div style="font-size:11px;font-weight:800;color:#263238;line-height:1.3">${n.ti}</div>
        ${n.d ? `<div style="font-size:9.5px;color:#607D8B;line-height:1.35;margin-top:2px">${n.d}</div>` : ''}
      </a>`;
    }).join('');
  }
  function estadoInv(c) {
    const s = ((c.situacion || '') + ' ' + (c.estado || '')).toUpperCase();
    if (/CULMIN|CERRAD/.test(s) || (c.avance_fisico != null && c.avance_fisico >= 99.5)) return 'culminada';
    if (/SUSPEND|PARALIZ|DESACTIV|ABANDON/.test(s)) return 'paralizada';
    if (/EJECUCI/.test(s) || (c.avance_fisico != null && c.avance_fisico > 0)) return 'ejecucion';
    if (/EXPEDIENTE|PERFIL|FORMULA|ESTUDIO/.test(s) || c.f12b) return 'expediente';
    return 'viable';
  }
  // ponytail: Leaflet se carga una sola vez, bajo demanda (igual que el dashboard MINAM); si no hay red, el mapa simplemente no aparece
  let _leafletP = null;
  function cargarLeaflet() {
    if (window.L) return Promise.resolve();
    if (_leafletP) return _leafletP;
    _leafletP = new Promise(res => {
      if (!document.getElementById('leaflet-css')) { const lc = document.createElement('link'); lc.id = 'leaflet-css'; lc.rel = 'stylesheet'; lc.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(lc); }
      const ls = document.createElement('script'); ls.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; ls.onload = res; ls.onerror = res; document.head.appendChild(ls);
    });
    return _leafletP;
  }
  function pintarMapaInv(items) {
    cargarLeaflet().then(() => {
      const el = $('inv-mapa'); if (!el || !window.L) return;
      const mp = L.map(el, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mp);
      const pts = [];
      items.forEach(it => { if (it.lat == null || it.lon == null) return; const [lbl, col] = ESTINV[it.est]; L.circleMarker([it.lat, it.lon], { radius: 7, color: '#fff', weight: 1.5, fillColor: col, fillOpacity: .9 }).addTo(mp).bindTooltip(`<b>${it.cui}</b> ${it.nombre}<br>${lbl}`); pts.push([it.lat, it.lon]); });
      if (pts.length) mp.fitBounds(pts, { padding: [24, 24], maxZoom: 13 }); else mp.setView([-9.19, -75.02], 5);
    });
  }
  // ---- embudo de ejecución (PIM → Certificado → Compromiso anual → Compromiso mensual → Devengado → Girado → Pagado) ----
  // cada etapa es un subconjunto de la anterior: se dibuja como un embudo real (trapecios que se angostan), no una lista de barras.
  // rampa ordinal validada (dataviz skill, --ordinal, un solo matiz azul, 5 pasos con ΔL≥0.06): Compromiso anual/mensual comparten matiz
  // (son la misma idea — "lo comprometido" — vista anual vs. acumulada al mes) y Girado/Pagado comparten el matiz final ("ya salió de la cuenta").
  function funnelGasto(T) {
    const raw = [
      ['PIM', T.pim, '#86b6ef'], ['Certificado', T.cert, '#5598e7'],
      ['Compromiso anual', T.comp_anual, '#2a78d6'], ['Compromiso mensual', T.comp, '#2a78d6'],
      ['Devengado', T.dev, '#184f95'], ['Girado', T.gir, '#0d366b'], ['Pagado', T.pag, '#0d366b']
    ];
    const base = T.pim || 1;
    let prevPct = 1;
    // ponytail: el embudo nunca se ensancha — si una etapa posterior supera a la anterior (desfase de corte de datos), se recorta al ancho previo
    const rows = raw.map(([nombre, valor, color]) => { const pct = Math.max(0, Math.min(prevPct, (valor || 0) / base)); prevPct = pct; return { nombre, valor, color, pct }; });
    const W = 640, CX = W / 2, H_ST = 56, GAP = 7, PAD = 4;
    const H = PAD * 2 + rows.length * H_ST + (rows.length - 1) * GAP;
    // primera pasada: geometría + texto de cada etapa y si cabe adentro, sin dibujar nada aún
    let prevHw = CX;
    const calc = rows.map((r, i) => {
      const hw = Math.max(8, CX * r.pct), topHw = i === 0 ? CX : prevHw;
      const txt = `${r.nombre} · ${FM(r.valor)} · ${Math.round(r.pct * 100)}%`;
      // ponytail: sin medición real del DOM (esto es una plantilla de texto, no un canvas vivo) — ancho estimado a ~7.2px/carácter a 13px, suficiente para decidir adentro/afuera
      const cabeAdentro = txt.length * 7.2 < Math.min(topHw, hw) * 2 - 24;
      prevHw = hw;
      return { ...r, hw, topHw, txt, cabeAdentro };
    });
    // el margen derecho tiene que caber la etiqueta más larga que quedó afuera, si no se corta contra el viewBox
    const margen = Math.max(160, ...calc.filter(c => !c.cabeAdentro).map(c => c.txt.length * 6.6 + 60), 0);
    let y = PAD;
    const partes = calc.map(r => {
      const yTop = y, yBot = y + H_ST, cy = yTop + H_ST / 2;
      const etiqueta = r.cabeAdentro
        // ponytail: style="" en vez de atributos fill/font-size — style.css trae una regla global "svg text{fill:var(--mut);font-size:11px}" que gana sobre atributos de presentación
        ? `<text x="${CX}" y="${cy + 4.5}" text-anchor="middle" style="font-size:13px;font-weight:700;fill:#fff">${r.txt}</text>`
        : `<line x1="${CX + r.hw}" y1="${cy}" x2="${CX + CX + 24}" y2="${cy}" stroke="var(--mut)" stroke-width="1"/><circle cx="${CX + r.hw}" cy="${cy}" r="2.5" fill="var(--mut)"/><text x="${CX + CX + 30}" y="${cy + 4.5}" style="font-size:12.5px;font-weight:700;fill:var(--ink2)">${r.txt}</text>`;
      y += H_ST + GAP;
      return `<polygon points="${CX - r.topHw},${yTop} ${CX + r.topHw},${yTop} ${CX + r.hw},${yBot} ${CX - r.hw},${yBot}" fill="${r.color}"/>${etiqueta}`;
    }).join('');
    const sinDev = Math.max(0, (T.pim || 0) - (T.dev || 0));
    const maxW = Math.round((W + margen) * (760 / 870)); // mantiene la misma escala px↔unidad-svg (13px de texto siempre se ve como 13px) sea cual sea el margen
    return `<svg viewBox="0 0 ${W + margen} ${H}" style="width:100%;max-width:${maxW}px;height:auto;display:block;margin:8px auto 2px">${partes}</svg>${sinDev > 0 ? `<p class="mutx" style="text-align:center;font-size:11px;margin:2px 0 0">${FM(sinDev)} (${Math.round(100 * sinDev / base)}%) del PIM aún no se devenga</p>` : ''}`;
  }
  // ponytail: overlay liviano para el detalle de un stat (embudo / fuentes) — igual patrón visual que la ficha de inversión, pero el tablero de resumen queda fijo (sin scroll) en todo momento
  function cerrarDetalleResumen() { const ov = $('res-overlay'); if (ov) ov.remove(); }
  function verDetalleResumen(icono, titulo, html) {
    let ov = $('res-overlay'); if (!ov) { ov = document.createElement('div'); ov.id = 'res-overlay'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;animation:fiIn .16s ease';
    ov.innerHTML = `<div class="pd-hdr" style="border-radius:0;flex:0 0 auto"><div class="pd-cui"><span>${icono} ${titulo}</span><span class="x" id="res-cerrar" title="Cerrar">×</span></div></div><div style="flex:1;min-height:0;overflow:auto;padding:16px 20px">${html}</div>`;
    ov.querySelector('#res-cerrar').onclick = cerrarDetalleResumen;
  }
  // ponytail: resumen de "Inversión pública" al entrar — tablero fijo de dos columnas (KPIs + cartera a la izquierda, mapa a la derecha), sin scroll, como el dashboard MINAM; el detalle de cada KPI (embudo, fuentes) se abre en un overlay para no romper el layout fijo
  function resumenInversion(b, T, P_) {
    const items = inv().map(m => ({ ...m, c: LAKE[m.act_proy] || {} }));
    const ftsInv = P_.fuentes_inv && Object.keys(P_.fuentes_inv).length ? Object.values(P_.fuentes_inv).filter(f => f.pim > 0).sort((a, c) => c.pim - a.pim) : null;
    const fts = ftsInv || Object.values(P_.fuentes).filter(f => f.pim > 0).sort((a, c) => c.pim - a.pim);
    const est = { culminada: [], ejecucion: [], expediente: [], viable: [], paralizada: [] };
    items.forEach(it => est[estadoInv(it.c)].push(it));
    const mapItems = items.map(it => ({ cui: it.act_proy, nombre: (it.c.nombre || nombreMeta(it)).slice(0, 70), lat: it.c.lat, lon: it.c.lon, est: estadoInv(it.c) }));
    const ueKey = E._ue.cod, bc = benefCache[ueKey];
    const estList = Object.entries(est).filter(([, v]) => v.length).map(([k, v]) => [ESTCHIP[k], v.length, ESTINV[k][1]]);
    const pim1 = T.pim || 1;
    // ponytail: mismas medidas/colores que kpi()/chip()/barra() del dashboard MINAM (Dashboard_UE003_MINAM/index.html) — mismo look, tres columnas iguales
    const kpiT = (id, icono, num, lbl, col, bg, br) => `<div class="pnl" data-p="${id}" style="cursor:pointer;background:${bg};border:1.5px solid ${br};border-left:5px solid ${col};border-radius:14px;padding:8px 12px;display:flex;align-items:center;gap:9px;box-shadow:0 1px 5px rgba(16,24,40,.08)">
      <span style="font-size:22px;flex:none;line-height:1">${icono}</span>
      <div style="min-width:0"><div style="font-size:16px;font-weight:900;color:${col};letter-spacing:-.4px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${num}">${num}</div>
      <div style="font-size:9px;font-weight:800;color:#546E7A;margin-top:3px;line-height:1.25;text-transform:uppercase;letter-spacing:.3px">${lbl}</div></div>
    </div>`;
    const chipPill = (n, lbl, col) => `<div style="flex:1;background:${col};border-radius:13px;padding:7px 4px;text-align:center;color:#fff;box-shadow:0 2px 8px ${col}55">
      <div style="font-size:17px;font-weight:900;line-height:1">${n}</div>
      <div style="font-size:8.5px;font-weight:800;margin-top:2px;text-transform:uppercase;letter-spacing:.2px;opacity:.95;line-height:1.2">${lbl}</div>
    </div>`;
    const barra = (lbl, val, pctv, col) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:10px;font-weight:800;color:#37474F;margin-bottom:3px"><span>${lbl}</span><span style="color:${col}">${FM(val)}${pctv != null ? ` · ${Math.round(pctv)}%` : ''}</span></div>
      <div style="height:7px;background:#ECEFF3;border-radius:6px;overflow:hidden"><div style="height:100%;width:${pctv != null ? Math.min(pctv, 100) : 100}%;background:linear-gradient(90deg,${col}CC,${col});border-radius:6px"></div></div>
    </div>`;
    b.innerHTML = `<div style="display:flex;gap:10px;height:100%;box-sizing:border-box;padding:8px">
      <div style="flex:1.15;min-width:0;display:flex;flex-direction:column;gap:8px;min-height:0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${kpiT('kpi', '💰', FM(T.pim), `Resumen general · devengado ${Math.round((T.dev || 0) * 100 / pim1)}%`, '#0F2A43', '#F4FBF4', '#C8E6C9')}
          ${kpiT('benef', '👥', bc ? N(bc.total) : '…', bc ? `Beneficiarios · ${bc.conDato}/${items.length} con dato` : 'Beneficiarios · calculando…', '#1B5E20', '#F4FBF4', '#C8E6C9')}
          ${kpiT('fuentes', '🏦', fts[0] ? cap(fts[0].nombre) : 'sin datos', `Por fuente · ${fts.length} fuentes`, '#1565C0', '#F5F9FF', '#BBDEFB')}
          ${kpiT('cert', '📋', FM(T.cert), `Certificación · ${Math.round((T.cert || 0) * 100 / pim1)}% del PIM`, '#6A1B9A', '#F8F3FC', '#D8BFE0')}
          ${kpiT('comp', '🤝', FM(T.comp_anual), `Compromiso · ${Math.round((T.comp_anual || 0) * 100 / pim1)}% del PIM`, '#00838F', '#F0FBFC', '#B2E0E4')}
          ${kpiT('dev', '💵', FM(T.dev), `Devengado · ${Math.round((T.dev || 0) * 100 / pim1)}% del PIM`, '#E65100', '#FDEEE3', '#F5CBA0')}
        </div>
        <div class="card" style="flex:none;padding:9px 11px">
          <div class="pd-lbl" style="margin:0 0 7px">ESTADO DE LA CARTERA — ${items.length} INVERSIONES</div>
          <div style="display:flex;gap:7px">${estList.map(([l, v, c]) => chipPill(v, l, c)).join('')}</div>
        </div>
        <div class="card" style="flex:1;min-height:0;padding:9px 11px;overflow:auto">
          <div class="pd-lbl" style="margin:0 0 8px">EJECUCIÓN PRESUPUESTAL</div>
          ${barra('PIM', T.pim, null, '#37474F')}
          ${barra('Certificación', T.cert, (T.cert || 0) * 100 / pim1, '#6A1B9A')}
          ${barra('Compromiso', T.comp_anual, (T.comp_anual || 0) * 100 / pim1, '#00838F')}
          ${barra('Devengado', T.dev, (T.dev || 0) * 100 / pim1, '#E65100')}
        </div>
      </div>
      <div class="card" style="flex:1;min-width:0;display:flex;flex-direction:column;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="pd-lbl" style="margin:0">MAPA DE INVERSIONES</div>
          <div style="display:flex;gap:8px;font-size:9px;font-weight:700;color:#546E7A;flex-wrap:wrap">${Object.values(ESTINV).map(([l, c]) => `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:3px"></span>${l}</span>`).join('')}</div>
        </div>
        <div id="inv-mapa" style="flex:1;min-height:0;border-radius:10px;background:var(--grid)"></div>
      </div>
      <div class="card" style="flex:0 0 230px;min-width:0;display:flex;flex-direction:column;padding:10px 10px">
        <div style="padding:0 2px 8px;border-bottom:2px solid #E8F5E9;margin-bottom:8px">
          <div class="pd-lbl" style="margin:0">🔔 NOVEDADES</div>
          <div style="font-size:8.5px;font-weight:700;color:#90A4AE;margin-top:2px;letter-spacing:.3px">NORMATIVA · PRENSA · DOCUMENTOS</div>
        </div>
        <div style="flex:1;min-height:0;overflow:auto">${novHTML()}</div>
      </div>
    </div>`;
    pintarMapaInv(mapItems);
    if (!bc) totalBeneficiarios(items, ueKey).then(() => { if (tabE === 'inv' && !abiertos.invLista && !abiertos.inv) cuerpo(); });
    b.querySelector('[data-p="kpi"]').onclick = () => verDetalleResumen('💰', 'RESUMEN GENERAL', funnelGasto(T));
    b.querySelector('[data-p="cert"]').onclick = () => verDetalleResumen('📋', 'CERTIFICACIÓN', funnelGasto(T));
    b.querySelector('[data-p="comp"]').onclick = () => verDetalleResumen('🤝', 'COMPROMISO', funnelGasto(T));
    b.querySelector('[data-p="dev"]').onclick = () => verDetalleResumen('💵', 'DEVENGADO', funnelGasto(T));
    b.querySelector('[data-p="benef"]').onclick = () => verDetalleResumen('👥', 'BENEFICIARIOS DIRECTOS', bc ? `<p class="mutx">Suma del campo "beneficiarios (habitantes)" que cada inversión declara en su ficha del SSI (Banco de Inversiones).${items.length - bc.conDato ? ` ${items.length - bc.conDato} inversión(es) aún no tienen ese dato registrado en el MEF.` : ''}</p>` : '<p class="mutx">Cargando…</p>');
    b.querySelector('[data-p="fuentes"]').onclick = () => verDetalleResumen('🏦', 'POR FUENTE DE FINANCIAMIENTO', fts.map(f => `<div style="margin-bottom:14px"><div style="font-weight:800;color:var(--p2);font-size:12.5px;margin-bottom:4px">${cap(f.nombre)}</div>${barras([['PIM', f.pim, fts[0].pim, 'var(--gold)', FM(f.pim)], ['Devengado', f.dev, fts[0].pim, 'var(--ok)', FM(f.dev)]])}</div>`).join(''));
  }
  // ponytail: ficha de inversión en overlay a pantalla completa — paneles resumen que se abren uno a la vez, mismo patrón que paneles()
  let invPanel = null;
  function pnlFicha(items) {
    return `<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">${items.map(it => {
      const on = invPanel === it.id;
      return `<div class="card pnl fi-pnl" data-fp="${it.id}" style="cursor:pointer;padding:0;border-left:5px solid ${it.color};${on ? 'grid-column:1 / -1;box-shadow:0 6px 22px rgba(15,42,67,.14)' : ''};background:${on ? '#fff' : `linear-gradient(135deg,#fff 55%,${it.bg || '#F4F8FC'})`}">
        <div style="display:flex;align-items:flex-start;gap:10px;padding:11px 13px">
          <div style="font-size:19px;line-height:1.2">${it.icono || ''}</div>
          <div style="flex:1;min-width:0"><div class="pd-lbl" style="margin:0;font-size:9.5px">${it.titulo}</div><div style="font-size:14.5px;font-weight:700;color:${it.color};margin:1px 0;line-height:1.25">${it.valor}</div><div class="mutx" style="font-size:10.5px;white-space:normal">${it.sub || ''}</div></div>
          ${it.medidor != null ? `<div style="width:40px;height:40px;border-radius:50%;background:conic-gradient(${it.color} ${Math.min(100, Math.max(0, it.medidor))}%,var(--grid) 0);display:grid;place-items:center;flex:none"><div style="width:30px;height:30px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:9px;font-weight:700;color:${it.color}">${Math.round(it.medidor)}%</div></div>` : ''}
          <div class="mutx" style="font-size:12px">${on ? '▲' : '▼'}</div>
        </div>
        ${on ? `<div style="border-top:1px solid var(--grid);padding:9px 13px 12px;cursor:default;font-size:11.5px">${it.detalle()}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }
  function cerrarFicha() { const ov = $('inv-overlay'); if (ov) ov.remove(); abiertos.inv = null; invPanel = null; cuerpo(); }
  function mostrarCargando(cui) {
    let ov = $('inv-overlay'); if (!ov) { ov = document.createElement('div'); ov.id = 'inv-overlay'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `<p class="mutx">Cargando ficha de la inversión ${cui}…</p>`;
  }
  function pintarFicha(cui, f, c, sp) {
    let ov = $('inv-overlay'); if (!ov) { ov = document.createElement('div'); ov.id = 'inv-overlay'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;animation:fiIn .16s ease';
    const nombre = f?.nombre || c.nombre || 'Inversión ' + cui;
    const items = !f ? [] : [
      { id: 'ppto', icono: '💰', titulo: 'PRESUPUESTO', valor: F(c.pim ?? f.pim), sub: `certificado ${F(c.cert)} · devengado ${F(c.dev)}${f.costo ? ` · costo actualizado ${F(f.costo)}` : ''}`, color: 'var(--p2)', bg: '#EAF3FC', medidor: c.pim ? 100 * (c.dev || 0) / c.pim : null,
        detalle: () => `<table class="pd-tbl"><tr><th>PIM</th><th>Certificado</th><th>Comprometido</th><th>Devengado</th><th>Girado</th></tr><tr><td>${F(c.pim)}</td><td>${F(c.cert)}</td><td>${F(c.comp)}</td><td>${F(c.dev)}</td><td>${F(c.gir)}</td></tr></table>${bancoExtra(c, f) || ''}` },
      { id: 'obra', icono: '🏗', titulo: 'AVANCE DE LA OBRA', valor: f.av_fis != null ? f.av_fis.toFixed(0) + '% físico' : 'sin avance físico', sub: `financiero ${f.av_ejec != null ? f.av_ejec.toFixed(0) + '%' : '—'} · ${f.inicio || '—'} → ${f.fin || '—'}`, color: f.av_fis != null ? `var(--${cls(f.av_fis)})` : 'var(--p)', bg: '#F1F8F2', medidor: f.av_fis,
        detalle: () => `<div style="display:flex;gap:18px;margin-bottom:8px">${donut(f.av_ejec, `var(--${cls(f.av_ejec || 0)})`, 'Av. financiero')}${donut(f.av_fis, `var(--${cls(f.av_fis || 0)})`, 'Av. físico')}</div><div class="pd-row"><b>Ubicación</b><span>${[c.dist, c.prov, c.dpto].filter(Boolean).join(' / ') || '—'}</span></div><div class="pd-row"><b>Modalidad</b><span>${f.modalidad || '—'}</span></div>` },
      { id: 'sit', icono: '📋', titulo: 'SITUACIÓN ACTUAL', valor: (f.situacion || c.situacion || 'sin estado'), sub: f.f12b ? `Formato 12-B · ${f.f12b}` : '', color: /CULMIN|CERRAD/.test((f.situacion || '').toUpperCase()) ? 'var(--ok)' : /SUSPEND|PARALIZ/.test((f.situacion || '').toUpperCase()) ? 'var(--bad)' : 'var(--p)', bg: '#FFF6E8',
        detalle: () => `${f.situ_act ? `<div class="pd-txt">${f.situ_act}</div>` : '<p class="vacio">Sin situación declarada.</p>'}${f.problema ? `<div class="pd-lbl">Problemática</div><div class="pd-txt bad">${f.problema}</div>` : ''}` },
      { id: 'sea', icono: '✍️', titulo: 'CONTRATACIÓN · SEACE', valor: sp && sp.length ? (sp[0].bp?.prov || sp[0].estado || 'con proceso') : 'sin procesos', sub: sp && sp.length ? `${sp.length} proceso(s) de obra` : '', color: 'var(--teal)', bg: '#E8F1FB',
        detalle: () => contratacion(sp, c, f, true) },
      { id: 'comp', icono: '🧩', titulo: 'COMPONENTES Y METAS', valor: f.comp ? `${f.comp.length} componente(s)` : 'sin datos', sub: f.formato || '', color: '#5E35B1', bg: '#F1EEFC',
        detalle: () => f.comp ? `<table class="pd-tbl"><tr><th>Componente / acción</th><th>Meta</th><th>Costo</th></tr>${f.comp.map(cp => `<tr class="c"><td colspan="2">${cp.n}</td><td>${F(cp.a.reduce((t, a) => t + (+a.c || 0), 0) || null)}</td></tr>` + cp.a.map(a => `<tr><td style="padding-left:14px;font-weight:500">${a.n}${a.f ? ` <small class="mutx">· ${a.f}</small>` : ''}</td><td>${a.u || ''}</td><td>${F(+a.c || null)}</td></tr>`).join('')).join('')}</table>` : '<p class="vacio">Sin componentes registrados.</p>' }
    ];
    ov.innerHTML = `<style>@keyframes fiIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.fi-pnl{transition:transform .15s,box-shadow .15s}.fi-pnl:hover{transform:translateY(-2px)}</style>
     <div class="pd-hdr" style="border-radius:0;flex:0 0 auto">
      <div class="pd-cui"><span>${E._ue.nombre}</span><span>· CUI ${cui}</span>${f?.tipo ? `<span>· ${f.tipo}</span>` : ''}${f?.beneficiarios ? `<span>· 👥 ${N(f.beneficiarios)} beneficiarios</span>` : ''}${f?.actualizado ? `<span>· capturado ${f.actualizado}</span>` : ''}<span class="x" id="fi-cerrar" title="Cerrar">×</span></div>
      <div class="pd-title" style="font-size:15px">${nombre}</div>
      <div class="pd-badges"><button class="btn" id="fi-volver" style="background:#fff;color:var(--p2)">‹ Volver a inversiones</button></div>
     </div>
     <div style="flex:1;min-height:0;overflow:auto;padding:12px 16px">${f ? pnlFicha(items) : `<p class="mutx">Sin ficha del Banco de Inversiones capturada aún para este CUI.${c.pim ? ` PIM ${F(c.pim)} · devengado ${F(c.dev)}.` : ''}</p>`}</div>`;
    ov.querySelector('#fi-cerrar').onclick = ov.querySelector('#fi-volver').onclick = cerrarFicha;
    ov.querySelectorAll('[data-fp]').forEach(x => x.onclick = () => { invPanel = invPanel === x.dataset.fp ? null : x.dataset.fp; pintarFicha(cui, f, c, sp); });
  }
  function cuerpo() {
    const b = $('ent-body'), P_ = E.presupuesto, I = E.ingresos, T = modoInv ? P_.inversiones : P_.total, A = E.alertas;
    const pct = (a, c) => 100 * (a || 0) / (c || 1);
    if (tabE === 'hoy') { hoyAlcalde(b); return; }
    if (tabE === 'res') {
      const cad = [['PIM', T.pim, 'lo que puede gastar este año', 'var(--gold)'], ['Certificado', T.cert, 'presupuesto ya reservado para un gasto concreto', 'var(--p2)'], ['Compromiso anual', T.comp_anual, 'contratos y órdenes firmados por su valor total del año', 'var(--p)'], ['Comprometido', T.comp, 'la parte de esos contratos ya registrada para pagar', 'var(--p)'], ['Devengado', T.dev, 'bien o servicio recibido: deuda reconocida', 'var(--ok)'], ['Girado', T.gir, 'cheque o transferencia emitida', 'var(--teal)'], ['Pagado', T.pag, 'dinero que ya salió de la cuenta', '#5E35B1']];
      const fts = Object.values(P_.fuentes).filter(f => f.pim > 0).sort((a, c) => c.pim - a.pim);
      const top = inv().filter(m => m.pim > 0).sort((a, c) => c.pim - a.pim).slice(0, 10);
      const nAl = A.dev_sin_girar.length + A.comp_sin_devengar.length + A.cert_sin_comp.length, mAl = [...A.dev_sin_girar, ...A.comp_sin_devengar, ...A.cert_sin_comp].reduce((s, x) => s + (x.monto || 0), 0);
      paneles(b, [
        { id: 'flujo', icono: '💧', titulo: '¿Cuánto entra y cuánto sale?', valor: `${FM(I.total.recaudado)} entran · ${FM(P_.total.dev)} salen`, sub: `recaudado vs devengado ${ANIO} · ingresos al ${P(pct(I.total.recaudado, I.total.pim))} de su PIM`, color: 'var(--teal)', medidor: pct(P_.total.dev, P_.total.pim),
          detalle: () => `<table class="pd-tbl"><tr><th></th><th>Presupuesto (PIM)</th><th>Ejecutado</th><th>Avance</th></tr><tr><td>Ingresos recaudados</td><td>${F(I.total.pim)}</td><td>${F(I.total.recaudado)}</td><td>${P(pct(I.total.recaudado, I.total.pim))}</td></tr><tr><td>Gastos devengados</td><td>${F(P_.total.pim)}</td><td>${F(P_.total.dev)}</td><td>${P(pct(P_.total.dev, P_.total.pim))}</td></tr><tr><td>Gastos pagados</td><td></td><td>${F(P_.total.pag)}</td><td>${P(pct(P_.total.pag, P_.total.pim))}</td></tr><tr><td><b>Inversiones devengadas</b></td><td>${F(P_.inversiones.pim)}</td><td>${F(P_.inversiones.dev)}</td><td>${P(pct(P_.inversiones.dev, P_.inversiones.pim))}</td></tr></table>` },
        { id: 'cadena', icono: '⛓', titulo: 'La cadena del gasto', valor: `${P(pct(T.dev, T.pim))} devengado`, sub: `${modoInv ? 'solo inversiones' : 'todo el gasto'} · certificado ${P(pct(T.cert, T.pim))} · pagado ${P(pct(T.pag, T.pim))}`, color: 'var(--ok)', medidor: pct(T.dev, T.pim),
          detalle: () => `<table class="pd-tbl">${cad.map(([k, v, d, c]) => `<tr><td style="width:130px"><b>${k}</b></td><td style="width:140px">${barra(v, T.pim, c)}</td><td style="width:110px">${F(v)}</td><td class="mutx" style="text-align:left;font-size:10.5px">${d}</td></tr>`).join('')}</table>` },
        { id: 'alertas', icono: '🚨', titulo: 'Alertas que requieren decisión', valor: `${N(nAl)} casos · ${FM(mAl)}`, sub: `en pagos trabados, contratos sin avanzar y presupuesto inmovilizado`, color: nAl ? 'var(--bad)' : 'var(--ok)', bg: nAl ? '#FDECEC' : '#EAF5EA',
          detalle: () => `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${[['dev_sin_girar', 'Proveedores sin cobrar', 'devengado sin girar > 15 días', 'bad'], ['comp_sin_devengar', 'Contratos sin avanzar', 'comprometido sin devengar > 45 días', 'warn'], ['cert_sin_comp', 'Presupuesto reservado sin usar', 'certificaciones > 60 días sin compromiso', 'p']].map(([k, t, d, c]) => `<div class="al ${c}" data-a="${k}" style="padding:8px 10px;cursor:pointer"><div class="n" style="font-size:20px">${A[k].length}</div><div class="t"><b>${t}</b><br>${d}</div></div>`).join('')}</div><p class="mutx" style="font-size:11px;margin:6px 0 0">Clic en un bloque para ver los casos.</p>` },
        { id: 'fuentes', icono: '🏦', titulo: '¿De dónde sale el dinero?', valor: fts[0] ? cap(fts[0].nombre) : '—', sub: `${fts.length} fuentes · la principal aporta ${P(pct(fts[0]?.pim, P_.total.pim))} del PIM`, color: 'var(--gold)',
          detalle: () => `<table class="pd-tbl"><tr><th>Fuente</th><th>PIM gasto</th><th>Devengado</th><th>Avance</th><th>Recaudado</th></tr>${fts.map(f => { const ing = Object.values(I.fuentes).find(x => x.nombre === f.nombre); return `<tr><td style="white-space:normal">${f.nombre}</td><td>${F(f.pim)}</td><td>${F(f.dev)}</td><td>${P(pct(f.dev, f.pim))}</td><td>${ing ? F(ing.recaudado) : '—'}</td></tr>`; }).join('')}</table>` },
        { id: 'top', icono: '🏗', titulo: 'Las 10 inversiones más grandes', valor: FM(top.reduce((s, m) => s + m.pim, 0)), sub: `${P(pct(top.reduce((s, m) => s + m.pim, 0), P_.inversiones.pim))} del PIM de inversiones · avance ${P(pct(top.reduce((s, m) => s + m.dev, 0), top.reduce((s, m) => s + m.pim, 0)))}`, color: 'var(--p2)',
          detalle: () => `<table class="pd-tbl"><tr><th>Inversión</th><th>PIM</th><th>Devengado</th><th>Avance</th></tr>${top.map(m => `<tr class="l" data-sf="${m.sec_func}" style="cursor:pointer"><td style="white-space:normal"><b>${m.act_proy}</b> ${nombreMeta(m).slice(0, 90)}</td><td>${F(m.pim)}</td><td>${F(m.dev)}</td><td>${P(pct(m.dev, m.pim))}</td></tr>`).join('')}</table>` }
      ], 'Clic en un panel para abrir su detalle; otro clic lo vuelve a cerrar.');
      b.querySelectorAll('.al').forEach(a => a.onclick = () => { tabE = 'al'; abiertos.al = a.dataset.a; render(); }); b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => { filtroMeta = tr.dataset.sf; tabE = 'exp'; render(); });
    } else if (tabE === 'ppto') {
      const fila = (n, d) => `<tr><td style="white-space:normal">${n}</td><td>${F(d.pia)}</td><td>${F(d.ampl + d.modif)}</td><td><b>${F(d.pim)}</b></td><td>${F(d.cert)}</td><td>${F(d.comp_anual)}</td><td>${F(d.dev)}</td><td>${F(d.gir)}</td><td>${F(d.pag)}</td><td>${P(pct(d.dev, d.pim))}</td></tr>`;
      const head = '<tr><th>Concepto</th><th>PIA</th><th>Modificaciones</th><th>PIM</th><th>Certificado</th><th>Compromiso anual</th><th>Devengado</th><th>Girado</th><th>Pagado</th><th>Avance</th></tr>';
      const mods = E.modificaciones.slice().reverse(), fts = Object.values(P_.fuentes).filter(f => f.pim).sort((a, c) => c.pim - a.pim), gen = Object.values(P_.genericas).filter(f => f.pim).sort((a, c) => c.pim - a.pim), pca = E.pca.filter(p => p.asignado);
      const pcaA = pca.reduce((s, p) => s + p.asignado, 0), pcaC = pca.reduce((s, p) => s + p.certificado, 0), cred = mods.reduce((s, m) => s + (m.credito || 0), 0);
      paneles(b, [
        { id: 'marco', icono: '📊', titulo: 'Marco presupuestal (todo el gasto)', valor: FM(P_.total.pim), sub: `PIM = PIA ${F(P_.total.pia)} + modificaciones ${F(P_.total.ampl + P_.total.modif)} · devengado ${P(pct(P_.total.dev, P_.total.pim))}`, color: 'var(--gold)', medidor: pct(P_.total.dev, P_.total.pim),
          detalle: () => sec('Por fuente de financiamiento', 'PIM = PIA + créditos suplementarios/transferencias + modificaciones') + `<table class="pd-tbl">${head}${fts.map(f => fila(f.nombre, f)).join('')}${fila('<b>Total</b>', P_.total)}</table>` },
        { id: 'gen', icono: '🧩', titulo: 'Por genérica de gasto', valor: gen[0] ? cap(gen[0].nombre) : '—', sub: `${gen.length} genéricas · la mayor concentra ${P(pct(gen[0]?.pim, P_.total.pim))} del PIM`, color: 'var(--p)',
          detalle: () => `<table class="pd-tbl">${head}${gen.map(f => fila(f.nombre, f)).join('')}</table>` },
        { id: 'pca', icono: '🎯', titulo: 'PCA · techo de compromisos', valor: `${FM(pcaA - pcaC)} libre`, sub: `asignado ${F(pcaA)} · certificado ${P(pct(pcaC, pcaA))}`, color: 'var(--teal)', medidor: pct(pcaC, pcaA),
          detalle: () => `<table class="pd-tbl"><tr><th>Fuente</th><th>Genérica</th><th>PCA asignada</th><th>Certificado</th><th>Comprometido</th><th>Libre</th></tr>${pca.sort((a, c) => c.asignado - a.asignado).map(p => `<tr><td style="white-space:normal">${p.fuente_n}</td><td style="white-space:normal">${p.generica_n}</td><td>${F(p.asignado)}</td><td>${F(p.certificado)}</td><td>${F(p.comprometido)}</td><td>${F(p.asignado - p.certificado)}</td></tr>`).join('')}</table>` },
        { id: 'mods', icono: '🔁', titulo: 'Modificaciones presupuestales', valor: `${N(mods.length)} notas`, sub: `${F(cred)} movidos entre metas · última ${mods[0]?.fecha || ''}`, color: '#5E35B1',
          detalle: () => `<table class="pd-tbl"><tr><th>Nota</th><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Crédito (a)</th><th>Anulación (de)</th><th>Metas</th></tr>${mods.slice(0, 150).map(m => `<tr><td>${+m.nota}</td><td>${m.fecha || ''}</td><td style="white-space:normal">${m.tipo_n}</td><td style="white-space:normal;font-size:10.5px">${m.doc || ''}${m.notas && m.notas !== 'CREDITOS Y ANULACIONES' ? '<br>' + m.notas : ''}</td><td>${F(m.credito)}</td><td>${F(m.anulacion)}</td><td style="font-size:10.5px;white-space:normal">${m.metas.map(mlabel).join(', ')}</td></tr>`).join('')}</table>` }
      ]);
    } else if (tabE === 'ing') {
      const fts = Object.values(I.fuentes).filter(f => f.pim || f.recaudado).sort((a, c) => c.recaudado - a.recaudado); const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const cl = I.clasificadores.filter(c => c.pim || c.recaudado);
      const mesTot = meses.map(m => fts.reduce((s, f) => s + (f.mensual[m] || 0), 0)), mx = Math.max(...mesTot, 1);
      paneles(b, [
        { id: 'if', icono: '💰', titulo: 'Ingresos por fuente', valor: FM(I.total.recaudado), sub: `recaudado de un PIM de ${F(I.total.pim)} · ${fts.length} fuentes`, color: 'var(--teal)', medidor: pct(I.total.recaudado, I.total.pim),
          detalle: () => `<table class="pd-tbl"><tr><th>Fuente</th><th>PIA</th><th>PIM</th><th>Recaudado</th><th>Avance</th>${meses.map(m => `<th>${MES[+m - 1]}</th>`).join('')}</tr>${fts.map(f => `<tr><td style="white-space:normal">${f.nombre}</td><td>${F(f.pia)}</td><td>${F(f.pim)}</td><td><b>${F(f.recaudado)}</b></td><td>${f.pim ? P(pct(f.recaudado, f.pim)) : '—'}</td>${meses.map(m => `<td style="font-size:10px">${f.mensual[m] ? M(f.mensual[m]) : ''}</td>`).join('')}</tr>`).join('')}<tr><td><b>Total</b></td><td>${F(I.total.pia)}</td><td>${F(I.total.pim)}</td><td><b>${F(I.total.recaudado)}</b></td><td>${P(pct(I.total.recaudado, I.total.pim))}</td><td colspan="12" class="mutx" style="text-align:left;font-size:10px">mensual en S/ millones</td></tr></table>` },
        { id: 'im', icono: '📆', titulo: 'Ritmo mensual de recaudación', valor: `${MES[mesTot.indexOf(mx)]} el mejor mes`, sub: `${F(mx)} · promedio ${F(mesTot.filter(Boolean).reduce((s, v) => s + v, 0) / (mesTot.filter(Boolean).length || 1))} en los meses con registro`, color: 'var(--p2)',
          detalle: () => `<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding:8px 4px 0">${mesTot.map((v, i) => `<div style="flex:1;text-align:center;font-size:10px;color:var(--ink2)"><div style="height:${Math.round(90 * v / mx)}px;background:var(--p2);border-radius:4px 4px 0 0;margin:0 4px"></div>${MES[i]}<br><b>${v ? M(v) : ''}</b></div>`).join('')}</div><p class="mutx" style="font-size:10.5px;margin:4px 0 0">S/ millones · todas las fuentes</p>` },
        { id: 'ir', icono: '🧾', titulo: 'Por rubro de ingreso', valor: cl[0] ? cap(cl[0].nombre) : '—', sub: `${cl.length} rubros · el principal recauda ${P(pct(cl[0]?.recaudado, I.total.recaudado))} del total`, color: 'var(--gold)',
          detalle: () => `<table class="pd-tbl"><tr><th>Clasificador</th><th>Concepto</th><th>PIM</th><th>Recaudado</th><th>Avance</th></tr>${cl.slice(0, 80).map(c => `<tr><td>${c.cod}</td><td style="white-space:normal">${c.nombre}</td><td>${F(c.pim)}</td><td>${F(c.recaudado)}</td><td>${c.pim ? P(pct(c.recaudado, c.pim)) : '—'}</td></tr>`).join('')}</table>` }
      ]);
    } else if (tabE === 'pi') {
      try { Incentivos.render(b, E, META, E._ue.cod, exp => { q = String(+exp); filtroMeta = ''; tabE = 'exp'; render(); }); }
      catch (e) { console.error('Incentivos.render', e); b.innerHTML = `<div class="card" style="margin:16px;padding:16px"><b style="color:var(--bad)">No se pudo mostrar el detalle de Incentivos Municipales.</b><p class="mutx" style="font-size:12px;margin-top:6px">Hubo un problema leyendo los datos de esta meta. Prueba con "🏛 Alcalde" arriba y avísale a soporte con este mensaje: <code>${(e && e.message || e).toString().replace(/</g, '&lt;')}</code></p></div>`; }
    } else if (tabE === 'sea') {
      const cuis = Object.values(LAKE).filter(c => c.pim > 0 || c.dev > 0 || c.avance_fisico > 0), sea = c => SEA_R[c.cui];
      const procs = cuis.map(c => ({ c, s: sea(c) })).filter(x => x.s);
      const est = x => { const e = (x.s.estado || '').toUpperCase(), fin = x.s.fin; return /DESIERT/.test(e) ? 'desierto' : /NULO|CANCEL/.test(e) ? 'nulo' : x.s.firma ? (fin && fin < hoyS() && !(x.c.avance_fisico >= 100) ? 'vencido' : 'firmado') : /ADJUDIC|CONSENTID|OTORGAD/.test(e) || x.s.bp ? 'bpro' : 'proceso'; };
      const K = {}; procs.forEach(x => (K[est(x)] = K[est(x)] || []).push(x)); const k = s => (K[s] || []).length;
      const sinProc = cuis.filter(c => c.pim >= 5e5 && !sea(c) && !(c.dev > 0)).length;
      const NK = { proceso: 'en convocatoria', bpro: 'con buena pro, sin contrato', firmado: 'contratos vigentes', vencido: 'contratos con plazo vencido', desierto: 'desiertos', nulo: 'nulos / cancelados' };
      b.innerHTML = `<p class="mutx" style="font-size:11.5px;padding:8px 8px 0">${procs.length} obras con proceso en SEACE · ${k('firmado') + k('vencido')} contratadas · ${k('proceso')} en convocatoria · ${k('bpro')} con buena pro sin firmar · ${k('vencido')} con plazo vencido · ${k('desierto')} desiertos${sinProc ? ` · ${sinProc} con presupuesto ≥ S/ 500 mil sin proceso registrado` : ''}</p><table><tr><th>Inversión</th><th>Situación</th><th>Contratista</th><th>Convocado</th><th>Firma</th><th>Fin de plazo</th><th>Monto</th></tr>${Object.keys(NK).flatMap(s => (K[s] || []).map(x => `<tr class="l" data-sf="${x.c.cui}" style="cursor:pointer"><td style="white-space:normal"><b>${x.c.cui}</b> ${x.c.nombre.slice(0, 70)}</td><td>${NK[s]}</td><td style="white-space:normal">${x.s.prov || '—'}</td><td>${x.s.conv || ''}</td><td>${x.s.firma || ''}</td><td style="color:${s === 'vencido' ? 'var(--bad)' : 'inherit'}">${x.s.fin || ''}</td><td>${F(x.s.monto)}</td></tr>`)).join('')}</table>`;
      b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => { filtroMeta = tr.dataset.sf; tabE = 'exp'; render(); });
    } else if (tabE === 'inv') {
      if (abiertos.inv) {
        const cui = abiertos.inv;
        mostrarCargando(cui);
        (async () => {
          const [f, sp] = await Promise.all([ssi(cui), seace(cui)]);
          if (abiertos.inv !== cui) return; // el usuario cerró o cambió de inversión mientras cargaba
          invPanel = null; pintarFicha(cui, f, LAKE[cui] || {}, sp);
        })();
      } else if (abiertos.invLista) {
        const rows = metasSel().filter(m => hit(nombreMeta(m) + ' ' + m.act_proy + ' ' + m.sec_func)).sort((a, c) => (c.pim || c.comp) - (a.pim || a.comp));
        b.innerHTML = `<div style="padding:8px 8px 0"><button class="btn" data-atras-resumen style="background:#fff;color:var(--p2)">‹ Volver al resumen</button></div><div style="display:flex;flex-direction:column;gap:8px;padding:8px">${rows.map(m => {
          const c = LAKE[m.act_proy] || {}, av = c.avance_fisico, col = av == null ? 'p' : cls(av);
          return `<div class="card pnl" data-inv="${m.act_proy}" style="cursor:pointer;flex-direction:row;align-items:center;gap:14px;padding:12px 16px;border-left:5px solid var(--${col})">
            <div style="min-width:0;flex:1"><b style="font-size:13px;color:var(--p2)">${m.act_proy}</b> <span style="font-size:12.5px">${(c.nombre || nombreMeta(m)).slice(0, 90)}</span><div class="mutx" style="font-size:11px;margin-top:2px">${c.dist ? c.dist + ' · ' : ''}PIM ${M(m.pim)} M · devengado ${M(m.dev)} M</div></div>
            ${av != null ? `<span class="tag ${col}" style="flex:0 0 auto">avance físico ${av.toFixed(0)}%</span>` : ''}
            <div style="font-size:20px;color:var(--mut);flex:0 0 auto">›</div></div>`;
        }).join('')}</div>${!rows.length ? '<p class="mutx" style="padding:12px">Sin inversiones que coincidan con la búsqueda.</p>' : ''}`;
        b.querySelector('[data-atras-resumen]').onclick = () => { abiertos.invLista = false; render(); };
        b.querySelectorAll('[data-inv]').forEach(x => x.onclick = () => { abiertos.inv = x.dataset.inv; cuerpo(); });
      } else {
        resumenInversion(b, T, P_);
      }
    } else if (tabE === 'exp') {
      const rows = E.expedientes.filter(e => (!filtroMeta || e.metas.includes(filtroMeta)) && (modoInv ? e.metas.some(s => META[s]?.es_inv) : true) && hit(e.glosa + ' ' + e.proveedor + ' ' + e.exp + ' ' + e.fases.map(f => f.num).join(' ')));
      b.innerHTML = `${filtroMeta && META[filtroMeta] ? `<div class="pd-lbl" style="margin:8px">${META[filtroMeta].es_inv ? 'CUI ' + META[filtroMeta].act_proy : 'Meta ' + META[filtroMeta].meta} · ${nombreMeta(META[filtroMeta])}</div>` : ''}<table><tr><th>Expediente</th><th>Proveedor</th><th>Glosa</th><th>Comprom.</th><th>Deveng.</th><th>Girado</th><th>Pagado</th><th>Última fase</th></tr>${rows.slice(0, 400).map(e => `<tr class="l" data-e="${e.exp}"><td><b>${+e.exp}</b><br><small class="mutx">${e.fecha_ing || ''}</small></td><td style="white-space:normal;min-width:120px;font-size:11px">${e.proveedor || (e.ruc ? 'RUC ' + e.ruc : '—')}</td><td style="white-space:normal;min-width:260px;font-size:11px">${(e.glosa || '').slice(0, 160)}</td><td>${F(e.tot.C)}</td><td>${F(e.tot.D)}</td><td>${F(e.tot.G)}</td><td>${F(e.tot.P)}</td><td>${e.ult_fase ? `<span class="tag ${e.ult_fase === 'P' ? 'ok' : e.ult_fase === 'C' ? 'warn' : 'p'}" style="${e.ult_fase === 'D' || e.ult_fase === 'G' ? 'background:#E3F0FB;color:var(--p2)' : ''}">${FASE[e.ult_fase]}</span><br><small class="mutx">${e.ult_fecha || ''}</small>` : '—'}</td></tr><tr class="det" data-d="${e.exp}" hidden><td colspan="8" style="white-space:normal;background:var(--sup2)"></td></tr>`).join('')}</table><p class="mutx" style="font-size:11px;padding:6px 8px">${rows.length} expedientes${rows.length > 400 ? ' (se muestran 400; afina la búsqueda)' : ''}. Clic para ver la cadena de fases con documentos.</p>`;
      b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => { const d = b.querySelector(`tr.det[data-d="${tr.dataset.e}"]`); if (!d.hidden) { d.hidden = true; return; } const e = E.expedientes.find(x => x.exp === tr.dataset.e); d.firstChild.innerHTML = cadena(e); d.hidden = false; });
    } else if (tabE === 'al') {
      const f = r => !modoInv || r.metas.some(s => META[s]?.es_inv);
      const tabla = (rows, k) => rows.length ? `<table><tr><th>${k}</th><th>Proveedor</th><th>Glosa</th><th>Monto</th><th>Días</th><th>Metas</th></tr>${rows.slice(0, 60).map(x => `<tr class="l" data-e="${x.exp || ''}" style="cursor:pointer"><td><b>${+(x.exp || x.cert)}</b></td><td style="white-space:normal;font-size:11px">${x.prov || '—'}</td><td style="white-space:normal;min-width:240px;font-size:11px">${(x.glosa || '').slice(0, 140)}</td><td>${F(x.monto)}</td><td><span class="tag ${x.dias > 90 ? 'bad' : x.dias > 45 ? 'warn' : 'ok'}">${x.dias}</span></td><td style="font-size:11px">${x.metas.map(mlabel).join(', ')}</td></tr>`).join('')}</table>` : '<p class="mutx" style="padding:4px 8px;font-size:11px">Sin casos.</p>';
      const def = [['dev_sin_girar', '💸', 'Proveedores sin cobrar', 'la entidad ya reconoció la deuda (devengado) y no ha girado en más de 15 días', 'var(--bad)', '#FDECEC', 'Expediente'], ['comp_sin_devengar', '⏳', 'Contratos sin avanzar', 'contrato u orden firmada (comprometido) sin recepción del bien o servicio en más de 45 días', 'var(--warn)', '#FFF4E0', 'Expediente'], ['cert_sin_comp', '🔒', 'Presupuesto reservado sin usar', 'certificaciones con más de 60 días sin compromiso: dinero inmovilizado', 'var(--p)', '#E8F1FB', 'Certificación']];
      paneles(b, def.map(([k, ic, t, d, col, bg, kk]) => { const rows = A[k].filter(f), mx = rows.reduce((s, x) => Math.max(s, x.dias || 0), 0); return { id: k, icono: ic, titulo: t, valor: `${N(rows.length)} casos · ${FM(rows.reduce((s, x) => s + (x.monto || 0), 0))}`, sub: `${d}${mx ? ` · el más antiguo lleva ${mx} días` : ''}`, color: rows.length ? col : 'var(--ok)', bg: rows.length ? bg : '#EAF5EA', detalle: () => tabla(rows, kk) }; }), 'Clic en un caso para abrir su expediente.');
      b.querySelectorAll('tr.l[data-e]').forEach(tr => tr.onclick = () => { if (!tr.dataset.e) return; q = String(+tr.dataset.e); filtroMeta = ''; tabE = 'exp'; render(); });
    } else if (tabE === 'plz') {
      const corte = E.corte, dias = (a, b) => Math.round((new Date(b || corte) - new Date(a)) / 864e5), VIG = '2025-04-22', reg = d => (d || '') >= VIG ? 'nuevo' : 'viejo';
      const RN = { nuevo: 'Ley 32069 · DS 009-2025-EF', viejo: 'Ley 30225 · DS 344-2018-EF' }, PAGO_D = { nuevo: 14, viejo: 15 };   // pago: 10 dias habiles (~14 cal) / 15 dias calendario tras la conformidad
      const G = (a, b, c) => a <= b ? 'ok' : a <= c ? 'warn' : 'bad', tag = (k, v) => `<span class="tag ${k}">${v}</span>`;
      // 1) firma del contrato (SEACE) -> primer compromiso SIAF del contratista en ese CUI
      const obras = inv().map(m => ({ m, s: (SEA_R || {})[m.act_proy] })).filter(x => x.s && x.s.firma).map(x => {
        const { m, s } = x; let exps = E.expedientes.filter(e => e.metas.includes(m.sec_func) && s.ruc && e.ruc === s.ruc), porMonto = false;
        if (!exps.length && s.monto) { exps = E.expedientes.filter(e => e.metas.includes(m.sec_func) && (e.tot.C || 0) >= 0.2 * s.monto); porMonto = true; }
        const cs = exps.flatMap(e => e.fases.filter(f => f.ciclo === 'G' && f.fase === 'C' && f.fecha && f.fecha >= s.firma).map(f => ({ ...f, exp: e.exp }))).sort((a, b) => a.fecha.localeCompare(b.fecha));
        const c1 = cs[0], d = c1 ? dias(s.firma, c1.fecha) : dias(s.firma), comp = exps.reduce((a, e) => a + (e.tot.C || 0), 0), dev = exps.reduce((a, e) => a + (e.tot.D || 0), 0);
        return { m, s, exps, porMonto, c1, d, comp, dev, k: c1 ? G(d, 30, 60) : (d > 30 ? 'bad' : 'warn'), r: reg(s.conv) };
      }).sort((a, b) => b.d - a.d);
      const okF = obras.filter(o => o.k === 'ok').length, prom = obras.length ? obras.reduce((a, o) => a + o.d, 0) / obras.length : 0;
      // 2) devengado -> girado por secuencia (misma secuencia SIAF: C -> D -> G)
      const pagos = [];
      E.expedientes.filter(e => !modoInv || e.metas.some(s => META[s]?.es_inv)).forEach(e => {
        const fs = e.fases.filter(f => f.ciclo === 'G' && f.fecha), c0 = fs.find(f => f.fase === 'C'), r = reg(c0?.fecha);
        // ponytail: la secuencia SIAF no enlaza D con G; se emparejan por orden de fecha y monto acumulado (FIFO), suficiente para medir plazos
        const Ds = fs.filter(f => f.fase === 'D' && f.monto > 0), Gs = fs.filter(f => f.fase === 'G' && f.monto > 0); let accD = 0, gi = 0, accG = 0;
        Ds.forEach(dv => { accD += dv.monto; while (gi < Gs.length && accG + 0.5 < accD) { accG += Gs[gi].monto; gi++; } const g = accG + 0.5 >= accD ? Gs[gi - 1] : null; const d = g ? Math.max(0, dias(dv.fecha, g.fecha)) : dias(dv.fecha); pagos.push({ e, dv, g, d, r, k: G(d, PAGO_D[r], 30) }); });
      });
      pagos.sort((a, b) => b.d - a.d);
      const pend = pagos.filter(p => !p.g), enPlazo = pagos.filter(p => p.k === 'ok').length, promP = pagos.length ? pagos.reduce((a, p) => a + p.d, 0) / pagos.length : 0;
      const porProv = {}; pagos.forEach(p => { const k = p.e.proveedor || p.e.ruc || '—'; const o = porProv[k] = porProv[k] || { n: 0, d: 0, tarde: 0, monto: 0 }; o.n++; o.d += p.d; if (p.k !== 'ok') o.tarde++; o.monto += p.dv.monto; });
      const provs = Object.entries(porProv).filter(([, o]) => o.n >= 2).map(([k, o]) => ({ k, ...o, prom: o.d / o.n })).sort((a, b) => b.prom - a.prom).slice(0, 12);
      // 3) valorizaciones mensuales: obras en ejecucion sin devengado en algun mes completo
      const mesC = +corte.slice(5, 7), anioC = +corte.slice(0, 4);
      const val = obras.filter(o => o.s.ini && o.s.ini <= corte && (!o.s.fin || o.s.fin >= o.s.ini)).map(o => {
        const m0 = Math.max(1, o.s.ini.slice(0, 4) < String(anioC) ? 1 : +o.s.ini.slice(5, 7) + 1), m1 = Math.min(mesC - 1, o.s.fin && o.s.fin.slice(0, 4) === String(anioC) ? +o.s.fin.slice(5, 7) : 12);
        const meses = []; for (let mm = m0; mm <= m1; mm++) { const p = `${anioC}-${String(mm).padStart(2, '0')}`; if (!o.exps.some(e => e.fases.some(f => f.ciclo === 'G' && f.fase === 'D' && f.fecha && f.fecha.startsWith(p)))) meses.push(MES[mm - 1]); }
        return { ...o, meses, n: m1 - m0 + 1 };
      }).filter(o => o.n > 0).sort((a, b) => b.meses.length - a.meses.length);
      const sinVal = val.filter(o => o.meses.length);
      const nom = o => `<b>${o.m.act_proy}</b> ${cap(nombreMeta(o.m))}<br><small class="mutx">${o.s.prov || ''}${o.porMonto ? ' · vinculado por monto' : ''} · ${RN[o.r]}</small>`;
      paneles(b, [
        { id: 'fc', icono: '✍️', titulo: 'Firma del contrato → compromiso', valor: obras.length ? `${prom.toFixed(0)} días en promedio` : 'sin contratos SEACE vinculados', sub: obras.length ? `${okF} de ${obras.length} obras comprometidas dentro de 30 días de la firma · ${obras.filter(o => !o.c1).length} sin compromiso registrado` : 'la obra debe tener contrato en SEACE y metas en el SIAF', color: obras.length ? `var(--${G(100 - 100 * okF / obras.length, 20, 50)})` : 'var(--p)', bg: '#E8F1FB', medidor: obras.length ? 100 * okF / obras.length : null,
          detalle: () => `<p class="mutx" style="font-size:11px">§ DL 1440, art. 42.2: el compromiso se registra una vez nacida la obligación (contrato firmado), por el total del año. Referencia del semáforo: verde ≤ 30 días, ámbar ≤ 60, rojo más de 60 o sin compromiso. Cada obra se juzga por la norma vigente en su convocatoria.</p><table class="pd-tbl"><tr><th>Obra</th><th>Firma</th><th>1er compromiso</th><th>Días</th><th>Contrato</th><th>Comprometido</th><th>Devengado</th></tr>${obras.map(o => `<tr><td style="text-align:left;white-space:normal">${nom(o)}</td><td>${o.s.firma}</td><td>${o.c1 ? o.c1.fecha + `<br><small class="mutx">exp. ${+o.c1.exp}</small>` : '<span class="tag bad">sin compromiso</span>'}</td><td>${tag(o.k, o.d)}</td><td>${F(o.s.monto)}</td><td>${F(o.comp)}</td><td>${F(o.dev)}</td></tr>`).join('')}</table>` },
        { id: 'dg', icono: '💸', titulo: 'Devengado → girado (pago)', valor: pagos.length ? `${promP.toFixed(0)} días en promedio` : 'sin devengados', sub: `${enPlazo} de ${pagos.length} devengados pagados dentro del plazo legal · ${pend.length} sin girar al ${corte} (${F(pend.reduce((a, p) => a + p.dv.monto, 0))})`, color: pagos.length ? `var(--${G(100 - 100 * enPlazo / pagos.length, 20, 50)})` : 'var(--p)', bg: '#FDECEC', medidor: pagos.length ? 100 * enPlazo / pagos.length : null,
          detalle: () => `<p class="mutx" style="font-size:11px">§ Ley 32069, art. 67.3 y 67.5: pago en máximo 10 días hábiles desde la conformidad (aquí: desde el devengado), con intereses legales si se atrasa; contratos convocados antes del 22-abr-2025: 15 días calendario (DS 344-2018-EF, art. 171). Verde dentro del plazo, ámbar hasta 30 días, rojo más de 30. Valorizaciones de obra: se pagan hasta el último día del mes en que se presentan (art. 210 / 194).</p>
            <div class="pd-lbl">Los ${Math.min(40, pagos.filter(p => p.k !== 'ok').length)} pagos más atrasados</div><table class="pd-tbl"><tr><th>Expediente</th><th>Proveedor</th><th>Devengado</th><th>Girado</th><th>Días</th><th>Monto</th><th>Norma</th></tr>${pagos.filter(p => p.k !== 'ok').slice(0, 40).map(p => `<tr><td><b>${+p.e.exp}</b><br><small class="mutx">sec. ${p.dv.sec}</small></td><td style="text-align:left;white-space:normal;font-size:11px">${p.e.proveedor || p.e.ruc || '—'}<br><small class="mutx">${(p.e.glosa || '').slice(0, 90)}</small></td><td>${p.dv.fecha}</td><td>${p.g ? p.g.fecha : '<span class="tag bad">pendiente</span>'}</td><td>${tag(p.k, p.d)}</td><td>${F(p.dv.monto)}</td><td style="font-size:10.5px">${RN[p.r]}</td></tr>`).join('')}</table>
            ${provs.length ? `<div class="pd-lbl" style="margin-top:8px">Proveedores que más esperan (2 o más devengados)</div><table class="pd-tbl"><tr><th>Proveedor</th><th>Devengados</th><th>Fuera de plazo</th><th>Días promedio</th><th>Monto devengado</th></tr>${provs.map(x => `<tr><td style="text-align:left;white-space:normal">${x.k}</td><td>${x.n}</td><td>${x.tarde}</td><td>${tag(G(x.prom, 14, 30), x.prom.toFixed(0))}</td><td>${F(x.monto)}</td></tr>`).join('')}</table>` : ''}` },
        { id: 'vm', icono: '📅', titulo: 'Valorizaciones mensuales', valor: val.length ? `${sinVal.length} de ${val.length} obras con meses sin devengar` : 'sin obras en ejecución', sub: val.length ? `meses completos de ejecución (según fechas SEACE) sin ningún devengado del contratista · al ${corte}` : 'requiere fecha de inicio de obra en SEACE', color: val.length ? `var(--${G(100 * sinVal.length / val.length, 15, 40)})` : 'var(--p)', bg: '#FFF4E0', medidor: val.length ? 100 - 100 * sinVal.length / val.length : null,
          detalle: () => `<p class="mutx" style="font-size:11px">§ Reglamento DS 009-2025-EF, art. 210.1 (y DS 344-2018-EF, art. 194): las valorizaciones son mensuales y se pagan a cuenta. Un mes de obra sin devengado suele significar valorización no presentada, observada o no tramitada: hay que preguntar por qué.</p><table class="pd-tbl"><tr><th>Obra</th><th>Inicio</th><th>Fin</th><th>Meses evaluados</th><th>Meses sin devengado</th><th>Devengado</th></tr>${val.map(o => `<tr><td style="text-align:left;white-space:normal">${nom(o)}</td><td>${o.s.ini}</td><td>${o.s.fin || '—'}</td><td>${o.n}</td><td>${o.meses.length ? `<span class="tag ${o.meses.length >= 2 ? 'bad' : 'warn'}">${o.meses.join(', ')}</span>` : '<span class="tag ok">al día</span>'}</td><td>${F(o.dev)}</td></tr>`).join('')}</table>` }
      ], `Plazos calculados con las fechas reales del SIAF (backup al ${corte}) y del SEACE. El régimen de cada contrato se toma de su fecha de convocatoria (Ley 32069, 4.ª DCT); el de cada expediente sin obra vinculada, de la fecha de su primer compromiso.`);
    } else if (tabE === 'prov') {
      const rows = E.proveedores.filter(p => hit(p.nombre + ' ' + p.ruc)), pend = rows.filter(p => p.dev - p.gir > 1), tot = rows.reduce((s, p) => s + p.dev, 0);
      const tabla = rs => `<table><tr><th>RUC</th><th>Proveedor</th><th>Comprometido</th><th>Devengado</th><th>Girado</th><th>Pendiente de giro</th><th>Exp.</th></tr>${rs.slice(0, 300).map(p => `<tr class="l" data-r="${p.ruc}" style="cursor:pointer"><td>${p.ruc}</td><td style="white-space:normal">${p.nombre || '—'}</td><td>${F(p.comp)}</td><td>${F(p.dev)}</td><td>${F(p.gir)}</td><td>${F(Math.max(0, p.dev - p.gir))}</td><td>${p.n}</td></tr>`).join('')}</table>`;
      paneles(b, [
        { id: 'pend', icono: '💸', titulo: 'Proveedores con pagos pendientes', valor: `${N(pend.length)} · ${FM(pend.reduce((s, p) => s + p.dev - p.gir, 0))} por girar`, sub: 'devengado y aún no girado: son los que están llamando a tesorería', color: pend.length ? 'var(--bad)' : 'var(--ok)', bg: pend.length ? '#FDECEC' : '#EAF5EA', detalle: () => tabla(pend.sort((a, c) => (c.dev - c.gir) - (a.dev - a.gir))) },
        { id: 'top', icono: '🏆', titulo: 'Los 10 proveedores principales', valor: FM(rows.slice(0, 10).reduce((s, p) => s + p.dev, 0)), sub: `${P(pct(rows.slice(0, 10).reduce((s, p) => s + p.dev, 0), tot))} de todo lo devengado a proveedores`, color: 'var(--p2)', detalle: () => tabla(rows.slice(0, 10)) },
        { id: 'todos', icono: '📇', titulo: 'Todos los proveedores', valor: N(rows.length), sub: `devengado total ${F(tot)} · clic para ver el directorio completo`, color: 'var(--p)', detalle: () => tabla(rows) }
      ], 'Clic en un proveedor para ver sus expedientes.');
      b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => { q = tr.dataset.r; tabE = 'exp'; filtroMeta = ''; render(); });
    } else if (tabE === 'cert') {
      const rows = Object.entries(E.certificaciones).filter(([k, c]) => (!modoInv || c.metas.some(s => META[s]?.es_inv)) && hit(c.glosa + ' ' + c.prov + ' ' + k)).sort((a, c) => c[1].monto - a[1].monto);
      const tot = rows.reduce((s, [, c]) => s + c.monto, 0), com = rows.reduce((s, [, c]) => s + c.comp_anual, 0), libres = rows.filter(([, c]) => c.monto - c.comp_anual > 1);
      const tabla = rs => `<table><tr><th>Certificación</th><th>Fecha</th><th>Documento</th><th>Proveedor</th><th>Glosa</th><th>Certificado</th><th>Comprometido</th><th>Por comprometer</th><th>Metas</th></tr>${rs.slice(0, 400).map(([k, c]) => `<tr><td><b>${+k}</b></td><td>${c.fecha || ''}</td><td style="font-size:11px">${c.doc}</td><td style="white-space:normal;font-size:11px">${c.prov || ''}</td><td style="white-space:normal;min-width:240px;font-size:11px">${(c.glosa || '').slice(0, 140)}</td><td>${F(c.monto)}</td><td>${F(c.comp_anual)}</td><td>${F(Math.max(0, c.monto - c.comp_anual))}</td><td style="font-size:11px">${c.metas.map(mlabel).join(', ')}</td></tr>`).join('')}</table>`;
      paneles(b, [
        { id: 'c', icono: '📜', titulo: 'Certificaciones emitidas', valor: `${N(rows.length)} · ${FM(tot)}`, sub: `comprometido ${P(pct(com, tot))} de lo certificado`, color: 'var(--p2)', medidor: pct(com, tot), detalle: () => tabla(rows) },
        { id: 'l', icono: '🪙', titulo: 'Certificado sin comprometer', valor: FM(tot - com), sub: `${N(libres.length)} certificaciones con saldo: presupuesto reservado que aún no tiene contrato`, color: libres.length ? 'var(--warn)' : 'var(--ok)', bg: libres.length ? '#FFF4E0' : '#EAF5EA', detalle: () => tabla(libres.sort((a, c) => (c[1].monto - c[1].comp_anual) - (a[1].monto - a[1].comp_anual))) }
      ]);
    }
  }
  function cadena(e) {
    const gasto = e.fases.filter(f => f.ciclo === 'G');
    return `<div style="padding:8px 4px"><div class="pd-row" style="margin-bottom:8px"><b>Glosa</b><span style="font-weight:500">${e.glosa || '—'}</span></div>
     <table class="pd-tbl"><tr><th>Fecha</th><th>Fase</th><th>Documento</th><th>Monto</th><th>Fuente</th><th>Meta · clasificador</th><th>Pago / beneficiario</th></tr>${gasto.map(f => `<tr><td>${f.fecha || ''}</td><td><b>${FASE[f.fase] || f.fase}</b> <small class="mutx">${f.sec}-${f.corr}</small>${f.cert ? `<br><small class="mutx">cert. ${+f.cert}</small>` : ''}</td><td style="white-space:normal">${f.doc_n || f.doc} <b>${f.num}</b></td><td>${F(f.monto)}</td><td style="font-size:10.5px">${E.fuentes[f.fuente] || f.fuente || ''}</td><td style="white-space:normal;font-size:10.5px">${f.metas.map(m => `${META[m.sec_func] ? (META[m.sec_func].es_inv ? META[m.sec_func].act_proy : 'meta ' + META[m.sec_func].meta) : m.sec_func} · ${E.clasif[m.clasif]?.cod || ''} ${E.clasif[m.clasif]?.nombre || ''} (${F(m.monto)})`).join('<br>')}</td><td style="white-space:normal;font-size:10.5px">${f.docs.map(d => `${d.nombre || ''} ${d.num ? '· ' + d.num : ''} ${d.pago ? '· pagado ' + d.pago : ''}`).join('<br>') || (f.prov || '')}</td></tr>`).join('')}</table></div>`;
  }
  function atras() {
    if (!E) return false;
    if (tabE === 'pi' && window.Incentivos?.atras?.()) return true;
    if (abiertos[tabE]) { abiertos[tabE] = null; cuerpo(); return true; }
    if (pila.length < 2) return false;
    pila.pop(); [tabE, filtroMeta, modoInv, q] = pila[pila.length - 1].split('|'); modoInv = modoInv === 'true'; restaurando = true; render(); return true;
  }
  window.Entidad = { atras, abrir: async (ue) => { if (E && (!ue || E.ue === ue)) { render(); return; } await login(); if (ue && $('ent-ue')) $('ent-ue').value = ue; } };
})();

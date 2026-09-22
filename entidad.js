/* entidad.js — módulo "Mi entidad": datos internos del SIAF de una entidad, cifrados; se abren solo con su clave.
   Depende de helpers globales de index.html: $, j, M, N, P, cls, toast, UES, ficha(), ANIO, R. */
(function () {
  const F = n => n == null ? '—' : 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const FASE = { C: 'Compromiso', D: 'Devengado', G: 'Girado', P: 'Pagado', R: 'Rendición' };
  let E = null, META = {}, LAKE = {}, tabE = 'inv', filtroMeta = '', q = '', modoInv = true, abierto = null;
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
     ${lista.length ? `<label class="mutx" style="font-size:11px">Entidad</label><select id="ent-ue" style="width:100%;margin:4px 0 10px">${lista.map(x => `<option value="${x.ue}">${x.nombre || 'UE ' + x.ue} · ${x.publico ? 'datos MEF' : 'SIAF'} al ${x.corte || ''}</option>`).join('')}</select>` : '<p class="mutx">Aún no hay entidades publicadas.</p>'}
     <label class="mutx" style="font-size:11px">Clave de acceso</label><input type="password" id="ent-clave" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;margin:4px 0 12px" placeholder="••••••••" autocomplete="current-password">
     <div style="display:flex;gap:8px;align-items:center"><button class="btn p" id="ent-ir">Entrar</button><span class="mutx" id="ent-msg" style="font-size:12px"></span></div></div></div>`;
    const ir = async () => { const ue = $('ent-ue')?.value, clave = $('ent-clave').value; if (!ue || !clave) return; $('ent-msg').textContent = 'Descifrando…';
      try { E = await descifrar(ue, clave); await preparar(ue); tabE = 'inv'; abiertos.invLista = false; render(); } catch (e) { console.warn(e); $('ent-msg').textContent = 'Clave incorrecta o archivo no disponible.'; } };
    $('ent-ir').onclick = ir; $('ent-clave').onkeydown = e => { if (e.key === 'Enter') ir(); }; $('ent-clave').focus();
  }

  async function preparar(ue) {
    META = {}; E.metas.forEach(m => META[m.sec_func] = m);
    const uf = await ficha(ue).catch(() => null); if (!SEA_R) SEA_R = await fetch('data/seace/resumen.json').then(r => r.json()).catch(() => ({})); LAKE = {}; (uf?.cuis || []).forEach(c => LAKE[c.cui] = c); E._ue = UES.find(u => u.cod === ue) || { cod: ue, nombre: 'UE ' + ue }; E._uf = uf;
    // reporte PPT a medida (solo con clave): existe si la entidad tiene plantilla en reportes/<ue>.json
    const cr = await CR.config(ue); E._rep = cr.rep; E._repFechas = cr.fechas;
  }
  // ---- Fecha de corte + Reporte PPT: widget compartido por Mi entidad (con clave) y la ficha pública (sin clave) ----
  // ponytail: la versión de pago y la gratuita son idénticas; la única diferencia es que "Generar reporte PPT" en una entidad
  // sin plantilla contratada (reportes/<ue>.json) abre el aviso de contacto en vez del reporte.
  const CONTACTO = 'consultas@arkaproyectos.com.pe';
  const fDMY = f => f.split('-').reverse().join('/');
  const CR = {
    cache: {},
    async config(ue) {   // {rep, fechas}: plantilla contratada y fotos diarias guardadas
      if (!this.cache[ue]) {
        const rep = await fetch(`reportes/${ue}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
        const fechas = rep ? await fetch(`data/reportes/${ue}/index.json?v=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []) : [];
        this.cache[ue] = { rep, fechas };
      }
      return this.cache[ue];
    },
    hoy: () => R.corte.slice(0, 10),
    // días con datos exactos: cierres de mes ya pasados (devengado mensual del MEF), fotos diarias guardadas y hoy
    fechasConDatos(fechas) {
      const hoy = this.hoy(), anio = +hoy.slice(0, 4), set = new Set([hoy, ...(fechas || [])]);
      for (let m = 1; m <= 12; m++) { const f = `${anio}-${String(m).padStart(2, '0')}-${String(new Date(anio, m, 0).getDate()).padStart(2, '0')}`; if (f < hoy) set.add(f); }
      return set;
    },
    // qué datos se usan para una fecha: foto diaria exacta > fin de mes (devengado mensual del MEF) > foto anterior > cierre de mes anterior > hoy
    resolver(fecha, fechas) {
      const hoy = this.hoy(), d = new Date(fecha + 'T00:00:00'), fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (fecha >= hoy) return { corte: null, nota: 'datos de hoy' };
      if ((fechas || []).includes(fecha)) return { corte: { fecha, foto: true }, nota: 'foto diaria guardada' };
      if (d.getDate() === fin && d.getFullYear() === +hoy.slice(0, 4)) return { corte: { mes: d.getMonth() + 1 }, nota: 'cierre mensual (MEF)' };
      const fotos = (fechas || []).filter(f => f <= fecha).sort();
      if (fotos.length) { const f = fotos[fotos.length - 1]; return { corte: { fecha: f, foto: true }, nota: 'foto diaria más cercana: ' + fDMY(f) }; }
      const m = d.getMonth() + (d.getDate() === fin ? 1 : 0);
      return m >= 1 ? { corte: { mes: m }, nota: 'sin foto de ese día; se usa el cierre de ' + ReporteUE.MESES[m - 1].toLowerCase() } : { corte: null, nota: 'sin datos para esa fecha; se usan los de hoy' };
    },
    html(ctx) {   // ctx = {rep, fechas, corte}; el calendario solo tiene sentido con plantilla (datos por corte); el botón va siempre
      const v = ctx.corte || this.hoy();
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;background:#fff;border-radius:8px;padding:3px 6px 3px 10px;color:var(--p2);font-size:12px;position:relative">
        ${ctx.rep ? `<label style="font-weight:700">Fecha de corte</label><input type="hidden" id="rep-corte" value="${v}">
        <button class="btn" id="rep-corte-btn" style="font:inherit;font-weight:700;border:1px solid var(--line);border-radius:6px;padding:3px 8px;background:#fff;color:var(--p2)">${fDMY(v)} ▾</button>
        <div id="rep-cal" hidden style="position:fixed;z-index:9999;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 28px rgba(15,42,67,.18);padding:10px;width:270px"></div>
        <span id="rep-nota" class="mutx" style="font-size:11px"></span>` : ''}
        <button class="btn p" id="rep-ppt" title="Reporte oficial en PowerPoint con los datos a la fecha de corte">📑 Generar reporte PPT</button></span>`;
    },
    // calendario propio (el <input type=date> nativo no deja marcar días): negrita = hay datos de ese día; futuro deshabilitado
    calendario(y, m, ctx) {
      const cal = $('rep-cal'), hoy = this.hoy(), con = this.fechasConDatos(ctx.fechas), sel = $('rep-corte').value, MESL = ReporteUE.MESES;
      const prim = new Date(y, m, 1).getDay(), dias = new Date(y, m + 1, 0).getDate();
      let celdas = ''; for (let i = 0; i < prim; i++) celdas += '<span></span>';
      for (let d = 1; d <= dias; d++) {
        const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, fut = f > hoy, tiene = con.has(f);
        celdas += `<button data-f="${f}" ${fut ? 'disabled' : ''} style="font-family:inherit;font-size:12px;border:0;border-radius:6px;padding:5px 0;cursor:${fut ? 'default' : 'pointer'};background:${f === sel ? 'var(--p)' : 'transparent'};color:${f === sel ? '#fff' : fut ? '#C5CCD6' : tiene ? 'var(--p2)' : '#98A2B3'};font-weight:${tiene ? '800' : '400'}">${d}</button>`;
      }
      cal.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><button data-nav="-1" class="btn" style="padding:2px 8px">‹</button><b style="font-size:12.5px;color:var(--p2)">${MESL[m]} ${y}</b><button data-nav="1" class="btn" style="padding:2px 8px">›</button></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">${['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(x => `<span class="mutx" style="font-size:10px">${x}</span>`).join('')}${celdas}</div>
        <div class="mutx" style="font-size:10px;margin-top:6px"><b style="color:var(--p2)">Negrita</b> = hay datos exactos de ese día (cierre de mes, foto diaria u hoy)</div>`;
      cal.querySelectorAll('[data-nav]').forEach(b => b.onclick = e => { e.stopPropagation(); const n = new Date(y, m + +b.dataset.nav, 1); this.calendario(n.getFullYear(), n.getMonth(), ctx); });
      cal.querySelectorAll('[data-f]').forEach(b => b.onclick = e => { e.stopPropagation(); $('rep-corte').value = b.dataset.f; cal.hidden = true; $('rep-corte').onchange(); });
    },
    // datos de un corte: {k, datos} con k = ReporteUE.resolverCorte (mes/foto) y datos = json de reportes (actual o foto diaria)
    async cargar(ue, r) {
      const datos = r.corte && r.corte.foto ? await fetch(`data/reportes/${ue}/${r.corte.fecha}.json`).then(x => x.json()) : await fetch(`data/reportes/${ue}.json?v=${Date.now()}`).then(x => x.json());
      return { datos, k: ReporteUE.resolverCorte(r.corte, datos) };
    },
    // valores por CUI al corte: {cui: {pim,cert,comp,dev}} y por fuente {cod: {nombre,pia,pim,dev}}
    valores(datos, k) {
      const porCui = {}, porFte = {};
      (datos.cuis || []).forEach(c => {
        const dev = k.porMes ? c.m.slice(0, k.mes).reduce((a, b) => a + b, 0) : (c.dev || 0);
        porCui[c.cui] = { pim: c.pim || 0, cert: c.cert || 0, comp: c.comp || 0, dev };
        Object.entries(c.ff || {}).forEach(([cod, f]) => { const key = cod.replace(/F$/, ''); porFte[key] = porFte[key] || { nombre: f.nombre.replace(' - BONOS', ''), pia: 0, pim: 0, cert: 0, comp: 0, dev: 0 }; porFte[key].pia += f.pia || 0; porFte[key].pim += f.pim || 0; porFte[key].dev += k.porMes ? f.m.slice(0, k.mes).reduce((a, b) => a + b, 0) : (f.dev || 0); });
      });
      return { porCui, porFte };
    },
    async generarPPT(cfg, ue, r) {
      if (!cfg.plantilla) {   // ponytail: contrato sin plantilla propia -> Expediente PPT generico de la ficha publica (mismos datos con y sin clave); el corte elegido no aplica ahi
        if (typeof exportarPPT === 'function' && window.estado && estado.ue === ue) return exportarPPT(8);
        toast('Generando el Expediente PPT desde la ficha de la entidad…'); location.hash = '#/ue/' + ue;
        setTimeout(() => { const b = $('ppt'); if (b && !b.hidden) b.click(); }, 1800); return;
      }
      if (!window.JSZip) await new Promise((ok, err) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = ok; s.onerror = err; document.head.appendChild(s); });
      const datos = await fetch(`data/reportes/${ue}.json?v=${Date.now()}`).then(x => x.json());
      if (r.corte && r.corte.foto) r.corte.datos = await fetch(`data/reportes/${ue}/${r.corte.fecha}.json`).then(x => x.json());
      const buf = await fetch(cfg.plantilla).then(x => { if (!x.ok) throw new Error('plantilla'); return x.arrayBuffer(); });
      const zip = await JSZip.loadAsync(buf);
      const { D } = await ReporteUE.generar(zip, cfg, datos, r.corte);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${cfg.archivo || 'Reporte_UE_' + ue}_${D.corte.fecha}.pptx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(`Reporte al ${fDMY(D.corte.fecha)} · ${r.nota}${D.conProg ? '' : ' · sin programación 12-B (MEF)'}`);
    },
    sinPago(nombre) {   // ventana emergente compacta (mismo patrón que el modal de Seguimiento), clic fuera cierra
      let lb = $('rep-aviso');
      if (!lb) { lb = document.createElement('div'); lb.id = 'rep-aviso'; lb.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(10,20,35,.55);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;cursor:pointer'; lb.onclick = () => lb.remove(); document.body.appendChild(lb); }
      lb.innerHTML = `<div onclick="event.stopPropagation()" style="cursor:default;background:#fff;border-radius:16px;max-width:520px;width:100%;box-shadow:0 12px 44px rgba(0,0,0,.35);padding:18px 22px 16px">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #DCE7F5;padding-bottom:10px;margin-bottom:12px">
          <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#0A1B2E,#1E6BB8);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📑</div>
          <div><div style="font-size:14px;font-weight:900;color:#0F2A43">Exportaciones y reportes a medida</div><div style="font-size:10.5px;font-weight:700;color:#5E7290">${nombre || 'Su entidad'}</div></div>
          <button style="margin-left:auto;background:none;border:0;font-size:20px;color:#94A3B8;cursor:pointer" onclick="this.closest('#rep-aviso').remove()">×</button></div>
        <p style="font-size:13px;line-height:1.55;margin:0 0 8px;color:#1E293B">Las exportaciones (Excel, PowerPoint, PDF) y los reportes con el formato propio de cada entidad, a la fecha de corte que se necesite, se habilitan por contrato.</p>
        <p style="font-size:13px;line-height:1.55;margin:0;color:#1E293B">Para activarlo, escríbanos a <a href="mailto:${CONTACTO}" style="font-weight:800;color:var(--p)">${CONTACTO}</a>.</p>
        <div style="font-size:9.5px;color:#9AA8BC;text-align:center;margin-top:12px">clic fuera para cerrar</div></div>`;
    },
    // compuerta de TODA exportación (Excel, PPT, PDF/imprimir): con contrato (reportes/<ue>.json) ejecuta fn; si no, el aviso de contacto
    async exportar(ue, nombre, fn) {
      const rep = ue ? (await this.config(ue)).rep : null;
      if (rep) return fn();
      this.sinPago(nombre || 'esta vista');
    },
    // cablea el widget: onCorte(fecha) -> Promise (aplica el corte y repinta); nombre = para el aviso de contacto
    wire(ctx, onCorte) {
      const btn = $('rep-ppt'); if (!btn) return;
      btn.onclick = async () => {
        if (!ctx.rep) return this.sinPago(ctx.nombre);
        btn.disabled = true; const txt = btn.textContent; btn.textContent = 'Generando…';
        try { await this.generarPPT(ctx.rep, ctx.ue, this.resolver($('rep-corte').value, ctx.fechas)); } catch (e) { console.error(e); toast('No se pudo generar el reporte PPT'); }
        btn.disabled = false; btn.textContent = txt;
      };
      const inp = $('rep-corte'), cb = $('rep-corte-btn'); if (!inp) return;
      if (!document.getElementById('rep-cal-css')) { const st = document.createElement('style'); st.id = 'rep-cal-css'; st.textContent = '#rep-cal button[data-f]:not(:disabled):hover{background:var(--q1)}'; document.head.appendChild(st); }
      inp.onchange = async () => {
        ctx.corte = inp.value; if (cb) cb.textContent = fDMY(inp.value) + ' ▾';
        $('rep-nota').textContent = '· cargando…';
        try { await onCorte(inp.value); } catch (e) { console.error(e); if ($('rep-nota')) $('rep-nota').textContent = '· no se pudo cargar ese corte'; }
      };
      $('rep-nota').textContent = '· ' + this.resolver(inp.value, ctx.fechas).nota;
      cb.onclick = e => { e.stopPropagation(); const cal = $('rep-cal'); if (cal.hidden) { const d = new Date(inp.value + 'T00:00:00'), rc = cb.getBoundingClientRect(); cal.style.top = (rc.bottom + 6) + 'px'; cal.style.left = rc.left + 'px'; this.calendario(d.getFullYear(), d.getMonth(), ctx); cal.hidden = false; } else cal.hidden = true; };
      if (!window._repCalDoc) { window._repCalDoc = true; document.addEventListener('click', () => { const cal = $('rep-cal'); if (cal) cal.hidden = true; }); }
    }
  };
  window.CorteReporte = CR;
  // --- Mi entidad: el widget sobre el paquete E ---
  function repCorteHTML() { return CR.html({ rep: E._rep, fechas: E._repFechas, corte: E._repCorte }); }
  // aplica la fecha de corte a TODO lo que muestra la ficha de la entidad: PIM/cert/comp/devengado por inversión (metas y LAKE),
  // por fuente y los totales. Cierre de mes: devengado exacto al mes (PIM/cert/comp actuales, el MEF no los publica por mes); foto diaria: todo al día.
  async function aplicarCorte(fecha) {
    const r = CR.resolver(fecha, E._repFechas), ue = E._ue.cod, cp = x => JSON.parse(JSON.stringify(x));
    if (!E._orig) E._orig = { metas: cp(E.metas), lake: cp(LAKE), fi: cp(E.presupuesto.fuentes_inv || {}), inv: cp(E.presupuesto.inversiones), total: cp(E.presupuesto.total) };
    E.metas = cp(E._orig.metas); LAKE = cp(E._orig.lake); E.presupuesto.fuentes_inv = cp(E._orig.fi); E.presupuesto.inversiones = cp(E._orig.inv); E.presupuesto.total = cp(E._orig.total);
    E._corteVista = null;
    if (!r.corte) return r;
    const { datos, k } = await CR.cargar(ue, r), { porCui, porFte } = CR.valores(datos, k);
    Object.entries(porCui).forEach(([cui, v]) => {
      // ponytail: con SIAF un CUI puede tener varias metas; el monto al corte se reparte proporcional al PIM original de cada meta
      const ms = E.metas.filter(m => m.act_proy === cui), base = ms.reduce((a, m) => a + (m.pim || 0), 0);
      ms.forEach(m => { const w = ms.length === 1 ? 1 : base ? (m.pim || 0) / base : 1 / ms.length; Object.assign(m, { pim: v.pim * w, cert: v.cert * w, comp: v.comp * w, comp_anual: v.comp * w, dev: v.dev * w, gir: v.dev * w, pag: v.dev * w }); });
      if (LAKE[cui]) Object.assign(LAKE[cui], { pim: v.pim, cert: v.cert, comp: v.comp, dev: v.dev, gir: v.dev });
    });
    Object.values(porFte).forEach(f => { f.comp_anual = f.comp; f.gir = f.pag = f.dev; });
    if (Object.keys(porFte).length) E.presupuesto.fuentes_inv = porFte;
    const K = ['pim', 'cert', 'comp', 'comp_anual', 'dev', 'gir', 'pag'], I0 = E._orig.inv, I1 = {};
    K.forEach(k2 => I1[k2] = E.metas.filter(m => m.es_inv).reduce((a, m) => a + (m[k2] || 0), 0));
    Object.assign(E.presupuesto.inversiones, I1);
    K.forEach(k2 => { if (E.presupuesto.total[k2] != null) E.presupuesto.total[k2] = E.presupuesto.total[k2] - (I0[k2] || 0) + I1[k2]; });
    E._corteVista = k.fecha;
    return r;
  }
  function repWire() {
    const ctx = { rep: E._rep, fechas: E._repFechas, corte: E._repCorte, ue: E._ue.cod, nombre: E._ue.nombre };
    CR.wire(ctx, async fecha => { E._repCorte = fecha; const r = await aplicarCorte(fecha); render(); if ($('rep-nota')) $('rep-nota').textContent = '· ' + r.nota; });
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
    const tabs = [['res', 'Resumen'], ['ppto', 'Presupuesto'], ['inv', modoInv ? 'Inversiones' : 'Metas'], ['exp', 'Expedientes' + (filtroMeta ? ' · ' + filtroMeta : '')], ['ing', 'Ingresos'], ['plz', '⏱ Plazos'], ['pi', E._ue.nivel === 'R' ? '🏅 FED' : E._ue.nivel === 'E' ? '🎯 Metas' : '🏅 Incentivos Municipales'], ['al', `Alertas (${nAl})`], ['prov', 'Proveedores'], ['cert', 'Certificaciones']];
    const cab = `<div class="pd-cui"><span>MI ENTIDAD · UE ${u.cod}</span><span>· ${E.publico ? 'Datos MEF' : 'SIAF'} al ${E.corte}</span>${E._corteVista ? `<span style="background:var(--gold);color:#1C1917;border-radius:6px;padding:1px 8px;margin-left:6px">CORTE ${fDMY(E._corteVista)}</span>` : ''}<span>· Transparencia al ${R.corte}</span><span class="x" id="ent-salir" title="Cerrar sesión">×</span></div><div class="pd-title">${u.nombre}</div>`;
    // ponytail: Plan de Incentivos también entra sin la cabecera técnica (KPIs, barra HOY, pestañas) — solo cabecera + volver
    if (tabE === 'pi') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">${E._ue.nivel === 'R' ? '🏅 FED · Fondo de Estímulo al Desempeño' : E._ue.nivel === 'E' ? '🎯 Metas' : '🏅 Plan de Incentivos ' + ANIO}</span><button class="btn" id="ent-volver-pi" style="margin-left:auto;background:#fff;color:var(--p2)">‹ Volver</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-volver-pi').onclick = () => { tabE = 'inv'; render(); }; $('ent-salir').onclick = () => { E = null; login(); }; cuerpo(); return; }
    // ponytail: Inversión pública también entra sin cabecera técnica — lista simple de obras; la ficha de cada una se abre debajo
    if (tabE === 'inv') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">🏗 Inversión pública</span>${repCorteHTML()}${abiertos.invLista ? `<input type="search" id="ent-invq" placeholder="Buscar por CUI o nombre…" value="${q}" style="padding:6px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:12px;width:240px"><button class="btn" id="ent-volver-inv" style="background:#fff;color:var(--p2)">‹ Volver</button>` : `<button class="btn" id="ent-ver-lista" style="background:#fff;color:var(--p2)">📋 Ver lista completa</button>`}<button class="btn" id="ent-tec" style="background:#fff;color:var(--p2)">Ver detalle técnico ▸</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-tec').onclick = () => { tabE = 'res'; render(); }; $('ent-salir').onclick = () => { E = null; login(); };
      if ($('ent-volver-inv')) $('ent-volver-inv').onclick = () => { abiertos.invLista = false; render(); };
      if ($('ent-invq')) $('ent-invq').oninput = e => { q = e.target.value.trim().toLowerCase(); cuerpo(); };
      if ($('ent-ver-lista')) $('ent-ver-lista').onclick = () => { abiertos.invLista = true; render(); };
      repWire();
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
    $('ent-xls').onclick = () => CR.exportar(E._ue.cod, E._ue.nombre, () => { const rows = [...$('ent-body').querySelectorAll('tr:not(.det)')].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g, ' ').trim())); const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'MiEntidad'); XLSX.writeFile(wb, `mi_entidad_${u.cod}_${tabE}.xlsx`); });
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
  const cap = t => { t = (t || '').replace(/^[\d.\s-]+/, '').toLowerCase(); t = t.charAt(0).toUpperCase() + t.slice(1); return t.length > 34 ? t.slice(0, 32) + '…' : t; };
  const FM = n => 'S/ ' + M(n) + ' M';
  const mlabel = s => META[s] ? (META[s].es_inv ? META[s].act_proy : 'meta ' + META[s].meta) : s;
  // ponytail: estado de ejecución de una inversión a partir de los campos ya cargados en LAKE (sin fetch adicional por CUI)
  const ESTINV = { culminada: ['Culminada', '#2E7D32'], ejecucion: ['En ejecución de obra', '#1565C0'], expediente: ['En expediente técnico', '#8E24AA'], viable: ['Viable · por iniciar', '#F9A825'], paralizada: ['Paralizada / suspendida', '#C62828'] };
  // ponytail: mismos 5 estados y colores que ESTINV, solo que con etiquetas cortas — para que los chips de "estado de la cartera" nunca partan en 2 líneas
  const ESTCHIP = { culminada: 'Culminada', ejecucion: 'En ejecución', expediente: 'Expediente técnico', viable: 'Por iniciar', paralizada: 'Paralizada' };
  // ponytail: forma además de color (igual que el dashboard MINAM: círculo=avanza normal, rombo/cuadrado=requiere atención) — así el estado no depende solo del color, ni en la leyenda ni en los puntos del mapa
  const ESTSHAPE = { culminada: 'border-radius:50%', ejecucion: 'border-radius:50%', expediente: 'border-radius:50%', viable: 'border-radius:2px;transform:rotate(45deg)', paralizada: 'border-radius:2px' };
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
  function pintarMapaInv(items, estSel, onGoto) {
    cargarLeaflet().then(() => {
      const el = $('inv-mapa'); if (!el || !window.L) return;
      const mp = L.map(el, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mp);
      // ponytail: halo pulsante — mismo @keyframes nacPulse del dashboard MINAM (Dashboard_UE003_MINAM/index.html), inyectado una sola vez
      if (!document.getElementById('nac-pulse-css')) {
        const pc = document.createElement('style'); pc.id = 'nac-pulse-css';
        pc.textContent = '@keyframes nacPulse{0%{transform:scale(.55);opacity:.85}70%{transform:scale(2.2);opacity:0}100%{opacity:0}}'
          + '.nac-pin{position:relative;cursor:pointer}'
          + '.nac-pin .nu{width:12px;height:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);position:absolute;top:4px;left:4px}'
          + '.nac-pin .on{width:20px;height:20px;border-radius:50%;position:absolute;top:0;left:0;animation:nacPulse 2s ease-out infinite}';
        document.head.appendChild(pc);
      }
      // ponytail: el MEF suele georreferenciar varias inversiones al mismo punto (capital de distrito, no la obra exacta) — se agrupan en un solo marcador con contador para que no se tapen entre sí
      const grupos = {};
      items.forEach(it => {
        // ponytail: "0,0" (null island, frente a África) es el valor centinela típico cuando al MEF le falta la coordenada real — nunca es un dato válido en Perú (longitud siempre negativa)
        if (it.lat == null || it.lon == null || it.lon === 0) return;
        if (estSel && it.est !== estSel) return; // al seleccionar un estado, el mapa muestra solo esos puntos (igual que _mapaFiltroToggle del dashboard MINAM)
        const key = it.lat.toFixed(4) + ',' + it.lon.toFixed(4);
        (grupos[key] || (grupos[key] = [])).push(it);
      });
      const pts = [];
      Object.values(grupos).forEach(arr => {
        const { lat, lon } = arr[0];
        const estUnico = arr.every(x => x.est === arr[0].est) ? arr[0].est : null;
        const col = estUnico ? ESTINV[estUnico][1] : '#37474F';
        const n = arr.length;
        const forma = estUnico ? ESTSHAPE[estUnico] : 'border-radius:50%';
        const html = n === 1
          ? `<div class="nac-pin"><div class="on" style="background:${col}88"></div><div class="nu" style="background:${col};${forma}"></div></div>`
          : `<div class="nac-pin"><div class="on" style="background:${col}88"></div><div style="width:22px;height:22px;${forma};background:${col};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);position:absolute;top:-1px;left:-1px;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center">${n}</div></div>`;
        const ic = L.divIcon({ className: '', html, iconSize: [20, 20], iconAnchor: [10, 10] });
        // ponytail: clic en el CUI (uno solo = el marcador mismo; varios = el CUI dentro del tooltip) abre su ficha — mismo onGoto que usa el resto del tablero
        const tip = n === 1
          ? `<b>${arr[0].cui}</b> ${arr[0].nombre}<br>${ESTINV[arr[0].est][0]}`
          : `<b>${n} inversiones en este punto</b><br>${arr.slice(0, 8).map(x => `<span class="nac-cui" data-cui="${x.cui}" style="${onGoto ? 'cursor:pointer;text-decoration:underline' : ''}">${x.cui}</span> · ${ESTINV[x.est][0]}`).join('<br>')}${n > 8 ? `<br>y ${n - 8} más…` : ''}`;
        const mk = L.marker([lat, lon], { icon: ic }).addTo(mp).bindTooltip(tip, n > 1 ? { interactive: true } : undefined);
        if (onGoto) {
          if (n === 1) mk.on('click', () => onGoto(arr[0].cui));
          else mk.on('tooltipopen', e => { const el2 = e.tooltip.getElement(); if (el2) el2.querySelectorAll('.nac-cui').forEach(s => s.onclick = ev => { ev.stopPropagation(); onGoto(s.dataset.cui); }); });
        }
        pts.push([lat, lon]);
      });
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
  // ponytail: resumen de "Inversión pública" — tablero fijo de dos columnas (KPIs + cartera a la izquierda, mapa a la derecha), sin scroll, como el dashboard MINAM; el detalle de cada KPI (embudo, fuentes) se abre en un overlay para no romper el layout fijo.
  // Reutilizable: no depende de E/LAKE/abiertos — recibe T/items/opts ya armados por quien la llama, así sirve tanto para "Mi entidad" (datos privados del SIAF) como para la ficha pública de la UE (datos de Transparencia/SEACE, sin clave). Expuesta en window.ResumenInversion.
  function resumenInversion(b, T, items, opts) {
    opts = opts || {};
    const fts = opts.fts || [];
    const est = { culminada: [], ejecucion: [], expediente: [], viable: [], paralizada: [] };
    items.forEach(it => est[estadoInv(it.c)].push(it));
    const mapItems = items.map(it => ({ cui: it.act_proy, nombre: (it.c.nombre || (opts.nombreFallback ? opts.nombreFallback(it) : it.act_proy)).slice(0, 70), lat: it.c.lat, lon: it.c.lon, est: estadoInv(it.c) }));
    const bc = opts.beneficiarios || null;
    const estList = Object.entries(est).filter(([, v]) => v.length).map(([k, v]) => [ESTCHIP[k], v.length, ESTINV[k][1], k]);
    const pim1 = T.pim || 1;
    // ponytail: medidas calcadas del kpi()/chip()/barra() reales del dashboard MINAM (Dashboard_UE003_MINAM/index.html, función _renderImpacto) — la letra nunca va por debajo de esos tamaños; solo los paddings/gaps se ajustan un poco más apretados para no dejar aire de sobra
    const secHdr = (txt, mb) => `<div style="font-size:11px;font-weight:900;color:#37474F;text-transform:uppercase;letter-spacing:.6px;margin-bottom:${mb == null ? 7 : mb}px">${txt}</div>`;
    const kpiT = (id, icono, num, lbl, col, bg, br) => `<div data-p="${id}" style="cursor:pointer;min-width:0;background:${bg};border:1.5px solid ${br};border-left:5px solid ${col};border-radius:14px;padding:7px 11px;display:flex;flex-direction:row;align-items:center;gap:8px;box-shadow:0 1px 5px rgba(16,24,40,.08)">
      <span style="font-size:23px;flex:none;line-height:1">${icono}</span>
      <div style="min-width:0"><div style="font-size:18px;font-weight:900;color:${col};letter-spacing:-.5px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${num}">${num}</div>
      <div style="font-size:10px;font-weight:800;color:#546E7A;margin-top:3px;line-height:1.25;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${lbl}">${lbl}</div></div>
    </div>`;
    // ponytail: clic en un chip de estado reemplaza "Ejecución presupuestal" por la lista de CUIs de ese estado (mismo patrón que _estadoListaHTML del dashboard MINAM, con CUI en vez de nombre corto — acá no hay catálogo de nombres cortos)
    const estSel = opts.estSel && est[opts.estSel] ? opts.estSel : null;
    // ponytail: chips no seleccionados se atenúan y el seleccionado crece un poco — igual que window._mapaFiltroToggle del dashboard MINAM
    const chipPill = (n, lbl, col, key) => { const on = !estSel || key === estSel; return `<div data-est="${key}" style="cursor:pointer;flex:1;min-width:0;background:${col};border-radius:13px;padding:6px 5px;text-align:center;color:#fff;box-shadow:0 2px 8px ${col}55;opacity:${on ? 1 : .35};transform:${estSel && key === estSel ? 'scale(1.04)' : 'scale(1)'};transition:opacity .15s,transform .15s">
      <div style="font-size:19px;font-weight:900;line-height:1">${n}</div>
      <div style="font-size:9.5px;font-weight:800;margin-top:3px;text-transform:uppercase;letter-spacing:.3px;opacity:.95;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${lbl}">${lbl}</div>
    </div>`; };
    const barra = (lbl, val, pctv, col) => `<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;color:#37474F;margin-bottom:3px"><span>${lbl}</span><span style="color:${col}">${FM(val)}${pctv != null ? ` · ${Math.round(pctv)}%` : ''}</span></div>
      <div style="height:7px;background:#ECEFF3;border-radius:6px;overflow:hidden"><div style="height:100%;width:${pctv != null ? Math.min(pctv, 100) : 100}%;background:linear-gradient(90deg,${col}CC,${col});border-radius:6px"></div></div>
    </div>`;
    const panelInferior = estSel ? (() => {
      const [lbl, col] = ESTINV[estSel], arr = est[estSel];
      return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <div style="font-size:10.5px;font-weight:900;color:${col};text-transform:uppercase;letter-spacing:.4px"><span style="display:inline-block;width:8px;height:8px;${ESTSHAPE[estSel]};background:${col};margin-right:5px"></span>${lbl.toUpperCase()} — ${arr.length} INVERSI${arr.length === 1 ? 'ÓN' : 'ONES'}</div>
        <div data-est-clear title="Volver a ejecución presupuestal" style="cursor:pointer;width:18px;height:18px;border-radius:50%;background:#ECEFF3;color:#546E7A;font-size:11px;font-weight:900;line-height:18px;text-align:center;flex:none">✕</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px">${arr.map(it => `<div data-inv-goto="${it.act_proy}" style="display:flex;align-items:center;gap:5px;padding:3px 4px;border-radius:6px;cursor:pointer">
        <span style="flex:1;font-size:11.5px;font-weight:700;color:#37474F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.act_proy}</span>
        <span style="color:${col};font-weight:900;font-size:10px;flex:none">→</span>
      </div>`).join('')}</div>
      <div style="font-size:9px;color:#90A4AE;margin-top:6px">Clic en un CUI para abrir su ficha · ✕ o el mismo estado para volver</div>`;
    })() : `${secHdr('Ejecución presupuestal')}
      ${barra('PIM', T.pim, null, '#37474F')}
      ${barra('Certificación', T.cert, (T.cert || 0) * 100 / pim1, '#6A1B9A')}
      ${barra('Compromiso', T.comp_anual, (T.comp_anual || 0) * 100 / pim1, '#00838F')}
      ${barra('Devengado', T.dev, (T.dev || 0) * 100 / pim1, '#E65100')}
      <div style="font-size:9px;color:#90A4AE;margin-top:2px">Fuente: Transparencia Económica — MEF</div>`;
    b.innerHTML = `<div style="display:flex;gap:9px;height:100%;box-sizing:border-box;padding:8px">
      <div style="flex:1.15;min-width:0;display:flex;flex-direction:column;gap:7px;min-height:0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          ${kpiT('kpi', '💰', FM(T.pim), `Resumen general · devengado ${Math.round((T.dev || 0) * 100 / pim1)}%`, '#0F2A43', '#F4FBF4', '#C8E6C9')}
          ${kpiT('benef', '👥', bc ? N(bc.total) : '…', bc ? `Beneficiarios · ${bc.conDato}/${items.length} con dato` : 'Beneficiarios · calculando…', '#1B5E20', '#F4FBF4', '#C8E6C9')}
          ${kpiT('fuentes', '🏦', fts[0] ? cap(fts[0].nombre) : 'sin datos', `Por fuente · ${fts.length} fuentes`, '#1565C0', '#F5F9FF', '#BBDEFB')}
          ${kpiT('cert', '📋', FM(T.cert), `Certificación · ${Math.round((T.cert || 0) * 100 / pim1)}% del PIM`, '#6A1B9A', '#F8F3FC', '#D8BFE0')}
          ${kpiT('comp', '🤝', FM(T.comp_anual), `Compromiso · ${Math.round((T.comp_anual || 0) * 100 / pim1)}% del PIM`, '#00838F', '#F0FBFC', '#B2E0E4')}
          ${kpiT('dev', '💵', FM(T.dev), `Devengado · ${Math.round((T.dev || 0) * 100 / pim1)}% del PIM`, '#E65100', '#FDEEE3', '#F5CBA0')}
        </div>
        <div class="card" style="flex:none;border-radius:14px;padding:8px 11px">
          ${secHdr(`Estado de la cartera — ${items.length} inversiones`)}
          <div style="display:flex;gap:7px">${estList.map(([l, v, c, k]) => chipPill(v, l, c, k)).join('')}</div>
        </div>
        <div class="card" style="flex:1;min-height:0;border-radius:14px;padding:8px 11px;overflow:auto">${panelInferior}</div>
      </div>
      <div class="card" style="flex:1;min-width:0;border-radius:14px;display:flex;flex-direction:column;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          ${secHdr(`Mapa de inversiones${(() => { const tot = estSel ? est[estSel].length : items.length, con = mapItems.filter(it => (!estSel || it.est === estSel) && it.lat != null && it.lon != null).length; return con < tot ? ` · ${con}/${tot} con coordenadas` : ''; })()}`, 0)}
          <div style="display:flex;gap:8px;font-size:9px;font-weight:700;color:#546E7A;flex-wrap:wrap">${Object.entries(ESTINV).map(([k, [l, c]]) => `<span><span style="display:inline-block;width:8px;height:8px;${ESTSHAPE[k]};background:${c};margin-right:3px"></span>${l}</span>`).join('')}</div>
        </div>
        <div id="inv-mapa" style="flex:1;min-height:0;border-radius:11px;background:var(--grid)"></div>
      </div>
      <div class="card" style="flex:0 0 240px;min-width:0;border-radius:14px;display:flex;flex-direction:column;gap:8px;padding:10px">
        ${secHdr('Ir al detalle', 6)}
        ${(() => {
          const nAl = opts.nAlertas || 0;
          // ponytail: el incentivo cambia por nivel de gobierno: municipal = Plan de Incentivos, regional = FED, nacional = Metas (en elaboración)
          const GO = [
            ['pi', ...(opts.nivel === 'R' ? ['🏅', 'FED', '#C9A227'] : opts.nivel === 'E' ? ['🎯', 'Metas', '#C9A227'] : ['🏅', 'Plan de Incentivos', '#C9A227'])],
            ['sea', '📑', 'Contrataciones', '#00897B'],
            ['al', '🚨', nAl ? `Alertas · ${nAl}` : 'Alertas', '#D64545']
          ];
          // ponytail: SIN class="pnl" a propósito — esa clase global trae flex-direction:column y pisaba el layout en fila (ver mismo bug ya corregido en kpiT/chipPill)
          return GO.map(([id, ic, t, c]) => `<div class="go-btn" data-go="${id}" style="cursor:pointer;flex:1;min-height:0;border-radius:12px;background:linear-gradient(160deg,#fff 55%,${c}14);border:1px solid ${c}33;display:flex;flex-direction:row;align-items:center;gap:11px;padding:0 13px;box-shadow:0 2px 8px rgba(15,42,67,.07)">
            <span style="font-size:26px;flex:none;line-height:1">${ic}</span>
            <span style="font-size:12.5px;font-weight:800;color:${c};line-height:1.25">${t}</span>
          </div>`).join('');
        })()}
      </div>
    </div>`;
    if (!document.getElementById('nac-gobtn-css')) { const gc = document.createElement('style'); gc.id = 'nac-gobtn-css'; gc.textContent = '.go-btn{transition:transform .15s,box-shadow .15s}.go-btn:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(15,42,67,.14)!important}'; document.head.appendChild(gc); }
    b.querySelectorAll('[data-go]').forEach(x => x.onclick = () => opts.onNav && opts.onNav(x.dataset.go));
    pintarMapaInv(mapItems, estSel, opts.onCuiGoto);
    const kpi = (id, cb) => { const el2 = b.querySelector(`[data-p="${id}"]`); if (el2) el2.onclick = cb; };
    kpi('kpi', () => opts.onKpi && opts.onKpi('kpi', T));
    kpi('cert', () => opts.onKpi && opts.onKpi('cert', T));
    kpi('comp', () => opts.onKpi && opts.onKpi('comp', T));
    kpi('dev', () => opts.onKpi && opts.onKpi('dev', T));
    kpi('benef', () => opts.onKpi && opts.onKpi('benef', T, bc));
    kpi('fuentes', () => opts.onKpi && opts.onKpi('fuentes', T, fts));
    b.querySelectorAll('[data-est]').forEach(x => x.onclick = () => { const k = x.dataset.est; opts.onEstSel && opts.onEstSel(estSel === k ? null : k); });
    if (b.querySelector('[data-est-clear]')) b.querySelector('[data-est-clear]').onclick = () => opts.onEstSel && opts.onEstSel(null);
    b.querySelectorAll('[data-inv-goto]').forEach(x => x.onclick = () => opts.onCuiGoto && opts.onCuiGoto(x.dataset.invGoto));
  }
  window.ResumenInversion = resumenInversion;
  window.ResumenInversionUtil = { funnelGasto, verDetalleResumen, cerrarDetalleResumen, estadoInv };
  // ponytail: ficha de inversión — mismo modelo visual del Dashboard Ejecutivo UE003 MINAM (pedido de David),
  // reutilizable entre el overlay de "Mi entidad" y la ficha pública del CUI (paginaCUI en index.html).
  // Queda fuera lo que en ese dashboard es específico de GICA/JICA y no tiene dato genérico equivalente
  // a nivel nacional: desglose control concurrente/controversias/carta fianza, chip "programado en el
  // PMI", hectáreas/vehículos/tipo de obra, y exportación a PPT (Descargar Ficha usa impresión del navegador).
  // ponytail: extraído de fichaInversionHTML para reusarlo también en el modal de Seguimiento (modelo MINAM _situDetalle)
  function buildSituDet(f, c, sp) {
    return [
      f?.situ_act ? `<div style="font-size:10.5px;margin-bottom:6px">${f.situ_act}</div>` : '',
      f?.problema ? `<div style="font-size:9.5px;color:#B71C1C;margin-bottom:6px"><b>Problemática:</b> ${f.problema}</div>` : '',
      sp && sp.length ? contratacion(sp, c, f, true) : ''
    ].join('') || '<p class="vacio" style="font-size:10.5px">Sin seguimiento adicional registrado.</p>';
  }
  // Modal de Seguimiento (Formato 12-B) — clon del lightbox #situ-detalle del Dashboard UE003 MINAM
  function mostrarSeguimientoModal(cui, nombre, contenidoHTML) {
    let lb = $('fi-situ-modal');
    if (!lb) {
      lb = document.createElement('div'); lb.id = 'fi-situ-modal';
      lb.style.cssText = 'display:none;position:fixed;inset:0;z-index:99998;background:rgba(10,20,35,.55);align-items:center;justify-content:center;padding:24px;box-sizing:border-box;cursor:pointer';
      lb.onclick = () => { lb.style.display = 'none'; };
      document.body.appendChild(lb);
    }
    lb.innerHTML = `<div class="fi-situ-card" onclick="event.stopPropagation()" style="cursor:default;background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 12px 44px rgba(0,0,0,.35);padding:16px 20px 14px">
      <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #DCE7F5;padding-bottom:10px;margin-bottom:11px">
        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#0A1B2E,#1E6BB8);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📡</div>
        <div><div style="font-size:14px;font-weight:900;color:#0F2A43">Seguimiento de la inversión</div>
        <div style="font-size:10.5px;font-weight:700;color:#5E7290">CUI ${cui} · Formato 12-B — Ejecución de la inversión</div></div>
        <button class="fi-situ-copy" style="margin-left:auto;flex-shrink:0;background:#0F2A43;color:#fff;border:none;border-radius:9px;padding:7px 14px;font-size:11px;font-weight:900;cursor:pointer;letter-spacing:.3px;box-shadow:0 2px 6px rgba(15,42,67,.3)">⧉ Copiar</button>
      </div>
      ${nombre ? `<div class="fi-situ-nom" style="font-size:10.5px;font-weight:700;color:#78909C;line-height:1.4;margin-bottom:10px">${nombre}</div>` : ''}
      <div class="fi-situ-txt" style="background:#EAF1FB;border:1.5px solid #B9D0EC;border-radius:12px;padding:12px 15px;font-size:12.5px;color:#1E293B;line-height:1.65;font-weight:600;user-select:text;cursor:text">${contenidoHTML}</div>
      <div style="font-size:9px;color:#9AA8BC;text-align:center;margin-top:10px">Fuente: Formato 12-B — Seguimiento de la ejecución · MEF (Banco de Inversiones) · clic fuera para cerrar</div>
    </div>`;
    lb.style.display = 'flex';
    const btn = lb.querySelector('.fi-situ-copy');
    btn.onclick = () => {
      const nom = lb.querySelector('.fi-situ-nom'), cont = lb.querySelector('.fi-situ-txt');
      const txt = ((nom ? nom.innerText + '\n' : '') + 'CUI ' + cui + ' — Seguimiento (Formato 12-B — MEF)\n\n' + (cont ? cont.innerText : '')).trim();
      const listo = () => { btn.textContent = '✓ Copiado'; btn.style.background = '#2E7D32'; setTimeout(() => { btn.textContent = '⧉ Copiar'; btn.style.background = '#0F2A43'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(listo, listo); else listo();
    };
  }
  function fichaInversionHTML(cui, f, c, sp) {
    c = c || {};
    const F = n => n == null ? '—' : 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const nombre = f?.nombre || c.nombre || 'Inversión ' + cui;
    const tipo = (f?.tipo || c.tipo || '').toUpperCase();
    const tipoCol = { 'PROYECTO DE INVERSION': '#5E35B1', 'IOARR': '#E65100', 'PROGRAMA DE INVERSION': '#00838F' }[tipo] || '#546E7A';
    const situ = (f?.situacion || c.situacion || '').toUpperCase();
    const cerrado = /CULMIN|CERRAD/.test(situ);
    // ponytail: "pim" acá es una señal de "hay presupuesto conocido" para el chip de estado — se toma
    // de c (Consulta Amigable) o, si no está disponible en este contexto, de la ficha SSI (costo/viable),
    // para no marcar "Obra suspendida" solo porque el contexto de la UE no cargó localmente.
    const av = f?.av_fis, dev = c.dev || 0, pim = c.pim || f?.costo || f?.viable || 0;
    let estObra = 'Obra en ejecución', colObra = '#1565C0';
    if (cerrado || (av != null && av >= 99.95)) { estObra = 'Obra culminada'; colObra = '#2E7D32'; }
    else if (dev <= 0 && (av == null || av <= 0)) { estObra = 'Obra por iniciar'; colObra = '#F57F17'; }
    else if (pim <= 0) { estObra = 'Obra suspendida'; colObra = '#C62828'; }
    const dpto = c.dpto || '';
    // tacómetro de 40 marcas — mismo estilo del modelo (donutTick local; no pisa el donut() global de index.html)
    function donutTick(pct, color, label) {
      const N2 = 40, RI = 27, RO = 34;
      const sd = (pct == null || isNaN(pct));
      const filled = sd ? 0 : Math.min(N2, Math.floor(Math.max(pct, 0) / 100 * N2));
      let segs = '';
      for (let i = 0; i < N2; i++) {
        const a = (-90 + i * (360 / N2)) * Math.PI / 180, on = i < filled;
        const x0 = (40 + RI * Math.cos(a)).toFixed(1), y0 = (40 + RI * Math.sin(a)).toFixed(1);
        const x1 = (40 + RO * Math.cos(a)).toFixed(1), y1 = (40 + RO * Math.sin(a)).toFixed(1);
        segs += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${on ? color : 'rgba(128,128,128,.22)'}" stroke-width="${on ? 2.6 : 2}" stroke-linecap="round"/>`;
      }
      const num = sd ? 's/d' : (pct % 1 === 0 ? pct : +(+pct).toFixed(1));
      const pctTs = sd ? '' : '<tspan font-size="9.5" font-weight="800" dx="1.5">%</tspan>';
      return `<div style="background:#F8FAFF;border:1.5px solid ${color}55;border-radius:12px;padding:7px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;width:94px;box-sizing:border-box">
        <div style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.5px;text-align:center;line-height:1.2;min-height:24px;display:flex;align-items:center;justify-content:center">${label}</div>
        <svg viewBox="0 0 80 80" width="58" height="58">${segs}<text x="40" y="45.5" text-anchor="middle" font-size="16.5" font-weight="900" fill="${color}" font-family="system-ui,sans-serif">${num}${pctTs}</text></svg>
      </div>`;
    }
    function tarjeta(lbl, val, dot, bg, br, txt) {
      return `<div style="background:${bg};border:1.5px solid ${br};border-left:5px solid ${dot};border-radius:10px;padding:4px 10px">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><svg viewBox="0 0 12 12" width="9" height="9"><circle cx="6" cy="6" r="6" fill="${dot}" opacity=".2"/><circle cx="6" cy="6" r="3.5" fill="${dot}"/></svg><div style="font-size:9.5px;color:${dot};font-weight:800;text-transform:uppercase;letter-spacing:.6px">${lbl}</div></div>
        <div style="font-size:${val >= 1e7 ? '13px' : val >= 1e6 ? '14px' : '16px'};font-weight:900;color:${txt};letter-spacing:-.4px">${F(val)}</div>
      </div>`;
    }
    const secHdrFi = (ic, bg, tit, sub) => `<div style="display:flex;align-items:center;gap:9px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #EEF1F4">
      <div style="width:26px;height:26px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${ic}</div>
      <div style="display:flex;flex-direction:column;gap:1px;min-width:0"><span style="font-size:12px;font-weight:800;color:#1E293B;text-transform:uppercase;letter-spacing:.5px;line-height:1.15">${tit}</span>${sub ? `<span style="font-size:9px;font-weight:600;color:#94A3B8">${sub}</span>` : ''}</div>
    </div>`;
    const comp = f?.comp || [];
    const compTot = comp.reduce((s, cp) => s + cp.a.reduce((t, a) => t + (+a.c || 0), 0), 0);
    const PALETA = ['#1E5AA8', '#E65100', '#5E35B1', '#00838F', '#AD1457', '#3572BE'];
    const compAccHTML = comp.length ? comp.map(cp => {
      const nAcc = cp.a.length;
      return `<div style="margin-bottom:8px">
        <div class="fi-comp-hdr" style="cursor:pointer;background:#1E5AA8;color:#fff;border-radius:10px;padding:9px 13px;display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span style="font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:6px"><span style="font-size:9px">►</span>${cp.n}</span>
          <span style="background:rgba(255,255,255,.22);border-radius:9px;padding:2px 9px;font-size:10px;font-weight:800;white-space:nowrap">${nAcc} acci${nAcc === 1 ? 'ón' : 'ones'}</span>
        </div>
        <div style="display:none;padding:8px 6px 2px">${cp.a.map(a => `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 8px;font-size:10.5px;color:#37474F"><span>${a.n}${a.f ? ` <span class="mutx">· ${a.f}</span>` : ''}</span><b style="white-space:nowrap">${F(+a.c || null)}</b></div>`).join('')}</div>
      </div>`;
    }).join('') : '<p class="vacio" style="font-size:11px">Sin componentes registrados.</p>';
    const actividadHTML = comp.length ? comp.map((cp, i) => {
      const monto = cp.a.reduce((t, a) => t + (+a.c || 0), 0);
      const pct = compTot ? (100 * monto / compTot) : 0;
      const col = PALETA[i % PALETA.length];
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:3px"><span style="font-weight:700;color:#37474F">${cp.n}</span><b style="color:${col}">${pct.toFixed(1)}%</b></div>
        <div style="background:#EEF1F4;border-radius:6px;height:8px;overflow:hidden"><div style="width:${Math.max(2, pct)}%;height:100%;background:${col}"></div></div>
        <div style="text-align:right;font-size:10px;font-weight:800;color:#37474F;margin-top:2px">${F(monto)}</div>
      </div>`;
    }).join('') : '<p class="vacio" style="font-size:11px">Sin desglose de actividad.</p>';
    const footerHTML = `<div style="margin-top:6px;padding:8px 11px;background:rgba(30,90,168,.09);border:2px solid #1E5AA8;border-radius:10px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;font-weight:900;color:#0F2A43;text-transform:uppercase;letter-spacing:.4px">Total Devengado</span>
      <span style="font-size:13px;font-weight:900;color:#0F2A43">${F(c.dev)}</span>
    </div>`;
    const benef = f?.beneficiarios || c.beneficiarios;
    const impactoHTML = benef
      ? `<div style="background:#EAF1FB;border:1.5px solid #B9D0EC;border-radius:14px;padding:10px 12px;display:flex;align-items:center;gap:10px">
          <span style="font-size:30px">👥</span>
          <div style="flex:1;text-align:center"><div style="font-size:23px;font-weight:900;color:#0F2A43;line-height:1">${N(benef)}</div><div style="font-size:10px;font-weight:800;color:#1E5AA8;margin-top:3px">Beneficiarios</div></div>
        </div>`
      : '<p class="vacio" style="font-size:11px;text-align:center;padding:14px 0">Sin datos de impacto registrados a nivel nacional.</p>';
    return `<div style="background:linear-gradient(135deg,#153F6E 0%,#1E5AA8 55%,#5F94D1 100%);padding:10px 18px 9px;position:relative">
      <button class="fi-regresar" style="position:absolute;top:12px;right:12px;height:28px;border-radius:14px;border:1.5px solid rgba(255,255,255,.32);background:rgba(255,255,255,.12);cursor:pointer;font-size:10.5px;color:#fff;font-weight:800;letter-spacing:.4px;display:flex;align-items:center;gap:6px;padding:0 14px;font-family:inherit">← Regresar</button>
      <button class="fi-print" style="position:absolute;bottom:10px;right:12px;height:28px;border-radius:14px;border:none;background:#fff;cursor:pointer;font-size:10.5px;color:#0F2A43;font-weight:900;letter-spacing:.4px;display:flex;align-items:center;gap:5px;padding:0 14px;font-family:inherit;box-shadow:0 2px 8px rgba(0,20,0,.28)">⬇ Descargar Ficha</button>
      <div style="font-size:13.5px;font-weight:800;color:#fff;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px">CUI ${cui}</div>
      <div title="${nombre}" style="font-size:13.5px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:8px;text-shadow:0 1px 3px rgba(0,20,0,.28);max-width:72%">${nombre}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-right:150px">
        ${tipo ? `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:800;background:#fff;color:${tipoCol};box-shadow:0 1px 3px rgba(0,0,0,.18);letter-spacing:.4px">${tipo}</span>` : ''}
        <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:800;background:#fff;color:${cerrado ? '#C62828' : '#2E7D32'};box-shadow:0 1px 3px rgba(0,0,0,.18)">${cerrado ? '○ CERRADO' : '● ACTIVO'}</span>
        ${dpto ? `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;background:#fff;color:#0F2A43;box-shadow:0 1px 3px rgba(0,0,0,.18)">📍 ${dpto}</span>` : ''}
        ${f?.modalidad ? `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;background:rgba(255,255,255,.92);color:#455A64;box-shadow:0 1px 3px rgba(0,0,0,.15)">${f.modalidad}</span>` : ''}
        <span style="padding:3px 12px;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);display:inline-flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${colObra};box-shadow:0 0 0 2.5px ${colObra}26"></span>
          <span style="font-size:10px;font-weight:900;color:${colObra};letter-spacing:.4px">${estObra}</span>
        </span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:22% 17% 19% 24% 18%;background:#fff;border:1px solid #E5E9EF;border-top:none;overflow:hidden">
      <div style="border-right:1px solid #DCE7F5;padding:8px 14px;display:flex;flex-direction:column;gap:6px;justify-content:center;background:linear-gradient(180deg,#EAF1FB 0%,#FAFBFE 100%)">
        ${secHdrFi('💰', '#DCE7F5', 'Presupuesto de Inversión')}
        <div style="display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;background:#F8FFFE;border:1px solid #CFD8DC;border-radius:8px;padding:3px 8px">
            <span style="font-size:8.5px;font-weight:800;color:#607D8B;text-transform:uppercase;letter-spacing:.4px">● Perfil Viable</span>
            <span style="font-size:11px;font-weight:900;color:#37474F;white-space:nowrap">${F(f?.viable)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:1.5px 2px">
            <span style="font-size:8px;font-weight:800;color:#78909C;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">Costo inversión act. <span style="color:#B0BEC5">(a)</span></span>
            <span style="font-size:9.5px;font-weight:800;color:#455A64;white-space:nowrap">${F(f?.costo)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:1.5px 2px">
            <span style="font-size:8px;font-weight:800;color:#78909C;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">Control concurrente <span style="color:#B0BEC5">(b)</span></span>
            <span style="font-size:9.5px;font-weight:800;color:#455A64;white-space:nowrap">${F(f?.cc_eje)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:1.5px 2px">
            <span style="font-size:8px;font-weight:800;color:#78909C;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">Controversias <span style="color:#B0BEC5">(c)</span></span>
            <span style="font-size:9.5px;font-weight:800;color:#455A64;white-space:nowrap">${F(f?.contro)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:1.5px 2px">
            <span style="font-size:8px;font-weight:800;color:#78909C;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">Carta fianza <span style="color:#B0BEC5">(d)</span></span>
            <span style="font-size:9.5px;font-weight:800;color:#455A64;white-space:nowrap">${F(f?.carta)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;background:#EAF1FB;border:1.5px solid #B9D0EC;border-radius:8px;padding:4px 8px" title="Costo total de la inversión actualizado = (a)+(b)+(c)+(d)">
            <span style="font-size:8.5px;font-weight:900;color:#1E5AA8;text-transform:uppercase;letter-spacing:.4px">● Costo Total <span style="color:#8FB4E0">(a+b+c+d)</span></span>
            <span style="font-size:11px;font-weight:900;color:#0F2A43;white-space:nowrap">${F(f?.costo_total || f?.costo)}</span>
          </div>
        </div>
      </div>
      <div style="border-right:1px solid #DCE7F5;display:flex;flex-direction:column;gap:7px;align-items:center;justify-content:center;padding:6px;background:linear-gradient(180deg,#EAF1FB 0%,#FAFBFE 100%)">
        <div style="width:100%;box-sizing:border-box;background:${f?.pmi === 'SI' ? '#F0FBF0' : f?.pmi === 'NO' ? '#FFF5F5' : '#F8FAFB'};border:1.5px solid ${f?.pmi === 'SI' ? '#A5D6A7' : f?.pmi === 'NO' ? '#FFCDD2' : '#E0E0E0'};border-radius:9px;padding:4px 8px;display:flex;align-items:center;justify-content:center;gap:6px">
          <span style="width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${f?.pmi === 'SI' ? 'rgba(16,80,0,.12)' : f?.pmi === 'NO' ? 'rgba(183,28,28,.1)' : 'rgba(120,120,120,.12)'};font-size:9px;flex-shrink:0">${f?.pmi === 'SI' ? '✓' : f?.pmi === 'NO' ? '✗' : '?'}</span>
          <span style="font-size:9.5px;font-weight:900;color:${f?.pmi === 'SI' ? '#0F2A43' : f?.pmi === 'NO' ? '#B71C1C' : '#78909C'};letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f?.pmi === 'SI' ? 'PROGRAMADO EN EL PMI' : f?.pmi === 'NO' ? 'NO PROGRAMADO EN EL PMI' : 'SIN DATO DE PMI'}</span>
        </div>
        <div style="display:flex;gap:5px;justify-content:center">
          ${donutTick(f?.av_fis, '#0D47A1', 'Av. Físico')}
          ${donutTick(f?.av_ejec, '#00897B', 'Av. Financiero')}
        </div>
      </div>
      <div style="border-right:1px solid #DCE7F5;display:flex;flex-direction:column;justify-content:center;padding:6px 10px;gap:4px;background:linear-gradient(180deg,#EAF1FB 0%,#FAFBFE 100%)">
        ${tarjeta('PIM ' + ANIO, c.pim, '#1E5AA8', '#EAF1FB', '#B9D0EC', '#0F2A43')}
        ${tarjeta('Certificación ' + ANIO, c.cert, '#6A1B9A', '#F7F0FB', '#CE93D8', '#4A148C')}
        ${tarjeta('Devengado ' + ANIO, c.dev, '#E65100', '#FFF8F0', '#FFCC80', '#BF360C')}
      </div>
      <div style="border-right:1px solid #DCE7F5;display:flex;flex-direction:column;gap:7px;padding:8px 8px;background:linear-gradient(180deg,#EAF1FB 0%,#FAFBFE 100%)">
        <div class="fi-seg-hdr" style="flex:1;background:#EDF3FB;border:1.5px solid #B9D0EC;border-radius:12px;padding:8px 11px;display:flex;flex-direction:column;justify-content:center;cursor:pointer">
          <div style="font-size:12px;font-weight:900;color:#0F2A43;text-transform:uppercase;letter-spacing:.6px;display:flex;align-items:center;gap:8px"><span style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#0A1B2E,#1E6BB8);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📡</span>Seguimiento</div>
          <div style="font-size:10px;color:#7C93B8;font-weight:700;margin-top:4px;padding-left:38px">Clic para ver · Formato 12-B</div>
        </div>
        <div style="flex:1;background:#EDF3FB;border:1.5px solid #B9D0EC;border-radius:12px;padding:8px 11px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:12px;font-weight:900;color:#0F2A43;text-transform:uppercase;letter-spacing:.6px;display:flex;align-items:center;gap:8px"><span style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#0D47A1,#1976D2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🚀</span>Puesta en Marcha</div>
          <div style="font-size:10px;color:#8FA0BC;font-weight:600;margin-top:4px;padding-left:38px">Información en preparación</div>
        </div>
      </div>
      <div style="padding:6px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(180deg,#FAFBFE 0%,#EAF1FB 100%)">
        <div style="position:relative;width:100%;aspect-ratio:3/2;border-radius:8px;border:1.5px solid #B9D0EC;background:#EEF2F8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-align:center;padding:4px">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#A9BEDC" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>
          <div style="font-size:9px;font-weight:700;color:#8CA0C4;text-transform:uppercase;letter-spacing:.3px;line-height:1.3">Fotografía de obra<br>en preparación</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.55fr 1.05fr 0.52fr;gap:10px;padding:10px 0 0">
      <div style="background:#fff;border:1px solid #E5E9EF;border-radius:14px;padding:14px 16px;overflow-y:auto">
        ${secHdrFi('🧩', '#DCE7F5', 'Componentes y Acciones Programados')}
        <div>${compAccHTML}</div>
      </div>
      <div style="background:#fff;border:1px solid #E5E9EF;border-radius:14px;padding:14px 16px;overflow-y:auto">
        ${secHdrFi('📊', '#DCE7F5', 'Ejecución por Actividad', 'Por componente de inversión')}
        ${actividadHTML}${footerHTML}
      </div>
      <div style="background:#fff;border:1px solid #E5E9EF;border-radius:14px;padding:14px 16px;overflow-y:auto">
        ${secHdrFi('💰', '#FEF3E0', 'Impacto de la Inversión', 'Entregables y población beneficiada')}
        ${impactoHTML}
      </div>
    </div>`;
  }
  function fichaInversionRender(el, cui, f, c, sp, onVolver) {
    el.innerHTML = fichaInversionHTML(cui, f, c, sp);
    if (onVolver) el.querySelectorAll('.fi-regresar').forEach(x => x.onclick = onVolver);
    el.querySelectorAll('.fi-print').forEach(x => x.onclick = () => CR.exportar((c && c.ue) || (E && E._ue && E._ue.cod), (c && c.ue_nombre) || (E && E._ue && E._ue.nombre), () => window.print()));
    el.querySelectorAll('.fi-comp-hdr').forEach(x => x.onclick = () => { const d = x.nextElementSibling; d.style.display = d.style.display === 'none' ? 'block' : 'none'; });
    const nombre = f?.nombre || c?.nombre || null;
    el.querySelectorAll('.fi-seg-hdr').forEach(x => x.onclick = () => mostrarSeguimientoModal(cui, nombre, buildSituDet(f, c, sp)));
  }
  window.FichaInversion = { render: fichaInversionRender, html: fichaInversionHTML };
  function cerrarFicha() { const ov = $('inv-overlay'); if (ov) ov.remove(); abiertos.inv = null; cuerpo(); }
  function mostrarCargando(cui) {
    let ov = $('inv-overlay'); if (!ov) { ov = document.createElement('div'); ov.id = 'inv-overlay'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `<p class="mutx">Cargando ficha de la inversión ${cui}…</p>`;
  }
  function pintarFicha(cui, f, c, sp) {
    let ov = $('inv-overlay'); if (!ov) { ov = document.createElement('div'); ov.id = 'inv-overlay'; document.body.appendChild(ov); }
    if (!document.getElementById('fi-anim-css')) { const st = document.createElement('style'); st.id = 'fi-anim-css'; st.textContent = '@keyframes fiIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'; document.head.appendChild(st); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#EEF1F4;overflow:auto;animation:fiIn .16s ease';
    fichaInversionRender(ov, cui, f, c, sp, cerrarFicha);
  }
  function cuerpo() {
    const b = $('ent-body'), P_ = E.presupuesto, I = E.ingresos, T = modoInv ? P_.inversiones : P_.total, A = E.alertas;
    const pct = (a, c) => 100 * (a || 0) / (c || 1);
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
    } else if (tabE === 'pi' && E._ue.nivel === 'E') {
      b.innerHTML = `<div class="card" style="margin:16px;padding:28px;text-align:center"><div style="font-size:34px">🎯</div><b style="font-size:15px;color:var(--p2)">Metas</b><p class="mutx" style="font-size:12.5px;margin-top:6px">En elaboración.</p></div>`;
    } else if (tabE === 'pi' && E._ue.nivel === 'R') {
      b.innerHTML = '<div style="padding:12px"></div>';
      if (window.FED) FED.ui(b.firstChild, E._ue); else b.innerHTML = '<p class="mutx" style="padding:16px">No se pudo cargar el módulo FED.</p>';
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
      b.innerHTML = `<div id="prov-slot" style="padding:8px 8px 0"></div><p class="mutx" style="font-size:11.5px;padding:8px 8px 0">${procs.length} obras con proceso en SEACE · ${k('firmado') + k('vencido')} contratadas · ${k('proceso')} en convocatoria · ${k('bpro')} con buena pro sin firmar · ${k('vencido')} con plazo vencido · ${k('desierto')} desiertos${sinProc ? ` · ${sinProc} con presupuesto ≥ S/ 500 mil sin proceso registrado` : ''}</p><table><tr><th>Inversión</th><th>Situación</th><th>Contratista</th><th>Convocado</th><th>Firma</th><th>Fin de plazo</th><th>Monto</th></tr>${Object.keys(NK).flatMap(s => (K[s] || []).map(x => `<tr class="l" data-sf="${x.c.cui}" style="cursor:pointer"><td style="white-space:normal"><b>${x.c.cui}</b> ${x.c.nombre.slice(0, 70)}</td><td>${NK[s]}</td><td style="white-space:normal">${x.s.prov || '—'}</td><td>${x.s.conv || ''}</td><td>${x.s.firma || ''}</td><td style="color:${s === 'vencido' ? 'var(--bad)' : 'inherit'}">${x.s.fin || ''}</td><td>${F(x.s.monto)}</td></tr>`)).join('')}</table>`;
      b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => { filtroMeta = tr.dataset.sf; tabE = 'exp'; render(); });
      if (window.Proveedores) Proveedores.ui($('prov-slot'));
    } else if (tabE === 'inv') {
      if (abiertos.inv) {
        const cui = abiertos.inv;
        mostrarCargando(cui);
        (async () => {
          const [f, sp] = await Promise.all([ssi(cui), seace(cui)]);
          if (abiertos.inv !== cui) return; // el usuario cerró o cambió de inversión mientras cargaba
          pintarFicha(cui, f, LAKE[cui] || {}, sp);
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
        const items = inv().map(m => ({ ...m, c: LAKE[m.act_proy] || {} }));
        const ftsInv = P_.fuentes_inv && Object.keys(P_.fuentes_inv).length ? Object.values(P_.fuentes_inv).filter(f => f.pim > 0).sort((a, c) => c.pim - a.pim) : null;
        const fts = ftsInv || Object.values(P_.fuentes).filter(f => f.pim > 0).sort((a, c) => c.pim - a.pim);
        const ueKey = E._ue.cod, bc = benefCache[ueKey];
        const nAl = (E.alertas?.dev_sin_girar?.length || 0) + (E.alertas?.comp_sin_devengar?.length || 0) + (E.alertas?.cert_sin_comp?.length || 0);
        resumenInversion(b, T, items, {
          nivel: E._ue.nivel, fts, beneficiarios: bc, nAlertas: nAl, estSel: abiertos.invEstado, nombreFallback: nombreMeta,
          onNav: id => { tabE = id; render(); },
          onEstSel: k => { abiertos.invEstado = k; cuerpo(); },
          onCuiGoto: cui => { abiertos.inv = cui; cuerpo(); },
          onKpi: (id, T2, extra) => {
            if (id === 'kpi') verDetalleResumen('💰', 'RESUMEN GENERAL', funnelGasto(T2));
            else if (id === 'cert') verDetalleResumen('📋', 'CERTIFICACIÓN', funnelGasto(T2));
            else if (id === 'comp') verDetalleResumen('🤝', 'COMPROMISO', funnelGasto(T2));
            else if (id === 'dev') verDetalleResumen('💵', 'DEVENGADO', funnelGasto(T2));
            else if (id === 'benef') verDetalleResumen('👥', 'BENEFICIARIOS DIRECTOS', extra ? `<p class="mutx">Suma del campo "beneficiarios (habitantes)" que cada inversión declara en su ficha del SSI (Banco de Inversiones).${items.length - extra.conDato ? ` ${items.length - extra.conDato} inversión(es) aún no tienen ese dato registrado en el MEF.` : ''}</p>` : '<p class="mutx">Cargando…</p>');
            else if (id === 'fuentes') verDetalleResumen('🏦', 'POR FUENTE DE FINANCIAMIENTO', extra.map(f => `<div style="margin-bottom:14px"><div style="font-weight:800;color:var(--p2);font-size:12.5px;margin-bottom:4px">${cap(f.nombre)}</div>${barras([['PIM', f.pim, extra[0].pim, 'var(--gold)', FM(f.pim)], ['Devengado', f.dev, extra[0].pim, 'var(--ok)', FM(f.dev)]])}</div>`).join(''));
          }
        });
        if (!bc) totalBeneficiarios(items, ueKey).then(() => { if (tabE === 'inv' && !abiertos.invLista && !abiertos.inv) cuerpo(); });
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

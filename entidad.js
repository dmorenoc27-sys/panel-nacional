/* entidad.js — módulo "Mi entidad": datos internos del SIAF de una entidad, cifrados; se abren solo con su clave.
   Depende de helpers globales de index.html: $, j, M, N, P, cls, toast, UES, ficha(), ANIO, R. */
(function () {
  const F = n => n == null ? '—' : 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  const FASE = { C: 'Compromiso', D: 'Devengado', G: 'Girado', P: 'Pagado', R: 'Rendición' };
  let E = null, META = {}, LAKE = {}, tabE = 'inv', filtroMeta = '', q = '', modoInv = true, abierto = null;
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // ponytail: la clave solo se usa para derivar la llave AES (PBKDF2); en el navegador se guarda la llave derivada (kb), nunca la clave
  let ultimaLlave = null;
  async function descifrar(ue, clave, kb) {
    // 22/10/2026: el paquete puede venir del servicio de carga del Agente (api.acierta.pe, R2) o del repositorio; el agente manda si existe
    let p = null; if (window.ACIERTA_API) { try { p = await j(`${window.ACIERTA_API}/v1/paquete/${ue}.enc`); } catch (e) { p = null; } }
    if (!p) p = await j(`data/entidad/${ue}.enc`);
    let raw;
    if (kb) raw = b64(kb);
    else { const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']); raw = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64(p.salt), iterations: p.iter, hash: 'SHA-256' }, km, 256)); }
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    ultimaLlave = btoa(String.fromCharCode(...raw));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.iv) }, key, b64(p.data));
    const txt = await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
    const E0 = (window.sanearJSON || (x => x))(JSON.parse(txt));   // seguridad 09/10/2026: las glosas y proveedores del SIAF se sanean antes de pintarse
    // ponytail: paquete publico (sin SIAF) -> el .enc es solo la puerta; los datos vienen del .pub.json que la corrida diaria refresca
    if (E0.publico) { try { const f = await j(`data/entidad/${ue}.pub.json`); if (f && f.ue === String(ue)) return f; } catch (e) { } }
    return E0;
  }

  // ponytail: sesion recordada = {ue, k: llave derivada} en localStorage; nunca la clave. Una sesion vieja con clave en claro se borra. Si cambia la clave o el salt, el descifrado falla y se vuelve al formulario.
  // "Mantener la sesión" -> localStorage (sobrevive al cierre del navegador); si no, sessionStorage (dura mientras la pestaña esté abierta, resiste F5)
  // seguridad 14/10/2026: la sesión recordada caduca a los 30 días (y se renueva al usarla); así una llave olvidada en un equipo compartido no dura para siempre
  const SES_DIAS = 30;
  const SES = { get() { for (const st of [localStorage, sessionStorage]) { try { const s = JSON.parse(st.getItem('ent_sesion') || 'null'); if (s && (!s.k || (s.exp && Date.now() > s.exp))) { st.removeItem('ent_sesion'); continue; } if (s) { if (s.exp) { s.exp = Date.now() + SES_DIAS * 864e5; st.setItem('ent_sesion', JSON.stringify(s)); } return s; } } catch (e) { } } return null; },
    set(ue, k, rec) { const v = JSON.stringify({ ue: String(ue), k, exp: Date.now() + SES_DIAS * 864e5 }); try { (rec ? localStorage : sessionStorage).setItem('ent_sesion', v); if (rec) sessionStorage.removeItem('ent_sesion'); } catch (e) { } },
    clear() { try { localStorage.removeItem('ent_sesion'); sessionStorage.removeItem('ent_sesion'); } catch (e) { } } };
  function salir() { E = null; ultimaLlave = null; META = {}; LAKE = {}; SES.clear(); login(); }
  async function login() {
    const el = $('ent'); let lista = [];
    try { lista = await j('data/entidad/index.json'); } catch (e) { }
    el.innerHTML = `<div class="card" style="flex:0 0 auto;max-width:560px;margin:30px auto;padding:0"><div class="pd-hdr"><div class="pd-cui">MI ENTIDAD · ACCESO PRIVADO</div><div class="pd-title">Seguimiento interno con datos del SIAF</div><div class="pd-badges"><span class="pd-badge">Cifrado AES-256</span><span class="pd-badge">La clave nunca sale de tu navegador</span></div></div>
     <div style="padding:16px 18px"><p style="margin:0 0 10px;font-size:12.5px;color:var(--ink2)">Aquí la entidad ve lo que Transparencia no muestra: expediente por expediente, proveedor, documento, glosa y la fase en que está cada pago. La información es de la entidad: se publica cifrada y solo se abre con su clave.</p>
     ${lista.length ? `<label class="mutx" style="font-size:11px" for="ent-ue">Entidad</label><select id="ent-ue" style="width:100%;margin:4px 0 10px">${lista.map(x => `<option value="${x.ue}">${x.nombre || 'UE ' + x.ue} · ${x.publico ? 'datos MEF' : 'SIAF'} al ${x.corte || ''}</option>`).join('')}</select>` : '<p class="mutx">Aún no hay entidades publicadas.</p>'}
     <label class="mutx" style="font-size:11px" for="ent-clave">Clave de acceso</label><input type="password" id="ent-clave" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;margin:4px 0 12px" placeholder="••••••••" autocomplete="current-password">
     <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--ink2);margin:-4px 0 12px"><input type="checkbox" id="ent-rec" checked> Mantener la sesión abierta en este equipo (desmárcalo en computadoras compartidas)</label>
     <div style="display:flex;gap:8px;align-items:center"><button class="btn p" id="ent-ir">Entrar</button><span class="mutx" id="ent-msg" style="font-size:12px"></span></div>
     <p class="mutx" style="font-size:12px;margin-top:14px">¿Su entidad aún no carga su SIAF? <a href="agente.html" target="_blank" rel="noopener">Descargue el Agente de la entidad</a>: cifra la información en su propio equipo y Acierta nunca ve la clave.</p></div></div>`;
    const ir = async () => { const ue = $('ent-ue')?.value, clave = $('ent-clave').value, rec = $('ent-rec')?.checked; if (!ue || !clave) return; $('ent-msg').textContent = 'Descifrando…';
      try { E = await descifrar(ue, clave); SES.set(ue, ultimaLlave, !!rec); await preparar(ue); tabE = 'inv'; abiertos.invLista = false; render(); } catch (e) { console.warn(e); $('ent-msg').textContent = 'Clave incorrecta o archivo no disponible.'; } };
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
      if (!window.JSZip) await new Promise((ok, err) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.integrity = 'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG'; s.crossOrigin = 'anonymous'; s.onload = ok; s.onerror = err; document.head.appendChild(s); });
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
          <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#164A8C,#2F6FC2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📑</div>
          <div><div style="font-size:14px;font-weight:900;color:#0F2A43">Exportaciones y reportes a medida</div><div style="font-size:10.5px;font-weight:700;color:#5E7290">${nombre || 'Su entidad'}</div></div>
          <button style="margin-left:auto;background:none;border:0;font-size:20px;color:#94A3B8;cursor:pointer" onclick="this.closest('#rep-aviso').remove()">×</button></div>
        <p style="font-size:13px;line-height:1.55;margin:0 0 8px;color:#1E293B">Las exportaciones (Excel, PowerPoint, PDF) y los reportes con el formato propio de cada entidad, a la fecha de corte que se necesite, se habilitan por contrato.</p>
        <p style="font-size:13px;line-height:1.55;margin:0;color:#1E293B">Para activarlo, escríbanos a <a href="mailto:${CONTACTO}" style="font-weight:800;color:var(--p)">${CONTACTO}</a>.</p>
        <div style="font-size:9.5px;color:#596577;text-align:center;margin-top:12px">clic fuera para cerrar</div></div>`;
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
    const tabs = [['res', 'Resumen'], ['ppto', 'Presupuesto'], ['inv', modoInv ? 'Inversiones' : 'Metas'], ['exp', 'Expedientes' + (filtroMeta ? ' · ' + filtroMeta : '')], ['ing', 'Ingresos'], ['plz', '⏱ Plazos'], ['ges', '🧭 Gestión'], ['pi', E._ue.nivel === 'R' ? '🏅 FED' : E._ue.nivel === 'E' ? '🎯 Metas' : '🏅 Incentivos Municipales'], ['al', `Alertas (${nAl})`], ['prov', 'Proveedores'], ['cert', 'Certificaciones']].concat(E._ue.nivel === 'M' || E._ue.nivel === 'R' ? [['cie', '🏛 Cierre de gestión']] : []);
    const cab = `<div class="pd-cui"><span>MI ENTIDAD · UE ${u.cod}</span><span>· ${E.publico ? 'Datos MEF' : 'SIAF'} al ${E.corte}${(d => d > 1 ? ` · <b style="color:${d > 30 ? '#D64545' : d > 7 ? '#E39B1E' : 'inherit'}" title="días desde la fecha de corte de los datos">hace ${d} días</b>` : '')(Math.round((Date.now() - new Date(String(E.corte).slice(0, 10))) / 864e5))}</span>${E._corteVista ? `<span style="background:var(--p);color:#fff;border-radius:6px;padding:1px 8px;margin-left:6px">CORTE ${fDMY(E._corteVista)}</span>` : ''}<span>· Transparencia al ${R.corte}</span><button type="button" class="x" id="ent-salir" title="Cerrar sesión" aria-label="Cerrar sesión" style="background:none;border:0;padding:0 4px;cursor:pointer;color:inherit;font:inherit;font-size:20px;line-height:1">×</button></div><div class="pd-title">${u.nombre}</div>`;
    // ponytail: Plan de Incentivos también entra sin la cabecera técnica (KPIs, barra HOY, pestañas) — solo cabecera + volver
    if (tabE === 'pi' || tabE === 'sea' || tabE === 'ges' || tabE === 'cie') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">${tabE === 'sea' ? '📑 Contrataciones' : tabE === 'ges' ? '🧭 Gestión' : tabE === 'cie' ? '🏛 Cierre de gestión' : E._ue.nivel === 'R' ? '🏅 FED · Fondo de Estímulo al Desempeño' : E._ue.nivel === 'E' ? '🎯 Metas' : '🏅 Plan de Incentivos ' + ANIO}</span><button type="button" class="ov-volver" id="ent-volver-pi" style="margin-left:auto"><span class="ov-fl" aria-hidden="true">←</span>Volver</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-volver-pi').onclick = () => { tabE = 'inv'; render(); }; $('ent-salir').onclick = salir; cuerpo(); return; }
    // ponytail: Inversión pública también entra sin cabecera técnica — lista simple de obras; la ficha de cada una se abre debajo
    if (tabE === 'inv') { el.innerHTML = `<div class="card" style="flex:0 0 auto;padding:0"><div class="pd-hdr" style="border-radius:var(--rad)">${cab}<div class="pd-badges"><span class="pd-badge">🏗 Inversión pública</span>${repCorteHTML()}${abiertos.invLista ? `<input type="search" id="ent-invq" placeholder="Buscar por CUI o nombre…" value="${q}" style="padding:6px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:12px;width:240px"><button type="button" class="ov-volver" id="ent-volver-inv"><span class="ov-fl" aria-hidden="true">←</span>Volver</button>` : `<button class="btn" id="ent-ver-lista" style="background:#fff;color:var(--p2)">📋 Ver lista completa</button>`}<button class="btn" id="ent-tec" style="background:#fff;color:var(--p2)">Ver detalle técnico ▸</button></div></div></div><div class="card" style="flex:1;min-height:0;padding:0"><div class="wrap" id="ent-body" style="padding:0"></div></div>`;
      $('ent-tec').onclick = () => { tabE = 'res'; render(); }; $('ent-salir').onclick = salir;
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
    if ($('ent-q')) $('ent-q').oninput = e => { q = e.target.value.trim().toLowerCase(); cuerpo(); }; $('ent-salir').onclick = salir;
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
    // ponytail: la ficha de la UE ya trae beneficiarios por CUI; solo se consulta el SSI para los que no lo traen, y como máximo 200 (Lima tiene miles)
    const sin = items.filter(it => it.c?.beneficiarios == null).slice(0, 200);
    const res = items.map(it => it.c?.beneficiarios != null ? { beneficiarios: it.c.beneficiarios } : null).filter(Boolean).concat(await Promise.all(sin.map(it => ssi(it.act_proy).catch(() => null))));
    const total = res.reduce((s, f) => Math.max(s, f?.beneficiarios || 0), 0), conDato = res.filter(f => f?.beneficiarios).length;   // C8: 'hasta X', no suma
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
  const COLH = { ok: '#1B9E5A', warn: '#E39B1E', bad: '#D64545', p: '#1E5AA8', gris: '#B0BEC5', gold: '#C9A227', teal: '#00766B' };
  const apilada = segs => { const tot = segs.reduce((s, x) => s + x[1], 0) || 1; return `<div style="display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--grid)">${segs.filter(s => s[1]).map(([l, v, c]) => `<div title="${l}: ${v}" style="width:${100 * v / tot}%;background:${c};color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center">${v}</div>`).join('')}</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:11px">${segs.map(([l, v, c]) => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c};margin-right:4px"></i><b>${v}</b> ${l}</span>`).join('')}</div>`; };
  // ponytail: "estado de la cartera" como bloques grandes de color — mismo dato que apilada(), presentación con más impacto
  const cartera = (segs, total) => `<div class="pd-lbl" style="margin:0 0 6px">ESTADO DE LA CARTERA — ${total} INVERSIONES</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px">${segs.filter(s => s[1]).map(([l, v, c]) => `<div style="background:${c};color:#fff;border-radius:8px;padding:8px 6px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.12)"><div style="font-size:19px;font-weight:800;line-height:1.1">${v}</div><div style="font-size:9px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;opacity:.92;margin-top:2px;line-height:1.2">${l}</div></div>`).join('')}</div>`;
  const barras = filas => `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:5px 10px;align-items:center;font-size:12px">${filas.map(([l, v, max, c, txt]) => `<span style="font-weight:600">${l}</span><div style="height:14px;background:var(--grid);border-radius:4px;overflow:hidden"><div style="width:${Math.min(100, 100 * v / (max || 1))}%;height:100%;background:${c}"></div></div><b style="min-width:70px;text-align:right">${txt}</b>`).join('')}</div>`;
  const ir = (k, txt) => `<div style="margin-top:8px"><button class="btn ir" data-ir="${k}" style="background:var(--p2);color:#fff">${txt || 'Abrir el detalle completo ▸'}</button></div>`;
  const hoyS = () => new Date().toISOString().slice(0, 10);
  // ponytail: vista alcalde = 4 botones grandes de acceso directo, sin datos; cada uno abre su pestana completa
  const cap = t => { t = (t || '').replace(/^[\d.\s-]+/, '').toLowerCase(); t = t.charAt(0).toUpperCase() + t.slice(1); return t.length > 34 ? t.slice(0, 32) + '…' : t; };
  const FM = n => 'S/ ' + M(n) + ' M';
  const mlabel = s => META[s] ? (META[s].es_inv ? META[s].act_proy : 'meta ' + META[s].meta) : s;
  // ponytail: estado de ejecución de una inversión a partir de los campos ya cargados en LAKE (sin fetch adicional por CUI)
  const ESTINV = { culminada: ['Culminada', '#2E7D32'], ejecucion: ['En ejecución de obra', '#1565C0'], expediente: ['En expediente técnico', '#8E24AA'], viable: ['Viable · por iniciar', '#9A6700'], paralizada: ['Paralizada / suspendida', '#C62828'] };
  // ponytail: mismos 5 estados y colores que ESTINV, solo que con etiquetas cortas — para que los chips de "estado de la cartera" nunca partan en 2 líneas
  const ESTCHIP = { culminada: 'Culminada', ejecucion: 'En ejecución', expediente: 'Expediente técnico', viable: 'Por iniciar', paralizada: 'Paralizada' };
  // ponytail: forma además de color — así el estado no depende solo del color, ni en la leyenda ni en los puntos del mapa
  const ESTSHAPE = { culminada: 'border-radius:50%', ejecucion: 'border-radius:50%', expediente: 'border-radius:50%', viable: 'border-radius:2px;transform:rotate(45deg)', paralizada: 'border-radius:2px' };
  // ponytail: mismo patrón "editable por David".
  // Tipos: NORMA=normativa · PRENSA=nota de prensa · DOC=documento fijo · SEG=en seguimiento. pin:true = fijado arriba.
  // Agregar así: {f:'AAAA-MM-DD', t:'NORMA', ti:'Título', d:'detalle corto (opcional)', u:'https://...'}
  const NOVEDADES = [];
  const NOV_TIPO = { NORMA: ['NORMATIVA', '#6A1B9A'], PRENSA: ['PRENSA', '#1565C0'], DOC: ['DOCUMENTO', '#2E7D32'], SEG: ['EN SEGUIMIENTO', '#B84300'] };
  function novHTML() {
    if (!NOVEDADES.length) return '<div style="font-size:11px;color:#596577;padding:8px 4px">Sin novedades por ahora.</div>';
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
          <span style="font-size:8.5px;font-weight:700;color:#596577;margin-left:auto">${fch}</span>
        </div>
        <div style="font-size:11px;font-weight:800;color:#263238;line-height:1.3">${n.ti}</div>
        ${n.d ? `<div style="font-size:9.5px;color:#596577;line-height:1.35;margin-top:2px">${n.d}</div>` : ''}
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
  // ponytail: Leaflet se carga una sola vez, bajo demanda; si no hay red, el mapa simplemente no aparece
  let _leafletP = null;
  function cargarLeaflet() {
    if (window.L) return Promise.resolve();
    if (_leafletP) return _leafletP;
    _leafletP = new Promise(res => {
      if (!document.getElementById('leaflet-css')) { const lc = document.createElement('link'); lc.id = 'leaflet-css'; lc.rel = 'stylesheet'; lc.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; lc.integrity = 'sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb'; lc.crossOrigin = 'anonymous'; document.head.appendChild(lc); }
      const ls = document.createElement('script'); ls.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; ls.integrity = 'sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO'; ls.crossOrigin = 'anonymous'; ls.onload = res; ls.onerror = res; document.head.appendChild(ls);
    });
    return _leafletP;
  }
  function pintarMapaInv(items, estSel, onGoto) {
    cargarLeaflet().then(() => {
      const el = $('inv-mapa'); if (!el || !window.L || el._leaflet_id) return;   // ya pintado por una llamada anterior (dos render seguidos)
      const mp = L.map(el, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mp);
      // ponytail: halo pulsante
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
        if (estSel && it.est !== estSel) return; // al seleccionar un estado, el mapa muestra solo esos puntos
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
    ov.innerHTML = `<div class="pd-hdr ov-hdr" style="border-radius:0;flex:0 0 auto"><div class="pd-cui"><span>${icono} ${titulo}</span><button type="button" class="ov-volver" id="res-volver" style="margin-left:auto"><span class="ov-fl" aria-hidden="true">←</span>Volver</button></div></div><div id="res-body" style="flex:1;min-height:0;overflow:auto;padding:16px 20px">${html}</div>`;
    ov.querySelector('#res-volver').onclick = cerrarDetalleResumen;
  }
  // Tablero de inversión de una entidad: la "cadena del gasto" (PIM → certificado → comprometido → devengado → girado) como un
  // caudal continuo que se estrecha etapa a etapa; debajo, el mapa y la cartera por estado. Una sola pantalla, sin scroll.
  // Reutilizable: recibe T/items/opts ya armados (Mi entidad con SIAF o ficha pública con Transparencia). Expuesta en window.ResumenInversion.
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let PANEL_ABIERTO = null;   // panel desplegado sobre el mapa (se conserva entre repintados)
  function resumenInversion(b, T, items, opts) {
    opts = opts || {};
    const fts = opts.fts || [];
    const est = { culminada: [], ejecucion: [], expediente: [], viable: [], paralizada: [] };
    items.forEach(it => est[estadoInv(it.c)].push(it));
    const mapItems = items.map(it => ({ cui: it.act_proy, nombre: (it.c.nombre || (opts.nombreFallback ? opts.nombreFallback(it) : it.act_proy)).slice(0, 70), lat: it.c.lat, lon: it.c.lon, est: estadoInv(it.c) }));
    const bc = opts.beneficiarios || null;
    const pim1 = T.pim || 1, pct = v => Math.round((v || 0) * 100 / pim1);
    const ico = n => window.Ico ? Ico(n) : '';
    const estSel = opts.estSel && est[opts.estSel] ? opts.estSel : null;
    const nAl = opts.nAlertas || 0;
    // ---- cadena del gasto: 4 o 5 etapas (girado solo cuando hay dato) ----
    const etapas = [['kpi', 'PIM', T.pim, 'presupuesto vigente del año', 'wallet', '#0F2A43'], ['cert', 'Certificado', T.cert, 'con respaldo presupuestal', 'clipboard', '#1E5AA8'], ['comp', 'Comprometido', T.comp_anual, 'con contrato u orden', 'handshake', '#2F69B3'], ['dev', 'Devengado', T.dev, 'obligación de pago reconocida', 'coins', '#147A45']];
    if (T.gir != null) etapas.push(['gir', 'Girado', T.gir, 'pagado al proveedor', 'send', '#0F6E4F']);
    const caudal = '';
    const cadena = `<aside class="gx" aria-label="Cadena del gasto">
      <div class="gx-h">Cadena del gasto <small>${ANIO}</small></div>
      <div class="gx-et">${etapas.map(([id, l, v, d, ic, col], i) => `<button type="button" class="gx-e" data-p="${id}" style="--c:${col}" title="${d}"><span class="gx-i">${ico(ic)}</span><span class="gx-t"><span class="gx-l">${l}${i ? ` <small>${pct(v)} %</small>` : ''}</span><span class="gx-n" data-cuenta="${Math.round(v || 0)}">${FM(v)}</span><span class="gx-b"><span style="width:${Math.min(100, (v || 0) * 100 / pim1)}%"></span></span></span></button>`).join('')}</div>
      <div class="gx-pie">${fts.length ? `<button type="button" class="gx-lnk" data-p="fuentes">${fts.length} fuente${fts.length === 1 ? '' : 's'} de financiamiento<small>la mayor, ${cap(fts[0].nombre)}</small></button>` : '<span>Sin fuentes con presupuesto</span>'}<button type="button" class="gx-lnk" data-p="benef">${bc ? `${N(bc.total)} beneficiarios<small>hasta, según la mayor inversión</small>` : 'Beneficiarios<small>calculando…</small>'}</button><span class="gx-src">Fuente: ${opts.fuenteTxt || 'Transparencia Económica, MEF'}</span></div>
    </aside>`;
    // ---- cartera por estado: filas con proporción, no chips ----
    const tot = items.length || 1;
    const filas = Object.entries(est).filter(([, v]) => v.length).map(([k, v]) => { const [l, c] = ESTINV[k], on = !estSel || k === estSel; return `<button type="button" class="ca-f ${estSel === k ? 'on' : ''}" data-est="${k}" style="--c:${c};opacity:${on ? 1 : .45}" aria-pressed="${estSel === k}"><i style="${ESTSHAPE[k]}"></i><span class="ca-l">${l}</span><span class="ca-b"><span style="width:${Math.max(1.5, 100 * v.length / tot)}%"></span></span><span class="ca-n">${N(v.length)}</span></button>`; }).join('');
    const lista = estSel ? (() => { const [lbl, c] = ESTINV[estSel], arr = est[estSel]; return `<div class="ca-lista" style="--c:${c}"><div class="ca-lh"><span>${lbl}: ${arr.length} inversi${arr.length === 1 ? 'ón' : 'ones'}</span><button type="button" data-est-clear class="x" aria-label="Volver a la cartera">×</button></div><div class="ca-cuis">${arr.map(it => `<button type="button" data-inv-goto="${it.act_proy}" title="${(it.c.nombre || '').replace(/"/g, '&quot;').slice(0, 120)}">${it.act_proy}</button>`).join('')}</div><div class="ca-nota">Clic en un código para abrir su ficha</div></div>`; })() : '';
    // ---- ir al detalle: lista de enlaces, sin cajas ----
    const GO = [['pi', ...(opts.nivel === 'R' ? ['FED', 'Fondo de Estímulo al Desempeño', 'medal', '#7A5B12'] : opts.nivel === 'E' ? ['Metas', 'metas e indicadores', 'target', '#7A5B12'] : ['Plan de Incentivos', 'compromisos municipales', 'medal', '#7A5B12']), ''], ['sea', 'Contrataciones', 'procesos y contratos en el SEACE', 'doc', '#1E5AA8', ''], ['al', 'Alertas', 'lo que requiere decisión', 'siren', '#B42A2A', nAl ? N(nAl) : '']];
    if (opts.cierre) GO.push(['cierre', 'Cierre de gestión', 'transferencia 2026', 'building', '#0F2A43', '']);
    if (!opts.siaf && window.FlujoCaja && opts.ue) GO.push(['flujo', 'Flujo de caja', 'caja mes a mes hasta diciembre · Excel y PPT', 'wallet', '#147A45', '']);   // 17/10/2026: con SIAF vive dentro de Reportes SIAF
    if (opts.siaf) GO.unshift(['rep', 'Reportes SIAF', 'deuda a proveedores, velocidad de pago, contratos, reservas, cierre e ingresos', 'chart', '#0F2E57', '']);
    const mayores = items.filter(it => it.c.pim > 0).sort((a, b2) => (b2.c.pim || 0) - (a.c.pim || 0)).slice(0, 6);
    const detalle = `<nav class="ri-go" aria-label="Ir al detalle"><div class="ri-goh">Ir al detalle</div>${GO.map(([id, t, d, ic, col, n]) => `<button type="button" class="ri-gob${id === 'rep' ? ' ri-prem' : ''}" data-go="${id}" style="--c:${col}"><span class="ri-goi">${ico(ic)}</span><span class="ri-got"><b>${t}</b><small>${d}</small></span>${n ? `<span class="ri-gon">${n}</span>` : ''}<span class="ri-goa" aria-hidden="true">›</span></button>`).join('')}</nav>`;
    // ---- cartera de inversiones: tarjetas con filtro por estado, orden y búsqueda; cada tarjeta abre su ficha ----
    const ORD = { pim: ['PIM', (x, y) => (y.c.pim || 0) - (x.c.pim || 0)], dev: ['Devengado', (x, y) => (y.c.dev || 0) - (x.c.dev || 0)], fis: ['Avance físico', (x, y) => (y.c.avance_fisico ?? -1) - (x.c.avance_fisico ?? -1)], nom: ['Nombre', (x, y) => String(x.c.nombre || '').localeCompare(String(y.c.nombre || ''))] };
    let orden = 'pim', busca = '';
    const nomDe = it => (it.c.nombre || (opts.nombreFallback ? opts.nombreFallback(it) : it.act_proy));
    const filtroChips = `<div class="ca-filt" role="group" aria-label="Filtrar por estado">${Object.entries(est).filter(([, v]) => v.length).map(([k, v]) => { const [l, c] = ESTINV[k]; return `<button type="button" class="ca-chip ${estSel === k ? 'on' : ''}" data-est="${k}" style="--c:${c}" aria-pressed="${estSel === k}"><i style="${ESTSHAPE[k]}"></i>${l.split(' ·')[0].split(' /')[0]}<b>${N(v.length)}</b></button>`; }).join('')}${estSel ? `<button type="button" class="ca-chip ca-todas" data-est-clear>${ico('x')} todas</button>` : ''}</div>`;
    const cartGrid = () => { const arr = (estSel ? est[estSel] : items).filter(it => !busca || String(it.act_proy).includes(busca) || nomDe(it).toLowerCase().includes(busca)).sort(ORD[orden][1]);
      return arr.length ? arr.slice(0, 120).map((it, i) => { const k = estadoInv(it.c), [l, c] = ESTINV[k], fis = it.c.avance_fisico != null && it.c.avance_fisico >= 0 ? Math.round(it.c.avance_fisico) : null, av = it.c.pim ? Math.round(100 * (it.c.dev || 0) / it.c.pim) : null;
        return `<div role="button" tabindex="0" class="ca-card" data-inv-goto="${it.act_proy}" style="--c:${c};--i:${i}" title="Abrir la ficha de la inversión"><span class="ca-in"><span class="ca-ch"><span class="ca-cc">${it.act_proy}</span><span class="ca-ce"><i style="${ESTSHAPE[k]}"></i>${l.split(' ·')[0].split(' /')[0]}</span></span><span class="ca-cn">${nomDe(it).toLowerCase().replace(/^\w/, ch => ch.toUpperCase())}</span><span class="ca-cm"><span><small>PIM</small><b>${FM(it.c.pim || 0)}</b></span><span><small>devengado</small><b>${FM(it.c.dev || 0)}${av != null ? ` <em>${av} %</em>` : ''}</b></span><span class="ca-cr" style="--p:${fis ?? 0}"><b><i></i><span>${fis != null ? fis + '%' : '—'}</span></b><small>físico</small></span></span></span><span class="ca-ca" aria-hidden="true">›</span></div>`; }).join('') + (arr.length > 120 ? `<p class="ca-nota">Se muestran las 120 primeras de ${N(arr.length)}; afina con el buscador.</p>` : '') : '<p class="vacio">Ninguna inversión coincide.</p>'; };
    const btnCadena = `<button type="button" class="ri-gob ri-cadb" data-cadena style="--c:#0F2A43"><span class="ri-goi">${ico('wallet')}</span><span class="ri-got"><b>Cadena del gasto</b><small>PIM ${FM(T.pim)} · devengado ${pct(T.dev)} %</small></span><span class="ri-goa" aria-hidden="true">›</span></button>`;
    b.innerHTML = `<div class="ri">
      <dialog class="gx-dlg" aria-label="Cadena del gasto ${ANIO}"><button type="button" class="ov-volver gx-cerrar" data-cadena-cerrar><span class="ov-fl" aria-hidden="true">←</span>Volver</button>${cadena}</dialog>
      <div class="ri-mapa ri-cart"><div class="ri-mh"><h2 class="ca-tit">Inversiones públicas <small>${N(items.length)} en la cartera${estSel ? ` · ${N(est[estSel].length)} ${ESTINV[estSel][0].toLowerCase()}` : ''}</small></h2>
          <span class="ca-tools"><label class="ca-busca">${ico('search')}<input type="search" placeholder="CUI o nombre…" aria-label="Buscar en la cartera"></label></span></div>
        ${filtroChips}<div class="ca-grid" id="ca-grid">${cartGrid()}</div></div>
      <aside class="ri-der">${btnCadena}${detalle}<button type="button" class="ri-ppt" data-ppt>${ico('download')}<span><b>Reporte PPT</b><small>presentación oficial a la fecha de corte</small></span></button></aside>
    </div>`;
    const grid = b.querySelector('#ca-grid'), RMq = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const entra = () => { if (RMq) return; grid.querySelectorAll('.ca-card').forEach((x, i) => { if (i < 24 && x.animate) x.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 30 * i, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); }); };
    const repinta = () => { grid.innerHTML = cartGrid(); grid.querySelectorAll('[data-inv-goto]').forEach(x => { x.onclick = () => opts.onCuiGoto && opts.onCuiGoto(x.dataset.invGoto); x.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); x.click(); } }; }); entra(); };
    grid.querySelectorAll('.ca-card').forEach(x => x.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); x.click(); } });
    b.querySelector('.ca-busca input').oninput = ev => { busca = ev.target.value.trim().toLowerCase(); repinta(); };
    entra();
    const ppt = b.querySelector('[data-ppt]'); if (ppt) ppt.onclick = () => { const r = document.getElementById('rep-ppt'); if (r) r.click(); else if (window.CorteReporte) CorteReporte.sinPago(opts.nombre || ''); };
    const dlg = b.querySelector('.gx-dlg');
    const kpi = (id, cb) => b.querySelectorAll(`[data-p="${id}"]`).forEach(el2 => el2.onclick = () => { if (dlg.open) dlg.close(); cb(); });
    kpi('kpi', () => opts.onKpi && opts.onKpi('kpi', T)); kpi('cert', () => opts.onKpi && opts.onKpi('cert', T)); kpi('comp', () => opts.onKpi && opts.onKpi('comp', T)); kpi('dev', () => opts.onKpi && opts.onKpi('dev', T)); kpi('gir', () => opts.onKpi && opts.onKpi('dev', T));
    kpi('benef', () => opts.onKpi && opts.onKpi('benef', T, bc)); kpi('fuentes', () => opts.onKpi && opts.onKpi('fuentes', T, fts));
    b.querySelector('[data-cadena]').onclick = () => { dlg.showModal(); animarTablero(dlg); };
    b.querySelector('[data-cadena-cerrar]').onclick = () => dlg.close();
    dlg.onclick = ev => { if (ev.target === dlg) dlg.close(); };
    b.querySelectorAll('[data-go]').forEach(x => x.onclick = () => opts.onNav && opts.onNav(x.dataset.go));
    b.querySelectorAll('[data-est]').forEach(x => x.onclick = () => { const k = x.dataset.est; opts.onEstSel && opts.onEstSel(estSel === k ? null : k); });
    if (b.querySelector('[data-est-clear]')) b.querySelector('[data-est-clear]').onclick = () => opts.onEstSel && opts.onEstSel(null);
    b.querySelectorAll('[data-inv-goto]').forEach(x => x.onclick = () => opts.onCuiGoto && opts.onCuiGoto(x.dataset.invGoto));
    pintarMapaInv(mapItems, estSel, opts.onCuiGoto);
    animarTablero(b);
  }
  // un solo momento de movimiento al entrar: el caudal se extiende de izquierda a derecha y las cifras cuentan hasta su valor;
  // con "reducir movimiento" activado todo aparece ya en su estado final
  function animarTablero(b) {
    if (RMQ.matches || b.dataset.animado) { b.dataset.animado = 1; return; }
    b.dataset.animado = 1;
    b.querySelectorAll('.gx-n[data-cuenta]').forEach((el, i) => { const fin = +el.dataset.cuenta, txt = el.textContent; if (!fin) return; const t0 = performance.now(), d = 900 + i * 120;
      const f = t => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = FM(fin * e); if (p < 1) requestAnimationFrame(f); else el.textContent = txt; }; requestAnimationFrame(f); });
    b.querySelectorAll('.ca-b>span,.gx-b>span').forEach(s => { const w = s.style.width; s.style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => { s.style.width = w; })); });
    b.querySelectorAll('.gx-e,.ri-mapa,.ri-gob,.ri-ppt').forEach((el, i) => el.animate && el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 250 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
  window.ResumenInversion = resumenInversion;
  window.ResumenInversionUtil = { funnelGasto, verDetalleResumen, cerrarDetalleResumen, estadoInv };
  // ponytail: ficha de inversión
  // reutilizable entre el overlay de "Mi entidad" y la ficha pública del CUI (paginaCUI en index.html).
  // a nivel nacional: desglose control concurrente/controversias/carta fianza, chip "programado en el
  // PMI", hectáreas/vehículos/tipo de obra, y exportación a PPT (Descargar Ficha usa impresión del navegador).
  // Seguimiento (Formato 12-B): ventana grande en dos columnas. Izquierda, lo declarado por la UEI en el F12-B
  // (fecha del último registro, avance físico, periodo, situación, problemática, acciones, riesgos y fotos);
  // derecha, lo que el SEACE registra de su contratación. Cada bloque dice de dónde sale.
  function buildSituDet(f, c, sp) {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const F0 = n => n == null ? '—' : 'S/ ' + Math.round(n).toLocaleString('es-PE');
    const par = t => esc(t).split('\n').filter(Boolean).map(x => `<p>${x}</p>`).join('');
    const av = f?.av_fis, p = av == null || isNaN(av) ? null : Math.max(0, Math.min(100, +av)), C = 2 * Math.PI * 26;
    const datos = [['Último registro F12-B', f?.f12b || '—'], ['Periodo de ejecución', f?.inicio || f?.fin ? `${f.inicio || '?'} → ${f.fin || '?'}` : '—'], ['Modalidad', f?.modalidad ? f.modalidad.toLowerCase().replace(/,/g, ' · ').replace(/^\w/, ch => ch.toUpperCase()) : '—'], ['Expediente técnico', f?.et_fecha ? `aprobado ${f.et_fecha}${f.et_monto ? ' · ' + F0(f.et_monto) : ''}` : (c?.et_fecha > '1900' ? `aprobado ${String(c.et_fecha).slice(0, 10)}` : '—')], ['Paralizada', f?.paralizada === 'SI' ? 'Sí, según el F12-B' : f?.paralizada === 'NO' ? 'No' : '—'], ['Unidad ejecutora (UEI)', f?.uei ? f.uei.toLowerCase().replace(/^\w/, ch => ch.toUpperCase()) : '—']];
    const bloque = (ic, t, html, cls) => html ? `<section class="sg-b ${cls || ''}"><h4>${window.Ico ? Ico(ic) : ''}${t}</h4>${html}</section>` : '';
    const fotos = (f?.fotos || []).map(([per, url]) => `<figure><img src="${esc(url)}" alt="Foto de la obra ${esc(per || '')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>${esc(per || '')}</figcaption></figure>`).join('');
    const izq = `<div class="sg-hd"><div class="sg-g"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="26" class="sg-gv" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - (p || 0) / 100)}"/></svg><b>${p == null ? 's/d' : (p % 1 === 0 ? p : p.toFixed(1)) + '<small>%</small>'}</b><span>Avance físico declarado</span></div>
        <dl class="sg-dl">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
      ${bloque('flag', 'Situación declarada', f?.situ_act ? par(f.situ_act) : '')}
      ${bloque('alert', 'Problemática', f?.problema ? par(f.problema) : '', 'sg-prob')}
      ${bloque('tools', 'Acciones de gestión', f?.acciones ? par(f.acciones) : '')}
      ${bloque('shield', 'Riesgos', f?.riesgo ? par(f.riesgo) : '')}
      ${fotos ? `<section class="sg-b"><h4>${window.Ico ? Ico('pin') : ''}Fotos de la obra <small>publicadas por la UEI en el F12-B</small></h4><div class="sg-fotos">${fotos}</div></section>` : ''}
      ${!f ? '<p class="vacio">La ficha del Banco de Inversiones aún no fue capturada para esta inversión.</p>' : (!f.situ_act && !f.problema ? '<p class="vacio">La UEI no ha registrado situación en el Formato 12-B.</p>' : '')}`;
    const der = sp && sp.length ? contratacion(sp, c, f, true) : '<p class="vacio">Sin procesos registrados en el SEACE para este CUI.</p>';
    return `<div class="sg-cols"><div class="sg-col"><div class="sg-ch"><span>Formato 12-B</span><small>Seguimiento de la ejecución · Banco de Inversiones, MEF</small></div>${izq}</div>
      <div class="sg-col sg-sea"><div class="sg-ch"><span>Contratación</span><small>procesos y contratos · SEACE</small></div>${der}</div></div>`;
  }
  function mostrarSeguimientoModal(cui, nombre, contenidoHTML, host) {
    // ponytail: si la ficha está en un <dialog> modal, la ventana va dentro (fuera quedaría tapada por la capa superior del diálogo)
    host = host || document.body; let lb = $('fi-situ-modal');
    if (lb && lb.parentElement !== host) { lb.remove(); lb = null; }
    if (!lb) { lb = document.createElement('div'); lb.id = 'fi-situ-modal'; lb.className = 'sg-ov'; lb.onclick = () => { lb.style.display = 'none'; }; host.appendChild(lb); }
    lb.innerHTML = `<div class="sg-card" role="dialog" aria-modal="true" aria-label="Seguimiento de la inversión ${cui}" onclick="event.stopPropagation()">
      <div class="pd-hdr sg-hdr"><div class="pd-cui"><span>CUI ${cui}</span><span>· Seguimiento de la inversión</span></div>
        ${nombre ? `<div class="pd-title sg-nom">${nombre}</div>` : ''}
        <div class="fi-acts"><span class="sp"></span><button type="button" class="btn fi-situ-copy">Copiar texto</button><button type="button" class="ov-volver sg-cerrar"><span class="ov-fl" aria-hidden="true">←</span>Volver</button></div></div>
      <div class="sg-body fi-situ-txt" tabindex="0">${contenidoHTML}</div>
      <div class="sg-pie">Fuentes: Formato 12-B del Banco de Inversiones (MEF) y SEACE · lo declarado por la UEI se muestra tal cual, sin interpretación</div>
    </div>`;
    lb.style.display = 'flex';
    lb.querySelector('.sg-cerrar').onclick = () => { lb.style.display = 'none'; };
    const onKey = e => { if (e.key === 'Escape') { lb.style.display = 'none'; document.removeEventListener('keydown', onKey); } }; document.addEventListener('keydown', onKey);
    const btn = lb.querySelector('.fi-situ-copy');
    btn.onclick = () => {
      const cont = lb.querySelector('.fi-situ-txt');
      const txt = ((nombre ? nombre + '\n' : '') + 'CUI ' + cui + ' — Seguimiento (Formato 12-B — MEF)\n\n' + (cont ? cont.innerText : '')).trim();
      const listo = () => { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = 'Copiar texto'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(listo, listo); else listo();
    };
  }
  // Ficha de una inversión: dossier en dos columnas sobre papel. Izquierda: la cadena del gasto del año, el costo de la inversión
  // como asiento (viable → costo actualizado → total) y los componentes con su peso. Derecha: avance físico y financiero,
  // programación en el PMI, seguimiento (Formato 12-B) y beneficiarios. Sin cajas vacías "en preparación".
  // ---- utilidades de fechas para la ficha (plazo del F12-B: primeros 10 días hábiles del mes siguiente) ----
  const FERIADOS = ['01-01', '05-01', '06-07', '06-29', '07-23', '07-28', '07-29', '08-06', '08-30', '10-08', '11-01', '12-08', '12-09', '12-25'];   // feriados nacionales fijos; Jueves y Viernes Santo no entran (varían)
  const esHabil = d => d.getDay() !== 0 && d.getDay() !== 6 && !FERIADOS.includes(d.toISOString().slice(5, 10));
  const diaHabil = (y, m, n) => { const d = new Date(Date.UTC(y, m, 1)); let k = 0; while (true) { if (esHabil(d)) { k++; if (k === n) return d; } d.setUTCDate(d.getUTCDate() + 1); } };
  const fecha = v => v ? new Date(String(v).slice(0, 10) + 'T00:00:00Z') : null;
  const fISO = d => d ? d.toISOString().slice(0, 10) : '';
  const fCorta = v => { const d = fecha(v); return d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '') : '—'; };
  // estado del Formato 12-B frente al plazo (primeros 10 días hábiles del mes siguiente al mes ejecutado)
  function estadoF12B(f, hoy) {
    if (!f) return ['nd', 'Sin ficha', 'la ficha del Banco de Inversiones aún no fue capturada'];
    const situ = (f.situacion || '').toUpperCase();
    if (/CERRAD|LIQUID/.test(situ) || f.cierre === 'SI') return ['na', 'No aplica', 'inversión cerrada o liquidada'];
    if (!f.inicio && !(f.dev_acum > 0)) return ['na', 'No aplica', 'sin inicio de ejecución registrado'];
    const ini = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)), lim = diaHabil(hoy.getUTCFullYear(), hoy.getUTCMonth(), 10), ult = fecha(f.f12b);
    if (ult && ult >= ini) return ult <= lim ? ['ok', 'Al día', `registrado el ${fCorta(f.f12b)}, dentro del plazo (${fCorta(fISO(lim))})`] : ['ok', 'Registrado', `el ${fCorta(f.f12b)}, después del plazo del mes (${fCorta(fISO(lim))}): no se puede saber si fue extemporáneo`];
    if (hoy <= lim) { let n = 0; const d = new Date(hoy); while (d < lim) { d.setUTCDate(d.getUTCDate() + 1); if (esHabil(d)) n++; } return ['warn', 'En plazo', `aún sin registro del mes pasado; quedan ${n} día${n === 1 ? '' : 's'} hábil${n === 1 ? '' : 'es'} (hasta el ${fCorta(fISO(lim))})`]; }
    return ['bad', 'Vencido', `sin registro del mes pasado; el plazo venció el ${fCorta(fISO(lim))}${f.f12b ? ` · último registro ${fCorta(f.f12b)}` : ''}`];
  }
  // Ficha de una inversión: "de lo aprobado a lo ejecutado". Izquierda: tres cifras (aprobado, contratado, ejecutado) con el ritmo
  // (plazo, físico, financiero), la línea de tiempo, los componentes del 08-A/08-B/08-C con sus otros costos, dónde fue el dinero
  // (devengado por tipo de gasto) y el control (Contraloría, paralizaciones, INFOBRAS). Derecha: presupuesto del año, F12-B y SEACE.
  // Cada bloque dice su fuente y su fecha. Lenguaje de apoyo, no de control.
  function fichaInversionHTML(cui, f, c, sp) {
    c = c || {}; sp = sp || [];
    const F0 = n => n == null ? '—' : 'S/ ' + Math.round(n).toLocaleString('es-PE');
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ico = n => window.Ico ? Ico(n) : '';
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
    const nombre = f?.nombre || c.nombre || 'Inversión ' + cui, tipo = (f?.tipo || c.tipo || ''), situ = (f?.situacion || c.situacion || '').toUpperCase();
    const cerrado = /CULMIN|CERRAD/.test(situ) || f?.cierre === 'SI';
    const av = f?.av_fis, devY = c.dev || 0, pim = c.pim || 0;
    const costo = f?.costo || null, costoTot = f?.costo_total || costo, devAc = f?.dev_acum || null;
    const culminada = cerrado || (av != null && av >= 99.95);
    const parHist = f?.paraliza || [], parReinicio = parHist.some(p => /inicio de ejecuci|reinici/i.test(p[2] || ''));
    const paralizada = !culminada && (f?.paralizada === 'SI' && !parReinicio);
    let estObra = 'Obra en ejecución', colObra = 'var(--azul)';
    if (culminada) { estObra = 'Obra culminada'; colObra = 'var(--ok-t)'; }
    else if (paralizada) { estObra = 'Obra paralizada'; colObra = 'var(--bad-t)'; }
    else if (devY <= 0 && (av == null || av <= 0) && !(devAc > 0)) { estObra = 'Obra por iniciar'; colObra = 'var(--warn-t)'; }
    const meta = [tipo ? cap(tipo) : '', c.dpto ? cap(c.dpto) : '', f?.modalidad ? f.modalidad.toLowerCase().replace(/,/g, ' · ').replace(/^\w/, ch => ch.toUpperCase()) : '', cerrado ? 'Cerrada en el Banco de Inversiones' : 'Activa'].filter(Boolean);
    const fuente = (t, d) => `<div class="fi-fu">${t}${d ? ` · ${d}` : ''}</div>`;
    const fSSI = f?.actualizado ? `consultado el ${fCorta(f.actualizado)}` : '';
    // ---- contratado (SEACE: contratos de obra; INFOBRAS como respaldo) y plazo contractual ----
    const contratos = sp.filter(p => p.contrato && (p.contrato.monto_final || p.contrato.monto));
    const montoContr = contratos.reduce((t, p) => t + (p.contrato.monto_final || p.contrato.monto || 0), 0) || null;
    const infobras = f?.infobras || [];
    const contrIB = infobras.reduce((t, o) => t + (o.contratado || 0), 0) || null;
    const ctVig = contratos.map(p => p.contrato).sort((x, y) => (y.firma || '').localeCompare(x.firma || ''))[0];
    const plazoIni = fecha(ctVig?.ini || f?.inicio), plazoFin = fecha(ctVig ? (ctVig.fin_act || ctVig.fin) : f?.fin);
    const plazoPct = plazoIni && plazoFin && plazoFin > plazoIni ? Math.max(0, Math.min(100, 100 * (hoy - plazoIni) / (plazoFin - plazoIni))) : null;
    const finPct = costoTot && devAc != null ? 100 * devAc / costoTot : null;
    const fisPct = av == null || isNaN(av) ? null : +av;
    const pc = v => v == null ? 's/d' : (Math.round(v * 10) / 10).toLocaleString('es-PE') + ' %';
    // ---- veredicto en lenguaje llano ----
    const notas = [];
    if (paralizada) { const p = parHist[0]; notas.push(['bad', `Paralizada${p && p[0] ? ` desde el ${fCorta(p[0])}` : ''}${p && p[1] ? `: ${esc(p[1].split(':')[0].slice(0, 90))}` : ''}`]); }
    else if (parHist.length) { const p = parHist[0]; notas.push(['info', `Tuvo una paralización el ${fCorta(p[0])}${p[1] ? ` (${esc(p[1].split(':')[0].slice(0, 70))})` : ''}${p[2] ? ` · ${esc(p[2])}` : ''}`]); }
    if (plazoPct != null && fisPct != null && plazoPct - fisPct >= 20 && !cerrado) notas.push(['warn', `Lleva ${pc(plazoPct)} del plazo y ${pc(fisPct)} de avance físico declarado: se sugiere revisar el ritmo de obra`]);
    if (finPct != null && fisPct != null && finPct - fisPct >= 20 && !cerrado) notas.push(['warn', `El gasto (${pc(finPct)}) va por delante del avance físico (${pc(fisPct)}): podría incluir adelantos o avance aún no declarado`]);
    if (finPct != null && finPct > 100.5) notas.push(['bad', `El devengado acumulado (${F0(devAc)}) supera el costo total actualizado (${F0(costoTot)}): convendría actualizar la sección C del Formato 08-A`]);
    if ((c.dev_ant || 0) - (c.gir || 0) >= 1e5) notas.push(['warn', `${F0((c.dev_ant || 0) - (c.gir || 0))} devengados que siguen sin girar`]);
    if (plazoFin && plazoFin < hoy && !cerrado && fisPct != null && fisPct < 99.95) notas.push(['warn', `El plazo contractual venció el ${fCorta(fISO(plazoFin))}${ctVig?.ampliado ? ' (ya ampliado)' : ''} con ${pc(fisPct)} de avance físico`]);
    if (f?.estim && devAc != null) { const dif = (f.estim.reduce((t, e) => t + (e[2] || 0), 0)) - devAc; if (Math.abs(dif) > Math.max(5000, devAc * .02)) notas.push(['warn', `La ejecución declarada por componente (Estimación F12-B) ${dif > 0 ? 'supera' : 'no llega'} al devengado acumulado en ${F0(Math.abs(dif))}`]); }
    const oci = f?.oci || [];
    if (oci.length) notas.push(['info', `${oci.length} informe${oci.length === 1 ? '' : 's'} de control de la Contraloría · último ${fCorta(oci.map(o => o[2]).sort().pop())}`]);
    if (c.et_fecha > '1900' || f?.et_fecha) {} else if (c.pim >= 1e6 && c.estado === 'ACTIVO' && !cerrado) notas.push(['warn', 'Sin expediente técnico registrado en el Banco de Inversiones']);
    const ef = estadoF12B(f, hoy);
    const veredicto = `<div class="fi-ver"><div class="fi-vt">${ico('compass')}<span>${culminada ? 'Obra culminada' : paralizada ? 'Inversión paralizada' : plazoPct != null ? `Lleva <b>${pc(plazoPct)}</b> del plazo` : 'En ejecución'}${fisPct != null ? ` · <b>${pc(fisPct)}</b> de avance físico declarado${f?.f12b ? ` (al ${fCorta(f.f12b)})` : ''}` : ''}${finPct != null ? ` · <b>${pc(finPct)}</b> del costo devengado` : ''}</span></div>
      ${notas.length ? `<div class="fi-vn">${notas.map(([k, t]) => `<span class="fi-chip ${k}">${t}</span>`).join('')}</div>` : ''}</div>`;
    // ---- tres cifras + ritmo ----
    const ICO3 = { ap: 'scroll', co: 'handshake', ej: 'cash' };
    // tarjeta = icono + cifra; al clic se despliega dentro de la tarjeta su detalle (sin repetir la cifra) y su barra de ritmo
    const aniosDev = f?.anual ? Object.keys(f.anual).filter(y => f.anual[y] > 0).sort() : [];
    const barra = (l, v, col, n) => `<span class="fi-rb"><span>${l}<small>${n}</small></span><b style="color:${col}">${pc(v)}</b><span class="fi-rbb"><i style="width:${Math.min(100, v || 0)}%;background:${col}"></i></span></span>`;
    const tile = (k, t, v, sub, src, rit) => `<button type="button" class="fi-t ${k}" aria-expanded="false" title="Ver el detalle"><span class="fi-ti">${window.Ico ? Ico(ICO3[k]) : ''}</span><span class="fi-tk">${t}</span><b>${v}</b><span class="fi-th">detalle <i>›</i></span><span class="fi-td"><small>${sub}</small>${rit}<i>${src}</i></span></button>`;
    const tres = `<div class="fi-tres">
      ${tile('ap', 'Aprobado', F0(costoTot), [f?.viable ? `viable ${F0(f.viable)}${f.viable_fecha ? ` (${fecha(f.viable_fecha).getUTCFullYear()})` : ''}` : '', f?.et_monto ? `según expediente técnico ${F0(f.et_monto)}${f.et_fecha ? ` (${fecha(f.et_fecha).getUTCFullYear()})` : ''}` : '', costo && costoTot !== costo ? `costo de inversión ${F0(costo)} + control concurrente, controversias y carta fianza` : ''].filter(Boolean).join(' → ') || 'costo total actualizado', 'Banco de Inversiones · F08-A', barra('Avance físico declarado', fisPct, 'var(--azul)', f?.f12b ? `F12-B al ${fCorta(f.f12b)} · lo declara la entidad` : 'F12-B'))}
      ${tile('co', 'Contratado', F0(contrIB || montoContr), [contrIB ? `${infobras.length} obra${infobras.length === 1 ? '' : 's'} en INFOBRAS` : '', contratos.length ? `SEACE: ${contratos.length} contrato${contratos.length === 1 ? '' : 's'}${contrIB && montoContr ? ` por ${F0(montoContr)}` : ''}${contratos[0].bp?.prov ? ` · ${esc(contratos[0].bp.prov)}` : ''}` : ''].filter(Boolean).join(' · ') || 'sin contrato registrado', contrIB ? 'INFOBRAS · monto contratado de la obra' : montoContr ? 'SEACE · monto final del contrato' : 'SEACE · INFOBRAS', barra('Plazo transcurrido', plazoPct, '#5F6B7A', plazoIni ? `${fCorta(fISO(plazoIni))} → ${fCorta(fISO(plazoFin))}${ctVig ? ' · contrato SEACE' : ' · F12-B'}` : 'sin fechas de ejecución'))}
      ${tile('ej', 'Ejecutado', F0(devAc), aniosDev.length ? `todos los años (${aniosDev.join(', ')}) · incluye adelantos` : 'devengado acumulado', 'Transparencia Económica · devengado acumulado', barra('Avance financiero', finPct, 'var(--ok-t)', 'devengado acumulado / costo total'))}
    </div>`;
    // ---- línea de tiempo ----
    const ev = [];
    if (f?.viable_fecha) ev.push([f.viable_fecha, 'Viabilidad', 'ap']);
    if (f?.et_fecha) ev.push([f.et_fecha, 'Expediente técnico', 'ap']); else if (c.et_fecha > '1900') ev.push([String(c.et_fecha).slice(0, 10), 'Expediente técnico', 'ap']);
    const firmas = contratos.filter(p => p.contrato.firma).sort((a, b2) => a.contrato.firma.localeCompare(b2.contrato.firma));
    if (firmas.length > 3) { const a = firmas[0], z = firmas[firmas.length - 1]; ev.push([a.contrato.firma, `1.er contrato · ${esc((a.bp?.prov || a.proceso || '').slice(0, 24))}`, 'co']); ev.push([z.contrato.firma, `Último contrato (${firmas.length}.º) · ${esc((z.bp?.prov || z.proceso || '').slice(0, 24))}`, 'co']); }
    else firmas.forEach(p => ev.push([p.contrato.firma, `Contrato ${esc((p.bp?.prov || p.proceso || '').slice(0, 28))}`, 'co']));
    if (f?.inicio) ev.push([f.inicio, 'Inicio de ejecución', 'ej']);
    { const pz = (f?.paraliza || []).filter(p => p[0]).map(p => p[0]).sort(); if (pz.length > 2) { ev.push([pz[0], '1.ª paralización', 'bad']); ev.push([pz[pz.length - 1], `Última paralización (${pz.length})`, 'bad']); } else pz.forEach(d => ev.push([d, 'Paralización', 'bad'])); }
    if (oci.length > 3) { const fs = oci.map(o => o[2]).filter(Boolean).sort(); ev.push([fs[0], 'Control (1.º informe)', 'ctl']); ev.push([fs[fs.length - 1], `Control (${oci.length}.º informe)`, 'ctl']); } else oci.forEach(o => { if (o[2]) ev.push([o[2], `Informe de control`, 'ctl']); });
    if (f?.f12b) ev.push([f.f12b, 'Último F12-B', 'ej']);
    if (plazoFin) ev.push([fISO(plazoFin), ctVig ? 'Fin de plazo contractual' : 'Fin previsto', hoy > plazoFin && !cerrado ? 'bad' : 'co']);
    ev.push([fISO(hoy), 'Hoy', 'hoy']);
    ev.sort((x, y) => x[0].localeCompare(y[0]));
    const linea = ev.length > 2 ? `<div class="fi-tl"><div class="fi-tlb"></div>${ev.map((e, i) => { const x = ev.length === 1 ? 50 : 100 * i / (ev.length - 1); return `<div class="fi-te ${e[2]} ${i % 2 ? 'ab' : ''}" style="left:${x}%"><i></i><span><b>${e[1]}</b><small>${fCorta(e[0])}</small></span></div>`; }).join('')}</div>` : '';
    // ---- componentes (08-A C / 08-B / 08-C) + otros costos, con la conciliación ----
    const comp = f?.comp || [], otros = (f?.otros || []).map(o => [o.n, +o.c]);
    const norm = t => String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    const EST = {}; (f?.estim || []).forEach(([n, costoE, monto, avance, tipo]) => { EST[norm(n)] = { n, costo: costoE, monto, avance, tipo }; });
    const estDe = n => EST[norm(n)];
    const estTot = (f?.estim || []).reduce((t, e) => t + (e[2] || 0), 0), estCostoTot = (f?.estim || []).reduce((t, e) => t + (e[1] || 0), 0);
    const estDif = f?.estim && devAc != null ? estTot - devAc : null;
    const ejecHTML = (e, ref) => e ? `<span class="fi-cpe"><span class="fi-cpeb"><i style="width:${Math.min(100, e.avance || (e.costo ? 100 * e.monto / e.costo : 0))}%"></i></span><b>${F0(e.monto)}</b><small>${(Math.round((e.avance || 0) * 10) / 10).toLocaleString('es-PE')} % ejecutado${ref != null && e.costo && Math.abs(e.costo - ref) > Math.max(500, ref * .01) ? ` · costo declarado ${F0(e.costo)}` : ''}</small></span>` : (f?.estim ? '<span class="fi-cpe vacio">sin ejecución declarada</span>' : '');
    const compTot = comp.reduce((s, cp) => s + cp.a.reduce((t, a) => t + (+a.c || 0), 0), 0), otrosTot = otros.reduce((t, o) => t + o[1], 0);
    const fmtNom = { '08-A seccion-C': 'Formato 08-A, sección C', '08-B programa': 'Formato 08-B', '08-C ioarr-activos': 'Formato 08-C', 'productos/acciones': 'productos y acciones de la ficha' }[f?.formato] || 'ficha de ejecución';
    const compHTML = comp.length ? comp.map((cp, i) => { const monto = cp.a.reduce((t, a) => t + (+a.c || 0), 0), p = compTot ? 100 * monto / compTot : 0, n = cp.a.length, acc = [...cp.a].sort((x, y) => (+y.c || 0) - (+x.c || 0));
      return `<div class="fi-cc" role="button" tabindex="0" aria-expanded="false"><div class="fi-cch"><span class="fi-cci">${i + 1}</span><span class="fi-cpn">${esc(cp.n)}</span><span class="fi-cpm">${F0(monto)}<small>${p.toFixed(0)} % de los componentes</small></span><span class="fi-cpb"><span style="width:${Math.max(1, p)}%"></span></span>${ejecHTML(estDe(cp.n), monto)}<span class="fi-cpa"><span>${n} acci${n === 1 ? 'ón' : 'ones'}${cp.a.some(a => a.u) ? ' · con metas físicas' : ''}</span><i>ver acciones ›</i></span></div>
        <div class="fi-acc"><div><ol>${acc.map((a, j) => `<li style="--i:${j}"><i>${j + 1}</i><span>${esc(a.n)}${a.f ? ` <small>· ${esc(a.f)}</small>` : ''}${a.u ? ` <small>· meta ${esc(a.u)}</small>` : ''}</span><b>${F0(+a.c || null)}</b><span class="fi-accb"><span style="width:${monto ? Math.max(1, 100 * (+a.c || 0) / monto) : 0}%"></span></span></li>`).join('')}</ol></div></div></div>`; }).join('')
      : `<p class="vacio">${f ? 'La ficha de ejecución no registra componentes.' : 'La ficha del Banco de Inversiones se incorpora en la próxima ronda nocturna.'}</p>`;
    const estimHTML = f?.estim ? `<div class="fi-estim ${estDif != null && Math.abs(estDif) > Math.max(5000, (devAc || 0) * .02) ? 'warn' : 'ok'}"><div class="fi-esth"><span>${ico('clipboard')}Ejecución declarada por componente <small>pestaña Estimación del F12-B${f.estim_fecha ? ` · declarada el ${fCorta(f.estim_fecha)}` : ''}</small></span><b>${F0(estTot)}</b></div>
      <div class="fi-estl">${(f.estim || []).filter(e => e[4] === '2' && (e[1] || e[2])).map(e => `<span>${esc(e[0].toLowerCase().replace(/^\w/, ch => ch.toUpperCase()))} <b>${F0(e[2])}</b><small> de ${F0(e[1])}${(() => { const o = otros.find(x => norm(x[0]) === norm(e[0])); return o && Math.abs(o[1] - e[1]) > Math.max(500, o[1] * .01) ? ` · 08-A: ${F0(o[1])}` : ''; })()}</small></span>`).join('')}</div>
      <p class="fi-nota">${estDif == null ? '' : Math.abs(estDif) <= Math.max(5000, (devAc || 0) * .02) ? `Cuadra con el devengado acumulado (${F0(devAc)}).` : `No cuadra con el devengado acumulado (${F0(devAc)}): diferencia de ${F0(Math.abs(estDif))} ${estDif > 0 ? 'por encima' : 'por debajo'}. Se sugiere actualizar la pestaña Estimación en los primeros 10 días hábiles del mes.`}${estCostoTot && costo && Math.abs(estCostoTot - costo) > Math.max(5000, costo * .01) ? ` Los costos declarados en la Estimación suman ${F0(estCostoTot)}; el costo de inversión actualizado es ${F0(costo)}.` : ''}</p></div>` : (f && comp.length ? '<p class="fi-nota">La entidad aún no declara ejecución por componente en la pestaña Estimación del Formato 12-B.</p>' : '');
    const concilia = f && comp.length ? `<div class="fi-con"><span>${comp.length} componente${comp.length === 1 ? '' : 's'} <b>${F0(compTot)}</b></span>${otros.length ? `<span>+ ${otros.map(([l, v]) => `${esc(l)} <b>${F0(v)}</b>`).join(' · ')}</span>` : ''}<span class="tot">= <b>${F0(compTot + otrosTot)}</b>${costo && Math.abs(compTot + otrosTot - costo) > Math.max(1000, costo * .005) ? ` <small>(costo de inversión actualizado ${F0(costo)}: diferencia ${F0(costo - compTot - otrosTot)})</small>` : costo ? ' <small>= costo de inversión actualizado</small>' : ''}</span></div>` : '';
    const componentes = `<section class="fi-sec"><div class="fi-cadh">Componentes y acciones <small>${fmtNom}</small></div>${concilia}<div class="fi-cpl">${compHTML}</div>${estimHTML}${fuente('Fuente: Banco de Inversiones, ' + fmtNom + (f?.estim ? ' y Estimación del F12-B' : ''), fSSI)}</section>`;
    // ---- dónde fue el dinero: devengado por tipo de gasto (específica) y año ----
    const esp = {}; (f?.espec || []).forEach(([y, cod, des, m]) => { const k = cod + '|' + des; esp[k] = esp[k] || { cod, des, tot: 0, anios: {} }; esp[k].tot += m; esp[k].anios[y] = (esp[k].anios[y] || 0) + m; });
    const espRows = Object.values(esp).sort((x, y) => y.tot - x.tot);
    const espEjec = espRows.filter(r => !r.cod.startsWith('2.4')).reduce((t, r) => t + r.tot, 0);
    const etDev = espRows.filter(r => r.cod.startsWith('2.6.81.3') || /EXPEDIENTE/.test(r.des)).reduce((t, r) => t + r.tot, 0), etCosto = (otros.find(o => /EXPEDIENTE/i.test(o[0])) || [])[1];
    const dinero = espRows.length ? `<section class="fi-sec"><div class="fi-cadh">Dónde fue el dinero <small>devengado por tipo de gasto, todos los años</small></div>
      <div class="fi-esp">${espRows.map(r => `<div class="fi-er ${r.cod.startsWith('2.4') ? 'tr' : ''}"><span class="fi-en">${esc(r.des.toLowerCase().replace(/^\w/, ch => ch.toUpperCase()))}<small>${r.cod}${r.cod.startsWith('2.4') ? ' · transferencia a otra unidad: no se suma al gasto del ejecutor' : ''} · ${Object.keys(r.anios).sort().map(y => `${y}: ${F0(r.anios[y])}`).join(' · ')}</small></span><span class="fi-eb"><i style="width:${espEjec ? Math.min(100, 100 * r.tot / espEjec) : 0}%"></i></span><b>${F0(r.tot)}</b></div>`).join('')}</div>
      ${etDev && etCosto ? `<p class="fi-nota">Elaboración del expediente técnico: ${F0(etCosto)} en la sección C del Formato 08-A · ${F0(etDev)} devengados en "elaboración de expedientes técnicos"${Math.abs(etDev - etCosto) <= Math.max(1000, etCosto * .02) ? ': coinciden' : ': orden de magnitud, pudo pagarse en otro año o con otro código'}.</p>` : ''}
      <p class="fi-nota">Este cuadro es lo que registra el SIAF por tipo de gasto; la ejecución por componente es lo que declara la entidad en la Estimación del F12-B. Son dos miradas del mismo dinero y no coinciden una a una.</p>
      ${fuente('Fuente: Transparencia Económica (SIAF) vía Banco de Inversiones', fSSI)}</section>` : '';
    // ---- control: Contraloría, paralizaciones, INFOBRAS ----
    const ctlHTML = [
      oci.length ? `<div class="fi-ctl"><h5>${ico('shield')}Contraloría General · ${oci.length} informe${oci.length === 1 ? '' : 's'} de control</h5><ol class="fi-oci">${[...oci].sort((x, y) => (y[2] || '').localeCompare(x[2] || '')).map(o => `<li><span>${fCorta(o[2])}</span><span>${esc(o[1] ? o[1].toLowerCase().replace(/^\w/, ch => ch.toUpperCase()) : 'Informe')} <b>${esc(o[0])}</b></span>${o[3] ? `<a href="${esc(o[3])}" target="_blank" rel="noopener">ver PDF ↗</a>` : ''}</li>`).join('')}</ol></div>` : '',
      (f?.paraliza || []).length ? `<div class="fi-ctl bad"><h5>${ico('barrier')}Paralización declarada</h5>${f.paraliza.map(p => `<p><b>${fCorta(p[0])}</b>${p[2] ? ` · estado: ${esc(p[2])}` : ''}${p[3] != null ? ` · avance físico al paralizar ${p[3]} %` : ''}<br>${esc(p[1] || '')}</p>`).join('')}</div>` : '',
      infobras.length ? `<div class="fi-ctl"><h5>${ico('crane')}INFOBRAS · ${infobras.length} obra${infobras.length === 1 ? '' : 's'} registrada${infobras.length === 1 ? '' : 's'}</h5>${infobras.map(o => `<p><b>Obra ${esc(o.cod)}</b>${o.inicio ? ` · inicio ${fCorta(o.inicio)}` : ''}${o.modalidad ? ` · ${esc(o.modalidad)}` : ''}<br>monto aprobado ${F0(o.aprobado)} · contratado ${F0(o.contratado)}</p>`).join('')}</div>` : ''
    ].filter(Boolean).join('');
    const control = ctlHTML ? `<section class="fi-sec"><div class="fi-cadh">Control y situación de obra <small>Contraloría · INFOBRAS · Banco de Inversiones</small></div>${ctlHTML}${fuente('Fuentes: Contraloría (SPIC), INFOBRAS y registro de paralizaciones del MEF', fSSI)}</section>` : (f ? `<section class="fi-sec"><div class="fi-cadh">Control y situación de obra <small>Contraloría · INFOBRAS</small></div><p class="vacio">Sin informes de control, paralizaciones ni registro INFOBRAS para este CUI.</p></section>` : '');
    // ---- derecha ----
    const FMx = n => n == null ? '—' : Math.abs(n) >= 1e6 ? FM(n) : F0(n);
    if (c.pim == null && f?.pim) c = { ...c, pim: f.pim, dev: f.anual?.[ANIO] || 0, cert: null };
    const pim1 = c.pim || 1, pct = v => c.pim ? Math.round((v || 0) * 100 / pim1) + ' %' : '';
    const presu = c.pim != null ? `<div class="fi-pr"><div class="fi-prh"><span>Presupuesto ${ANIO}</span><b>PIM ${FMx(c.pim)}</b></div><div class="fi-cadb"><span style="width:${Math.min(100, (c.cert || 0) * 100 / pim1)}%;background:var(--azul)"></span><span style="width:${Math.min(100, (c.dev || 0) * 100 / pim1)}%;background:var(--ok-t)"></span></div><div class="fi-prl">${c.cert != null ? `<span><i style="background:var(--azul)"></i>Certificado ${pct(c.cert)} <small>${FMx(c.cert)}</small></span>` : ''}<span><i style="background:var(--ok-t)"></i>Devengado ${pct(c.dev)} <small>${FMx(c.dev)}</small></span></div>${fuente('Transparencia Económica', (typeof R !== 'undefined' && R?.corte) ? `al ${R.corte}` : '')}</div>` : '';
    const fotos = (f?.fotos || []).slice(0, 2).map(([per, url]) => `<figure><img src="${esc(url)}" alt="Foto de la obra ${esc(per || '')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>${esc(per || '')}</figcaption></figure>`).join('');
    const f12 = `<div class="fi-f12 ${ef[0]}"><div class="fi-f12h"><span>Formato 12-B</span><b class="fi-sem">${ef[1]}</b></div><small>${ef[2]}</small>
      ${f?.situ_act ? `<p>${esc(f.situ_act.split('\n')[0].slice(0, 220))}</p>` : ''}${fotos ? `<div class="fi-fotos">${fotos}</div>` : ''}
      ${(f?.hist || []).length > 1 ? (() => { const h = f.hist, W = 300, Hh = 90, x0 = fecha(h[0][0]), x1 = fecha(h[h.length - 1][0]), sp = Math.max(1, x1 - x0); const X = d => 6 + (W - 12) * (fecha(d) - x0) / sp, Y = v => Hh - 8 - (Hh - 16) * Math.max(0, Math.min(100, v)) / 100; const path = k => h.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ');
        return `<div class="fi-curva"><div class="fi-curvah"><span>Avance declarado mes a mes</span><small>${h.length} declaraciones · ${fecha(h[0][0]).getUTCFullYear()}–${fecha(h[h.length - 1][0]).getUTCFullYear()}</small></div><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Curva de avance físico e inversión declarados"><line x1="6" y1="${Y(100)}" x2="${W - 6}" y2="${Y(100)}"/><line x1="6" y1="${Y(50)}" x2="${W - 6}" y2="${Y(50)}"/><line x1="6" y1="${Y(0)}" x2="${W - 6}" y2="${Y(0)}"/><path class="inv" d="${path(2)}"/><path class="fis" d="${path(1)}"/>${plazoFin && plazoFin >= x0 && plazoFin <= x1 ? `<line class="fin" x1="${X(fISO(plazoFin))}" y1="${Y(100)}" x2="${X(fISO(plazoFin))}" y2="${Y(0)}"/>` : ''}</svg><div class="fi-curval"><span><i style="background:var(--azul)"></i>físico</span><span><i style="background:var(--ok-t)"></i>inversión (Estimación)</span>${plazoFin ? '<span><i style="background:#B42A2A;height:2px"></i>fin de plazo</span>' : ''}</div></div>`; })() : ''}
      <button type="button" class="fi-seg-hdr fi-dh"><span class="fi-di">${ico('clipboard')}</span><span class="fi-dt">Ver el seguimiento completo <small>situación, problemática, acciones, riesgos y fotos</small></span><span class="fi-dc" aria-hidden="true">↗</span></button>
      ${fuente('Lo declara la entidad en el Banco de Inversiones · plazo: 10 días hábiles del mes siguiente', fSSI)}</div>`;
    const desp = (id, ic, t, v, cuerpo, abierto) => `<div class="fi-d ${abierto ? 'on' : ''}" data-d="${id}"><button type="button" class="fi-dh" aria-expanded="${!!abierto}"><span class="fi-di">${ico(ic)}</span><span class="fi-dt">${t}</span><b>${v}</b><span class="fi-dc" aria-hidden="true">›</span></button><div class="fi-db"><div>${cuerpo}</div></div></div>`;
    const dSea = sp.length ? desp('sea', 'doc', 'Contratación', `${sp.length} proceso${sp.length === 1 ? '' : 's'}`, sp.slice(0, 6).map(p => { const ct = p.contrato; return `<div class="fi-r"><span>${esc(p.bp?.prov || p.estado || 'Proceso')}<small> · ${esc(p.proceso || '')}${ct && (ct.fin_act || ct.fin) ? ` · fin ${ct.fin_act || ct.fin}` : ''}</small></span><b>${F0(ct?.monto_final || ct?.monto || p.vr)}</b></div>`; }).join('') + '<small class="fi-fu">SEACE</small>') : '';
    const benef = f?.beneficiarios || c.beneficiarios;
    // revisión sugerida (mismas reglas que la vista de alertas de la UE, window.SUG en index.html): qué verificar y qué norma lo exige
    const sugs = window.SUG && c && c.cui ? Object.entries(window.SUG).filter(([, r]) => { try { return r.f(c); } catch (e) { return false; } }) : [];
    const sugHTML = sugs.length ? `<div class="fi-sug" id="fi-sug-cuerpo" hidden><div class="fi-sugh">${ico('spark')}<b>Revisión sugerida</b><small>no son alertas: conviene verificar y, si corresponde, completar el registro</small></div>${sugs.map(([k, r]) => `<div class="fi-sugi" style="--c:${r.c}"><span class="fi-si">${ico(r.ic)}</span><div><b>${r.l.replace(/^\w/, ch => ch.toUpperCase())}</b><p>${r.def}</p><p class="fi-sugn">${ico('scale')} ${r.norma}</p><p class="fi-suga">${ico('arrow')} ${r.acc}</p></div></div>`).join('')}</div>` : '';
    const sinCab = h => h.replace(/^<section class="fi-sec"><div class="fi-cadh">[\s\S]*?<\/div>/, '<section class="fi-sec">');   // la cabecera pasa al desplegable
    return `<div class="fi">
      <div class="pd-hdr fi-hdr"><div class="pd-cui"><span>CUI ${cui}</span>${meta.map(m => `<span>· ${esc(m)}</span>`).join('')}</div>
        <div class="pd-title ${nombre.length > 110 ? 'larga' : ''}">${esc(nombre)}</div>
        <div class="fi-acts"><span class="fi-est" style="--c:${colObra}">${estObra}</span>${benef ? `<span class="fi-benh">${N(benef)} beneficiarios</span>` : ''}<span class="sp"></span>${sugs.length ? `<button type="button" class="btn fi-sugbtn" title="Señales de registro o consistencia que conviene verificar, con la norma que lo exige">${ico('spark')} Revisión sugerida <b>${sugs.length}</b></button>` : ''}<button type="button" class="btn fi-print">Imprimir</button><button type="button" class="ov-volver fi-regresar"><span class="ov-fl" aria-hidden="true">←</span>Volver</button></div></div>
      ${veredicto}${sugHTML}
      <div class="fi-cols">
        <div class="fi-a">
          <section class="fi-sec"><div class="fi-cadh">De lo aprobado a lo ejecutado <small>qué se aprobó, qué se contrató y qué se gastó</small></div>${tres}</section>
          ${linea ? desp('tl', 'calendar', 'Línea de tiempo', `${ev.length} hitos · ${fCorta(ev[0][0])} → ${fCorta(ev[ev.length - 1][0])}`, linea) : ''}
          ${desp('comp', 'layers', `Componentes y acciones <small>${fmtNom}</small>`, comp.length ? `${comp.length} componente${comp.length === 1 ? '' : 's'} · ${F0(compTot + otrosTot)}` : 'sin registro', sinCab(componentes))}
          ${dinero ? desp('esp', 'cash', 'Dónde fue el dinero <small>devengado por tipo de gasto, todos los años</small>', `${espRows.length} tipo${espRows.length === 1 ? '' : 's'} de gasto · ${F0(espEjec)}`, sinCab(dinero)) : ''}
          ${control ? desp('ctl', 'shield', 'Control y situación de obra <small>Contraloría · INFOBRAS · Banco de Inversiones</small>', ctlHTML ? [oci.length ? `${oci.length} informe${oci.length === 1 ? '' : 's'} CGR` : '', (f?.paraliza || []).length ? `${f.paraliza.length} paralización${f.paraliza.length === 1 ? '' : 'es'}` : '', infobras.length ? `${infobras.length} obra${infobras.length === 1 ? '' : 's'} INFOBRAS` : ''].filter(Boolean).join(' · ') : 'sin informes', sinCab(control)) : ''}
        </div>
        <div class="fi-b"><div class="fi-ds">${presu ? desp('pr', 'wallet', `Presupuesto ${ANIO}`, `PIM ${FMx(c.pim)}${c.pim ? ` · devengado ${pct(c.dev)}` : ''}`, presu) : ''}${desp('f12', 'clipboard', 'Formato 12-B', `<span class="fi-sem ${ef[0]}">${ef[1]}</span>`, f12)}${dSea}</div></div>
      </div>
    </div>`;
  }
  function fichaInversionRender(el, cui, f, c, sp, onVolver) {
    el.innerHTML = fichaInversionHTML(cui, f, c, sp);
    if (onVolver) el.querySelectorAll('.fi-regresar').forEach(x => x.onclick = onVolver);
    el.querySelectorAll('.fi-print').forEach(x => x.onclick = () => CR.exportar((c && c.ue) || (E && E._ue && E._ue.cod), (c && c.ue_nombre) || (E && E._ue && E._ue.nombre), () => window.print()));
    const nombre = f?.nombre || c?.nombre || null;
    el.querySelectorAll('.fi-seg-hdr').forEach(x => x.onclick = () => mostrarSeguimientoModal(cui, nombre, buildSituDet(f, c, sp), el.closest('dialog')));
    el.querySelectorAll('.fi-d[data-d] > .fi-dh').forEach(h => h.onclick = () => { const d = h.parentElement, on = !d.classList.contains('on'); d.classList.toggle('on', on); h.setAttribute('aria-expanded', String(on)); });
    el.querySelectorAll('.fi-t').forEach(x => x.onclick = () => { const on = !x.classList.contains('on'); el.querySelectorAll('.fi-t').forEach(y => { y.classList.toggle('on', on); y.setAttribute('aria-expanded', String(on)); }); });
    const sb = el.querySelector('.fi-sugbtn'), sc = el.querySelector('#fi-sug-cuerpo');
    if (sb && sc) sb.onclick = () => { const ico = n => window.Ico ? Ico(n) : '', esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const raiz = el.closest('dialog') || document.body;   // dentro de la ventana de ficha (top layer) el emergente debe colgar del propio dialog
      let ov = document.getElementById('sug-ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'sug-ov'; ov.className = 'sug-ov'; raiz.appendChild(ov); }
      ov.innerHTML = `<div class="sug-card" role="dialog" aria-modal="true" aria-labelledby="sug-tit" tabindex="-1"><div class="pd-hdr sug-hdr"><div class="pd-cui"><span>${ico('spark')} REVISIÓN SUGERIDA · CUI ${esc(String(cui))}</span></div><div class="pd-title" id="sug-tit">${esc(nombre || '')}</div><div class="fi-acts"><span class="sug-nota">No son alertas: señales de registro o consistencia que conviene verificar. Cada una indica la norma que lo exige y la acción.</span><span class="sp"></span><button type="button" class="ov-volver" id="sug-cerrar"><span class="ov-fl" aria-hidden="true">←</span>Volver</button></div></div><div class="sug-body">${sc.innerHTML}</div></div>`;
      const cerrar = () => { ov.remove(); sb.focus({ preventScroll: true }); };
      ov.onclick = ev => { if (ev.target === ov) cerrar(); }; ov.querySelector('#sug-cerrar').onclick = cerrar;
      ov.querySelector('.sug-card').onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar(); } }; ov.querySelector('.sug-card').focus();
    };
    el.querySelectorAll('.fi-cc').forEach(x => x.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); x.click(); } });
    el.querySelectorAll('.fi-cc').forEach(x => x.onclick = () => { const on = !x.classList.contains('on'); el.querySelectorAll('.fi-cc.on').forEach(y => { y.classList.remove('on'); y.setAttribute('aria-expanded', 'false'); }); x.classList.toggle('on', on); x.setAttribute('aria-expanded', String(on)); x.querySelector('.fi-cpa i').textContent = on ? 'ocultar ‹' : 'ver acciones ›'; if (on) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
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
    } else if (tabE === 'cie') {
      // Cierre de gestion: pendientes publicos (alertas.json de la UE) + los del SIAF (bloques alertas y cierre del paquete cifrado)
      b.innerHTML = '<p class="mutx" style="padding:12px">Cargando…</p>';
      (async () => { let AL = (window.alertasPub && window.alertasPub()) || null;   // alertas.json publico (el A local de cuerpo() es el del SIAF) if (!AL) { try { AL = await j('data/alertas.json'); } catch (e) { } }
        if (!window.Cierre) { b.innerHTML = '<p class="mutx" style="padding:12px">No se pudo cargar el módulo de cierre de gestión.</p>'; return; }
        Cierre.ui(b, { ue: String(E._ue.cod), nombre: E._ue.nombre, nivel: E._ue.nivel, alertas: AL, corteAlertas: AL && AL.corte, siaf: E.publico ? null : E,
          onCui: cui => { filtroMeta = cui; tabE = 'exp'; render(); }, onAtras: () => { tabE = 'inv'; render(); } }); })();
    } else if (tabE === 'ges') {
      // ponytail: Gestion usa la ficha publica de la UE (misma que ve cualquiera): cierre, procesos SEACE, plazos, proyeccion y rubros; el SIAF no agrega campos aqui
      const irCui = cui => { filtroMeta = cui; tabE = 'exp'; render(); };
      (async () => { let pub = null; try { const r = await fetch(`data/ue/${String(+E._ue.cod % 64).padStart(2, '0')}.json`); if (r.ok) pub = (await r.json())[String(E._ue.cod)]; } catch (e) { }
        if (!pub) { b.innerHTML = '<p class="mutx" style="padding:12px">Sin ficha pública para esta unidad ejecutora.</p>'; return; }
        if (window.Gestion) Gestion.ui(b, Object.assign({ cod: String(E._ue.cod), nombre: E._ue.nombre, nivel: E._ue.nivel }, pub), { onCui: irCui }); })();
    } else if (tabE === 'sea') {
      const cuis = Object.values(LAKE).filter(c => c.pim > 0 || c.dev > 0 || c.avance_fisico > 0), sea = c => SEA_R[c.cui];
      const procs = cuis.map(c => ({ c, s: sea(c) })).filter(x => x.s);
      const est = x => { const e = (x.s.estado || '').toUpperCase(), fin = x.s.fin; return /SIN ACTUALIZAR|SIN ESTADO/.test(e) ? 'viejo' : /DESIERT/.test(e) ? 'desierto' : /NULO|CANCEL/.test(e) ? 'nulo' : x.s.firma ? (fin && fin < hoyS() && !(x.c.avance_fisico >= 100) ? 'vencido' : 'firmado') : /ADJUDIC|CONSENTID|OTORGAD/.test(e) || x.s.bp ? 'bpro' : 'proceso'; };
      const K = {}; procs.forEach(x => (K[est(x)] = K[est(x)] || []).push(x)); const k = s => (K[s] || []).length;
      const sinProc = cuis.filter(c => c.pim >= 5e5 && !sea(c) && !(c.dev > 0)).length;
      const NK = { proceso: 'en convocatoria', bpro: 'con buena pro, sin contrato', firmado: 'contratos vigentes', vencido: 'contratos con plazo vencido', desierto: 'desiertos', nulo: 'nulos / cancelados', viejo: 'sin actualizar en SEACE (+18 meses)' };
      const obras = `<p class="mutx" style="font-size:11.5px;padding:8px 8px 0">${procs.length} obras con proceso en SEACE · ${k('firmado') + k('vencido')} contratadas · ${k('proceso')} en convocatoria · ${k('bpro')} con buena pro sin firmar · ${k('vencido')} con plazo vencido · ${k('desierto')} desiertos${sinProc ? ` · ${sinProc} con presupuesto ≥ S/ 500 mil sin proceso registrado` : ''}</p><table><tr><th>Inversión</th><th>Situación</th><th>Contratista</th><th>Convocado</th><th>Firma</th><th>Fin de plazo</th><th>Monto</th></tr>${Object.keys(NK).flatMap(s => (K[s] || []).map(x => `<tr class="l" data-sf="${x.c.cui}" style="cursor:pointer"><td style="white-space:normal"><b>${x.c.cui}</b> ${x.c.nombre.slice(0, 70)}</td><td>${NK[s]}</td><td style="white-space:normal">${x.s.prov || '—'}</td><td>${x.s.conv || ''}</td><td>${x.s.firma || ''}</td><td style="color:${s === 'vencido' ? 'var(--bad)' : 'inherit'}">${x.s.fin || ''}</td><td>${F(x.s.monto)}</td></tr>`)).join('')}</table>`;
      const irCui = cui => { filtroMeta = cui; tabE = 'exp'; render(); };
      if (window.Contrataciones) Contrataciones.ui(b, E._ue, { obras, onCui: irCui }).then(() => b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => irCui(tr.dataset.sf)));
      else { b.innerHTML = obras; b.querySelectorAll('tr.l').forEach(tr => tr.onclick = () => irCui(tr.dataset.sf)); }
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
          nivel: E._ue.nivel, ue: E._ue.cod, nombre: E._ue.nombre, fts, beneficiarios: bc, nAlertas: nAl, estSel: abiertos.invEstado, nombreFallback: nombreMeta, cierre: E._ue.nivel === 'M' || E._ue.nivel === 'R', siaf: !E.publico && !!window.ReportesSIAF,
          onNav: id => { if (id === 'rep') { window.ReportesSIAF.abrir(E); return; } tabE = id === 'cierre' ? 'cie' : id; render(); },
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
      const RN = { nuevo: 'Ley 32069 · DS 009-2025-EF', viejo: 'Ley 30225 · DS 344-2018-EF' }, PAGO_D = { nuevo: 14, viejo: 10 };   // pago: 10 dias habiles (~14 cal) / 10 dias calendario (DS 344-2018-EF art. 171.1) tras la conformidad
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
          detalle: () => `<p class="mutx" style="font-size:11px">§ Ley 32069, art. 67.3 y 67.5: pago en máximo 10 días hábiles desde la conformidad (aquí: desde el devengado), con intereses legales si se atrasa; contratos convocados antes del 22-abr-2025: 10 días calendario (DS 344-2018-EF, art. 171.1). Verde dentro del plazo, ámbar hasta 30 días, rojo más de 30. Valorizaciones de obra: se pagan hasta el último día del mes en que se presentan (art. 210 / 194).</p>
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
  window.Entidad = { atras, abrir: async (ue) => {
    if (E && (!ue || String(E.ue) === String(ue))) { render(); return; }   // mismo tipo: E.ue puede venir numérico y ue del hash como texto
    const s = SES.get();
    if (s && (!ue || String(s.ue) === String(ue))) { try { E = await descifrar(s.ue, null, s.k); await preparar(s.ue); tabE = 'inv'; abiertos.invLista = false; render(); return; } catch (e) { console.warn('sesion guardada invalida', e); SES.clear(); } }
    await login(); if (ue && $('ent-ue')) $('ent-ue').value = ue; } };
})();

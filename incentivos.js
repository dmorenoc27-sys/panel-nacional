/* incentivos.js — Programa de Incentivos a la Mejora de la Gestión Municipal 2026 (DS 003-2026-EF, RD 0003-2026-EF/50.01).
   Estructura de los 7 compromisos con indicadores, hitos y lo que el SIAF permite verificar; estado manual guardado en el navegador.
   Depende de Mi entidad (datos E descifrados) y de helpers globales ($, M, P, cls, MES). */
(function () {
  const PI = {
    anio: 2026, norma: 'DS 003-2026-EF (22/01/2026) · RD 0003-2026-EF/50.01 (29/01/2026) · Ley 32513',
    calendario: [['2027-03-17', 'Resultados preliminares (MEF)'], ['2027-04-21', 'Resultados finales'], ['2027-06-30', 'Transferencia del incentivo']],
    compromisos: [
      { n: 1, nombre: 'Prevención y reducción de la anemia en niños hasta 12 meses', corto: 'Anemia infantil', ente: 'MINSA · DGIESP', verif: 'REUNIS, Aplicativo de Visitas, HIS-MINSA, Padrón Nominal', aplica: '1,059 distritos priorizados (tipos A–G)',
        indicadores: [['1.1', 'Porcentaje de niños de 6 y/o 12 meses sin anemia']],
        hitos: [['2026-01-31', 'Conformación del equipo de trabajo'], ['2026-02-28', 'Capacitación del Actor Social (7 sesiones) y plan de trabajo'], ['2026-12-31', 'Visitas domiciliarias, sesiones demostrativas, ferias de salud y padrón nominal actualizado (feb–dic)'], ['2026-12-31', 'Cierre de medición']],
        siaf: { tipo: 'pp', codigos: ['0001'], nota: 'Gasto del Programa Presupuestal 0001 Articulado Nutricional (visitas domiciliarias, sesiones demostrativas): muestra si hay presupuesto y ejecución detrás del compromiso.' } },
      { n: 2, nombre: 'Mejorar los niveles de recaudación del Impuesto Predial', corto: 'Impuesto Predial', ente: 'MEF · DGPIP (valida con SIAF y SISREPRE)', verif: 'SIAF (recaudación), SISREPRE, tablero de avance', aplica: '1,354 municipalidades: 2.1 tipos A–E · 2.2 tipos E–G',
        indicadores: [['2.1', 'Efectividad de recaudación del predial corriente (tipos A–E)'], ['2.2', 'Aumento de la recaudación total 2026 respecto a 2025 (tipos E–G)']],
        hitos: [['2026-12-31', 'Recaudación medida en SIAF del 1 de enero al 31 de diciembre'], ['2026-12-31', 'Registro de emisión y cobranza en SISREPRE'], ['2027-04-30', 'Evaluación MEF (enero–abril 2027)']],
        siaf: { tipo: 'ingreso', filtro: 'PREDIAL', nota: 'La recaudación del predial la mide el MEF directamente en el SIAF: lo que se ve aquí es exactamente lo que evaluará. Para 2.2 ingresa la recaudación total 2025 y el sistema calcula el % de aumento.' } },
      { n: 3, nombre: 'Fortalecimiento y ampliación del Registro de Información Social (RIS)', corto: 'Registro Social (RIS)', ente: 'MIDIS · OFIS', verif: 'REUNIS, RIS (OFIS), RUIPN, SIGOF, visitas de campo ago–set', aplica: '501 municipalidades (tipos A–G)',
        indicadores: [['3.1', 'Población con clasificación socioeconómica vigente en el RIS (meta nacional: 2 millones de personas)']],
        hitos: [['2026-02-01', 'Inicio del periodo de medición y ULE operativa'], ['2026-10-31', 'Talleres y seminarios OFIS (feb–oct)'], ['2026-12-28', 'Fin de registro y certificación de CSE'], ['2026-12-31', 'Corte de medición']],
        siaf: { tipo: 'texto', nota: 'Sin medición en SIAF. Se puede seguir el gasto de la Unidad Local de Empadronamiento (personal, movilidad) buscando "ULE" o "EMPADRONAMIENTO" en las glosas.' , glosa: 'EMPADRON' } },
      { n: 4, nombre: 'Mejorar la prestación de los servicios de agua potable y saneamiento rural', corto: 'Agua y saneamiento rural', ente: 'VIVIENDA · PNSR', verif: 'SIVICA-DATASS, verificación de campo, declaración jurada, SIAF', aplica: '1,654 municipalidades (grupos 1–4)',
        indicadores: [['4.1', 'Viviendas con acceso a agua de calidad (cloro residual, sistemas operativos)']],
        hitos: [['2026-02-28', '1er ciclo de capacitación (módulos I–III)'], ['2026-07-31', '2do ciclo de capacitación (julio) · PIM de referencia del producto 3000882'], ['2026-09-30', 'Certificado ≥ 80 % y devengado ≥ 60 % del PIM (al 31-jul) del producto 3000882'], ['2026-12-18', 'Devengado ≥ 80 % del PIM del producto 3000882'], ['2026-12-31', 'Control mensual de cloro residual, mantenimiento y operador seleccionado']],
        siaf: { tipo: 'producto', codigos: ['3000882'], reglas: [['2026-09-30', 'cert', 80], ['2026-09-30', 'dev', 60], ['2026-12-18', 'dev', 80]], nota: 'Ficha técnica 4.1 (numeral 3.1): certificar 80 % y devengar 60 % del producto 3000882 al 30-set y devengar 80 % al 18-dic, sobre el PIM al 31-jul. Vale 5 % del puntaje; el otro 95 % es el indicador de agua clorada.' } },
      { n: 5, nombre: 'Fortalecer el rol de los gobiernos locales en favor de la seguridad ciudadana', corto: 'Seguridad ciudadana', ente: 'MININTER · DGSC', verif: 'SIPCOP-M (patrullaje), reportes de comisarías', aplica: '580 gobiernos locales',
        indicadores: [['5.1', 'Población urbana víctima de robo en los últimos 12 meses'], ['5.2', 'Jurisdicciones de comisarías con patrullaje coordinado'], ['5.3', 'Patrullajes que cumplen parámetros (≥ 75 % municipal válido, ≥ 50 % de días con patrullaje integrado, km mínimos)']],
        hitos: [['2026-12-31', 'Patrullaje municipal e integrado registrado mes a mes en SIPCOP-M'], ['2026-12-31', 'Cámaras interconectadas con la PNP y atención de alertas (Ojo Vigilante)']],
        siaf: { tipo: 'pp', codigos: ['0030'], nota: 'Gasto del PP 0030 Seguridad Ciudadana (patrullaje por sector 3000355, comunidad organizada 3000356): combustible, serenos, cámaras. Si el devengado está bajo, el patrullaje difícilmente cumple parámetros.' } },
      { n: 6, nombre: 'Mejorar la seguridad vial en entornos viales de riesgo', corto: 'Seguridad vial', ente: 'MTC · Dirección de Seguridad Vial', verif: 'Plataforma de Seguridad Vial en Entornos Viales, fotos/videos, verificación de campo', aplica: '252 gobiernos locales (88 provinciales, 164 distritales)',
        indicadores: [['6.1', 'Zonas escolares priorizadas con medidas de seguridad vial'], ['6.2', 'Intersecciones priorizadas intervenidas'], ['6.3', 'Zonas de establecimientos de salud intervenidas']],
        hitos: [['2026-03-20', 'Acción 1: selección de zonas a intervenir (27/02–20/03)'], ['2026-04-06', 'Acción 0: mantenimiento de zonas escolares (27/02–06/04)'], ['2026-06-26', 'Acción 2: diseño de la intervención (22/05–26/06)'], ['2026-11-13', 'Acción 3: ejecución (demarcación, señalización, reductores, espacios peatonales)']],
        siaf: { tipo: 'pp', codigos: ['0138'], nota: 'Gasto del PP 0138 (seguridad vial: 3000133, 3000478) y de las inversiones viales asociadas. La ejecución de la Acción 3 debe verse como devengado en estas metas antes del 13/11.' } },
      { n: 7, nombre: 'Fortalecer la gestión de trámites municipales', corto: 'Trámites municipales', ente: 'PCM · SGP y SGTD; INDECOPI', verif: 'SUT, reporte SGD, aprobación y publicación del TUPA', aplica: '107 municipalidades (mayormente tipos A–B)',
        indicadores: [['7.1', 'Barreras burocráticas eliminadas voluntariamente'], ['7.2', 'Trámites del TUPA estandarizados y simplificados (PAE)'], ['7.3', 'Trámites digitalizados (SGD, PIDE, certificados digitales)']],
        hitos: [['2026-10-31', 'Eliminación voluntaria de barreras burocráticas (INDECOPI)'], ['2026-12-31', 'TUPA estandarizado aprobado y publicado'], ['2026-12-31', 'Sistema de Gestión Documental operativo']],
        siaf: { tipo: 'texto', nota: 'Sin medición en SIAF. Se puede seguir el gasto en consultorías y software buscando "TUPA", "SGD" o "SIMPLIFICACION" en las glosas.', glosa: 'TUPA' } }
    ]
  };
  const F = n => n == null ? '—' : 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  let METAS = null, MCUR = null;   // metas por municipalidad (Anexo C del PI 2026, cuadros 2026_M_C1..C7 del MEF) -> Web/data/pi_metas.json
  function cargarMetas(cb) { if (METAS) return; METAS = {}; fetch('data/pi_metas.json').then(r => r.json()).then(j => { METAS = j; cb && cb(); }).catch(() => { }); }
  function metasDe(ue) { const ux = (typeof UES !== 'undefined' ? UES : []).find(u => u.cod === ue); return ux && METAS && METAS[ux.dist] || null; }
  const aplicaA = (c, S, m) => S['aplica' + c.n] !== undefined ? S['aplica' + c.n] : m ? !!m['c' + c.n] : true;
  const st = { get(ue) { try { return JSON.parse(localStorage.getItem('pi_' + ue) || '{}'); } catch (e) { return {}; } }, set(ue, v) { try { localStorage.setItem('pi_' + ue, JSON.stringify(v)); } catch (e) { } } };
  const hoy = () => new Date().toISOString().slice(0, 10);
  const ESTADOS = [['pend', 'Pendiente', 'p'], ['proc', 'En proceso', 'warn'], ['ok', 'Cumplido', 'ok'], ['no', 'No cumplido', 'bad']];

  function evaluarSIAF(c, E, META) {
    const s = c.siaf; if (!s) return null; const metas = E.metas;
    if (s.tipo === 'producto' || s.tipo === 'pp') {
      const ms = metas.filter(m => s.tipo === 'producto' ? s.codigos.includes(m.act_proy) : s.codigos.includes(m.pp));
      const t = { pim: 0, cert: 0, comp: 0, dev: 0, gir: 0 }; ms.forEach(m => { for (const k in t) t[k] += m[k] || 0; });
      const reglas = (s.reglas || []).map(([f, campo, min]) => { const pct = t.pim ? 100 * t[campo] / t.pim : 0; return { fecha: f, campo, min, pct, cumple: pct >= min, vencido: f < E.corte }; });
      return { metas: ms, t, reglas };
    }
    if (s.tipo === 'ingreso') {
      const cls_ = (E.ingresos.clasificadores || []).filter(x => (x.nombre || '').toUpperCase().includes(s.filtro));
      const mensual = {}; let total = 0; cls_.forEach(x => { total += x.recaudado || 0; for (const m in x.mensual || {}) mensual[m] = (mensual[m] || 0) + x.mensual[m]; });
      return { clasificadores: cls_, total, mensual, pim: cls_.reduce((a, x) => a + (x.pim || 0), 0) };
    }
    if (s.tipo === 'texto' && s.glosa) return { exps: E.expedientes.filter(e => (e.glosa || '').toUpperCase().includes(s.glosa)).slice(0, 8) };
    return null;
  }

  const Fm = n => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  function diagnostico(c, ev, S, E) {
    const hoyS = hoy(), venc = c.hitos.filter(([f], i) => f < hoyS && !S['hito' + c.n + '_' + i]).length, prox = c.hitos.filter(([f]) => f >= hoyS)[0];
    const d = { color: 'p', titulo: '', frases: [], accion: '' };
    if (ev && (c.siaf.tipo === 'producto' || c.siaf.tipo === 'pp')) {
      const t = ev.t;
      if (!ev.metas.length) { d.color = 'bad'; d.titulo = 'Sin presupuesto asignado'; d.frases.push(`La municipalidad no tiene metas en ${c.siaf.tipo === 'producto' ? 'el producto ' : 'el programa presupuestal '}${c.siaf.codigos.join(', ')}. Si el compromiso aplica, hay que habilitar presupuesto con una nota modificatoria.`); }
      else {
        const av = 100 * t.dev / (t.pim || 1), avc = 100 * t.cert / (t.pim || 1);
        d.frases.push(`Presupuesto ${Fm(t.pim)} en ${ev.metas.length} meta(s): certificado ${avc.toFixed(0)} %, devengado ${av.toFixed(1)} % al ${E.corte}.`);
        if (ev.reglas.length) {
          const pend = ev.reglas.filter(r => !r.cumple), next = pend[0];
          if (!next) { d.color = 'ok'; d.titulo = 'Hitos presupuestales cumplidos'; }
          else { const falta = Math.max(0, t.pim * next.min / 100 - t[next.campo]); d.color = next.vencido ? 'bad' : (falta / (t.pim || 1) > 0.3 ? 'bad' : 'warn'); d.titulo = `Falta ${next.campo === 'cert' ? 'certificar' : 'devengar'} ${Fm(falta)}`;
            d.frases.push(`Para llegar al ${next.min} % ${next.campo === 'cert' ? 'certificado' : 'devengado'} exigido al ${next.fecha} ${next.vencido ? '(plazo vencido)' : ''} hay que ${next.campo === 'cert' ? 'certificar' : 'devengar'} ${Fm(falta)} más${next.campo === 'dev' ? '; hoy hay ' + Fm(t.cert - t.dev) + ' ya certificados que aún no se han ejecutado' : ''}.`);
            const peor = ev.metas.filter(m => m.pim).map(m => ({ m, saldo: m.pim - m[next.campo] })).sort((a, b) => b.saldo - a.saldo).slice(0, 3);
            if (peor.length) d.accion = 'Dónde está el saldo: ' + peor.map(x => `${x.m.act_proy.startsWith('2') ? 'CUI ' + x.m.act_proy : 'meta ' + x.m.meta + ' ' + (x.m.finalidad_n ? x.m.finalidad_n.toLowerCase() : x.m.finalidad || '')} ${Fm(x.saldo)}`).join(' · ') + '.';
            ev.reglas.filter(r => r.cumple).forEach(r => d.frases.push(`✓ ${r.fecha}: ${r.campo === 'cert' ? 'certificado' : 'devengado'} ${r.pct.toFixed(1)} % ≥ ${r.min} %.`)); }
        } else { d.color = av >= 50 ? 'ok' : av >= 25 ? 'warn' : 'bad'; d.titulo = av >= 50 ? 'Gasto asociado en marcha' : av >= 25 ? 'Gasto asociado lento' : 'Gasto asociado casi sin ejecutar'; d.frases.push(`El SIAF no mide este compromiso directamente; el gasto del programa es la señal de que se está trabajando. Quedan ${Fm(t.pim - t.dev)} por devengar.`); }
      }
    } else if (ev && c.siaf.tipo === 'ingreso') {
      const base = S['base' + c.n] || 0, meses = Object.keys(ev.mensual).sort(), n = meses.length || 1, prom = ev.total / n, proy = ev.total + prom * (12 - n);
      d.frases.push(`Predial recaudado ${Fm(ev.total)} en ${n} meses (${(100 * ev.total / (ev.pim || 1)).toFixed(0)} % del presupuesto de ${Fm(ev.pim)}); ritmo ${Fm(prom)} al mes, proyección a diciembre ${Fm(proy)}.`);
      if (base) { const inc = 100 * (proy - base) / base; const mt = MCUR && MCUR.c2 && MCUR.c2['2.2']; d.color = mt ? (inc >= mt[1] ? 'ok' : inc >= mt[0] ? 'warn' : 'bad') : inc >= 0 ? 'ok' : 'bad'; d.titulo = (inc >= 0 ? `Proyecta +${inc.toFixed(1)} % vs 2025` : `Proyecta ${inc.toFixed(1)} % vs 2025`) + (mt ? ` · su meta: umbral ${mt[0]} %, máxima ${mt[1]} %` : ''); d.frases.push(inc >= 0 ? `Al ritmo actual superaría la recaudación 2025 (${Fm(base)}).` : `Al ritmo actual quedaría ${Fm(base - proy)} por debajo de 2025 (${Fm(base)}): hay que recaudar ${Fm((base - ev.total) / Math.max(1, 12 - n))} al mes en lo que queda del año solo para igualarla.`); }
      else { d.color = ev.pim && ev.total / ev.pim >= n / 12 ? 'ok' : 'warn'; d.titulo = ev.pim && ev.total / ev.pim >= n / 12 ? 'Recaudación al día con el presupuesto' : 'Recaudación por debajo del ritmo'; d.accion = 'Ingresa la recaudación 2025 en el detalle para calcular el indicador 2.2.'; }
    } else {
      d.color = venc ? 'warn' : 'p'; d.titulo = venc ? `${venc} hito(s) vencido(s) sin marcar` : 'Seguimiento por hitos';
      d.frases.push(c.siaf.nota); if (ev?.exps?.length) d.frases.push(`${ev.exps.length} expediente(s) con gasto relacionado en el SIAF.`);
    }
    if (prox) d.frases.push(`Próximo hito: ${prox[0]} · ${prox[1]}.`);
    if (venc && d.color === 'ok') d.color = 'warn';
    return d;
  }
  // ---- infografías SVG ----
  const COL = { ok: '#1B9E5A', warn: '#E39B1E', bad: '#D64545', p: '#1E5AA8' };
  function dona(pct, col, meta, label, sub) {
    const r = 30, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct || 0));
    return `<svg viewBox="0 0 80 80" width="88" height="88" style="flex:0 0 auto"><circle cx="40" cy="40" r="${r}" fill="none" stroke="#E6EAF0" stroke-width="9"/><circle cx="40" cy="40" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 40 40)"/>${meta != null ? `<circle cx="40" cy="40" r="${r}" fill="none" stroke="#1C1917" stroke-width="2" stroke-dasharray="2.5 ${c - 2.5}" stroke-dashoffset="${-c * Math.min(100, meta) / 100}" transform="rotate(-90 40 40)" opacity=".7"/>` : ''}<text x="40" y="38" text-anchor="middle" style="font:800 15px Inter,sans-serif;fill:#1C1917">${label}</text><text x="40" y="52" text-anchor="middle" style="font:700 6px Inter,sans-serif;fill:#8A94A6;letter-spacing:.3px">${sub}</text></svg>`;
  }
  function linea(hitos, S, n, corte, autoOK) {
    const y0 = new Date(PI.anio + '-01-01').getTime(), y1 = new Date(PI.anio + '-12-31').getTime(), X = f => (100 * Math.max(0, Math.min(1, (new Date(f).getTime() - y0) / (y1 - y0)))).toFixed(1);
    const hx = X(hoy());
    return `<div style="position:relative;height:22px;margin:0 6px"><div style="position:absolute;top:10px;left:0;right:0;height:2px;background:#D5DBE3;border-radius:1px"></div><div style="position:absolute;top:10px;left:0;width:${hx}%;height:2px;background:#1E5AA8;opacity:.45"</div><div style="position:absolute;top:2px;left:${hx}%;width:0;height:18px;border-left:1.5px dashed #1C1917;opacity:.6" title="hoy"></div>
      ${hitos.map(([f, t], i) => { const done = S['hito' + n + '_' + i] || (autoOK || []).some(r => r.fecha === f && t.includes(r.campo === 'cert' ? 'Certificado' : 'Devengado')), venc = f < hoy() && !done, c = done ? COL.ok : venc ? COL.bad : '#fff', b = done ? COL.ok : venc ? COL.bad : '#8A94A6'; return `<div title="${f} · ${t}" style="position:absolute;top:5px;left:calc(${X(f)}% - 6px);width:12px;height:12px;border-radius:50%;background:${c};border:2px solid ${b};box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>`; }).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:8.5px;color:var(--mut);margin:0 6px"><span>ene</span><span>hoy</span><span>dic</span></div>`;
  }
  function medidor(c, ev, S, E) {
    if (ev && (c.siaf.tipo === 'producto' || c.siaf.tipo === 'pp') && ev.metas.length) { const t = ev.t, next = ev.reglas.find(r => !r.cumple), pct = t.pim ? 100 * t[next ? next.campo : 'dev'] / t.pim : 0; return { pct, meta: next ? next.min : null, label: pct.toFixed(0) + '%', sub: next ? 'META ' + next.min + '%' : 'DEVENGADO' }; }
    if (ev && c.siaf.tipo === 'ingreso') { const base = S['base' + c.n] || 0, n = Object.keys(ev.mensual).length || 1, proy = ev.total / n * 12; const pct = base ? 100 * proy / base : (ev.pim ? 100 * ev.total / ev.pim : 0); return { pct: Math.min(100, pct), meta: base ? 100 : Math.round(100 * n / 12), label: (base ? (100 * (proy - base) / base >= 0 ? '+' : '') + (100 * (proy - base) / base).toFixed(0) : pct.toFixed(0)) + '%', sub: base ? 'VS 2025' : 'DEL PIM' }; }
    const done = c.hitos.filter((h, i) => S['hito' + c.n + '_' + i]).length; return { pct: 100 * done / c.hitos.length, meta: null, label: done + '/' + c.hitos.length, sub: 'HITOS' };
  }
  function resumenCard(c, S, E, META, corte, abierto) {
    const aplica = aplicaA(c, S, MCUR);
    if (!aplica) return `<div class="card" data-abrir="${c.n}" style="flex:0 0 auto;cursor:pointer;opacity:.55;padding:12px 14px;border-left:4px solid var(--line)"><b style="color:var(--ink2)">${c.n}. ${c.corto}</b> <span class="mutx" style="font-size:11px">· no aplica a esta municipalidad · clic para activar</span>${abierto ? tarjeta(c, S, E, META, corte, true) : ''}</div>`;
    const estado = S['estado' + c.n] || 'pend', ev = evaluarSIAF(c, E, META), d = diagnostico(c, ev, S, E), col = estado === 'ok' ? 'ok' : estado === 'no' ? 'bad' : d.color, m = medidor(c, ev, S, E);
    const bg = { ok: 'linear-gradient(135deg,#F1F8F2,#fff 55%)', warn: 'linear-gradient(135deg,#FFF6E8,#fff 55%)', bad: 'linear-gradient(135deg,#FDEDEC,#fff 55%)', p: 'linear-gradient(135deg,#EAF3FC,#fff 55%)' }[col];
    return `<div class="card" style="flex:0 0 auto;border-left:5px solid ${COL[col]};background:${bg};${abierto ? 'grid-column:1 / -1' : ''}">
      <div data-abrir="${c.n}" style="cursor:pointer;padding:12px 14px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">${dona(m.pct, COL[col], m.meta, m.label, m.sub)}<span style="font-size:22px;font-weight:900;color:${COL[col]};line-height:1">${c.n}</span></div>
        <div style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:14px;color:var(--p2)">${c.corto}</b><span class="tag ${col}">${estado === 'ok' ? 'Cumplido' : estado === 'no' ? 'No cumplido' : d.titulo}</span><span class="mutx" style="font-size:10.5px;margin-left:auto">${c.ente}</span></div>
          <div style="font-size:11.5px;color:var(--ink);margin-top:6px;line-height:1.45">${d.frases.slice(0, abierto ? 9 : 2).map(f => `<div>${f}</div>`).join('')}${d.accion ? `<div style="color:var(--p2);font-weight:600;margin-top:3px">${d.accion}</div>` : ''}</div>
          <div style="margin-top:8px">${linea(c.hitos, S, c.n, corte, ev?.reglas?.filter(r => r.cumple))}</div>
          <div class="mutx" style="font-size:10.5px;margin-top:2px">${abierto ? '▲ clic para contraer' : '▼ clic para ver indicadores, plazos, verificación y detalle SIAF'}</div></div></div>
      ${abierto ? `<div style="padding:0 14px 12px;border-top:1px solid var(--grid)">${tarjeta(c, S, E, META, corte, true)}</div>` : ''}</div>`;
  }
  let abiertoN = null, ultimo = null;
  function render(el, E, META, ue, onExp) {
    ultimo = [el, E, META, ue, onExp];
    const S = st.get(ue), corte = E.corte; MCUR = metasDe(ue); if (!METAS) cargarMetas(() => render(el, E, META, ue, onExp)); const aplicables = PI.compromisos.filter(c => aplicaA(c, S, MCUR));
    const resumen = PI.compromisos.map(c => { const e = S['estado' + c.n] || 'pend'; return { c, e, aplica: aplicaA(c, S, MCUR) }; });
    const cnt = k => resumen.filter(r => r.aplica && r.e === k).length;
    el.innerHTML = `<div style="padding:8px">
     <div class="pd-lbl">Programa de Incentivos a la Mejora de la Gestión Municipal ${PI.anio}<small>${PI.norma}</small></div>
     ${(() => { const ux = (typeof UES !== 'undefined' ? UES : []).find(u => u.cod === ue); const tp = ux && ux.pi; if (!tp) return ''; const D = typeof PI_TIPOS !== 'undefined' ? PI_TIPOS : {}; const m = MCUR; const nA = m ? PI.compromisos.filter(c => m['c' + c.n]).length : null; return `<div class="pd-txt p" style="margin-bottom:10px"><b>Clasificación municipal PI: tipo ${tp}</b> · ${D[tp] || ''}.${nA != null ? ` Según el Anexo C de metas del MEF, a esta municipalidad le aplican <b>${nA} de 7 compromisos</b>; abajo cada tarjeta muestra su umbral mínimo y su meta máxima. Puedes corregir la casilla "Aplica" si el MEF la incluyó o excluyó después.` : ' Cargando metas por municipalidad…'}</div>`; })()}
     ${(() => { const dg = aplicables.map(c => { const e = S['estado' + c.n] || 'pend'; const d = diagnostico(c, evaluarSIAF(c, E, META), S, E); return e === 'ok' ? 'ok' : e === 'no' ? 'bad' : d.color; }); const k = x => dg.filter(v => v === x).length; return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">${[['ok', 'En verde', 'cumplido o en camino'], ['warn', 'En ámbar', 'requieren atención'], ['bad', 'En rojo', 'plazo vencido o sin presupuesto'], ['p', 'Sin medición SIAF', 'seguimiento por hitos']].map(([c, t, s]) => `<div class="al ${c}" style="padding:8px 12px;cursor:default;display:flex;gap:10px;align-items:center"><div class="n" style="font-size:26px">${k(c)}</div><div class="t"><b>${t}</b><br>${s}</div></div>`).join('')}</div>`; })()}
     <p class="mutx" style="font-size:11.5px;margin:0 0 10px">Cada tarjeta resume automáticamente cómo va el compromiso con los datos del SIAF al ${corte}: qué falta, cuánto y dónde. Los compromisos 2 y 4 los mide el propio SIAF; los demás se siguen por sus hitos y por el gasto asociado. Clic en una tarjeta para abrir indicadores, plazos, verificación y el detalle.</p>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${PI.compromisos.map(c => resumenCard(c, S, E, META, corte, abiertoN === c.n)).join('')}</div>
     <div class="pd-lbl" style="margin-top:14px">Calendario del MEF</div><table class="pd-tbl">${PI.calendario.map(([f, t]) => `<tr><td>${f}</td><td style="text-align:left">${t}</td></tr>`).join('')}</table>
     <p class="mutx" style="font-size:10.5px;margin-top:10px">Fuente: DS 003-2026-EF, RD 0003-2026-EF/50.01 y guías de cumplimiento del MEF (Programa de Incentivos 2026). Las fechas y porcentajes provienen de las fichas técnicas; verificar siempre la versión vigente en gob.pe/mef.</p></div>`;
    el.querySelectorAll('[data-abrir]').forEach(x => x.onclick = () => { abiertoN = abiertoN === +x.dataset.abrir ? null : +x.dataset.abrir; render(el, E, META, ue, onExp); });
    el.querySelectorAll('[data-aplica]').forEach(x => x.onchange = () => { S['aplica' + x.dataset.aplica] = x.checked; st.set(ue, S); render(el, E, META, ue, onExp); });
    el.querySelectorAll('[data-estado]').forEach(x => x.onchange = () => { S['estado' + x.dataset.estado] = x.value; st.set(ue, S); render(el, E, META, ue, onExp); });
    el.querySelectorAll('[data-hito]').forEach(x => x.onchange = () => { S['hito' + x.dataset.hito] = x.checked; st.set(ue, S); render(el, E, META, ue, onExp); });
    el.querySelectorAll('[data-nota]').forEach(x => x.onblur = () => { S['nota' + x.dataset.nota] = x.value; st.set(ue, S); });
    el.querySelectorAll('[data-base]').forEach(x => x.onchange = () => { S['base' + x.dataset.base] = +x.value || 0; st.set(ue, S); render(el, E, META, ue, onExp); });
    el.querySelectorAll('[data-exp]').forEach(x => x.onclick = () => onExp(x.dataset.exp));
  }

  function tarjeta(c, S, E, META, corte, emb) {
    const aplica = aplicaA(c, S, MCUR), estado = S['estado' + c.n] || 'pend', col = ESTADOS.find(e => e[0] === estado)[2];
    const ev = aplica ? evaluarSIAF(c, E, META) : null; let siaf = '';
    if (ev && (c.siaf.tipo === 'producto' || c.siaf.tipo === 'pp')) {
      const t = ev.t, av = t.pim ? 100 * t.dev / t.pim : 0, avc = t.pim ? 100 * t.cert / t.pim : 0;
      siaf = `<div class="pd-row" style="margin:6px 0"><b>Lo que dice el SIAF</b><span style="font-weight:500">${c.siaf.nota}</span></div>
        ${ev.metas.length ? `<table class="pd-tbl"><tr><th>Meta SIAF</th><th>PIM</th><th>Certificado</th><th>Devengado</th><th>Avance</th></tr>${ev.metas.map(m => `<tr><td style="white-space:normal"><b>${m.act_proy}</b> ${(m.nombre_ap || m.nombre || '').slice(0, 60)} <small class="mutx">meta ${m.meta}${m.finalidad_n ? ' · ' + m.finalidad_n : ''}</small></td><td>${F(m.pim)}</td><td>${F(m.cert)}</td><td>${F(m.dev)}</td><td>${P(m.pim ? 100 * m.dev / m.pim : 0)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${F(t.pim)}</b></td><td><b>${F(t.cert)}</b> <small class="mutx">${avc.toFixed(0)} %</small></td><td><b>${F(t.dev)}</b></td><td>${P(av)}</td></tr></table>` : `<p class="mutx" style="font-size:11px">La entidad no tiene metas presupuestales en ${c.siaf.tipo === 'producto' ? 'el producto ' : 'el programa presupuestal '}${c.siaf.codigos.join(', ')} este año: si el compromiso aplica, falta presupuesto para cumplirlo.</p>`}
        ${ev.reglas.length ? `<table class="pd-tbl" style="margin-top:6px"><tr><th>Hito presupuestal (ficha técnica)</th><th>Exigido</th><th>Logrado al ${corte}</th><th>Estado</th></tr>${ev.reglas.map(r => `<tr><td style="text-align:left">${r.fecha} · ${r.campo === 'cert' ? 'Certificado' : 'Devengado'} del PIM del producto</td><td>≥ ${r.min} %</td><td><b>${r.pct.toFixed(1)} %</b></td><td>${r.cumple ? '<span class="tag ok">Cumplido</span>' : r.vencido ? '<span class="tag bad">Vencido sin cumplir</span>' : `<span class="tag warn">Faltan ${(r.min - r.pct).toFixed(1)} puntos</span>`}</td></tr>`).join('')}</table>` : ''}`;
    } else if (ev && c.siaf.tipo === 'ingreso') {
      const base = S['base' + c.n] || 0, meses = Object.keys(ev.mensual).sort(), acum = meses.reduce((a, m) => a + ev.mensual[m], 0), inc = base ? 100 * (ev.total - base) / base : null;
      siaf = `<div class="pd-row" style="margin:6px 0"><b>Lo que dice el SIAF</b><span style="font-weight:500">${c.siaf.nota}</span></div>
        <table class="pd-tbl"><tr><th>Rubro</th><th>Presupuesto (PIM)</th><th>Recaudado ${PI.anio}</th><th>Avance</th></tr>${ev.clasificadores.map(x => `<tr><td style="text-align:left">${x.cod} ${x.nombre}</td><td>${F(x.pim)}</td><td>${F(x.recaudado)}</td><td>${x.pim ? P(100 * x.recaudado / x.pim) : '—'}</td></tr>`).join('')}<tr><td><b>Total predial</b></td><td><b>${F(ev.pim)}</b></td><td><b>${F(ev.total)}</b></td><td>${ev.pim ? P(100 * ev.total / ev.pim) : '—'}</td></tr></table>
        <table class="pd-tbl" style="margin-top:6px"><tr>${meses.map(m => `<th>${MES[+m - 1]}</th>`).join('')}<th>Acumulado</th></tr><tr>${meses.map(m => `<td>${F(ev.mensual[m])}</td>`).join('')}<td><b>${F(acum)}</b></td></tr></table>
        <div class="pd-row" style="margin-top:8px;align-items:center"><b>Indicador 2.2</b><span style="font-weight:500">Recaudación total del predial en 2025: <input type="number" data-base="${c.n}" value="${base || ''}" placeholder="S/ del año anterior" style="width:150px;padding:3px 6px;border:1.5px solid var(--line);border-radius:6px;font:inherit"> ${inc != null ? `→ variación ${PI.anio} vs 2025 a la fecha: <b style="color:var(--${inc >= 0 ? 'ok' : 'bad'})">${inc >= 0 ? '+' : ''}${inc.toFixed(1)} %</b> (falta lo que se recaude de ${MES[meses.length] || 'los meses siguientes'} a diciembre)` : '<small class="mutx">ingresa el monto 2025 para calcular el aumento</small>'}</span></div>`;
    } else if (ev && ev.exps) {
      siaf = `<div class="pd-row" style="margin:6px 0"><b>Lo que dice el SIAF</b><span style="font-weight:500">${c.siaf.nota}</span></div>${ev.exps.length ? `<table class="pd-tbl"><tr><th>Expediente</th><th>Glosa</th><th>Devengado</th></tr>${ev.exps.map(e => `<tr><td><a class="fc" data-exp="${e.exp}" style="cursor:pointer">${+e.exp}</a></td><td style="text-align:left;white-space:normal">${(e.glosa || '').slice(0, 120)}</td><td>${F(e.tot.D)}</td></tr>`).join('')}</table>` : '<p class="mutx" style="font-size:11px">Sin expedientes con esa glosa.</p>'}`;
    } else if (aplica && c.siaf) siaf = `<div class="pd-row" style="margin:6px 0"><b>Lo que dice el SIAF</b><span style="font-weight:500">${c.siaf.nota}</span></div>`;
    return `<div style="padding:10px 0 0">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b style="font-size:13px">${c.nombre}</b><br><small class="mutx">${c.ente} · aplica a ${c.aplica}</small></div>
       <label style="font-size:11.5px;display:flex;gap:4px;align-items:center"><input type="checkbox" data-aplica="${c.n}" ${aplica ? 'checked' : ''}> Aplica a mi municipalidad</label>
       <select data-estado="${c.n}" ${aplica ? '' : 'disabled'} style="font-size:12px">${ESTADOS.map(([k, t]) => `<option value="${k}" ${k === estado ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      ${aplica ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px"><div>
        <div class="pd-lbl">Indicadores</div>${c.indicadores.map(([k, t]) => { const v = MCUR && MCUR['c' + c.n] && MCUR['c' + c.n][k]; return `<div class="pd-row"><b>${k}</b><span style="font-weight:500">${t}${MCUR && MCUR['c' + c.n] ? (v ? ` <span class="pd-badge ok" title="Anexo C · metas por municipalidad (MEF)">umbral mínimo ${v[0]}${c.n === 6 ? '' : ' %'} · meta máxima ${v[1]}${c.n === 6 ? '' : ' %'}</span>` : ' <span class="pd-badge">no aplica a esta municipalidad</span>') : ''}</span></div>`; }).join('')}
        <div class="pd-lbl" style="margin-top:8px">Hitos y plazos</div>${c.hitos.map(([f, t], i) => { const auto = ev?.reglas?.find(r => r.fecha === f && t.includes(r.campo === 'cert' ? 'Certificado' : 'Devengado') && r.cumple); const done = auto || S['hito' + c.n + '_' + i]; const venc = f < hoy() && !done; return `<div class="pd-row" style="align-items:center"><b style="min-width:86px;color:${venc ? 'var(--bad)' : done ? 'var(--ok)' : 'var(--ink2)'}">${f}</b><span style="font-weight:500;display:flex;gap:6px;align-items:center"><input type="checkbox" data-hito="${c.n}_${i}" ${done ? 'checked' : ''} ${auto ? 'disabled title="verificado automáticamente en el SIAF"' : ''}> ${t}${auto ? ' <span class="tag ok">SIAF ✓</span>' : venc ? ' <span class="tag bad">vencido</span>' : ''}</span></div>`; }).join('')}
        <div class="pd-lbl" style="margin-top:8px">Medios de verificación</div><div style="font-size:11px;color:var(--ink2)">${c.verif}</div>
        <div class="pd-lbl" style="margin-top:8px">Notas de seguimiento</div><textarea data-nota="${c.n}" rows="2" style="width:100%;font:inherit;font-size:11.5px;border:1.5px solid var(--line);border-radius:6px;padding:5px" placeholder="Responsable, avances, pendientes…">${S['nota' + c.n] || ''}</textarea></div>
        <div>${siaf}</div></div>` : ''}</div>`;
  }
  // ponytail: 'atras' solo contrae la tarjeta abierta; devuelve true si hizo algo
  // resumen para la vista alcalde: un semáforo por compromiso aplicable
  function resumen(E, META, ue) { const S = st.get(ue); MCUR = metasDe(ue); if (!METAS) cargarMetas(); return PI.compromisos.filter(c => aplicaA(c, S, MCUR)).map(c => { const e = S['estado' + c.n] || 'pend', ev = evaluarSIAF(c, E, META), d = diagnostico(c, ev, S, E); return { n: c.n, corto: c.corto, col: e === 'ok' ? 'ok' : e === 'no' ? 'bad' : d.color, titulo: e === 'ok' ? 'Cumplido' : e === 'no' ? 'No cumplido' : d.titulo, accion: d.accion || d.frases[0] || '' }; }); }
  window.Incentivos = { render, resumen, PI, atras: () => { if (abiertoN === null || !ultimo) return false; abiertoN = null; render(...ultimo); return true; } };
})();

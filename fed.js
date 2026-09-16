/* fed.js — Fondo de Estímulo al Desempeño y Logro de Resultados Sociales (FED), edición 2025-2026.
   Norma: DS 012-2025-MIDIS (31/12/2025) aprueba el Instrumento (11 artículos, Anexo I definiciones, Anexo II metas por gobierno regional);
   Reglamento del FED: DS 003-2024-MIDIS; creación: 84.ª DCF Ley 30114; violencia contra la mujer: 69.ª DCF Ley 30372 y art. 18 Ley 30879.
   Es el equivalente regional del Programa de Incentivos municipal. Metas por región en data/fed_metas.json (Anexo II, OCR verificado).
   Depende de helpers globales ($, N). Estado manual por indicador en el navegador (localStorage). */
(function () {
  const FED = {
    norma: 'DS 012-2025-MIDIS (31/12/2025) · Reglamento DS 003-2024-MIDIS · Ley 30114, 84.ª DCF',
    periodo: [['1', '1.ª verificación', '2025-12-01', '2026-05-31'], ['2', '2.ª verificación', '2026-06-01', '2026-12-31']],
    reglas: ['Cada indicador tiene basal y meta por verificación (art. 7 y Anexo II); las fichas técnicas las aprueba el Comité Directivo del FED.',
      'La entidad rectora entrega la base de datos 25 días hábiles después del corte; MIDIS verifica en 40 días hábiles; el Comité aprueba en 5 (art. 8).',
      'Cumplimiento parcial = transferencia proporcional al avance (art. 8.10). El monto máximo por región se fija por DS del MEF-MIDIS (art. 9).',
      'Dos transferencias: tras la 1.ª verificación (con cargo a la Ley 32513) y tras la 2.ª (art. 10); el titular del pliego incorpora y programa los recursos (art. 11).'],
    cat: { SI: ['Salud · Desarrollo Infantil Temprano', 'MINSA'], MC0: ['Salud · cobertura', 'MINSA'], VI: ['Reducción de violencia contra la mujer', 'MINSA · MIMP'], AI: ['Agua', 'MVCS · MINSA-DIGESA · SUNASS'], MC8: ['Agua · cobertura', 'MVCS'], EI: ['Educación', 'MINEDU'], MCE: ['Educación · cobertura', 'MINEDU'], ART: ['Articulación territorial', 'MIDIS'] },
    ind: [
      ['SI-01.01', 'SI', 'cg', 'Gestantes con 1.ª atención prenatal en el 1.er trimestre (condición previa)'],
      ['SI-01.02', 'SI', 'cg', 'Gestantes con anemia que reciben tratamiento con hierro y dosaje de hemoglobina'],
      ['SI-01.03', 'SI', 'cg', 'Mujeres con parto institucional sin anemia que recibieron suplementación preventiva y dosaje'],
      ['SI-02.01', 'SI', 'cg', 'Niños de 6 meses que a los 4 meses recibieron hierro preventivo y dosaje (condición previa)'],
      ['SI-02.02', 'SI', 'cg', 'Niños de 6 meses prematuros o con bajo peso, sin anemia, con hierro preventivo y dosaje'],
      ['SI-02.03', 'SI', 'cg', 'Niños de 12 meses con anemia que reciben tratamiento con hierro y dosaje'],
      ['SI-02.04', 'SI', 'cg', 'Niños de 12 meses sin anemia que reciben hierro preventivo y dosaje'],
      ['SI-03.01', 'SI', 'cg', 'Adolescentes mujeres 12–17 años atendidas con dosaje de hemoglobina (condición previa)'],
      ['SI-03.02', 'SI', 'cg', 'Adolescentes mujeres 12–17 años sin anemia que reciben prestaciones priorizadas'],
      ['MC-01.01', 'MC0', 'mc', 'Mujeres con parto institucional (quintiles 1-2 de pobreza) que recibieron el paquete integrado de servicios'],
      ['MC-02.01', 'MC0', 'mc', 'Niños menores de 12 meses (quintiles 1-2) que recibieron el paquete integrado de servicios'],
      ['MC-03.01', 'MC0', 'mc', 'Recién nacidos con vacunas BCG y HvB, controles CRED y tamizaje neonatal'],
      ['VI-01.01', 'VI', 'cg', 'Gestantes con tamizaje positivo de violencia contra la mujer (condición previa)'],
      ['VI-01.02', 'VI', 'cg', 'Gestantes con tamizaje positivo que reciben el paquete mínimo de intervenciones terapéuticas'],
      ['AI-01.01a', 'AI', 'cg', 'Centros poblados rurales con cloro residual ≥ 0.5 mg/L y turbiedad ≤ 5 UNT (paso 1)', 'n'],
      ['AI-01.01b', 'AI', 'cg', 'Centros poblados rurales con información de disposición sanitaria de excretas (paso 2)', 'n'],
      ['AI-02.01', 'AI', 'cg', 'Centros poblados con vigilancia de calidad del agua y seguimiento a metas y ejecución presupuestal', 'n', 'SIAF: actividad 5004428 (PPoR 1001, RO, genérica 2.3) con compromiso ≥ 50 % del PIA 2026 al 31-oct-2026; meta física y financiera programada en CEPLAN al 28-feb-2026.'],
      ['AI-03.01', 'AI', 'cg', 'Centros poblados que implementan medidas correctivas ante riesgos sanitarios en el agua', 'n'],
      ['AI-04.01', 'AI', 'cg', 'Centros poblados con hogares rurales que reciben educación sanitaria (PP 0083)', 'n'],
      ['AI-05.01', 'AI', 'cg', 'Instituciones educativas con mantenimiento de infraestructura sanitaria y control de calidad del agua', 'n'],
      ['MC-08.01', 'MC8', 'mc', 'Niños menores de 60 meses que NO acceden a agua clorada (menor es mejor)', '%', null, true],
      ['EI-01.01', 'EI', 'cg', 'IE de secundaria rural (MSE) que reciben a tiempo los kits de bienestar registrados en SIGA'],
      ['EI-02.01', 'EI', 'cg', 'Plazas CAS de Educación Básica Especial cubiertas oportunamente', '%', 'SIAF: contratos CAS del PP 0106 (EBE) en DRE/GRE y UGEL — el gasto en 2.3.2.8 CAS muestra si las plazas se cubrieron.'],
      ['EI-03.01', 'EI', 'cg', 'Locales educativos de Mi Mantenimiento que ejecutaron mantenimiento de instalaciones sanitarias 2026', '%', 'SIAF: transferencias del programa de mantenimiento 2026 (PRONIED) ejecutadas por las UGEL.'],
      ['MC-04.01', 'MCE', 'mc', 'Niños de 3 años matriculados y registrados en SIAGIE, año escolar 2026'],
      ['MC-05.01', 'MCE', 'mc', 'Servicios educativos EIB y rurales que reciben todo el material educativo, pertinente y suficiente'],
      ['MC-06.01', 'MCE', 'mc', 'Docentes EIB que culminan los cursos de lectura y escritura en lengua originaria (SIFODS)'],
      ['MC-07.01', 'MCE', 'mc', 'Docentes y agentes educativos de EBE que aprueban cursos de educación inclusiva'],
      ['ART-01.01', 'ART', 'cg', 'Gobiernos locales firmantes del pacto regional que mejoran indicadores priorizados con asistencia técnica del GORE', 'n']
    ]
  };
  const ESTADOS = [['pend', 'Sin registrar', '#B0BEC5'], ['proc', 'En proceso', '#E39B1E'], ['ok', 'Cumplido', '#1B9E5A'], ['no', 'En riesgo', '#D64545']];
  let METAS = null;
  const st = { get(r) { try { return JSON.parse(localStorage.getItem('fed_' + r) || '{}'); } catch (e) { return {}; } }, set(r, v) { try { localStorage.setItem('fed_' + r, JSON.stringify(v)); } catch (e) { } } };
  const region = u => u.nivel !== 'R' ? null : u.dpto === 'LIMA' ? 'LIMA PROVINCIAS' : /CALLAO/.test(u.dpto || '') ? 'CALLAO' : u.dpto;
  const fmt = (v, unidad) => v == null || v === 'NA' ? '—' : unidad === 'n' ? String(v) : v + ' %';
  const hoy = () => new Date().toISOString().slice(0, 10);

  function resumen(u) {
    const r = region(u); if (!r || !METAS || !METAS[r]) return null;
    const S = st.get(r), M = METAS[r];
    const items = FED.ind.filter(i => M[i[0]]).map(([code, cat, tipo, nombre, unidad, siaf, menor]) => ({ code, cat, tipo, nombre, unidad: unidad || '%', siaf, menor: !!menor, m: M[code], e: S[code] || 'pend' }));
    return { region: r, items, S };
  }
  function ui(el, u) {
    const r = region(u); if (!r) return;
    if (!METAS) { fetch('data/fed_metas.json').then(x => x.json()).then(j => { METAS = j; ui(el, u); }).catch(() => { }); return; }
    const R = resumen(u); if (!R) return;
    const h = hoy(), fase = FED.periodo.find(p => h >= p[2] && h <= p[3]) || FED.periodo[1];
    const cnt = k => R.items.filter(i => i.e === k).length;
    const cats = [...new Set(R.items.map(i => i.cat))];
    const fila = i => { const meta = i.m.u != null ? [['única', i.m.u]] : [['1.ª', i.m['1']], ['2.ª', i.m['2']]]; const col = ESTADOS.find(e => e[0] === i.e)[2];
      return `<div class="fed-i" style="border-left-color:${col}"><div class="fed-c">${i.code}<small>${i.tipo === 'cg' ? 'compromiso de gestión' : 'meta de cobertura'}</small></div><div class="fed-n">${i.nombre}${i.siaf ? `<div class="fed-siaf">${i.siaf}</div>` : ''}</div>
        <div class="fed-m"><span>basal <b>${fmt(i.m.b, i.unidad)}</b></span>${meta.map(([k, v]) => `<span class="${k === fase[0] + '.ª' || k === 'única' ? 'on' : ''}">${k} <b>${fmt(v, i.unidad)}</b></span>`).join('')}</div>
        <select class="fed-e" data-c="${i.code}" style="color:${col}">${ESTADOS.map(e => `<option value="${e[0]}" ${i.e === e[0] ? 'selected' : ''}>${e[1]}</option>`).join('')}</select></div>`; };
    const ex = el.querySelector('.fed'); if (ex) ex.remove();
    el.insertAdjacentHTML('afterbegin', `<div class="fed"><div class="fed-h"><div><b>FED 2025-2026 · FONDO DE ESTÍMULO AL DESEMPEÑO</b><small>${FED.norma} · el incentivo de los gobiernos regionales</small></div>
      <div class="fed-k"><b>${R.items.length}</b> indicadores le aplican · <b style="color:#1B9E5A">${cnt('ok')}</b> cumplidos · <b style="color:#E39B1E">${cnt('proc')}</b> en proceso · <b style="color:#D64545">${cnt('no')}</b> en riesgo · ${cnt('pend')} sin registrar</div></div>
      <div class="fed-fase">${FED.periodo.map(p => `<span class="${p === fase ? 'on' : ''}">${p[1]} · ${p[2].slice(0, 7)} → ${p[3].slice(0, 7)}</span>`).join('')}<span class="mutx">El pago llega por DS tras cada verificación; cumplimiento parcial paga en proporción (art. 8.10 y 10).</span></div>
      ${cats.map(c => `<div class="fed-cat"><span>${FED.cat[c][0]}</span><small>${FED.cat[c][1]}</small></div>${R.items.filter(i => i.cat === c).map(fila).join('')}`).join('')}
      <details class="fed-reglas"><summary>Cómo se verifica y se paga (DS 012-2025-MIDIS)</summary><ul>${FED.reglas.map(x => `<li>${x}</li>`).join('')}</ul><p class="mutx">El estado por indicador lo registra la entidad aquí (se guarda solo en este navegador); las metas son las del Anexo II. Las fichas técnicas están en www.gob.pe/midis.</p></details></div>`);
    el.querySelectorAll('.fed-e').forEach(s => s.onchange = () => { const S = st.get(R.region); S[s.dataset.c] = s.value; st.set(R.region, S); ui(el, u); });
  }
  window.FED = { ui, region, resumen, FED };
})();

# design.md — Panel Nacional de Inversiones (ARKA PROYECTOS)

Brief de diseño vivo del frontend (`Web/index.html`). Documenta lo que YA existe en el código de hoy —no es aspiracional— más los criterios que David ha dado en distintos momentos del proyecto. Sirve para que cualquiera (yo, otro modelo, otra persona) mantenga el mismo lenguaje visual en vez de reinventarlo cada vez.

## Principios (criterio dado por David, textual)

- **Gerencial, no técnico.** La información debe leerse como la vería un directivo, no un analista: lo importante primero, el detalle detrás de un clic.
- **Elegante, que se note caro.** Nada de aspecto "panel de administrador genérico". Paneles limpios, pictogramas, espacio en blanco cuidado.
- **Sin scroll.** Cada vista debe caber en pantalla (1366×768 en adelante) sin barra de desplazamiento vertical. Lo que no cabe, va detrás de un clic o a una pestaña.
- **Denso pero ordenado.** Mucha información pública, organizada en grid de paneles (`.mbox`) — no en bloques gigantes de un solo color. El color se usa para separar significado (estado, alerta), no para decorar.
- **Nada de vínculos externos.** El panel muestra la información que ya extrajo, no redirige a Invierte.pe/SSI/Consulta Amigable. Si el dato no está disponible a escala nacional, se dice explícitamente ("No disponible a nivel nacional") — nunca se deja en blanco sin explicación ni se inventa.
- **Honestidad de dato.** Si algo no se ha capturado todavía, mostrar "—", no un cero ni un valor falso.

## Paleta de color (tokens reales de `:root`)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#EEF1F5` | fondo general |
| `--sup` | `#fff` | superficie de tarjetas/paneles |
| `--sup2` | `#F5F7FA` | superficie secundaria (inputs, hover) |
| `--ink` | `#1C1917` | texto principal |
| `--ink2` | `#44546A` | texto secundario |
| `--mut` | `#5D677A` | texto mudo / metadatos |
| `--grid` / `--line` | `#E6EAF0` / `#D5DBE3` | bordes y separadores |
| `--p` / `--p2` | `#1E5AA8` / `#0F2A43` | azul institucional (acento primario / oscuro para cabeceras) |
| `--gold` | `#F9A825` | acento (destacados, favoritos) |
| `--teal` | `#00897B` | acento secundario |
| `--ok` / `--okbg` | `#1B9E5A` / `#E4F5EC` | estado positivo |
| `--warn` / `--warnbg` | `#936413` / `#FDF1DC` | estado de alerta media (oscurecido 18 set 2026 — ver #5) |
| `--bad` / `--badbg` | `#D64545` / `#FBE5E5` | estado crítico |
| `--q1`…`--q6` | de `#DCE7F5` a `#1E5AA8` | escala secuencial azul para mapas/coropletas |

Regla ya corregida por David: el bloque azul de cabecera NO debe dominar la vista — es una franja de contexto (título, badges), el contenido va en fondo claro debajo.

## Tipografía

- Fuente: **Inter** (texto general, UI) + **Manrope** (pesos 500–800, para títulos/cifras destacadas) vía Google Fonts.
- Cuerpo base: 13px / line-height 1.45.
- Jerarquía por peso más que por tamaño: 600–800 para etiquetas y cifras, 400–500 para texto de apoyo. Mayúsculas pequeñas (`text-transform:uppercase`, ~10–11px, letter-spacing) para encabezados de sección dentro de un panel (`.mbox h4`).

## Espaciado y forma

- Radio de esquina estándar: `--rad: 12px` (tarjetas grandes); paneles internos (`.mbox`) usan 10px.
- Sombra estándar: `--sh: 0 2px 12px rgba(15,42,67,.08)` — sutil, nunca sombras duras.
- Alturas fijas de cabecera: `--hh: 52px` (nav), `--bh: 42px` (barra de filtros).
- Gap entre paneles: 10px. Los `.mrow` son flex-wrap; `.mbox` tiene `min-width` distinto según fila (170px fila 1, 230px fila 2) para que el grid respire sin generar huecos raros.

## Catálogo de componentes ya existentes (reusar, no reinventar)

- `.mbox` / `.mrow` — panel de la grilla densa (usado en la ficha de inversión, 8 cajas en 2 filas).
- `.mchip` / `.mchip.ok` — etiqueta de estado corta (rojo por defecto = falta/no cumple, verde = sí/cumple). Mismo patrón para "Sin PIM" / "PIM: S/ X" y ahora para el chip de PMI.
- `donut(valor, color, etiqueta)` — anillo de avance (usado para Av. físico / Av. financiero).
- `.pd-hdr` / `.pd-badge` — cabecera de ficha con CUI, título y badges de estado/modalidad.
- `.pd-tbl` — tabla compacta de componentes y acciones.
- `.mph` — placeholder rayado para "no disponible a nivel nacional" (patrón `repeating-linear-gradient`).

## Contenido y tono editorial

- Español, formato numérico `es-PE` (`Number.toLocaleString('es-PE')`), moneda como "S/ 1,234,567" sin decimales en vistas resumen.
- Nombres de proyecto tal como vienen del Banco de Inversiones (MAYÚSCULAS) — no se reformatean, para que coincidan con lo que el usuario buscaría.
- Etiquetas de campo tal como las usa el propio MEF (Perfil viable, Costo de control concurrente, Controversias, Carta fianza) — mantener la terminología oficial, no inventar sinónimos, porque el usuario del panel ya conoce esos términos.
- Cuando un dato no aplica o no se captura, el texto explica por qué en una línea corta ("No disponible a nivel nacional", "Requiere revisión manual"), nunca deja el espacio mudo.

## Oportunidades — estado al 18 set 2026

1. **✅ Jerarquía visual entre paneles.** Resuelto: `.mbox.acc` (borde de acento) en Presupuesto y PMI; `.mbox.low` para paneles secundarios/placeholder.
2. **✅ Reintroducir lo que se perdió en el rediseño de 8 cajas.** Se quitaron "Puesta en marcha" y "Fotografía de obra" (sin dato a nivel nacional) y en su lugar va el resumen de Contratación (`contratacionMini`, con datos SEACE ya en scope). El detalle completo — situación actual, contratación extendida e histórico **mensual** — vive detrás de un clic en el botón "Situación, contratación e histórico mensual" del header (abre `fichaCUI`/`fichaHTML`, patrón modal ya existente): no había que construirlo, solo estaba sub-enlazado.
3. **✅ Iconografía consistente.** Opción C elegida (trazo gris `--ink2`, sin fondo): objeto `ICO` con 9 SVG de una sola línea, incl. `contrato`.
4. **✅ Estados vacíos.** Clase `.vacio` (guion + itálica en `--mut`) unificada para "dato no disponible"; los vacíos positivos/neutrales ("Sin alertas", "Sin resultados") se dejaron aparte a propósito, son un caso semántico distinto.
5. **✅ Accesibilidad de color — verificado con ratios WCAG reales (18 set 2026).** `--mut` y `.mchip` estaban bien (el valor `#8A94A6` de esta tabla era una versión vieja del token; el real ya era `#5D677A`, 5.0:1 sobre `--bg`). Sí había un fallo real: `--warn` (`#E39B1E`) usado como texto directo (`.pct.warn`, `.al.warn .n`, valores del panel `pnl()`, y el nuevo % de "Plazo consumido") daba 2.1–2.3:1 sobre fondo claro — muy por debajo de AA. Se oscureció el token a `#936413` (4.5–5.2:1 en `--bg`/`--sup`/`--warnbg`); no afecta los tonos ya-oscurecidos a mano que usan `.tag.warn`/`.pd-txt.warn` (hex fijo, no dependen del token). También se corrigió `--mut` de `body.sala` (modo presentación), que sí estaba al límite (4.2:1 sobre `--bg`) — ahora usa el mismo `#5D677A` que el modo normal.
6. **✅ Landing / vista nacional.** Verificado con datos reales de producción: ya cumple sin scroll / jerarquía clara / honestidad de dato — no requirió cambios.

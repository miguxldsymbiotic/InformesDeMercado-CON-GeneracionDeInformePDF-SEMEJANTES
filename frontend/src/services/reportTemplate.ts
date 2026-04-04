import { ReportData } from './reportService';

const fmtNum = (val: number | null | undefined, decimals = 1): string => {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    if (val >= 1000) return (val / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'k';
    return val.toLocaleString('es-CO', { maximumFractionDigits: decimals });
};

const fmt = (val: number | null | undefined, decimals = 1): string => {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    if (Math.abs(val - Math.round(val)) < 0.0001) return Math.round(val).toLocaleString('es-CO');
    return val.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const fmtPct = (val: number | null | undefined, decimals = 2): string => {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    return val.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
};

const fmtCurrency = (val: string | null | undefined): string => {
    if (!val || val === 'null' || val === 'None') return 'N/D';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return '$' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
};

const clean = (val: string | null | undefined): string => {
    if (!val || val === 'null' || val === 'None' || val === 'nan') return 'N/D';
    return val;
};

/**
 * Premium Line Chart with Y-Axis and Grid (540x200)
 */
const generatePremiumLineChart = (years: string[], values: (number | null)[], label = '', width = 540, height = 200, suffix = ''): string => {
    const cleanValues = values.map(v => (v === null || isNaN(v)) ? 0 : v);
    if (cleanValues.length === 0) return '<div style="padding:15pt; text-align:center;">Dato no disponible.</div>';
    
    // Color logic based on label
    const isMarket = label.toLowerCase().includes('mercado');
    const mainColor = isMarket ? '#6A717B' : '#2E3192';
    const pointColor = isMarket ? '#6A717B' : '#2E3192';

    const margin = 50;
    const chartW = width - (margin * 2);
    const chartH = height - (margin * 2);
    const maxVal = Math.max(...cleanValues, 1) * 1.25;
    
    const getY = (v: number) => height - margin - (v / maxVal) * chartH;
    const getX = (i: number) => margin + (cleanValues.length > 1 ? (i * chartW) / (cleanValues.length - 1) : chartW / 2);

    const points = cleanValues.map((v, i) => ({ x: getX(i), y: getY(v), val: v, year: years[i] }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v => ({ val: v, y: getY(v) }));

    return `
    <div style="text-align:center; margin:15pt 0; page-break-inside:avoid;">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;">
            <!-- GRIDS & Y-AXIS -->
            ${yTicks.map(t => `
                <line x1="${margin}" y1="${t.y}" x2="${width - margin}" y2="${t.y}" stroke="#f0f0f0" stroke-width="1" />
                <text x="${margin - 10}" y="${t.y + 3}" font-size="7pt" fill="#888" text-anchor="end">${fmtNum(t.val)}${suffix}</text>
            `).join('')}
            
            <!-- X-AXIS -->
            <line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" stroke="#ccc" />
            
            <!-- MAIN LINE -->
            <path d="${pathD}" fill="none" stroke="${mainColor}" stroke-width="2.5" stroke-linejoin="round" />
            
            <!-- POINTS -->
            ${points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="4" fill="${pointColor}" stroke="#fff" stroke-width="1.5" />
                <text x="${p.x}" y="${p.y - 12}" font-size="8pt" font-weight="bold" fill="#000" text-anchor="middle">${fmt(p.val, 1)}${suffix}</text>
                <text x="${p.x}" y="${height - margin + 18}" font-size="8pt" fill="#555" text-anchor="middle">${p.year}</text>
            `).join('')}
        </svg>
    </div>`;
};

/**
 * Standardized Program Bar Chart (540x180)
 */
const generateProgramBarChart = (data: Record<string, any>): string => {
    const modules = Object.keys(data).filter(m => m !== 'global');
    if (modules.length === 0) return '';
    const labelMap: any = { lectura_critica: 'L. Crítica', razonamiento_cuantitativo: 'R. Cuantit.', competencias_ciudadanas: 'C. Ciudad.', ingles: 'Inglés', comunicacion_escrita: 'C. Escrita' };
    const width = 540, height = 180, margin = 45;
    const barW = (width - margin * 2) / modules.length;
    const maxVal = Math.max(...modules.map(m => data[m]?.mean || 0), 100) * 1.3;
    return `
    <div style="text-align:center; margin:10pt 0; page-break-inside:avoid;">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <line x1="${margin}" y1="${height-margin}" x2="${width-margin}" y2="${height-margin}" stroke="#ccc" />
            ${modules.map((m, i) => {
                const rawVal = data[m]?.mean || 0;
                const bH = (rawVal / maxVal) * (height - margin * 2);
                const x = margin + (i * barW) + (barW * 0.15);
                const normKey = m.toLowerCase().replace(/_/g, ' ').trim();
                const cleanKey = Object.keys(labelMap).find(k => normKey.includes(k.replace(/_/g, ' '))) || m;
                return `
                    <rect x="${x}" y="${height-margin-bH}" width="${barW * 0.7}" height="${bH}" fill="#2E3192" rx="2" />
                    <text x="${x + (barW * 0.35)}" y="${height-margin-bH-8}" font-size="8pt" font-weight="bold" fill="#000" text-anchor="middle">${fmt(rawVal, 1)}</text>
                    <text x="${x + (barW * 0.35)}" y="${height-margin+18}" font-size="7pt" font-weight="bold" fill="#333" text-anchor="middle">${labelMap[cleanKey] || m.substring(0,8)}</text>
                `;
            }).join('')}
        </svg>
    </div>`;
};

/**
 * Demographic Percentage Bars (Horizontal)
 */
const generateDemographicChart = (data: { category: string, percentage: number }[]): string => {
    if (data.length === 0) return '<div style="padding:10pt; text-align:center;">Dato no disponible.</div>';
    return `
    <div style="margin: 10pt 0;">
        ${data.map(item => `
            <div style="margin-bottom: 8pt;">
                <div style="display:flex; justify-content:space-between; font-size:8.5pt; margin-bottom:3pt;">
                    <span>${item.category}</span>
                    <span style="font-weight:bold;">${fmtPct(item.percentage, 1)}</span>
                </div>
                <div style="background:#eee; height:8pt; border-radius:4pt; overflow:hidden;">
                    <div style="background:#2E3192; width:${item.percentage}%; height:100%;"></div>
                </div>
            </div>
        `).join('')}
    </div>`;
};

export const generateReportHTML = (data: ReportData): string => {
    try {
        const p = data.program;
        const kpi = data.programKPIs.summary;
        const mKpi = data.marketKPIs.summary;
        const fecha = data.generatedAt;

        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page { size: letter; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11.5pt; color: #000; background: #fff; counter-reset: page 0; width: 215.9mm; }
    .formal-cover-page { 
        position: absolute; top: 0; left: 0; 
        height: 279.4mm; width: 215.9mm; 
        background: linear-gradient(135deg, #0a1628 0%, #1a2a44 100%) !important; 
        color: #ffffff !important; padding: 50mm 35mm !important;
        display: flex; flex-direction: column; justify-content: space-between; z-index: 1000;
        overflow: hidden;
    }
    .cover-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.05; pointer-events: none; }
    .cover-main-h1 { font-size: 42pt; font-weight: 800; color: #fff !important; line-height: 1.1; letter-spacing: -1pt; }
    .cover-program-info { font-size: 20pt; border-left: 5pt solid #fff; padding-left: 20pt; margin-top: 35pt; color: #fff !important; line-height: 1.4; }
    .doc-padding-wrap { padding: 30mm 20mm 35mm 35mm; width: 100%; text-align: justify; margin-top: 279.4mm; }
    
    /* FOOTER */
    .page-footer { position: fixed; bottom: 5mm; left: 35mm; right: 20mm; height: 12mm; border-top: 1.5pt solid #000; font-size: 9.5pt; color: #000; background: #fff; z-index: 500; padding-top: 6pt; }
    .footer-flex { display: flex; justify-content: space-between; align-items: center; }
    .page-num::after { content: counter(page); }
    .footer-watermark { position: absolute; right: 0; bottom: -5pt; height: 35pt; opacity: 0.08; pointer-events: none; }
    
    /* SECTION HANDLING */
    h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; border-bottom: 3.5pt solid #000; padding-bottom: 6pt; margin-bottom: 25pt; page-break-before: always; color: #000 !important; counter-increment: page; }
    h3 { font-size: 12.5pt; margin-top: 25pt; margin-bottom: 12pt; font-weight: bold; color: #2E3192 !important; border-left: 3pt solid #2E3192; padding-left: 10pt; }
    
    /* TABLES */
    table.formal-grid { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; margin: 15pt 0; vertical-align: middle; }
    table.formal-grid td { border: 0.75pt solid #000; padding: 7pt 10pt; color: #000 !important; font-size: 10.5pt; }
    .td-label { background: #f2f2f2; font-weight: bold; width: 40%; }
    
    /* DATA CARDS */
    .data-card-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15pt; margin: 20pt 0; }
    .data-card { background: #f8f9fa; border: 1pt solid #dee2e6; border-top: 3pt solid #2E3192; padding: 12pt; text-align: center; border-radius: 4pt; }
    .card-label { font-size: 8pt; text-transform: uppercase; color: #666; font-weight: bold; margin-bottom: 5pt; }
    .card-val { font-size: 14pt; font-weight: 800; color: #000; }
    .card-sub { font-size: 8pt; color: #888; margin-top: 3pt; }

    /* KPIs */
    .kpi-h-box { background: #0a1628; color: #ffffff !important; padding: 14pt 20pt; border-radius: 4pt; margin-top: 25pt; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid; }
    .kpi-h-val { font-size: 26pt; font-weight: 800; color: #fff !important; }
    .kpi-h-title { font-size: 10pt; font-weight: bold; color: #fff !important; }
    
    /* BOXES */
    .method-box { background: #f9f9f9; border-left: 3pt solid #2E3192; padding: 12pt 18pt; font-size: 10pt; font-style: italic; margin-bottom: 18pt; color: #444; line-height: 1.4; }
    .intro-paragraph { margin-bottom: 18pt; line-height: 1.6; color: #333; }
    .rationale-text { font-size: 9.5pt; font-style: italic; border-left: 2pt solid #6A717B; padding-left: 12pt; color: #555; margin-bottom: 20pt; line-height: 1.4; }
    .keep-together { page-break-inside: avoid; page-break-after: auto; margin-bottom: 25pt; }
</style>
</head>
<body>

    <div class="formal-cover-page">
        <svg class="cover-pattern" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="0,0 100,20 100,100 0,80" fill="#ffffff" fill-opacity="0.05" />
            <circle cx="90" cy="10" r="30" fill="#ffffff" fill-opacity="0.03" />
        </svg>
        <div style="height:90pt;"></div>
        <div>
            <div class="cover-main-h1">INFORME ESTRATÉGICO<br>DE MERCADO</div>
            <div class="cover-program-info">
                <span style="font-weight:bold;">${clean(p.programa)}</span><br>
                <span style="font-size:14pt; opacity:0.9;">${clean(p.departamento)} | SNIES ${clean(p.snies)}</span>
            </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.4); padding-top:15pt; display:flex; justify-content:space-between; align-items:flex-end; color:#fff !important; font-size:10pt;">
            <div>
                <div style="font-weight:bold;">Symbiotic Analytics // Intelligence Unit</div>
                <div style="margin-top:2pt; opacity:0.8;">${fecha}</div>
            </div>
            <div style="display:flex; gap:15pt; opacity:0.2;">
                <img src="/logo_uniminuto.png" style="height:22pt; filter:brightness(0) invert(1);" />
                <img src="/logo_symbiotic.png" style="height:22pt; filter:brightness(0) invert(1);" />
            </div>
        </div>
    </div>

    <div class="page-footer">
        <img src="/logo_symbiotic.png" class="footer-watermark" />
        <div class="footer-flex">
            <div>${clean(p.snies)} | ${clean(p.departamento)} | ${clean(p.programa)}</div>
            <div style="font-weight:bold; opacity:0.5;">SymbiAnalytics Intelligence</div>
        </div>
    </div>

    <div class="doc-padding-wrap">
        <!-- PÁGINA DE METODOLOGÍA -->
        <div class="content-section" style="page-break-after: always; margin-top: 0;">
            <h1 style="page-break-before:avoid !important;">Metodología y Fuentes de Información</h1>
            <p class="intro-paragraph" style="font-size: 11pt; margin-bottom: 20pt;">
                El presente informe estratégico se construye a partir de la integración de múltiples fuentes de datos oficiales 
                del Gobierno Nacional de Colombia. Estas fuentes son procesadas por el motor de inteligencia de 
                <strong>SymbiAnalytics</strong> para proporcionar una visión comparativa y prospectiva del programa académico.
            </p>

            <div class="keep-together" style="margin-bottom: 25pt;">
                <h3 style="color:#0a1628 !important; border-bottom: 1pt solid #ccc; padding-bottom: 4pt;">SNIES (Sistema Nacional de Información de la Educación Superior)</h3>
                <p style="font-size:10.5pt; line-height:1.4;">
                    Es la fuente oficial que consolida la información de las instituciones y programas académicos aprobados por el 
                    Ministerio de Educación Nacional (MEN). Se utiliza en este informe para validar la identidad institucional, 
                    la oferta legal, costos de matrícula y ficha técnica del programa.
                </p>
            </div>

            <div class="keep-together" style="margin-bottom: 25pt;">
                <h3 style="color:#0a1628 !important; border-bottom: 1pt solid #ccc; padding-bottom: 4pt;">SPADIES (Prevención de la Deserción)</h3>
                <p style="font-size:10.5pt; line-height:1.4;">
                    Sistema desarrollado para hacer seguimiento a la permanencia estudiantil. Proporciona los indicadores de 
                    deserción anual por cohorte. En este informe, se utiliza para contrastar la capacidad de retención del 
                    programa frente al promedio de sus pares.
                </p>
            </div>

            <div class="keep-together" style="margin-bottom: 25pt;">
                <h3 style="color:#0a1628 !important; border-bottom: 1pt solid #ccc; padding-bottom: 4pt;">OLE (Observatorio Laboral para la Educación)</h3>
                <p style="font-size:10.5pt; line-height:1.4;">
                    Rastrea la vinculación laboral de los graduados en el sector formal de la economía y sus niveles salariales. 
                    Es la base empleada para calcular la <strong>Tasa de Cotización (Empleabilidad)</strong> que se presenta en las 
                    comparativas de éxito laboral.
                </p>
            </div>

            <div class="keep-together" style="margin-bottom: 25pt;">
                <h3 style="color:#0a1628 !important; border-bottom: 1pt solid #ccc; padding-bottom: 4pt;">SABER PRO (Diferenciado por Competencias)</h3>
                <p style="font-size:10.5pt; line-height:1.4;">
                    Exámenes de Estado aplicados por el ICFES que evalúan las competencias genéricas y específicas de los estudiantes. 
                    En SymbiAnalytics, este dato se procesa como el indicador estándar de <strong>Calidad Académica</strong>, 
                    permitiendo comparar el desempeño formativo del programa frente al mercado.
                </p>
            </div>
            
            <p style="font-size:9pt; font-style:italic; color:#666; margin-top:30pt;">
                Nota: Todos los indicadores son normalizados y actualizados periódicamente según la disponibilidad de los repositorios gubernamentales.
            </p>
        </div>

        <!-- PÁGINA: TABLA DE CONTENIDO -->
        <div class="content-section">
            <h1>Tabla de Contenido</h1>
            <div style="margin-top:20pt; width:100%;">
                <ul style="list-style:none; line-height:2.4; font-size:11.5pt;">
                    <li style="border-bottom:1px dotted #ccc;"><span>1. Identidad Institucional y del Programa</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>2. Análisis de Indicadores Clave (KPIs)</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>3. Perfil Demográfico del Estudiante</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>4. Benchmarking de Mercado (Geográfico)</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>5. Benchmarking por Sector</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>6. Benchmarking por Modalidad</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>7. Matriz de Diagnóstico Estratégico</span></li>
                    <li style="border-bottom:1px dotted #ccc;"><span>8. Análisis de Programas Semejantes</span></li>
                </ul>
            </div>
        </div>

        <div class="content-section">
            <h1>1. Identidad Institucional y del Programa</h1>
            <div class="keep-together" style="margin-bottom:35pt;">
                <h3>1.1 Identidad Institucional</h3>
                <table class="formal-grid">
                    <tr><td class="td-label">Nombre Institución</td><td>${clean(p.institucion)}</td></tr>
                    <tr><td class="td-label">Código Institución</td><td>${clean(p.codigo_institucion)}</td></tr>
                    <tr><td class="td-label">Carácter Académico</td><td>${clean(p.caracter_academico)}</td></tr>
                    <tr><td class="td-label">Sector</td><td>${clean(p.sector)}</td></tr>
                    <tr><td class="td-label">Departamento Principal</td><td>${clean(p.departamento_principal)}</td></tr>
                    <tr><td class="td-label">Municipio Principal</td><td>${clean(p.municipio_principal)}</td></tr>
                </table>
            </div>

            <div class="keep-together" style="margin-bottom:35pt;">
                <h3>1.2 Ficha Técnica del Programa Académico</h3>
                <div class="data-card-grid">
                    <div class="data-card"><div class="card-label">Costo Matrícula</div><div class="card-val">${fmtCurrency(p.costo_matricula_estud_nuevos)}</div><div class="card-sub">Estudiantes Nuevos</div></div>
                    <div class="data-card"><div class="card-label">Créditos</div><div class="card-val">${clean(p.numero_creditos)}</div><div class="card-sub">Carga Académica</div></div>
                    <div class="data-card"><div class="card-label">Duración</div><div class="card-val">${clean(p.numero_periodos_de_duracion)}</div><div class="card-sub">Periodos</div></div>
                </div>
                <table class="formal-grid">
                    <tr><td class="td-label">Programa Académico</td><td>${clean(p.programa)}</td></tr>
                    <tr><td class="td-label">Código SNIES</td><td>${clean(p.snies)}</td></tr>
                    <tr><td class="td-label">Nivel de Formación</td><td>${clean(p.nivel)}</td></tr>
                    <tr><td class="td-label">Modalidad</td><td>${clean(p.modalidad)}</td></tr>
                    <tr><td class="td-label">Área de Conocimiento</td><td>${clean(p.area)}</td></tr>
                    <tr><td class="td-label">Núcleo Básico (NBC)</td><td>${clean(p.nucleo)}</td></tr>
                    <tr><td class="td-label">Vigencia (Años)</td><td>${clean(p.vigencia_annos)}</td></tr>
                    <tr><td class="td-label">Reconocimiento MEN</td><td>${clean(p.reconocimiento_del_ministerio)}</td></tr>
                </table>
            </div>

            <div class="keep-together" style="margin-bottom:35pt;">
                <h3>1.3 Clasificación CINE (Clasificación Internacional Normalizada de la Educación)</h3>
                <table class="formal-grid" style="page-break-inside:avoid;">
                    <tr><td class="td-label">CINE F 2013 Campo Amplio</td><td>${clean(p.amplio)}</td></tr>
                    <tr><td class="td-label">CINE F 2013 Campo Específico</td><td>${clean(p.especifico)}</td></tr>
                    <tr><td class="td-label">CINE F 2013 Campo Detallado</td><td>${clean(p.detallado)}</td></tr>
                </table>
            </div>
        </div>

        <div class="content-section">
            <h1>2. Análisis de Indicadores Clave (KPIs)</h1>
            <p class="intro-paragraph">
                Esta sección presenta la salud interna del programa académico a través de sus métricas vitales. Antes de realizar comparaciones externas, es fundamental validar las tendencias de crecimiento y retención propias.
            </p>
            <p class="rationale-text">
                <strong>¿Por qué este análisis?:</strong> Los indicadores internos permiten identificar señales de alerta en el ciclo de vida del estudiante (desde la admisión hasta la graduación) y establecer una línea base para medir el impacto de las estrategias institucionales.
            </p>
            <div class="keep-together">
                <div class="kpi-h-box"><div><div class="kpi-h-title">Nuevos Ingresos (Histórico)</div><div class="kpi-h-val">${fmt(kpi.total_pcurso, 0)}</div></div></div>
                <h3>2.1 Nuevos Ingresos</h3>
                ${generatePremiumLineChart(data.pcursoEvolution.years.map(y => y.toString()), data.pcursoEvolution.values, 'Programa')}
            </div>
            <div class="keep-together">
                <div class="kpi-h-box"><div><div class="kpi-h-title">Matriculados Totales (Histórico)</div><div class="kpi-h-val">${fmt(kpi.total_matricula, 0)}</div></div></div>
                <h3>2.2 Evolución de Matrícula</h3>
                ${generatePremiumLineChart(data.matriculaEvolution.years.map(y => y.toString()), data.matriculaEvolution.values, 'Programa')}
            </div>
            <div class="keep-together">
                <div class="kpi-h-box"><div><div class="kpi-h-title">Tasa de Deserción Anual (Promedio)</div><div class="kpi-h-val">${fmtPct(kpi.avg_desercion, 2)}</div></div></div>
                <h3>2.3 Deserción y Permanencia</h3>
                <div class="method-box">
                    <strong>Metodología (SPADIES):</strong> La Tasa de Deserción Anual es calculada por el <strong>Ministerio de Educación Nacional (MEN)</strong> mediante el sistema SPADIES. Se calcula como el cociente entre el número de estudiantes que desertan en un periodo dado sobre el total de matriculados.
                </div>
                ${generatePremiumLineChart(data.desercionEvolution.years.map(y => y.toString()), data.desercionEvolution.values, 'Programa', 540, 200, '%')}
            </div>
            <div class="keep-together">
                <div class="kpi-h-box"><div><div class="kpi-h-title">Calidad Académica (Saber Pro)</div><div class="kpi-h-val">${fmt(kpi.avg_saberpro, 1)}</div></div></div>
                <h3>2.4 Desempeño Saber Pro del Programa</h3>
                <div class="method-box">
                    <strong>Contexto de Competencias:</strong> Los exámenes Saber Pro evalúan competencias genéricas esenciales para el desempeño profesional. Un puntaje alto refleja la eficacia del modelo pedagógico.
                </div>
                ${generateProgramBarChart(data.saberProProgram.summary)}
                <div style="font-size:8.5pt; color:#666; margin-top:5pt;">
                    <strong>Lectura Crítica:</strong> Análisis y evaluación de textos. | 
                    <strong>R. Cuantitativo:</strong> Interpretación de datos. | 
                    <strong>C. Ciudadanas:</strong> Contextualización social. | 
                    <strong>Inglés:</strong> Suficiencia lingüística. | 
                    <strong>C. Escrita:</strong> Expresión de ideas.
                </div>
            </div>
        </div>

        <div class="content-section">
            <h1>3. Perfil Demográfico del Estudiante del Programa</h1>
            <p class="intro-paragraph">
                Este análisis describe las características sociales y académicas de la población estudiantil vinculada 
                al programa, proporcionando una base para el diseño de estrategias de permanencia y mercadeo.
            </p>
            <p class="rationale-text">
                <strong>¿Por qué este análisis?:</strong> El perfil demográfico permite entender el contexto de vida del estudiante, adaptando la oferta académica y los servicios de bienestar a sus necesidades reales (empleo, estrato y edad).
            </p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30pt;">
                <div class="keep-together"><h3 style="margin-top:0;">3.1 Distribución por Sexo</h3>${generateDemographicChart(data.demographics.sexo.data.map(d => ({ category: d.category, percentage: d.percentage })))}</div>
                <div class="keep-together"><h3 style="margin-top:0;">3.2 Horas de Trabajo (Semanal)</h3>${generateDemographicChart(data.demographics.horas_trabajo.data.map(d => ({ category: d.category, percentage: d.percentage })))}</div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30pt; margin-top:20pt;">
                <div class="keep-together"><h3 style="margin-top:0;">3.3 Estrato Socioeconómico</h3>${generateDemographicChart(data.demographics.estrato.data.map(d => ({ category: d.category, percentage: d.percentage })))}</div>
                <div class="keep-together"><h3 style="margin-top:0;">3.4 Rango de Edad</h3>${generateDemographicChart(data.demographics.edad.data.map(d => ({ category: d.category, percentage: d.percentage })))}</div>
            </div>
        </div>

        <div class="content-section">
            <h1>4. Benchmarking de Mercado (Competencia)</h1>
            <p class="intro-paragraph">
                La comparación con el mercado estratégico permite situar al programa en su contexto competitivo regional, validando si las tendencias propias están alineadas o divergen del comportamiento de sus pares.
            </p>
            <p class="rationale-text">
                <strong>¿Por qué este análisis?:</strong> Dado que la elección de carrera es frecuentemente una decisión regional, entender el tamaño y la salud del mercado en el departamento de oferta es crítico para la planeación de metas de crecimiento y participación.
            </p>
            
            <p class="intro-paragraph">
                Los parámetros de comparación seleccionados son: 
                <strong>DEPARTAMENTO DE OFERTA (${clean(p.departamento)})</strong>, 
                <strong>NIVEL DE FORMACIÓN (${clean(p.nivel)})</strong> y 
                <strong>ÁREA DE CONOCIMIENTO (${clean(p.area)})</strong>.
            </p>
            
            <div class="method-box">
                <strong>Referencia de Mercado:</strong> Para este análisis se han identificado 
                <strong>${fmt(mKpi.num_programs, 0)} programas académicos</strong> pertenecientes a 
                <strong>${fmt(mKpi.num_ies, 0)} instituciones de educación superior</strong> que cumplen con los criterios de comparación mencionados.
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">4.1 Tendencia Comparativa: Primer Curso</h3>
                ${generatePremiumLineChart(data.pcursoEvolution.years.map(y => y.toString()), data.pcursoEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.pcursoEvolution.years.map(y => y.toString()), data.marketPcursoEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">4.2 Tendencia Comparativa: Matrícula Total</h3>
                ${generatePremiumLineChart(data.matriculaEvolution.years.map(y => y.toString()), data.matriculaEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.matriculaEvolution.years.map(y => y.toString()), data.marketMatriculaEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">4.3 Comparativa de Tasa de Deserción</h3>
                ${generatePremiumLineChart(data.desercionEvolution.years.map(y => y.toString()), data.desercionEvolution.values, 'Programa', 540, 150, '%')}
                ${generatePremiumLineChart(data.desercionEvolution.years.map(y => y.toString()), data.marketDesercionEvolution.values, 'Mercado', 540, 150, '%')}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">4.4 Tendencia Comparativa: Graduados</h3>
                ${generatePremiumLineChart(data.graduadosEvolution.years.map(y => y.toString()), data.graduadosEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.graduadosEvolution.years.map(y => y.toString()), data.marketGraduadosEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">4.5 Comp. Empleabilidad y Calidad (Saber Pro)</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10pt; margin-top:10pt;">
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #2E3192;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Empleabilidad (OLE)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmtPct(kpi.avg_empleabilidad, 1)} | Mercado: ${fmtPct(mKpi.avg_empleabilidad, 1)}</div>
                    </div>
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #6A717B;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Calidad (Saber Pro)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmt(kpi.avg_saberpro, 1)} | Mercado: ${fmt(mKpi.avg_saberpro, 1)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
            <h1>5. Benchmarking por Sector (${clean(p.sector)})</h1>
            <p class="intro-paragraph">
                La comparación por sector se realiza bajo los parámetros de 
                <strong>DEPARTAMENTO DE OFERTA (${clean(p.departamento)})</strong>, 
                <strong>SECTOR DE INSTITUCIÓN (${clean(p.sector)})</strong>, 
                <strong>NIVEL DE FORMACIÓN (${clean(p.nivel)})</strong> y 
                <strong>ÁREA DE CONOCIMIENTO (${clean(p.area)})</strong>.
            </p>
            <p class="rationale-text">
                <strong>¿Por qué este análisis?:</strong> El sector (Público/Privado) define las condiciones regulatorias, los esquemas de becas y los modelos de financiamiento que impactan directamente en la competitividad.
            </p>
            
            <div class="method-box">
                <strong>Referencia de Sector:</strong> Para este análisis se han identificado 
                <strong>${fmt(data.sectorKPIs.summary.num_programs, 0)} programas académicos</strong> pertenecientes a 
                <strong>${fmt(data.sectorKPIs.summary.num_ies, 0)} instituciones</strong> del sector ${clean(p.sector)} en ${clean(p.departamento)}.
            </div>

            <div class="keep-together">
                <h3 style="color:#000;">5.1 Tendencia Sectorial: Primer Curso</h3>
                ${generatePremiumLineChart(data.pcursoEvolution.years.map(y => y.toString()), data.pcursoEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.sectorPcursoEvolution.years.map(y => y.toString()), data.sectorPcursoEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">5.2 Tendencia Sectorial: Matrícula Total</h3>
                ${generatePremiumLineChart(data.matriculaEvolution.years.map(y => y.toString()), data.matriculaEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.sectorMatriculaEvolution.years.map(y => y.toString()), data.sectorMatriculaEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">5.3 Tendencia por Sector: Graduados</h3>
                ${generatePremiumLineChart(data.graduadosEvolution.years.map(y => y.toString()), data.graduadosEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.sectorGraduadosEvolution.years.map(y => y.toString()), data.sectorGraduadosEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">5.4 Comp. Empleabilidad y Calidad (Sector)</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10pt; margin-top:10pt;">
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #2E3192;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Empleabilidad (OLE)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmtPct(kpi.avg_empleabilidad, 1)} | Sector: ${fmtPct(data.sectorKPIs.summary.avg_empleabilidad, 1)}</div>
                    </div>
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #6A717B;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Calidad (Saber Pro)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmt(kpi.avg_saberpro, 1)} | Sector: ${fmt(data.sectorKPIs.summary.avg_saberpro, 1)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
            <h1>6. Benchmarking por Modalidad (${clean(p.modalidad)})</h1>
            <p class="intro-paragraph">
                La comparación por modalidad se realiza bajo los parámetros de 
                <strong>DEPARTAMENTO DE OFERTA (${clean(p.departamento)})</strong>, 
                <strong>MODALIDAD DE ESTUDIO (${clean(p.modalidad)})</strong>, 
                <strong>NIVEL DE FORMACIÓN (${clean(p.nivel)})</strong> y 
                <strong>ÁREA DE CONOCIMIENTO (${clean(p.area)})</strong>.
            </p>
            <p class="rationale-text">
                <strong>¿Por qué este análisis?:</strong> La modalidad educativa define el perfil demográfico al que se dirige el programa y determina los requerimientos tecnológicos para la entrega del servicio académico.
            </p>
            
            <div class="method-box">
                <strong>Referencia de Modalidad:</strong> Para este análisis se han identificado 
                <strong>${fmt(data.modalityKPIs.summary.num_programs, 0)} programas académicos</strong> con modalidad ${clean(p.modalidad)} en ${clean(p.departamento)}.
            </div>

            <div class="keep-together">
                <h3 style="color:#000;">6.1 Tendencia por Modalidad: Primer Curso</h3>
                ${generatePremiumLineChart(data.pcursoEvolution.years.map(y => y.toString()), data.pcursoEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.modalityPcursoEvolution.years.map(y => y.toString()), data.modalityPcursoEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">6.2 Tendencia por Modalidad: Matrícula Total</h3>
                ${generatePremiumLineChart(data.matriculaEvolution.years.map(y => y.toString()), data.matriculaEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.modalityMatriculaEvolution.years.map(y => y.toString()), data.modalityMatriculaEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">6.3 Tendencia por Modalidad: Graduados</h3>
                ${generatePremiumLineChart(data.graduadosEvolution.years.map(y => y.toString()), data.graduadosEvolution.values, 'Programa', 540, 150)}
                ${generatePremiumLineChart(data.modalityGraduadosEvolution.years.map(y => y.toString()), data.modalityGraduadosEvolution.values, 'Mercado', 540, 150)}
            </div>
            <div class="keep-together">
                <h3 style="color:#000;">6.4 Comp. Empleabilidad y Calidad (Modalidad)</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10pt; margin-top:10pt;">
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #2E3192;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Empleabilidad (OLE)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmtPct(kpi.avg_empleabilidad, 1)} | Modalidad: ${fmtPct(data.modalityKPIs.summary.avg_empleabilidad, 1)}</div>
                    </div>
                    <div style="background:#f8f9fa; padding:10pt; border-radius:4pt; border-left:3pt solid #6A717B;">
                        <div style="font-size:8pt; text-transform:uppercase; color:#666;">Calidad (Saber Pro)</div>
                        <div style="font-size:10pt; font-weight:bold;">Programa: ${fmt(kpi.avg_saberpro, 1)} | Modalidad: ${fmt(data.modalityKPIs.summary.avg_saberpro, 1)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
            <h1>7. Matriz de Diagnóstico Estratégico</h1>
            <p class="intro-paragraph">
                Resumen comparativo consolidado del desempeño del programa frente a las diversas cohortes de mercado analizadas. Los valores representan los promedios calculados por SymbiAnalytics.
            </p>

            <table class="formal-grid" style="font-size:9.5pt;">
                <thead style="background:#f2f2f2;">
                    <tr>
                        <th style="border:1pt solid #000; padding:8pt; text-align:left;">Métrica Estratégica</th>
                        <th style="border:1pt solid #000; padding:8pt; text-align:center;">Programa</th>
                        <th style="border:1pt solid #000; padding:8pt; text-align:center;">M. Geográfico</th>
                        <th style="border:1pt solid #000; padding:8pt; text-align:center;">M. Sectorial</th>
                        <th style="border:1pt solid #000; padding:8pt; text-align:center;">M. Modalidad</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="td-label" style="width:25%;">Matrícula Total</td>
                        <td style="text-align:center; font-weight:bold;">${fmt(kpi.total_matricula,0)}</td>
                        <td style="text-align:center;">${fmt(mKpi.total_matricula,0)}</td>
                        <td style="text-align:center;">${fmt(data.sectorKPIs.summary.total_matricula,0)}</td>
                        <td style="text-align:center;">${fmt(data.modalityKPIs.summary.total_matricula,0)}</td>
                    </tr>
                    <tr>
                        <td class="td-label">Deserción Anual (%)</td>
                        <td style="text-align:center; font-weight:bold;">${fmtPct(kpi.avg_desercion, 2)}</td>
                        <td style="text-align:center;">${fmtPct(mKpi.avg_desercion, 2)}</td>
                        <td style="text-align:center;">${fmtPct(data.sectorKPIs.summary.avg_desercion, 2)}</td>
                        <td style="text-align:center;">${fmtPct(data.modalityKPIs.summary.avg_desercion, 2)}</td>
                    </tr>
                    <tr>
                        <td class="td-label">Puntaje Saber Pro</td>
                        <td style="text-align:center; font-weight:bold;">${fmt(kpi.avg_saberpro, 1)}</td>
                        <td style="text-align:center;">${fmt(mKpi.avg_saberpro, 1)}</td>
                        <td style="text-align:center;">${fmt(data.sectorKPIs.summary.avg_saberpro, 1)}</td>
                        <td style="text-align:center;">${fmt(data.modalityKPIs.summary.avg_saberpro, 1)}</td>
                    </tr>
                    <tr>
                        <td class="td-label">Tasa de Empleabilidad</td>
                        <td style="text-align:center; font-weight:bold;">${fmtPct(kpi.avg_empleabilidad, 1)}</td>
                        <td style="text-align:center;">${fmtPct(mKpi.avg_empleabilidad, 1)}</td>
                        <td style="text-align:center;">${fmtPct(data.sectorKPIs.summary.avg_empleabilidad, 1)}</td>
                        <td style="text-align:center;">${fmtPct(data.modalityKPIs.summary.avg_empleabilidad, 1)}</td>
                    </tr>
                    <tr>
                        <td class="td-label">Pares en Mercado (#)</td>
                        <td style="text-align:center; font-weight:bold;">1</td>
                        <td style="text-align:center;">${fmt(mKpi.num_programs,0)}</td>
                        <td style="text-align:center;">${fmt(data.sectorKPIs.summary.num_programs,0)}</td>
                        <td style="text-align:center;">${fmt(data.modalityKPIs.summary.num_programs,0)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="content-section">
                <h1>8. Análisis de Programas Semejantes</h1>
                <p class="intro-paragraph">
                    Este análisis identifica otros programas académicos en el territorio colombiano que comparten una identidad temática similar al programa evaluado. 
                </p>
                <div class="method-box">
                    <strong>Algoritmo de Identidad:</strong> Se utiliza un motor de búsqueda por relevancia que tokeniza el nombre del programa y encuentra pares con una coincidencia semántica superior al 70%.
                </div>

                <table class="formal-grid" style="font-size:8.5pt;">
                    <thead style="background:#f2f2f2;">
                        <tr>
                            <th style="border:1pt solid #000; padding:6pt; text-align:left;">Programa Semejante</th>
                            <th style="border:1pt solid #000; padding:6pt; text-align:left;">Institución</th>
                            <th style="border:1pt solid #000; padding:6pt; text-align:center;">SNIES</th>
                            <th style="border:1pt solid #000; padding:6pt; text-align:center;">Modalidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.similarPrograms.length > 0 ? data.similarPrograms.map(sp => `
                            <tr>
                                <td style="font-weight:bold;">${clean(sp.programa)}</td>
                                <td>${clean(sp.institucion)}</td>
                                <td style="text-align:center;">${clean(sp.snies)}</td>
                                <td style="text-align:center;">${clean(sp.modalidad)}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" style="text-align:center; padding:20pt; font-style:italic; color:#888;">
                                    No se encontraron programas con alta similitud nominal en la base de datos actual.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <div style="margin-top:50pt; text-align:center;">
                <p style="font-size:10pt;">Fin del Informe Estratégico de Mercado</p>
                <div style="margin-top:10pt;">
                    <img src="/logo_symbiotic.png" style="height:50pt; opacity:0.75;" />
                </div>
                <p style="font-size:8.5pt; color:#666; margin-top:5pt;">Información procesada por el motor SymbiAnalytics v2.0</p>
            </div>
        </div>
    </div>

    </div>

    </div>

</body>
</html>`;
    } catch (e: any) {
        return `<html><body><h1>Error</h1><p>${e.message}</p></body></html>`;
    }
};

export const printReport = (htmlContent: string): void => {
    const p = window.open('', '_blank');
    if (p) { p.document.write(htmlContent); p.document.close(); setTimeout(() => p.print(), 1200); }
};

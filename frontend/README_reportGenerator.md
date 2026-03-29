# reportGenerator.ts — Documentación Técnica
**Motor de generación HTML del Informe Estratégico de Mercado | SymbiAnalytics v2.0**

---

## Descripción general

`reportGenerator.ts` es el módulo encargado de transformar el objeto `ReportData` (producido por `reportService.ts`) en un documento HTML completo, listo para impresión en formato carta. El HTML generado es autocontenido y no depende de frameworks externos — todo el estilo está inlinado en `<style>`.

El archivo exporta dos funciones públicas:

```ts
export const generateReportHTML = (data: ReportData): string
export const printReport = (htmlContent: string): void
```

---

## Tipo de entrada: `ReportData`

El objeto `data` recibido por `generateReportHTML` debe contener las siguientes propiedades:

```ts
interface ReportData {
  generatedAt: string                          // Fecha de generación legible

  // --- Identidad del programa ---
  program: {
    snies: string
    programa: string
    institucion: string
    codigo_institucion: string
    caracter_academico: string
    sector: string
    departamento: string
    departamento_principal: string
    municipio_principal: string
    nivel: string
    modalidad: string
    area: string
    nucleo: string
    vigencia_annos: string
    reconocimiento_del_ministerio: string
    costo_matricula_estud_nuevos: string       // String numérico, ej: "4999200"
    numero_creditos: string
    numero_periodos_de_duracion: string
    amplio: string                             // CINE campo amplio
    especifico: string                         // CINE campo específico
    detallado: string                          // CINE campo detallado
  }

  // --- KPIs internos del programa ---
  programKPIs: {
    summary: {
      total_pcurso: number
      total_matricula: number
      avg_desercion: number
      avg_saberpro: number
      avg_empleabilidad: number
    }
  }

  // --- KPIs del mercado geográfico ---
  marketKPIs: {
    summary: {
      num_programs: number
      num_ies: number
      total_matricula: number
      avg_desercion: number
      avg_saberpro: number
      avg_empleabilidad: number
    }
  }

  // --- KPIs del sector ---
  sectorKPIs: {
    summary: {
      num_programs: number
      num_ies: number
      total_matricula: number
      avg_desercion: number
      avg_saberpro: number
      avg_empleabilidad: number
    }
  }

  // --- KPIs de modalidad ---
  modalityKPIs: {
    summary: {
      num_programs: number
      num_ies: number
      total_matricula: number
      avg_desercion: number
      avg_saberpro: number
      avg_empleabilidad: number
    }
  }

  // --- Series de tiempo del programa ---
  pcursoEvolution:    { years: number[], values: (number | null)[] }
  matriculaEvolution: { years: number[], values: (number | null)[] }
  desercionEvolution: { years: number[], values: (number | null)[] }
  graduadosEvolution: { years: number[], values: (number | null)[] }

  // --- Series de tiempo del mercado geográfico ---
  marketPcursoEvolution:    { years: number[], values: (number | null)[] }
  marketMatriculaEvolution: { years: number[], values: (number | null)[] }
  marketDesercionEvolution: { years: number[], values: (number | null)[] }
  marketGraduadosEvolution: { years: number[], values: (number | null)[] }

  // --- Series de tiempo del sector ---
  sectorPcursoEvolution:    { years: number[], values: (number | null)[] }
  sectorMatriculaEvolution: { years: number[], values: (number | null)[] }
  sectorGraduadosEvolution: { years: number[], values: (number | null)[] }

  // --- Series de tiempo de modalidad ---
  modalityPcursoEvolution:    { years: number[], values: (number | null)[] }
  modalityMatriculaEvolution: { years: number[], values: (number | null)[] }
  modalityGraduadosEvolution: { years: number[], values: (number | null)[] }

  // --- Demografía del estudiante ---
  demographics: {
    sexo:         { data: { category: string, percentage: number }[] }
    horas_trabajo:{ data: { category: string, percentage: number }[] }
    estrato:      { data: { category: string, percentage: number }[] }
    edad:         { data: { category: string, percentage: number }[] }
  }

  // --- Saber Pro por competencia ---
  saberProProgram: {
    summary: {
      [module: string]: { mean: number }       // ej: { lectura_critica: { mean: 145.2 } }
      global?: { mean: number }                // se excluye del gráfico de barras
    }
  }
}
```

---

## Funciones internas (helpers de formato)

Todas son privadas al módulo (no exportadas):

| Función | Entrada | Salida | Uso |
|---|---|---|---|
| `fmtNum(val, decimals?)` | `number \| null` | `string` | Números con sufijo `k` si ≥ 1000. Ej: `48764 → "48,8k"` |
| `fmt(val, decimals?)` | `number \| null` | `string` | Número entero o decimal localizado `es-CO`. Ej: `140.5 → "140,5"` |
| `fmtPct(val, decimals?)` | `number \| null` | `string` | Porcentaje con símbolo. Ej: `9.69 → "9,69%"` |
| `fmtCurrency(val)` | `string \| null` | `string` | Pesos colombianos. Ej: `"4999200" → "$4.999.200"` |
| `clean(val)` | `string \| null` | `string` | Sanitiza `null`, `"None"`, `"nan"` → `"N/D"` |

---

## Funciones de visualización SVG/HTML

### `generatePremiumLineChart(years, values, label, width?, height?, suffix?)`

Genera un gráfico de línea como string SVG embebido en un `<div>`.

```ts
generatePremiumLineChart(
  years: string[],
  values: (number | null)[],
  label?: string,       // Si incluye "mercado" → color gris (#6A717B), si no → azul (#2E3192)
  width?: number,       // default: 540
  height?: number,      // default: 200
  suffix?: string       // ej: "%" para deserción
): string
```

- Grilla horizontal con 5 ticks en el eje Y
- Puntos con etiqueta de valor encima
- Etiquetas de año debajo del eje X
- `null` y `NaN` se tratan como `0`

---

### `generateProgramBarChart(data)`

Genera un gráfico de barras verticales para los módulos Saber Pro.

```ts
generateProgramBarChart(
  data: Record<string, { mean: number }>   // excluye la key "global"
): string
```

- Mapeo de nombres técnicos a etiquetas cortas:

| Key técnica | Etiqueta |
|---|---|
| `lectura_critica` | L. Crítica |
| `razonamiento_cuantitativo` | R. Cuantit. |
| `competencias_ciudadanas` | C. Ciudad. |
| `ingles` | Inglés |
| `comunicacion_escrita` | C. Escrita |

---

### `generateDemographicChart(data)`

Genera barras horizontales de porcentaje para datos demográficos.

```ts
generateDemographicChart(
  data: { category: string, percentage: number }[]
): string
```

- Barra de fondo gris claro con fill azul proporcional al porcentaje
- Etiqueta a la izquierda, porcentaje formateado a la derecha

---

## Estructura del HTML generado

El documento tiene dos partes físicas bien diferenciadas:

### 1. Portada (`div.formal-cover-page`)

Posicionada absolutamente sobre la primera página. Contiene:
- Fondo oscuro con gradiente (`#0a1628 → #1a2a44`)
- Título principal (`INFORME ESTRATÉGICO DE MERCADO`)
- Nombre del programa y código SNIES
- Pie de portada con fecha y logos institucionales
- Patrón SVG decorativo semitransparente

```
position: absolute | height: 279.4mm | width: 215.9mm
```

### 2. Cuerpo del documento (`div.doc-padding-wrap`)

Comienza con `margin-top: 279.4mm` para desplazarse después de la portada. Padding: `30mm 20mm 35mm 35mm`. Contiene todas las secciones del informe en orden secuencial.

---

## Secciones del informe (en orden de renderizado)

| Sección | `h1` que la inicia | Contenido |
|---|---|---|
| Metodología | `Metodología y Fuentes de Información` | 4 bloques descriptivos (SNIES, SPADIES, OLE, SABER PRO) |
| Tabla de contenido | `Tabla de Contenido` | Lista de 7 ítems con borde punteado |
| 1. Identidad | `1. Identidad Institucional y del Programa` | Tabla institucional + cards (matrícula, créditos, duración) + tabla técnica + tabla CINE |
| 2. KPIs | `2. Análisis de Indicadores Clave (KPIs)` | 4 bloques: nuevos ingresos, matrícula, deserción (con metodología SPADIES), Saber Pro |
| 3. Demografía | `3. Perfil Demográfico del Estudiante del Programa` | Grid 2×2: sexo, horas trabajo, estrato, edad |
| 4. Benchmarking geográfico | `4. Benchmarking de Mercado (Competencia)` | 4 comparativas duales (programa vs. mercado) + tarjetas empleabilidad/calidad |
| 5. Benchmarking sectorial | `5. Benchmarking por Sector (${sector})` | Misma estructura que sección 4, datos de sector |
| 6. Benchmarking modalidad | `6. Benchmarking por Modalidad (${modalidad})` | Misma estructura que sección 4, datos de modalidad |
| 7. Matriz diagnóstica | `7. Matriz de Diagnóstico Estratégico` | Tabla 5×5 con las 4 métricas clave vs. los 3 mercados |

> Cada `h1` tiene `page-break-before: always` — cada sección comienza en una nueva página.

---

## Sistema de estilos (@page y CSS)

```css
@page { size: letter; margin: 0; }
```

Las clases CSS más relevantes:

| Clase | Descripción |
|---|---|
| `.formal-cover-page` | Portada de página completa, posición absoluta |
| `.doc-padding-wrap` | Contenedor principal del cuerpo, con padding de margen |
| `.page-footer` | Pie de página fijo (`position: fixed; bottom: 5mm`) con número de página via `counter(page)` |
| `h1` | Título de sección — dispara `page-break-before: always` y `counter-increment: page` |
| `h3` | Subtítulo azul con borde izquierdo (`#2E3192`) |
| `table.formal-grid` | Tabla con bordes completos estilo formal |
| `.td-label` | Celda de encabezado de fila (fondo gris, negrita, 40% ancho) |
| `.data-card-grid` | Grid de 3 columnas para las cards de matrícula/créditos/duración |
| `.data-card` | Card individual con acento superior azul |
| `.kpi-h-box` | Caja oscura con valor KPI grande en blanco |
| `.method-box` | Caja de metodología con borde izquierdo azul, fondo gris |
| `.rationale-text` | Texto en cursiva con borde izquierdo gris — sección "¿Por qué este análisis?" |
| `.keep-together` | `page-break-inside: avoid` — evita cortes de página dentro de un bloque |

---

## Función `printReport`

```ts
export const printReport = (htmlContent: string): void
```

Abre una nueva ventana del navegador, escribe el HTML generado y llama a `window.print()` con un delay de 1200ms para permitir que el DOM renderice antes de imprimir.

---

## Recursos estáticos requeridos

El HTML generado referencia dos imágenes que deben estar disponibles en la raíz del servidor:

| Ruta | Uso |
|---|---|
| `/logo_uniminuto.png` | Logo institucional en portada (filtro `brightness(0) invert(1)` para versión blanca) |
| `/logo_symbiotic.png` | Logo SymbiTIC en portada, pie de página y cierre del informe |

---

## Manejo de errores

`generateReportHTML` está envuelto en un `try/catch`. Si ocurre cualquier error durante la generación:

```ts
return `<html><body><h1>Error</h1><p>${e.message}</p></body></html>`;
```

---

*Módulo parte del ecosistema SymbioTIC — Startup by UNIMINUTO — Since 2025*

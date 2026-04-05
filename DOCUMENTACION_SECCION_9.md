# Documentación Técnica Completa — Sección 9: Análisis de Afinidad Académica (NBC)
> **Archivo fuente de datos**: `frontend/src/services/reportService.ts`  
> **Archivo de renderizado**: `frontend/src/services/reportTemplate.ts`  
> **Restricción de arquitectura**: Esta sección NO modifica el backend. Todo el análisis ocurre en el frontend.

---

## ¿Qué es el NBC y por qué es una unidad de análisis diferente a la Sección 8?

Antes de revisar el código, es fundamental entender la diferencia entre la Sección 8 y la Sección 9, porque son dos lentes de análisis completamente distintos:

| | Sección 8 | Sección 9 |
|---|---|---|
| **Criterio de similitud** | El **nombre** del programa (semántica del titulo) | El **Núcleo Básico del Conocimiento (NBC)** oficial del MEN |
| **Pregunta que responde** | "¿Quién tiene un programa con nombre igual o parecido al mío?" | "¿Quién forma estudiantes en la misma disciplina académica, sin importar cómo se llame el programa?" |
| **Ejemplo** | "Administración de Empresas" vs "Administración de Empresas Agropecuarias" | "Administración de Empresas" vs "Gestión Empresarial" vs "Negocios Internacionales" (mismo NBC: Administración) |

### ¿Qué es el NBC exactamente?

El **Núcleo Básico del Conocimiento (NBC)** es una clasificación oficial del **Ministerio de Educación Nacional de Colombia (MEN)** que agrupa los programas académicos según su disciplina científica de base, independientemente de cómo se llame el programa en cada universidad.

Dentro de cada NBC existe una jerarquía de campos:

```
NBC (Núcleo Básico del Conocimiento)
 └── Area (campo grande de saber)
      └── Detallado (subcampo específico)
```

**Ejemplo real:**
- NBC: `Administración`
  - Area: `Economía, Administración, Contaduría y afines`
    - Detallado: `Administración`

Un programa llamado "Gestión del Talento Humano" y otro llamado "Administración de Empresas" pueden tener el mismo NBC si el MEN así los clasificó, lo que los convierte en **hermanos académicos** aunque sus nombres sean completamente distintos.

### ¿Por qué esto es relevante para el lector del informe?

La Sección 8 puede no capturar competidores reales. Imaginemos:
- El programa analizado se llama **"FINANZAS Y NEGOCIOS INTERNACIONALES"**
- La Sección 8 solo encuentra competidores cuyo nombre contiene "finanzas" o "negocios"
- PERO una universidad rival puede tener un programa llamado **"ADMINISTRACIÓN GLOBAL"** que comparte el mismo NBC y forma exactamente al mismo tipo de profesional

La Sección 9 detecta ese competidor que la Sección 8 **no puede ver**.

> **Conclusión para el tomador de decisiones:** La Sección 9 revela competidores invisibles que forman al mismo tipo de egresado, y le dice con qué fuerza está saturado su núcleo académico en Colombia.

---

## Paso 1: ¿De dónde vienen los datos?

Igual que la Sección 8, los datos provienen del catálogo nacional completo descargado en `reportService.ts`:

```typescript
// reportService.ts — línea ~186
const allProgs = await getPrograms();
```

Para la Sección 9, los campos que se utilizan son distintos a los de la Sección 8:

| Campo | Tipo | Descripción | Rol en Sección 9 |
|---|---|---|---|
| `snies` | string | Código único del programa | Excluir el propio programa |
| `programa` | string | Nombre del programa | Mostrar en la tabla final |
| `institucion` | string | Nombre de la IES | Mostrar en tabla y gráfico |
| `departamento` / `departamento_principal` | string | Ubición geográfica | Concentración regional |
| `modalidad` | string | Presencial / Virtual / A Distancia | Mostrar en tabla |
| `nucleo` | string | **NBC del MEN** | **Criterio principal de afinidad** |
| `area` | string | Área padre del NBC | Criterio de scoring secundario |
| `detallado` | string | Subcampo específico | Criterio de scoring terciario |
| `nivel` | string | Universitario / Tecnológico / etc. | Criterio de scoring cuaternario |

La diferencia clave respecto a la Sección 8: aquí **no se analiza el nombre del programa**, sino su **clasificación oficial dentro de la taxonomía del MEN**.

---

## Paso 2: El Algoritmo de Afinidad por NBC — `findNbcSimilar()`

Esta función está en `reportService.ts` y trabaja de manera fundamentalmente diferente a `findSimilar()`:

```typescript
const findNbcSimilar = (target: ProgramOption, others: ProgramOption[]) => {
    return others
        // PASO A: Filtro base obligatorio — mismo NBC, diferente SNIES
        .filter(p => p.snies !== target.snies && p.nucleo === target.nucleo)
        
        // PASO B: Sistema de puntuación por campos adicionales compartidos
        .map(p => {
            let score = 0;
            if (p.area === target.area)         score += 2;  // misma área general
            if (p.detallado === target.detallado) score += 1;  // mismo subcampo
            if (p.nivel === target.nivel)         score += 1;  // mismo nivel formativo
            return { program: p, score };
        })
        
        // PASO C: Ordenar por mayor afinidad (score más alto primero)
        .sort((a, b) => b.score - a.score)
        .map(res => res.program);
};
```

### Diferencias críticas respecto a la Sección 8

| Característica | Sección 8 (`findSimilar`) | Sección 9 (`findNbcSimilar`) |
|---|---|---|
| **Filtro de entrada** | Ninguno (escanea todo el catálogo) | Solo entra si `nucleo === target.nucleo` |
| **Base de comparación** | Texto libre (nombre del programa) | Campo estructurado (`nucleo`) del MEN |
| **Umbral de relevancia** | Score ≥ 2 (corta los irrelevantes) | Sin umbral — todos los del mismo NBC entran |
| **Scoring adicional** | Cantidad de palabras en común | Coincidencia de `area`, `detallado`, `nivel` |
| **Objetivo** | Competencia nominal (mismo nombre) | Competencia disciplinar (misma formación) |

### Ejemplo concreto paso a paso

Supongamos que el programa analizado es **"ADMINISTRACIÓN DE EMPRESAS"** con NBC = `"Administración"`.

**PASO A — Filtro base:**
- Programa `"GESTIÓN EMPRESARIAL"` con NBC = `"Administración"` → ✅ **entra**
- Programa `"MERCADEO"` con NBC = `"Administración"` → ✅ **entra**
- Programa `"CONTADURÍA PÚBLICA"` con NBC = `"Contaduría Pública"` → ❌ **eliminado** (diferente NBC)
- Programa `"ADMINISTRACIÓN AMBIENTAL"` con NBC = `"Ingeniería Ambiental"` → ❌ **eliminado**

**PASO B — Scoring:**

| Programa rival | `area` igual? | `detallado` igual? | `nivel` igual? | Score |
|---|---|---|---|---|
| "GESTIÓN EMPRESARIAL" | ✅ (+2) | ✅ (+1) | ✅ (+1) | **4** |
| "ADMINISTRACIÓN PÚBLICA" | ✅ (+2) | ❌ | ✅ (+1) | **3** |
| "MERCADEO" | ✅ (+2) | ❌ | ✅ (+1) | **3** |
| "TECNOLOGÍA EN GESTIÓN" | ✅ (+2) | ❌ | ❌ | **2** |

**PASO C — Resultado:**
Lista ordenada: "Gestión Empresarial" (4) → "Administración Pública" (3) → "Mercadeo" (3) → "Tecnología en Gestión" (2)...

> **¿Por qué no hay umbral mínimo?** Porque si comparte el NBC, **por definición** el MEN ya los clasificó como hermanos académicos. No es necesario un filtro adicional de relevancia: la autoridad clasificadora ya tomó esa decisión.

---

## Paso 3: Limitación del resultado para el PDF

Al igual que en la Sección 8, el resultado completo de `findNbcSimilar()` puede ser enorme (para NBC muy populares como "Administración" puede haber miles de programas en el país).

En `reportService.ts`:
```typescript
// reportService.ts — línea ~264
nbcSimilarPrograms: nbcSimilarPrograms.slice(0, 10),
```

Solo los **10 programas con mayor score de afinidad** se envían al PDF para la tabla nominal. El resto del universo de datos se procesa estadísticamente en el siguiente paso.

---

## Paso 4: Agregación Estadística — `buildAnalysis()` aplicada al NBC

La misma función `buildAnalysis()` que se usa en la Sección 8 se reutiliza aquí, pero alimentada con el arreglo `nbcSimilarPrograms` completo (antes del corte):

```typescript
// Procesamiento estadístico del universo completo de programas con mismo NBC
const nbcSimilarAnalysis = buildAnalysis(nbcSimilarPrograms, program.departamento_principal || program.departamento);
```

Y la función genera:

```typescript
const buildAnalysis = (progs, targetDept) => {
    const deptCounts = {};
    const instCounts = {};

    progs.forEach(p => {
        const d = p.departamento_principal || p.departamento;
        if (d) deptCounts[d] = (deptCounts[d] || 0) + 1;
        if (p.institucion) instCounts[p.institucion] = (instCounts[p.institucion] || 0) + 1;
    });

    return {
        totalNational: progs.length,       // total de programas en este NBC
        topDepartments: /* top 3 */,       // concentración geográfica
        topInstitutions: /* top 10 */,     // market share institucional
        localCompetitors: /* filtrado */   // competidores del mismo departamento
    };
};
```

### ¿Qué significan estos números para el lector?

| Variable | Ejemplo | Interpretación estratégica |
|---|---|---|
| `totalNational` | `4.832` | El NBC "Administración" tiene 4.832 programas en el país. Eso es saturación extrema. Un NBC con 20 programas indica nicho sin explotar. |
| `topDepartments` | `BOGOTÁ (1.200), ANTIOQUIA (800)` | Si el programa está en un departamento que NO aparece aquí, tiene ventaja geográfica. Si sí aparece, enfrenta competencia intensa localmente. |
| `topInstitutions` | `SENA (1.164), UNIMINUTO (233)` | Si el SENA aparece con 1.164 programas en ese NBC, significa que ese conocimiento ya es considerado "formación básica" en Colombia. Eso debe alertar sobre la percepción del valor del título. |

---

## Paso 5: Cómo se dibuja en el PDF — `reportTemplate.ts`

La sección 9 también tiene 3 componentes visuales, con la misma lógica de la Sección 8 pero con datos del análisis NBC:

### Componente A: Radiografía Académica (texto)

```html
<div class="method-box">
    <strong>Radiografía Académica:</strong> Existen
    <b>${data.nbcSimilarAnalysis.totalNational}</b>
    programas oficiales bajo este mismo Núcleo Académico.
    El nivel de saturación regional concentra mayor oferta en:
    ${data.nbcSimilarAnalysis.topDepartments
        .map(d => `${d.name} (${d.count})`)
        .join(', ')}.
</div>
```

**Lo que hace:** Muestra en una sola oración el nivel de saturación nacional del NBC y los 3 focos geográficos más saturados.

**Por qué esto es crítico para el lector:** Si `totalNational` es un número muy alto (ej. 5.000), la institución está compitiendo en un océano rojo. Si es bajo (ej. 15), está en un nicho. Esta diferencia de percepción puede determinar si se invierte o no en un nuevo programa de ese NBC.

---

### Componente B: Gráfico de Barras — Actores Dominantes en el Núcleo Académico

```html
${data.nbcSimilarAnalysis.topInstitutions.map(inst => `
    <div style="margin-bottom: 12pt;">
        <div style="display:flex; justify-content:space-between; font-size:9.5pt; text-transform:uppercase;">
            <span>${inst.name}</span>
            <span style="font-weight:bold;">${inst.count} programas afines</span>
        </div>
        <div style="background:#e0e0e0; height:14pt; border-radius:3pt; overflow:hidden;">
            <div style="background:#0a1628;
                        width:${Math.min(
                            (inst.count / (data.nbcSimilarAnalysis.topInstitutions[0]?.count || 1)) * 100,
                            100
                        )}%;
                        height:100%;">
            </div>
        </div>
    </div>
`).join('')}
```

**Diferencia visual respecto a la Sección 8:** El color de la barra cambia de `#2E3192` (azul institucional) a `#0a1628` (azul marino oscuro) para que el lector pueda distinguir visualmente que es un análisis de naturaleza diferente (NBC vs. nombre).

**Fórmula del ancho:**
```
ancho (%) = (programas_de_esta_institución / programas_de_la_institución_líder) × 100
```

La institución líder siempre ocupa el 100% como ancla visual. Todo lo demás se escala proporccionalmente.

**Relevancia para el lector:** En NBCs populares como "Administración", el SENA frecuentemente aparece con miles de programas (oferta técnica). Eso no significa que sea un competidor en igualdad de condiciones (es formación técnica vs. universitaria), pero sí indica que el mercado laboral del egresado ya considera ese perfil como un commodity. El lector puede tomar decisiones de diferenciación basado en esto.

---

### Componente C: Tabla — Hermanos Académicos (Top 10 Afinidades NBC)

```html
<div style="page-break-inside: avoid; margin-top: 20pt; margin-bottom: 20pt;">
    <table class="formal-grid">
        <thead>
            <tr style="background:#f2f2f2; font-weight:bold;">
                <td style="width:35%">Programa Académico</td>
                <td style="width:35%">Institución</td>
                <td style="width:15%">SNIES</td>
                <td style="width:15%">Modalidad</td>
            </tr>
        </thead>
        <tbody>
            ${data.nbcSimilarPrograms.map(p => `
                <tr>
                    <td>${clean(p.programa)}</td>
                    <td>${clean(p.institucion)}</td>
                    <td style="text-align:center;">${clean(p.snies)}</td>
                    <td style="text-align:center;">${clean(p.modalidad)}</td>
                </tr>
            `).join('')}
            ${data.nbcSimilarPrograms.length === 0 ? `
                <tr>
                    <td colspan="4" style="text-align:center; padding:20pt; font-style:italic; color:#666;">
                        No hay oferta regional adicional con este mismo NBC.
                        Oportunidad estratégica de monopolio formativo.
                    </td>
                </tr>
            ` : ''}
        </tbody>
    </table>
</div>
```

**Columnas y su justificación:**

| Columna | Campo fuente | Por qué es relevante |
|---|---|---|
| Programa Académico | `p.programa` | Muestra el **nombre real** con el que se está ofertando ese NBC. Puede revelar apuestas creativas de naming ("Gestión de Innovación") que el lector podría considerar adoptar |
| Institución | `p.institucion` | Identifica qué universidad es el "hermano académico". Si es una institución de mayor reputación, el programa analizado compite en desventaja de marca |
| SNIES | `p.snies` | Código único que permite búsqueda directa en el MEN para ver el plan de estudios completo, registro de calidad, y estadísticas históricas del competidor |
| Modalidad | `p.modalidad` | Clave para entender el verdadero nivel de competencia: si todos los hermanos académicos son Virtuales y el programa analizado es Presencial, la competencia real es menor |

**Casos especiales:**
- Si `nbcSimilarPrograms.length === 0`: el programa es el único de su NBC en el país. El PDF muestra el mensaje: *"No hay oferta regional adicional con este mismo NBC. Oportunidad estratégica de monopolio formativo."* — esto es información de alto valor: indica que la institución puede ser el referente nacional de esa disciplina.

**El atributo `page-break-inside: avoid`:** Igual que en la Sección 8, este div envoltorio le ordena al motor de Chrome/Chromium que no parta la tabla a la mitad entre dos páginas. Si la tabla empieza cerca del pie de página, salta completa a la hoja siguiente.

---

### Componente D: Conclusión Estratégica (bloque de cierre)

```html
<div style="margin-top:20pt; padding:15pt; background:#f9f9f9; border-left:4pt solid #2E3192;">
    <p style="font-size:9.5pt; color:#333; line-height:1.4;">
        <b>Conclusión Estratégica:</b> Eliminar las agrupaciones de tablas crudas y adoptar
        visualizaciones de concentración permite a la Alta Dirección identificar rápidamente
        monopolios, competidores fragmentados u oligopolios en el marco educativo nacional,
        facilitando decisiones directas sobre creación, cierre o modificación de programas.
    </p>
</div>
```

Este bloque cierra tanto la Sección 9 como el informe completo, recordándole al lector cómo interpretar los dos análisis (8 y 9) de forma conjunta.

---

## Comparativa Final: Sección 8 vs Sección 9

| Elemento | Sección 8 (Semántica) | Sección 9 (NBC) |
|---|---|---|
| **Criterio de entrada** | Palabras del nombre del programa | Campo `nucleo` del MEN |
| **Universo analizado** | Todos los programas del país | Solo los del mismo NBC |
| **Puede detectar falsos positivos** | Sí (si el nombre es genérico) | No (la clasificación la hizo el MEN) |
| **Puede perder competidores** | Sí (si tienen nombre creativo diferente) | No (el MEN ya los agrupó) |
| **Color de barras** | Azul `#2E3192` | Azul marino `#0a1628` |
| **Suele tener más resultados** | Menor (filtro semántico estricto) | Mayor (abarca toda la disciplina) |
| **Mejor para** | Detección de clones directos | Radiografía de la disciplina completa |

---

## Resumen del Flujo Completo de la Sección 9

```
getPrograms()
        ↓
findNbcSimilar(target, allProgs)
    → Filtra: nucleo === target.nucleo
    → Puntúa: area(+2), detallado(+1), nivel(+1)
    → Ordena: mayor score primero
        ↓
nbcSimilarPrograms         (lista completa, potencialmente miles)
        ↓
buildAnalysis(nbcSimilarPrograms)
    → totalNational: conteo total del NBC
    → topDepartments: top 3 departamentos más saturados
    → topInstitutions: top 10 instituciones con más programas del NBC
        ↓
slice(0, 10)               (los 10 de mayor afinidad para la tabla)
        ↓
reportTemplate.ts          → Dibuja:
                               A) Texto de Radiografía Académica
                               B) Gráfico de barras "Actores Dominantes en el NBC" (azul oscuro)
                               C) Tabla "Hermanos Académicos Top 10"
                               D) Conclusión Estratégica de cierre del informe
```

---

## Notas Técnicas Finales

- **¿Qué pasa si el programa no tiene campo `nucleo`?** La función retornará un arreglo vacío porque ningún otro programa pasará el filtro `p.nucleo === target.nucleo` si `target.nucleo` es `undefined` o vacío. El PDF mostrará el mensaje de oportunidad de monopolio.
- **¿Por qué el SENA aparece tan frecuentemente?** El SENA registra sus programas técnicos y tecnológicos en el SNIES bajo los mismos NBCs que los programas universitarios. Aunque no son competidores directos en estricto sentido académico, su presencia masiva en un NBC indica que ese conocimiento está ampliamente disponible en Colombia, lo cual impacta la percepción del mercado laboral.
- **¿Se podría mostrar más de 10 en la tabla?** Técnicamente sí, solo cambiando `slice(0, 10)` a `slice(0, N)`. Se decidió 10 para mantener el informe conciso y no generar el problema original de 100 páginas de datos crudos.

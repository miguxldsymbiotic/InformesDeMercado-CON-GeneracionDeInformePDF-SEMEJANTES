# Documentación Técnica Completa — Sección 8: Análisis de Programas Semejantes
> **Archivo fuente de datos**: `frontend/src/services/reportService.ts`  
> **Archivo de renderizado**: `frontend/src/services/reportTemplate.ts`  
> **Restricción de arquitectura**: Esta sección NO modifica el backend. Todo el análisis ocurre en el frontend.

---

## ¿Por qué existe esta sección y qué valor le da al lector?

Antes de explicar el código, es importante entender **por qué esta sección es crítica** para quien va a tomar decisiones basado en el informe.

Cuando alguien de la alta dirección de una institución educativa quiere evaluar si debe **abrir, cerrar o modificar un programa académico**, la primera pregunta que se hace no es technical: es estratégica:

> *"¿Cuántas universidades en el país están ofreciendo exactamente lo mismo que nosotros?"*

Si la respuesta es "hay 630 programas idénticos en todo el país, y Uniminuto tiene 95 de ellos", eso cambia completamente la decisión. Significa que hay un competidor dominante con 15 veces más cobertura, y entrar a competir directamente sería un error estratégico sin diferenciación.

La Sección 8 responde exactamente esa pregunta. No con una lista de 630 filas imposible de leer, sino con:
1. Un número claro (total de competidores)
2. Un mapa de poder (quién domina el mercado)
3. Una lista corta de los 10 más relevantes para que el lector pueda actuar

---

## Paso 1: ¿De dónde vienen los datos?

**El backend no tiene un endpoint especial para "programas semejantes".** El endpoint que existe (`/programs` o equivalente) simplemente retorna el catálogo completo de programas académicos registrados a nivel nacional.

En `reportService.ts`, al generar el reporte, se hace una sola llamada extra al maestro de programas:

```typescript
// reportService.ts — línea ~186
const allProgs = await getPrograms();
```

`getPrograms()` descarga el catálogo nacional completo. Cada elemento del arreglo `allProgs` es un objeto con la siguiente estructura (campos relevantes para esta sección):

| Campo | Tipo | Descripción |
|---|---|---|
| `snies` | string | Código único del programa ante el MEN |
| `programa` | string | Nombre oficial del programa académico |
| `institucion` | string | Nombre de la Universidad o IES |
| `departamento` / `departamento_principal` | string | Departamento donde se ofrece |
| `modalidad` | string | `PRESENCIAL`, `VIRTUAL`, `A DISTANCIA` |
| `nivel` | string | `UNIVERSITARIO`, `TECNOLOGICO`, etc. |
| `nucleo` | string | Núcleo Básico del Conocimiento (NBC) del MEN |
| `area` | string | Área de conocimiento padre del NBC |
| `detallado` | string | Área de conocimiento detallada |

Este arreglo puede contener **miles de programas**. No se muestra al lector directamente, se procesa.

---

## Paso 2: El Algoritmo de Similitud Semántica — `findSimilar()`

Esta función es el corazón de la sección 8. Se encuentra en `reportService.ts` y su lógica es la siguiente:

```typescript
const findSimilar = (target: ProgramOption, others: ProgramOption[]) => {
    // PASO A: Palabras a ignorar (artículos, preposiciones, conectores)
    const stopWords = new Set(['de', 'la', 'el', 'en', 'y', 'con', 'para',
                               'o', 'un', 'una', 'del', 'al']);

    // PASO B: Extraer tokens (palabras clave) del nombre del programa objetivo
    const tokens = target.programa.toLowerCase()
        .split(/[\s,.-]+/)               // divide por espacios, comas, puntos, guiones
        .filter(t => t.length > 2        // elimina palabras de 2 letras o menos
               && !stopWords.has(t));    // elimina artículos y conectores

    // PASO C: Comparar contra cada programa del país
    return others
        .filter(p => p.snies !== target.snies)  // excluye el propio programa analizado
        .map(p => {
            const pTokens = p.programa.toLowerCase().split(/[\s,.-]+/);
            // Cuenta cuántas palabras clave del objetivo aparecen en el competidor
            const matches = tokens.filter(t => pTokens.some(pt => pt.includes(t)));
            return { program: p, score: matches.length };
        })
        // PASO D: Filtro de relevancia — mínimo 2 coincidencias
        .filter(res => res.score >= Math.min(tokens.length, 2))
        .sort((a, b) => b.score - a.score)   // ordena de mayor a menor similitud
        .map(res => res.program);             // retorna solo el objeto programa
};
```

### Ejemplo concreto paso a paso

Supongamos que el programa analizado es **"ADMINISTRACIÓN DE EMPRESAS"**.

**PASO B — Tokenización:**
- Texto original: `"administración de empresas"`
- Palabras separadas: `["administración", "de", "empresas"]`
- Filtro stop-words: `"de"` es eliminado
- **Tokens finales:** `["administración", "empresas"]`

**PASO C — Comparación contra el país:**
- Se evalúa el programa `"ADMINISTRACIÓN DE EMPRESAS AGROPECUARIAS"` de otra institución
  - Sus tokens: `["administración", "de", "empresas", "agropecuarias"]`
  - `"administración"` ✅ coincide
  - `"empresas"` ✅ coincide
  - `score = 2`
- Se evalúa el programa `"TECNOLOGÍA EN SISTEMATIZACIÓN DE DATOS"`
  - Sus tokens: `["tecnología", "en", "sistematización", "de", "datos"]`
  - `"administración"` ❌ no coincide
  - `"empresas"` ❌ no coincide
  - `score = 0` → **eliminado**

**PASO D — Corte de relevancia:**
- El umbral mínimo es `Math.min(tokens.length=2, 2) = 2`
- Solo pasan los programas con `score >= 2`
- Resultado: una lista ordenada de competidores directos, del más al menos similar

> **¿Por qué al menos 2 coincidencias?** Porque con 1 sola coincidencia (ej. solo la palabra "administración") se incluirían programas completamente diferentes como "Administración Ambiental" o "Administración Pública", que no son competencia directa. El umbral de 2 garantiza que el nombre comparte la misma identidad temática central.

---

## Paso 3: Limitación del resultado para el PDF

El arreglo resultante de `findSimilar()` puede contener cientos de programas. Traer todos al PDF generaría 100 páginas de tablas ilegibles. Por eso se aplica un corte preciso:

```typescript
// reportService.ts — línea ~263
similarPrograms: similarPrograms.slice(0, 10),
```

Solo los **10 primeros** (los de mayor score semántico) son enviados al PDF. Los demás se procesan estadísticamente (ver Paso 4) pero no se listan individualmente.

---

## Paso 4: Procesamiento Estadístico — `buildAnalysis()`

Antes de descartar el resto de competidores, se procesa la lista completa para extraer estadísticas de utilidad gerencial. Esto se hace en la función `buildAnalysis()`:

```typescript
const buildAnalysis = (progs: ProgramOption[], targetDept: string): SimilarAnalysis => {
    const deptCounts: Record<string, number> = {};
    const instCounts: Record<string, number> = {};

    // Contar ocurrencias por departamento y por institución
    progs.forEach(p => {
        const d = p.departamento_principal || p.departamento;
        if (d) deptCounts[d] = (deptCounts[d] || 0) + 1;
        if (p.institucion) instCounts[p.institucion] = (instCounts[p.institucion] || 0) + 1;
    });

    // Top 3 departamentos con más oferta competidora
    const topDepartments = Object.entries(deptCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    // Top 10 instituciones con más programas semejantes (market share)
    const topInstitutions = Object.entries(instCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalNational: progs.length,    // total de competidores en el país
        topDepartments,                 // concentración geográfica
        topInstitutions,                // dominio de mercado por institución
        localCompetitors: progs.filter(p =>
            (p.departamento_principal || p.departamento) === targetDept)
    };
};
```

### ¿Qué se obtiene exactamente?

| Variable | Contenido | Para qué sirve al lector |
|---|---|---|
| `totalNational` | Número entero. Ej: `630` | Saber qué tan saturado está el mercado. Si hay 630, hay saturación. Si hay 5, hay oportunidad. |
| `topDepartments` | Array de `{name, count}`. Ej: `[{name:"BOGOTA D.C.", count:233}]` | Identificar las regiones donde la competencia es más feroz y dónde hay espacio geográfico libre. |
| `topInstitutions` | Array de `{name, count}`. Ej: `[{name:"UNIMINUTO", count:95}]` | Identificar quién domina el mercado. Si una institución tiene el 40% de la oferta, es el líder al que hay que estudiar. |

---

## Paso 5: Cómo se dibuja en el PDF — `reportTemplate.ts`

Con los datos listos, la plantilla construye 3 componentes visuales dentro de un mismo bloque HTML:

### Componente A: Radiografía Nacional (texto introductorio)

```html
<div class="method-box">
    <strong>Radiografía Nacional:</strong> El algoritmo semántico detectó
    <b>${data.similarAnalysis.totalNational}</b> programas equivalentes en todo el país.
    La competencia geográfica se distribuye principalmente en:
    ${data.similarAnalysis.topDepartments.map(d => `${d.name} (${d.count})`).join(', ')}.
</div>
```

**Lo que hace:** Inyecta `totalNational` y los 3 primeros departamentos directamente en un párrafo de texto. El lector ve, de un vistazo en 2 segundos, el tamaño del mercado competidor y su distribución geográfica.

**Relevancia para el lector:** Si el departamento del programa analizado NO aparece en esa lista de los 3, significa que localmente hay poca competencia. Eso es un dato estratégico enorme: la institución puede ser pionera en su región.

---

### Componente B: Gráfico de Barras Horizontales (Dominio de Mercado)

```html
${data.similarAnalysis.topInstitutions.map(inst => `
    <div style="margin-bottom: 12pt;">
        <div style="display:flex; justify-content:space-between; font-size:9.5pt;">
            <span>${inst.name}</span>
            <span style="font-weight:bold;">${inst.count} programas</span>
        </div>
        <div style="background:#e0e0e0; height:14pt; border-radius:3pt; overflow:hidden;">
            <div style="background:#2E3192;
                        width:${Math.min(
                            (inst.count / (data.similarAnalysis.topInstitutions[0]?.count || 1)) * 100,
                            100
                        )}%;
                        height:100%;">
            </div>
        </div>
    </div>
`).join('')}
```

**La fórmula del ancho de cada barra:**
```
ancho = (programas_de_esta_institución / programas_de_la_institución_líder) × 100%
```

Esto significa que **la institución con más programas siempre ocupará el 100% del ancho** como referencia visual. Las demás instituciones se grafican proporcionalmente. Si el líder tiene 95 programas y la segunda tiene 37, la segunda se verá al `(37/95)*100 = 38.9%` del ancho.

**Relevancia para el lector:** No tiene que leer números ni hacer cálculos mentales. La barra más larga es el líder de mercado de un vistazo. Si muchas barras son casi igual de largas, el mercado está fragmentado (buena noticia: no hay monopolio dominante). Si una barra aplasta a las demás, hay un líder consolidado que conviene estudiar o evitar.

---

### Componente C: Tabla — Directorio de Relevancia (Top 10)

```html
<div style="page-break-inside: avoid; margin-top: 20pt; margin-bottom: 15pt;">
    <table class="formal-grid" style="font-size:8.5pt;">
        <thead>
            <tr>
                <th>Programa Semejante</th>
                <th>Institución</th>
                <th>SNIES</th>
                <th>Modalidad</th>
            </tr>
        </thead>
        <tbody>
            ${data.similarPrograms.map(sp => `
                <tr>
                    <td>${clean(sp.programa)}</td>
                    <td>${clean(sp.institucion)}</td>
                    <td>${clean(sp.snies)}</td>
                    <td>${clean(sp.modalidad)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</div>
```

**Columnas que se muestran y por qué:**

| Columna | Campo fuente | Por qué es relevante |
|---|---|---|
| Programa Semejante | `sp.programa` | Confirma visualmente que el nombre es realmente parecido, no un falso positivo del algoritmo |
| Institución | `sp.institucion` | Identifica al competidor nominalmente para que el decisor pueda investigarlo más |
| SNIES | `sp.snies` | Permite buscar el programa exacto en el SNIES oficial del MEN para obtener datos actualizados |
| Modalidad | `sp.modalidad` | Si el competidor es Virtual y la institución es Presencial, puede no ser competencia directa en la práctica |
| `page-break-inside: avoid` | (CSS) | Evita que la tabla sea partida por el pie de página del PDF, garantizando integridad visual |

---

## Resumen del Flujo Completo

```
getPrograms()              → Descarga catálogo nacional completo (miles de programas)
        ↓
findSimilar(target, all)   → Tokeniza el nombre, compara tokens, filtra por score ≥ 2
        ↓
similarPrograms            → Lista ordenada de competidores (puede ser cientos)
        ↓
buildAnalysis(similarPrograms) → Agrega: totalNational, topDepartments, topInstitutions
        ↓
slice(0, 10)               → Limita a 10 para el PDF (los de mayor score)
        ↓
reportTemplate.ts          → Dibuja:
                               A) Texto de Radiografía Nacional
                               B) Gráfico de barras de market share
                               C) Tabla Top 10 con SNIES y Modalidad
```

---

## Notas Finales

- **¿Por qué no se modificó el backend?** Porque `getPrograms()` ya trae todos los campos necesarios. Añadir un endpoint nuevo de "similares" en FastAPI habría requerido tiempo de servidor, posibles errores de CORS, y un deploy adicional. El análisis client-side es igualmente preciso y más rápido de mantener.
- **¿Qué pasa si no se encuentran semejantes?** La tabla muestra el mensaje: *"No se encontraron programas con suficiente similitud semántica."* Y el gráfico muestra el mensaje: *"No hay datos de competencia suficientes para graficar."* Esto en sí mismo es un hallazgo: el programa es único en el país.
- **¿Se puede mejorar el algoritmo en el futuro?** Sí. Se podría reemplazar el matching por tokens con un embedding vectorial (TF-IDF o similar), pero requeriría una librería adicional y más procesamiento. La versión actual es suficientemente precisa para programas colombianos con nombres estándar del MEN.

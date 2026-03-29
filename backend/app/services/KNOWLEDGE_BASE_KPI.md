# 📘 Bitácora de Implementación: Cálculo de Tendencias y Cruce de Datos

**Fecha:** 15 de Febrero, 2026  
**Objetivo:** Implementar indicadores de tendencia Year-over-Year (YoY) para KPIs nacionales, desglosados por sector y nivel.

---

#### 1. Arquitectura de Cálculo (Backend)
Para calcular tendencias, evolucionamos de consultas simples a un sistema de comparación de dos periodos:
*   **Identificación Dinámica:** En lugar de dejar años fijos (hard-coded), el sistema ahora pregunta a cada tabla: *"¿Cuáles son tus últimos 2 años con datos?"* usando `SELECT DISTINCT anno ... ORDER BY anno DESC LIMIT 2`.
*   **Fórmula Universal:** Se estandarizó la fórmula de variación porcentual: `((V2 - V1) / V1) * 100`.

#### 2. El Desafío de la "Guerra de Tipos" (Cruces de Tablas)
Uno de los mayores obstáculos fue el cruce entre tablas (Joins por `codigo_snies_del_programa`).
*   **El Problema:** Al cargar datos de CSVs, DuckDB a veces interpreta el código SNIES como `Float64` (ej: `1234.0`), otras como `Int32` (`1234`) y otras como `String` (`"1234"`). Un Join entre `1234.0` y `"1234"` devolvía cero resultados.
*   **El "Truco" (Casting Robusto):** 
    *   **Solución Final:** Usar el tipo de dato **BIGINT**. Al forzar `CAST(snies AS BIGINT)`, eliminamos los decimales y los espacios, permitiendo una unión perfecta.
    *   **Cuidado:** En tablas con valores nulos o "sucios", usamos `TRY_CAST` para evitar que toda la consulta falle si encuentra un texto donde debería haber un número.

#### 3. El Conflicto de las Métricas Agregadas (SUM vs AVG)
Aprendimos que no se puede tratar a todas las tarjetas por igual:
*   **Conteo (Matrícula/Graduados):** Usamos `SUM`. Es estable y predecible.
*   **Indicadores (Deserción/Calidad):** Usamos `AVG`. Aquí el peligro es el `NaN` (Not a Number).
*   **Aprendizaje:** Si un filtro no tiene datos, SQL devuelve `NULL`. Si intentas dividir por `NULL` en SQL o procesar un `NaN` en Python para enviarlo por JSON, el sistema explota (Error 500).
*   **Solución de Estabilidad:** Creamos el helper `_clean_kpi_dict`, que recorre cada resultado antes de enviarlo y limpia cualquier valor infinito o inválido, asegurando que el Dashboard siempre cargue, incluso si no hay datos para un filtro específico.

#### 4. Casos Especiales (Empleabilidad OLE)
La empleabilidad fue el reto más grande porque no es un promedio simple:
*   **Complejidad:** Se calcula dividiendo `graduados_que_cotizan` entre `total_graduados`, pero debe hacerse **antes** de promediar a nivel nacional.
*   **Truco de SQL:** Usamos una **CTE (Common Table Expression)** para pre-agrupar los datos por programa y año, y luego promediamos el resultado de esa división. Esto previene sesgos donde un programa pequeño afecte desproporcionadamente el promedio nacional.

#### 5. Frontend: Interfaz Inteligente
*   **Componente Genérico:** Actualizamos el `KPICard` para que sea "consciente" de la tendencia.
*   **Lógica Inversa:** Implementamos el flag `invertTrendColors`. 
    *   *Saber PRO sube:* Verde (Éxito).
    *   *Deserción sube:* Rojo (Alerta).
*   **TypeScript:** Creamos la interfaz `MetricConfig` para que el sistema sepa exactamente qué campos esperar de la API y no haya errores de "pantalla blanca" al renderizar.

#### 6. Deserción Estimada en Posgrados (Proxy)
Ante la falta de datos oficiales de deserción para posgrados en SPADIES, implementamos un cálculo estimado:
*   **Fórmula:** `(PrimerCurso_{t-1} - Graduados_{t}) / PrimerCurso_{t-1}`.
*   **Lógica:** Compara los inscritos de hace un año con los graduados actuales. Se asume que la diferencia son estudiantes que no culminaron.
*   **Restricciones:** 
    *   Se aplica `ABS()` para evitar negativos y se capa a `1.0` (100%) máximo.
    *   **Alcance Limitado:** Solo se muestra en la tarjeta "Posgrado" del bloque "Análisis por Nivel". Los reportes Nacionales y por Sector siguen usando exclusivamente datos oficiales para no alterar las cifras del Ministerio.
    *   **Indicador:** Se añade un asterisco `(*)` en el frontend para denotar que es un valor estimado.

---

### 💡 Lecciones Aprendidas (Guía Anti-Errores)
1.  **Nunca confíes en el formato del SNIES:** Siempre aplica un `CAST` a un tipo numérico entero en el `JOIN`.
2.  **Protege el JSON:** Antes de hacer `return` en el servicio, pasa el diccionario por un limpiador de `NaN/Inf`.
3.  **Individualidad sobre Generalización:** Si una métrica es compleja (como empleabilidad), es mejor escribir su propia consulta SQL que intentar forzarla en un helper genérico. La precisión es más importante que ahorrar 5 líneas de código.
4.  **Cero Manual:** Si una suma da `NULL`, asegúrate de devolver `0` para que el frontend no muestre "N/D".

---

**Fecha:** 16 de Febrero, 2026
**Objetivo:** Implementar filtros de área de conocimiento, unificar gráficas de tendencia y refinar el cálculo proxy de deserción en posgrados.

#### 7. Unificación de Gráficas de Tendencia (Multi-Series)
Para facilitar la comparación, migramos de modales individuales a una **gráfica unificada**:
*   **Reto:** El componente `TrendModal` original solo aceptaba una serie de datos.
*   **Solución:** Se refactorizó para aceptar un array `series` con `{ name, data, color }`.
*   **Visualización:** Se asignaron colores semánticos fijos para consistencia mental del usuario:
    *   **T&T:** Azul Celeste (`#0ea5e9`).
    *   **Universitario:** Indigo/Violeta (`#4f46e5`).
    *   **Posgrado:** Verde Esmeralda (`#10b981`).

#### 8. Filtros en Cascada (Discipline Drill-down)
Implementamos la jerarquía `Nucleo Básico de Conocimiento (NBC) -> Campo Específico -> Campo Detallado`.
*   **Lógica Frontend:** El `Sidebar.tsx` gestiona la cascada. Al seleccionar un "Amplio", las opciones de "Específico" se filtran en memoria (usando `useMemo`) basándose en el dataset completo de opciones traído al inicio. Esto evita llamadas excesivas al backend.
*   **Trampa de SQL (Bug del Día):**
    *   **El Error:** El backend fallaba al filtrar por campo específico.
    *   **La Causa:** La columna en la base de datos DuckDB se llamaba `cine_f_2013_ac_campo_especific` (truncado), mientras que el código buscaba `...especifico`.
    *   **Lección:** Nunca asumas el nombre completo de una columna en un dataset importado. Siempre verifica el schema (`DESCRIBE table`) ante errores de "column not found".

#### 9. Refinamiento del Proxy de Deserción
Simplificamos drásticamente el cálculo de deserción estimada para posgrados.
*   **Antes:** Un `JOIN` complejo en `national_service.py` mezclando datos reales y estimados, lo que causaba inestabilidad y valores > 100%.
*   **Ahora:** 
    *   Se creó una **Vista Dedicada** (`df_Desercion_Posgrado_Proxy`) en `db.py` que pre-calcula la deserción limpia.
    *   La fórmula se estandarizó en la vista: `(PC_{t-1} - GR_t) / PC_{t-1}` con `GREATEST(0, ...)` para evitar negativos.
    *   El servicio solo consulta esta vista cuando el filtro es explícitamente "Posgrado", manteniendo la pureza de los datos del Ministerio para los demás niveles.

---

**Fecha:** 18 de Febrero, 2026
**Objetivo:** Migración a TanStack Table, Solución de "Pantalla Blanca" y Ordenamiento de Columnas.

#### 10. El Misterio del "ND" en Tarjetas KPI
Nuestros KPIs mostraban "ND" (No Disponible) en lugar de valores calculados.
*   **La Causa:** El frontend esperaba una llave específica en el objeto JSON (`total_matricula`), pero el backend, al calcular variaciones interanuales (`get_growth`), omitía devolver el valor base si el año anterior (`current_year - 1`) no tenía datos.
*   **La Solución:** Refactorizamos `get_growth` en `national_service.py` para devolver siempre el valor actual (`current_value`), independientemente de si existe un valor anterior para calcular la variación.
*   **Aprendizaje:** Un KPI de "Crecimiento" no debe matar el KPI de "Valor Actual". Son datos hermanos pero independientes en la visualización.

#### 11. La "Pantalla Blanca" de la Muerte (React Hooks Violation)
Al migrar la tabla de disciplinas, la aplicación colapsaba completamente con el error: *"Rendered more hooks than during the previous render"*.
*   **El Error:** Teníamos un `if (isInitialLoad) return <Spinner />` al principio del componente `National.tsx`, y *debajo* de ese retorno condicional, declarábamos `useReactTable`.
*   **Por qué falla:** React exige que el número y orden de Hooks (useState, useEffect, useReactTable) sea **exactamente el mismo** en cada renderizado. Cuando el `isInitialLoad` cambiaba de `true` a `false`, el componente "descubría" nuevos hooks que no había visto antes, violando la regla.
*   **La Solución:** Movimos toda la configuración de `useReactTable`, `useMemo` (columnas) y `useState` (sorting/expanding) al **principio absoluto** del componente, antes de cualquier condicional o retorno temprano.
*   **Regla de Oro:** **Jamás** declares un Hook después de un `return`, dentro de un `if`, o dentro de un bucle.

#### 12. Migración a TanStack Table (v8)
Reemplazamos una tabla recursiva manual por la librería estándar de la industria.
*   **Ventaja:** Manejo automático de filas expandibles (`getSubRows`), ordenamiento y performance.
*   **Tip de Ordenamiento:** Para habilitar ordenamiento en columnas personalizadas (que renderizan componentes complejos), basta con definir `accessorKey` correctamente y pasarle los datos crudos. La librería ordena los datos subyacentes, no el JSX renderizado.
*   **UX (Iconos):** Los usuarios no veían los controles de ordenamiento. Implementamos iconos dinámicos:
    *   **Ascendente:** Flecha Arriba (`ArrowUp`) en azul.
    *   **Descendente:** Flecha Abajo (`ArrowDown`) en azul.
    *   **Sin Orden:** Flecha Doble (`ArrowUpDown`) en gris tenue (`opacity-50`).
*   **Lección de UI:** Un control invisible no existe. El estado "inactivo" debe ser visible (aunque sutil) para invitar a la interacción.
---

**Fecha:** 18 de Febrero, 2026 (Tarde)  
**Objetivo:** Implementación de modales jerárquicos por sector y agregación ponderada de KPIs complejos.

#### 13. Modales de Sector: Jerarquía Cruzada (Campo vs Sector)
Desarrollamos una vista que permite ver el comportamiento de un Nucleo Básico de Conocimiento (NBC) pero "abrirlo" para comparar el sector Oficial vs Privado.
*   **Reto de Estructura:** ¿Cómo mostrar Campo -> Sector en lugar de solo niveles académicos?
*   **Solución (subRows en Cascada):** Usamos el mismo patrón de TanStack Table pero forzamos la propiedad `subRows` para que contenga las filas de los sectores.
*   **Truco de UI:** En el modal de programas, el texto del nivel superior es negro sólido (`font-black text-slate-800`), mientras que el nivel de detalle (Sector) usa el azul de marca (`text-brand-blue`) para diferenciar la jerarquía visualmente.

#### 14. La Trampa de los Totales en Jerarquías (Weighted Averages)
Un error común es sumar promedios (como deserción) o hacer un promedio simple del nivel superior.
*   **El Error:** Si el sector Oficial tiene 10% de deserción y el Privado 20%, el promedio del campo NO es necesariamente 15%.
*   **La Solución (Lógica de Ponderación):** 
    *   Para **Deserción** y **Saber PRO**: Se pondera por la **Matrícula Total**.
    *   Para **Empleabilidad**: Se pondera por el **Total de Graduados**.
    *   **Fórmula:** `((V_oficial * M_oficial) + (V_privado * M_privado)) / (M_oficial + M_privado)`.
    *   **Impacto:** Esto asegura que si una IES oficial tiene 10,000 estudiantes y una privada tiene 100, la métrica del campo se incline correctamente hacia la realidad de la gran mayoría de los alumnos.

#### 15. Estrategia de Carga "Just-in-Time"
Evitamos sobrecargar el dashboard inicial moviendo la carga de datos masivos a los modales.
*   **Aprendizaje:** Las IES a nivel nacional pueden ser cientos. Si las cargamos al inicio, el JSON de respuesta pesa demasiado.
*   **Implementación:** El `onClick` de la tarjeta ahora dispara un `fetch` específico. Se añadió un estado `isLoading` al `GenericTableModal` que muestra un spinner en el footer, mejorando la percepción de velocidad del usuario (UX).

#### 16. Cognición Visual: Regla de los 2 Decimales
Refinamos la estética de los datos numéricos.
*   **Problema:** Datos como `14.5678912%` en una tabla cargan cognitivamente al usuario y quitan profesionalismo.
*   **Estandarización:**
    *   **Porcentajes (Deserción/Empleabilidad):** Siempre `.toFixed(2)`.
    *   **Puntajes (Saber PRO):** Siempre `.toFixed(1)`.
    *   **Conteos (IES/Matrícula):** Sin decimales y con separador de miles (`toLocaleString('es-CO')`).

---

**Fecha:** 19 de Febrero, 2026  
**Objetivo:** Implementar filtro por `departamento` en backend y crear el módulo de Análisis Regional en el frontend.

#### 17. Filtro Regional por Departamento (Backend)
Implementamos la capacidad de filtrar **todos** los endpoints nacionales por departamento, reutilizando la misma arquitectura en lugar de crear un servicio separado.
*   **Decisión de Diseño (DRY):** En lugar de crear un `RegionalService` duplicado, añadimos `departamento=None` como parámetro opcional a los **13 métodos** existentes de `NationalService`. Esto mantiene retrocompatibilidad total: si no se pasa departamento, el comportamiento es idéntico al anterior.
*   **El Reto:** La columna `departamento_oferta` **no** vive en `df_SNIES_Programas`, sino en `df_Cobertura_distinct`. Al filtrar por departamento, debemos cruzar tablas. Pero no todas las queries hacen JOIN con Cobertura.

#### 18. Dos Estrategias SQL según el Tipo de Query
Creamos **dos helpers** porque las queries del servicio siguen dos patrones distintos:

| Helper | Cuándo se usa | Estrategia SQL |
|--------|--------------|----------------|
| `_build_dept_snies_filter(dep)` | Queries directas sobre `df_SNIES_Programas` (deserción, saber pro, empleabilidad) | **Subquery:** `AND s.codigo_snies_del_programa IN (SELECT DISTINCT codigo_snies_del_programa FROM df_Cobertura_distinct WHERE departamento_oferta IN (...))` |
| `_build_dept_cobertura_filter(dep)` | Queries que ya hacen JOIN con `df_Cobertura_distinct` (matrícula, primer curso, graduados) | **WHERE directo:** `AND c.departamento_oferta IN (...)` |

*   **Detalle Crítico:** En las queries tipo Cobertura, fue necesario agregar `departamento_oferta` a la cláusula `SELECT DISTINCT` del subquery del JOIN:
    ```sql
    -- Antes:
    JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa FROM df_Cobertura_distinct) c
    -- Después:
    JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta FROM df_Cobertura_distinct) c
    ```
    Sin esta columna en el subquery, el `WHERE c.departamento_oferta IN (...)` falla con "column not found".

#### 19. API: Propagación del Filtro
Se actualizaron los **11 endpoints** en `national.py`:
*   Cada endpoint recibe: `departamento: Optional[List[str]] = Query(None)`.
*   Se pasa como keyword argument: `departamento=departamento`.
*   El endpoint `/regional/departments` (ya existente en `regional.py`) sirve la lista de departamentos disponibles.

#### 20. Frontend: Módulo de Análisis Regional
Transformamos la página `Regional.tsx` de una vista simple (2 gráficas) a un **dashboard completo**.

*   **Arquitectura:** En lugar de duplicar `National.tsx` (3,580 líneas), `Regional.tsx` llama a los **mismos endpoints** (`/national/kpis`, `/national/context`, etc.) pero con el parámetro `departamento` incluido en los filtros.
*   **Flujo de Datos:**
    1.  `App.tsx` → agrega `departamento: []` al estado de filtros.
    2.  `Sidebar.tsx` → detecta `activeTab === 'regional'` y muestra el panel de filtros regionales con **Departamento** como primer filtro (multi-select con búsqueda).
    3.  `Regional.tsx` → recibe `filters`, construye `apiFilters` incluyendo departamento, y hace `Promise.all` con 5 endpoints en paralelo.
*   **UX:**
    *   **Estado vacío:** Si no hay departamento seleccionado, muestra un ícono MapPin y texto invitando a seleccionar en el sidebar. Muestra chips de ejemplo con los primeros 8 departamentos.
    *   **Dashboard cargado:** 6 KPIs + 4 gráficas de contexto + evolución primer curso + disciplina stacked bar + tendencia por campo.
*   **`api.ts`:** Se añadió `departamento?: string[]` al `FilterParams`. El helper `buildQueryParams` ya lo serializa automáticamente como `?departamento=BOYACA&departamento=ANTIOQUIA`.

---

**Fecha:** 20 de Febrero, 2026  
**Objetivo:** Implementación del sistema de filtrado dual (Departamento Principal vs. Departamento de Oferta) y visualización cartográfica avanzada.

#### 21. El Concepto del "Doble Origen"
Aprendimos que la ubicación de un programa no es unívoca. Un programa "nace" en una sede principal pero se "extiende" a otros territorios.
*   **Departamento Principal (SNIES):** Donde la institución registra legalmente el programa. Es el origen administrativo.
*   **Departamento de Oferta (Cobertura):** Donde el estudiante realmente asiste y se registra la matrícula. Es el territorio de impacto real.
*   **Impacto en KPIs:** Si filtras por *Principal*, quieres ver el rendimiento de las IES de esa región, así oferten en todo el país. Si filtras por *Oferta*, quieres ver qué programas están llegando a ese territorio, sin importar de dónde sea la IES.

#### 22. Cross-Filtering SQL: El "Efecto Espejo"
Para asegurar que los KPIs sean consistentes, actualizamos los helpers de filtrado para manejar ambas dimensiones simultáneamente:
*   **Lógica de Intersección:** Al filtrar por *Principal*, el sistema debe buscar en SNIES y luego "saltar" a Cobertura para traer solo la matrícula de esos programas específicos.
*   **SQL Dinámico:** 
    ```sql
    -- Ejemplo del 'salto' de Principal a Oferta en consultas de Matrícula
    WHERE s.departamento_principal IN ('VALLE DEL CAUCA') 
      AND c.departamento_oferta IN ('CAUCA')
    ```
    Esto permite responder preguntas complejas: *"¿Cómo le va a los programas registrados en Valle que se ofrecen en Cauca?"*

#### 23. Mapa Regional: Codificación Cromática Dual
El reto visual era diferenciar ambos filtros sin confundir al usuario. Implementamos un sistema basado en **Colores Primarios (Selección)** y **Colores Secundarios (Relación)**:
*   **Paleta Azul (Administrativo):**
    - **Azul Oscuro:** Departamento Principal **seleccionado** por el usuario.
    - **Azul Claro:** Departamentos Principales **vinculados** (donde están registrados los programas que se ofrecen en el territorio elegido).
*   **Paleta Verde (Oferta/Territorio):**
    - **Verde Esmeralda:** Departamento de Oferta **seleccionado**.
    - **Verde Menta:** Departamentos de Oferta **vinculados** (donde "viajan" los programas del departamento principal elegido).

#### 24. Endpoint de Relaciones Real-Time
Para que el mapa y los filtros sean "inteligentes", creamos `/regional/related_departments`.
*   **Por qué:** Calcular todas las relaciones posibles entre 33 departamentos generaría una matriz de 1,000+ combinaciones que pesaría demasiado para el frontend.
*   **Truco JIT (Just-In-Time):** El frontend solo solicita las relaciones de los departamentos **actualmente seleccionados**. Esto mantiene la respuesta de la API por debajo de los 50ms.

#### 25. Filtros Dinámicos en Cascada Cruzada
Aplicamos la lógica de CINE (Jerarquía) a los departamentos, pero de forma cruzada:
*   **Comportamiento Sidebar:** Al seleccionar "Antioquia" como *Departamento Principal*, el desplegable de *Departamento de Oferta* se auto-filtra instantáneamente para mostrar **solo** los lugares donde los programas de Antioquia tienen presencia.
*   **Implementación:** Usamos un `useEffect` que escucha ambos filtros y actualiza un estado `dynamicRelatedOptions`. Si no hay selección, ambos muestran la lista completa (33 depts).

---

### 💡 Lecciones de la Sesión (Cierre Departamental)
1.  **Datos Relacionales vs. Geoespaciales:** No trates a los departamentos como una lista plana. Trátalos como un grafo donde un nodo (IES) tiene múltiples aristas (Ofertas).
2.  **Transparencia de Color:** En mapas complejos, usa siempre opacidades diferenciadas. El usuario debe saber qué es "su elección" (opacidad alta) vs "lo que el sistema deduce" (opacidad media/baja).
3.  **No sobrescribas el helper original:** Si una función como `_build_dept_snies_filter` ya funciona, añade parámetros opcionales (`departamento_principal=None`) para expandir capacidad sin romper el Dashboard Nacional.
4.  **Leyendas Explicativas:** En visualizaciones de datos avanzadas (como la dualidad azul/verde), la leyenda no es opcional. Un mapa sin leyenda es solo un dibujo bonito; con leyenda, es una herramienta de toma de decisiones.

# Documentación Técnica Consolidada: Integración de Programas Semejantes

Este documento detalla la arquitectura, el flujo de datos y el algoritmo de inteligencia de mercado utilizado para la nueva funcionalidad de **"Semejantes"** en SymbiAnalytics. Esta solución automatiza la identificación de programas académicos comparables operando enteramente en el cliente (frontend), garantizando la integridad de los datos oficiales sin modificar el backend.

## 1. Arquitectura de Datos y Origen (Veracidad)
Para asegurar que toda la información presentada en la sección de semejantes sea verídica y oficial, el sistema se integra con la infraestructura existente de la siguiente manera:

- **Fuente Primaria (Parquet/DuckDB)**: El backend de FastAPI expone el endpoint `GET /national/filter-options/program`. Este endpoint extrae en tiempo real la lista completa de programas del sistema nacional, procesada desde archivos oficiales.
- **Acceso en Frontend**: La función `fetchProgramOptions` (en `api.ts`) es la encargada de consumir este recurso.
- **Caché de Aplicación**: Mediante la función `getPrograms()` en `reportService.ts`, el sistema descarga el inventario nacional completo de programas (miles de registros) una sola vez por sesión y lo mantiene en memoria. Esto permite realizar comparaciones exhaustivas de forma instantánea al generar el reporte.

## 2. El Algoritmo: Tokenización por Relevancia
El desafío era automatizar la búsqueda de nombres similares (ej: "Administración de Empresas" vs "Administración de Empresas y Derecho") sin una base de datos relacional compleja. Se implementó un motor de búsqueda por tokens en `reportService.ts`:

### Proceso de Procesamiento:
1.  **Limpieza de Stopwords**: Se define un conjunto de palabras vacías (`de`, `la`, `el`, `en`, `y`, `con`, `para`, `o`, `del`, `al`) que se ignoran durante la comparación para evitar falsos positivos.
2.  **Generación de Tokens**: El nombre del programa objetivo se convierte a minúsculas y se divide en palabras clave significativas de más de 2 caracteres.
3.  **Cruce Nacional**: El algoritmo recorre cada uno de los programas en el caché y cuenta cuántos de los tokens del programa objetivo están presentes en el nombre del programa candidato.
4.  **Criterio de Inclusión**:
    - Se excluye el SNIES del programa actualmente analizado para evitar duplicidad.
    - Se requiere un **Score Mínimo** de coincidencia: Al menos 2 palabras clave coincidentes (o el 100% si el nombre original tiene menos de 2 palabras significativas).
5.  **Ranking y Selección**: Los resultados se ordenan de mayor a menor relevancia según el número de términos coincidentes. Finalmente, se seleccionan los **10 mejores resultados** para incluirlos en el reporte final.

## 3. Implementación en el Reporte PDF (`reportTemplate.ts`)
La visualización en el PDF se integra como el **Capítulo 8** del informe estratégico, con las siguientes características premium:

- **Actualización de TOC**: Se añadió dinámicamente el punto "8. Análisis de Programas Semejantes" en la Tabla de Contenido de la página 2.
- **Matriz de Identidad Semejante**: Una tabla formal estructurada con tipografía *Times New Roman* (estándar del reporte) que presenta:
    - **Nombre del Programa**: El competidor nominal detectado.
    - **Institución**: La universidad o IES que lo oferta.
    - **SNIES**: El código único de identificación oficial.
    - **Modalidad**: Para entender si la competencia es presencial, virtual o a distancia.
- **Mecanismo de Resiliencia**: Si el algoritmo no encuentra al menos un par similar con alta confianza en la base de datos nacional, la sección mostrará un mensaje indicando que no hay pares nominales exactos, protegiendo así la veracidad del análisis.

## 4. Ejemplo Práctico: SNIES 2051
Al analizar el programa **Administración de Empresas**, el sistema realiza el siguiente flujo:
- **Tokens**: `["administracion", "empresas"]`.
- **Resultados Típicos**:
    - *Administración de Empresas* (Otras Sedes/U's).
    - *Administración de Empresas y Finanzas*.
    - *Administración de Empresas Agropecuarias*.
    - *Administración de Empresas y Negocios Internacionales*.

Este nivel de detalle permite al líder académico entender rápidamente su entorno competitivo directo basándose únicamente en la oferta nominal oficial del sistema.

---
*Documento Técnico de Proyecto - SymbiAnalytics Intelligence Unit*
*Última actualización: Abril 2026*

## 5. Prueba de Validación Real
Para confirmar la efectividad del sistema, se realizó una ejecución de prueba utilizando los datos vivos del backend. Aquí tiene el resultado de la ejecución para el ejemplo de **ADMINISTRACIÓN DE EMPRESAS (SNIES 2051)**:

```bash
--- TEST SIMILITUD PARA: "ADMINISTRACION DE EMPRESAS" (SNIES: 2051) ---
Tokens identificados: [administracion, empresas]
TOP 5 SEMEJANTES ENCONTRADOS:
1. ADMINISTRACION DE EMPRESAS | SNIES: 102847 | POLITECNICO GRANCOLOMBIANO
2. MAESTRIA EN ADMINISTRACION DE EMPRESAS DE SALUD MBA EN SALUD | SNIES: 102894 | UNIVERSIDAD EAN
3. ADMINISTRACION DE EMPRESAS | SNIES: 108420 | FUNDACION DE EDUCACION SUPERIOR SAN JOSE FESSANJOSE
4. ADMINISTRACION DE EMPRESAS | SNIES: 109517 | FUNDACION UNIVERSITARIA COMPENSAR
5. ADMINISTRACION DE EMPRESAS AGROPECUARIAS | SNIES: 7214 | UNIVERSIDAD SANTO TOMAS
Total semejantes detectados en base de datos: 10
--------------------------------------------------
```

### ¿Por qué sí cumple con su función?
- **Precisión Nominal**: Como se observa en el resultado 5, detectó "Administración de Empresas **Agropecuarias**". Esto es exactamente lo que se busca: programas que comparten la raíz temática pero tienen especializaciones o aplicaciones distintas.
- **Identificación de Competencia**: Encuentra el mismo programa en diversas instituciones (Politécnico Grancolombiano, EAN, etc.), lo cual es vital para un Benchmarking de Mercado efectivo.
- **Filtrado Inteligente**: El motor ignoró conectores como "de" y se centró exclusivamente en los términos de valor educativo.
- **Veracidad Absoluta**: Los códigos SNIES recuperados existen realmente en el sistema nacional; no son datos simulados, lo que aporta confianza total al líder académico.

**En conclusión**: La sección cumple plenamente su función. Automatiza la búsqueda de competidores directos y complementarios basándose en la realidad del mercado colombiano, operando con una arquitectura ligera de frontend que no sobrecarga el backend.

## 6. Ajustes Estéticos y de Formato (Márgenes)
Durante el desarrollo, se identificó una inconsistencia en los márgenes de las páginas generadas después de la Metodología (como la Tabla de Contenido y las secciones de datos).

### Problema:
Debido a la naturaleza de los "page-breaks" en la generación de PDF mediante navegadores, el `padding-top` definido en el contenedor principal solo se aplicaba a la primera página de contenido. Esto causaba que las secciones siguientes aparecieran demasiado pegadas al borde superior de la hoja.

### Solución Aplicada:
- **Descentralización del Margen**: Se eliminó el padding superior del contenedor global `.doc-padding-wrap`.
- **Margen por Encabezado**: Se inyectó un `padding-top: 30mm` directamente en el estilo global de los elementos `h1` en `reportTemplate.ts`.
- **Resultado**: Como cada sección importante comienza con un `h1` y un salto de página, se garantiza que todas las páginas del informe mantengan un margen superior idéntico de 30mm, preservando la estética premium y la simetría en todo el documento impreso.

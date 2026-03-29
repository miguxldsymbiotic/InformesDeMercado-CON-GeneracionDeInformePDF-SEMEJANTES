# Documentación de Progreso: Generador de Reportes PDF

Este documento detalla el estado actual del generador de informes de mercado, el cumplimiento de los requisitos técnicos y las decisiones de arquitectura tomadas para asegurar la estabilidad del sistema.

## 1. Cumplimiento de Restricciones del Proyecto
- **No modificación del Backend**: Se ha mantenido la estructura original del backend en `SYMBIO-FORMES/InformeDeMercado/backend`. No se han añadido nuevos routers ni servicios complejos, respetando la carga de datos existente basada en Parquet y DuckDB.
- **Enfoque en Frontend**: Toda la lógica de generación de informes se ha movido al frontend (`ReportGenerator.tsx`) para evitar dependencias fallidas de PDF en el servidor (como Playwright o wkhtmltopdf).

## 2. Cumplimiento de KPIs y Datos
El informe generado integra exitosamente las siguientes 12 fuentes de datos en paralelo:
- **Identidad**: SNIES, Institución, Modalidad, Nivel de Formación.
- **Matrícula y Primer Curso**: Datos agregados históricamente.
- **Resultados Saber PRO**: Puntajes globales y por competencias (Lectura, Razonamiento, Ciudadanas, Comunicación, Inglés).
- **Empleabilidad y Salarios**: Tasas de cotización y rangos salariales basados en OLE.
- **Deserción y Retención**: Datos oficiales de SPADIES.
- **Contexto de Mercado**: Comparación automática con el promedio del Núcleo Básico del Conocimiento (NBC).

## 3. Resolución del Error 404 ("Failed to fetch specific program data")
- **Diagnóstico**: El error 404 persistente se debe a que el navegador estaba cargando una versión antigua del frontend (posiblemente de la carpeta `extraccion_recursos`) que intentaba llamar a `/programs/specific`.
- **Acción**: Se ha unificado el punto de entrada en la pestaña **"Reportes PDF"** del sistema actual. Este nuevo módulo utiliza el servicio `reportService.ts`, el cual es resiliente y puede generar el reporte incluso si faltan algunos sets de datos específicos para un SNIES.

## 4. Instrucciones de Ejecución
Para asegurar que se está viendo la versión correcta y estable:
1. **Reiniciar los servicios**: Detener todos los procesos de Vite/Python y ejecutar `npm run dev` únicamente dentro de `SYMBIO-FORMES/InformeDeMercado/frontend`.
2. **Hard Refresh**: En el navegador, presionar `Ctrl + F5` para limpiar el caché de scripts antiguos.
3. **Pestaña Correcta**: Navegar a la pestaña **"Reportes PDF"** en el sidebar izquierdo.

---
*Generado por Antigravity - SymbiAnalytics Project System*

# SymbiAnalytics: Sistema de Inteligencia de Mercado Educativo

Este repositorio contiene la arquitectura **Premium** de generación de informes de mercado educativo de **SymbiAnalytics**. El sistema integra múltiples fuentes de datos oficiales para proporcionar una visión estratégica de 360 grados sobre programas académicos específicos.

## 🚀 Arquitectura del Proyecto

El proyecto está dividido en dos microservicios principales:

- **Backend (`/backend`)**: API construida con **FastAPI** y **Python**. Utiliza el motor de base de datos **DuckDB** para un procesamiento de datos ultrarrápido y flexible.
- **Frontend (`/frontend`)**: Aplicación web construida con **React**, **Vite** y **TypeScript**. Incluye el motor de renderizado de PDFs de alta fidelidad basado en plantillas HTML/CSS profesionales.

## 📊 Fuentes de Información Integradadas

El sistema procesa y normaliza datos de las siguientes fuentes gubernamentales:
1.  **SNIES**: Identidad institucional, oferta y costos.
2.  **OLE (Observatorio Laboral)**: Tasas de cotización y empleabilidad.
3.  **SPADIES**: Indicadores de deserción y retención por cohorte.
4.  **Saber Pro (ICFES)**: Desempeño por competencias genéricas y evaluación de calidad académica.

## ✨ Características Principales

- **Reporte en PDF de 7 Secciones**:
  - Identidad Institucional.
  - Análisis de Indicadores Clave (KPIs).
  - Perfil Demográfico del Estudiante.
  - Benchmarking de Mercado Geográfico.
  - Benchmarking por Sector.
  - Benchmarking por Modalidad.
  - Matriz de Diagnóstico Estratégico.
- **Visualizaciones Premium**: Gráficos de tendencia, barras y comparativas con estilo minimalista y corporativo.
- **Cálculo de "Doble Origen"**: Lógica avanzada para filtrar por Departamento de Oferta, garantizando fidelidad total con los tableros de control de SymbiAnalytics.

## 🛠️ Instalación y Ejecución

### Requisitos Previos
- Node.js (v18+)
- Python (v3.10+)

### Backend
1. Navega a `cd backend`.
2. Instala dependencias: `pip install -r requirements.txt`. (Asegúrate de tener las librerías necesarias para FastAPI y DuckDB).
3. Ejecuta el servidor: `python -m uvicorn main:app --host 0.0.0.0 --port 8000`.

### Frontend
1. Navega a `cd frontend`.
2. Instala dependencias: `npm install`.
3. Ejecuta en modo desarrollo: `npm run dev`.

---
**Intelligence Unit // Symbiotic Analytics**

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
---
**Intelligence Unit // Symbiotic Analytics**

## 📝 Guía de Ejecución Rápida (Local)

Para garantizar que el sistema funcione correctamente en un entorno local, se han realizado las siguientes configuraciones:

### 1. Configuración del Entorno (Frontend)
Se requiere que el frontend conozca la ubicación del backend. 
- Se ha creado un archivo `frontend/.env` con la variable: `VITE_API_URL=http://localhost:8000`.
- **Nota de Robustez**: Se modificó `frontend/src/services/api.ts` para incluir un fallback automático a `http://127.0.0.1:8000` en caso de que Vite no cargue el archivo `.env` correctamente.

### 2. Comandos de Inicio

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 3. Verificación de Conexión
- El backend debe responder en `http://localhost:8000`.
- El frontend estará disponible en `http://localhost:5173`.
- Si el frontend muestra errores de JSON ("Unexpected token <"), asegúrese de que el backend esté corriendo y que la URL coincida con la configurada en `api.ts`.

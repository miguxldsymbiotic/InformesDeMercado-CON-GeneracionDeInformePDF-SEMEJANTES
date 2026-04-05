# SymbiAnalytics — Sistema de Inteligencia de Mercado Educativo

> Motor de análisis estratégico y generación de informes PDF de alta fidelidad para programas académicos colombianos, basado en datos del SNIES, OLE, SPADIES y Saber Pro.

---

## ⚠️ Antes de empezar — Lee esto primero

Este proyecto tiene **dos servicios independientes** que deben correr al mismo tiempo en tu computador:

1. **El Backend** (Python / FastAPI) — el servidor de datos que vive en el puerto `8000`
2. **El Frontend** (React / Vite) — la interfaz de usuario que vive en el puerto `5173`

**Si arrancas solo uno de los dos, la aplicación NO funcionará.**

Ambos deben estar corriendo en paralelo en dos terminales separadas. Sigue esta guía en orden y no te saltarás ningún paso.

---

## 📋 Requisitos del Sistema

Antes de clonar o ejecutar el proyecto, asegúrate de tener instalado lo siguiente en tu computador:

| Herramienta | Versión mínima | Cómo verificar | Dónde descargar |
|---|---|---|---|
| **Python** | 3.10 o superior | `python --version` | https://www.python.org/downloads/ |
| **Node.js** | 18 o superior | `node --version` | https://nodejs.org/en/download |
| **npm** | 9 o superior (viene con Node.js) | `npm --version` | — (viene con Node.js) |
| **Git** | Cualquier versión reciente | `git --version` | https://git-scm.com/downloads |

> **Nota para Windows:** Al instalar Python, marca la casilla **"Add Python to PATH"** durante la instalación. Sin esto, los comandos `python` y `pip` no funcionarán desde la terminal.

---

## 🗂️ Estructura del Proyecto

Una vez clonado, el proyecto tendrá esta estructura:

```
InformesDeMercado-CON-GeneracionDeInformePDF/
│
├── backend/                        ← Servidor de datos (FastAPI + DuckDB)
│   ├── app/                        ← Lógica de los endpoints de la API
│   │   └── api/
│   │       ├── national.py         ← Endpoints de análisis nacional
│   │       └── regional.py         ← Endpoints de análisis regional
│   ├── data/                       ← ⚠️ Archivos .parquet con los datos del MEN
│   │   ├── df_SNIES_Programas.parquet
│   │   ├── df_Matricula_agg.parquet
│   │   ├── df_Graduados_agg.parquet
│   │   ├── df_SPADIES_Desercion.parquet
│   │   ├── df_OLE_Movilidad.parquet
│   │   ├── df_SaberPRO_mean.parquet
│   │   └── ... (otros archivos de datos)
│   ├── main.py                     ← Punto de entrada del backend
│   └── requirements.txt            ← Dependencias de Python
│
├── frontend/                       ← Interfaz de usuario (React + Vite)
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.ts              ← Conexión con el backend
│   │   │   ├── reportService.ts    ← Motor de análisis y construcción de datos del informe
│   │   │   └── reportTemplate.ts  ← Plantilla HTML/CSS del PDF
│   │   └── ...
│   ├── public/                     ← Logos e imágenes públicas del PDF
│   ├── .env                        ← Variable de entorno con la URL del backend
│   └── package.json                ← Dependencias de Node.js
│
├── DOCUMENTACION_SECCION_8.md      ← Documentación técnica del análisis semántico
├── DOCUMENTACION_SECCION_9.md      ← Documentación técnica del análisis NBC
├── CONTEXTO_BACKEND_Y_FRONTEND.md  ← Guía de arquitectura general
└── README.md                       ← Este archivo
```

---

## 🚀 Guía de Instalación y Ejecución Paso a Paso

### PASO 1 — Clonar el repositorio

Abre una terminal (PowerShell en Windows, Terminal en Mac/Linux) y ejecuta:

```bash
git clone <URL_DEL_REPOSITORIO>
cd InformesDeMercado-CON-GeneracionDeInformePDF
```

> Reemplaza `<URL_DEL_REPOSITORIO>` con la URL real de GitHub.

---

### PASO 2 — Configurar y arrancar el Backend

**Abre una terminal nueva** (esta se quedará corriendo, no la cierres):

```bash
cd backend
```

#### 2a. (Recomendado) Crear un entorno virtual de Python

Un entorno virtual aísla las dependencias del proyecto para no interferir con otros proyectos de Python en tu computador:

```bash
# Crear el entorno virtual
python -m venv venv

# Activarlo en Windows (PowerShell)
venv\Scripts\activate

# Activarlo en Mac / Linux
source venv/bin/activate
```

Sabrás que está activo porque verás `(venv)` al inicio de tu línea de comandos.

> Si no quieres usar entorno virtual, puedes saltarte este paso e instalar las dependencias directamente. No es obligatorio, pero es buena práctica.

#### 2b. Instalar las dependencias de Python

```bash
pip install -r requirements.txt
```

Esto instalará las siguientes librerías:
- `fastapi` — el framework del servidor web
- `uvicorn` — el servidor ASGI que ejecuta FastAPI
- `polars` — librería de DataFrames de alto rendimiento
- `duckdb` — motor de base de datos analítica en memoria
- `python-multipart` — soporte para formularios
- `pyarrow` — lectura de archivos `.parquet`

La instalación puede tardar 1-3 minutos dependiendo de tu conexión a internet.

#### 2c. Iniciar el servidor del Backend

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Si todo está bien, verás algo como esto en la terminal:

```
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**✅ Verifica que funciona:** Abre tu navegador y ve a `http://localhost:8000`. Deberías ver:
```json
{"message": "Welcome to SNIES Dashboard API"}
```

**⚠️ NO cierres esta terminal.** El backend debe seguir corriendo.

---

### PASO 3 — Configurar y arrancar el Frontend

**Abre una SEGUNDA terminal nueva** (diferente a la del backend):

```bash
cd frontend
```

#### 3a. Verificar el archivo de configuración `.env`

El frontend necesita saber en qué dirección está el backend. Esto se configura en el archivo `frontend/.env`. Este archivo **ya debería estar incluido en el repositorio** con el siguiente contenido:

```
VITE_API_URL=http://localhost:8000
```

Si el archivo no existe (a veces `.env` se ignora en Git), créalo manualmente dentro de la carpeta `frontend/` con ese contenido.

> **¿Por qué es importante?** Sin esta variable, el frontend no sabe a dónde enviar las consultas de datos y mostrará errores de conexión. El código tiene un fallback automático a `http://127.0.0.1:8000`, pero es mejor tenerlo configurado explícitamente.

#### 3b. Instalar las dependencias de Node.js

```bash
npm install
```

Esto leerá el archivo `package.json` e instalará todas las librerías necesarias (React, Vite, TypeScript, etc.). La primera vez puede tardar 1-5 minutos.

No te preocupes si ves mensajes de advertencia (`npm warn`). Solo hay problema si ves mensajes de error en rojo (`npm error`).

#### 3c. Iniciar el servidor de desarrollo del Frontend

```bash
npm run dev
```

Si todo está bien, verás algo como:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**✅ Verifica que funciona:** Abre tu navegador y ve a `http://localhost:5173`. Deberías ver la interfaz de SymbiAnalytics.

**⚠️ NO cierres esta terminal tampoco.** El frontend debe seguir corriendo.

---

## ✅ Verificación Final del Sistema Completo

Con las dos terminales corriendo simultáneamente, así se ve el estado correcto:

| Servicio | URL | Estado esperado |
|---|---|---|
| Backend (API) | `http://localhost:8000` | `{"message": "Welcome to SNIES Dashboard API"}` |
| Backend (Docs) | `http://localhost:8000/docs` | Documentación interactiva Swagger de todos los endpoints |
| Frontend (App) | `http://localhost:5173` | Interfaz de SymbiAnalytics cargada y funcional |

---

## 🔧 Solución de Problemas Comunes

### ❌ Error: "python no se reconoce como un comando"
**Causa:** Python no está agregado al PATH del sistema.
**Solución:** Reinstala Python desde https://www.python.org/downloads/ y marca la casilla **"Add Python to PATH"** durante la instalación. Reinicia la terminal después.

En algunas instalaciones de Windows, el comando es `python3` en lugar de `python`:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### ❌ Error: "npm no se reconoce como un comando"
**Causa:** Node.js no está instalado o no está en el PATH.
**Solución:** Descarga e instala Node.js desde https://nodejs.org/en/download (descarga la versión LTS). Reinicia la terminal.

---

### ❌ El frontend carga pero no muestra datos / Error: "Unexpected token '<'"
**Causa:** El backend no está corriendo o la URL del backend no coincide.
**Solución paso a paso:**
1. Verifica que la terminal del backend esté activa y muestre el mensaje de uvicorn.
2. Abre `http://localhost:8000` en el navegador — debe responder con JSON.
3. Verifica que `frontend/.env` existe y contiene `VITE_API_URL=http://localhost:8000`.
4. Detén el frontend (Ctrl+C), guarda el `.env` y vuelve a ejecutar `npm run dev`.

---

### ❌ Error al instalar dependencias de Python: "Microsoft Visual C++ 14.0 is required"
**Causa:** Algunas librerías (como `pyarrow`) necesitan compiladores nativos en Windows.
**Solución:** Instala las Microsoft Build Tools desde:
https://visualstudio.microsoft.com/visual-cpp-build-tools/

Selecciona "Desktop development with C++" durante la instalación.

---

### ❌ Error: "Port 8000 is already in use"
**Causa:** Hay otra instancia del backend corriendo en segundo plano.
**Solución en Windows (PowerShell):**
```powershell
# Ver qué proceso usa el puerto 8000
netstat -ano | findstr :8000

# Matar el proceso (reemplaza XXXX con el PID que encontraste)
taskkill /PID XXXX /F
```
Luego vuelve a ejecutar el backend.

---

### ❌ Los archivos `.parquet` no están en la carpeta `backend/data/`
**Causa:** Estos archivos de datos son pesados y pueden estar excluidos del repositorio de Git.
**Solución:** Pide al administrador del proyecto los archivos `.parquet` y colócalos manualmente en la carpeta `backend/data/`. Los archivos necesarios son:

```
df_SNIES_Programas.parquet
df_Matricula_agg.parquet
df_Graduados_agg.parquet
df_PCurso_agg.parquet
df_Cobertura_distinct.parquet
df_SPADIES_Desercion.parquet
df_SPADIES_Retencion.parquet
df_OLE_Movilidad.parquet
df_OLE_Movilidad_M0.parquet
df_OLE_Salario.parquet
df_OLE_Salario_M0.parquet
df_SaberPRO.parquet
df_SaberPRO_mean.parquet
```

---

## 📊 ¿Cómo usar el sistema una vez que está corriendo?

1. Abre `http://localhost:5173` en tu navegador.
2. En el buscador, escribe el nombre del programa, el código SNIES o la institución que quieres analizar.
3. Selecciona el programa de la lista desplegable.
4. Define los filtros de comparación (región, sector, modalidad).
5. Haz clic en **"Generar Informe"**.
6. El sistema procesará los datos (puede tardar 10-30 segundos dependiendo del programa).
7. Se abrirá una ventana de impresión del navegador. Para guardar como PDF:
   - Selecciona **"Guardar como PDF"** en el destino de impresión.
   - **Desactiva "Encabezados y pies de página"** del navegador para que no aparezca `localhost:5173`.
   - Haz clic en **Guardar**.

---

## 📚 Documentación Adicional

| Archivo | Contenido |
|---|---|
| `DOCUMENTACION_SECCION_8.md` | Cómo funciona el análisis por similitud semántica del nombre del programa |
| `DOCUMENTACION_SECCION_9.md` | Cómo funciona el análisis por Núcleo Básico del Conocimiento (NBC) del MEN |
| `CONTEXTO_BACKEND_Y_FRONTEND.md` | Visión general de la arquitectura y las decisiones de diseño del sistema |
| `INTEGRACION_SEMEJANTES.md` | Documentación de la integración del motor de similitud |
| `backend/data/DATA_LAKE_DOCUMENTATION.md` | Descripción de cada archivo `.parquet` y sus columnas |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Backend API | FastAPI (Python) | Servidor HTTP con endpoints REST |
| Motor de base de datos | DuckDB | Consultas SQL analíticas sobre archivos .parquet |
| Procesamiento de datos | Polars + PyArrow | Transformación y agrupación de datos del MEN |
| Frontend framework | React + TypeScript | Interfaz de usuario interactiva |
| Build tool | Vite | Servidor de desarrollo y empaquetado |
| Generación de PDF | Chrome Print API (HTML/CSS) | Renderizado de alta fidelidad del informe |
| Motor de similitud | Client-side TypeScript | Análisis semántico y NBC sin carga al backend |

---

*SymbiAnalytics Intelligence Unit — Sistema de Informes de Mercado Educativo v2.0*

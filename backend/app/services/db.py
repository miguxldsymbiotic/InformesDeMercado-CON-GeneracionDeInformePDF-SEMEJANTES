import duckdb
import polars as pl
from pathlib import Path
from typing import Optional, List, Dict, Any

# Define la ruta al directorio de datos de forma robusta y portable.
# Esto funciona tanto en local como en un despliegue en la nube (ej. Azure App Services)
# porque construye la ruta basándose en la ubicación de este mismo archivo.
# __file__ -> .../backend/app/services/db.py
# .parent.parent.parent -> .../backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"

class DatabaseService:
    def __init__(self):
        # Base de datos en memoria, consultaremos los archivos parquet directamente
        self.con = duckdb.connect(database=':memory:')
        
        # Registrar los archivos parquet como vistas para facilitar las consultas
        self._register_views()

    def _register_views(self):
        """Registra todos los archivos parquet del directorio de datos como vistas de DuckDB."""
        if not DATA_DIR.exists():
            print(f"Advertencia: El directorio de datos {DATA_DIR} no existe.")
            return

        files = [f for f in DATA_DIR.iterdir() if f.suffix == '.parquet']
        for file_path in files:
            view_name = file_path.stem  # .stem obtiene el nombre del archivo sin extensión
            # DuckDB puede leer parquet directamente. str(file_path) es importante.
            query = f"CREATE OR REPLACE VIEW {view_name} AS SELECT * FROM read_parquet('{str(file_path)}')"
            try:
                self.con.execute(query)
                print(f"Vista registrada: {view_name}")
            except Exception as e:
                print(f"Error al registrar la vista {view_name}: {e}")
        
        # Create calculated views
        self._create_calculated_views()

    def _create_calculated_views(self):
        """Creates views that depend on other views, like the estimated desertion for Posgrados."""
        # Proxy Formula: (PrimerCurso_t-1 - Graduados_t) / PrimerCurso_t-1
        # Logic: 
        # 1. Get Primer Curso by Program, Year, Sex
        # 2. Get Graduados by Program, Year, Sex
        # 3. Join on Program, Sex, and PC.Year = Grad.Year - 1
        # 4. Calculate diff ratio: (PC - GR) / PC. Capped at 1.0 (100% desertion) and floor at 0.0 (0% desertion if GR > PC).
        
        query_desercion_pos = """
            CREATE OR REPLACE VIEW df_Desercion_Posgrado_Proxy AS
            WITH PC AS (
                SELECT 
                    TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies,
                    CAST(anno AS INTEGER) as anno,
                    sexo,
                    SUM(primer_curso_sum) as pc
                FROM df_PCurso_agg
                WHERE codigo_snies_del_programa IS NOT NULL
                GROUP BY 1, 2, 3
            ),
            GR AS (
                SELECT 
                    TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies,
                    CAST(anno AS INTEGER) as anno,
                    sexo,
                    SUM(graduados_sum) as g
                FROM df_Graduados_agg
                WHERE codigo_snies_del_programa IS NOT NULL
                GROUP BY 1, 2, 3
            )
            SELECT 
                PC.snies as codigo_snies_del_programa,
                GR.anno as anno, -- The year of graduation/desertion measure
                GREATEST(0, LEAST(1.0, (PC.pc - GR.g) / NULLIF(PC.pc, 0))) as desercion_anual_mean
            FROM PC
            JOIN GR ON PC.snies = GR.snies AND PC.sexo = GR.sexo AND PC.anno = GR.anno - 1
            WHERE PC.pc > 0
        """
        try:
            self.con.execute(query_desercion_pos)
            print("Registered calculated view: df_Desercion_Posgrado_Proxy")
        except Exception as e:
            print(f"Error creating calculated view df_Desercion_Posgrado_Proxy: {e}")

        # Master Pre-calculated View for KPIs (Matricula, PCurso, Graduados)
        query_master_kpi = """
            CREATE OR REPLACE VIEW df_Master_Indicadores AS
            WITH 
            M AS (
                SELECT snies_divipola, cast(anno as integer) as anno, SUM(matricula_sum) as matricula_sum
                FROM df_Matricula_agg
                GROUP BY 1, 2
            ),
            P AS (
                SELECT snies_divipola, cast(anno as integer) as anno, SUM(primer_curso_sum) as primer_curso_sum
                FROM df_PCurso_agg
                GROUP BY 1, 2
            ),
            G AS (
                SELECT snies_divipola, cast(anno as integer) as anno, SUM(graduados_sum) as graduados_sum
                FROM df_Graduados_agg
                GROUP BY 1, 2
            ),
            C AS (
                SELECT 
                    snies_divipola, 
                    FIRST(codigo_snies_del_programa) as codigo_snies_del_programa, 
                    FIRST(departamento_oferta) as departamento_oferta, 
                    FIRST(divipola_depto_oferta) as divipola_depto_oferta, 
                    FIRST(municipio_oferta) as municipio_oferta, 
                    FIRST(divipola_mpio_oferta) as divipola_mpio_oferta 
                FROM df_Cobertura_distinct
                GROUP BY 1
            ),
            AllSniesYears AS (
                SELECT snies_divipola, anno FROM M
                UNION
                SELECT snies_divipola, anno FROM P
                UNION
                SELECT snies_divipola, anno FROM G
            ),
            BaseMetrics AS (
                SELECT 
                    a.snies_divipola,
                    a.anno,
                    COALESCE(M.matricula_sum, 0) as matricula_sum,
                    COALESCE(P.primer_curso_sum, 0) as primer_curso_sum,
                    COALESCE(G.graduados_sum, 0) as graduados_sum
                FROM AllSniesYears a
                LEFT JOIN M ON a.snies_divipola = M.snies_divipola AND a.anno = M.anno
                LEFT JOIN P ON a.snies_divipola = P.snies_divipola AND a.anno = P.anno
                LEFT JOIN G ON a.snies_divipola = G.snies_divipola AND a.anno = G.anno
            )
            SELECT 
                b.anno,
                b.matricula_sum,
                b.primer_curso_sum,
                b.graduados_sum,
                c.departamento_oferta, c.divipola_depto_oferta,
                c.municipio_oferta, c.divipola_mpio_oferta,
                s.codigo_snies_del_programa,
                s.nombre_institucion,
                s.programa_academico,
                s.sector,
                s.modalidad,
                s.nivel_de_formacion,
                s.nivel_academico,
                s.cine_f_2013_ac_campo_amplio,
                s.cine_f_2013_ac_campo_especific,
                s.cine_f_2013_ac_campo_detallado,
                s.area_de_conocimiento,
                s.nucleo_basico_del_conocimiento,
                s.departamento_principal, s.divipola_depto_principal,
                s.municipio_principal, s.divipola_mpio_principal,
                s.estado_programa,
                s.reconocimiento_del_ministerio
            FROM BaseMetrics b
            JOIN C ON b.snies_divipola = C.snies_divipola
            JOIN df_SNIES_Programas s ON C.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE s.estado_programa = 'ACTIVO' 
              AND s.reconocimiento_del_ministerio IS NOT NULL 
              AND s.reconocimiento_del_ministerio != ''
        """
        try:
            self.con.execute(query_master_kpi)
            print("Registered calculated view: df_Master_Indicadores")
        except Exception as e:
            print(f"Error creating calculated view df_Master_Indicadores: {e}")
            
        # Dimension table for general filtering combinations to avoid repeatedly nesting combinations
        query_dim_filtros = """
            CREATE OR REPLACE VIEW df_Dimension_Filtros AS
            SELECT DISTINCT
                s.codigo_snies_del_programa,
                s.sector,
                s.modalidad,
                s.nivel_de_formacion,
                s.cine_f_2013_ac_campo_amplio,
                s.cine_f_2013_ac_campo_especific,
                s.cine_f_2013_ac_campo_detallado,
                s.area_de_conocimiento,
                s.nucleo_basico_del_conocimiento,
                s.departamento_principal, s.divipola_depto_principal,
                s.municipio_principal, s.divipola_mpio_principal,
                c.departamento_oferta, c.divipola_depto_oferta,
                c.municipio_oferta, c.divipola_mpio_oferta,
                s.nombre_institucion,
                s.programa_academico,
                s.estado_programa,
                s.reconocimiento_del_ministerio
            FROM df_SNIES_Programas s
            LEFT JOIN df_Cobertura_distinct c on s.codigo_snies_del_programa = c.codigo_snies_del_programa
            WHERE s.estado_programa = 'ACTIVO' 
              AND s.reconocimiento_del_ministerio IS NOT NULL 
              AND s.reconocimiento_del_ministerio != ''
        """
        try:
            self.con.execute(query_dim_filtros)
            print("Registered calculated view: df_Dimension_Filtros")
        except Exception as e:
            print(f"Error creating calculated view df_Dimension_Filtros: {e}")

    def query(self, query: str, params: Optional[List[Any]] = None) -> pl.DataFrame:
        """Executes a SQL query and returns the result as a Polars DataFrame."""
        try:
            if params:
                # DuckDB python client supports params? Yes, in execute.
                # But to_df() or similar might be needed.
                # Usually we execute then fetch.
                self.con.execute(query, params)
                # Fetch as arrow then to polars for zero-copy
                arrow_table = self.con.fetch_arrow_table()
                return pl.from_arrow(arrow_table)
            else:
                self.con.execute(query)
                arrow_table = self.con.fetch_arrow_table()
                return pl.from_arrow(arrow_table)
        except Exception as e:
            print(f"Query Error: {e}")
            raise e

    def _build_ilike_clause_any(self, column: str, values: Optional[List[str]]) -> str:
        if not values or not isinstance(values, list) or len(values) == 0:
            return ""
        valid_values = [v for v in values if v and str(v).strip()]
        if not valid_values:
            return ""
        clauses = []
        for v in valid_values:
            escaped = v.replace("'", "''")
            clauses.append(f"{column} ILIKE '%{escaped}%'")
        joined = " OR ".join(clauses)
        return f" AND ({joined})"

    def _build_in_clause(self, column: str, values: Optional[List[str]]) -> str:
        """Helper to build an IN clause for a list of strings."""
        if not values or not isinstance(values, list) or len(values) == 0:
            return ""
        valid_values = [v for v in values if v and str(v).strip()]
        if not valid_values:
            return ""
        # Escape single quotes and join
        escaped_values = [v.replace("'", "''") for v in valid_values]
        joined = ", ".join([f"'{v}'" for v in escaped_values])
        return f" AND {column} IN ({joined})"

    def get_national_evolution(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None) -> Dict[str, Any]:
        """
        Returns structure for 3 metrics (matricula, primer_curso, graduados).
        Each metric contains:
        - main: Evolution by Nivel Academico (Pregrado vs Posgrado)
        - pregrado: Evolution by Nivel de Formacion (filtered for Pregrado)
        - posgrado: Evolution by Nivel de Formacion (filtered for Posgrado)
        """
        
        def process_query(table_name, sum_col):
            query = f"""
                SELECT t.anno, s.nivel_academico, s.nivel_de_formacion, SUM(t.{sum_col}) as total 
                FROM {table_name} t
                JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c 
                  ON t.snies_divipola = c.snies_divipola
                JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
                WHERE t.anno >= 2016 
                  AND s.estado_programa = 'ACTIVO'
                  AND s.reconocimiento_del_ministerio IS NOT NULL 
                  AND s.reconocimiento_del_ministerio != ''
            """
            
            query += self._build_in_clause("s.sector", sector)
            query += self._build_in_clause("s.modalidad", modalidad)
            query += self._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
            query += self._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
            query += self._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
            query += self._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
            query += self._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
            query += self._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
            query += self._build_in_clause("s.nombre_institucion", institucion)
            query += self._build_ilike_clause_any("s.programa_academico", palabra_clave)
            query += self._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
            
            from app.services.national_service import national_service
            query += national_service._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)
                
            query += """
                GROUP BY t.anno, s.nivel_academico, s.nivel_de_formacion
                ORDER BY t.anno
            """
            df = self.query(query)
            
            result = {
                "main": {},
                "pregrado": {},
                "posgrado": {}
            }

            if df.height > 0:
                # 1. Main: Group by Nivel Academico
                academico_agg = df.group_by(["anno", "nivel_academico"]).agg(pl.col("total").sum().alias("total")).sort("anno")
                for level in academico_agg["nivel_academico"].unique().to_list():
                    if level is None: continue
                    sub = academico_agg.filter(pl.col("nivel_academico") == level)
                    result["main"][level] = {
                        "years": sub["anno"].to_list(),
                        "values": sub["total"].to_list()
                    }

                # 2. Detailed: Group by Nivel de Formacion, split by Academico
                formacion_levels = df.select(["nivel_academico", "nivel_de_formacion"]).unique()
                
                for row in formacion_levels.iter_rows(named=True):
                    academico = row["nivel_academico"]
                    formacion = row["nivel_de_formacion"]
                    if academico is None or formacion is None: continue

                    sub = df.filter((pl.col("nivel_academico") == academico) & (pl.col("nivel_de_formacion") == formacion)).sort("anno")
                    
                    series_data = {
                        "years": sub["anno"].to_list(),
                        "values": sub["total"].to_list()
                    }

                    if academico == "PREGRADO":
                        result["pregrado"][formacion] = series_data
                    elif academico == "POSGRADO":
                        result["posgrado"][formacion] = series_data

            return result

        return {
            "matricula": process_query("df_Matricula_agg", "matricula_sum"),
            "primer_curso": process_query("df_PCurso_agg", "primer_curso_sum"),
            "graduados": process_query("df_Graduados_agg", "graduados_sum")
        }

db_service = DatabaseService()

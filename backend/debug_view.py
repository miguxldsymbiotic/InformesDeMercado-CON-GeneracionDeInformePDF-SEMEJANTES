import duckdb
import os

con = duckdb.connect(':memory:')
data_dir = 'data'

# Files to load
files = ['df_Matricula_agg', 'df_PCurso_agg', 'df_Graduados_agg', 'df_Cobertura_distinct', 'df_SNIES_Programas']

for f in files:
    path = os.path.join(data_dir, f + '.parquet')
    if os.path.exists(path):
        con.execute(f"CREATE VIEW {f} AS SELECT * FROM read_parquet('{path}')")

# Recreate the view logic from db.py
query = """
    WITH 
    M AS (SELECT snies_divipola, cast(anno as integer) as anno, SUM(matricula_sum) as matricula_sum FROM df_Matricula_agg GROUP BY 1, 2),
    P AS (SELECT snies_divipola, cast(anno as integer) as anno, SUM(primer_curso_sum) as primer_curso_sum FROM df_PCurso_agg GROUP BY 1, 2),
    G AS (SELECT snies_divipola, cast(anno as integer) as anno, SUM(graduados_sum) as graduados_sum FROM df_Graduados_agg GROUP BY 1, 2),
    C AS (
        SELECT 
            snies_divipola, 
            FIRST(codigo_snies_del_programa) as codigo_snies_del_programa, 
            FIRST(departamento_oferta) as departamento_oferta
        FROM df_Cobertura_distinct
        GROUP BY 1
    ),
    AllSniesYears AS (
        SELECT snies_divipola, anno FROM M UNION SELECT snies_divipola, anno FROM P UNION SELECT snies_divipola, anno FROM G
    ),
    BaseMetrics AS (
        SELECT a.snies_divipola, a.anno, COALESCE(M.matricula_sum, 0) as ms, COALESCE(P.primer_curso_sum, 0) as ps
        FROM AllSniesYears a
        LEFT JOIN M ON a.snies_divipola = M.snies_divipola AND a.anno = M.anno
        LEFT JOIN P ON a.snies_divipola = P.snies_divipola AND a.anno = P.anno
    )
    SELECT bm.*, s.sector 
    FROM BaseMetrics bm
    JOIN C ON bm.snies_divipola = C.snies_divipola
    JOIN df_SNIES_Programas s ON C.codigo_snies_del_programa = s.codigo_snies_del_programa
    WHERE s.estado_programa = 'ACTIVO'
"""

con.execute(f"CREATE VIEW MASTER AS {query}")

print("Total rows in MASTER:", con.execute("SELECT COUNT(*) FROM MASTER").fetchall()[0][0])
print("Unique key (snies_divipola, anno) rows:", con.execute("SELECT COUNT(*) FROM (SELECT DISTINCT snies_divipola, anno FROM MASTER)").fetchall()[0][0])

# Check Putumayo specifically
print("\n--- PUTUMAYO CHECK ---")
q_putumayo = """
    SELECT 
        COUNT(DISTINCT j.codigo_snies_del_programa) as programs,
        SUM(m.ps) as pcurso
    FROM MASTER m
    JOIN (
        SELECT c.snies_divipola, c.departamento_oferta, s.codigo_snies_del_programa 
        FROM df_Cobertura_distinct c
        JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
    ) j ON m.snies_divipola = j.snies_divipola
    WHERE j.departamento_oferta = 'PUTUMAYO' AND m.anno = 2023
"""
# Note: Master has ms, ps. I used ps for pcurso.
for row in con.execute(q_putumayo).fetchall():
    print(f"Putumayo 2023: Programs={row[0]}, P.Curso={row[1]}")

q_sede = """
    SELECT 
        COUNT(DISTINCT s.codigo_snies_del_programa) as programs,
        SUM(m.ps) as pcurso
    FROM MASTER m
    JOIN ( SELECT snies_divipola, codigo_snies_del_programa FROM df_Cobertura_distinct ) c ON m.snies_divipola = c.snies_divipola
    JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
    WHERE s.departamento_principal = 'PUTUMAYO' AND m.anno = 2023
"""
for row in con.execute(q_sede).fetchall():
    print(f"Putumayo Sede 2023: Programs={row[0]}, P.Curso={row[1]}")

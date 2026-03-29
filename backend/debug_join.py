from app.services.db import db_service
q = """
    SELECT SUM(m.primer_curso_sum) as s1
    FROM df_PCurso_agg m 
    JOIN df_Cobertura_distinct c ON m.snies_divipola = c.snies_divipola 
    WHERE m.anno = 2024 AND c.departamento_oferta = 'PUTUMAYO'
"""
print("Join sum:", db_service.query(q)["s1"][0])

q2 = """
    SELECT SUM(m.primer_curso_sum) as s2
    FROM df_PCurso_agg m 
    WHERE m.anno = 2024 AND m.snies_divipola IN (
        SELECT snies_divipola FROM df_Cobertura_distinct WHERE departamento_oferta = 'PUTUMAYO'
    )
"""
print("IN sum (correct):", db_service.query(q2)["s2"][0])

q3 = """
    SELECT SUM(primer_curso_sum) as s3
    FROM df_Master_Indicadores
    WHERE anno = 2024 AND departamento_oferta = 'PUTUMAYO'
"""
print("Master sum:", db_service.query(q3)["s3"][0])

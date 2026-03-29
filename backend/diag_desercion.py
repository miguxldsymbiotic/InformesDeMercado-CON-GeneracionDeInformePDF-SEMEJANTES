from app.services.db import db_service
import polars as pl

# 1. Test Join Success
q1 = """
    SELECT d.anno, COUNT(d.anno) as cnt 
    FROM df_SPADIES_Desercion d 
    JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT) 
    WHERE s.estado_programa = 'ACTIVO' 
    GROUP BY 1 ORDER BY 1
"""
print("Official Data matches:")
print(db_service.query(q1))

# 2. Test Proxy Success
q2 = """
    SELECT p.anno, COUNT(p.anno) as cnt 
    FROM df_Desercion_Posgrado_Proxy p 
    JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT) 
    WHERE s.estado_programa = 'ACTIVO' 
    GROUP BY 1 ORDER BY 1
"""
print("\nProxy Data matches:")
print(db_service.query(q2))

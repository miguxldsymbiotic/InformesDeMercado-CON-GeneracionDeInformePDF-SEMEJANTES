from app.services.db import db_service

q = """
    WITH Combined AS (
        SELECT TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies, anno, desercion_anual_mean 
        FROM df_SPADIES_Desercion
        UNION ALL
        SELECT TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies, anno, desercion_anual_mean 
        FROM df_Desercion_Posgrado_Proxy
    )
    SELECT 
        c.anno, 
        AVG(c.desercion_anual_mean) as val, 
        COUNT(c.desercion_anual_mean) as count_valid,
        COUNT(*) as count_total
    FROM Combined c 
    JOIN df_SNIES_Programas s ON c.snies = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
    WHERE s.estado_programa = 'ACTIVO'
    GROUP BY 1 ORDER BY 1
"""
print(db_service.query(q))

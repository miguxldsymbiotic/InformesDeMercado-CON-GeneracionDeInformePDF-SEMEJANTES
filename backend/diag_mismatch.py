from app.services.db import db_service
import polars as pl

snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"

print("--- SUMMARY CALCULATIONS (Latest Years) ---")
# 1. Official SPADIES latest year
y_q = "SELECT DISTINCT anno FROM df_SPADIES_Desercion WHERE anno IS NOT NULL ORDER BY anno DESC LIMIT 2"
y_list = db_service.query(y_q)["anno"].to_list()
if y_list:
    max_y = y_list[0]
    q = f"""
        SELECT AVG(d.desercion_anual_mean) * 100 as val 
        FROM df_SPADIES_Desercion d 
        JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
        WHERE {snies_filter} AND d.anno = {max_y} AND d.desercion_anual_mean IS NOT NULL AND NOT isnan(d.desercion_anual_mean)
    """
    print(f"Summary SPADIES ({max_y}):", db_service.query(q)["val"][0])

# 2. Proxy latest year (2024 usually)
y_p_q = "SELECT DISTINCT anno FROM df_Desercion_Posgrado_Proxy ORDER BY anno DESC LIMIT 1"
y_p_list = db_service.query(y_p_q)["anno"].to_list()
if y_p_list:
    max_y_p = y_p_list[0]
    q_p = f"""
        SELECT AVG(p.desercion_anual_mean) * 100 as val 
        FROM df_Desercion_Posgrado_Proxy p 
        JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
        WHERE {snies_filter} AND p.anno = {max_y_p}
    """
    print(f"Summary Proxy ({max_y_p}):", db_service.query(q_p)["val"][0])

print("\n--- EVOLUTION CALCULATION (UNION ALL) ---")
q_evo = f"""
    WITH Combined AS (
        SELECT TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies, anno, desercion_anual_mean 
        FROM df_SPADIES_Desercion
        UNION ALL
        SELECT TRY_CAST(codigo_snies_del_programa AS BIGINT) as snies, anno, desercion_anual_mean 
        FROM df_Desercion_Posgrado_Proxy
    )
    SELECT c.anno, AVG(c.desercion_anual_mean) * 100 as value 
    FROM Combined c 
    JOIN df_SNIES_Programas s ON c.snies = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
    WHERE {snies_filter} 
        AND c.desercion_anual_mean IS NOT NULL 
        AND NOT isnan(c.desercion_anual_mean)
    GROUP BY 1 ORDER BY 1
"""
print(db_service.query(q_evo))

from app.services.db import db_service
import polars as pl

def test_final_query():
    # Mimic _calculate_metric_with_trend for total_matricula
    snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
    
    # Get latest years
    years_df = db_service.query("SELECT DISTINCT anno FROM df_Matricula_agg ORDER BY anno DESC LIMIT 2")
    years = years_df["anno"].to_list()
    print(f"Years: {years}")
    
    query = f"""
        SELECT CAST(m.anno AS INTEGER) as anno, SUM(m.matricula_sum) as total 
        FROM df_Matricula_agg m 
        JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola 
        JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa 
        WHERE {snies_filter} AND m.anno IN ({', '.join(map(str, years))})
        GROUP BY 1
    """
    
    df = db_service.query(query)
    print("\nResulting DataFrame:")
    print(df)

if __name__ == "__main__":
    test_final_query()

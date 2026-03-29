from app.services.db import db_service

def debug_filters():
    query = "SELECT DISTINCT reconocimiento_del_ministerio FROM df_SNIES_Programas LIMIT 10"
    df = db_service.query(query)
    print("Distinct values for reconocimiento_del_ministerio:")
    print(df)
    
    query_count = "SELECT COUNT(*) as count FROM df_SNIES_Programas WHERE estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != ''"
    count = db_service.query(query_count)["count"][0]
    print(f"Programs passing snies_filter: {count}")

if __name__ == "__main__":
    debug_filters()

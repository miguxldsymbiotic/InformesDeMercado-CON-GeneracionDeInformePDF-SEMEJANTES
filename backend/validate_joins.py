from app.services.db import db_service

def check_joins():
    # Join 1: Matricula -> Cobertura
    q1 = """
        SELECT COUNT(*) as count 
        FROM df_Matricula_agg m 
        JOIN df_Cobertura_distinct c ON m.snies_divipola = c.snies_divipola
    """
    res1 = db_service.query(q1)
    print(f"Matches m.snies_divipola = c.snies_divipola: {res1['count'][0]}")

    # Join 2: Cobertura -> SNIES
    q2 = """
        SELECT COUNT(*) as count 
        FROM df_Cobertura_distinct c 
        JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
    """
    res2 = db_service.query(q2)
    print(f"Matches c.codigo_snies_del_programa = s.codigo_snies_del_programa: {res2['count'][0]}")

    # Full Join for Matricula
    q3 = """
        SELECT COUNT(*) as count
        FROM df_Matricula_agg m
        JOIN df_Cobertura_distinct c ON m.snies_divipola = c.snies_divipola
        JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
        WHERE s.estado_programa = 'ACTIVO'
    """
    res3 = db_service.query(q3)
    print(f"Full join (Active) count: {res3['count'][0]}")

if __name__ == "__main__":
    check_joins()

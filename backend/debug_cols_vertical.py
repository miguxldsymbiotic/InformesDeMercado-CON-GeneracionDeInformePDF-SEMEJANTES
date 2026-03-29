from app.services.db import db_service

def check_one(table):
    df = db_service.query(f"SELECT * FROM {table} LIMIT 0")
    print(f"TABLE: {table}")
    for col in df.columns:
        print(f"  - {col}")

if __name__ == "__main__":
    check_one("df_Matricula_agg")
    check_one("df_Cobertura_distinct")
    check_one("df_SNIES_Programas")

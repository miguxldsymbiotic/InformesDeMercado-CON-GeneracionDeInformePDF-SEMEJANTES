from app.services.db import db_service

def check_columns():
    for table in ["df_Matricula_agg", "df_Cobertura_distinct"]:
        print(f"\nColumns in {table}:")
        df = db_service.query(f"SELECT * FROM {table} LIMIT 0")
        print(df.columns)

if __name__ == "__main__":
    check_columns()

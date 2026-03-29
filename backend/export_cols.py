from app.services.db import db_service

def check_columns():
    for table in ["df_Matricula_agg", "df_Cobertura_distinct", "df_SNIES_Programas"]:
        try:
            df = db_service.query(f"SELECT * FROM {table} LIMIT 0")
            print(f"\n{table} columns: {', '.join(df.columns)}")
        except Exception as e:
            print(f"Error checking {table}: {e}")

if __name__ == "__main__":
    check_columns()

from app.services.db import db_service
import polars as pl

def list_cols():
    tables = ["df_SNIES_Programas", "df_Cobertura_distinct"]
    for table in tables:
        print(f"\nColumns in {table}:")
        df = db_service.query(f"SELECT * FROM {table} LIMIT 1")
        for col in df.columns:
            print(f" - {col}")

if __name__ == "__main__":
    list_cols()

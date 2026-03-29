from app.services.db import db_service
import polars as pl

def check_db():
    print("Checking database views and counts...")
    views = [
        "df_SNIES_Programas", 
        "df_Matricula_agg", 
        "df_PCurso_agg", 
        "df_Graduados_agg", 
        "df_Cobertura_distinct"
    ]
    
    for view in views:
        try:
            count = db_service.query(f"SELECT COUNT(*) as count FROM {view}")["count"][0]
            print(f"View {view}: {count} records")
        except Exception as e:
            print(f"Error querying {view}: {e}")

    # Check for ACTIVE programs
    try:
        active = db_service.query("SELECT COUNT(*) as count FROM df_SNIES_Programas WHERE estado_programa = 'ACTIVO'")["count"][0]
        print(f"Active Programs: {active}")
    except Exception as e:
        print(f"Error checking active programs: {e}")

if __name__ == "__main__":
    check_db()

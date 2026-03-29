from app.services.db import db_service

def check_years():
    for table in ["df_Matricula_agg", "df_PCurso_agg", "df_Graduados_agg", "df_SPADIES_Desercion"]:
        try:
            res = db_service.query(f"SELECT DISTINCT anno FROM {table} ORDER BY anno DESC")
            print(f"Years in {table}: {res['anno'].to_list()}")
        except:
            # Maybe it's anno_corte?
            try:
                res = db_service.query(f"SELECT DISTINCT anno_corte as anno FROM {table} ORDER BY anno DESC")
                print(f"Years in {table}: {res['anno'].to_list()}")
            except:
                print(f"Could not find year column in {table}")

if __name__ == "__main__":
    check_years()

import sys
import os
import polars as pl

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.national_service import NationalService
from app.services.db import db_service

def check_putumayo():
    ns = NationalService()
    dept = ["PUTUMAYO"]
    
    print("\n--- PUTUMAYO (PRINCIPAL) ---")
    kpis = ns.get_national_kpis(departamento_principal=dept)
    print("KPI Card Value:", kpis["summary"].get("total_pcurso"), "Year:", kpis["summary"].get("pcurso_year"))
    
    evol = ns.get_kpi_evolution("pcurso", departamento_principal=dept)
    for y, v in zip(evol["years"], evol["values"]):
        print(f"Year {y}: {v}")

    print("\n--- PUTUMAYO (OFERTA) ---")
    kpis_o = ns.get_national_kpis(departamento=dept)
    print("KPI Card Value:", kpis_o["summary"].get("total_pcurso"), "Year:", kpis_o["summary"].get("pcurso_year"))
    
    evol_o = ns.get_kpi_evolution("pcurso", departamento=dept)
    for y, v in zip(evol_o["years"], evol_o["values"]):
        print(f"Year {y}: {v}")

if __name__ == "__main__":
    check_putumayo()


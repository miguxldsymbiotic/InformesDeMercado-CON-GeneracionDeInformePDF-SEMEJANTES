import sys
import os
import polars as pl

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.national_service import NationalService
from app.services.db import db_service

def debug_mismatch():
    ns = NationalService()
    
    # 1. Get all departments
    depts_df = db_service.query("SELECT DISTINCT departamento_oferta FROM df_Cobertura_distinct WHERE departamento_oferta IS NOT NULL")
    depts = depts_df["departamento_oferta"].to_list()
    
    print(f"Found {len(depts)} departments.")
    
    mismatches = []
    
    for dept_name in depts:
        dept = [dept_name]
        try:
            # Get KPI
            kpis = ns.get_national_kpis(departamento=dept)
            kpi_val = kpis["summary"].get("total_pcurso", 0)
            kpi_year = kpis["summary"].get("pcurso_year", 0)
            
            # Get Evolution
            evol = ns.get_kpi_evolution("pcurso", departamento=dept)
            if not evol["years"]:
                evol_last_val = 0
                evol_last_year = 0
            else:
                evol_last_year = int(evol["years"][-1])
                evol_last_val = evol["values"][-1]
            
            if kpi_val != evol_last_val or kpi_year != evol_last_year:
                mismatches.append({
                    "dept": dept_name,
                    "kpi_val": kpi_val,
                    "kpi_year": kpi_year,
                    "evol_val": evol_last_val,
                    "evol_year": evol_last_year
                })
        except Exception as e:
            print(f"Error checking {dept_name}: {e}")

    if mismatches:
        print("\nMISMATCHES FOUND:")
        for m in mismatches:
            print(f"Dept: {m['dept']}")
            print(f"  KPI Card:  {m['kpi_val']} (Year: {m['kpi_year']})")
            print(f"  Evol Modal: {m['evol_val']} (Year: {m['evol_year']})")
    else:
        print("\nNo mismatches found between summary and evolution.")

if __name__ == "__main__":
    debug_mismatch()

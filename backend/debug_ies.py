from app.services.national_service import national_service
import json
import pandas as pd

def debug():
    print("Debugging get_national_ies_list...")
    # Simulate empty filters
    res = national_service.get_national_ies_list(
        sector=None, modalidad=None, nivel_de_formacion=None,
        campo_amplio=None, campo_especifico=None, campo_detallado=None
    )
    print(f"Result count: {len(res)}")
    if len(res) > 0:
        print("First item keys:", res[0].keys())
        print("First item sample:", json.dumps(res[0], indent=2))
    else:
        print("RESULT IS EMPTY!")
        
    # Check if df_SNIES_Programas has any data with ACTIVO
    from app.services.db import db_service
    count = db_service.query("SELECT COUNT(*) as c FROM df_SNIES_Programas WHERE estado_programa = 'ACTIVO'")
    print(f"Total ACTIVO programs: {count['c'][0]}")

if __name__ == "__main__":
    debug()

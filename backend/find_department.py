import sys
import os
import polars as pl

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.db import db_service

def find_dept():
    # Find department where total primer_curso_sum is close to 6016 in the latest year
    query = """
        SELECT departamento_oferta, anno, SUM(primer_curso_sum) as total 
        FROM df_Master_Indicadores 
        GROUP BY 1, 2 
        HAVING total BETWEEN 5000 AND 7000
        ORDER BY anno DESC, total DESC
    """
    df = db_service.query(query)
    print(df)

if __name__ == "__main__":
    find_dept()

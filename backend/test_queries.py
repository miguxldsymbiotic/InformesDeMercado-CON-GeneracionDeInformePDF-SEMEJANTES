import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.national_service import NationalService
from app.services.db import db_service

def test_queries():
    national_service = NationalService()
    dept = ["ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA"]
    # or another department
    
    out = ""
    out += "\n--- KPI ---\n"
    kpis = national_service.get_national_kpis(departamento=dept)
    out += f"KPI PCurso: {kpis['global'].get('total_pcurso')}\n"
    
    out += "\n--- EVOL ---\n"
    evol = national_service.get_kpi_evolution("pcurso", departamento=dept)
    out += f"EVOL PCurso: {evol}\n"
    
    # Also check the raw queries that generate them
    q1 = """
        SELECT m.anno, SUM(m.primer_curso_sum) as value 
        FROM df_PCurso_agg m
        JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola 
        JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa 
        WHERE s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != '' 
        AND c.departamento_oferta IN ('ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA')
        GROUP BY 1 ORDER BY 1
    """
    df_q1 = db_service.query(q1)
    out += f"\nRaw EVOL query results:\n{df_q1}\n"
    
    q_master = """
        SELECT CAST(anno AS INTEGER) as anno, SUM(primer_curso_sum) as total 
        FROM df_Master_Indicadores 
        WHERE estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != '' 
        AND departamento_oferta IN ('ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA')
        GROUP BY 1 ORDER BY 1
    """
    df_qm = db_service.query(q_master)
    out += f"\nRaw Master query results:\n{df_qm}\n"

    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(out)

test_queries()

from fastapi import APIRouter, HTTPException, Query
from app.services.db import db_service
from typing import List, Optional

router = APIRouter(
    prefix="/regional",
    tags=["regional"]
)

@router.get("/departments_principal")
async def get_departments_principal():
    """Returns a list of available departamento_principal values from SNIES with their divipola codes."""
    try:
        query = "SELECT DISTINCT departamento_principal as name, divipola_depto_principal as code FROM df_SNIES_Programas WHERE departamento_principal IS NOT NULL ORDER BY 1"
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/departments_oferta")
async def get_departments_oferta():
    """Returns a list of available departamento_oferta values from Cobertura with their divipola codes."""
    try:
        query = "SELECT DISTINCT departamento_oferta as name, divipola_depto_oferta as code FROM df_Cobertura_distinct WHERE departamento_oferta IS NOT NULL ORDER BY 1"
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/municipalities_principal")
async def get_municipalities_principal(departamento_principal: Optional[List[str]] = Query(None)):
    """Returns a list of available municipio_principal values from SNIES with their divipola codes, optionally filtered by department."""
    try:
        where_clause = "WHERE municipio_principal IS NOT NULL"
        if departamento_principal and len(departamento_principal) > 0:
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in departamento_principal if v)
            if is_code:
                joined = ", ".join([str(float(v)) for v in departamento_principal if v])
                where_clause += f" AND divipola_depto_principal IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in departamento_principal if v]
                joined = ", ".join([f"'{v}'" for v in escaped])
                where_clause += f" AND departamento_principal IN ({joined})"
                
        query = f"SELECT DISTINCT municipio_principal as name, divipola_mpio_principal as code FROM df_SNIES_Programas {where_clause} ORDER BY 1"
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/municipalities_oferta")
async def get_municipalities_oferta(departamento_oferta: Optional[List[str]] = Query(None)):
    """Returns a list of available municipio_oferta values from Cobertura with their divipola codes, optionally filtered by department."""
    try:
        where_clause = "WHERE municipio_oferta IS NOT NULL"
        if departamento_oferta and len(departamento_oferta) > 0:
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in departamento_oferta if v)
            if is_code:
                joined = ", ".join([str(float(v)) for v in departamento_oferta if v])
                where_clause += f" AND divipola_depto_oferta IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in departamento_oferta if v]
                joined = ", ".join([f"'{v}'" for v in escaped])
                where_clause += f" AND departamento_oferta IN ({joined})"
                
        query = f"SELECT DISTINCT municipio_oferta as name, divipola_mpio_oferta as code FROM df_Cobertura_distinct {where_clause} ORDER BY 1"
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related_departments")
async def get_related_departments(
    departamento_principal: Optional[List[str]] = Query(None),
    departamento_oferta: Optional[List[str]] = Query(None)
):
    """
    Returns related departments given a selection:
    - If departamento_principal is set: returns the oferta departments for those programs.
    - If departamento_oferta is set: returns the principal departments for those programs.
    - If both are set: returns oferta departments GIVEN the principal departments.
    """
    try:
        result = {"related_principal": [], "related_oferta": []}
        
        def process_filter(vals, name_col, code_col):
            if not vals or len(vals) == 0:
                return None
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in vals if v)
            if is_code:
                joined = ", ".join([str(float(v)) for v in vals if v])
                return f"{code_col} IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in vals if v]
                joined = ", ".join([f"'{v}'" for v in escaped])
                return f"{name_col} IN ({joined})"

        f_principal = process_filter(departamento_principal, "s.departamento_principal", "s.divipola_depto_principal")
        f_oferta = process_filter(departamento_oferta, "c.departamento_oferta", "c.divipola_depto_oferta")

        if f_principal and not f_oferta:
            # Only principal: find related oferta
            query = f"""
                SELECT DISTINCT CAST(c.divipola_depto_oferta AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE {f_principal} AND c.divipola_depto_oferta IS NOT NULL
            """
            df = db_service.query(query)
            result["related_oferta"] = [str(x) for x in df["code"].to_list() if x is not None]
        
        elif f_oferta and not f_principal:
            # Only oferta: find related principal
            query = f"""
                SELECT DISTINCT CAST(s.divipola_depto_principal AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE {f_oferta} AND s.divipola_depto_principal IS NOT NULL
            """
            df = db_service.query(query)
            result["related_principal"] = [str(x) for x in df["code"].to_list() if x is not None]

        elif f_principal and f_oferta:
            # Both filters: oferta departments GIVEN principal departments (AND vice versa to complete the mirror)
            query_o = f"""
                SELECT DISTINCT CAST(c.divipola_depto_oferta AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE {f_principal} AND {f_oferta} AND c.divipola_depto_oferta IS NOT NULL
            """
            df_o = db_service.query(query_o)
            result["related_oferta"] = [str(x) for x in df_o["code"].to_list() if x is not None]
            
            query_p = f"""
                SELECT DISTINCT CAST(s.divipola_depto_principal AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE {f_principal} AND {f_oferta} AND s.divipola_depto_principal IS NOT NULL
            """
            df_p = db_service.query(query_p)
            result["related_principal"] = [str(x) for x in df_p["code"].to_list() if x is not None]
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related_from_municipalities")
async def get_related_from_municipalities(
    municipio_principal: Optional[List[str]] = Query(None),
    municipio_oferta: Optional[List[str]] = Query(None)
):
    """
    Returns related departments given a selection of municipalities (divipola codes):
    - If municipio_principal is set (List of string divipolas): returns the oferta DEPARTMENTS for those programs.
    - If municipio_oferta is set: returns the principal DEPARTMENTS for those programs.
    """
    try:
        result = {"related_oferta": [], "related_principal": []}
        
        def process_filter(vals):
            if not vals or len(vals) == 0:
                return None
            joined = ", ".join([str(float(v)) for v in vals if v])
            return joined

        f_mpio_principal = process_filter(municipio_principal)
        f_mpio_oferta = process_filter(municipio_oferta)

        # 1. Given Mpio Principal -> Which Depts of Oferta are reached?
        if f_mpio_principal:
            query_o = f"""
                SELECT DISTINCT CAST(c.divipola_depto_oferta AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE s.divipola_mpio_principal IN ({f_mpio_principal}) AND c.divipola_depto_oferta IS NOT NULL
            """
            df_o = db_service.query(query_o)
            result["related_oferta"] = [str(x) for x in df_o["code"].to_list() if x is not None]

        # 2. Given Mpio Oferta -> Which Depts Principal are reached?
        if f_mpio_oferta:
            query_p = f"""
                SELECT DISTINCT CAST(s.divipola_depto_principal AS BIGINT) as code
                FROM df_SNIES_Programas s
                JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_mpio_oferta FROM df_Cobertura_distinct) c
                ON s.codigo_snies_del_programa = c.codigo_snies_del_programa
                WHERE c.divipola_mpio_oferta IN ({f_mpio_oferta}) AND s.divipola_depto_principal IS NOT NULL
            """
            df_p = db_service.query(query_p)
            result["related_principal"] = [str(x) for x in df_p["code"].to_list() if x is not None]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolution")
async def get_regional_evolution(department: str):
    """Returns enrollment evolution for a specific department using Master view for consistency."""
    try:
        query = f"""
            SELECT anno, SUM(matricula_sum) as total_matricula
            FROM df_Master_Indicadores
            WHERE departamento_oferta = '{department}'
            GROUP BY 1 ORDER BY 1
        """
        df = db_service.query(query)
        return {
            "years": [float(y) for y in df["anno"].to_list()],
            "enrollment": [float(v) for v in df["total_matricula"].to_list()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top_municipalities")
async def get_top_municipalities(department: str, year: int = 2023):
    """Returns top 10 municipalities by enrollment in the department using Master view."""
    try:
        query = f"""
            SELECT municipio_oferta, SUM(matricula_sum) as total
            FROM df_Master_Indicadores
            WHERE departamento_oferta = '{department}' AND anno = {year}
            GROUP BY 1 ORDER BY total DESC LIMIT 10
        """
        df = db_service.query(query)
        return {
            "municipalities": df["municipio_oferta"].to_list(),
            "enrollment": [float(v) for v in df["total"].to_list()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/map_distribution")
async def get_map_distribution(
    metric: str = "matricula",
    dimension: str = "oferta",
    level: str = "department",
    sector: Optional[List[str]] = Query(None),
    modalidad: Optional[List[str]] = Query(None),
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    """Returns the distribution of a metric across all departments or municipalities for choropleth visualization."""
    from app.services.national_service import national_service
    try:
        snies_f = "estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != ''"
        snies_f += db_service._build_in_clause("sector", sector)
        snies_f += db_service._build_in_clause("modalidad", modalidad)
        snies_f += db_service._build_in_clause("nivel_de_formacion", nivel_de_formacion)
        snies_f += db_service._build_in_clause("cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_f += db_service._build_in_clause("cine_f_2013_ac_campo_especific", campo_especifico)
        snies_f += db_service._build_in_clause("cine_f_2013_ac_campo_detallado", campo_detallado)

        def process_geo_flat(vals, col):
            if not vals: return None
            valid_vals = [v for v in vals if v and str(v).strip()]
            if not valid_vals: return None
            is_code = all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in valid_vals)
            if is_code: return f"{col} IN ({', '.join([str(float(v)) for v in valid_vals])})"
            escaped = [v.replace("'", "''") for v in valid_vals]
            return f"{col} IN ({', '.join([f'{chr(39)}{v}{chr(39)}' for v in escaped])})"

        gf = []
        if departamento: gf.append(process_geo_flat(departamento, "divipola_depto_oferta" if any(str(v).isdigit() for v in departamento if v) else "departamento_oferta"))
        if municipio: gf.append(process_geo_flat(municipio, "divipola_mpio_oferta" if any(str(v).isdigit() for v in municipio if v) else "municipio_oferta"))
        if departamento_principal: gf.append(process_geo_flat(departamento_principal, "divipola_depto_principal" if any(str(v).isdigit() for v in departamento_principal if v) else "departamento_principal"))
        if municipio_principal: gf.append(process_geo_flat(municipio_principal, "divipola_mpio_principal" if any(str(v).isdigit() for v in municipio_principal if v) else "municipio_principal"))
        
        valid_gf = [g for g in gf if g]
        geo_f = (" AND " + " AND ".join(valid_gf)) if valid_gf else ""
        master_filter = snies_f + geo_f

        if level == "municipality":
            code_col = "divipola_mpio_principal" if dimension == "principal" else "divipola_mpio_oferta"
            name_col = "municipio_principal" if dimension == "principal" else "municipio_oferta"
        else:
            code_col = "divipola_depto_principal" if dimension == "principal" else "divipola_depto_oferta"
            name_col = "departamento_principal" if dimension == "principal" else "departamento_oferta"

        if metric in ["matricula", "pcurso", "graduados"]:
            col_map = {"matricula": "matricula_sum", "pcurso": "primer_curso_sum", "graduados": "graduados_sum"}
            target_col = col_map[metric]
            max_year = db_service.query(f"SELECT MAX(anno) as yr FROM df_Master_Indicadores")["yr"][0]
            query = f"SELECT CAST({code_col} AS BIGINT) as code, {name_col} as name, SUM({target_col}) as value FROM df_Master_Indicadores WHERE {master_filter} AND anno = {max_year} AND {code_col} IS NOT NULL GROUP BY 1, 2"
        elif metric in ["num_ies", "num_programs"]:
            col_map = {"num_ies": "nombre_institucion", "num_programs": "codigo_snies_del_programa"}
            target_col = col_map[metric]
            query = f"SELECT CAST({code_col} AS BIGINT) as code, {name_col} as name, COUNT(DISTINCT {target_col}) as value FROM df_Dimension_Filtros WHERE {master_filter} AND {code_col} IS NOT NULL GROUP BY 1, 2"
        elif metric == "cobertura":
            query = f"SELECT DISTINCT CAST({code_col} AS BIGINT) as code, {name_col} as name, 1 as value FROM df_Dimension_Filtros WHERE {master_filter} AND {code_col} IS NOT NULL"
        elif metric == "desercion":
            pos_levels = ['MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA', 'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL', 'ESPECIALIZACION MEDICO QUIRURGICA']
            is_posgrad_only = nivel_de_formacion is not None and len(nivel_de_formacion) > 0 and all(l.upper() in pos_levels for l in nivel_de_formacion)
            target_table = "df_Desercion_Posgrado_Proxy" if is_posgrad_only else "df_SPADIES_Desercion"
            max_year = db_service.query(f"SELECT MAX(anno) as yr FROM {target_table}")["yr"][0]
            s_f = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL"
            geo_ext = national_service._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
            grp_code = f"CAST(s.{code_col} AS BIGINT)" if dimension == "principal" else f"CAST(c.{code_col} AS BIGINT)"
            grp_name = f"s.{name_col}" if dimension == "principal" else f"c.{name_col}"
            query = f"SELECT {grp_code} as code, {grp_name} as name, AVG(d.desercion_anual_mean) * 100 as value FROM {target_table} d JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT) LEFT JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa WHERE {s_f} {geo_ext} AND d.anno = {max_year} AND {grp_code} IS NOT NULL GROUP BY 1, 2"
        elif metric == "saberpro":
            max_year = db_service.query(f"SELECT MAX(anno) as yr FROM df_SaberPRO_mean")["yr"][0]
            s_f = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL"
            geo_ext = national_service._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
            grp_code = f"CAST(s.{code_col} AS BIGINT)" if dimension == "principal" else f"CAST(c.{code_col} AS BIGINT)"
            grp_name = f"s.{name_col}" if dimension == "principal" else f"c.{name_col}"
            query = f"SELECT {grp_code} as code, {grp_name} as name, AVG(p.pro_gen_punt_global_mean) as value FROM df_SaberPRO_mean p JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT) LEFT JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa WHERE {s_f} {geo_ext} AND p.anno = {max_year} AND {grp_code} IS NOT NULL GROUP BY 1, 2"
        elif metric == "empleabilidad":
            max_year = db_service.query(f"SELECT MAX(anno_corte) as yr FROM df_OLE_Movilidad_M0")["yr"][0]
            s_f = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL"
            geo_ext = national_service._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
            grp_code = f"CAST(s.{code_col} AS BIGINT)" if dimension == "principal" else f"CAST(c.{code_col} AS BIGINT)"
            grp_name = f"s.{name_col}" if dimension == "principal" else f"c.{name_col}"
            query = f"WITH YM AS (SELECT m.anno_corte as anno, m.codigo_snies_del_programa, SUM(m.graduados) as g, SUM(m.graduados_que_cotizan) as c FROM df_OLE_Movilidad_M0 m WHERE m.anno_corte = {max_year} GROUP BY 1, 2) SELECT {grp_code} as code, {grp_name} as name, AVG(LEAST(1.0, CAST(agg.c AS FLOAT) / NULLIF(agg.g, 0))) * 100 as value FROM YM agg JOIN df_SNIES_Programas s ON TRY_CAST(agg.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT) LEFT JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa WHERE {s_f} {geo_ext} AND agg.g > 0 AND {grp_code} IS NOT NULL GROUP BY 1, 2"
        else:
            return []

        df = db_service.query(query)
        result = df.to_dicts()
        return [national_service._clean_kpi_dict(row) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

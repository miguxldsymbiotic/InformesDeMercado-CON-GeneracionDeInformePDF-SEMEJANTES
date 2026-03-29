from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.services.db import db_service
from app.services.national_service import national_service

router = APIRouter(
    prefix="/national",
    tags=["national"]
)

@router.get("/kpis")
async def get_national_kpis(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_kpis(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context")
async def get_national_context(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_context_charts(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/demographics/distribution")
async def get_demographic_distribution(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None),
    breakdown_column: Optional[str] = Query(None)
):
    try:
        return national_service.get_demographic_distribution(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal, breakdown_column=breakdown_column)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/demographics/trend")
async def get_demographic_trend(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None),
    breakdown_column: Optional[str] = Query(None),
    target_sexo: Optional[str] = Query(None),
    target_estrato: Optional[str] = Query(None),
    target_horas_trabajo: Optional[str] = Query(None),
    target_edad: Optional[str] = Query(None),
    nested: Optional[bool] = Query(False)
):
    try:
        targets = {
            "sexo": target_sexo,
            "estrato": target_estrato,
            "horas_trabajo": target_horas_trabajo,
            "edad": target_edad
        }
        return national_service.get_demographic_trend(
            sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
            campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
            area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, 
            departamento=departamento, departamento_principal=departamento_principal, 
            municipio=municipio, municipio_principal=municipio_principal,
            breakdown_column=breakdown_column,
            target_categories={k: v for k, v in targets.items() if v},
            nested=nested
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolution")
async def get_national_evolution(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        data = db_service.get_national_evolution(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolution/primer_curso")
async def get_national_primer_curso_evolution(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_primer_curso_evolution(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolution/primer_curso_sector")
async def get_national_primer_curso_evolution_by_sector(
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_primer_curso_evolution_by_sector(modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolution/kpi")
async def get_national_kpi_evolution(
    metric: str,
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_kpi_evolution(metric, sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discipline_stats")
async def get_national_discipline_stats(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_discipline_stats(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/field_trend")
async def get_national_field_trend(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_field_trend(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discipline_table")
async def get_national_discipline_table(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_discipline_table(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ies_table")
async def get_national_ies_table(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_ies_table(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ies_list")
async def get_national_ies_list(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_ies_list(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saberpro_stats")
async def get_national_saberpro_stats(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_saberpro_stats(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saberpro_trend")
async def get_national_saberpro_trend(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_national_saberpro_trend(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sector_distribution")
async def get_sector_distribution(year: int = 2023):
    try:
        query = f"""
            SELECT p.sector, SUM(m.matricula_sum) as total_matricula
            FROM df_Matricula_agg m
            JOIN df_SNIES_Programas p ON m.codigo_snies_del_programa = p.codigo_snies_del_programa
            WHERE m.anno = {year}
            GROUP BY p.sector
        """
        df = db_service.query(query)
        return {
            "labels": df["sector"].to_list(),
            "values": df["total_matricula"].to_list()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filter-options/cine")
async def get_cine_options():
    """Returns cascading options for CINE fields."""
    try:
        query = """
            SELECT DISTINCT 
                cine_f_2013_ac_campo_amplio as amplio,
                cine_f_2013_ac_campo_especific as especifico,
                cine_f_2013_ac_campo_detallado as detallado
            FROM df_SNIES_Programas
            WHERE estado_programa = 'ACTIVO' 
              AND cine_f_2013_ac_campo_amplio IS NOT NULL
            ORDER BY 1, 2, 3
        """
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filter-options/program")
async def get_program_options():
    """Returns all programs with their classification for client-side filtering."""
    try:
        query = """
            SELECT DISTINCT 
                s.sector,
                s.modalidad,
                s.nivel_de_formacion as nivel,
                s.cine_f_2013_ac_campo_amplio as amplio,
                s.cine_f_2013_ac_campo_especific as especifico,
                s.cine_f_2013_ac_campo_detallado as detallado,
                s.area_de_conocimiento as area,
                s.nucleo_basico_del_conocimiento as nucleo,
                s.nombre_institucion as institucion,
                s.programa_academico as programa,
                CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) as snies,
                CAST(CAST(s.codigo_institucion AS BIGINT) AS VARCHAR) as codigo_institucion,
                s.caracter_academico,
                s.departamento_principal,
                s.municipio_principal,
                c.departamento_oferta as departamento,
                c.municipio_oferta as municipio,
                s.reconocimiento_del_ministerio,
                s.fecha_de_resolucion,
                CAST(s.vigencia_annos AS VARCHAR) as vigencia_annos,
                CAST(s.numero_creditos AS VARCHAR) as numero_creditos,
                CAST(s.numero_periodos_de_duracion AS VARCHAR) as numero_periodos_de_duracion,
                CAST(s.costo_matricula_estud_nuevos AS VARCHAR) as costo_matricula_estud_nuevos
            FROM df_SNIES_Programas s
            LEFT JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, municipio_oferta FROM df_Cobertura_distinct) c 
              ON CAST(s.codigo_snies_del_programa AS BIGINT) = CAST(c.codigo_snies_del_programa AS BIGINT)
            WHERE s.estado_programa = 'ACTIVO' 
              AND s.nombre_institucion IS NOT NULL
        """
        df = db_service.query(query)
        return df.to_dicts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dynamic-filter-options")
async def get_dynamic_filter_options(
    sector: Optional[List[str]] = Query(None), 
    modalidad: Optional[List[str]] = Query(None), 
    nivel_de_formacion: Optional[List[str]] = Query(None),
    campo_amplio: Optional[List[str]] = Query(None),
    campo_especifico: Optional[List[str]] = Query(None),
    campo_detallado: Optional[List[str]] = Query(None),
    area_de_conocimiento: Optional[List[str]] = Query(None),
    nucleo_basico_del_conocimiento: Optional[List[str]] = Query(None),
    institucion: Optional[List[str]] = Query(None),
    palabra_clave: Optional[List[str]] = Query(None),
    codigo_snies: Optional[List[str]] = Query(None),
    departamento: Optional[List[str]] = Query(None),
    departamento_principal: Optional[List[str]] = Query(None),
    municipio: Optional[List[str]] = Query(None),
    municipio_principal: Optional[List[str]] = Query(None)
):
    try:
        return national_service.get_dynamic_filter_options(
            sector=sector, 
            modalidad=modalidad, 
            nivel_de_formacion=nivel_de_formacion, 
            campo_amplio=campo_amplio, 
            campo_especifico=campo_especifico, 
            campo_detallado=campo_detallado, area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
            departamento=departamento, 
            departamento_principal=departamento_principal, 
            municipio=municipio, 
            municipio_principal=municipio_principal
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from app.services.db import db_service
import polars as pl

class NationalService:
    def _build_snies_filter_base(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, prefix="s"):
        f = f"{prefix}.estado_programa = 'ACTIVO' AND {prefix}.reconocimiento_del_ministerio IS NOT NULL AND {prefix}.reconocimiento_del_ministerio != ''"
        f += db_service._build_in_clause(f"{prefix}.sector", sector)
        f += db_service._build_in_clause(f"{prefix}.modalidad", modalidad)
        f += db_service._build_in_clause(f"{prefix}.nivel_de_formacion", nivel_de_formacion)
        f += db_service._build_in_clause(f"{prefix}.cine_f_2013_ac_campo_amplio", campo_amplio)
        f += db_service._build_in_clause(f"{prefix}.cine_f_2013_ac_campo_especific", campo_especifico)
        f += db_service._build_in_clause(f"{prefix}.cine_f_2013_ac_campo_detallado", campo_detallado)
        f += db_service._build_in_clause(f"{prefix}.area_de_conocimiento", area_de_conocimiento)
        f += db_service._build_in_clause(f"{prefix}.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        f += db_service._build_in_clause(f"{prefix}.nombre_institucion", institucion)
        f += db_service._build_in_clause(f"{prefix}.codigo_snies_del_programa", codigo_snies)
        f += db_service._build_ilike_clause_any(f"{prefix}.programa_academico", palabra_clave)
        return f

    def _build_dept_snies_filter(self, departamento, departamento_principal=None, municipio=None, municipio_principal=None):
        """Returns SQL clause to filter SNIES programs by geo criteria (names or divipola codes)."""
        clauses = []
        
        def process_filter(vals, name_col, code_col):
            if not vals or not isinstance(vals, list) or len(vals) == 0:
                return None
            valid_vals = [v for v in vals if v and str(v).strip()]
            if not valid_vals:
                return None
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in valid_vals)
            if is_code:
                joined = ", ".join([str(float(v)) for v in valid_vals])
                return f"{code_col} IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in valid_vals]
                joined = ", ".join([f"'{v}'" for v in escaped])
                return f"{name_col} IN ({joined})"

        # Dept Oferta
        f_dept_o = process_filter(departamento, "departamento_oferta", "divipola_depto_oferta")
        # Mpio Oferta
        f_mpio_o = process_filter(municipio, "municipio_oferta", "divipola_mpio_oferta")
        
        if f_dept_o or f_mpio_o:
            sub_clauses = [c for c in [f_dept_o, f_mpio_o] if c]
            joined_sub = " AND ".join(sub_clauses)
            clauses.append(f"s.codigo_snies_del_programa IN (SELECT DISTINCT codigo_snies_del_programa FROM df_Cobertura_distinct WHERE {joined_sub})")

        # Dept Principal
        f_dept_p = process_filter(departamento_principal, "departamento_principal", "divipola_depto_principal")
        if f_dept_p:
            clauses.append(f"s.{f_dept_p}")
            
        # Mpio Principal
        f_mpio_p = process_filter(municipio_principal, "municipio_principal", "divipola_mpio_principal")
        if f_mpio_p:
            clauses.append(f"s.{f_mpio_p}")

        if not clauses:
            return ""
        return " AND " + " AND ".join(clauses)

    def _build_dept_cobertura_filter(self, departamento, departamento_principal=None, municipio=None, municipio_principal=None):
        """Returns SQL clause to filter by geo on joined tables."""
        clauses = []
        
        def process_filter(vals, name_col, code_col):
            if not vals or not isinstance(vals, list) or len(vals) == 0:
                return None
            valid_vals = [v for v in vals if v and str(v).strip()]
            if not valid_vals:
                return None
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in valid_vals)
            if is_code:
                joined = ", ".join([str(float(v)) for v in valid_vals])
                return f"{code_col} IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in valid_vals]
                joined = ", ".join([f"'{v}'" for v in escaped])
                return f"{name_col} IN ({joined})"

        f_dept_o = process_filter(departamento, "c.departamento_oferta", "c.divipola_depto_oferta")
        if f_dept_o: clauses.append(f_dept_o)
        
        f_mpio_o = process_filter(municipio, "c.municipio_oferta", "c.divipola_mpio_oferta")
        if f_mpio_o: clauses.append(f_mpio_o)
            
        f_dept_p = process_filter(departamento_principal, "s.departamento_principal", "s.divipola_depto_principal")
        if f_dept_p: clauses.append(f_dept_p)
        
        f_mpio_p = process_filter(municipio_principal, "s.municipio_principal", "s.divipola_mpio_principal")
        if f_mpio_p: clauses.append(f_mpio_p)

        if not clauses:
            return ""
        return " AND " + " AND ".join(clauses)
    def _clean_kpi_dict(self, d):
        """Replaces NaN and Infinity values with None for JSON compatibility (recursively)."""
        import math
        clean = {}
        for k, v in d.items():
            if v is not None and isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean[k] = None
            elif isinstance(v, dict):
                clean[k] = self._clean_kpi_dict(v)
            else:
                clean[k] = v
        return clean

    def _build_geo_filter(self, table_alias, departamento, departamento_principal=None, municipio=None, municipio_principal=None):
        """Generic geo filter builder for tables with both SNIES and geo columns (like df_SaberPRO)."""
        clauses = []
        
        def process_filter(vals, name_col, code_col, custom_alias=None):
            if not vals or not isinstance(vals, list) or len(vals) == 0:
                return None
            valid_vals = [v for v in vals if v and str(v).strip()]
            if not valid_vals:
                return None
            
            alias = custom_alias or table_alias
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in valid_vals)
            if is_code:
                joined = ", ".join([str(float(v)) for v in valid_vals])
                return f"{alias}.{code_col} IN ({joined})"
            else:
                escaped = [v.replace("'", "''") for v in valid_vals]
                joined = ", ".join([f"'{v}'" for v in escaped])
                return f"{alias}.{name_col} IN ({joined})"

        # Dept Oferta / Presentacion (uses the main table alias, e.g. 'p')
        f_dept_o = process_filter(departamento, "departamento_presentacion", "divipola_depto_presentacion")
        if f_dept_o: clauses.append(f_dept_o)
        
        # Mpio Oferta / Presentacion
        f_mpio_o = process_filter(municipio, "municipio_presentacion", "divipola_mpio_presentacion")
        if f_mpio_o: clauses.append(f_mpio_o)
            
        # Dept Principal (always from SNIES table 's')
        f_dept_p = process_filter(departamento_principal, "departamento_principal", "divipola_depto_principal", custom_alias="s")
        if f_dept_p: clauses.append(f_dept_p)
        
        # Mpio Principal (always from SNIES table 's')
        f_mpio_p = process_filter(municipio_principal, "municipio_principal", "divipola_mpio_principal", custom_alias="s")
        if f_mpio_p: clauses.append(f_mpio_p)

        if not clauses:
            return ""
        return " AND " + " AND ".join(clauses)

    def _calculate_metric_with_trend(self, table_name, col, filters, agg_func="SUM", year_col="anno", departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """Calculates value for latest year and growth compared to previous available year."""
        import math
        
        # If the query is strictly against df_Master_Indicadores, we use the pre-joined fields
        is_master = table_name == "df_Master_Indicadores"
        
        # Use filtered year query to handle cases where certain filters (e.g. Dept) 
        # might have a different latest year than the global maximum.
        if is_master:
            year_query = f"SELECT DISTINCT {year_col} FROM {table_name} WHERE {filters} ORDER BY {year_col} DESC LIMIT 2"
        else:
            dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)
            year_query = f"""
                SELECT DISTINCT m.{year_col} 
                FROM {table_name} m 
                JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola 
                JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa 
                WHERE {filters}{dept_cob}
                ORDER BY 1 DESC LIMIT 2
            """
        
        try:
            years_df = db_service.query(year_query)
            if years_df.height == 0:
                return 0, 0, None
            # Master columns are anonymous or use year_col name. Let's use the first col.
            years = years_df[years_df.columns[0]].to_list()
        except:
            return 0, 0, None
            
        max_year = years[0]
        
        if is_master:
            # Filters are already mapped to master columns (e.g., sector instead of s.sector)
            query = f"""
                SELECT CAST({year_col} AS INTEGER) as anno, {agg_func}({col}) as total 
                FROM {table_name} 
                WHERE {filters} AND {year_col} IN ({', '.join(map(str, years))})
                GROUP BY 1
            """
        else:
            dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)
            query = f"""
                SELECT CAST(m.{year_col} AS INTEGER) as anno, {agg_func}(m.{col}) as total 
                FROM {table_name} m 
                JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola 
                JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa 
                WHERE {filters}{dept_cob} AND m.{year_col} IN ({', '.join(map(str, years))})
                GROUP BY 1
            """

        df = db_service.query(query)
        if df.height == 0:
            return 0, int(max_year), None

        latest_series = df.filter(pl.col("anno").cast(pl.Int64) == int(max_year))["total"]
        latest_val = latest_series[0] if not latest_series.is_empty() else 0
        
        growth = None
        if len(years) > 1:
            prev_year = int(years[1])
            prev_series = df.filter(pl.col("anno").cast(pl.Int64) == prev_year)["total"]
            if not prev_series.is_empty():
                prev_val = prev_series[0]
                if prev_val is not None and not math.isnan(prev_val) and prev_val > 0:
                    growth = ((latest_val - prev_val) / prev_val) * 100
                
        return latest_val, int(max_year), growth

    def _calculate_kpis(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """Internal helper to calculate KPIs for a specific set of filters."""
        # Base filter mapped to Dimension/Master tables where prefix 's.' is omitted or mapped directly
        snies_filter = "estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("sector", sector)
        snies_filter += db_service._build_in_clause("modalidad", modalidad)
        snies_filter += db_service._build_in_clause("nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("programa_academico", palabra_clave)
        
        # Build geo filter mapping to master view (omit prefixes)
        def process_geo_filter(vals, col):
            if not vals or not isinstance(vals, list) or len(vals) == 0:
                return None
            valid_vals = [v for v in vals if v and str(v).strip()]
            if not valid_vals:
                return None
            is_code = all(v.isdigit() or (v.replace('.','',1).isdigit()) for v in valid_vals)
            if is_code:
                return f"{col} IN ({', '.join([str(float(v)) for v in valid_vals])})"
            escaped = [v.replace("'", "''") for v in valid_vals]
            return f"{col} IN ({', '.join([f'{chr(39)}{v}{chr(39)}' for v in escaped])})"
            
        gf = []
        if departamento: gf.append(process_geo_filter(departamento, "divipola_depto_oferta" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in departamento if v) else "departamento_oferta"))
        if municipio: gf.append(process_geo_filter(municipio, "divipola_mpio_oferta" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in municipio if v) else "municipio_oferta"))
        if departamento_principal: gf.append(process_geo_filter(departamento_principal, "divipola_depto_principal" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in departamento_principal if v) else "departamento_principal"))
        if municipio_principal: gf.append(process_geo_filter(municipio_principal, "divipola_mpio_principal" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in municipio_principal if v) else "municipio_principal"))
        
        valid_gf = [g for g in gf if g]
        geo_filter_str = (" AND " + " AND ".join(valid_gf)) if valid_gf else ""
        master_filter = snies_filter + geo_filter_str

        # 1. & 2. IES and Programs (Against lightweight Dimension View)
        query_snies = f"SELECT COUNT(DISTINCT nombre_institucion) as num_ies, COUNT(DISTINCT codigo_snies_del_programa) as num_programs FROM df_Dimension_Filtros WHERE {master_filter}"
        df_snies = db_service.query(query_snies)
        num_ies, num_programs = df_snies["num_ies"][0], df_snies["num_programs"][0]

        # 3. Matricula - Using pre-calculated Master View
        total_m, year_m, growth_m = self._calculate_metric_with_trend("df_Master_Indicadores", "matricula_sum", master_filter)

        # 4. Primer Curso - Using pre-calculated Master View
        total_pc, year_pc, growth_pc = self._calculate_metric_with_trend("df_Master_Indicadores", "primer_curso_sum", master_filter)

        # 4b. Graduados - Using pre-calculated Master View
        total_g, year_g, growth_g = self._calculate_metric_with_trend("df_Master_Indicadores", "graduados_sum", master_filter)


        # Build shared filters with prefix 's.' for join operations
        snies_f_joint = self._build_snies_filter_base(
            sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
            campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
            area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
            institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
            prefix="s"
        )
        geo_f_joint = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        full_f_joint = f"{snies_f_joint} {geo_f_joint}"

        # 5. Deserción
        # Logic: If level filter is ONLY Posgrado, use Proxy. Otherwise use SPADIES.
        pos_levels = [
            'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA', 
            'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL', 
            'ESPECIALIZACION MEDICO QUIRURGICA'
        ]
        is_posgrado_only = nivel_de_formacion is not None and len(nivel_de_formacion) > 0 and all(l.upper() in pos_levels for l in nivel_de_formacion)
        
        target_table = "df_Desercion_Posgrado_Proxy" if is_posgrado_only else "df_SPADIES_Desercion"
        
        # Get filtered years
        years_query_d = f"""
            SELECT DISTINCT d.anno 
            FROM {target_table} d 
            JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
            WHERE {full_f_joint} AND d.anno IS NOT NULL 
            ORDER BY 1 DESC LIMIT 2
        """
        years_d = db_service.query(years_query_d)["anno"].to_list()
        
        avg_d, growth_d, max_y_d = 0, None, 0
        if years_d:
            max_y_d = int(years_d[0])
            query_d = f"""
                SELECT d.anno, AVG(d.desercion_anual_mean) as avg_val 
                FROM {target_table} d 
                JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {full_f_joint} 
                  AND d.anno IN ({', '.join(map(str, [int(y) for y in years_d]))})
                  AND d.desercion_anual_mean IS NOT NULL
                  AND NOT isnan(d.desercion_anual_mean)
                GROUP BY 1
            """
            df_d = db_service.query(query_d)
            if not df_d.is_empty():
                latest_d_series = df_d.filter(pl.col("anno") == max_y_d)["avg_val"]
                avg_d = latest_d_series[0] if not latest_d_series.is_empty() else 0
                
                if len(years_d) > 1:
                    prev_y_d = int(years_d[1])
                    prev_d_series = df_d.filter(pl.col("anno") == prev_y_d)["avg_val"]
                    if not prev_d_series.is_empty() and prev_d_series[0] is not None and prev_d_series[0] != 0:
                        growth_d = ((avg_d - prev_d_series[0]) / abs(prev_d_series[0])) * 100

        # 6. Saber PRO
        years_query_s = f"""
            SELECT DISTINCT p.anno 
            FROM df_SaberPRO_mean p 
            JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
            WHERE {full_f_joint} AND p.anno IS NOT NULL 
            ORDER BY 1 DESC LIMIT 2
        """
        years_s = db_service.query(years_query_s)["anno"].to_list()
        
        avg_s, growth_s, max_y_s = 0, None, 0
        if years_s:
            max_y_s = int(years_s[0])
            query_s = f"""
                SELECT p.anno, AVG(p.pro_gen_punt_global_mean) as avg_val 
                FROM df_SaberPRO_mean p 
                JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {full_f_joint} 
                  AND p.anno IN ({', '.join(map(str, [int(y) for y in years_s]))}) 
                  AND p.pro_gen_punt_global_mean IS NOT NULL 
                  AND NOT isnan(p.pro_gen_punt_global_mean)
                GROUP BY 1
            """
            df_s = db_service.query(query_s)
            if not df_s.is_empty():
                latest_s_series = df_s.filter(pl.col("anno") == max_y_s)["avg_val"]
                avg_s = latest_s_series[0] if not latest_s_series.is_empty() else 0
                
                if len(years_s) > 1:
                    prev_y_s = int(years_s[1])
                    prev_s_series = df_s.filter(pl.col("anno") == prev_y_s)["avg_val"]
                    if not prev_s_series.is_empty() and prev_s_series[0] > 0:
                        growth_s = ((avg_s - prev_s_series[0]) / prev_s_series[0]) * 100

        # 7. Empleabilidad
        years_query_o = f"""
            SELECT DISTINCT m.anno_corte 
            FROM df_OLE_Movilidad_M0 m 
            JOIN df_SNIES_Programas s ON TRY_CAST(m.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
            WHERE {full_f_joint} AND m.anno_corte IS NOT NULL 
            ORDER BY 1 DESC LIMIT 2
        """
        years_o = db_service.query(years_query_o)["anno_corte"].to_list()
        
        avg_o, growth_o, max_y_o = 0, None, 0
        if years_o:
            max_y_o = int(years_o[0])
            query_o = f"""
                WITH YearlyMetrics AS (
                    SELECT m.anno_corte as anno, m.codigo_snies_del_programa, SUM(m.graduados) as g, SUM(m.graduados_que_cotizan) as c 
                    FROM df_OLE_Movilidad_M0 m 
                    WHERE m.anno_corte IN ({', '.join(map(str, [int(y) for y in years_o]))})
                    GROUP BY 1, 2
                )
                SELECT agg.anno, AVG(LEAST(1.0, CAST(agg.c AS FLOAT) / NULLIF(agg.g, 0))) as avg_val 
                FROM YearlyMetrics agg 
                JOIN df_SNIES_Programas s ON TRY_CAST(agg.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {full_f_joint} AND agg.g > 0
                GROUP BY 1
            """
            df_o = db_service.query(query_o)
            if not df_o.is_empty():
                latest_o_series = df_o.filter(pl.col("anno").cast(pl.Int64) == max_y_o)["avg_val"]
                avg_o = latest_o_series[0] if not latest_o_series.is_empty() else 0
                
                if len(years_o) > 1:
                    prev_y_o = int(years_o[1])
                    prev_o_series = df_o.filter(pl.col("anno").cast(pl.Int64) == prev_y_o)["avg_val"]
                    if not prev_o_series.is_empty() and prev_o_series[0] > 0:
                        growth_o = ((avg_o - prev_o_series[0]) / prev_o_series[0]) * 100


        result = {
            "num_ies": int(num_ies),
            "num_programs": int(num_programs),
            "total_matricula": round(total_m) if total_m else 0,
            "total_matricula_growth": growth_m,
            "matricula_year": int(year_m),
            "total_pcurso": round(total_pc) if total_pc else 0,
            "total_pcurso_growth": growth_pc,
            "pcurso_year": int(year_pc),
            "total_graduados": round(total_g) if total_g else 0,
            "total_graduados_growth": growth_g,
            "graduados_year": int(year_g),
            "avg_desercion": round(float(avg_d) * 100, 2),
            "avg_desercion_growth": growth_d,
            "desercion_year": int(max_y_d),
            "avg_saberpro": round(float(avg_s), 2),
            "avg_saberpro_growth": growth_s,
            "saberpro_year": int(max_y_s),
            "avg_empleabilidad": round(float(avg_o) * 100, 2),
            "avg_empleabilidad_growth": growth_o,
            "empleabilidad_year": int(max_y_o)
        }
        return self._clean_kpi_dict(result)

    def get_dynamic_filter_options(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns dynamic valid options (cross-filtering) for all filters based on the CURRENT selections.
        When determining valid options for a specific dimension (e.g. 'sector'), we apply ALL filters EXCEPT the 'sector' filter itself.
        """
        options = {}
        
        def build_filter(exclude_dim=None):
            f_sector = sector if exclude_dim != 'sector' else None
            f_modalidad = modalidad if exclude_dim != 'modalidad' else None
            f_nivel = nivel_de_formacion if exclude_dim != 'nivel_de_formacion' else None
            f_amplio = campo_amplio if exclude_dim != 'campo_amplio' else None
            f_especifico = campo_especifico if exclude_dim != 'campo_especifico' else None
            f_detallado = campo_detallado if exclude_dim != 'campo_detallado' else None
            f_area = area_de_conocimiento if exclude_dim != 'area_de_conocimiento' else None
            f_nucleo = nucleo_basico_del_conocimiento if exclude_dim != 'nucleo_basico_del_conocimiento' else None
            f_inst = institucion if exclude_dim != 'institucion' else None
            f_palabra = palabra_clave if exclude_dim != 'palabra_clave' else None
            f_snies = codigo_snies if exclude_dim != 'codigo_snies' else None

            f_dept = departamento if exclude_dim != 'departamento' else None
            f_dept_p = departamento_principal if exclude_dim != 'departamento_principal' else None
            f_mpio = municipio if exclude_dim != 'municipio' else None
            f_mpio_p = municipio_principal if exclude_dim != 'municipio_principal' else None

            f = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
            f += db_service._build_in_clause("s.sector", f_sector)
            f += db_service._build_in_clause("s.modalidad", f_modalidad)
            f += db_service._build_in_clause("s.nivel_de_formacion", f_nivel)
            f += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", f_amplio)
            f += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", f_especifico)
            f += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", f_detallado)
            f += db_service._build_in_clause("s.area_de_conocimiento", f_area)
            f += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", f_nucleo)
            f += db_service._build_in_clause("s.nombre_institucion", f_inst)
            f += db_service._build_ilike_clause_any("s.programa_academico", f_palabra)
            f += db_service._build_in_clause("s.codigo_snies_del_programa", f_snies)

            geo_join = ""
            if f_dept or f_mpio:
                geo_join = "JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa"
                f += self._build_dept_cobertura_filter(f_dept, f_dept_p, f_mpio, f_mpio_p)
            else:
                f += self._build_dept_snies_filter(None, f_dept_p, None, f_mpio_p)
                
            return f, geo_join

        def query_distinct(dim, col_name, exclude_dim, geo_join_req=False):
            filt, geo_join = build_filter(exclude_dim)
            if geo_join_req and not geo_join:
                 geo_join = "JOIN (SELECT DISTINCT codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa"
            q = f"SELECT DISTINCT {col_name} as value FROM df_SNIES_Programas s {geo_join} WHERE {filt} AND {col_name} IS NOT NULL"
            res = db_service.query(q)
            return [str(v) if v is not None else "" for v in res["value"].to_list()]

        options['sector'] = query_distinct('sector', 's.sector', 'sector')
        options['modalidad'] = query_distinct('modalidad', 's.modalidad', 'modalidad')
        options['nivel_de_formacion'] = query_distinct('nivel_de_formacion', 's.nivel_de_formacion', 'nivel_de_formacion')
        options['campo_amplio'] = query_distinct('campo_amplio', 's.cine_f_2013_ac_campo_amplio', 'campo_amplio')
        options['campo_especifico'] = query_distinct('campo_especifico', 's.cine_f_2013_ac_campo_especific', 'campo_especifico')
        options['campo_detallado'] = query_distinct('campo_detallado', 's.cine_f_2013_ac_campo_detallado', 'campo_detallado')
        options['area_de_conocimiento'] = query_distinct('area_de_conocimiento', 's.area_de_conocimiento', 'area_de_conocimiento')
        options['nucleo_basico_del_conocimiento'] = query_distinct('nucleo_basico_del_conocimiento', 's.nucleo_basico_del_conocimiento', 'nucleo_basico_del_conocimiento')
        options['institucion'] = query_distinct('institucion', 's.nombre_institucion', 'institucion')

        
        # Geo queries needing code conversions for frontend matching
        # Dept Principal
        filt_dp, _ = build_filter('departamento_principal')
        q_dp = f"SELECT DISTINCT CAST(s.divipola_depto_principal AS BIGINT) as value FROM df_SNIES_Programas s WHERE {filt_dp} AND s.divipola_depto_principal IS NOT NULL"
        options['departamento_principal'] = [str(v) for v in db_service.query(q_dp)["value"].to_list()]

        # Mpio Principal
        filt_mp, _ = build_filter('municipio_principal')
        q_mp = f"SELECT DISTINCT CAST(s.divipola_mpio_principal AS BIGINT) as value FROM df_SNIES_Programas s WHERE {filt_mp} AND s.divipola_mpio_principal IS NOT NULL"
        options['municipio_principal'] = [str(v) for v in db_service.query(q_mp)["value"].to_list()]

        # Dept Oferta (needs Cobertura join)
        filt_do, geo_join_do = build_filter('departamento')
        if not geo_join_do: geo_join_do = "JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_depto_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa"
        q_do = f"SELECT DISTINCT CAST(c.divipola_depto_oferta AS BIGINT) as value FROM df_SNIES_Programas s {geo_join_do} WHERE {filt_do} AND c.divipola_depto_oferta IS NOT NULL"
        options['departamento'] = [str(v) for v in db_service.query(q_do)["value"].to_list()]

        # Mpio Oferta (needs Cobertura join)
        filt_mo, geo_join_mo = build_filter('municipio')
        if not geo_join_mo: geo_join_mo = "JOIN (SELECT DISTINCT codigo_snies_del_programa, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON s.codigo_snies_del_programa = c.codigo_snies_del_programa"
        q_mo = f"SELECT DISTINCT CAST(c.divipola_mpio_oferta AS BIGINT) as value FROM df_SNIES_Programas s {geo_join_mo} WHERE {filt_mo} AND c.divipola_mpio_oferta IS NOT NULL"
        options['municipio'] = [str(v) for v in db_service.query(q_mo)["value"].to_list()]
        
        return options


    def get_national_kpis(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """Returns complex KPI structure including global summary, by-sector, and by-level breakdown."""
        # 1. Global summary (with current filters)
        summary = self._calculate_kpis(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
        
        # 2. Breakdown by Sector
        sectors = ['OFICIAL', 'PRIVADO']
        by_sector = {s: self._calculate_kpis([s], modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal) for s in sectors}

        # 3. Breakdown by Level (now respects global nivel_de_formacion filter)
        tyt_levels = ['TECNOLOGICO', 'FORMACION TECNICA PROFESIONAL']
        uni_levels = ['UNIVERSITARIO']
        pos_levels = [
            'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA', 
            'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL', 
            'ESPECIALIZACION MEDICO QUIRURGICA'
        ]

        def intersect_levels(group, user_select):
            if not user_select: return group
            intersect = [l for l in group if l in user_select]
            return intersect if intersect else ["__NONE__"]

        tyt_kpis = self._calculate_kpis(sector, modalidad, intersect_levels(tyt_levels, nivel_de_formacion), campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
        uni_kpis = self._calculate_kpis(sector, modalidad, intersect_levels(uni_levels, nivel_de_formacion), campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
        pos_kpis = self._calculate_kpis(sector, modalidad, intersect_levels(pos_levels, nivel_de_formacion), campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)

        # Apply specific overrides as requested:
        # T&T: Saber PRO -> NA (None)
        tyt_kpis["avg_saberpro"] = None
        
        # Posgrado: Saber PRO -> NA
        pos_kpis["avg_saberpro"] = None

        # Posgrado: Deserción Proxy Calculation
        # We need to manually calculate it for the pos_kpis dictionary using the proxy view
        # The _calculate_kpis method uses the standard SPADIES table, so we do a specific query here.
        
        # Reuse logic from _calculate_metric_with_trend but with the Proxy table and AVG
        # We need to filter by sector, modality and the specific pos_levels
        
        # Build filter for Posgrado specific query
        pos_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        pos_filter += db_service._build_in_clause("s.sector", sector)
        pos_filter += db_service._build_in_clause("s.modalidad", modalidad)
        pos_filter += db_service._build_in_clause("s.nivel_de_formacion", intersect_levels(pos_levels, nivel_de_formacion))
        pos_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        pos_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        pos_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        pos_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        pos_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        pos_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        pos_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        pos_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        pos_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        
        # Get years for Proxy
        years_query_p = "SELECT DISTINCT anno FROM df_Desercion_Posgrado_Proxy ORDER BY anno DESC LIMIT 2"
        try:
            years_p_df = db_service.query(years_query_p)
            years_p = years_p_df["anno"].to_list() if not years_p_df.is_empty() else []
        except:
            years_p = []

        if years_p:
            max_y_p = int(years_p[0])
            query_p = f"""
                SELECT p.anno, AVG(p.desercion_anual_mean) as avg_val 
                FROM df_Desercion_Posgrado_Proxy p 
                JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {pos_filter} 
                  AND p.anno IN ({', '.join(map(str, [int(y) for y in years_p]))})
                GROUP BY 1
            """
            try:
                df_p = db_service.query(query_p)
                if not df_p.is_empty():
                    latest_p = df_p.filter(pl.col("anno") == max_y_p)["avg_val"]
                    val_p = latest_p[0] if not latest_p.is_empty() else 0
                    
                    growth_p = None
                    if len(years_p) > 1:
                        prev_y_p = int(years_p[1])
                        prev_p = df_p.filter(pl.col("anno") == prev_y_p)["avg_val"]
                        if not prev_p.is_empty() and prev_p[0] > 0:
                             growth_p = ((val_p - prev_p[0]) / prev_p[0]) * 100
                    
                    # Update the KPI dict
                    pos_kpis["avg_desercion"] = round(float(val_p) * 100, 2)
                    pos_kpis["avg_desercion_growth"] = growth_p
                    pos_kpis["desercion_year"] = int(max_y_p)
            except Exception as e:
                print(f"Error calculating Posgrado Desertion Proxy: {e}")

        by_level = {
            "T&T": tyt_kpis,
            "Universitario": uni_kpis,
            "Posgrado": pos_kpis
        }
            
        return self._clean_kpi_dict({
            "summary": summary,
            "by_sector": by_sector,
            "by_level": by_level
        })







    def get_national_context_charts(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns data for the 4 requested horizontal bar charts:
        1. IES by Sector
        2. Programs by Modalidad
        3. Students by Nivel de Formacion
        4. Programs by Field of Knowledge (cine_f_2013_ac_campo_amplio)
        """
        
        # Common filter for SNIES
        snies_filter = "estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != ''"
        
        snies_filter += db_service._build_in_clause("sector", sector)
        snies_filter += db_service._build_in_clause("modalidad", modalidad)
        snies_filter += db_service._build_in_clause("nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("programa_academico", palabra_clave)
        
        # Geo filters
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        # 1. IES by Sector
        q1 = f"""
            SELECT sector, COUNT(DISTINCT nombre_institucion) as count 
            FROM df_SNIES_Programas 
            WHERE {snies_filter}
            GROUP BY sector 
            ORDER BY count ASC
        """
        df1 = db_service.query(q1)

        # 2. Programs by Modalidad
        q2 = f"""
            SELECT modalidad, COUNT(DISTINCT codigo_snies_del_programa) as count 
            FROM df_SNIES_Programas 
            WHERE {snies_filter}
            GROUP BY modalidad 
            ORDER BY count ASC
        """
        df2 = db_service.query(q2)

        # 3. Students by Nivel de Formacions
        # Need max year for matricula
        year_query = "SELECT MAX(anno) as max_year FROM df_Matricula_agg"
        max_year = db_service.query(year_query)["max_year"][0]

        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal)
        q3 = f"""
            SELECT s.nivel_de_formacion, SUM(m.matricula_sum) as count
            FROM df_Matricula_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c 
              ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE s.estado_programa = 'ACTIVO' 
              AND s.reconocimiento_del_ministerio IS NOT NULL 
              AND s.reconocimiento_del_ministerio != ''
              AND m.anno = {max_year}
        """
        q3 += db_service._build_in_clause("s.sector", sector)
        q3 += db_service._build_in_clause("s.modalidad", modalidad)
        q3 += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        q3 += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        q3 += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        q3 += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        q3 += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        q3 += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        q3 += db_service._build_in_clause("s.nombre_institucion", institucion)
        q3 += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        q3 += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        q3 += dept_cob
        q3 += """
            GROUP BY s.nivel_de_formacion
            ORDER BY count ASC
        """
        df3 = db_service.query(q3)

        # 4. Programs by Field
        q4 = f"""
            SELECT cine_f_2013_ac_campo_amplio as field, COUNT(DISTINCT codigo_snies_del_programa) as count
            FROM df_SNIES_Programas
            WHERE {snies_filter}
            GROUP BY field
            ORDER BY count ASC
        """
        df4 = db_service.query(q4)

        return {
            "ies_by_sector": {"labels": df1["sector"].to_list(), "values": df1["count"].to_list()},
            "programs_by_modalidad": {"labels": df2["modalidad"].to_list(), "values": df2["count"].to_list()},
            "students_by_level": {"labels": df3["nivel_de_formacion"].to_list(), "values": df3["count"].to_list()},
            "programs_by_field": {"labels": df4["field"].to_list(), "values": df4["count"].to_list()}
        }

    def get_national_primer_curso_evolution(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Calculates evolution of Primer Curso from 2016, 
        broken down by level groups (T&T, Universitario, Posgrado) 
        and grouped modality.
        """
        return self._calculate_evolution(sector, modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)

    def get_national_primer_curso_evolution_by_sector(self, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """Returns evolution for Official and Private sectors separately."""
        return {
            "OFICIAL": self._calculate_evolution(['OFICIAL'], modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal),
            "PRIVADO": self._calculate_evolution(['PRIVADO'], modalidad, nivel_de_formacion, campo_amplio, campo_especifico, campo_detallado, area_de_conocimiento, nucleo_basico_del_conocimiento, institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies, departamento=departamento, departamento_principal=departamento_principal, municipio=municipio, municipio_principal=municipio_principal)
        }

    def _calculate_evolution(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        # 1. Base query to get raw data
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)
        query = f"""
            SELECT 
                s.nivel_de_formacion,
                s.modalidad,
                CAST(m.anno AS INTEGER) as year,
                SUM(m.primer_curso_sum) as total
            FROM df_PCurso_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c 
              ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE s.estado_programa = 'ACTIVO' 
              AND s.reconocimiento_del_ministerio IS NOT NULL 
              AND s.reconocimiento_del_ministerio != ''
              AND m.anno >= 2016
        """
        query += db_service._build_in_clause("s.sector", sector)
        query += db_service._build_in_clause("s.modalidad", modalidad)
        query += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        query += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        query += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        query += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        query += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        query += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        query += db_service._build_in_clause("s.nombre_institucion", institucion)
        query += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        query += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        query += dept_cob
        
        query += " GROUP BY 1, 2, 3"
        
        df = db_service.query(query)
        
        if df.height == 0:
            return {}

        # 2. Add Grouped Columns in Polars
        df = df.with_columns(
            pl.when(pl.col("modalidad") == "PRESENCIAL").then(pl.lit("Presencial"))
            .when(pl.col("modalidad") == "VIRTUAL").then(pl.lit("Virtual"))
            .when(pl.col("modalidad") == "A DISTANCIA").then(pl.lit("A distancia"))
            .otherwise(pl.lit("Otros")).alias("modality_group")
        )

        tyt_levels = ['TECNOLOGICO', 'FORMACION TECNICA PROFESIONAL']
        uni_levels = ['UNIVERSITARIO']
        pos_levels = [
            'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA', 
            'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL', 
            'ESPECIALIZACION MEDICO QUIRURGICA'
        ]

        df = df.with_columns(
            pl.when(pl.col("nivel_de_formacion").is_in(tyt_levels)).then(pl.lit("T&T"))
            .when(pl.col("nivel_de_formacion").is_in(uni_levels)).then(pl.lit("Universitario"))
            .when(pl.col("nivel_de_formacion").is_in(pos_levels)).then(pl.lit("Posgrado"))
            .otherwise(pl.lit("Otros")).alias("level_group")
        )

        # 3. Aggregate by groupings
        agg = df.group_by(["level_group", "modality_group", "year"]).agg(pl.col("total").sum()).sort("year")
        
        # 4. Format for Plotly
        result = {}
        target_levels = ['T&T', 'Universitario', 'Posgrado']
        years = sorted(agg["year"].unique().to_list()) if not agg.is_empty() else []
        
        # Get groups that actually have data
        present_levels = agg["level_group"].unique().to_list() if not agg.is_empty() else []
        present_modalities = agg["modality_group"].unique().to_list() if not agg.is_empty() else []
        
        for level in target_levels:
            if level not in present_levels:
                continue
                
            sub_level = agg.filter(pl.col("level_group") == level)
            if sub_level.is_empty():
                continue

            result[level] = {
                "years": years,
                "series": []
            }
            
            for mod in ['Presencial', 'Virtual', 'A distancia', 'Otros']:
                if mod not in present_modalities:
                    continue
                    
                sub_mod = sub_level.filter(pl.col("modality_group") == mod)
                # Only add if the series has at least one value > 0 to avoid empty lines if filtered
                values = []
                has_data = False
                for y in years:
                    y_val = sub_mod.filter(pl.col("year") == y)["total"]
                    val = int(y_val[0]) if y_val.len() > 0 else 0
                    values.append(val)
                    if val > 0:
                        has_data = True
                
                if has_data:
                    result[level]["series"].append({
                        "name": mod,
                        "data": values
                    })
            
            # If no series had data for this level, remove it from result
            if not result[level]["series"]:
                del result[level]
        
        return result

    def get_kpi_evolution(self, metric, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """Calculates historical evolution for a specific KPI."""
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        if metric == "pcurso":
            pass # We handle most metrics below
        if metric in ["matricula", "pcurso", "graduados"]:
            # Standard metrics use the Master view for consistency and performance
            col_map = {"matricula": "matricula_sum", "pcurso": "primer_curso_sum", "graduados": "graduados_sum"}
            target_col = col_map[metric]
            
            # Re-build filter specifically for Master View (flat columns)
            m_filter = "estado_programa = 'ACTIVO' AND reconocimiento_del_ministerio IS NOT NULL AND reconocimiento_del_ministerio != ''"
            m_filter += db_service._build_in_clause("sector", sector)
            m_filter += db_service._build_in_clause("modalidad", modalidad)
            m_filter += db_service._build_in_clause("nivel_de_formacion", nivel_de_formacion)
            m_filter += db_service._build_in_clause("cine_f_2013_ac_campo_amplio", campo_amplio)
            m_filter += db_service._build_in_clause("cine_f_2013_ac_campo_especific", campo_especifico)
            m_filter += db_service._build_in_clause("cine_f_2013_ac_campo_detallado", campo_detallado)
            m_filter += db_service._build_in_clause("area_de_conocimiento", area_de_conocimiento)
            m_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
            m_filter += db_service._build_in_clause("nombre_institucion", institucion)
            m_filter += db_service._build_ilike_clause_any("programa_academico", palabra_clave)
            m_filter += db_service._build_in_clause("codigo_snies_del_programa", codigo_snies)
            
            def process_geo_flat(vals, col):
                if not vals: return None
                is_code = all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in vals if v)
                if is_code: return f"{col} IN ({', '.join([str(float(v)) for v in vals if v])})"
                escaped = [v.replace("'", "''") for v in vals if v]
                return f"{col} IN ({', '.join([f'{chr(39)}{v}{chr(39)}' for v in escaped])})"
            
            gf = []
            if departamento: gf.append(process_geo_flat(departamento, "divipola_depto_oferta" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in departamento if v) else "departamento_oferta"))
            if municipio: gf.append(process_geo_flat(municipio, "divipola_mpio_oferta" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in municipio if v) else "municipio_oferta"))
            if departamento_principal: gf.append(process_geo_flat(departamento_principal, "divipola_depto_principal" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in departamento_principal if v) else "departamento_principal"))
            if municipio_principal: gf.append(process_geo_flat(municipio_principal, "divipola_mpio_principal" if all(str(v).isdigit() or str(v).replace('.','',1).isdigit() for v in municipio_principal if v) else "municipio_principal"))
            
            valid_gf = [g for g in gf if g]
            if valid_gf: m_filter += " AND " + " AND ".join(valid_gf)

            query = f"SELECT anno, SUM({target_col}) as value FROM df_Master_Indicadores WHERE {m_filter} GROUP BY 1 ORDER BY 1"
            scale = 1
        elif metric == "desercion":
            # Select table based on whether we are filtering for Posgrado only
            pos_levels = ['MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA', 'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL', 'ESPECIALIZACION MEDICO QUIRURGICA']
            is_posgrado_only = nivel_de_formacion is not None and len(nivel_de_formacion) > 0 and all(l.upper() in pos_levels for l in nivel_de_formacion)
            
            target_table = "df_Desercion_Posgrado_Proxy" if is_posgrado_only else "df_SPADIES_Desercion"
            
            snies_f = self._build_snies_filter_base(
                sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
                campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
                area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
                institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
                prefix="s"
            )
            geo_ext = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
            
            query = f"""
                SELECT d.anno, AVG(d.desercion_anual_mean) as value 
                FROM {target_table} d 
                JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {snies_f} {geo_ext}
                  AND d.desercion_anual_mean IS NOT NULL 
                  AND NOT isnan(d.desercion_anual_mean)
                GROUP BY 1 ORDER BY 1
            """
            scale = 100
        elif metric == "saberpro":
            # SaberPRO uses specialized mean table, needs SNIES join for filters
            s_filter = self._build_snies_filter_base(
                sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
                campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
                area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
                institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
                prefix="s"
            )
            geo_ext = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
            
            query = f"""
                SELECT p.anno, AVG(p.pro_gen_punt_global_mean) as value 
                FROM df_SaberPRO_mean p 
                JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {s_filter} {geo_ext} 
                  AND p.pro_gen_punt_global_mean IS NOT NULL 
                GROUP BY 1 ORDER BY 1
            """
            scale = 1
        elif metric == "empleabilidad":
            s_filter = self._build_snies_filter_base(
                sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
                campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
                area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
                institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
                prefix="s"
            )
            geo_ext = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)

            query = f"""
                WITH YearlyMetrics AS (
                    SELECT m.anno_corte as anno, m.codigo_snies_del_programa, SUM(m.graduados) as g, SUM(m.graduados_que_cotizan) as c 
                    FROM df_OLE_Movilidad_M0 m 
                    GROUP BY 1, 2
                )
                SELECT agg.anno, AVG(LEAST(1.0, CAST(agg.c AS FLOAT) / NULLIF(agg.g, 0))) as value 
                FROM YearlyMetrics agg 
                JOIN df_SNIES_Programas s ON TRY_CAST(agg.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {s_filter} {geo_ext} AND agg.g > 0
                GROUP BY 1 ORDER BY 1
            """
            scale = 100
        else:
            return {"years": [], "values": []}

        df = db_service.query(query)
        if df.is_empty():
            return {"years": [], "values": []}
            
        import math
        return {
            "years": df[df.columns[0]].to_list(),
            "values": [
                round(float(v) * scale, 2) 
                if v is not None and not math.isnan(float(v)) and not math.isinf(float(v)) 
                else None 
                for v in df["value"].to_list()
            ]
        }

    def get_national_discipline_stats(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns data for a horizontal stacked bar chart:
        - X-axis: Number of academic programs
        - Y-axis: Área de Conocimiento
        - Groups/Legend: Sector (Oficial vs Privado)
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)

        query = f"""
            SELECT 
                s.area_de_conocimiento as field,
                s.sector,
                COUNT(DISTINCT s.codigo_snies_del_programa) as count
            FROM df_SNIES_Programas s
            WHERE {snies_filter} AND s.area_de_conocimiento IS NOT NULL
            GROUP BY 1, 2
            ORDER BY field ASC
        """
        df = db_service.query(query)
        
        if df.is_empty():
            return {"labels": [], "series": []}

        # Calculate totals per field to sort labels from largest to smallest
        totals = df.group_by("field").agg(pl.col("count").sum().alias("total")).sort("total", descending=True)
        fields = totals["field"].to_list()
        sectors = sorted(df["sector"].unique().to_list())
        
        series = []
        for sec in sectors:
            sec_data = []
            for f in fields:
                val = df.filter((pl.col("field") == f) & (pl.col("sector") == sec))["count"]
                sec_data.append(int(val[0]) if not val.is_empty() else 0)
            series.append({"name": sec, "data": sec_data})

        return {
            "labels": fields,
            "series": series
        }

    def get_national_field_trend(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns evolution of Primer Curso sum by Área de Conocimiento.
        """
        snies_filter = self._build_snies_filter_base(
            sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
            campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
            area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
            institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
            prefix="s"
        )
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        query = f"""
            SELECT 
                s.area_de_conocimiento as field,
                CAST(m.anno AS INTEGER) as year,
                SUM(m.primer_curso_sum) as total
            FROM df_PCurso_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c 
              ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE {snies_filter}{dept_cob}
              AND m.anno >= 2016
              AND s.area_de_conocimiento IS NOT NULL
            GROUP BY 1, 2
            ORDER BY year ASC, total DESC
        """
        df = db_service.query(query)
        
        if df.is_empty():
            return {"years": [], "series": []}

        years = sorted(df["year"].unique().to_list())
        fields = df["field"].unique().to_list()
        
        series = []
        for f in fields:
            f_data = []
            has_data = False
            for y in years:
                val = df.filter((pl.col("field") == f) & (pl.col("year") == y))["total"]
                v = int(val[0]) if not val.is_empty() else 0
                f_data.append(v)
                if v > 0: has_data = True
            
            if has_data:
                series.append({"name": f, "data": f_data})

        return {
            "years": years,
            "series": series
        }

    def get_national_discipline_table(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns a flat list of dicts for a table grouped by Área and Núcleo Básico.
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        # Get latest years
        y_m = db_service.query("SELECT MAX(anno) as y FROM df_Matricula_agg")["y"][0]
        y_p = db_service.query("SELECT MAX(anno) as y FROM df_PCurso_agg")["y"][0]
        y_g = db_service.query("SELECT MAX(anno) as y FROM df_Graduados_agg")["y"][0]
        y_d = db_service.query("SELECT MAX(anno) as y FROM df_SPADIES_Desercion")["y"][0]
        y_s = db_service.query("SELECT MAX(anno) as y FROM df_SaberPRO_mean")["y"][0]
        y_o = db_service.query("SELECT MAX(anno_corte) as y FROM df_OLE_Movilidad_M0")["y"][0]

        # Base Data
        q_base = f"""
            SELECT 
                area_de_conocimiento,
                nucleo_basico_del_conocimiento,
                COUNT(DISTINCT nombre_institucion) as num_ies,
                COUNT(DISTINCT codigo_snies_del_programa) as num_programs
            FROM df_SNIES_Programas s
            WHERE {snies_filter} AND area_de_conocimiento IS NOT NULL AND nucleo_basico_del_conocimiento IS NOT NULL
            GROUP BY 1, 2
        """
        df_base = db_service.query(q_base).fill_nan(None)
        # Matricula
        q_mat = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   SUM(CASE WHEN m.anno = {y_m} THEN m.matricula_sum ELSE 0 END) as curr,
                   SUM(CASE WHEN m.anno = {y_m-1} THEN m.matricula_sum ELSE 0 END) as prev
            FROM df_Matricula_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE {snies_filter}{dept_cob} AND m.anno IN ({y_m}, {y_m-1})
            GROUP BY 1, 2
        """
        df_mat = db_service.query(q_mat).fill_nan(0)

        # Primer Curso
        q_pcurso = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   SUM(CASE WHEN m.anno = {y_p} THEN m.primer_curso_sum ELSE 0 END) as curr,
                   SUM(CASE WHEN m.anno = {y_p-1} THEN m.primer_curso_sum ELSE 0 END) as prev
            FROM df_PCurso_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE {snies_filter}{dept_cob} AND m.anno IN ({y_p}, {y_p-1})
            GROUP BY 1, 2
        """
        df_pcurso = db_service.query(q_pcurso).fill_nan(0)

        # Graduados
        q_grad = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   SUM(CASE WHEN m.anno = {y_g} THEN m.graduados_sum ELSE 0 END) as curr,
                   SUM(CASE WHEN m.anno = {y_g-1} THEN m.graduados_sum ELSE 0 END) as prev
            FROM df_Graduados_agg m
            JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola
            JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
            WHERE {snies_filter}{dept_cob} AND m.anno IN ({y_g}, {y_g-1})
            GROUP BY 1, 2
        """
        df_grad = db_service.query(q_grad).fill_nan(0)

        # Desercion
        q_des = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   AVG(CASE WHEN d.anno = {y_d} THEN d.desercion_anual_mean ELSE NULL END) as curr,
                   AVG(CASE WHEN d.anno = {y_d-1} THEN d.desercion_anual_mean ELSE NULL END) as prev
            FROM df_SPADIES_Desercion d
            JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND d.anno IN ({y_d}, {y_d-1})
            GROUP BY 1, 2
        """
        df_des = db_service.query(q_des).fill_nan(None)

        # Saber PRO
        q_saber = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   AVG(CASE WHEN p.anno = {y_s} THEN p.pro_gen_punt_global_mean ELSE NULL END) as curr,
                   AVG(CASE WHEN p.anno = {y_s-1} THEN p.pro_gen_punt_global_mean ELSE NULL END) as prev
            FROM df_SaberPRO_mean p
            JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND p.anno IN ({y_s}, {y_s-1})
            GROUP BY 1, 2
        """
        df_saber = db_service.query(q_saber).fill_nan(None)

        # Empleabilidad
        q_emp = f"""
            SELECT s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   AVG(CASE WHEN m.anno_corte = {y_o} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as curr,
                   AVG(CASE WHEN m.anno_corte = {y_o-1} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as prev
            FROM df_OLE_Movilidad_M0 m
            JOIN df_SNIES_Programas s ON TRY_CAST(m.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND m.anno_corte IN ({y_o}, {y_o-1}) AND m.graduados > 0
            GROUP BY 1, 2
        """
        df_emp = db_service.query(q_emp).fill_nan(None)

        # Convert to dicts for easier Python processing
        base_data = df_base.to_dicts()
        mat_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_mat.to_dicts()}
        pcurso_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_pcurso.to_dicts()}
        grad_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_grad.to_dicts()}
        des_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_des.to_dicts()}
        saber_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_saber.to_dicts()}
        emp_data = {(r['area_de_conocimiento'], r['nucleo_basico_del_conocimiento']): r for r in df_emp.to_dicts()}

        # Helper to aggregate stats
        def aggregate_stats(rows):
            stats = {
                'num_ies': sum(r['num_ies'] for r in rows),
                'num_programs': sum(r['num_programs'] for r in rows),
                'total_matricula': sum(r['total_matricula'] for r in rows),
                'total_matricula_prev': sum(r['total_matricula_prev'] for r in rows),
                'total_pcurso': sum(r['total_pcurso'] for r in rows),
                'total_pcurso_prev': sum(r['total_pcurso_prev'] for r in rows),
                'total_graduados': sum(r['total_graduados'] for r in rows),
                'total_graduados_prev': sum(r['total_graduados_prev'] for r in rows),
                'avg_desercion': sum(r['avg_desercion'] for r in rows if r['avg_desercion'] is not None) / len([r for r in rows if r['avg_desercion'] is not None]) if any(r['avg_desercion'] is not None for r in rows) else 0,
                'avg_desercion_prev': sum(r['avg_desercion_prev'] for r in rows if r['avg_desercion_prev'] is not None) / len([r for r in rows if r['avg_desercion_prev'] is not None]) if any(r['avg_desercion_prev'] is not None for r in rows) else 0,
                'avg_saberpro': sum(r['avg_saberpro'] for r in rows if r['avg_saberpro'] is not None) / len([r for r in rows if r['avg_saberpro'] is not None]) if any(r['avg_saberpro'] is not None for r in rows) else 0,
                'avg_saberpro_prev': sum(r['avg_saberpro_prev'] for r in rows if r['avg_saberpro_prev'] is not None) / len([r for r in rows if r['avg_saberpro_prev'] is not None]) if any(r['avg_saberpro_prev'] is not None for r in rows) else 0,
                'avg_empleabilidad': sum(r['avg_empleabilidad'] for r in rows if r['avg_empleabilidad'] is not None) / len([r for r in rows if r['avg_empleabilidad'] is not None]) if any(r['avg_empleabilidad'] is not None for r in rows) else 0,
                'avg_empleabilidad_prev': sum(r['avg_empleabilidad_prev'] for r in rows if r['avg_empleabilidad_prev'] is not None) / len([r for r in rows if r['avg_empleabilidad_prev'] is not None]) if any(r['avg_empleabilidad_prev'] is not None for r in rows) else 0,
            }
            return stats

        # Prepare detailed rows
        detailed_rows = []
        for row in base_data:
            key = (row['area_de_conocimiento'], row['nucleo_basico_del_conocimiento'])
            
            m = mat_data.get(key, {'curr': 0, 'prev': 0})
            p = pcurso_data.get(key, {'curr': 0, 'prev': 0})
            g = grad_data.get(key, {'curr': 0, 'prev': 0})
            d = des_data.get(key, {'curr': None, 'prev': None})
            s = saber_data.get(key, {'curr': None, 'prev': None})
            e = emp_data.get(key, {'curr': None, 'prev': None})

            detailed_rows.append({
                'area_de_conocimiento': row['area_de_conocimiento'],
                'nucleo_basico_del_conocimiento': row['nucleo_basico_del_conocimiento'],
                'num_ies': row['num_ies'],
                'num_programs': row['num_programs'],
                'total_matricula': m['curr'],
                'total_matricula_prev': m['prev'],
                'total_pcurso': p['curr'],
                'total_pcurso_prev': p['prev'],
                'total_graduados': g['curr'],
                'total_graduados_prev': g['prev'],
                'avg_desercion': d['curr'],
                'avg_desercion_prev': d['prev'],
                'avg_saberpro': s['curr'],
                'avg_saberpro_prev': s['prev'],
                'avg_empleabilidad': e['curr'],
                'avg_empleabilidad_prev': e['prev']
            })

        # Process Hierarchy
        area_groups = {}
        for r in detailed_rows:
            area_groups.setdefault(r['area_de_conocimiento'], []).append(r)
        
        result_tree = []

        for area, area_rows in area_groups.items():
            
            # Level 2 (Leaves): Nucleos
            nucleo_children = []
            for n_row in area_rows:
                nucleo_children.append({
                    'name': n_row['nucleo_basico_del_conocimiento'],
                    'level': 'nucleo_basico',
                    **self._format_node_stats(n_row)
                })
            
            # Aggregate for Area
            a_stats = aggregate_stats(area_rows)
            result_tree.append({
                'name': area,
                'level': 'area_conocimiento',
                **self._format_node_stats(a_stats),
                'children': nucleo_children
            })
            
        return result_tree

    def _format_node_stats(self, data):
        def get_growth(curr, prev):
            if curr is not None and prev and prev > 0:
                growth = (curr - prev) / prev * 100
                return sanitize(growth)
            return None

        def sanitize(val):
            import math
            if isinstance(val, float):
                if math.isnan(val) or math.isinf(val):
                    return None
                return round(val, 2)
            return val

        return {
            'num_ies': data['num_ies'],
            'num_programs': data['num_programs'],
            'total_matricula': sanitize(data['total_matricula']),
            'total_matricula_growth': get_growth(data['total_matricula'], data['total_matricula_prev']),
            'total_pcurso': sanitize(data['total_pcurso']),
            'total_pcurso_growth': get_growth(data['total_pcurso'], data['total_pcurso_prev']),
            'total_graduados': sanitize(data['total_graduados']),
            'total_graduados_growth': get_growth(data['total_graduados'], data['total_graduados_prev']),
            'avg_desercion': sanitize(data['avg_desercion'] * 100 if data['avg_desercion'] else 0),
            'avg_desercion_growth': get_growth(data['avg_desercion'], data['avg_desercion_prev']),
            'avg_saberpro': sanitize(data['avg_saberpro'] if data['avg_saberpro'] else 0),
            'avg_saberpro_growth': get_growth(data['avg_saberpro'], data['avg_saberpro_prev']),
            'avg_empleabilidad': sanitize(data['avg_empleabilidad'] * 100 if data['avg_empleabilidad'] else 0),
            'avg_empleabilidad_growth': get_growth(data['avg_empleabilidad'], data['avg_empleabilidad_prev']),
        }

    def _get_nivel_group(self, nivel):
        if not nivel: return "Desconocido"
        nivel = nivel.upper()
        if nivel in ["FORMACION TECNICA PROFESIONAL", "TECNOLOGICO", "ESPECIALIZACION TECNICO PROFESIONAL", "ESPECIALIZACION TECNOLOGICA"]:
            return "T&T"
        elif nivel == "UNIVERSITARIO":
            return "Universitarios"
        elif nivel in ["ESPECIALIZACION UNIVERSITARIA", "ESPECIALIZACION MEDICO QUIRURGICA", "MAESTRIA", "DOCTORADO"]:
            return "Posgrado"
        return "Otros"

    def _get_modalidad_group(self, mod):
        if not mod: return "Desconocido"
        mod = mod.upper()
        if "PRESENCIAL" in mod:
            return "Presencial"
        elif "VIRTUAL" in mod:
            return "Virtual"
        elif "A DISTANCIA" in mod:
            return "A Distancia"
        else:
            return "Otros"

    def get_national_saberpro_stats(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Calculates distribution data for Saber PRO scores for boxplot visualization.
        Returns global summary and breakdowns by sector and modalidad.
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        
        geo_filter = self._build_geo_filter("p", departamento, departamento_principal, municipio, municipio_principal)

        max_year_query = "SELECT MAX(anno) as max_year FROM df_SaberPRO"
        try:
            max_year = db_service.query(max_year_query)["max_year"][0]
        except:
            max_year = 2023

        columns = [
            "pro_gen_punt_global",
            "pro_gen_mod_razona_cuantitat_punt",
            "pro_gen_mod_lectura_critica_punt",
            "pro_gen_mod_competen_ciudada_punt",
            "pro_gen_mod_ingles_punt",
            "pro_gen_mod_comuni_escrita_punt"
        ]

        def get_stats_for_group(group_col=None):
            results = {}
            for col in columns:
                select_group = f"{group_col}," if group_col else ""
                group_by = f"GROUP BY {group_col}" if group_col else ""
                query = f"""
                    SELECT 
                        {select_group}
                        MIN(p.{col}) as min, 
                        APPROX_QUANTILE(p.{col}, 0.25) as q1, 
                        APPROX_QUANTILE(p.{col}, 0.5) as median, 
                        APPROX_QUANTILE(p.{col}, 0.75) as q3, 
                        MAX(p.{col}) as max,
                        AVG(p.{col}) as mean,
                        STDDEV(p.{col}) as stddev,
                        COUNT(p.{col}) as count
                    FROM df_SaberPRO p
                    JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                    WHERE {snies_filter}{geo_filter}
                      AND p.anno = {max_year}
                      AND p.{col} IS NOT NULL
                      AND p.{col} > 0
                    {group_by}
                """
                df = db_service.query(query)
                if group_col:
                    # Map group value to its stats for this column
                    for row in df.to_dicts():
                        group_val = row[group_col.split('.')[-1]]
                        if not group_val: continue
                        if group_val not in results: results[group_val] = {}
                        results[group_val][col] = {k: v for k, v in row.items() if k != group_col.split('.')[-1]}
                else:
                    if not df.is_empty():
                        results[col] = df.to_dicts()[0]
                    else:
                        results[col] = None
            return results

        def get_hierarchy_data():
            agg_fields = []
            for col in columns:
                agg_fields.append(f"AVG(p.{col}) as {col}_mean")
                agg_fields.append(f"STDDEV(p.{col}) as {col}_stddev")
                agg_fields.append(f"COUNT(p.{col}) as {col}_count")

            query = f"""
                SELECT 
                    s.sector, 
                    s.modalidad, 
                    s.area_de_conocimiento as area,
                    s.nucleo_basico_del_conocimiento as nbc,
                    CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico as program,
                    {", ".join(agg_fields)}
                FROM df_SaberPRO p
                JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {snies_filter}{geo_filter}
                  AND p.anno = {max_year}
                  AND p.pro_gen_punt_global > 0
                GROUP BY ROLLUP(s.sector, s.modalidad, s.area_de_conocimiento, s.nucleo_basico_del_conocimiento, program)
                ORDER BY sector, modalidad, area, nbc, program
            """
            df = db_service.query(query)
            return df.to_dicts()

        return {
            "year": int(max_year),
            "summary": get_stats_for_group(None),
            "by_sector": get_stats_for_group("s.sector"),
            "by_modalidad": get_stats_for_group("s.modalidad"),
            "by_campo_amplio": get_stats_for_group("s.cine_f_2013_ac_campo_amplio"),
            "hierarchy": get_hierarchy_data()
        }

    def get_national_saberpro_trend(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        
        geo_filter = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        if geo_filter:
            geo_filter = " AND (" + geo_filter.strip(" AND ") + ")"

        columns = [
            "pro_gen_punt_global",
            "pro_gen_mod_razona_cuantitat_punt",
            "pro_gen_mod_lectura_critica_punt",
            "pro_gen_mod_competen_ciudada_punt",
            "pro_gen_mod_ingles_punt",
            "pro_gen_mod_comuni_escrita_punt"
        ]

        agg_fields = []
        for col in columns:
            agg_fields.append(f"AVG(p.{col}) as {col}_mean")

        query = f"""
            SELECT 
                p.anno as year,
                s.sector as sector,
                s.modalidad as modalidad,
                s.cine_f_2013_ac_campo_amplio as campo,
                {", ".join(agg_fields)}
            FROM df_SaberPRO p
            JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
            WHERE {snies_filter}{geo_filter}
              AND p.pro_gen_punt_global IS NOT NULL
              AND p.pro_gen_punt_global > 0
              AND p.anno >= 2016
            GROUP BY GROUPING SETS (
                (p.anno),
                (p.anno, s.sector),
                (p.anno, s.modalidad),
                (p.anno, s.cine_f_2013_ac_campo_amplio)
            )
            ORDER BY p.anno
        """
        df = db_service.query(query)
        
        res_summary = {}
        res_sector = {}
        res_modalidad = {}
        res_campo = {}
        
        for row in df.to_dicts():
            y = int(row['year']) if row['year'] else None
            if not y: continue
            
            d_vals = {col: row[f"{col}_mean"] for col in columns if row.get(f"{col}_mean") is not None}
            
            if row['sector'] is None and row['modalidad'] is None and row['campo'] is None:
                res_summary[y] = d_vals
            elif row['sector'] is not None:
                sec = row['sector']
                if sec not in res_sector: res_sector[sec] = {}
                res_sector[sec][y] = d_vals
            elif row['modalidad'] is not None:
                mod = row['modalidad']
                if mod not in res_modalidad: res_modalidad[mod] = {}
                res_modalidad[mod][y] = d_vals
            elif row['campo'] is not None:
                cam = row['campo']
                if cam not in res_campo: res_campo[cam] = {}
                res_campo[cam][y] = d_vals
                
        return {
            "summary": {"Nacional": res_summary} if res_summary else {},
            "by_sector": res_sector,
            "by_modalidad": res_modalidad,
            "by_campo_amplio": res_campo
        }

    def get_demographic_distribution(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None, breakdown_column=None):
        """
        Returns the percentage distribution for demographic variables for the latest available year.
        Variables: sexo, pro_gen_fami_estratovivienda, pro_gen_estu_horassemanatrabaja, grupo_edad
        """
        snies_filter = self._build_snies_filter_base(
            sector=sector, modalidad=modalidad, nivel_de_formacion=nivel_de_formacion, 
            campo_amplio=campo_amplio, campo_especifico=campo_especifico, campo_detallado=campo_detallado, 
            area_de_conocimiento=area_de_conocimiento, nucleo_basico_del_conocimiento=nucleo_basico_del_conocimiento, 
            institucion=institucion, palabra_clave=palabra_clave, codigo_snies=codigo_snies,
            prefix="s"
        )
        
        geo_filter = ""
        if (departamento and len(departamento) > 0) or (municipio and len(municipio) > 0) or (departamento_principal and len(departamento_principal) > 0) or (municipio_principal and len(municipio_principal) > 0):
            geo_filter = self._build_geo_filter("p", departamento, departamento_principal, municipio, municipio_principal)
        if geo_filter:
            geo_filter = " AND (" + geo_filter.strip(" AND ") + ")"

        try:
            latest_year = db_service.query("SELECT MAX(anno) as y FROM df_SaberPRO")["y"][0]
        except:
            return {}

        variables = {
            "sexo": "sexo",
            "estrato": "pro_gen_fami_estratovivienda",
            "horas_trabajo": "pro_gen_estu_horassemanatrabaja",
            "edad": "grupo_edad"
        }

        # Mapping for breakdown columns
        allowed_breakdowns = {
            "nivel_de_formacion": "s.nivel_de_formacion",
            "sector": "s.sector",
            "modalidad": "s.modalidad",
            "area_de_conocimiento": "s.area_de_conocimiento",
            "nucleo_basico_del_conocimiento": "s.nucleo_basico_del_conocimiento"
        }
        
        breakdown_sql = ""
        group_by_breakdown = ""
        if breakdown_column in allowed_breakdowns:
            breakdown_sql = f", CAST({allowed_breakdowns[breakdown_column]} AS VARCHAR) as breakdown"
            group_by_breakdown = ", 2"

        results = {}
        for key, var in variables.items():
            query = f"""
                SELECT 
                    CAST({var} AS VARCHAR) as category
                    {breakdown_sql},
                    COUNT(*) as count
                FROM df_SaberPRO p
                JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                WHERE {snies_filter}{geo_filter}
                  AND p.anno = {latest_year}
                  AND {var} IS NOT NULL
                  AND CAST({var} AS VARCHAR) != ''
                GROUP BY 1 {group_by_breakdown}
                ORDER BY {3 if breakdown_sql else 2} DESC
            """
            
            try:
                df = db_service.query(query)
                if df.is_empty():
                    results[key] = {"year": latest_year, "data": []}
                    continue
                    
                total = sum(df["count"].to_list())
                
                # First pass: normalization and collect raw data
                raw_items = []
                for row in df.to_dicts():
                    c_str = str(row["category"]).strip()
                    if c_str == "Ms de 30 horas": c_str = "Más de 30 horas"
                    elif c_str.lower() in ("nd", "none", "-1", "-1.0"): c_str = "No Reportado"
                    elif key == "sexo" and c_str.upper() == "M": c_str = "Masculino"
                    elif key == "sexo" and c_str.upper() == "F": c_str = "Femenino"
                    
                    item = {
                        "category": c_str,
                        "value": row["count"],
                        "breakdown": row.get("breakdown")
                    }
                    raw_items.append(item)

                # Second pass: calculate totals for normalization
                breakdown_totals = {}
                category_totals = {}
                for item in raw_items:
                    c = item["category"]
                    b = item["breakdown"]
                    v = item["value"]
                    
                    category_totals[c] = category_totals.get(c, 0) + v
                    if b is not None:
                        breakdown_totals[b] = breakdown_totals.get(b, 0) + v

                # Third pass: build final distribution with all 3 percentage types
                merged_data = {}
                for item in raw_items:
                    c = item["category"]
                    b = item["breakdown"]
                    v = item["value"]
                    
                    merge_key = (c, b)
                    if merge_key not in merged_data:
                        merged_data[merge_key] = {
                            "category": c,
                            "value": 0,
                            "percentage": 0
                        }
                        if b is not None:
                            merged_data[merge_key]["breakdown"] = b
                            merged_data[merge_key]["percentage_breakdown"] = 0
                            merged_data[merge_key]["percentage_category"] = 0
                    
                    merged_data[merge_key]["value"] += v
                    merged_data[merge_key]["percentage"] += (v / total * 100) if total > 0 else 0
                    
                    if b is not None:
                        bt = breakdown_totals.get(b, 0)
                        ct = category_totals.get(c, 0)
                        merged_data[merge_key]["percentage_breakdown"] += (v / bt * 100) if bt > 0 else 0
                        merged_data[merge_key]["percentage_category"] += (v / ct * 100) if ct > 0 else 0
                
                final_dist = list(merged_data.values())
                
                # Sort estrato numerically
                if key == "estrato":
                    def sort_key(x):
                        try: return int(float(x["category"]))
                        except: return 999
                    final_dist.sort(key=sort_key)
                
                results[key] = {
                    "year": latest_year,
                    "data": final_dist
                }
            except Exception as e:
                print(f"Error querying demog {key}: {e}")
                results[key] = {"year": latest_year, "data": []}

        return results

    def get_demographic_trend(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None, breakdown_column=None, target_categories=None, nested=False):
        """
        Returns historical trends (percentages) for demographic variables.
        Supports breakdown by a specific column (sector, modalidad, etc.)
        target_categories is a dict like {'sexo': 'Masculino', 'estrato': '1', ...}
        If nested is True, applied target_categories act as global filters for all variables.
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)

        geo_filter = self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        if geo_filter:
            geo_filter = " AND (" + geo_filter.strip(" AND ") + ")"

        variables = {
            "sexo": "sexo",
            "estrato": "pro_gen_fami_estratovivienda",
            "horas_trabajo": "pro_gen_estu_horassemanatrabaja",
            "edad": "grupo_edad"
        }

        global_demog_filter = ""
        if nested and target_categories:
            for k, val in target_categories.items():
                if val:
                    db_col = "p." + variables[k]
                    if k == "sexo":
                        if val == "Masculino": global_demog_filter += f" AND ({db_col} = 'M' OR {db_col} = 'Masculino' OR {db_col} = '1')"
                        elif val == "Femenino": global_demog_filter += f" AND ({db_col} = 'F' OR {db_col} = 'Femenino' OR {db_col} = '2')"
                        else: global_demog_filter += f" AND CAST({db_col} AS VARCHAR) = '{val}'"
                    elif k == "horas_trabajo":
                        if val == "Más de 30 horas": 
                            global_demog_filter += f" AND ({db_col} = 'Ms de 30 horas' OR {db_col} = 'Más de 30 horas')"
                        elif val == "No Reportado":
                            global_demog_filter += f" AND ({db_col} IS NULL OR {db_col} IN ('ND', 'None', '-1', '-1.0', ''))"
                        else:
                            global_demog_filter += f" AND CAST({db_col} AS VARCHAR) = '{val}'"
                    elif k == "estrato":
                        if val == "No Reportado":
                            global_demog_filter += f" AND ({db_col} IS NULL OR CAST({db_col} AS VARCHAR) IN ('ND', 'None', '-1', '-1.0', ''))"
                        else:
                            global_demog_filter += f" AND (CAST({db_col} AS VARCHAR) = '{val}' OR CAST({db_col} AS VARCHAR) = '{val}.0')"
                    elif k == "edad":
                        if val == "No Reportado":
                            global_demog_filter += f" AND ({db_col} IS NULL OR {db_col} IN ('ND', 'None', '-1', '-1.0', ''))"
                        else:
                            global_demog_filter += f" AND CAST({db_col} AS VARCHAR) = '{val}'"


        # Mapping for breakdown columns
        allowed_breakdowns = {
            "nivel_de_formacion": "s.nivel_de_formacion",
            "sector": "s.sector",
            "modalidad": "s.modalidad",
            "area_de_conocimiento": "s.area_de_conocimiento",
            "nucleo_basico_del_conocimiento": "s.nucleo_basico_del_conocimiento"
        }

        breakdown_sql = ""
        group_by_yt = ""
        group_by_ct = ""
        if breakdown_column in allowed_breakdowns:
            breakdown_sql = f", CAST({allowed_breakdowns[breakdown_column]} AS VARCHAR) as breakdown"
            group_by_yt = ", 2" # anno, breakdown
            group_by_ct = ", 3" # anno, category, breakdown

        results = {}
        for key, var in variables.items():
            # If breakdown is active, filter by the target category if provided
            target_filter = ""
            if breakdown_column and target_categories and target_categories.get(key):
                t_val = target_categories[key]
                
                # Robust mapping from normalized frontend labels back to DB values
                if key == "sexo":
                    if t_val == "Masculino": target_filter = " AND (p.sexo = 'M' OR p.sexo = 'Masculino' OR p.sexo = '1')"
                    elif t_val == "Femenino": target_filter = " AND (p.sexo = 'F' OR p.sexo = 'Femenino' OR p.sexo = '2')"
                    else: target_filter = f" AND CAST(p.sexo AS VARCHAR) = '{t_val}'"
                elif key == "horas_trabajo":
                    if t_val == "Más de 30 horas": 
                        target_filter = " AND (p.pro_gen_estu_horassemanatrabaja = 'Ms de 30 horas' OR p.pro_gen_estu_horassemanatrabaja = 'Más de 30 horas')"
                    elif t_val == "No Reportado":
                        target_filter = " AND (p.pro_gen_estu_horassemanatrabaja IS NULL OR p.pro_gen_estu_horassemanatrabaja IN ('ND', 'None', '-1', '-1.0', ''))"
                    else:
                        target_filter = f" AND CAST(p.pro_gen_estu_horassemanatrabaja AS VARCHAR) = '{t_val}'"
                elif key == "estrato":
                    if t_val == "No Reportado":
                         target_filter = " AND (p.pro_gen_fami_estratovivienda IS NULL OR CAST(p.pro_gen_fami_estratovivienda AS VARCHAR) IN ('ND', 'None', '-1', '-1.0', ''))"
                    else:
                         target_filter = f" AND (CAST(p.pro_gen_fami_estratovivienda AS VARCHAR) = '{t_val}' OR CAST(p.pro_gen_fami_estratovivienda AS VARCHAR) = '{t_val}.0')"
                elif key == "edad":
                    if t_val == "No Reportado":
                         target_filter = " AND (p.grupo_edad IS NULL OR p.grupo_edad IN ('ND', 'None', '-1', '-1.0', ''))"
                    else:
                         target_filter = f" AND CAST(p.grupo_edad AS VARCHAR) = '{t_val}'"

            # When breakdown is active, we normalize by the total students in that breakdown year
            # but if we filter for a target category, we show lines representing that category in each breakdown.
            
            query = f"""
                WITH YearTotals AS (
                    SELECT p.anno {breakdown_sql}, COUNT(*) as total
                    FROM df_SaberPRO p
                    JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                    WHERE {snies_filter}{geo_filter}{global_demog_filter}
                      AND p.anno >= 2016
                      AND {var} IS NOT NULL
                      AND CAST({var} AS VARCHAR) != ''
                    GROUP BY 1 {group_by_yt}
                ),
                CatTotals AS (
                    SELECT 
                        p.anno,
                        CAST({var} AS VARCHAR) as category
                        {breakdown_sql},
                        COUNT(*) as cat_count
                    FROM df_SaberPRO p
                    JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = TRY_CAST(s.codigo_snies_del_programa AS BIGINT)
                    WHERE {snies_filter}{geo_filter}{global_demog_filter}
                      AND p.anno >= 2016
                      AND {var} IS NOT NULL
                      AND CAST({var} AS VARCHAR) != ''
                      {target_filter if breakdown_column else ""}
                    GROUP BY 1, 2 {group_by_ct}
                )

                SELECT 
                    c.anno,
                    c.category,
                    { 'c.breakdown' if breakdown_column else "'' as breakdown" },
                    (CAST(c.cat_count AS FLOAT) / y.total) * 100 as percentage
                FROM CatTotals c
                JOIN YearTotals y ON c.anno = y.anno { "AND c.breakdown = y.breakdown" if breakdown_column else "" }
                ORDER BY c.anno, c.category
            """
            
            try:
                df = db_service.query(query)
                
                # Transform to {years: [], series: [{name, data: []}]}
                years_set = set()
                series_map = {}
                
                for row in df.to_dicts():
                    y = int(row["anno"])
                    c = str(row["category"]).strip()
                    b = str(row["breakdown"]).strip() if breakdown_column else None
                    val = float(row["percentage"])
                    
                    if c == "Ms de 30 horas": c = "Más de 30 horas"
                    elif c.lower() in ("nd", "none", "-1", "-1.0"): c = "No Reportado"
                    elif key == "sexo" and c.upper() == "M": c = "Masculino"
                    elif key == "sexo" and c.upper() == "F": c = "Femenino"
                    
                    years_set.add(y)
                    # If breakdown is active, the series name should reflect it
                    s_name = c
                    if breakdown_column:
                        # Did the user pick a target category for this variable?
                        if target_categories and target_categories.get(key):
                            # Yes, so name lines after the breakdown group (e.g., 'Oficial', 'Privado')
                            s_name = b
                        else:
                            # No specific target chosen, name it 'Category (Breakdown)' to show all
                            s_name = f"{c} ({b})"
                    
                    if s_name not in series_map:
                        series_map[s_name] = {}
                    if y not in series_map[s_name]:
                        series_map[s_name][y] = 0
                    series_map[s_name][y] += val
                
                years = sorted(list(years_set))
                series = []
                
                cats_sorted = sorted(list(series_map.keys()))
                if not breakdown_column and key == "estrato":
                    def sort_key(x):
                        try: return int(float(x))
                        except: return 999
                    cats_sorted.sort(key=sort_key)
                
                for s_name in cats_sorted:
                    data = [series_map[s_name].get(y, 0.0) for y in years]
                    series.append({"name": s_name, "data": data})
                
                results[key] = {
                    "years": years,
                    "series": series
                }
            except Exception as e:
                print(f"Error querying demog trend {key}: {e}")
                results[key] = {"years": [], "series": []}

        return results

    def get_national_ies_table(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns a hierarchical list of dicts for a table grouped by:
        IES -> Nucleo Básico de Conocimiento (NBC) -> Campo Especifico -> Campo Detallado
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        # Get latest years (reusing same logic as discipline table)
        y_m = db_service.query("SELECT MAX(anno) as y FROM df_Matricula_agg")["y"][0]
        y_p = db_service.query("SELECT MAX(anno) as y FROM df_PCurso_agg")["y"][0]
        y_g = db_service.query("SELECT MAX(anno) as y FROM df_Graduados_agg")["y"][0]
        y_d = db_service.query("SELECT MAX(anno) as y FROM df_SPADIES_Desercion")["y"][0]
        y_s = db_service.query("SELECT MAX(anno) as y FROM df_SaberPRO_mean")["y"][0]
        y_o = db_service.query("SELECT MAX(anno_corte) as y FROM df_OLE_Movilidad_M0")["y"][0]

        # Base Data with IES + Nivel + Modalidad
        q_base = f"""
            SELECT 
                s.nombre_institucion,
                s.nivel_de_formacion,
                s.modalidad,
                s.area_de_conocimiento as area,
                s.nucleo_basico_del_conocimiento as nbc,
                CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico as program_name,
                COUNT(DISTINCT s.codigo_snies_del_programa) as num_programs
            FROM df_SNIES_Programas s
            WHERE {snies_filter} AND s.nombre_institucion IS NOT NULL
            GROUP BY 1, 2, 3, 4, 5, 6
        """
        df_base = db_service.query(q_base).fill_nan(None)

        # Helper to build queries grouped by IES + Fields
        def build_metric_query(table, val_col, year_col, years, agg_func="SUM"):
            return f"""
                SELECT 
                    s.nombre_institucion,
                    s.nivel_de_formacion,
                    s.modalidad,
                    s.area_de_conocimiento,
                    s.nucleo_basico_del_conocimiento,
                    CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico,
                    {agg_func}(CASE WHEN m.{year_col} = {years[0]} THEN m.{val_col} ELSE 0 END) as curr,
                    {agg_func}(CASE WHEN m.{year_col} = {years[1]} THEN m.{val_col} ELSE 0 END) as prev
                FROM {table} m
                JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola
                JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
                WHERE {snies_filter}{dept_cob} AND m.{year_col} IN ({years[0]}, {years[1]}) AND s.nombre_institucion IS NOT NULL
                GROUP BY 1, 2, 3, 4, 5, 6
            """

        # Matricula
        q_mat = build_metric_query("df_Matricula_agg", "matricula_sum", "anno", [y_m, y_m-1])
        df_mat = db_service.query(q_mat).fill_nan(0)

        # Primer Curso
        q_pcurso = build_metric_query("df_PCurso_agg", "primer_curso_sum", "anno", [y_p, y_p-1])
        df_pcurso = db_service.query(q_pcurso).fill_nan(0)

        # Graduados
        q_grad = build_metric_query("df_Graduados_agg", "graduados_sum", "anno", [y_g, y_g-1])
        df_grad = db_service.query(q_grad).fill_nan(0)

        # Desercion needs special handling for AVG on NULLs (CASE ELSE NULL)
        q_des = f"""
            SELECT s.nombre_institucion, s.nivel_de_formacion, s.modalidad, 
                   s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico,
                   AVG(CASE WHEN d.anno = {y_d} THEN d.desercion_anual_mean ELSE NULL END) as curr,
                   AVG(CASE WHEN d.anno = {y_d-1} THEN d.desercion_anual_mean ELSE NULL END) as prev
            FROM df_SPADIES_Desercion d
            JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND d.anno IN ({y_d}, {y_d-1}) AND s.nombre_institucion IS NOT NULL
            GROUP BY 1, 2, 3, 4, 5, 6
        """
        df_des = db_service.query(q_des).fill_nan(None)

        # Saber PRO
        q_saber = f"""
            SELECT s.nombre_institucion, s.nivel_de_formacion, s.modalidad,
                   s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico,
                   AVG(CASE WHEN p.anno = {y_s} THEN p.pro_gen_punt_global_mean ELSE NULL END) as curr,
                   AVG(CASE WHEN p.anno = {y_s-1} THEN p.pro_gen_punt_global_mean ELSE NULL END) as prev
            FROM df_SaberPRO_mean p
            JOIN df_SNIES_Programas s ON TRY_CAST(p.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND p.anno IN ({y_s}, {y_s-1}) AND s.nombre_institucion IS NOT NULL
            GROUP BY 1, 2, 3, 4, 5, 6
        """
        df_saber = db_service.query(q_saber).fill_nan(None)

        # Empleabilidad
        q_emp = f"""
            SELECT s.nombre_institucion, s.nivel_de_formacion, s.modalidad,
                   s.area_de_conocimiento, s.nucleo_basico_del_conocimiento,
                   CAST(CAST(s.codigo_snies_del_programa AS BIGINT) AS VARCHAR) || ' - ' || s.programa_academico,
                   AVG(CASE WHEN m.anno_corte = {y_o} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as curr,
                   AVG(CASE WHEN m.anno_corte = {y_o-1} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as prev
            FROM df_OLE_Movilidad_M0 m
            JOIN df_SNIES_Programas s ON TRY_CAST(m.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND m.anno_corte IN ({y_o}, {y_o-1}) AND m.graduados > 0 AND s.nombre_institucion IS NOT NULL
            GROUP BY 1, 2, 3, 4, 5, 6
        """
        df_emp = db_service.query(q_emp).fill_nan(None)

        # Convert to dicts for lookup
        # Keys updated to include nombre_institucion, nivel, modalidad
        def make_lookup(df):
             # key: (IES, Nivel, Mod, Area, NBC, Program)
             return {tuple(r[k] for k in df.columns[:6]): r for r in df.to_dicts()}

        mat_data = make_lookup(df_mat)
        pcurso_data = make_lookup(df_pcurso)
        grad_data = make_lookup(df_grad)
        des_data = make_lookup(df_des)
        saber_data = make_lookup(df_saber)
        emp_data = make_lookup(df_emp)

        # Helper to aggregate stats
        def aggregate_stats(rows):
            stats = {
                'num_ies': 0, # Not relevant for IES table, but keeping structure
                'num_programs': sum(r['num_programs'] for r in rows),
                'total_matricula': sum(r['total_matricula'] for r in rows),
                'total_matricula_prev': sum(r['total_matricula_prev'] for r in rows),
                'total_pcurso': sum(r['total_pcurso'] for r in rows),
                'total_pcurso_prev': sum(r['total_pcurso_prev'] for r in rows),
                'total_graduados': sum(r['total_graduados'] for r in rows),
                'total_graduados_prev': sum(r['total_graduados_prev'] for r in rows),
                'avg_desercion': sum(r['avg_desercion'] for r in rows if r['avg_desercion'] is not None) / len([r for r in rows if r['avg_desercion'] is not None]) if any(r['avg_desercion'] is not None for r in rows) else 0,
                'avg_desercion_prev': sum(r['avg_desercion_prev'] for r in rows if r['avg_desercion_prev'] is not None) / len([r for r in rows if r['avg_desercion_prev'] is not None]) if any(r['avg_desercion_prev'] is not None for r in rows) else 0,
                'avg_saberpro': sum(r['avg_saberpro'] for r in rows if r['avg_saberpro'] is not None) / len([r for r in rows if r['avg_saberpro'] is not None]) if any(r['avg_saberpro'] is not None for r in rows) else 0,
                'avg_saberpro_prev': sum(r['avg_saberpro_prev'] for r in rows if r['avg_saberpro_prev'] is not None) / len([r for r in rows if r['avg_saberpro_prev'] is not None]) if any(r['avg_saberpro_prev'] is not None for r in rows) else 0,
                'avg_empleabilidad': sum(r['avg_empleabilidad'] for r in rows if r['avg_empleabilidad'] is not None) / len([r for r in rows if r['avg_empleabilidad'] is not None]) if any(r['avg_empleabilidad'] is not None for r in rows) else 0,
                'avg_empleabilidad_prev': sum(r['avg_empleabilidad_prev'] for r in rows if r['avg_empleabilidad_prev'] is not None) / len([r for r in rows if r['avg_empleabilidad_prev'] is not None]) if any(r['avg_empleabilidad_prev'] is not None for r in rows) else 0,
            }
            return stats

        # Build clean rows
        base_rows = df_base.to_dicts()
        detailed_rows = []
        for row in base_rows:
            key = (row['nombre_institucion'], row['nivel_de_formacion'], row['modalidad'], row['area'], row['nbc'], row['program_name'])
            
            m = mat_data.get(key, {'curr': 0, 'prev': 0})
            p = pcurso_data.get(key, {'curr': 0, 'prev': 0})
            g = grad_data.get(key, {'curr': 0, 'prev': 0})
            d = des_data.get(key, {'curr': None, 'prev': None})
            s = saber_data.get(key, {'curr': None, 'prev': None})
            e = emp_data.get(key, {'curr': None, 'prev': None})

            detailed_rows.append({
                'nombre_institucion': row['nombre_institucion'],
                'nivel_de_formacion': row['nivel_de_formacion'],
                'modalidad': row['modalidad'],
                'area': row['area'],
                'nbc': row['nbc'],
                'program_name': row['program_name'],
                'num_ies': 0, # Ignored
                'num_programs': row['num_programs'],
                'total_matricula': m['curr'],
                'total_matricula_prev': m['prev'],
                'total_pcurso': p['curr'],
                'total_pcurso_prev': p['prev'],
                'total_graduados': g['curr'],
                'total_graduados_prev': g['prev'],
                'avg_desercion': d['curr'],
                'avg_desercion_prev': d['prev'],
                'avg_saberpro': s['curr'],
                'avg_saberpro_prev': s['prev'],
                'avg_empleabilidad': e['curr'],
                'avg_empleabilidad_prev': e['prev']
            })

        # Process Hierarchy: IES -> Nivel Group -> Modalidad Group -> Amplio -> Especifico -> Detallado
        ies_groups = {}
        for r in detailed_rows:
            ies_groups.setdefault(r['nombre_institucion'], []).append(r)
        
        result_tree = []

        for ies_name, ies_rows in ies_groups.items():
            # Level 2: Nivel Group
            nivel_groups = {}
            for r in ies_rows:
                grp = self._get_nivel_group(r['nivel_de_formacion'])
                nivel_groups.setdefault(grp, []).append(r)
            
            nivel_children = []
            for nivel_name, nivel_rows in nivel_groups.items():
                # Level 3: Modalidad Group
                mod_groups = {}
                for r in nivel_rows:
                    grp = self._get_modalidad_group(r['modalidad'])
                    mod_groups.setdefault(grp, []).append(r)
                
                mod_children = []
                for mod_name, mod_rows in mod_groups.items():
                    # Level 4: Area de Conocimiento
                    area_groups = {}
                    for r in mod_rows:
                        area_groups.setdefault(r['area'], []).append(r)
                    
                    area_children = []
                    for area_name, area_rows in area_groups.items():
                        # Level 5: NBC
                        nbc_groups = {}
                        for r in area_rows:
                            nbc_groups.setdefault(r['nbc'], []).append(r)
                        
                        nbc_children = []
                        for nbc_name, nbc_rows in nbc_groups.items():
                            # Level 6: Program (Leaves)
                            prog_children = []
                            for r in nbc_rows:
                                p_stats = aggregate_stats([r])
                                prog_children.append({
                                    'name': r['program_name'],
                                    'level': 'programa',
                                    **self._format_node_stats(p_stats)
                                })
                            
                            n_stats = aggregate_stats(nbc_rows)
                            nbc_children.append({
                                'name': nbc_name,
                                'level': 'nbc',
                                **self._format_node_stats(n_stats),
                                'children': prog_children
                            })
                        
                        a_stats = aggregate_stats(area_rows)
                        area_children.append({
                            'name': area_name,
                            'level': 'area',
                            **self._format_node_stats(a_stats),
                            'children': nbc_children
                        })
                    
                    m_stats = aggregate_stats(mod_rows)
                    mod_children.append({
                        'name': mod_name,
                        'level': 'modalidad',
                        **self._format_node_stats(m_stats),
                        'children': area_children
                    })
                
                # Nivel Node
                c_stats = aggregate_stats(nivel_rows)
                nivel_children.append({
                    'name': nivel_name,
                    'level': 'nivel',
                    **self._format_node_stats(c_stats),
                    'children': mod_children
                })

            # IES Node
            i_stats = aggregate_stats(ies_rows)
            result_tree.append({
                'name': ies_name,
                'level': 'ies',
                **self._format_node_stats(i_stats),
                'children': nivel_children
            })
            
        # Sort IES by name or total enrollment? Sorting by name usually better for lists.
        # Although user might want largest IES first. Let's sort by Total Matricula DESC.
        result_tree.sort(key=lambda x: x['total_matricula'], reverse=True)
            
        return result_tree

    def get_national_ies_list(self, sector=None, modalidad=None, nivel_de_formacion=None, campo_amplio=None, campo_especifico=None, campo_detallado=None, area_de_conocimiento=None, nucleo_basico_del_conocimiento=None, institucion=None, palabra_clave=None, codigo_snies=None, departamento=None, departamento_principal=None, municipio=None, municipio_principal=None):
        """
        Returns a flat list of dicts for all IES matching filters.
        """
        snies_filter = "s.estado_programa = 'ACTIVO' AND s.reconocimiento_del_ministerio IS NOT NULL AND s.reconocimiento_del_ministerio != ''"
        snies_filter += db_service._build_in_clause("s.sector", sector)
        snies_filter += db_service._build_in_clause("s.modalidad", modalidad)
        snies_filter += db_service._build_in_clause("s.nivel_de_formacion", nivel_de_formacion)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_amplio", campo_amplio)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_especific", campo_especifico)
        snies_filter += db_service._build_in_clause("s.cine_f_2013_ac_campo_detallado", campo_detallado)
        snies_filter += db_service._build_in_clause("s.area_de_conocimiento", area_de_conocimiento)
        snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)
        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)
        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)
        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)
        snies_filter += self._build_dept_snies_filter(departamento, departamento_principal, municipio, municipio_principal)
        dept_cob = self._build_dept_cobertura_filter(departamento, departamento_principal, municipio, municipio_principal)

        # Get latest years
        y_m = db_service.query("SELECT MAX(anno) as y FROM df_Matricula_agg")["y"][0]
        y_p = db_service.query("SELECT MAX(anno) as y FROM df_PCurso_agg")["y"][0]
        y_g = db_service.query("SELECT MAX(anno) as y FROM df_Graduados_agg")["y"][0]
        y_d = db_service.query("SELECT MAX(anno) as y FROM df_SPADIES_Desercion")["y"][0]
        y_s = db_service.query("SELECT MAX(anno) as y FROM df_SaberPRO_mean")["y"][0]
        y_o = db_service.query("SELECT MAX(anno_corte) as y FROM df_OLE_Movilidad_M0")["y"][0]

        # Simplified Queries Grouped only by IES
        def build_q(table, val, year, years, agg="SUM"):
            return f"""
                SELECT s.nombre_institucion as name,
                       {agg}(CASE WHEN m.{year} = {years[0]} THEN m.{val} ELSE 0 END) as curr,
                       {agg}(CASE WHEN m.{year} = {years[1]} THEN m.{val} ELSE 0 END) as prev
                FROM {table} m
                JOIN (SELECT DISTINCT snies_divipola, codigo_snies_del_programa, departamento_oferta, divipola_depto_oferta, municipio_oferta, divipola_mpio_oferta FROM df_Cobertura_distinct) c ON m.snies_divipola = c.snies_divipola
                JOIN df_SNIES_Programas s ON c.codigo_snies_del_programa = s.codigo_snies_del_programa
                WHERE {snies_filter}{dept_cob} AND m.{year} IN ({years[0]}, {years[1]}) AND s.nombre_institucion IS NOT NULL
                GROUP BY 1
            """

        df_base = db_service.query(f"SELECT nombre_institucion as name, MAX(sector) as sector, COUNT(DISTINCT codigo_snies_del_programa) as num_programs FROM df_SNIES_Programas s WHERE {snies_filter} AND nombre_institucion IS NOT NULL GROUP BY 1")
        df_mat = db_service.query(build_q("df_Matricula_agg", "matricula_sum", "anno", [y_m, y_m-1]))
        df_pc = db_service.query(build_q("df_PCurso_agg", "primer_curso_sum", "anno", [y_p, y_p-1]))
        df_gr = db_service.query(build_q("df_Graduados_agg", "graduados_sum", "anno", [y_g, y_g-1]))
        
        q_avg = lambda table, val, year, years: f"""
            SELECT s.nombre_institucion as name,
                   AVG(CASE WHEN d.{year} = {years[0]} THEN d.{val} ELSE NULL END) as curr,
                   AVG(CASE WHEN d.{year} = {years[1]} THEN d.{val} ELSE NULL END) as prev
            FROM {table} d
            JOIN df_SNIES_Programas s ON TRY_CAST(d.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND d.{year} IN ({years[0]}, {years[1]}) AND s.nombre_institucion IS NOT NULL
            GROUP BY 1
        """
        df_des = db_service.query(q_avg("df_SPADIES_Desercion", "desercion_anual_mean", "anno", [y_d, y_d-1]))
        df_sab = db_service.query(q_avg("df_SaberPRO_mean", "pro_gen_punt_global_mean", "anno", [y_s, y_s-1]))
        
        q_ole = f"""
            SELECT s.nombre_institucion as name,
                   AVG(CASE WHEN m.anno_corte = {y_o} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as curr,
                   AVG(CASE WHEN m.anno_corte = {y_o-1} THEN CAST(m.graduados_que_cotizan AS FLOAT) / NULLIF(m.graduados, 0) ELSE NULL END) as prev
            FROM df_OLE_Movilidad_M0 m
            JOIN df_SNIES_Programas s ON TRY_CAST(m.codigo_snies_del_programa AS BIGINT) = s.codigo_snies_del_programa
            WHERE {snies_filter} AND m.anno_corte IN ({y_o}, {y_o-1}) AND m.graduados > 0 AND s.nombre_institucion IS NOT NULL
            GROUP BY 1
        """
        df_ole = db_service.query(q_ole)

        # Merge results
        ies_dict = { r['name']: {
            'name': r['name'],
            'sector': r.get('sector', 'DESCONOCIDO'),
            'num_ies': 1,
            'num_programs': r['num_programs'],
            'total_matricula': 0, 'total_matricula_prev': 0,
            'total_pcurso': 0, 'total_pcurso_prev': 0,
            'total_graduados': 0, 'total_graduados_prev': 0,
            'avg_desercion': None, 'avg_desercion_prev': None,
            'avg_saberpro': None, 'avg_saberpro_prev': None,
            'avg_empleabilidad': None, 'avg_empleabilidad_prev': None
        } for r in df_base.to_dicts() }

        def merge(df, c_key, p_key):
            for r in df.to_dicts():
                if r['name'] in ies_dict:
                    ies_dict[r['name']][c_key] = r['curr']
                    ies_dict[r['name']][p_key] = r['prev']

        merge(df_mat, 'total_matricula', 'total_matricula_prev')
        merge(df_pc, 'total_pcurso', 'total_pcurso_prev')
        merge(df_gr, 'total_graduados', 'total_graduados_prev')
        merge(df_des, 'avg_desercion', 'avg_desercion_prev')
        merge(df_sab, 'avg_saberpro', 'avg_saberpro_prev')
        merge(df_ole, 'avg_empleabilidad', 'avg_empleabilidad_prev')

        result = []
        for name, stats in ies_dict.items():
            formatted = self._format_node_stats(stats)
            formatted['name'] = name
            formatted['sector'] = stats.get('sector', 'DESCONOCIDO')
            result.append(formatted)
            
        result.sort(key=lambda x: x.get('total_matricula') or 0, reverse=True)
        return result

national_service = NationalService()

import sys

file_path = 'app/services/national_service.py'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements for filter assignments
    content = content.replace(
        'f += db_service._build_in_clause(f"{prefix}.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'f += db_service._build_in_clause(f"{prefix}.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        f += db_service._build_in_clause(f"{prefix}.nombre_institucion", institucion)\n        f += db_service._build_in_clause(f"{prefix}.codigo_snies_del_programa", codigo_snies)\n        f += db_service._build_ilike_clause_any(f"{prefix}.programa_academico", palabra_clave)'
    )
    
    content = content.replace(
        'snies_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'snies_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        snies_filter += db_service._build_in_clause("nombre_institucion", institucion)\n        snies_filter += db_service._build_in_clause("codigo_snies_del_programa", codigo_snies)\n        snies_filter += db_service._build_ilike_clause_any("programa_academico", palabra_clave)'
    )
    
    content = content.replace(
        'snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'snies_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        snies_filter += db_service._build_in_clause("s.nombre_institucion", institucion)\n        snies_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)\n        snies_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)'
    )

    content = content.replace(
        'pos_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'pos_filter += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        pos_filter += db_service._build_in_clause("s.nombre_institucion", institucion)\n        pos_filter += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)\n        pos_filter += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)'
    )

    content = content.replace(
        'q3 += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'q3 += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        q3 += db_service._build_in_clause("s.nombre_institucion", institucion)\n        q3 += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)\n        q3 += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)'
    )

    content = content.replace(
        'query += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'query += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n        query += db_service._build_in_clause("s.nombre_institucion", institucion)\n        query += db_service._build_in_clause("s.codigo_snies_del_programa", codigo_snies)\n        query += db_service._build_ilike_clause_any("s.programa_academico", palabra_clave)'
    )

    content = content.replace(
        'm_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)',
        'm_filter += db_service._build_in_clause("nucleo_basico_del_conocimiento", nucleo_basico_del_conocimiento)\n                m_filter += db_service._build_in_clause("nombre_institucion", institucion)\n                m_filter += db_service._build_ilike_clause_any("programa_academico", palabra_clave)\n                m_filter += db_service._build_in_clause("codigo_snies_del_programa", codigo_snies)'
    )

    # Dynamic filter options fixes
    content = content.replace(
        "f_nucleo = nucleo_basico_del_conocimiento if exclude_dim != 'nucleo_basico_del_conocimiento' else None",
        "f_nucleo = nucleo_basico_del_conocimiento if exclude_dim != 'nucleo_basico_del_conocimiento' else None\n            f_inst = institucion if exclude_dim != 'institucion' else None\n            f_palabra = palabra_clave if exclude_dim != 'palabra_clave' else None\n            f_snies = codigo_snies if exclude_dim != 'codigo_snies' else None"
    )

    content = content.replace(
        'f += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", f_nucleo)',
        'f += db_service._build_in_clause("s.nucleo_basico_del_conocimiento", f_nucleo)\n            f += db_service._build_in_clause("s.nombre_institucion", f_inst)\n            f += db_service._build_ilike_clause_any("s.programa_academico", f_palabra)\n            f += db_service._build_in_clause("s.codigo_snies_del_programa", f_snies)'
    )

    content = content.replace(
        "options['nucleo_basico_del_conocimiento'] = query_distinct('nucleo_basico_del_conocimiento', 's.nucleo_basico_del_conocimiento', 'nucleo_basico_del_conocimiento')",
        "options['nucleo_basico_del_conocimiento'] = query_distinct('nucleo_basico_del_conocimiento', 's.nucleo_basico_del_conocimiento', 'nucleo_basico_del_conocimiento')\n        options['institucion'] = query_distinct('institucion', 's.nombre_institucion', 'institucion')"
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Success")
except Exception as e:
    print("Error:", e)

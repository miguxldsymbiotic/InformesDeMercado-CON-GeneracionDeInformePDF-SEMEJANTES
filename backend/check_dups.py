import duckdb
import os

con = duckdb.connect(':memory:')
con.execute("CREATE VIEW t1 AS SELECT * FROM read_parquet('data/df_PCurso_agg.parquet')")
print("Duplicates in df_PCurso_agg:")
res = con.execute('SELECT snies_divipola, anno, COUNT(*) as c FROM t1 GROUP BY 1, 2 HAVING c > 1 LIMIT 10').fetchall()
for row in res:
    print(row)

con.execute("CREATE VIEW t2 AS SELECT * FROM read_parquet('data/df_SNIES_Programas.parquet')")
print("\nDuplicates in df_SNIES_Programas (codigo_snies_del_programa):")
res2 = con.execute('SELECT codigo_snies_del_programa, COUNT(*) as c FROM t2 GROUP BY 1 HAVING c > 1 LIMIT 10').fetchall()
for row in res2:
    print(row)
    
con.execute("CREATE VIEW t3 AS SELECT * FROM read_parquet('data/df_Cobertura_distinct.parquet')")
print("\nDuplicates in df_Cobertura_distinct (snies_divipola):")
res3 = con.execute('SELECT snies_divipola, COUNT(*) as c FROM t3 GROUP BY 1 HAVING c > 1 LIMIT 10').fetchall()
for row in res3:
    print(row)

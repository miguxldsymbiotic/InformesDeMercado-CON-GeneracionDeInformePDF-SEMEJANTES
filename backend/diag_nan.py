from app.services.db import db_service

print("NaN check in SPADIES:")
q_spa = "SELECT COUNT(*) FROM df_SPADIES_Desercion WHERE isnan(desercion_anual_mean)"
print(db_service.query(q_spa))

print("\nNaN check in Proxy:")
q_pro = "SELECT COUNT(*) FROM df_Desercion_Posgrado_Proxy WHERE isnan(desercion_anual_mean)"
print(db_service.query(q_pro))

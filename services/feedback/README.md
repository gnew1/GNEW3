# GNEW Feedback Service
Microsurveys in-app, NPS y análisis básico de texto (NPS bucket). Expone:
- `POST /surveys` crear
- `GET /surveys?trigger=...` listar
- `GET /eligible?user_id=...&event=...&locale=...` si se debe mostrar la encuesta
- `POST /responses` guardar respuestas (con límite de frecuencia)
- `GET /stats/nps` agregados para dashboards
- `/metrics` Prometheus

Despliegue: Dockerfile incluido.

 

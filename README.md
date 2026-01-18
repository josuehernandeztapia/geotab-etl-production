# Geotab ETL Production

Sistema ETL automatizado para sincronización de datos de Geotab API con Neon PostgreSQL, desplegado en Google Cloud Run.

## 🏗️ Arquitectura

```
Cloud Scheduler → Cloud Run → Neon PostgreSQL
```

- **Compute**: Google Cloud Run (serverless)
- **Database**: Neon PostgreSQL
- **Automation**: Cloud Scheduler (cron jobs)
- **Runtime**: Node.js 19 + Express.js

## 📊 Endpoints

- `GET /` - Información del servicio
- `GET /health` - Health check
- `POST /api/sync` - Sincronización principal (FaultData, Device, User, Zone, Rule)
- `POST /api/sync_trip` - Sincronización de trips (separado del sync principal)
- `POST /api/trip_batch` - Procesamiento batch de trips

## 🚀 Deployment

### Automatico (GitHub Actions)
Los commits a `main` se despliegan automáticamente a Cloud Run.

### Manual
```bash
gcloud run deploy geotab-api --source . --region us-west1
```

## ⏰ Cron Jobs

- **Daily Sync**: Ejecución diaria a las 2:00 AM CST
- **Health Check**: Verificación horaria del sistema

## 🔧 Variables de Entorno

```bash
DATABASE_URL=postgresql://...
GEOTAB_DATABASE=conductores
GEOTAB_USERNAME=contacto@conductores.lat
GEOTAB_PASSWORD=***
NODE_ENV=production
PORT=8080
```

## 📝 Logs

Los logs se pueden consultar en:
- **Cloud Run**: Console GCP > Cloud Run > geotab-api > Logs
- **Neon DB**: Tabla `etl_logs` para historial de ejecuciones

## 💰 Costos

- **Cloud Run**: ~$0.07 MXN/mes
- **Cloud Build**: ~$0.04 MXN/mes
- **Total**: ~$0.11 MXN/mes

Reducción de ~99.9% vs arquitectura anterior.
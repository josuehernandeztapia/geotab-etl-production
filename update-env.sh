#!/bin/bash

# Script para actualizar variables de entorno en Cloud Run
gcloud run services update geotab-api \
  --region=us-west1 \
  --set-env-vars="DATABASE_URL=postgresql://neondb_owner:npg_ImI7iZsUiyen@ep-shiny-term-adcwbvo5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require,GEOTAB_USERNAME=contacto@conductores.lat,GEOTAB_PASSWORD=Conductores2025,GEOTAB_DATABASE=conductores,NODE_ENV=production,PORT=8080"

echo "✅ Variables de entorno actualizadas en Cloud Run"
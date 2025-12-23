# Dockerfile para migración Vercel → Cloud Run
# Node.js para Geotab ETL

FROM node:19-slim

WORKDIR /app

# Copiar package files y instalar dependencias Node.js
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar todo el código
COPY . .

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Exponer puerto
EXPOSE 8080

# Comando de inicio - servidor Express
CMD ["node", "server.js"]
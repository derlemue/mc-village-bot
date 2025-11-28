FROM node:20-alpine

# Arbeitsverzeichnis erstellen
WORKDIR /app

# System-Dependencies für native Module
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Package files kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm install --only=production && \
    npm cache clean --force

# Bot-Code kopieren
COPY . .

# Daten- und Log-Verzeichnisse erstellen
RUN mkdir -p /app/data /app/logs

# Nicht-root User für Sicherheit
RUN addgroup -g 1001 -S botuser && \
    adduser -S botuser -u 1001 && \
    chown -R botuser:botuser /app

RUN chown -R botuser:botuser /app/logs /app/data

USER botuser

# Health-Check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Bot starten
CMD ["node", "index.js"]

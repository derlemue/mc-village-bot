FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /app/data /app/modules /app/schematics

COPY package*.json ./
RUN npm install --omit=dev

COPY modules/ ./modules/
COPY schematics/ ./schematics/
COPY index.js ./

RUN echo "[]" > /app/data/buildings.json && \
    echo "[]" > /app/data/villages.json && \
    echo "[]" > /app/data/streets.json

EXPOSE 25565
CMD ["npm", "start"]

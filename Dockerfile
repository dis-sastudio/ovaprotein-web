# Imagen para Coolify / Docker: sirve el sitio y las rutas /api (PayPhone, bot WhatsApp)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3107 HOST=0.0.0.0 DATA_DIR=/app/storage
COPY package.json ./
COPY public ./public
COPY server ./server
COPY netlify/functions ./netlify/functions
COPY data ./data
RUN mkdir -p /app/storage && chown -R node:node /app
USER node
EXPOSE 3107
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3107/ >/dev/null || exit 1
CMD ["node", "server/server.mjs"]

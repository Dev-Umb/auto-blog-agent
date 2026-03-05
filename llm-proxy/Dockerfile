FROM node:22-alpine

RUN apk add --no-cache wget

WORKDIR /app
COPY server.js /app/server.js
COPY routes.json /app/routes.json

EXPOSE 4010
CMD ["node", "/app/server.js"]

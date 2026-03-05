FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-compose wget

WORKDIR /app
COPY server.js /app/server.js

EXPOSE 4020
CMD ["node", "/app/server.js"]

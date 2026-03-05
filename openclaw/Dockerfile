FROM node:22

RUN apt-get update && apt-get install -y --no-install-recommends bash curl git ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest

COPY openclaw.json /root/.openclaw/openclaw.json
COPY .env.example /root/.openclaw/.env.example

WORKDIR /root/.openclaw

EXPOSE 18789

CMD ["openclaw", "gateway", "--allow-unconfigured", "--bind", "lan", "--port", "18789"]

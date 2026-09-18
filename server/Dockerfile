FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8000

WORKDIR /usr/src/app

COPY --from=dependencies --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

USER node

EXPOSE 8000

CMD ["node", "src/index.js"]


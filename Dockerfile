# AssisList — multi-stage Docker build
#
# Node 22 is the active LTS line, matching server/package.json engines and the
# version the README tells people to install. The Current line (odd-numbered)
# stops receiving fixes long before a self-hosted deployment gets rebuilt.

# Stage 1: build the React client.
# No build args and no secrets: the client ships with no credential (it obtains
# a session cookie at runtime), so this image is safe to publish and reuse.
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: server runtime (serves API + built client on :3456)
FROM node:22-alpine AS app
WORKDIR /app

# The base image already provides an unprivileged `node` user (uid 1000).
COPY --chown=node:node server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server/ ./server/
COPY --from=client-build --chown=node:node /app/client/dist ./client/dist

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3456

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3456/api/v1/ready || exit 1

USER node

# Exec form with node directly, not `npm start`: npm does not forward SIGTERM
# to its child, so as PID 1 it would swallow every stop signal and leave Docker
# to SIGKILL the container after the grace period on every restart.
CMD ["node", "src/index.js"]

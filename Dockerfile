# AssisList — multi-stage Docker build
# Stage 1: build the React client
FROM node:25-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: server runtime (serves API + built client on :3456)
FROM node:25-alpine AS app
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3456
CMD ["npm", "start"]

FROM oven/bun:1.1 as builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source
COPY . .

# Build the project
RUN npm run build

# Runner stage
FROM oven/bun:1.1 as runner

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# We need a small server script to run the TanStack Start fetch handler
RUN echo 'import app from "./dist/server/server.js"; \
import { serve } from "bun"; \
import { readFileSync, statSync } from "fs"; \
import { join } from "path"; \
import mime from "mime-types"; \
\
serve({ \
  port: process.env.PORT || 3000, \
  async fetch(req) { \
    const url = new URL(req.url); \
    const path = url.pathname; \
    try { \
      if (path !== "/") { \
        const clientPath = join(process.cwd(), "dist/client", path); \
        const stat = statSync(clientPath); \
        if (stat.isFile()) { \
          const file = Bun.file(clientPath); \
          return new Response(file, { headers: { "Content-Type": mime.lookup(clientPath) || "application/octet-stream" } }); \
        } \
      } \
    } catch (e) { \
      /* ignore and let SSR handle it */ \
    } \
    return app.fetch(req); \
  } \
}); \
console.log("Listening on http://0.0.0.0:" + (process.env.PORT || 3000));' > server.js

# Install mime-types for the runner
RUN bun add mime-types

EXPOSE 3000

CMD ["bun", "run", "server.js"]

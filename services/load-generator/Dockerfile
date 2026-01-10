FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/load-generator/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY services/load-generator/dist ./dist

# Set default command
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]

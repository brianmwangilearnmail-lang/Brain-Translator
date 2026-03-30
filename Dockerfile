# Use the official Node.js 18 image
FROM node:18-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy local code to the container image
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the web service on container startup
CMD [ "node", "index.js" ]

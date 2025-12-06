FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install production dependencies
RUN npm install

COPY server/ ./server/

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["npm", "run", "server"]

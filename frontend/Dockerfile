# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package files (already inside /frontend folder in context)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Build the app (Production mode)
RUN npm run build

# Stage 2: Serve the files using Nginx
FROM nginx:alpine

# Copy build files to Nginx public folder
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]

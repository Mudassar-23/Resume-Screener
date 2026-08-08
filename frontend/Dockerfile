# Lightweight Nginx image for serving frontend static files
FROM nginx:alpine

# Remove default nginx config and copy custom reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend files into web root
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

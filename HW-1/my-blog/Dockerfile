# Use Nginx as the base image
FROM nginx:alpine

# Clean default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy everything (Blog.html, blog.js, css, images, etc.)
COPY . /usr/share/nginx/html/

# Make Blog.html the default page at /
RUN cp /usr/share/nginx/html/Blog.html /usr/share/nginx/html/index.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# use Node.js official image as base image
FROM node:18-alpine

# set working directory
WORKDIR /app

# copy all source code and configuration files
COPY . .

# install dependencies
RUN npm install

# set startup script permission
RUN chmod +x frontend-entrypoint.sh

# use startup script
ENTRYPOINT ["./frontend-entrypoint.sh"]
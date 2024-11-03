# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app
# Clone the proto files repository
RUN git clone https://github.com/raphael-devasia/proto-files.git proto-files


# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set the proto path in your app
ENV PROTO_PATH=/app/proto-files

# Expose the port the app runs on (optional, based on your server config)
EXPOSE 5050

# Define the command to run the app
CMD ["npm", "start"]

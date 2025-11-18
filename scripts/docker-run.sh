#!/bin/bash

# Run BFF Docker Container
# Usage: ./scripts/docker-run.sh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

IMAGE_NAME="bff-app:latest"
CONTAINER_NAME="bff-container"

echo -e "${BLUE}Starting BFF Docker Container...${NC}"
echo ""

# Check if .env exists
if [ ! -f "apps/bff/.env" ]; then
    echo -e "${YELLOW}Warning: apps/bff/.env not found${NC}"
    echo -e "${YELLOW}Create .env file with required environment variables${NC}"
    echo ""
fi

# Stop existing container
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
fi

# Run container
echo -e "${BLUE}Starting new container...${NC}"
docker run -d \
  --name ${CONTAINER_NAME} \
  -p 8080:8080 \
  --env-file apps/bff/.env \
  --network bff-network \
  ${IMAGE_NAME}

echo ""
echo -e "${GREEN}✓ Container started!${NC}"
echo ""
echo -e "${BLUE}Check logs:${NC} docker logs -f ${CONTAINER_NAME}"
echo -e "${BLUE}Stop container:${NC} docker stop ${CONTAINER_NAME}"
echo -e "${BLUE}Access app:${NC} http://localhost:8080"
echo ""

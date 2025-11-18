#!/bin/bash

# Build Docker Image for BFF
# Usage: ./scripts/build-docker-image.sh [tag]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default tag
TAG=${1:-latest}
IMAGE_NAME="bff-app"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Docker Image for BFF${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Build custom elements
echo -e "${YELLOW}[1/3] Building custom elements...${NC}"
./scripts/deploy-all-ce-to-bff.sh

# Step 2: Build Docker image
echo -e "${YELLOW}[2/3] Building Docker image...${NC}"
docker build \
  -t ${IMAGE_NAME}:${TAG} \
  -f apps/bff/Dockerfile \
  .

echo -e "${GREEN}✓ Docker image built: ${IMAGE_NAME}:${TAG}${NC}"

# Step 3: Show image info
echo -e "${YELLOW}[3/3] Image information:${NC}"
docker images | grep ${IMAGE_NAME} | head -1

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Run with:${NC}"
echo -e "${YELLOW}docker run -p 8080:8080 ${IMAGE_NAME}:${TAG}${NC}"
echo ""
echo -e "${BLUE}Or use docker-compose:${NC}"
echo -e "${YELLOW}docker-compose up bff${NC}"
echo ""

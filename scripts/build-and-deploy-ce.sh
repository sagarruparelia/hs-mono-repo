#!/bin/bash

# Build and Deploy Custom Element
# Usage: ./scripts/build-and-deploy-ce.sh <mfe-name> [destination]
# Example: ./scripts/build-and-deploy-ce.sh mfe-profile
# Example: ./scripts/build-and-deploy-ce.sh mfe-profile /path/to/deployment

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <mfe-name> [destination]"
    echo "Example: $0 mfe-profile"
    exit 1
fi

MFE_NAME=$1
DEST=${2:-"apps/${MFE_NAME}/public"}
MFE_PATH="apps/${MFE_NAME}"

if [ ! -d "$MFE_PATH" ]; then
    echo "Error: MFE directory $MFE_PATH does not exist"
    exit 1
fi

if [ ! -f "${MFE_PATH}/vite.config.standalone.ts" ]; then
    echo "Error: vite.config.standalone.ts not found. Run setup-custom-element.sh first."
    exit 1
fi

echo -e "${BLUE}Building custom element for ${MFE_NAME}...${NC}"

# Build
cd "$MFE_PATH"
NODE_ENV=production npx vite build --config vite.config.standalone.ts --mode production
cd ../..

echo -e "${GREEN}✓ Build complete${NC}"

# Copy to destination
echo -e "${BLUE}Copying to ${DEST}...${NC}"
mkdir -p "$DEST"
cp -v "dist/${MFE_PATH}/standalone/custom-element.mjs" "$DEST/"
cp -v "dist/${MFE_PATH}/standalone/custom-element.css" "$DEST/"

echo -e "${GREEN}✓ Files copied${NC}"
echo ""
echo -e "${BLUE}Files available at:${NC}"
echo "  - ${DEST}/custom-element.mjs"
echo "  - ${DEST}/custom-element.css"
echo ""

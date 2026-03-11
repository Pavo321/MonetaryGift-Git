#!/bin/bash

# Script to load .env file and run Spring Boot application
# This loads environment variables from .env file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your database configuration."
    exit 1
fi

echo "Loading environment variables from .env file..."

# Load .env file and export variables
# This handles comments and empty lines
set -a
source .env
set +a

echo "✅ Environment variables loaded"
echo ""
echo "Starting Spring Boot application..."
echo ""

# Run Spring Boot
mvn spring-boot:run


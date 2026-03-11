#!/bin/bash

# Setup script for local database development
# This script helps you set environment variables for local MySQL database

echo "=== Chanlo Local Database Setup ==="
echo ""

# Check if MySQL is running locally
if command -v mysql &> /dev/null; then
    echo "MySQL client found. Checking connection..."
else
    echo "MySQL client not found. Please install MySQL or use Docker."
fi

echo ""
echo "Choose your database setup:"
echo "1. Use Docker MySQL (recommended)"
echo "2. Use local MySQL instance"
echo "3. Just export environment variables (you'll set up DB manually)"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Starting MySQL with Docker..."
        if command -v docker &> /dev/null; then
            # Try docker compose (newer) or docker-compose (older)
            if docker compose version &> /dev/null; then
                docker compose up -d mysql
            elif docker-compose version &> /dev/null; then
                docker-compose up -d mysql
            else
                echo "Docker Compose not found. Please install Docker Desktop."
                exit 1
            fi
            echo "Waiting for MySQL to be ready..."
            sleep 5
            export DB_URL="jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
            export DB_USERNAME="chanlo_user"
            export DB_PASSWORD="chanlo_password"
            export MYSQL_ROOT_PASSWORD="root_password"
            export MYSQL_DATABASE="chanlo"
            export MYSQL_USER="chanlo_user"
            export MYSQL_PASSWORD="chanlo_password"
            echo "✅ MySQL started on port 3307"
        else
            echo "Docker not found. Please install Docker Desktop."
            exit 1
        fi
        ;;
    2)
        echo ""
        read -p "Enter MySQL host (default: localhost): " db_host
        db_host=${db_host:-localhost}
        read -p "Enter MySQL port (default: 3306): " db_port
        db_port=${db_port:-3306}
        read -p "Enter database name (default: chanlo): " db_name
        db_name=${db_name:-chanlo}
        read -p "Enter MySQL username: " db_user
        read -sp "Enter MySQL password: " db_pass
        echo ""
        
        export DB_URL="jdbc:mysql://${db_host}:${db_port}/${db_name}?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
        export DB_USERNAME="${db_user}"
        export DB_PASSWORD="${db_pass}"
        echo "✅ Environment variables set for local MySQL"
        ;;
    3)
        echo ""
        echo "Please set these environment variables manually:"
        echo "  export DB_URL='jdbc:mysql://localhost:3306/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC'"
        echo "  export DB_USERNAME='your_username'"
        echo "  export DB_PASSWORD='your_password'"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=== Environment Variables ==="
echo "DB_URL=$DB_URL"
echo "DB_USERNAME=$DB_USERNAME"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the application, use:"
echo "  mvn spring-boot:run"
echo ""
echo "Or to make these variables persistent in this shell session, run:"
echo "  source setup-local-db.sh"
echo ""


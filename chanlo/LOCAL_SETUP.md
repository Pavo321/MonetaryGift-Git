# Local Development Setup

## Quick Start - Set Database Environment Variables

The application requires database connection environment variables. Choose one of these options:

### Option 1: Use Docker MySQL (Recommended)

```bash
# Start MySQL container
docker compose up -d mysql
# OR if you have older Docker: docker-compose up -d mysql

# Set environment variables
export DB_URL="jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
export DB_USERNAME="chanlo_user"
export DB_PASSWORD="chanlo_password"

# Run the application
mvn spring-boot:run
```

### Option 2: Use Local MySQL

If you have MySQL installed locally:

```bash
# Set environment variables (adjust as needed)
export DB_URL="jdbc:mysql://localhost:3306/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
export DB_USERNAME="root"
export DB_PASSWORD="your_mysql_password"

# Create database if it doesn't exist
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS chanlo;"

# Run the application
mvn spring-boot:run
```

### Option 3: Use Setup Script

```bash
# Run the interactive setup script
./setup-local-db.sh

# Then run the application
mvn spring-boot:run
```

### Option 4: Create .env file (if using Docker Compose for app too)

Create a `.env` file in the project root:

```env
# Database
DB_URL=jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
DB_USERNAME=chanlo_user
DB_PASSWORD=chanlo_password

# MySQL (for docker-compose)
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=chanlo
MYSQL_USER=chanlo_user
MYSQL_PASSWORD=chanlo_password

# WhatsApp (optional for now)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

Then run:
```bash
docker compose up
```

## Troubleshooting

### Error: "Driver claims to not accept jdbcUrl, ${DB_URL}"

This means environment variables are not set. Make sure to export them before running:

```bash
export DB_URL="jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
export DB_USERNAME="chanlo_user"
export DB_PASSWORD="chanlo_password"
```

### Error: "Connection refused"

- Check if MySQL is running: `docker ps` (for Docker) or `mysql -u root -p` (for local)
- Verify the port (3307 for Docker, 3306 for local MySQL)
- Check firewall settings

### Error: "Access denied"

- Verify username and password are correct
- For Docker MySQL, check the `.env` file or docker-compose.yml
- For local MySQL, ensure the user has proper permissions

## Making Environment Variables Persistent

### For Current Terminal Session

```bash
export DB_URL="jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
export DB_USERNAME="chanlo_user"
export DB_PASSWORD="chanlo_password"
```

### For All Terminal Sessions (macOS/Linux)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Chanlo Database Configuration
export DB_URL="jdbc:mysql://localhost:3307/chanlo?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
export DB_USERNAME="chanlo_user"
export DB_PASSWORD="chanlo_password"
```

Then reload: `source ~/.zshrc`

### Using IntelliJ IDEA / VS Code

Set environment variables in your IDE's run configuration:
- **IntelliJ**: Run → Edit Configurations → Environment variables
- **VS Code**: `.vscode/launch.json` → `env` section


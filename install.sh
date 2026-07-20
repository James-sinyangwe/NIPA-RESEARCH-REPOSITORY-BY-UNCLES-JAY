#!/usr/bin/env bash

# ==============================================================================
# 🚀 AUTOMATED INSTALLATION & DEPLOYMENT SCRIPT
# Institutional Repository & Digital Library System — Ubuntu Server Setup
# ==============================================================================
#
# This script automates the installation of:
#   1. System packages & build tools (curl, git, build-essential, etc.)
#   2. PostgreSQL database server & automatic role configuration
#   3. Node.js 20.x Active LTS & Global Process Managers (PM2)
#   4. Repository directories, file upload permissions, and dependencies
#   5. Dynamic production environment variables (.env setup)
#   6. Automated production builds (Vite + esbuild compile)
#   7. Programmatic database schema bootstrapping & migrations via Drizzle
#   8. Process management (PM2 systemd autostart)
#   9. Nginx reverse-proxy deployment
#
# Supported Systems: Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS (Clean installs)
# Run command: sudo bash install.sh
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Color definitions for highly polished visual layout
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print styled banner
echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "   INSTITUTIONAL REPOSITORY & DIGITAL LIBRARY - AUTODEPLOY SYSTEM     "
echo "                      Ubuntu Server Installation                      "
echo "======================================================================"
echo -e "${NC}"

# Check for root permissions
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}${BOLD}❌ ERROR: Please run this script with root privileges (sudo bash install.sh).${NC}"
  exit 1
fi

# Detect actual user invoking sudo to apply permissions correctly later
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo "~$ACTUAL_USER")

echo -e "${BLUE}ℹ️ Detected running user: ${BOLD}$ACTUAL_USER${NC} (Home: $USER_HOME)"
echo -e "${BLUE}ℹ️ Starting deployment pipeline...${NC}"
echo ""

# ==============================================================================
# 🔑 INTERACTIVE CONFIGURATION COLLECTOR
# ==============================================================================
echo -e "${YELLOW}${BOLD}⚙️ STEP 1: CONFIGURE ENVIRONMENT SETTINGS${NC}"
echo "Press Enter to select the [default bracketed] value."
echo "----------------------------------------------------------------------"

# Database Configuration Inputs
read -p "Database Name [repository_db]: " DB_NAME
DB_NAME=${DB_NAME:-repository_db}

read -p "Database App User [repository_user]: " DB_USER
DB_USER=${DB_USER:-repository_user}

# Generate a secure password if user skips
DEFAULT_APP_PASS=$(openssl rand -hex 12)
read -p "Database App User Password [Randomly Generated]: " DB_PASS
DB_PASS=${DB_PASS:-$DEFAULT_APP_PASS}

read -p "Database Admin/Migration User [repository_admin]: " DB_ADMIN
DB_ADMIN=${DB_ADMIN:-repository_admin}

DEFAULT_ADMIN_PASS=$(openssl rand -hex 12)
read -p "Database Admin User Password [Randomly Generated]: " DB_ADMIN_PASS
DB_ADMIN_PASS=${DB_ADMIN_PASS:-$DEFAULT_ADMIN_PASS}

# Server Configurations
read -p "Express Server Port [3000]: " APP_PORT
APP_PORT=${APP_PORT:-3000}

read -p "Server Domain Name or IP address [localhost]: " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

echo ""
echo -e "${GREEN}✅ Configuration parameters locked in.${NC}"
echo "----------------------------------------------------------------------"
echo -e "DB Name:          ${BOLD}${DB_NAME}${NC}"
echo -e "App User:         ${BOLD}${DB_USER}${NC} / Pass: ${DB_PASS}"
echo -e "Admin User:       ${BOLD}${DB_ADMIN}${NC} / Pass: ${DB_ADMIN_PASS}"
echo -e "System Port:      ${BOLD}${APP_PORT}${NC}"
echo -e "Proxy Host:       ${BOLD}${DOMAIN_NAME}${NC}"
echo "----------------------------------------------------------------------"
echo ""

# Confirm before writing/running changes
read -p "Do you want to proceed with the automated installation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment aborted by user.${NC}"
    exit 1
fi

# ==============================================================================
# 📦 STEP 1: SYSTEM REFRESH & ESSENTIAL UTILITIES
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}📦 STEP 2: REFRESHING SYSTEM AND INSTALLING DEV UTILITIES...${NC}"
apt update
apt upgrade -y
apt install -y build-essential curl wget git zip unzip ufw nginx openssl
echo -e "${GREEN}✅ System packages up-to-date.${NC}"

# ==============================================================================
# 🐘 STEP 2: INSTALL & CONFIGURE POSTGRESQL DATABASE
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}🐘 STEP 3: INSTALLING AND CONFIGURING POSTGRESQL SERVER...${NC}"
apt install -y postgresql postgresql-contrib

# Enable and start service
systemctl enable postgresql
systemctl start postgresql

echo -e "${BLUE}Configuring PostgreSQL users and privileges...${NC}"

# Run psql commands to provision credentials securely
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
-- Drop database if exists to start fresh
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};

-- Safely create or update App User without dropping to prevent dependency errors
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Safely create or update Admin User without dropping to prevent dependency errors
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_ADMIN}') THEN
    CREATE ROLE ${DB_ADMIN} WITH SUPERUSER LOGIN PASSWORD '${DB_ADMIN_PASS}';
  ELSE
    ALTER ROLE ${DB_ADMIN} WITH SUPERUSER PASSWORD '${DB_ADMIN_PASS}';
  END IF;
END
\$\$;

-- Grant general app privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo -e "${GREEN}✅ PostgreSQL database, users, and roles configured successfully.${NC}"

# ==============================================================================
# 🟢 STEP 3: INSTALL NODE.JS ACTIVE LTS & PM2
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}🟢 STEP 4: PROVISIONING NODE.JS ENVIRONMENT...${NC}"

# Detect OS and glibc version to prevent dependency blocks on older systems like Ubuntu 18.04
UBUNTU_RELEASE=$(lsb_release -rs 2>/dev/null || cat /etc/os-release | grep -oP 'VERSION_ID="\K[^"]+' || echo "unknown")
GLIBC_VERSION=$(ldd --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -n1 || echo "2.28")

NODE_VERSION_SETUP="20.x"

# Node.js 18+ requires glibc >= 2.28 (Ubuntu 18.04 ships with glibc 2.27, which breaks Node 18+)
if [[ "$UBUNTU_RELEASE" == "18.04" || "$GLIBC_VERSION" == "2.27" || "$GLIBC_VERSION" == "2.26" || "$GLIBC_VERSION" == "2.25" ]]; then
  echo -e "${YELLOW}⚠️ Ubuntu 18.04 or legacy system detected (glibc version: $GLIBC_VERSION < 2.28).${NC}"
  echo -e "${YELLOW}Falling back to Node.js 16.x (the maximum compatible version for Ubuntu 18.04).${NC}"
  NODE_VERSION_SETUP="16.x"
else
  echo -e "${BLUE}System compatible with Node.js 20.x (Ubuntu: $UBUNTU_RELEASE, glibc: $GLIBC_VERSION).${NC}"
fi

# Clean up common legacy package manager issue sources
echo -e "${BLUE}Cleaning up broken repositories, stale NodeSource definitions, and invalid yarn sources...${NC}"
# Delete nodesource list files to prevent caching the old/wrong 20.x repo configuration
rm -f /etc/apt/sources.list.d/*nodesource* 2>/dev/null || true
# Delete broken yarn repos that throw signature/NO_PUBKEY verification blocks
rm -f /etc/apt/sources.list.d/*yarn* 2>/dev/null || true

# Force package manager cleanup and sync
apt-get clean
apt-get autoremove -y
apt-get update

echo -e "${BLUE}Registering NodeSource repository for Node.js $NODE_VERSION_SETUP...${NC}"
curl -fsSL "https://deb.nodesource.com/setup_$NODE_VERSION_SETUP" | bash -

# Execute update to sync lists
apt-get update

echo -e "${BLUE}Installing Node.js...${NC}"
apt install -y nodejs

# Verify runtimes
echo -e "Installed Node version: ${BOLD}$(node -v)${NC}"
echo -e "Installed NPM version:  ${BOLD}$(npm -v)${NC}"

# Install process manager globally
echo -e "${BLUE}Installing PM2 (Process Manager) globally...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ Node.js and global tooling installed.${NC}"

# ==============================================================================
# 📁 STEP 4: DIRECTORY ACCESS & PERMISSION ALIGNMENT
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}📁 STEP 5: ALIGNING WORKSPACE FILE SYSTEM PERMISSIONS...${NC}"
# Setup file storage directory
mkdir -p uploads
chmod -R 775 uploads
chown -R $ACTUAL_USER:www-data uploads

# Set ownership of entire working path to current human user
CURRENT_DIR=$(pwd)
chown -R $ACTUAL_USER:$ACTUAL_USER "$CURRENT_DIR"
echo -e "${GREEN}✅ Upload storage directories and workspace owners set.${NC}"

# ==============================================================================
# 📝 STEP 5: SETUP ENVIRONMENT VARIABLES (.env)
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}📝 STEP 6: WRITING RUNTIME ENVIRONMENT FILE (.env)...${NC}"
cat <<EOF > .env
# Production Runtime Environment Setup
NODE_ENV=production
PORT=${APP_PORT}

# PostgreSQL Database Configuration
SQL_HOST=127.0.0.1
SQL_PORT=5432
SQL_DB_NAME=${DB_NAME}

# Standard Application user (general daily operations)
SQL_USER=${DB_USER}
SQL_PASSWORD=${DB_PASS}

# Database Migration Administrator (super privileges for schema sync on boot)
SQL_ADMIN_USER=${DB_ADMIN}
SQL_ADMIN_PASSWORD=${DB_ADMIN_PASS}

# Connection encryption rules (disabled for localhost connections)
SQL_SSL=false
EOF

# Ensure actual user owns the new env file for maintenance
chown $ACTUAL_USER:$ACTUAL_USER .env
echo -e "${GREEN}✅ Production .env written successfully.${NC}"

# ==============================================================================
# ⚡ STEP 6: PROJECT DEPLOYMENT BUILD PIPELINE
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}⚡ STEP 7: INITIATING SYSTEM BUILD PIPELINE...${NC}"
echo -e "${BLUE}Downloading node dependencies...${NC}"
# Run dependency installs as the actual invoking user (to prevent npm root ownership issues)
sudo -u $ACTUAL_USER npm install

echo -e "${BLUE}Compiling client and server bundles...${NC}"
sudo -u $ACTUAL_USER npm run build
echo -e "${GREEN}✅ Build pipeline successfully completed.${NC}"

# ==============================================================================
# 🚀 STEP 7: REGISTER & LAUNCH SERVICE UNDER PM2 PROCESS MANAGER
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}🚀 STEP 8: DEPLOYING SYSTEM AS SYSTEM SERVICE VIA PM2...${NC}"

# Stop existing server instance if running to clear port binds
pm2 stop "repository-system" 2>/dev/null || true
pm2 delete "repository-system" 2>/dev/null || true

# Launch application as the active human user
sudo -u $ACTUAL_USER pm2 start dist/server.cjs --name "repository-system"

# Automatically configure startup scripts for standard server boots
echo -e "${BLUE}Configuring system boot daemon hooks...${NC}"
# Generate daemon hooks based on the invoking user
pm2 startup systemd -u $ACTUAL_USER --hp $USER_HOME | tail -n 1 > pm2-startup.sh
chmod +x pm2-startup.sh
./pm2-startup.sh
rm -f pm2-startup.sh

# Save the current state of PM2 daemon list
sudo -u $ACTUAL_USER pm2 save
echo -e "${GREEN}✅ Service registered under PM2 and configured to launch on server boot.${NC}"

# ==============================================================================
# 🌐 STEP 8: NGINX REVERSE-PROXY CONFIGURATION
# ==============================================================================
echo -e "\n${YELLOW}${BOLD}🌐 STEP 9: DEPLOYING NGINX REVERSE PROXY...${NC}"

NGINX_CONF="/etc/nginx/sites-available/repository"

cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Set appropriate maximum document/thesis attachment limits (100MB)
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Link file if not linked
if [ ! -f /etc/nginx/sites-enabled/repository ]; then
  ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/
fi

# Remove default page if it conflicts
rm -f /etc/nginx/sites-enabled/default

# Test syntax correctness
nginx -t

# Restart reverse proxy
systemctl restart nginx
echo -e "${GREEN}✅ Nginx reverse-proxy setup successfully completed.${NC}"

# ==============================================================================
# 🎉 SYSTEM DEPLOYMENT SUCCESS OVERVIEW
# ==============================================================================
echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 CONGRATULATIONS! THE DEPLOYMENT IS COMPLETELY INSTALLED & ACTIVE! ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}\n"
echo -e "Your Digital Library and Institutional Repository system has been built"
echo -e "and successfully integrated on your Ubuntu Server."
echo ""
echo -e "🌐 ${BOLD}Live Web App Domain/IP:${NC}  http://${DOMAIN_NAME}"
echo -e "⚡ ${BOLD}Background Service Name:${NC} repository-system (running under PM2)"
echo -e "🐘 ${BOLD}Database System:${NC}        PostgreSQL (localhost:5432)"
echo -e "📁 ${BOLD}Upload Store Path:${NC}      ${CURRENT_DIR}/uploads"
echo ""
echo -e "🚀 ${BOLD}Key Management Commands:${NC}"
echo -e "  • ${CYAN}pm2 status${NC}           - Review active servers and performance metrics."
echo -e "  • ${CYAN}pm2 logs repository-system${NC}  - Inspect live system/database startup logs."
echo -e "  • ${CYAN}pm2 restart repository-system${NC} - Restart application process."
echo ""
echo -e "🔒 ${BOLD}Secure with HTTPS (Optional):${NC}"
echo -e "  Run the following commands to instantly install free trusted SSL certificates:"
echo -e "  ${CYAN}sudo apt install -y certbot python3-certbot-nginx${NC}"
echo -e "  ${CYAN}sudo certbot --nginx -d ${DOMAIN_NAME}${NC}"
echo ""
echo -e "Detailed logs and management procedures are documented in ${BOLD}INSTALL.md${NC} and ${BOLD}USER_MANUAL.md${NC}."
echo -e "Enjoy managing your digital scholarly library system!\n"

# 🛠️ Installation & Deployment Manual
## Institutional Repository & Digital Library System — Ubuntu Server Installation Guide

This document provides a comprehensive, step-by-step guide to installing, configuring, and deploying the **Institutional Repository & Digital Library System** from scratch on a clean **Ubuntu Server** (supports 20.04 LTS, 22.04 LTS, and 24.04 LTS).

The system is built as a highly optimized, full-stack application with a compiled Node.js/Express server (bundled using `esbuild`) and a React frontend (built via `Vite`). It utilizes **PostgreSQL** for durable relational storage and **Drizzle ORM** for programmatic schema migrations during bootstrap.

---

## 🧭 Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Step 1: System Update & Package Installation](#step-1-system-update--package-installation)
3. [Step 2: PostgreSQL Installation & Configuration](#step-2-postgresql-installation--configuration)
4. [Step 3: Node.js & Tooling Setup](#step-3-nodejs--tooling-setup)
5. [Step 4: Project Retrieval & Dependency Setup](#step-4-project-retrieval--dependency-setup)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Build & Automated Migrations](#step-6-build--automated-migrations)
8. [Step 7: Production Process Management via PM2](#step-7-production-process-management-via-pm2)
9. [Step 8: Reverse Proxy Configuration (Nginx & SSL)](#step-8-reverse-proxy-configuration-nginx--ssl)
10. [Troubleshooting & Maintenance Guidelines](#troubleshooting--maintenance-guidelines)

---

## 1. Prerequisites & System Requirements

To ensure stable performance under load, the following virtual machine configurations are recommended:

*   **Operating System**: Ubuntu Server 20.04, 22.04, or 24.04 LTS (x86_64 or ARM64)
*   **Hardware Specifications**:
    *   *Minimum*: 1 vCPU, 1 GB RAM, 25 GB SSD Storage
    *   *Recommended (Production)*: 2 vCPUs, 4 GB RAM, 100 GB SSD Storage
*   **Network Ingress**: Ports `80` (HTTP), `443` (HTTPS), and `22` (SSH) open in firewall.

---

## Step 1: System Update & Package Installation

Connect to your Ubuntu server via SSH and execute a full package index refresh and system upgrade:

```bash
# Update local package definitions
sudo apt update

# Upgrade existing packages to their latest stable releases
sudo apt upgrade -y

# Install essential compilation and network utilities
sudo apt install -y build-essential curl wget git zip unzip ufw nginx
```

---

## Step 2: PostgreSQL Installation & Configuration

The application uses standard PostgreSQL for persistent metadata storage. We will install PostgreSQL, configure a dedicated database, and establish proper credentials.

### 1. Install PostgreSQL Server
```bash
# Install PostgreSQL server and its contrib utilities
sudo apt install -y postgresql postgresql-contrib
```

### 2. Verify Database Service Status
Ensure the service is active and set to boot automatically with the server:
```bash
sudo systemctl status postgresql
sudo systemctl enable postgresql
```

### 3. Create Database & Users
Access the PostgreSQL command-line interface using the default system administrative role (`postgres`):
```bash
sudo -i -u postgres psql
```

Inside the interactive `psql` console, run the following commands to provision the database and application users. *(Make sure to replace `secure_app_password` and `secure_admin_password` with strong passwords!)*:

```sql
-- 1. Create the application database
CREATE DATABASE repository_db;

-- 2. Create the standard application user (used for general operations)
CREATE USER repository_user WITH PASSWORD 'secure_app_password';

-- 3. Create the schema administrator user (used by Drizzle for migrations)
CREATE USER repository_admin WITH PASSWORD 'secure_admin_password';

-- 4. Grant privileges to standard user
GRANT ALL PRIVILEGES ON DATABASE repository_db TO repository_user;

-- 5. Grant superuser/admin privileges to the administrative user for migration handling
ALTER USER repository_admin WITH SUPERUSER;

-- 6. Exit the console
\q
```

---

## Step 3: Node.js & Tooling Setup

The system requires Node.js (Active LTS - v20.x or v22.x is recommended). Do not use the legacy Node.js version packaged inside standard Ubuntu repositories.

### 1. Setup NodeSource Repository & Install Node.js
```bash
# Add NodeSource APT repository for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm package manager
sudo apt install -y nodejs

# Verify the installed versions
node -v
npm -v
```

---

## Step 4: Project Retrieval & Dependency Setup

### 1. Clone/Upload Your Application
Navigate to the `/var/www` deployment directory, set up your project folder, and transfer the application source code:

```bash
# Navigate to web root directory
cd /var/www

# Clone your repository (or upload via SFTP)
sudo git clone <your-repository-url> repository

# Change directory ownership to the active server user
sudo chown -R $USER:$USER /var/www/repository

# Navigate into the project directory
cd /var/www/repository
```

### 2. Configure Directory Permissions for File Uploads
The repository stores uploaded papers, theses, and assets inside `/var/www/repository/uploads`. Ensure the Node.js process has read/write privileges:

```bash
# Ensure directory exists
mkdir -p uploads

# Grant read/write/execute permissions to the owner
chmod -R 775 uploads
```

### 3. Install Application Dependencies
Run standard npm installation to download all required frontend and backend node modules:
```bash
npm install
```

---

## Step 5: Configure Environment Variables

The application reads its database credentials and runtime configuration from a root-level `.env` file. Copy the example template and supply your local settings.

### 1. Create `.env` file
```bash
cp .env.example .env
nano .env
```

### 2. Update Environment Keys
Set your local variables inside the editor. Make sure they correspond to the PostgreSQL users created in **Step 2**:

```env
# Runtime Environment Configuration
NODE_ENV=production
PORT=3000

# PostgreSQL Credentials & Connection
SQL_HOST=127.0.0.1
SQL_PORT=5432
SQL_DB_NAME=repository_db

# Standard user (for daily SELECT, INSERT, UPDATE, DELETE queries)
SQL_USER=repository_user
SQL_PASSWORD=secure_app_password

# Admin/Superuser (used during 'npm run build' and programmatic startup migrations)
SQL_ADMIN_USER=repository_admin
SQL_ADMIN_PASSWORD=secure_admin_password

# SSL settings (set to false for local loopback connections)
SQL_SSL=false
```
Save and close the file (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 6: Build & Automated Migrations

The build script compiles and optimizes our entire platform in a single pipeline.

```bash
npm run build
```

### What Happens Behind the Scenes?
1. **Drizzle-Kit Generation**: It scans `src/db/schema.ts` and compiles your relational schema into pure SQL migration scripts stored in `./drizzle`.
2. **Frontend Compilation**: It runs Vite to bundle, minify, and generate static HTML/CSS/JavaScript client files inside `./dist`.
3. **Backend Server Bundle**: It compiles the Express Node.js application `server.ts` into a single, self-contained CommonJS file located at `./dist/server.cjs` using `esbuild`.

---

## Step 7: Production Process Management via PM2

To ensure the backend server runs continuously in the background, handles unexpected crashes elegantly, and automatically starts when the system boots, we use **PM2 (Process Manager 2)**.

### 1. Install PM2 Globally
```bash
sudo npm install -y -g pm2
```

### 2. Start the Application Service
Start the application server using PM2. This launches the compiled backend bundle:
```bash
pm2 start dist/server.cjs --name "repository-system"
```

> **Programmatic Migration Alert**: During initial launch, the system automatically checks the `./drizzle` folder and runs any pending database migrations using your administrator credentials. Your tables, constraints, indices, and relationships are automatically built upon start.

### 3. Configure Boot Autostart
Generate the system startup configuration to keep the process running if the server reboots:
```bash
pm2 startup systemd
```
Copy and execute the output command displayed on your screen to register PM2 with systemd (it looks similar to this):
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <username> --hp /home/<username>
```

Save the current running application configuration list:
```bash
pm2 save
```

---

## Step 8: Reverse Proxy Configuration (Nginx & SSL)

Instead of exposing our internal port `3000` directly, we will configure **Nginx** as a high-performance reverse proxy that routes public HTTP/HTTPS traffic to the system.

### 1. Configure UFW Firewall
Allow web traffic on port 80 and 443, as well as SSH on port 22:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Set Up Nginx Server Block
Create a new configuration block for your site:
```bash
sudo nano /etc/nginx/sites-available/repository
```

Paste the following configurations (replace `yourdomain.com` with your actual domain or public IP address):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase maximum upload file limit for large PDF/Thesis submissions
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit.

### 3. Enable Configuration & Restart Nginx
Link the configuration block and test for syntax integrity:
```bash
# Link to active sites directory
sudo ln -s /etc/nginx/sites-available/repository /etc/nginx/sites-enabled/

# Remove default configuration if present to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Restart the service
sudo systemctl restart nginx
```

### 4. Install SSL Certificates (Certbot / Let's Encrypt)
To secure academic documents and passwords with full HTTPS encryption:
```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install Let's Encrypt certificate automatically
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the interactive prompts. Certbot will automatically rewrite the Nginx files to redirect HTTP to secure HTTPS.

---

## Troubleshooting & Maintenance Guidelines

### Checking Runtime Logs
If you experience any issues (such as database connectivity failures or file routing problems), inspect the logs:

```bash
# Read live application logs from PM2
pm2 logs repository-system

# Read HTTP proxy logs from Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Updating Your Codebase
When push notifications arrive or updates are published on GitHub:
```bash
cd /var/www/repository
git pull
npm install
npm run build
pm2 restart repository-system
```
Your compiled code is redeployed, and Drizzle programmatically runs any newly added migration scripts on server boot!

### Verifying Database Tables
To verify if Drizzle successfully executed database migrations:
```bash
sudo -i -u postgres psql -d repository_db -c "\dt"
```
You should see lists of structured tables (e.g., `app_data`, `users`, `documents`, `collections`, `communities`).

---

*This document was compiled for institutional administrators. For operational inquiries, security audits, or backup workflows, consult `USER_MANUAL.md`.*

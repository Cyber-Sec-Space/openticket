#!/usr/bin/env bash

# OpenTicket Automatic Setup Wizard
# This script prepares your local environment for Bare-Metal development or deployment.

set -e

echo -e "\033[1;36m====================================================\033[0m"
echo -e "\033[1;36m      🚀 OpenTicket Configuration Wizard 🚀       \033[0m"
echo -e "\033[1;36m====================================================\033[0m\n"

# 1. Environment Variable Setup
if [ ! -f .env ]; then
  echo -e "\033[1;33m[INF] No .env file found. Copying from .env.example...\033[0m"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "\033[1;32m[OK]  .env file created successfully.\033[0m"
  else
    echo -e "\033[1;31m[ERR] .env.example not found! Providing template...\033[0m"
    echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/openticket\"" > .env
    echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
  fi
else
  echo -e "\033[1;32m[INF] .env file already exists.\033[0m"
fi

echo -e "\n\033[1;34m[?] Do you want to configure PostgreSQL database credentials? (Y/n)\033[0m"
read -r config_db < /dev/tty
if [[ ! "$config_db" =~ ^([nN][oO]|[nN])$ ]]; then
  echo -e "\033[1;36m(Press Enter to accept defaults)\033[0m"
  
  read -p "PostgreSQL User [openticket]: " pg_user < /dev/tty
  pg_user=${pg_user:-openticket}
  
  read -p "PostgreSQL Password [supersecure]: " pg_pass < /dev/tty
  pg_pass=${pg_pass:-supersecure}
  
  read -p "PostgreSQL Database Name [openticket_prod]: " pg_db < /dev/tty
  pg_db=${pg_db:-openticket_prod}
  
  read -p "Database Host (e.g. localhost:5432 or db:5432) [localhost:5432]: " pg_host < /dev/tty
  pg_host=${pg_host:-localhost:5432}
  
  db_url="postgresql://${pg_user}:${pg_pass}@${pg_host}/${pg_db}"
  
  # Inject distinct PG variables so that Docker Compose can also pick them up natively
  echo "" >> .env
  echo "POSTGRES_USER=\"$pg_user\"" >> .env
  echo "POSTGRES_PASSWORD=\"$pg_pass\"" >> .env
  echo "POSTGRES_DB=\"$pg_db\"" >> .env

  # Update DATABASE_URL safely
  if grep -q "^DATABASE_URL=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
    else
      sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
    fi
  else
    echo "DATABASE_URL=\"$db_url\"" >> .env
  fi

  echo -e "\033[1;32m[OK]  Database connection dynamically constructed and injected into .env!\033[0m"
fi

# 2. Dependency Installation
echo -e "\n\033[1;36m>> Installing NodeJS Dependencies...\033[0m"
npm install

# 3. Database Migration
echo -e "\n\033[1;36m>> Synchronizing Database Schema...\033[0m"
npx prisma generate
npx prisma migrate deploy
npm run upgrade:0.5.0

echo -e "\n\033[1;36m====================================================\033[0m"
echo -e "\033[1;32m🎉 Setup Complete! 🎉\033[0m"
echo -e "\033[1;36m====================================================\033[0m"
echo -e "Start your server by typing:"
echo -e "\033[1;33m    npm run dev\033[0m\n"
echo -e "Once started, visit \033[1;34mhttp://localhost:3000/setup\033[0m to bootstrap the first administrator account."

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

echo -e "\n\033[1;34m[?] Do you need to modify your database connection string? (y/N)\033[0m"
read -r modify_env < /dev/tty
if [[ "$modify_env" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo -e "\033[1;34mPlease enter your DATABASE_URL:\033[0m"
  read -r db_url < /dev/tty
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
  else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
  fi
  echo -e "\033[1;32m[OK]  Database URL updated.\033[0m"
fi

# 2. Dependency Installation
echo -e "\n\033[1;36m>> Installing NodeJS Dependencies...\033[0m"
npm install

# 3. Database Migration
echo -e "\n\033[1;36m>> Synchronizing Database Schema...\033[0m"
npx prisma migrate dev --name init

echo -e "\n\033[1;36m====================================================\033[0m"
echo -e "\033[1;32m🎉 Setup Complete! 🎉\033[0m"
echo -e "\033[1;36m====================================================\033[0m"
echo -e "Start your server by typing:"
echo -e "\033[1;33m    npm run dev\033[0m\n"
echo -e "Once started, visit \033[1;34mhttp://localhost:3000/setup\033[0m to bootstrap the first administrator account."

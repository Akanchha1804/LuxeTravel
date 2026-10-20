#!/usr/bin/env bash
# Build script for Render/Railway-style deployments.
set -o errexit

npm ci --no-audit --no-fund
npm run build

pip install -r backend/requirements.txt

cd backend
python manage.py collectstatic --noinput
python manage.py migrate --noinput

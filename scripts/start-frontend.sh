#!/bin/bash
# Script to install dependencies and start the frontend dev server

cd "$(dirname "$0")/../frontend"
echo "Installing frontend dependencies..."
npm install
echo "Starting frontend development server..."
npm run dev

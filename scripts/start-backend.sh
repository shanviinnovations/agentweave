#!/bin/zsh
# Start the FastAPI backend server using Uvicorn
# This will launch the agent servers and the discovery server using port from config.json

# Start MongoDB in Docker if not already running
if ! docker ps --format '{{.Names}}' | grep -q '^agent-mongo$'; then
  if docker ps -a --format '{{.Names}}' | grep -q '^agent-mongo$'; then
    echo "Starting existing MongoDB container..."
    docker start agent-mongo
  else
    echo "Creating and starting new MongoDB container..."
    docker run --name agent-mongo -d -p 27017:27017 mongo:latest
  fi
else
  echo "MongoDB container is already running."
fi

# Go to backend directory
cd backend || exit 1

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# Activate the virtual environment
source .venv/bin/activate || { echo "Failed to activate venv"; exit 1; }

# Ensure pip is up to date
pip install --upgrade pip

# Install project and dependencies
pip install -e .

# Always stop any old backend before starting a new one
cd ..
cd backend

# If --background is passed, run with nohup so Express/exec can get a response and script exits
if [[ "$1" == "--background" ]]; then
  # This mode is used when called from the Express server (exec)
  # so the script exits after starting the backend in the background
  nohup python3 main.py > backend.log 2>&1 &
  exit 0
else
  # This mode is for local development: run in foreground for logs and Ctrl+C
  python3 main.py
fi

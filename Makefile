# Makefile for agentweave

.PHONY: start-backend start-frontend help

help:
	@echo "Available targets:"
	@echo "  start-backend   Start the backend server"
	@echo "  start-frontend  Start the frontend server"

start-backend:
	sh scripts/start-backend.sh

start-frontend:
	sh scripts/start-frontend.sh
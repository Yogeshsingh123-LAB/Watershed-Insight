.DEFAULT_GOAL := help
PYTHON ?= python
PORT   ?= 8000
HOST   ?= 0.0.0.0

.PHONY: help install data test lint backend frontend dev docker clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install Python + Node dependencies
	$(PYTHON) -m pip install -r requirements.txt
	cd frontend && npm install

data: ## (Re)generate the sample watershed dataset
	$(PYTHON) scripts/generate_sample_data.py

backend: ## Run the FastAPI backend on $(PORT)
	$(PYTHON) -m uvicorn backend.app.main:app --host $(HOST) --port $(PORT) --reload

frontend: ## Run the React dashboard on port 3000
	cd frontend && npm run dev

dev: data ## Run backend + frontend together (requires two terminals)
	@echo "Start:  make backend   |   make frontend"

test: ## Run the full test suite
	$(PYTHON) -m pytest tests/ -v

verify: ## End-to-end pipeline check (offline + optional API)
	$(PYTHON) scripts/verify_pipeline.py

build: ## Build the production frontend bundle
	cd frontend && npm run build

docker: ## Build and run with Docker Compose
	docker compose up --build

clean: ## Remove caches, generated overlays and reports
	rm -rf data/sample/overlays/* reports/generated/* frontend/dist
	find . -name "__pycache__" -type d -prune -exec rm -rf {} +
	find . -name ".pytest_cache" -type d -prune -exec rm -rf {} +

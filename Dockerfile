# =============================================================================
# Watershed Insight - API image
# =============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    WS_DATA_DIR=/app/data/sample \
    WS_OUTPUT_DIR=/app/data/sample/overlays \
    WS_REPORTS_DIR=/app/reports/generated

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY geospatial ./geospatial
COPY reports ./reports
COPY scripts ./scripts
COPY data ./data

RUN mkdir -p /app/data/sample/overlays /app/reports/generated

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=8s --start-period=25s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').status==200 else 1)"

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

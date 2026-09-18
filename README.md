# Watershed Insight (PS26015)

> **An AI-Assisted Geospatial Decision-Support Platform for Micro-Watershed Development & Impact Assessment**

Developed for **Smart India Hackathon (SIH 2026) — Problem Statement PS26015** (Ministry of Rural Development / Department of Land Resources - DoLR).

---

## 🌟 Executive Summary

**Watershed Insight** bridges the gap between heterogeneous data sources—satellite imagery, SRISHTI Web-GIS layers, DRISHTI geo-coded field photographs, and watershed boundaries—by providing an automated analytical framework for **temporal change detection**, **250m intervention buffer analysis**, and **one-click evidence report generation**.

```
SATELLITE DATA + GEO-CODED FIELD PHOTOS + WATERSHED BOUNDARIES + GIS LAYERS
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           WATERSHED INSIGHT                             │
│  • Watershed Explorer (Web-GIS Map)                                      │
│  • Geo-Coded Photo Intelligence (DRISHTI GPS Binding)                   │
│  • Satellite Change Detection (NDVI & NDWI Deltas)                       │
│  • Intervention Impact Analysis (250m Buffer Statistics)                 │
│  • Automated PDF Evidence Pack Generator                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                      DECISION-READY EVIDENCE REPORT
```

---

## 🚀 Key Features

1. **Watershed Explorer**:
   - Location Hierarchy: State $\rightarrow$ District $\rightarrow$ Project $\rightarrow$ Micro-watershed (`MWS-MH-2025-014`).
   - Interactive Leaflet Web-GIS rendering boundary polygons, intervention pins, DRISHTI photo markers, and satellite preview overlays.

2. **Geo-Coded Photo Intelligence**:
   - Parses EXIF metadata (`GPSLatitude`, `GPSLongitude`, `DateTimeOriginal`).
   - Performs spatial proximity binding to match field photographs to nearest IWMP interventions (Check Dam, Farm Pond, Plantation, Contour Bund).

3. **Satellite Change Detection Engine**:
   - Computes normalized indices:
     $$NDVI = \frac{NIR - Red}{NIR + Red}, \quad NDWI = \frac{Green - NIR}{Green + NIR}$$
   - Compares baseline $T_0$ (Pre-Intervention Jun 2024) vs post-intervention $T_1$ (Jul 2025) rasters.

4. **Intervention Impact Buffer Analysis**:
   - Extracts satellite indicator statistics within a 250m circular radius around individual intervention points.
   - Computes localized vegetation vigor delta ($\Delta NDVI$) and surface water expansion ($\Delta Ha$).

5. **Automated Evidence Report Generator**:
   - ReportLab PDF engine compiling field photos, GPS timestamps, satellite indicator tables, automated analytical synthesis, and scientific limitations.

---

## 🏗 System Architecture

```
                    ┌───────────────────────────────┐
                    │      React + Vite Frontend    │
                    │   (Leaflet, Recharts, CSS)    │
                    └───────────────┬───────────────┘
                                    │ HTTP / REST
                                    ▼
                    ┌───────────────────────────────┐
                    │        FastAPI Backend        │
                    │   (Endpoints & Controllers)   │
                    └───────────────┬───────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌─────────────────────┐                           ┌─────────────────────┐
│ Geospatial Engine   │                           │ PDF Report Engine   │
│ (GeoPandas, NumPy)  │                           │ (ReportLab Engine)  │
└─────────────────────┘                           └─────────────────────┘
```

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, Leaflet, React-Leaflet, Recharts, Lucide React
- **Backend**: FastAPI, Python 3.12, Uvicorn, Pydantic
- **Geospatial & Analysis**: GeoPandas, Rasterio, Shapely, NumPy, Matplotlib, Piexif
- **Reporting**: ReportLab PDF Engine

---

## 💻 Quickstart & Local Setup

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Install Backend & Geospatial Dependencies
```bash
python -m pip install fastapi uvicorn geopandas rasterio shapely matplotlib pydantic reportlab piexif
```

### 2. Generate Sample Dataset
```bash
python scripts/generate_sample_data.py
```

### 3. Run FastAPI Backend Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 4. Run React Web-GIS Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📜 License

MIT License. Designed for Smart India Hackathon PS26015.

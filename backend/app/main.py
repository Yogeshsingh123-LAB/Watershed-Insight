import os
import json
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from geospatial.raster_processor import RasterProcessor
from reports.pdf_generator import generate_evidence_pdf

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

app = FastAPI(
    title="Watershed Insight API",
    description="Backend API for AI-assisted Geospatial Watershed Monitoring & Impact Analysis (PS26015)",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for Photos and Satellite Preview Rasters
app.mount("/static/photos", StaticFiles(directory=os.path.join(DATA_DIR, "photos")), name="photos")
app.mount("/static/satellite", StaticFiles(directory=os.path.join(DATA_DIR, "satellite")), name="satellite")

# Initialize Raster Engine
raster_processor = RasterProcessor(watershed_id="watershed_001")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "platform": "Watershed Insight - SRISHTI-DRISHTI Aligned Platform",
        "problem_statement": "PS26015",
        "docs_url": "/docs"
    }

@app.get("/api/v1/watersheds")
def get_watersheds():
    boundary_path = os.path.join(DATA_DIR, "boundaries", "watershed_001.geojson")
    if not os.path.exists(boundary_path):
        raise HTTPException(status_code=404, detail="Watershed data not found.")
        
    with open(boundary_path, "r") as f:
        boundary_data = json.load(f)
        
    stats = raster_processor.get_watershed_overview_stats()
    
    return {
        "watersheds": [
            {
                "id": "watershed_001",
                "name": "MWS-MH-2025-014 (Aurangabad North)",
                "district": "Chhatrapati Sambhajinagar",
                "state": "Maharashtra",
                "area_ha": 420.5,
                "stats": stats,
                "boundary": boundary_data
            }
        ]
    }

@app.get("/api/v1/interventions")
def get_interventions():
    interventions_path = os.path.join(DATA_DIR, "interventions", "interventions.geojson")
    if not os.path.exists(interventions_path):
        raise HTTPException(status_code=404, detail="Interventions data not found.")
        
    with open(interventions_path, "r") as f:
        data = json.load(f)
        
    return data

@app.get("/api/v1/photos")
def get_photos():
    photos_path = os.path.join(DATA_DIR, "metadata", "photos.csv")
    if not os.path.exists(photos_path):
        raise HTTPException(status_code=404, detail="Photos metadata not found.")
        
    import csv
    photos = []
    with open(photos_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["url"] = f"/static/photos/{row['file_name']}"
            photos.append(row)
            
    return {"photos": photos}

@app.get("/api/v1/interventions/{intervention_id}/analysis")
def get_intervention_analysis(intervention_id: str, radius_m: int = Query(250, ge=50, le=1000)):
    interventions_path = os.path.join(DATA_DIR, "interventions", "interventions.geojson")
    with open(interventions_path, "r") as f:
        data = json.load(f)
        
    target = None
    for feat in data["features"]:
        if feat["properties"]["id"] == intervention_id:
            target = feat["properties"]
            break
            
    if not target:
        raise HTTPException(status_code=404, detail=f"Intervention {intervention_id} not found.")
        
    analysis = raster_processor.analyze_intervention_buffer(
        lat=target["latitude"],
        lng=target["longitude"],
        buffer_radius_m=radius_m
    )
    
    # Attach photos matched to this intervention
    photos_path = os.path.join(DATA_DIR, "metadata", "photos.csv")
    import csv
    matched_photos = []
    if os.path.exists(photos_path):
        with open(photos_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["intervention_id"] == intervention_id:
                    row["url"] = f"/static/photos/{row['file_name']}"
                    matched_photos.append(row)
                    
    return {
        "intervention": target,
        "analysis": analysis,
        "matched_photos": matched_photos
    }

class ReportRequest(BaseModel):
    intervention_id: str

@app.post("/api/v1/reports/pdf")
def generate_report(req: ReportRequest):
    reports_dir = os.path.join(BASE_DIR, "reports", "generated")
    os.makedirs(reports_dir, exist_ok=True)
    
    pdf_filename = f"Evidence_Report_{req.intervention_id}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    try:
        generate_evidence_pdf(req.intervention_id, pdf_path)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=pdf_filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")

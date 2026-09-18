import os
import json
import csv
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import piexif

# Define directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

os.makedirs(os.path.join(DATA_DIR, "boundaries"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "interventions"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "photos"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "metadata"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "satellite", "watershed_001", "before"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "satellite", "watershed_001", "after"), exist_ok=True)

# 1. Micro-watershed Polygon (MWS-MH-2025-014)
watershed_geojson = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "watershed_001",
                "name": "MWS-MH-2025-014 (Aurangabad North)",
                "district": "Chhatrapati Sambhajinagar",
                "state": "Maharashtra",
                "project": "IWMP-III 2021-2026",
                "area_ha": 420.5,
                "target_interventions": 12,
                "completed_interventions": 9
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [75.3300, 19.8350],
                    [75.3550, 19.8350],
                    [75.3580, 19.8520],
                    [75.3400, 19.8550],
                    [75.3280, 19.8450],
                    [75.3300, 19.8350]
                ]]
            }
        }
    ]
}

with open(os.path.join(DATA_DIR, "boundaries", "watershed_001.geojson"), "w") as f:
    json.dump(watershed_geojson, f, indent=2)

print("Generated watershed boundary GeoJSON.")

# 2. Interventions GeoJSON
interventions_geojson = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "INT-CD-001",
                "watershed_id": "watershed_001",
                "name": "Masonry Check Dam #001",
                "type": "check_dam",
                "installation_date": "2024-11-15",
                "status": "Completed",
                "cost_inr": 450000,
                "capacity_tcm": 12.5,
                "latitude": 19.8425,
                "longitude": 75.3412
            },
            "geometry": {
                "type": "Point",
                "coordinates": [75.3412, 19.8425]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "INT-FP-002",
                "watershed_id": "watershed_001",
                "name": "Community Farm Pond #002",
                "type": "farm_pond",
                "installation_date": "2024-12-02",
                "status": "Completed",
                "cost_inr": 280000,
                "capacity_tcm": 8.0,
                "latitude": 19.8458,
                "longitude": 75.3478
            },
            "geometry": {
                "type": "Point",
                "coordinates": [75.3478, 19.8458]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "INT-PL-003",
                "watershed_id": "watershed_001",
                "name": "Horticulture Afforestation #003",
                "type": "plantation",
                "installation_date": "2024-07-20",
                "status": "Completed",
                "cost_inr": 180000,
                "capacity_tcm": 0.0,
                "latitude": 19.8390,
                "longitude": 75.3380
            },
            "geometry": {
                "type": "Point",
                "coordinates": [75.3380, 19.8390]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "id": "INT-CB-004",
                "watershed_id": "watershed_001",
                "name": "Continuous Contour Bund #004",
                "type": "contour_bund",
                "installation_date": "2024-09-10",
                "status": "Completed",
                "cost_inr": 150000,
                "capacity_tcm": 0.0,
                "latitude": 19.8480,
                "longitude": 75.3350
            },
            "geometry": {
                "type": "Point",
                "coordinates": [75.3350, 19.8480]
            }
        }
    ]
}

with open(os.path.join(DATA_DIR, "interventions", "interventions.geojson"), "w") as f:
    json.dump(interventions_geojson, f, indent=2)

print("Generated interventions GeoJSON.")

# 3. Helper to create EXIF byte payload for JPEG photos
def create_exif_bytes(lat, lng, date_str):
    def deg_to_dms(deg):
        d = int(deg)
        m = int((deg - d) * 60)
        s = int(((deg - d) * 60 - m) * 3600 * 100)
        return ((d, 1), (m, 1), (s, 100))

    lat_dms = deg_to_dms(abs(lat))
    lng_dms = deg_to_dms(abs(lng))
    
    gps_dict = {
        piexif.GPSIFD.GPSLatitudeRef: 'N' if lat >= 0 else 'S',
        piexif.GPSIFD.GPSLatitude: lat_dms,
        piexif.GPSIFD.GPSLongitudeRef: 'E' if lng >= 0 else 'W',
        piexif.GPSIFD.GPSLongitude: lng_dms,
    }
    
    exif_dict = {
        "0th": {
            piexif.ImageIFD.Make: "DRISHTI Mobile App v3.2",
            piexif.ImageIFD.Model: "Field Camera - IWMP DoLR",
            piexif.ImageIFD.DateTime: date_str,
        },
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: date_str,
            piexif.ExifIFD.DateTimeDigitized: date_str,
        },
        "GPS": gps_dict
    }
    return piexif.dump(exif_dict)

# 4. Generate Sample Field Photos with EXIF
photos_meta = [
    {
        "id": "IMG_20250710_001",
        "intervention_id": "INT-CD-001",
        "type": "check_dam",
        "lat": 19.8425,
        "lng": 75.3412,
        "date": "2025:07:10 10:15:30",
        "date_iso": "2025-07-10T10:15:30",
        "title": "Masonry Check Dam #001 - Water Retention Evidence",
        "color": (41, 128, 185)
    },
    {
        "id": "IMG_20250712_002",
        "intervention_id": "INT-FP-002",
        "type": "farm_pond",
        "lat": 19.8458,
        "lng": 75.3478,
        "date": "2025:07:12 11:40:12",
        "date_iso": "2025-07-12T11:40:12",
        "title": "Community Farm Pond #002 - Full Storage View",
        "color": (22, 160, 133)
    },
    {
        "id": "IMG_20250715_003",
        "intervention_id": "INT-PL-003",
        "type": "plantation",
        "lat": 19.8390,
        "lng": 75.3380,
        "date": "2025:07:15 14:05:00",
        "date_iso": "2025-07-15T14:05:00",
        "title": "Horticulture Plantation #003 - Canopy Growth",
        "color": (39, 174, 96)
    },
    {
        "id": "IMG_20250718_004",
        "intervention_id": "INT-CB-004",
        "type": "contour_bund",
        "lat": 19.8480,
        "lng": 75.3350,
        "date": "2025:07:18 09:25:45",
        "date_iso": "2025-07-18T09:25:45",
        "title": "Contour Bund #004 - Soil Erosion Control",
        "color": (211, 84, 0)
    }
]

csv_rows = []

for item in photos_meta:
    # Create image canvas
    img = Image.new('RGB', (800, 600), color=(240, 243, 244))
    draw = ImageDraw.Draw(img)
    
    # Draw header banner
    draw.rectangle([(0, 0), (800, 80)], fill=item['color'])
    draw.text((20, 25), f"DRISHTI Geo-Coded Field Photo: {item['type'].upper()}", fill=(255, 255, 255))
    
    # Draw central photo simulation graphics
    draw.rectangle([(50, 120), (750, 480)], fill=(200, 214, 229), outline=item['color'], width=4)
    
    # Draw watermark / details text
    draw.text((70, 140), f"ID: {item['id']}", fill=(44, 62, 80))
    draw.text((70, 170), f"Intervention: {item['title']}", fill=(44, 62, 80))
    draw.text((70, 200), f"GPS Latitude: {item['lat']} N", fill=(44, 62, 80))
    draw.text((70, 230), f"GPS Longitude: {item['lng']} E", fill=(44, 62, 80))
    draw.text((70, 260), f"Timestamp: {item['date_iso']}", fill=(44, 62, 80))
    draw.text((70, 290), f"App: DRISHTI DoLR Geo-Tagging Module", fill=(44, 62, 80))

    # Decorative structure icon box
    draw.rectangle([(70, 330), (730, 450)], fill=item['color'])
    draw.text((90, 370), f"FIELD STRUCTURE EVIDENCE PHOTO", fill=(255, 255, 255))
    draw.text((90, 400), f"Verified Geo-Location & Stamp: OK", fill=(255, 255, 255))

    # Save with EXIF metadata
    exif_bytes = create_exif_bytes(item['lat'], item['lng'], item['date'])
    file_path = os.path.join(DATA_DIR, "photos", f"{item['id']}.jpg")
    img.save(file_path, "jpeg", exif=exif_bytes)

    csv_rows.append({
        "photo_id": item['id'],
        "intervention_id": item['intervention_id'],
        "latitude": item['lat'],
        "longitude": item['lng'],
        "timestamp": item['date_iso'],
        "type": item['type'],
        "file_name": f"{item['id']}.jpg"
    })

# Write photos.csv
with open(os.path.join(DATA_DIR, "metadata", "photos.csv"), "w", newline='') as f:
    writer = csv.DictWriter(f, fieldnames=["photo_id", "intervention_id", "latitude", "longitude", "timestamp", "type", "file_name"])
    writer.writeheader()
    writer.writerows(csv_rows)

print("Generated sample photos with EXIF and photos.csv metadata.")

# 5. Generate Raster Observations (T0: Before, T1: After)
# Grid: 200x200 pixels over boundary bbox [75.328, 19.835, 75.358, 19.855]
width, height = 250, 250
x_coords = np.linspace(75.328, 75.358, width)
y_coords = np.linspace(19.855, 19.835, height)
xx, yy = np.meshgrid(x_coords, y_coords)

# Distance formulas to intervention points for realistic signal generation
# Check Dam 001 (75.3412, 19.8425) - water & vegetation boost in T1
d_cd1 = np.sqrt((xx - 75.3412)**2 + (yy - 19.8425)**2)
# Farm Pond 002 (75.3478, 19.8458) - water boost in T1
d_fp2 = np.sqrt((xx - 75.3478)**2 + (yy - 19.8458)**2)
# Plantation 003 (75.3380, 19.8390) - vegetation boost in T1
d_pl3 = np.sqrt((xx - 75.3380)**2 + (yy - 19.8390)**2)

# --- T0 Rasters (June 2024 - Pre-intervention dry season) ---
# Base NDVI (0.15 - 0.35)
ndvi_t0 = 0.20 + 0.10 * np.sin(xx * 200) * np.cos(yy * 200) + np.random.normal(0, 0.02, (height, width))
ndvi_t0 = np.clip(ndvi_t0, 0.05, 0.40)

# Base NDWI (-0.30 - -0.10)
ndwi_t0 = -0.25 + 0.05 * np.cos(xx * 150) + np.random.normal(0, 0.02, (height, width))
# Small natural stream water in T0
ndwi_t0[d_cd1 < 0.0015] = 0.15
ndwi_t0 = np.clip(ndwi_t0, -0.6, 0.35)

# --- T1 Rasters (July 2025 - Post-intervention monsoon response) ---
ndvi_t1 = ndvi_t0.copy() + 0.08  # General baseline growth (+0.08)
# Extra vegetation surge near Plantation 003 & Check Dam 001
ndvi_t1 += 0.25 * np.exp(- (d_pl3 / 0.0035)**2)
ndvi_t1 += 0.18 * np.exp(- (d_cd1 / 0.0040)**2)
ndvi_t1 = np.clip(ndvi_t1, 0.05, 0.85)

ndwi_t1 = ndwi_t0.copy()
# Significant surface water expansion around Check Dam 001 and Farm Pond 002
ndwi_t1 += 0.55 * np.exp(- (d_cd1 / 0.0025)**2)
ndwi_t1 += 0.60 * np.exp(- (d_fp2 / 0.0020)**2)
ndwi_t1 = np.clip(ndwi_t1, -0.6, 0.75)

# Save numpy array rasters as JSON/NPZ for fast lightweight loading
np.savez_compressed(
    os.path.join(DATA_DIR, "satellite", "watershed_001", "before", "rasters_t0.npz"),
    ndvi=ndvi_t0,
    ndwi=ndwi_t0,
    bounds=[75.328, 19.835, 75.358, 19.855]
)

np.savez_compressed(
    os.path.join(DATA_DIR, "satellite", "watershed_001", "after", "rasters_t1.npz"),
    ndvi=ndvi_t1,
    ndwi=ndwi_t1,
    bounds=[75.328, 19.835, 75.358, 19.855]
)

# Also create visual PNG maps for raster preview overlays
def save_raster_png(data, filepath, cmap_type='ndvi'):
    from matplotlib import cm
    if cmap_type == 'ndvi':
        norm_data = (data - 0.0) / (0.8 - 0.0)
        norm_data = np.clip(norm_data, 0, 1)
        colors = cm.YlGn(norm_data)
    elif cmap_type == 'ndwi':
        norm_data = (data - (-0.4)) / (0.6 - (-0.4))
        norm_data = np.clip(norm_data, 0, 1)
        colors = cm.Blues(norm_data)
    else: # delta
        norm_data = (data - (-0.2)) / (0.4 - (-0.2))
        norm_data = np.clip(norm_data, 0, 1)
        colors = cm.RdYlGn(norm_data)
        
    img_arr = (colors[:, :, :3] * 255).astype(np.uint8)
    Image.fromarray(img_arr).save(filepath)

save_raster_png(ndvi_t0, os.path.join(DATA_DIR, "satellite", "watershed_001", "before", "ndvi.png"), 'ndvi')
save_raster_png(ndwi_t0, os.path.join(DATA_DIR, "satellite", "watershed_001", "before", "ndwi.png"), 'ndwi')

save_raster_png(ndvi_t1, os.path.join(DATA_DIR, "satellite", "watershed_001", "after", "ndvi.png"), 'ndvi')
save_raster_png(ndwi_t1, os.path.join(DATA_DIR, "satellite", "watershed_001", "after", "ndwi.png"), 'ndwi')

# Save Change Delta PNG
ndvi_delta = ndvi_t1 - ndvi_t0
ndwi_delta = ndwi_t1 - ndwi_t0

save_raster_png(ndvi_delta, os.path.join(DATA_DIR, "satellite", "watershed_001", "after", "ndvi_delta.png"), 'delta')
save_raster_png(ndwi_delta, os.path.join(DATA_DIR, "satellite", "watershed_001", "after", "ndwi_delta.png"), 'delta')

print("Generated satellite rasters (T0 before & T1 after) with compressed arrays & PNG preview maps.")
print("Sample dataset generation completed successfully!")

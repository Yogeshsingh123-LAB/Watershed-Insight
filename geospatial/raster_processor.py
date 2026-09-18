import os
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

class RasterProcessor:
    def __init__(self, watershed_id="watershed_001"):
        self.watershed_id = watershed_id
        self.t0_path = os.path.join(DATA_DIR, "satellite", watershed_id, "before", "rasters_t0.npz")
        self.t1_path = os.path.join(DATA_DIR, "satellite", watershed_id, "after", "rasters_t1.npz")
        
        # Load rasters
        t0_data = np.load(self.t0_path)
        t1_data = np.load(self.t1_path)
        
        self.ndvi_t0 = t0_data['ndvi']
        self.ndwi_t0 = t0_data['ndwi']
        self.ndvi_t1 = t1_data['ndvi']
        self.ndwi_t1 = t1_data['ndwi']
        self.bounds = t0_data['bounds'] # [min_lng, min_lat, max_lng, max_lat]
        
        self.height, self.width = self.ndvi_t0.shape
        # Compute pixel physical size in hectares roughly for demo region
        # Bounding box: 0.03 deg lon (~3.0 km), 0.02 deg lat (~2.2 km) => ~660 Ha total raster
        self.pixel_area_ha = (660.0) / (self.width * self.height)

    def get_watershed_overview_stats(self):
        # Calculate water extent (> 0.1 NDWI threshold)
        water_mask_t0 = self.ndwi_t0 > 0.10
        water_mask_t1 = self.ndwi_t1 > 0.10
        
        water_area_t0_ha = float(np.sum(water_mask_t0) * self.pixel_area_ha)
        water_area_t1_ha = float(np.sum(water_mask_t1) * self.pixel_area_ha)
        
        # Calculate vegetation extent (> 0.35 NDVI threshold)
        veg_mask_t0 = self.ndvi_t0 > 0.35
        veg_mask_t1 = self.ndvi_t1 > 0.35
        
        veg_area_t0_ha = float(np.sum(veg_mask_t0) * self.pixel_area_ha)
        veg_area_t1_ha = float(np.sum(veg_mask_t1) * self.pixel_area_ha)
        
        return {
            "watershed_id": self.watershed_id,
            "ndvi_mean_t0": round(float(np.mean(self.ndvi_t0)), 3),
            "ndvi_mean_t1": round(float(np.mean(self.ndvi_t1)), 3),
            "ndvi_change": round(float(np.mean(self.ndvi_t1) - np.mean(self.ndvi_t0)), 3),
            "water_area_t0_ha": round(water_area_t0_ha, 2),
            "water_area_t1_ha": round(water_area_t1_ha, 2),
            "water_area_change_ha": round(water_area_t1_ha - water_area_t0_ha, 2),
            "veg_area_t0_ha": round(veg_area_t0_ha, 2),
            "veg_area_t1_ha": round(veg_area_t1_ha, 2),
            "veg_area_change_ha": round(veg_area_t1_ha - veg_area_t0_ha, 2)
        }

    def analyze_intervention_buffer(self, lat, lng, buffer_radius_m=250):
        # Convert lat/lng to raster pixel coordinates
        min_lng, min_lat, max_lng, max_lat = self.bounds
        
        px = int((lng - min_lng) / (max_lng - min_lng) * self.width)
        py = int((max_lat - lat) / (max_lat - min_lat) * self.height)
        
        # Convert buffer radius from meters to approx degree pixels (~111km per deg lat)
        radius_deg = (buffer_radius_m / 1000.0) / 111.0
        radius_px = int(radius_deg / ((max_lat - min_lat) / self.height))
        radius_px = max(5, radius_px)
        
        # Meshgrid mask within radius_px
        y_indices, x_indices = np.ogrid[:self.height, :self.width]
        dist_from_center = np.sqrt((x_indices - px)**2 + (y_indices - py)**2)
        buffer_mask = dist_from_center <= radius_px
        
        if not np.any(buffer_mask):
            buffer_mask[max(0, py), max(0, px)] = True
            
        ndvi_sub_t0 = self.ndvi_t0[buffer_mask]
        ndvi_sub_t1 = self.ndvi_t1[buffer_mask]
        ndwi_sub_t0 = self.ndwi_t0[buffer_mask]
        ndwi_sub_t1 = self.ndwi_t1[buffer_mask]
        
        water_t0 = float(np.sum(ndwi_sub_t0 > 0.10) * self.pixel_area_ha)
        water_t1 = float(np.sum(ndwi_sub_t1 > 0.10) * self.pixel_area_ha)
        
        ndvi_before = round(float(np.mean(ndvi_sub_t0)), 3)
        ndvi_after = round(float(np.mean(ndvi_sub_t1)), 3)
        ndvi_delta = round(ndvi_after - ndvi_before, 3)
        
        water_before = round(water_t0, 2)
        water_after = round(water_t1, 2)
        water_delta = round(water_after - water_before, 2)
        
        # Qualitative assessment synthesis
        if ndvi_delta > 0.10 and water_delta > 0.2:
            interpretation = "High Positive Response: Significant vegetation vigor enhancement (+{:.0f}%) and surface water retention expansion (+{:.2f} Ha) observed within the {}m buffer zone.".format(
                (ndvi_delta / max(0.01, ndvi_before)) * 100, water_delta, buffer_radius_m
            )
            confidence = "High"
        elif ndvi_delta > 0.05 or water_delta > 0.1:
            interpretation = "Moderate Positive Response: Measurable improvement in localized vegetation indices and surface water storage."
            confidence = "Moderate"
        else:
            interpretation = "Stable Indicator: Minor spectral variation detected within buffer zone. Requires secondary seasonal validation."
            confidence = "Medium"
            
        return {
            "buffer_radius_m": buffer_radius_m,
            "center_coords": [lat, lng],
            "pixel_count": int(np.sum(buffer_mask)),
            "ndvi_before": ndvi_before,
            "ndvi_after": ndvi_after,
            "ndvi_change": ndvi_delta,
            "water_area_before_ha": water_before,
            "water_area_after_ha": water_after,
            "water_area_change_ha": water_delta,
            "interpretation": interpretation,
            "confidence": confidence
        }

# Data Sources & SRISHTI / DRISHTI Data Contracts

**Watershed Insight · SIH PS26015**

---

## Data Source Connectors

### 1. SRISHTI Stack (Vector & Spatial Layers)
- **Role**: System of record for micro-watershed boundaries, cadastral plots, stream networks, and IWMP structure inventories.
- **On-Disk Contract**:
  - `boundaries/<id>.geojson`: Polygon / MultiPolygon geometry in WGS-84 (EPSG:4326).
  - `metadata/interventions.csv`: Structure ID, name, type, lat, lon, cost_inr, capacity_tcm, status, installation_date.
- **Status Indicator**: `CONNECTED` (Live API) or `DEMO_DATA` (Bundled surrogate dataset).

### 2. DRISHTI Stack (Geo-Tagged Field Photographs)
- **Role**: Mobile field photo capture system recording GPS location, timestamp, and site photographs.
- **On-Disk Contract**:
  - `photos/*.jpg`: JPEG image with valid EXIF metadata (`GPSLatitude`, `GPSLongitude`, `DateTimeOriginal`).
  - `metadata/photos.csv`: `filename, intervention_id, captured_on, latitude, longitude`.
- **Status Indicator**: `CONNECTED` or `DEMO_DATA`.

### 3. Sentinel-2 MSI Satellite Imagery
- **Role**: Pre/Post-monsoon multi-spectral surface reflectance bands (VNIR/SWIR) at 10m–20m resolution.
- **On-Disk Contract**:
  - `satellite/<id>/<epoch_key>/bands.npz`: Compressed NumPy archive containing `red`, `green`, `nir`, `swir` float32 arrays (0.0 to 1.0) and `bounds` `[minx, miny, maxx, maxy]`.

### 4. Terrain DEM
- **Role**: Elevation raster for D8 flow routing, slope calculation, and upstream catchment delineation.
- **On-Disk Contract**:
  - `dem/<id>_dem.npz`: Compressed NumPy archive with `dem` float32 elevation matrix in metres and georeferenced `bounds`.

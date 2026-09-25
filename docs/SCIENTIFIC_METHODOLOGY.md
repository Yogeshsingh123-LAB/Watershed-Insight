# Scientific Methodology & Scoring Formulas

**Watershed Insight · SIH PS26015**

---

## 1. Physical Calculations

### Spherical Pixel Area
Latitude-aware pixel area is calculated using physical geodesy:
$$\text{Pixel Area } (m^2) = (R_{earth} \cdot \Delta\phi) \cdot (R_{earth} \cdot \cos(\phi) \cdot \Delta\lambda)$$
This ensures accurate hectare conversion across all latitudes without distortion.

### Spectral Indices
- **NDVI** (Normalized Difference Vegetation Index): $(\text{NIR} - \text{RED}) / (\text{NIR} + \text{RED})$
- **NDWI** (McFeeters Water Index): $(\text{GREEN} - \text{NIR}) / (\text{GREEN} + \text{NIR})$
- **NDBI** (Built-up Index): $(\text{SWIR} - \text{NIR}) / (\text{SWIR} + \text{NIR})$
- **SAVI** (Soil Adjusted Vegetation Index): $((1 + L) \cdot (\text{NIR} - \text{RED})) / (\text{NIR} + \text{RED} + L)$ where $L = 0.5$

---

## 2. Inundation-Aware Land-Only NDVI

A check dam or percolation tank impounding water increases surface water extent inside its 250m buffer. Because water has negative NDVI ($\sim -0.2$), raw buffer-mean NDVI would artificially decrease even when vegetation flourishes along the banks.

**Solution**:
The platform isolates the **land-only mask**:
$$\text{Land Mask} = \text{Buffer Mask} \cap \{p \mid \text{NDWI}_{T0}(p) \le 0.10 \land \text{NDWI}_{T1}(p) \le 0.10\}$$
Land-only NDVI change ($\Delta\text{NDVI}_{\text{land}}$) evaluates only terrestrial pixels, preventing false penalties for successful water storage.

---

## 3. Impact Score (40 / 40 / 20 Decomposition)

$$\text{Impact Score} = \text{Vegetation Score (0--40)} + \text{Water Score (0--40)} + \text{Extent Score (0--20)}$$

1. **Vegetation Response (0–40 points)**:
   Scaled monotonically based on $\Delta\text{NDVI}_{\text{land}}$ inside the buffer relative to baseline.
2. **Water Response (0–40 points)**:
   Scaled based on net surface water gain (ha) and newly impounded area.
3. **Spatial Extent (0–20 points)**:
   Proportion of buffer pixels exhibiting statistically significant improvement ($\Delta\text{NDVI} > +0.10$).

---

## 4. Background Control Difference-in-Differences

To eliminate regional monsoon greening bias:
1. 200 random control points are sampled inside the watershed boundary.
2. The identical 250m buffer scoring chain is executed at each control point.
3. **Net Difference** is calculated:
   $$\text{Net } \Delta\text{NDVI} = \Delta\text{NDVI}_{\text{buffer(land)}} - \Delta\text{NDVI}_{\text{watershed(background)}}$$
4. Structure performance is reported as a percentile rank against the background distribution ($p_{95}, p_{97}$, etc.).

# Hackathon Demonstration Script (2–3 Minutes)

**Watershed Insight · Smart India Hackathon 2026 (PS26015)**

---

## Step-by-Step Demonstration Flow

### 0:00 – 0:30 | Introduction & Data Sources
1. Open the **Dashboard** at `http://localhost:3000`.
2. Point out the top header: **DEMO DATA (Offline Verified)** indicator, **DoLR / SRISHTI-DRISHTI** identity badge, and **User Role Selector** (`DISTRICT OFFICER`).
3. Click on the **Data Sources** tab to display the integration architecture:
   - **SRISHTI Stack**: Watershed boundaries & 16 intervention structures.
   - **DRISHTI Stack**: 37 geo-tagged field photographs with EXIF GPS tags.
   - **Sentinel-2 MSI**: 6 cloud-masked multi-epoch acquisitions.
   - **Terrain DEM**: 30m hydrological elevation model.

### 0:30 – 1:00 | Decision Center & Action Queue
1. Switch to the **Decision Center** tab.
2. Review the Watershed Health Summary:
   - Total Structures Assessed (16)
   - High Impact (6), Moderate Impact (5), Field Inspection Required (5)
   - Average Impact Score (54.2 / 100)
3. Show the **Officer Action Queue**:
   - High priority inspection task: *Check Dam #001* (impact score below 45 threshold).
4. Click **Ask Watershed Insight** to open the AI explanation drawer:
   - Ask: *"Which interventions require field inspection?"*
   - Show evidence-bounded response with explicit source citations.

### 1:00 – 1:30 | Before / After Analysis & Geo-Coded Evidence
1. Navigate to the **Before / After** tab.
2. Select structure **`INT-PT-003` (Percolation Tank #003)**.
3. Contrast baseline pre-monsoon vs recent post-monsoon:
   - BEFORE: Mean NDVI `0.231`, Water `0.00 ha`
   - AFTER: Mean NDVI `0.298`, Water `9.52 ha`
   - NET CHANGE: Land-only ΔNDVI `+0.072`, Water gain `+9.52 ha`
4. Show synchronized map overlays and linked DRISHTI field photos with EXIF GPS stamps.

### 1:30 – 2:00 | Evidence Health & Impact 40/40/20 Breakdown
1. Switch to **Evidence Health** tab:
   - Show Health Score `100 / 100` (`EXCELLENT`)
   - 6-factor verification checklist: GPS verified, Timestamp verified, Inside buffer, Baseline available, Season matched, Cloud-free.
2. Click structure details to view:
   - **Impact Score**: `65 / 100` (Vegetation `28.8/40`, Water `25.2/40`, Extent `15.7/20`).
   - **Difference-in-Differences**: Net of background `+0.025` (p97 vs 200 control points).

### 2:00 – 2:30 | Field Inspection & PDF Evidence Report
1. Open the **Field Inspection** tab:
   - Show dispatched field tasks and click **Submit Evidence**.
2. Open **Reports** tab or click **Watershed PDF**:
   - Generate and view the **10-Page Audit-Ready Evidence Report**.
3. Open **Audit Trail** tab:
   - Point out recorded audit log entries with user role, timestamp, action type, and target entity.

---

## Key Talking Points for Judges
- *"Every number in our PDF report can be independently verified and re-derived from printed constants."*
- *"We separate physical change (Impact) from evidence quality (Confidence) so low-data areas are never confused with failed structures."*
- *"We compare every intervention against 200 random control points in the same watershed to eliminate regional monsoon greening bias."*

# Security, RBAC & Data Protection

**Watershed Insight · SIH PS26015**

---

## 1. Role-Based Access Control (RBAC)

The platform enforces 5 administrative user roles:

| Role | Permissions |
| :--- | :--- |
| `ADMIN` | Manage users, configure data sources, edit system calibration, inspect full audit trail. |
| `DISTRICT_OFFICER` | View district dashboards, compare micro-watersheds, review decision queues, issue field inspection tasks, generate PDF reports. |
| `WATERSHED_OFFICER` | Analyze micro-watershed indicators, review structure ranking, update intervention lifecycle status. |
| `FIELD_OFFICER` | View assigned inspection tasks, upload geo-tagged field photographs, submit field observations. |
| `ANALYST` | Run change detection, execute sensitivity models, view spatial overlays and morphometry. |

---

## 2. File Upload & EXIF Security

- **Path Traversal Protection**: Uploaded file basenames are sanitized using `os.path.basename` and stripped of illegal characters.
- **MIME & Header Verification**: File headers are validated using Pillow (`Image.open`) to ensure uploaded files are genuine JPEGs and not executable code.
- **EXIF Parsing Safety**: EXIF data is extracted using guarded rational division to protect against memory corruption or zero-division exceptions.
- **Persistence Control**: Upload persistence is gated by `WS_PERSIST_UPLOADS=true` so automated testing never corrupts dataset metadata.

---

## 3. Audit Trail Logging

All state modifications (photo uploads, status changes, inspection task creation, report generation) emit immutable audit log entries:
```json
{
  "id": "AUD-A1B2C3D4",
  "timestamp": "2026-09-23T12:00:00Z",
  "user_id": "district_officer_01",
  "role": "DISTRICT_OFFICER",
  "action": "CREATE_FIELD_INSPECTION",
  "entity": "FieldInspection",
  "entity_id": "INSP-001"
}
```
Log records are stored in `data/sample/metadata/audit_log.json` and served via `/api/v1/audit`.

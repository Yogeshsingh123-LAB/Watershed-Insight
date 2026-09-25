"""
seed_db.py
==========
CLI utility to seed PostgreSQL / SQLite database from the file-based catalog & JSON metadata.

Usage:
  python scripts/seed_db.py
  python scripts/seed_db.py --db-url "postgresql://user:password@localhost:5432/watershed_insight"
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.config import settings
from backend.app.database import create_db_engine, init_db, SessionLocal
from backend.app.models_db import (
    UserDB,
    WatershedDB,
    InterventionDB,
    FieldInspectionDB,
    AuditLogDB,
    PhotoDB,
)


def seed_database(engine_target=None):
    eng = engine_target or create_db_engine()
    print(f"[INFO] Initializing tables on database target: {eng.url}...")
    init_db(eng)

    session = SessionLocal(bind=eng)
    data_dir = settings.data_dir

    try:
        # 1. Seed Watersheds
        catalog_path = os.path.join(data_dir, "catalog", "watersheds.json")
        if os.path.exists(catalog_path):
            with open(catalog_path, "r", encoding="utf-8") as f:
                cat_data = json.load(f)
            ws_map = cat_data.get("watersheds", {})
            for ws_id, ws in ws_map.items():
                boundary_path = os.path.join(data_dir, "boundaries", f"{ws_id}.geojson")
                boundary_json = None
                if os.path.exists(boundary_path):
                    with open(boundary_path, "r", encoding="utf-8") as bf:
                        boundary_json = json.load(bf)

                existing = session.query(WatershedDB).filter_by(id=ws_id).first()
                if not existing:
                    session.add(WatershedDB(
                        id=ws_id,
                        code=ws.get("code", ws_id),
                        name=ws.get("name", ws_id),
                        district=ws.get("district", "Ahmednagar"),
                        state=ws.get("state", "Maharashtra"),
                        area_ha=float(ws.get("area_ha", 726.42)),
                        boundary_geojson=boundary_json
                    ))
            session.commit()
            print(f"[SUCCESS] Seeded {len(ws_map)} watersheds.")

        # 2. Seed Interventions
        interventions_path = os.path.join(data_dir, "interventions", "interventions.geojson")
        if os.path.exists(interventions_path):
            with open(interventions_path, "r", encoding="utf-8") as f:
                fc = json.load(f)
            features = fc.get("features", [])
            added_ids = set()
            for feat in features:
                props = feat.get("properties", {})
                raw_id = props.get("id")
                ws_id = props.get("watershed_id", "watershed_001")
                if not raw_id:
                    continue
                # Generate unique ID per watershed if raw_id is repeated across watersheds
                i_id = raw_id if raw_id not in added_ids else f"{ws_id}_{raw_id}"
                added_ids.add(i_id)
                existing = session.query(InterventionDB).filter_by(id=i_id).first()
                if not existing:
                    session.add(InterventionDB(
                        id=i_id,
                        watershed_id=ws_id,
                        name=props.get("name", i_id),
                        type=props.get("type", "check_dam"),
                        status=props.get("status", "operational"),
                        latitude=float(props.get("latitude", 19.123)),
                        longitude=float(props.get("longitude", 74.456)),
                        cost_inr=float(props.get("cost_inr", 450000.0)) if props.get("cost_inr") else None,
                        installation_date=props.get("installation_date"),
                        commissioned_on=props.get("commissioned_on")
                    ))
            session.commit()
            print(f"[SUCCESS] Seeded {len(features)} interventions.")

        # 3. Seed Field Inspections
        inspections_path = os.path.join(data_dir, "metadata", "field_inspections.json")
        if os.path.exists(inspections_path):
            with open(inspections_path, "r", encoding="utf-8") as f:
                inspections = json.load(f)
            for insp in inspections:
                insp_id = insp.get("id")
                if not insp_id:
                    continue
                existing = session.query(FieldInspectionDB).filter_by(inspection_id=insp_id).first()
                if not existing:
                    session.add(FieldInspectionDB(
                        inspection_id=insp_id,
                        watershed_id=insp.get("watershed_id", "watershed_001"),
                        intervention_id=insp.get("intervention_id", "WS001_INT001"),
                        inspector_name=insp.get("inspector_name", "Field Officer"),
                        inspector_role=insp.get("inspector_role", "field_officer"),
                        inspection_date=insp.get("inspection_date", "2026-09-20"),
                        overall_condition=insp.get("overall_condition", "Good"),
                        water_presence_observed=bool(insp.get("water_presence_observed", True)),
                        vegetation_growth_observed=bool(insp.get("vegetation_growth_observed", True)),
                        structural_integrity=insp.get("structural_integrity", "100% Intact"),
                        notes=insp.get("notes", ""),
                        photos_attached=insp.get("photos_attached", []),
                        gps_latitude=float(insp["gps_latitude"]) if insp.get("gps_latitude") else None,
                        gps_longitude=float(insp["gps_longitude"]) if insp.get("gps_longitude") else None,
                        status=insp.get("status", "VERIFIED")
                    ))
            session.commit()
            print(f"[SUCCESS] Seeded {len(inspections)} field inspections.")

        # 4. Seed Audit Logs
        audit_path = os.path.join(data_dir, "metadata", "audit_log.json")
        if os.path.exists(audit_path):
            with open(audit_path, "r", encoding="utf-8") as f:
                logs = json.load(f)
            for item in logs:
                log_id = item.get("id")
                if not log_id:
                    continue
                existing = session.query(AuditLogDB).filter_by(log_id=log_id).first()
                if not existing:
                    session.add(AuditLogDB(
                        log_id=log_id,
                        timestamp=item.get("timestamp", "2026-09-20T00:00:00Z"),
                        user_id=item.get("user_id"),
                        username=item.get("username", "system"),
                        role=item.get("role", "admin"),
                        action=item.get("action", "SYSTEM_STARTUP"),
                        resource_type=item.get("resource_type", "system"),
                        resource_id=item.get("resource_id"),
                        details_json=item.get("details", {}),
                        ip_address=item.get("ip_address", "127.0.0.1")
                    ))
            session.commit()
            print(f"[SUCCESS] Seeded {len(logs)} audit log entries.")

    except Exception as e:
        session.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Seed PostgreSQL or SQLite database.")
    parser.add_argument("--db-url", type=str, help="Database connection URL (PostgreSQL or SQLite)")
    args = parser.parse_args()

    target_engine = create_db_engine(args.db_url) if args.db_url else None
    seed_database(target_engine)


if __name__ == "__main__":
    main()

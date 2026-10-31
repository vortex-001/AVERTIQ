import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import Incident, Report, SilentZoneCell
from app.services.external_evidence import fetch_open_meteo_rainfall

# Monitoring region grid boundaries (Ludhiana & Sutlej River Basin)
GRID_MIN_LAT = 30.82
GRID_MAX_LAT = 31.02
GRID_MIN_LON = 75.75
GRID_MAX_LON = 75.95
CELL_STEP = 0.05  # ~5.5 km grid cell spacing

def generate_default_grid_cells() -> List[Dict[str, Any]]:
    """
    Generates standard geographic bounding cells for the monitoring region.
    """
    cells = []
    lat_steps = int(round((GRID_MAX_LAT - GRID_MIN_LAT) / CELL_STEP))
    lon_steps = int(round((GRID_MAX_LON - GRID_MIN_LON) / CELL_STEP))

    for r in range(lat_steps):
        for c in range(lon_steps):
            min_lat = round(GRID_MIN_LAT + r * CELL_STEP, 4)
            max_lat = round(min_lat + CELL_STEP, 4)
            min_lon = round(GRID_MIN_LON + c * CELL_STEP, 4)
            max_lon = round(min_lon + CELL_STEP, 4)
            center_lat = round((min_lat + max_lat) / 2.0, 4)
            center_lon = round((min_lon + max_lon) / 2.0, 4)
            cell_code = f"ZONE-LUD-{r}-{c}"
            
            cells.append({
                "cell_code": cell_code,
                "min_lat": min_lat,
                "max_lat": max_lat,
                "min_lon": min_lon,
                "max_lon": max_lon,
                "center_lat": center_lat,
                "center_lon": center_lon,
            })
    return cells

def calculate_cell_silent_zone_score(
    hazard_score: float, # 0 to 100
    report_count: int,
    vulnerability_score: float = 25.0, # baseline
    data_coverage_score: float = 80.0, # telemetry confidence
) -> Dict[str, Any]:
    """
    Computes explainable silent-zone score:
    - If hazard_score == 0: Deficit is 0! No hazard, so zero reports is completely normal!
    - If hazard_score > 40 and report_count <= 1: Severe reporting deficit!
    """
    # 1. Reporting deficit
    # Expected reports scale with hazard intensity
    expected_reports = (hazard_score / 20.0)
    deficit = max(0.0, expected_reports - report_count)
    deficit_norm = min(100.0, (deficit / max(1.0, expected_reports)) * 100.0 if hazard_score > 0 else 0.0)

    # 2. Formula:
    # 0.45 * hazard + 0.35 * deficit + 0.15 * vulnerability - 0.05 * (100 - coverage)
    if hazard_score < 15.0:
        silent_zone_risk = 5.0
        risk_category = "low"
        explanation = "Normal low-hazard zone. Absence of citizen reports indicates absence of emergency."
        hazard_summary = "No significant adverse weather or flood alerts detected."
    elif data_coverage_score < 30.0:
        silent_zone_risk = 0.0
        risk_category = "insufficient_evidence"
        explanation = "Insufficient sensor and telemetry data to determine hazard presence."
        hazard_summary = "Telemetry coverage gap."
    else:
        silent_zone_risk = (
            0.45 * hazard_score
            + 0.35 * deficit_norm
            + 0.15 * vulnerability_score
            + 0.05 * (data_coverage_score / 100.0 * 20.0)
        )
        silent_zone_risk = min(100.0, max(0.0, silent_zone_risk))
        
        if silent_zone_risk >= 70.0:
            risk_category = "critical"
            explanation = "CRITICAL SILENT-ZONE: High hazard indicators detected, but citizen reports are completely absent. High likelihood of power/communications blackout or vulnerable trapped population."
            hazard_summary = f"Severe hazard exposure ({hazard_score:.1f}/100) with 0 confirmed reports."
        elif silent_zone_risk >= 50.0:
            risk_category = "high"
            explanation = "HIGH SILENT-ZONE: Moderate-to-high hazard telemetry with an abnormally low reporting density. Physical reconnaissance suggested."
            hazard_summary = f"Elevated hazard ({hazard_score:.1f}/100) with only {report_count} citizen report(s)."
        elif silent_zone_risk >= 30.0:
            risk_category = "moderate"
            explanation = "MODERATE SILENT-ZONE: Mild hazard indicators with limited citizen feedback."
            hazard_summary = f"Mild hazard activity ({hazard_score:.1f}/100)."
        else:
            risk_category = "low"
            explanation = "Reporting density is aligned with current threat levels."
            hazard_summary = "Minor localized observations."

    return {
        "silent_zone_risk": round(silent_zone_risk, 1),
        "risk_category": risk_category,
        "hazard_score": round(hazard_score, 1),
        "reporting_deficit": round(deficit_norm, 1),
        "vulnerability_score": round(vulnerability_score, 1),
        "data_coverage_score": round(data_coverage_score, 1),
        "explanation": explanation,
        "hazard_summary": hazard_summary,
        "recommended_action": "Urgent human reconnaissance & comms verification" if risk_category in ("critical", "high") else "Standard monitoring",
        "uncertainty_score": 0.25 if data_coverage_score > 70 else 0.65,
    }

async def evaluate_all_silent_zones(db: Session) -> List[SilentZoneCell]:
    """
    Evaluates or seeds grid cells and refreshes their hazard/deficit metrics.
    """
    cells = db.query(SilentZoneCell).all()
    if not cells:
        # Seed grid cells
        grid_defs = generate_default_grid_cells()
        for g in grid_defs:
            cell = SilentZoneCell(
                cell_code=g["cell_code"],
                min_lat=g["min_lat"],
                max_lat=g["max_lat"],
                min_lon=g["min_lon"],
                max_lon=g["max_lon"],
                center_lat=g["center_lat"],
                center_lon=g["center_lon"],
                hazard_score=0.0,
                report_count=0,
                reporting_deficit=0.0,
                silent_zone_risk=5.0,
                risk_category="low",
                explanation="Initial baseline cell monitoring",
                recommended_action="Standard monitoring"
            )
            db.add(cell)
        db.commit()
        cells = db.query(SilentZoneCell).all()

    # Tally reports and calculate metrics per cell
    reports = db.query(Report).filter(Report.latitude.isnot(None), Report.longitude.isnot(None)).all()

    for cell in cells:
        count = sum(
            1 for r in reports 
            if cell.min_lat <= r.latitude <= cell.max_lat and cell.min_lon <= r.longitude <= cell.max_lon
        )
        cell.report_count = count
        cell.reporting_density = round(count / 25.0, 3) # per 25 sq km approx
        
        # Calculate score using cell's existing hazard score
        scored = calculate_cell_silent_zone_score(
            hazard_score=cell.hazard_score,
            report_count=count,
            vulnerability_score=cell.vulnerability_score,
            data_coverage_score=cell.data_coverage_score
        )
        cell.silent_zone_risk = scored["silent_zone_risk"]
        cell.risk_category = scored["risk_category"]
        cell.reporting_deficit = scored["reporting_deficit"]
        cell.explanation = scored["explanation"]
        cell.hazard_summary = scored["hazard_summary"]
        cell.recommended_action = scored["recommended_action"]
        cell.uncertainty_score = scored["uncertainty_score"]
        cell.last_evaluated_at = datetime.now(timezone.utc)

    db.commit()
    return cells

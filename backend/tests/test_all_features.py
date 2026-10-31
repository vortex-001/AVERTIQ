import pytest
from app.services.deduplication import evaluate_duplicate_match, generate_multilingual_embedding
from app.services.priority_engine import calculate_priority_score
from app.services.silent_zone_engine import calculate_cell_silent_zone_score
from app.services.geocoding import resolve_location_from_text, haversine_distance_km
from app.services.telegram_service import parse_telegram_update
from app.services.external_evidence import evaluate_evidence_staleness
from datetime import datetime, timezone, timedelta

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_web_report_submission(client):
    payload = {
        "original_text": "Water levels rising rapidly near Sutlej Bridge, families stranded.",
        "source_channel": "web",
        "latitude": 30.9580,
        "longitude": 75.8320,
        "location_description": "Sutlej Bridge",
        "affected_people_count": 8,
        "vulnerable_groups": "children"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["original_text"] == payload["original_text"]
    assert data["latitude"] == 30.9580
    assert data["incident_id"] is not None

def test_missing_location_stays_unconfirmed(client):
    """
    Critical requirement: If location is unknown, system MUST NOT fabricate
    coordinates or assign default map center!
    """
    payload = {
        "original_text": "Madad chahiye paani ghar me ghus gaya hai",
        "source_channel": "web"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["latitude"] is None
    assert data["longitude"] is None
    assert data["location_source"] == "unconfirmed"

def test_landmark_geocoding_resolution():
    res = resolve_location_from_text("Flood aa gaya hai, pul ke paas paani badh raha hai")
    assert res is not None
    lat, lon, accuracy, name, source = res
    assert lat == 30.9580
    assert lon == 75.8320
    assert "Bridge" in name or "pul" in name.lower()

def test_cross_lingual_semantic_deduplication():
    """
    Tests semantic similarity between Hindi/Hinglish, Punjabi, and English reports
    regarding the same event.
    """
    text_en = "Flood near the bridge, water rising."
    text_pa = "Pul de kol paani chadh reha hai."
    
    now = datetime.now(timezone.utc)
    match = evaluate_duplicate_match(
        report_text=text_pa,
        report_type="flood",
        report_lat=30.9580,
        report_lon=75.8320,
        report_time=now,
        existing_incident_title=text_en,
        existing_incident_type="flood",
        existing_lat=30.9581,
        existing_lon=75.8319,
        existing_time=now
    )
    assert match["is_duplicate"] is True
    assert match["composite_score"] >= 0.65
    assert match["semantic_similarity"] > 0.40

def test_separate_unrelated_incidents_do_not_merge():
    """
    A fire on Gill Road must NOT merge with a flood at Sutlej Bridge.
    """
    now = datetime.now(timezone.utc)
    match = evaluate_duplicate_match(
        report_text="Warehouse fire on Gill Road, thick chemical smoke.",
        report_type="fire",
        report_lat=30.8750,
        report_lon=75.8600,
        report_time=now,
        existing_incident_title="Severe Inundation near Sutlej Bridge",
        existing_incident_type="flood",
        existing_lat=30.9580,
        existing_lon=75.8320,
        existing_time=now
    )
    assert match["is_duplicate"] is False
    assert match["type_match"] is False

def test_priority_engine_scoring():
    # High threat with trapped people and children
    score_res = calculate_priority_score(
        incident_type="flood",
        threat_severity_str="high",
        affected_people_count=20,
        vulnerable_groups="children, elderly",
        report_count=3,
        corroborating_evidence_count=1,
        is_location_confirmed=True,
        has_coordinates=True
    )
    assert score_res["priority_score"] >= 70.0
    assert score_res["priority_level"] == "high"
    assert "trapped" in score_res["priority_explanation"].lower() or "threat" in score_res["priority_explanation"].lower()

def test_silent_zone_scoring_logic():
    # 1. High hazard (85) + 0 reports -> Critical silent zone
    critical_cell = calculate_cell_silent_zone_score(
        hazard_score=85.0,
        report_count=0
    )
    assert critical_cell["risk_category"] == "critical"
    assert critical_cell["silent_zone_risk"] >= 70.0

    # 2. Zero hazard (0) + 0 reports -> Low risk (absence of reports is normal!)
    normal_cell = calculate_cell_silent_zone_score(
        hazard_score=0.0,
        report_count=0
    )
    assert normal_cell["risk_category"] == "low"
    assert normal_cell["silent_zone_risk"] <= 15.0

def test_telegram_update_parser():
    update = {
        "update_id": 12345,
        "message": {
            "message_id": 99,
            "from": {"id": 88812, "first_name": "Rajinder"},
            "chat": {"id": 88812},
            "text": "Water rising near bridge",
            "location": {"latitude": 30.9580, "longitude": 75.8320}
        }
    }
    parsed = parse_telegram_update(update)
    assert parsed is not None
    assert parsed["telegram_user_id"] == "88812"
    assert parsed["telegram_message_id"] == "99"
    assert parsed["latitude"] == 30.9580
    assert parsed["location_source"] == "explicit_reporter"

def test_human_review_workflow(client):
    # Fetch an existing incident
    incidents = client.get("/api/v1/incidents").json()
    assert len(incidents) > 0
    target_inc = incidents[0]

    # Coordinator approves incident
    review_payload = {
        "action": "approve",
        "note": "Verified by coordinator via district emergency ops center."
    }
    res = client.post(f"/api/v1/incidents/{target_inc['id']}/review", json=review_payload)
    assert res.status_code == 200
    updated = res.json()
    assert updated["verification_status"] == "human_verified"

    # Verify audit log recorded
    history = client.get("/api/v1/dashboard/review-history").json()
    assert len(history) > 0
    assert any(h["entity_id"] == target_inc["id"] for h in history)

def test_stale_evidence_handling():
    now = datetime.now(timezone.utc)
    # 1 hour ago is not stale
    fresh = now - timedelta(hours=1)
    assert evaluate_evidence_staleness(fresh, max_age_hours=6.0) is False

    # 12 hours ago is stale
    stale = now - timedelta(hours=12)
    assert evaluate_evidence_staleness(stale, max_age_hours=6.0) is True

def test_silent_zone_insufficient_evidence():
    # If sensor coverage is below 30%, must report insufficient_evidence
    res = calculate_cell_silent_zone_score(
        hazard_score=50.0,
        report_count=0,
        data_coverage_score=20.0
    )
    assert res["risk_category"] == "insufficient_evidence"

def test_duplicate_webhook_delivery_idempotency(client):
    payload = {
        "update_id": 998811,
        "message": {
            "message_id": 444,
            "from": {"id": 112233, "first_name": "TestReporter"},
            "chat": {"id": 112233},
            "text": "Flood near Sutlej bridge",
            "location": {"latitude": 30.9580, "longitude": 75.8320}
        }
    }
    # First delivery
    res1 = client.post("/api/v1/webhooks/telegram", json=payload)
    assert res1.status_code == 200
    rep_id_1 = res1.json()["report_id"]

    # Retry delivery (same update/message_id)
    res2 = client.post("/api/v1/webhooks/telegram", json=payload)
    assert res2.status_code == 200
    rep_id_2 = res2.json()["report_id"]

    # Must return exact same report ID without duplicating in database
    assert rep_id_1 == rep_id_2

def test_unmerge_report_workflow(client):
    # Find incident with multiple reports
    incidents = client.get("/api/v1/incidents").json()
    cluster = next((i for i in incidents if i["report_count"] > 1), None)
    if cluster:
        detail = client.get(f"/api/v1/incidents/{cluster['id']}").json()
        reports = detail.get("reports", [])
        if len(reports) > 1:
            target_report = reports[0]
            unmerge_payload = {
                "report_id": target_report["id"],
                "reason": "Coordinator requested separate investigation"
            }
            res = client.post("/api/v1/incidents/unmerge", json=unmerge_payload)
            assert res.status_code == 200
            new_inc = res.json()
            assert new_inc["id"] != cluster["id"]
            assert "Unmerged" in new_inc["canonical_title"]


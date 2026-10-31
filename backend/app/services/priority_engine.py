from typing import Dict, Any, List, Optional

def calculate_priority_score(
    incident_type: str,
    threat_severity_str: str,
    affected_people_count: Optional[int],
    vulnerable_groups: Optional[str],
    report_count: int,
    corroborating_evidence_count: int,
    is_location_confirmed: bool,
    has_coordinates: bool,
) -> Dict[str, Any]:
    """
    Computes an explainable, deterministic priority score (0-100) and factors.
    Priority is advisory and designed for coordinator decision-support.
    """
    score = 0.0
    factors = {}
    explanations = []

    # 1. Threat severity baseline (up to 30 pts)
    severity_lower = (threat_severity_str or "medium").lower()
    if severity_lower == "high":
        score += 30.0
        factors["threat_severity"] = 30.0
        explanations.append("High reported threat urgency / trapped individuals (+30)")
    elif severity_lower == "medium":
        score += 15.0
        factors["threat_severity"] = 15.0
        explanations.append("Moderate reported threat (+15)")
    else:
        score += 5.0
        factors["threat_severity"] = 5.0
        explanations.append("Low preliminary urgency baseline (+5)")

    # 2. People affected count (up to 25 pts)
    if affected_people_count is not None:
        if affected_people_count >= 50:
            score += 25.0
            factors["affected_people"] = 25.0
            explanations.append(f"Mass population impact ({affected_people_count}+ people reported) (+25)")
        elif affected_people_count >= 10:
            score += 18.0
            factors["affected_people"] = 18.0
            explanations.append(f"Significant group affected ({affected_people_count} people reported) (+18)")
        elif affected_people_count > 0:
            score += 10.0
            factors["affected_people"] = 10.0
            explanations.append(f"Specific individuals affected ({affected_people_count} reported) (+10)")
    else:
        factors["affected_people"] = 0.0
        explanations.append("No explicit casualty or headcount specified (0)")

    # 3. Vulnerable groups present (up to 15 pts)
    if vulnerable_groups and len(vulnerable_groups.strip()) > 0:
        score += 15.0
        factors["vulnerable_groups"] = 15.0
        explanations.append(f"Vulnerable population identified ({vulnerable_groups}) (+15)")
    else:
        factors["vulnerable_groups"] = 0.0

    # 4. Multi-report corroboration (up to 15 pts)
    if report_count > 1:
        corrob_pts = min(15.0, (report_count - 1) * 5.0)
        score += corrob_pts
        factors["independent_reports"] = corrob_pts
        explanations.append(f"Cross-corroborated by {report_count} citizen reports (+{corrob_pts:.0f})")
    else:
        factors["independent_reports"] = 0.0
        explanations.append("Single citizen report; awaiting independent confirmation (0)")

    # 5. External hazard evidence (up to 15 pts)
    if corroborating_evidence_count > 0:
        ev_pts = min(15.0, corroborating_evidence_count * 7.5)
        score += ev_pts
        factors["external_evidence"] = ev_pts
        explanations.append(f"External hazard telemetry corroboration ({corroborating_evidence_count} sources) (+{ev_pts:.1f})")
    else:
        factors["external_evidence"] = 0.0

    # Cap score at 100
    final_score = min(100.0, max(0.0, score))

    # Determine priority level
    if not has_coordinates:
        priority_level = "unconfirmed"
        explanations.append("Location is unconfirmed; marked for coordinator location resolution")
    elif final_score >= 65.0:
        priority_level = "high"
    elif final_score >= 35.0:
        priority_level = "medium"
    else:
        priority_level = "low"

    return {
        "priority_score": round(final_score, 1),
        "priority_level": priority_level,
        "priority_explanation": " • ".join(explanations),
        "priority_factors": factors,
        "engine_version": "v1.2-deterministic"
    }

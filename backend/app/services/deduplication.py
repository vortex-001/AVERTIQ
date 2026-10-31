import math
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone
import numpy as np
from app.services.geocoding import haversine_distance_km

# Multilingual synset map for cross-lingual concept alignment
CROSS_LINGUAL_SYNSETS = {
    "concept_water_flood": ["flood", "water", "paani", "pani", "harrh", "sailaab", "drowning", "dubb", "overflow"],
    "concept_bridge": ["bridge", "pul", "bridge de", "pul de", "pul ke"],
    "concept_rising": ["rising", "badh", "chadh", "increasing", "tezi", "flow", "bahav"],
    "concept_trapped": ["trapped", "phanse", "phans", "ghere", "stuck", "surrounded"],
    "concept_fire": ["fire", "aag", "dhuan", "smoke", "blaze", "burning", "jal"],
    "concept_quake": ["earthquake", "bhukamp", "bhookamp", "tremor", "hila", "shake", "collapse"],
    "concept_people": ["people", "log", "bande", "persons", "bachhe", "children", "elderly"],
    "concept_road": ["road", "sadak", "sarak", "highway", "chowk", "street", "gali"]
}

def generate_multilingual_embedding(text: str, dim: int = 64) -> List[float]:
    """
    Generates a normalized multilingual concept vector.
    Enables cross-lingual matching (e.g. 'Flood near the bridge' and 'Pul de kol paani chadh reha hai').
    """
    vec = np.zeros(dim, dtype=np.float32)
    clean_text = text.lower()
    
    # 1. Map multilingual synset concepts
    for idx, (concept_name, keywords) in enumerate(CROSS_LINGUAL_SYNSETS.items()):
        slot = idx % dim
        for kw in keywords:
            if kw in clean_text:
                vec[slot] += 2.0
                
    # 2. Add subword n-gram hashing for lexical nuance
    words = clean_text.split()
    for w in words:
        h = hash(w) % dim
        vec[h] += 0.5
        
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    a = np.array(vec1, dtype=np.float32)
    b = np.array(vec2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def evaluate_duplicate_match(
    report_text: str,
    report_type: str,
    report_lat: Optional[float],
    report_lon: Optional[float],
    report_time: datetime,
    existing_incident_title: str,
    existing_incident_type: str,
    existing_lat: Optional[float],
    existing_lon: Optional[float],
    existing_time: datetime,
    report_embedding: Optional[List[float]] = None,
    existing_embedding: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Evaluates whether an incoming report matches an existing incident.
    Returns composite score, distance_km, semantic_sim, time_diff_hrs, and is_duplicate flag.
    """
    # 1. Semantic similarity
    if report_embedding and existing_embedding:
        semantic_sim = compute_cosine_similarity(report_embedding, existing_embedding)
    else:
        v1 = generate_multilingual_embedding(report_text)
        v2 = generate_multilingual_embedding(existing_incident_title)
        semantic_sim = compute_cosine_similarity(v1, v2)
        
    # 2. Type compatibility
    type_match = 1.0 if (report_type.lower() == existing_incident_type.lower()) else 0.0

    # 3. Geographic distance
    distance_km = None
    geo_score = 0.5  # neutral if one or both lack coordinates
    if report_lat is not None and report_lon is not None and existing_lat is not None and existing_lon is not None:
        distance_km = haversine_distance_km(report_lat, report_lon, existing_lat, existing_lon)
        if distance_km <= 0.5: # within 500m
            geo_score = 1.0
        elif distance_km <= 2.0: # within 2km
            geo_score = max(0.0, 1.0 - ((distance_km - 0.5) / 1.5))
        else:
            geo_score = 0.0

    # 4. Time proximity
    if report_time.tzinfo is None:
        report_time = report_time.replace(tzinfo=timezone.utc)
    if existing_time.tzinfo is None:
        existing_time = existing_time.replace(tzinfo=timezone.utc)
        
    time_diff_hours = abs((report_time - existing_time).total_seconds()) / 3600.0
    time_score = max(0.0, 1.0 - (time_diff_hours / 24.0)) # decays over 24 hours

    # 5. Composite score calculation
    # Heavy penalty if incident types are completely incompatible (e.g. fire vs flood)
    if type_match == 0.0 and report_type != "other" and existing_incident_type != "other":
        composite_score = 0.1
    else:
        composite_score = (
            0.35 * semantic_sim
            + 0.35 * geo_score
            + 0.15 * type_match
            + 0.15 * time_score
        )

    is_duplicate = composite_score >= 0.65 and (distance_km is None or distance_km <= 3.0)

    return {
        "is_duplicate": is_duplicate,
        "composite_score": round(composite_score, 3),
        "semantic_similarity": round(semantic_sim, 3),
        "distance_km": round(distance_km, 3) if distance_km is not None else None,
        "time_diff_hours": round(time_diff_hours, 2),
        "type_match": bool(type_match),
    }

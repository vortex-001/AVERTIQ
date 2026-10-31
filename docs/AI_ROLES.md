# AVERTIQ — AI & ALGORITHMIC MODULE ROLES AND BOUNDARIES

This document formalizes the architectural responsibilities, mathematical boundaries, and strict non-goals for each algorithmic module in the Avertiq platform.

---

## 1. Natural Language Intelligence & Triage Module (`ai_extractor.py`)

### Primary Objective
Analyze unstructured citizen text messages arriving in Hindi, Punjabi, English, and Romanized code-mixing (Hinglish/Punglish) to extract emergency parameters.

### What the Module MUST DO:
- Identify emergency hazard type (`flood`, `fire`, `earthquake`, `cyclone`, `landslide`, `other`).
- Identify language mixture and script.
- Extract explicitly mentioned numbers of affected individuals (e.g. "15 people trapped" $\to 15$).
- Extract stated vulnerable populations (children, elderly, pregnant women, injured persons).
- Extract descriptive landmark statements (e.g. "pul ke paas", "near Sutlej bridge").
- Assign a preliminary urgency indicator (`high`, `medium`, `low`).
- Document uncertainty and list all missing fields.
- Fall back gracefully to deterministic rule-based regex and keyword analysis if the Gemini API is unreachable or unconfigured.

### What the Module MUST NOT DO:
- ❌ **Must NOT fabricate coordinates**: The module must never invent GPS coordinates based on a place name.
- ❌ **Must NOT invent casualty numbers**: If a citizen writes "lots of people", the headcount must remain `null` with a missing field flag, not an arbitrary integer.
- ❌ **Must NOT claim an incident is verified**: Triage output is preliminary advice for human coordinators.

---

## 2. Multilingual Semantic Deduplication Module (`deduplication.py`)

### Primary Objective
Determine whether two reports submitted in different languages describe the same physical event.

### What the Module MUST DO:
- Map multilingual synset concepts (e.g. `pul`, `bridge`, `paani`, `water`, `harrh`, `chadh`) into a normalized high-dimensional concept space.
- Compute cosine similarity across concept vectors.
- Evaluate geographic proximity using PostGIS / Haversine distance calculations.
- Evaluate time proximity within a 24-hour decay window.
- Calculate an explainable composite score ($S_{\text{composite}}$).

### What the Module MUST NOT DO:
- ❌ **Must NOT merge incidents solely because they are geographically close**: A fire on Gill Road must not merge with a flood at Sutlej Bridge simply because both occurred in Ludhiana.
- ❌ **Must NOT merge incompatible hazard categories**: Floods, earthquakes, and structure fires have distinct operational response needs and must remain distinct.
- ❌ **Must NOT prevent human override**: Coordinators must always have the ability to manually unmerge falsely grouped reports.

---

## 3. External Evidence & Verification Module (`external_evidence.py`)

### Primary Objective
Retrieve and correlate independent environmental sensor telemetry to corroborate citizen claims.

### What the Module MUST DO:
- Query real-time surface precipitation and wind telemetry via Open-Meteo.
- Query global seismic events and epicenters via USGS GeoJSON.
- Flag evidence items that exceed maximum age thresholds ($>6\text{ hours}$) as **Stale**.
- Categorize evidence relationships as `corroborating`, `conflicting`, or `contextual`.
- Surface explicit limitations notes (e.g., "Sensor grid interpolation does not detect local culvert blockages").

### What the Module MUST NOT DO:
- ❌ **Must NOT treat a weather forecast as proof of flooding**: Rainfall indicates environmental potential, not confirmed structural inundation.
- ❌ **Must NOT treat an earthquake epicenter as proof of building collapse**: Seismic intensity requires on-ground civil inspection.
- ❌ **Must NOT mark an incident "human_verified" automatically**: Verification status can only be elevated to `human_verified` by an authorized human coordinator.

---

## 4. Priority Engine (`priority_engine.py`)

### Primary Objective
Compute an explainable, deterministic priority score ($0$ to $100$) to assist coordinators in ordering the review queue.

### Scoring Factors:
1. **Threat Severity Baseline** (up to 30 pts): Immediate danger, trapped citizens, rising flood waters.
2. **Affected Individuals** (up to 25 pts): Headcounts explicitly stated by citizens ($50+\to 25$, $10+\to 18$).
3. **Vulnerable Groups** (up to 15 pts): Stated presence of infants, elderly, pregnant women, or injured persons.
4. **Independent Corroborating Reports** (up to 15 pts): Multi-source corroboration increments score.
5. **External Environmental Corroboration** (up to 15 pts): Active sensor verification from Open-Meteo or USGS.

### What the Module MUST NOT DO:
- ❌ **Must NOT assign high priority to unlocated reports without an unconfirmed flag**: Reports lacking location are categorized as `unconfirmed` so coordinators prioritize finding their location first.
- ❌ **Must NOT treat missing data as zero risk or maximum risk**: Neutral baselines are used when information is absent.
- ❌ **Must NOT be a black box**: Every calculation returns `priority_factors` and human-readable `priority_explanation`.

---

## 5. Silent-Zone Risk Detection Engine (`silent_zone_engine.py`)

### Primary Objective
Identify areas of acute information blackout where severe environmental threats exist with zero or abnormal reporting density.

### What the Module MUST DO:
- Divide monitoring regions into standard spatial grid cells.
- Measure hazard intensity from external sensor telemetry.
- Count verified citizen reports within each spatial cell.
- Calculate reporting deficit: $\text{Deficit} = \max(0, \text{Expected Reports} - \text{Actual Reports})$.
- Label cells with sensor coverage $<30\%$ as `insufficient_evidence`.
- Clamp cells with hazard score $<15.0$ to `low` risk.

### What the Module MUST NOT DO:
- ❌ **Must NOT flag every zero-report cell as dangerous**: Areas with no hazard and no reports are completely safe and normal.
- ❌ **Must NOT claim silent-zone detection is proof of trapped individuals**: Silent zones represent information gaps requiring human reconnaissance, not confirmed casualties.


# Avertiq — Simplified Viewer UI Prototype

This is a direct edit of the supplied Google Stitch HTML export. The existing dark navy and red-orange Avertiq theme is retained, while the Home and SOS Request screens have been simplified for fast emergency reporting.

## Changes
- Removed the top `ONLINE • GPS ACTIVE` indicator and the home-screen connectivity/GPS/mesh status ribbon.
- Removed technical telemetry labels, fabricated GPS coordinates, mesh controls and unnecessary dashboard badges.
- Replaced the home screen with a simple greeting, plain-language safety message, prominent SOS action and four shortcuts.
- Reworked SOS submission to require only an emergency category; location is described as automatic and the message/photo are optional.
- Removed priority/people selectors and voice/audio controls from the emergency flow.
- Added honest offline wording: locally saved does not mean authorities have received the request.
- Preserved the other Stitch screen exports and their reference images.

## Preview
Open `screen_3_home_dashboard/code.html` and `screen_4_sos_request/code.html` in a browser. Other screen folders remain as supplied in the original export.

## Implementation Status
> **UPDATE**: All prototype screens have now been fully implemented as a native Flutter mobile & web application (`app/`), connected to the live FastAPI backend, featuring real GPS geolocation capture, 7-stage SOS delivery tracking, local SQLite persistence, dual-theme support, and compiled as the production release APK (`AVERTIQ-release.apk`).

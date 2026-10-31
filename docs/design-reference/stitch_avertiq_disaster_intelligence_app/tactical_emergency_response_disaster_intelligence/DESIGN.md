---
name: Tactical Emergency Response & Disaster Intelligence
colors:
  surface: '#0d141d'
  surface-dim: '#0d141d'
  surface-bright: '#333a44'
  surface-container-lowest: '#080f18'
  surface-container-low: '#151c26'
  surface-container: '#19202a'
  surface-container-high: '#242a34'
  surface-container-highest: '#2e353f'
  on-surface: '#dce3f0'
  on-surface-variant: '#e8bcb6'
  inverse-surface: '#dce3f0'
  inverse-on-surface: '#2a313b'
  outline: '#ae8882'
  outline-variant: '#5e3f3b'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690003'
  primary-container: '#ff5545'
  on-primary-container: '#5c0002'
  inverse-primary: '#c0000a'
  secondary: '#a8c8ff'
  on-secondary: '#003062'
  secondary-container: '#3790ff'
  on-secondary-container: '#002956'
  tertiary: '#ffb59e'
  on-tertiary: '#5e1800'
  tertiary-container: '#f75f29'
  on-tertiary-container: '#521400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930005'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a8c8ff'
  on-secondary-fixed: '#001b3c'
  on-secondary-fixed-variant: '#00468a'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#842500'
  background: '#0d141d'
  on-background: '#dce3f0'
  surface-variant: '#2e353f'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-readability, crisis-grade command surface tailored for high-stress mobile environments. The interface draws inspiration from modern tactical situational-awareness displays and deep telemetry dashboards. Visual clarity directly impacts reaction times and life-safety decisions.

The design movement mixes **Tactical High-Contrast Dark Mode** with **Subtle Luminous Glassmorphism**. Dark navy-to-abyssal canvases eliminate visual fatigue and maximize battery conservation under field conditions. High-energy critical accents draw immediate visual focus to priority hazard levels, dynamic trajectory maps, and evacuation notifications without introducing decorative noise.

Key tenets:
- **Instant Triage Hierarchy:** Critical information is visible at a 2-second glance using controlled luminescence and color codes.
- **Field Ergonomics:** Every interactive element accommodates one-handed, rapid thumb actuation and gloved inputs in unstable environments.
- **Instrument Precision:** Crisp boundaries, hairline dividers, and monospaced telemetry ensure metrics, coordinates, and hazard timestamps read with surgical accuracy.

## Colors

The system uses a strictly calibrated, high-contrast dark palette tailored for mobile crisis telemetry:

- **Canvas & Surface Architecture:**
  - Base Deep Canvas: `#050B14`
  - Elevated Container / Secondary Canvas: `#0B1420`
  - Surface Card / Action Shell: `#111E2B`
  - Floating Sheet / Overlays: `#162737`
  - Subtle Border / Structural Divider: `#1E2D3D`
  - Border Highlight / Focus: `#2E455E`

- **Core Severity & Telemetry Palette:**
  - **Primary Disaster / Critical Alarm:** `#FF3028` (High-visibility red for life safety, active alerts, and immediate evacuations).
  - **Tactical Secondary / Intelligence Stream:** `#238BFF` (AI analysis trajectories, network status, operational paths).
  - **Severe / Escalation Accent:** `#FF642E` (Vivid orange for flash warnings, secondary hazards, expanding perimeters).
  - **Warning Amber:** `#F59E0B` (Advisory status, resource constraints, weather alerts).
  - **Operational Success / Safe Zones:** `#22C55E` (Cleared sectors, safe muster points, verified channels).

- **Luminescent Accent Tokens:**
  - Emergency Glow: `rgba(255, 48, 40, 0.28)`
  - Tactical Telemetry Glow: `rgba(35, 139, 255, 0.24)`
  - Alert Accent Glow: `rgba(255, 100, 46, 0.22)`

- **Typography & Content Contrast:**
  - Text High-Emphasis: `#F8FAFC`
  - Text Medium-Emphasis / Metadata: `#94A3B8`
  - Text Low-Emphasis / Inactive: `#475569`

## Typography

The type system prioritizes speed of cognitive extraction under sensory overload:

- **Headlines (`Space Grotesk`):** Engineered geometric grotesque with sharp structural cuts that impart high-tech urgency and decisive authority without becoming decorative.
- **Body & Continuous Copy (`Inter`):** Neutral, hyper-legible neo-grotesque optimized for small screens, poor lighting conditions, and dense situational reports.
- **Labels, Telemetry, & Timestamps (`JetBrains Mono`):** Monospaced technical type used for real-time sensor streams, coordinates, situational timestamps, threat levels, and emergency badges to prevent tabular jitter when figures update in real time.

All labels and status tags use uppercase styling paired with expanded tracking (`0.05em` to `0.08em`) to guarantee quick recognition on mobile viewports.

## Layout & Spacing

The layout is built around a dense, high-efficiency vertical stack on mobile (4 columns), shifting to an expanded tactical split-view (8 columns) on tablets and foldables. 

- **Ergonomics & Thumb Zones:** Navigation, primary alert triggers, and emergency actions are anchored within the bottom 40% of the mobile viewport. Map overlays and deep telemetry pin to top surfaces with contextual bottom sheets.
- **Touch Target Integrity:** Every interactive module guarantees a minimum bounding area of `48px x 48px`, regardless of visual icon size, preventing mis-taps during stressful navigation.
- **Information Density:** Spacing between stacked items remains tight (`space-sm` to `space-md`) to ensure critical operational context remains visible above the viewport fold without requiring excessive scrolling.

## Elevation & Depth

Depth is established primarily through **chromatic surface layering** and **controlled emergency luminescence**, avoiding muddy diffuse drop shadows that degrade dark-mode clarity:

- **Level 0 (Base Map & Floor):** Deep navy `#050B14`, absolute background.
- **Level 1 (Sub-Containers & Rails):** `#0B1420` bounded by a 1px border of `#1E2D3D`.
- **Level 2 (Active Cards & Floating Modules):** `#111E2B` with a 1px border of `#1E2D3D` and subtle directional rim lighting (`border-top: 1px solid rgba(255, 255, 255, 0.08)`).
- **Level 3 (Modal Sheets & Action Overlays):** `#162737` with `backdrop-filter: blur(16px)` and an ambient shadow `0 12px 32px -4px rgba(0, 0, 0, 0.65)`.
- **Emergency Halo (Active Alarms):** High-priority alerts project a focused luminous halo around their container using `box-shadow: 0 0 24px -2px rgba(255, 48, 40, 0.28), inset 0 0 12px 0 rgba(255, 48, 40, 0.12)`. Blue AI intelligence streams utilize `box-shadow: 0 0 20px -2px rgba(35, 139, 255, 0.22)`.

## Shapes

The interface balances tactical discipline with modern ergonomics:

- Base cards, actionable containers, and input fields use an 8px radius (`roundedness: 2`), projecting structural resilience without sharp needle corners that cause visual fatigue.
- Nested chips, sensor pills, and telemetry badges use full pill shapes to clearly distinguish interactive metadata tags from structured card shells.
- Action overlays and bottom sheets employ `rounded-t-2xl` (16px) for an intentional, comfortable tactile anchor against phone viewports.

## Components

- **Buttons:**
  - *Emergency Action (Primary):* Solid `#FF3028` background, `#F8FAFC` bold typography, minimum height of `52px`. Emits a subtle pulse halo during critical alerts. Active state scales to `0.98` with darkened red (`#D6211A`).
  - *Tactical Utility (Secondary):* `#111E2B` background with a 1px border of `#238BFF`, text in `#238BFF`. Focus states trigger a 16px soft blue edge glow.
  - *Subtle Shell (Tertiary):* Transparent background, 1px border of `#1E2D3D`, text in `#94A3B8`.

- **Tactical Status Badges & Chips:**
  - Constructed using `JetBrains Mono` (`label-md`). 
  - Layout consists of a glowing 6px status pip, tracked uppercase label, and an optional telemetry count.
  - Severity Variants:
    - *Critical:* Background `rgba(255, 48, 40, 0.12)`, border `rgba(255, 48, 40, 0.35)`, text `#FF3028`.
    - *Elevated:* Background `rgba(255, 100, 46, 0.12)`, border `rgba(255, 100, 46, 0.35)`, text `#FF642E`.
    - *Advisory:* Background `rgba(245, 158, 11, 0.12)`, border `rgba(245, 158, 11, 0.35)`, text `#F59E0B`.
    - *Optimal/Safe:* Background `rgba(34, 197, 94, 0.12)`, border `rgba(34, 197, 94, 0.35)`, text `#22C55E`.

- **Cards & Hazard Containers:**
  - Surface `#111E2B`, border 1px solid `#1E2D3D`.
  - Headers feature an edge-accented vertical border mark (3px thick) tinted to the hazard severity color.
  - Internal padding is standard `1rem` (`space-lg`), containing clear visual separators between situational descriptions and quantitative metrics.

- **Input Fields & Search Bars:**
  - Dark container `#0B1420`, inset border 1px solid `#1E2D3D`, placeholder text `#475569`.
  - Focused state transforms the border to `#238BFF` with an inner shadow and subtle blue ambient bleed. Height is strictly `48px` or greater.

- **Checkboxes & Toggle Switches:**
  - Toggles use a hardened track (`#0B1420` with `#1E2D3D` perimeter) and snap with `#238BFF` or `#22C55E` when operational. Checkboxes feature sharp 4px corners and an immediate high-contrast checkmark.

- **Crisis Telemetry Feed (Specialized Component):**
  - Continuous vertical feed integrating a pulsing incident timeline wire, live latency counters, automated AI confidence percentages, and rapid evacuation swipe-triggers.
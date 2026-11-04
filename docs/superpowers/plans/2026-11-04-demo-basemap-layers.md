# Demo Basemap Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public synthetic cadastral and soil map modes to the existing GitHub Pages preview.

**Architecture:** Extend the deterministic demo generator with a parcel GeoJSON and six soil zones. Leaflet keeps OpenStreetMap underneath and allows either or both illustrative polygon layers, with soil under parcel outlines and sample markers on top.

**Tech Stack:** Static HTML/CSS/JavaScript, Leaflet, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-04-demo-basemap-layers.md`

## Global Constraints

- No research coordinates, measurements, parcel owner names or addresses in the public repository.
- Show synthetic status in controls, popups, and legend.
- Preserve existing sample interactions and mobile layout.

## Review Focus

- A failed GeoJSON fetch turns off only that overlay with an understandable message.
- Rapid switching cannot display an overlay that the user turned off.
- Sample markers stay clickable above illustrative polygons.
- Every generated parcel has only synthetic identifiers and valid closed geometry.
- Both new modes are usable at phone width.

---

### Task 1: Generate illustrative geometry

**Files:** `scripts/generate-demo-data.mjs`, `data/processed/parcel-polygons.geojson`, `data/processed/soil-polygons.geojson`, `tests/demo.test.cjs`

- [x] Write a failing test for six soil zones and 54 synthetic parcels near the six synthetic sites, with no personal fields.
- [x] Run `node --test tests/demo.test.cjs` and confirm the expected failure.
- [x] Extend the generator and regenerate checked-in data.
- [x] Run the test and confirm it passes.

### Task 2: Toggle visible map layers

**Files:** `index.html`, `app.js`, `style.css`, `tests/demo.test.cjs`

- [x] Write a failing test for the map layer controls and synthetic labels.
- [x] Run the test and confirm the expected failure.
- [x] Wire independent overlay switching, lazy polygon loading, popups, and mobile control styling.
- [x] Run the Node tests and perform a browser interaction check.

### Task 3: Publish public preview

**Files:** `README.md` plus changed assets

- [x] Confirm the checked-in data remains fabricated and no private source file is staged.
- [x] Commit and push to `supercuem/soil-webgis`.
- [x] Verify the live GitHub Pages URL loads the three modes.

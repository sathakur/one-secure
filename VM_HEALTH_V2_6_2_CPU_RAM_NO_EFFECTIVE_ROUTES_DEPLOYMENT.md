# VM Health Diagnostic V2.6.2

Changes requested:
- Effective Routes removed from collection, portal output, and PDF.
- vCPU count added.
- RAM capacity added.
- Existing No-Entra portal, PDF export, LAW fallback, memory telemetry, and per-drive disk telemetry are preserved.

## Where CPU/RAM are shown
1. Under the `CPU avg / max` KPI:
   `4 vCPU • 16 GB RAM`
2. `VM configuration & runtime`:
   - VM size
   - vCPUs
   - RAM
3. Copy-for-incident text.
4. CSV export.
5. PDF export automatically includes the KPI and configuration table.

## Source
The Logic App calls the current VM's `/vmSizes` Compute API and matches the active `VMSize`.
It reads:
- `numberOfCores`
- `memoryInMB`

## Effective Routes
The following were removed:
- `Get_Effective_Routes` Logic App call
- `effectiveRoutes` result payload
- Effective Routes portal table
- Effective Routes PDF section

Effective NSGs remain.

## Deploy
Logic App:
- Replace complete Health Logic App Code View with:
  `VM_Health_Diagnostic_V2_6_2_CPU_RAM_No_Effective_Routes_COMPLETE_CODE_VIEW.json`

Portal:
- Replace:
  - `app/app.js`
  - `app/portal.html`

`styles.css` is unchanged but is included in the complete package.

# VM Health Diagnostic V2.6.8 - Unique Windows Events

Built on the stable V2.6.7 LAW configuration.

## Unique event key
Repeated Windows Event Viewer records are grouped by:

Level + EventLog + EventID + Source

Example:
20 repeated System / Critical / Event ID 401 / TaskScheduler records
become one unique event row with `Occurrences = 20`.

## Portal KPI
Example:

WINDOWS EVENTS
2 unique
1 Critical • 1 Error • 36 occurrences

## Detail table
- Level
- Log
- Event ID
- Source
- Occurrences
- First seen
- Last seen
- Latest message

## Health classification
- One or more UNIQUE Critical event types with Last Seen inside the selected
  diagnostic period -> Critical finding.
- Unique Critical event types only older than the selected diagnostic period
  but within the last 24h -> Warning finding.
- Error event types are displayed but do not automatically make VM Health Critical.

## Preserved
- No-Entra portal
- stable Log Analytics endpoint/audience from V2.6.7
- regional/fallback LAW
- memory and per-drive disk telemetry
- CPU/RAM
- Effective Routes removed
- Backup, patching, alerts
- Windows Event Viewer DCR
- PDF export

## Deploy
1. Replace the complete Health Logic App Code View with:
   VM_Health_Diagnostic_V2_6_8_Unique_Windows_Events_COMPLETE_CODE_VIEW.json
2. Replace:
   app/app.js
   app/portal.html
3. Deploy Static Web App.
4. Hard refresh.

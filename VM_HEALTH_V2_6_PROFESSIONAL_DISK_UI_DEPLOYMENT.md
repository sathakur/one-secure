# VM Health Diagnostic V2.6 - Professional Disk UI

Keeps:
- No Entra authentication portal
- Regional LAW + fallback LAW
- Heartbeat
- Memory
- Per-drive disk collection
- _Total disk fallback
- Existing Alert Suppression, Snapshot and Backup modules

Disk KPI:
- Shows lowest drive free percentage as headline.
- Shows `Lowest free drive: X:`.
- Shows compact drive-letter pills only (C:, D:, E:, etc.).
- Hides HarddiskVolume* from the KPI card.
- System/internal volumes remain visible in Storage & disk performance.
- If only _Total exists, overall disk fallback remains.

Deploy:
Replace app/app.js, app/styles.css and app/portal.html.
The included Logic App JSON is the same working all-drives query version and is included for completeness.

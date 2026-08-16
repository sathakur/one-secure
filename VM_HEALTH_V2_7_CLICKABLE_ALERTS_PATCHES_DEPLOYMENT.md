# VM Health Diagnostic V2.7

UI enhancement only. Existing Logic App behavior is unchanged.

## Active Alerts
Click the Active Alerts KPI card.
The portal opens **Azure alerts & recent changes**, scrolls to it, and shows:
- Severity
- Alert name/rule
- Monitor service
- Fired state
- Start time

## Patch Assessment
Click the Patch Assessment KPI card.
The portal opens **Backup & patching**, scrolls to it, and shows:
- Assessment time
- Reboot pending state
- Pending patches by classification

## Deploy
Replace:
- app/app.js
- app/styles.css
- app/portal.html

No Logic App update is required for this UI-only change.

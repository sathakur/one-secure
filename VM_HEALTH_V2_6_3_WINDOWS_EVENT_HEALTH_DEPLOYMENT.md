# VM Health Diagnostic V2.6.3

Preserved:
- No-Entra portal
- PDF export
- Regional LAW + fallback LAW
- Memory + per-drive disk
- CPU/RAM count
- Effective Routes removed
- Backup / patch / alert / monitoring checks

Added:
- Windows System + Application Critical/Error event collection from effective LAW
- Windows Events KPI
- Windows Event Viewer detail section
- Event Time / Level / Log / Event ID / Source / Message
- Critical events inside selected diagnostic period can set VM Health to Critical
- Older Critical events in last 24h create Warning
- Error events are shown for investigation without automatically changing overall status
- Windows events are included in JSON and PDF

Deploy:
1. Configure the VM DCR using WINDOWS_EVENT_VIEWER_DCR_SETUP.md.
2. Replace Health Logic App Code View with the V2.6.3 JSON.
3. Replace app/app.js and app/portal.html.
4. Deploy Static Web App and hard refresh.

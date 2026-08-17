# VM Health Diagnostic V2.7.3.2 — Domain Only + Exact OS Version

Based directly on the working V2.7.3.1 package.

Preserved:
- Top CPU / memory consumers
- Historical process consumption (1h / 5h / 24h)
- CPU/RAM spike analysis
- Total/free/used logical disk size
- Unique Windows Event Viewer events
- Regional LAW + fallback LAW
- CPU/RAM capacity
- Backup, patching, alerts and monitoring checks
- PDF / JSON / CSV / Copy-for-incident export
- Exact Domain query capability

Visible VM configuration changes:

Removed:
- Domain / Workgroup
- DNS suffix
- Workgroup
- FQDN
- Guest identity source

Kept:
- Domain

Added:
- OS name
- OS version

OS name/version come from Azure VM Instance View already returned by the current
Health Logic App. No new collection action is required.

Example:
OS type     Windows
OS name     Windows Server 2022 Datacenter
OS version  Microsoft Windows NT 10.0.20348.0
Domain      corp.example.com

Deploy:
- Replace app/app.js
- Replace app/portal.html
- Hard refresh after Static Web Apps deployment.

Logic App:
- No Logic App update is required solely for this change if V2.7.3.1 is already deployed.
- The included V2.7.3.2 Code View JSON is functionally the same as V2.7.3.1.

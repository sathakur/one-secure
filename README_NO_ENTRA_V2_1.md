# Azure VM Operations Portal — No Entra + VM Health Diagnostic V2.1 Regional LAW

This package uses the professional portal variant with **no Microsoft Entra authentication**.
The start page asks for a manual requester user name and stores it locally in the browser.
The Static Web App route policy is anonymous and the API receives the requester through the `X-Requester-User-Name` header.

Modules retained:
- Alert Suppression
- VM Snapshot (max 5 VMs)
- On-Demand VM Backup (max 5 VMs)
- VM Health Diagnostic V2.1 (exactly 1 VM, read-only)

VM Health V2.1 change:
- VM region is discovered automatically.
- `westeurope` maps to `central-law-weu-law`.
- Workspace GUID is resolved dynamically through Azure Resource Graph.
- Heartbeat is queried independently from the `Heartbeat` table.
- Guest memory / logical-disk telemetry uses `InsightsMetrics`.
- Optional collected performance counters use `Perf`.
- Azure control-plane checks remain direct Azure API checks.
- Health Score is not used.

Canonical Health Logic App Code View file:
`VM_Health_Diagnostic_V2_1_Regional_LAW_COMPLETE_CODE_VIEW.json`

No `/.auth/login`, `/.auth/me`, Entra client ID, or Entra client secret is required by this portal package.

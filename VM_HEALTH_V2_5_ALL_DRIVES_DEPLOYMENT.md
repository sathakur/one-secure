# VM Health Diagnostic V2.5 - all drive free-space display

This version keeps the existing No-Entra portal and Regional LAW/fallback behavior.

## Drive logic
1. Prefer individual LogicalDisk instances (C:, D:, E:, mount points) when LAW returns them.
2. Display every individual drive in the summary note and in Storage & disk performance.
3. Compute the summary value from the lowest individual-drive free-space value.
4. If no individual instances exist, use LogicalDisk(_Total) only as an overall fallback and label it clearly.

## Important
The Logic App cannot infer Windows drive letters if LAW only contains InstanceName=_Total.
To obtain C:, D:, E:, etc., the VM DCR must collect per-drive counters, for example:

\Memory\Available MBytes
\Memory\% Committed Bytes In Use
\LogicalDisk(*)\% Free Space
\LogicalDisk(*)\Free Megabytes

## Deploy
- Paste `VM_Health_Diagnostic_V2_5_LAW_All_Drives_COMPLETE_CODE_VIEW.json` into Health Logic App Code View.
- Replace `app/app.js` and `app/portal.html` in the portal repo.
- Deploy the Static Web App.

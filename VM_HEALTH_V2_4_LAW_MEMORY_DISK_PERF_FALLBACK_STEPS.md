# VM Health Diagnostic V2.4 — LAW Memory/Disk Perf Fallback

This build keeps the no-Entra/manual requester portal and the existing regional LAW + fallback LAW logic.

## Guest telemetry order
1. Query InsightsMetrics for Memory/AvailableMB and LogicalDisk free-space values.
2. For any metric not present in InsightsMetrics, use Perf:
   - Memory: Available MBytes / Available MBytes Memory
   - Memory percentage: 100 - % Committed Bytes In Use
   - Disk: % Free Space / Free Megabytes
3. Prefer InsightsMetrics when both sources contain the same metric.

## Deploy
- Replace the Health Logic App Code View with `VM_Health_Diagnostic_V2_4_LAW_Memory_Disk_Perf_Fallback_CODE_VIEW.json`.
- Replace `app/app.js` and `app/portal.html`.
- Save the Logic App and deploy the Static Web App.

## If values are still Unknown
Run `Perf | summarize by ObjectName, CounterName` in the effective LAW. If the required counters are absent, add them to the VM's DCR.

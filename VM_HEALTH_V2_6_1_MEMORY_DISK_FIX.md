# VM Health V2.6.1 - Memory and Disk LAW Fix

This update keeps the currently working:
- No-Entra portal
- Professional disk display
- Download PDF
- Regional LAW + fallback LAW
- Existing Alert Suppression, Snapshot and Backup portal modules

## Root cause fixed
The V2.6 PDF-only Logic App still returned `guestMetrics` only from InsightsMetrics.
Your LAW data is currently in the `Perf` table, so the frontend received no memory/disk rows.

V2.6.1 now returns a unified `guestMetrics` dataset from:
1. InsightsMetrics
2. Perf memory counters
3. Perf LogicalDisk counters

## Memory mapping
- `% Committed Bytes In Use` -> `AvailablePercent = 100 - CounterValue`
- `Available MBytes` -> `AvailableMB`

## Disk mapping
- `% Free Space` -> `FreeSpacePercentage`
- `Free Megabytes` -> `FreeSpaceMB`
- Every `InstanceName` is retained: C:, D:, E:, HarddiskVolume*, _Total

## Deploy
Only the Health Logic App must be updated for this fix:
1. Open the Health Logic App.
2. Development Tools -> Logic app code view.
3. Replace the complete code with:
   `VM_Health_Diagnostic_V2_6_1_PDF_MEM_DISK_FIX_COMPLETE_CODE_VIEW.json`
4. Save.
5. Run WINBASTION1 again.

The existing V2.6 PDF-only frontend does not need to change.

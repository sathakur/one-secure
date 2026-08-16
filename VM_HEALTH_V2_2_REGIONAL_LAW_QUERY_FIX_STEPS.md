# VM Health Diagnostic V2.2 - Regional LAW Query Fix (No Entra)

This build keeps the manual-requester / anonymous Static Web Apps portal. It does not add Microsoft Entra portal authentication.

## What V2.2 fixes

- West Europe still maps to `central-law-weu-law`.
- Log Analytics REST calls now use `https://api.loganalytics.io` consistently for both endpoint and managed-identity audience.
- The result now carries LAW query HTTP status/error diagnostics, so 401/403/query failures are visible in the portal instead of only showing Unknown.
- Heartbeat remains independent of InsightsMetrics.

## Required Azure permission

The Health Logic App system-assigned managed identity MUST have Log Analytics query access on `central-law-weu-law`.

Preferred: assign the built-in `Log Analytics Reader` role on the workspace to the Health Logic App managed identity.

If your governance requires a custom role, use `deployment/VM_Health_LAW_Query_Reader_Custom_Role.json`, create it in the LAW subscription, then assign it at the LAW workspace scope.

## Deploy

1. Replace the Health Logic App Code View with `VM_Health_Diagnostic_V2_2_Regional_LAW_COMPLETE_CODE_VIEW.json` and Save.
2. Confirm its system-assigned managed identity has LAW query permission on `central-law-weu-law`.
3. Deploy `app/portal.html` and `app/app.js`.
4. Hard refresh the portal. The right panel should show V2.2.
5. Run `WINBASTION1` and expand `Monitoring / Regional LAW / AMA / DCR`.
6. Check `LAW query diagnostics`:
   - HTTP 200 + Succeeded: query works.
   - HTTP 403: RBAC/LAW access is missing.
   - HTTP 401: managed-identity token/audience issue.
   - HTTP 400: KQL/query body issue.

The manual Log Analytics test already showed a recent Heartbeat for WINBASTION1, so once Query_Heartbeat succeeds the portal should report the heartbeat rather than Unknown.

# VM Health Diagnostic V2.3 — Regional LAW with Last-Resort Fallback

This package preserves the no-Entra/manual requester portal.

## LAW selection

For a VM in West Europe:

```text
1. Query central-law-weu-law
2. Look for VM-specific Heartbeat, InsightsMetrics, or Perf rows
3. If any matching telemetry is found -> use central-law-weu-law
4. If no matching telemetry is found -> query test-prod-westeu-001-log once as last resort
5. Use the fallback data when available
6. If neither LAW contains telemetry -> report Unknown, never 0
```

Fallback is currently enabled only for West Europe because that is the mapping supplied.

## Deploy Logic App

Replace the Health Logic App Code View with:

`VM_Health_Diagnostic_V2_3_Regional_LAW_Fallback_COMPLETE_CODE_VIEW.json`

Save. The Health Logic App system-assigned managed identity needs Log Analytics query/read access on BOTH:

- `central-law-weu-law`
- `test-prod-westeu-001-log`

It also needs Resource Graph/read permissions already used by V2.2.

## Deploy portal

Replace `app/portal.html` and `app/app.js`, then commit/push. The result UI will show whether the Primary LAW or Fallback LAW supplied the effective telemetry.

## Expected result

If primary has logs:

```text
Effective LAW: central-law-weu-law
Primary LAW used
```

If primary has no matching VM telemetry but fallback has logs:

```text
Effective LAW: test-prod-westeu-001-log
Fallback used: central-law-weu-law -> test-prod-westeu-001-log
```

## Important

The fallback is based on VM-specific telemetry presence, not simply whether the workspace exists. The primary LAW is still preferred.

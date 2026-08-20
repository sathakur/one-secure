# VM Health Diagnostic V2.7.0 — Total Disk Size, Guest Identity and CPU/RAM Spikes

This release builds on V2.6.9 and keeps the portal diagnostic/read-only by default.

## Included in V2.7.0

- Guest logical disks: Free %, Free GB, Total GB and Used GB.
- Guest identity: computer name plus domain/DNS context from VMComputer and JsonADDomainExtension when available.
- CPU spike analysis: current sample, 1-hour average/peak, 24-hour peak, spike counts and last spike time.
- RAM-used spike analysis: current sample, 1-hour average/peak, 24-hour peak, spike counts and last spike time.
- 24-hour CPU and RAM trend charts in the portal.
- LAW query diagnostics now include the memory-trend and VM inventory queries.
- Existing PDF/JSON/CSV/copy/export actions remain available.

Default spike thresholds in the frontend:

- CPU used: 85%
- RAM used: 90%

These thresholds are portal diagnostic thresholds and can be changed in `app/app.js` in `healthReadPerformanceSpikes()`.

## Files to deploy

Portal:

- `app/app.js`
- `app/styles.css`
- `app/portal.html`

Logic App definition:

- `deployment/LogicApp_VM_Health_Diagnostic_V2_7_0_GuestIdentity_CPU_RAM_Spikes.json`

The same definition is also included at the package root as:

- `VM_Health_Diagnostic_V2_7_0_GUEST_IDENTITY_CPU_RAM_SPIKES_COMPLETE_CODE_VIEW.json`

## Logic App upgrade

1. Open the existing VM Health Diagnostic Logic App.
2. Open **Development Tools > Logic app code view**.
3. Back up the current definition.
4. Replace the definition with:
   `deployment/LogicApp_VM_Health_Diagnostic_V2_7_0_GuestIdentity_CPU_RAM_Spikes.json`
5. Save.

V2.7.0 adds these read operations:

- Azure Monitor platform CPU metric for the last 24 hours at PT1M interval.
- Log Analytics RAM-used trend query for the last 24 hours.
- Log Analytics VMComputer inventory query.

No VM Run Command is invoked by the active V2.7.0 workflow.

## CPU data source

CPU spike history is read from Azure platform metric `Percentage CPU` for the last 24 hours with a 1-minute interval.

## RAM data source

The workflow prefers this Windows performance counter if available in the effective LAW:

`\\Memory\\% Committed Bytes In Use`

If it is not present, the workflow attempts to derive RAM-used percentage from VM Insights `InsightsMetrics` using `Memory / AvailableMB` and the VM memory-size tag.

If neither source is present, RAM spike values are shown as `Unknown`; the portal does not substitute 0%.

### Recommended Windows DCR counters

If the existing DCR does not already collect them, add these counters at a 60-second sampling interval:

- `\\Processor(_Total)\\% Processor Time`
- `\\Memory\\Available MBytes`
- `\\Memory\\% Committed Bytes In Use`
- `\\LogicalDisk(*)\\% Free Space`
- `\\LogicalDisk(*)\\Free Megabytes`

A mergeable example is included as:

`deployment/VM_Health_V2_7_0_DCR_Performance_Counters_Snippet.json`

Do not replace an existing DCR blindly. Merge the required performance-counter data source with the existing approved DCR and keep its current destinations/data flows.

## Domain / workgroup behavior

The active workflow remains read-only.

It reads `VMComputer` inventory and VM extension metadata:

- If JsonADDomainExtension exposes the joined domain in public settings, the portal shows `Domain joined` and the domain.
- Otherwise, if VMComputer contains an FQDN/DNS suffix, the portal displays that domain/DNS context and clearly identifies it as inferred telemetry.
- Exact Windows workgroup membership cannot be proven from VMComputer alone, so it is shown as `Unknown` instead of being guessed.

For environments that explicitly approve in-guest execution, an optional reference PowerShell script is included:

`deployment/OPTIONAL_Get_Exact_Domain_Workgroup.ps1`

That script uses `Win32_ComputerSystem` and returns exact `PartOfDomain`, `Domain` and `Workgroup` values. It is **not called by V2.7.0** because Azure VM Run Command requires additional VM action permission and changes the read-only security posture.

## Existing RBAC posture

Keep the existing diagnostic roles unless your current deployment requires a different approved scope:

- `deployment/VM_Health_Diagnostic_Reader_Custom_Role.json`
- `deployment/VM_Health_LAW_Query_Reader_Custom_Role.json`

The existing diagnostic role deliberately excludes `Microsoft.Compute/virtualMachines/runCommand/action`.

## Portal deployment

Replace the matching portal files in the existing repository, then deploy with the same Static Web Apps workflow already used for the portal.

Example:

```powershell
cd "C:\script\APR-SNAP-BACKUP"

git status
git add .
git commit -m "Add VM Health V2.7.0 guest identity and CPU RAM spike analysis"
git pull --rebase origin main
git push origin main
```

## Validation

Test first with one non-production Windows VM that is already reporting to the expected Log Analytics workspace.

Confirm:

1. VM health request completes.
2. Guest logical disks show Free GB, Total GB and Used GB.
3. Performance section shows CPU 24-hour trend.
4. RAM trend is populated from Perf or InsightsMetrics.
5. Spike counts and last-spike timestamps are sensible.
6. VM configuration shows Domain/DNS information where telemetry exists.
7. LAW query diagnostics show Memory trend 24h and VM inventory query status.
8. Missing data is displayed as Unknown, not 0.


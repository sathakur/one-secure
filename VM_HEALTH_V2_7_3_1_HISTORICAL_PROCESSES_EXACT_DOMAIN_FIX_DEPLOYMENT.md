# VM Health Diagnostic V2.7.3.1 — Historical Process Analysis + Exact Domain/Workgroup

## What changed

This version is based on V2.7.2 and keeps all existing VM Health functions.

### 1. Historical process consumption
The existing Process(*) counters are queried over:
- last 1 hour
- last 5 hours
- last 24 hours

For both CPU and memory, the portal shows the top 3 processes for each period with:
- average consumption
- peak consumption
- exact peak timestamp

CPU is normalized by the VM vCPU count. Memory uses `Process(*)\Working Set - Private` and is displayed in MB.

No additional DCR counters are required beyond the V2.7.2 process counters:
- `\Process(*)\% Processor Time`
- `\Process(*)\Working Set - Private`
- `\Process(*)\ID Process`

Historical per-process information only exists from the time these counters started reaching Log Analytics. Azure VM-level historical CPU/RAM metrics cannot reconstruct process-level history from before collection was enabled.

### 2. Why Domain / Workgroup was showing Unknown
The previous version used `VMComputer` as the main guest identity source. Standard AMA performance/event collection does not itself guarantee rows in `VMComputer`. `VMComputer` is associated with VM Insights process/dependency inventory, so a VM can have AMA, Heartbeat, InsightsMetrics and Perf data while the `VMComputer` query still returns zero rows.

V2.7.3.1 keeps VMComputer and Heartbeat as fallbacks, but adds an exact Windows guest query using Azure VM Run Command. The PowerShell command only reads:

```powershell
Get-CimInstance Win32_ComputerSystem
[System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName
```

It does not change domain membership, services, registry, network configuration, disks or files.

The portal can now show:
- Domain Joined / Workgroup
- Domain
- DNS suffix
- Workgroup
- FQDN
- Guest identity source

## Deploy

### A. Portal
Copy the complete package over the repository root and deploy through the existing Static Web App workflow.

### B. Logic App
Paste:

`VM_Health_Diagnostic_V2_7_3_1_HISTORICAL_PROCESSES_EXACT_DOMAIN_FIX_COMPLETE_CODE_VIEW.json`

into the existing VM Health Diagnostic Logic App Code View and Save.

### C. Exact domain/workgroup permission
The existing VM Health Reader role intentionally denies Run Command. Leave that role unchanged.

Create and assign the additional narrow custom role:

`deployment/VM_Health_Guest_Identity_Query_Operator_Custom_Role.json`

Assign it to the VM Health Logic App managed identity at the smallest approved scope (individual VM or VM resource group preferred).

Required additional action only:

`Microsoft.Compute/virtualMachines/runCommand/action`

If this role is not assigned, the portal still works but exact Domain/Workgroup falls back to VMComputer/Heartbeat and can remain Unknown.

### D. Optional switch
The Logic App parameter is enabled by default:

```json
"enableExactGuestIdentityRunCommand": {
  "value": true
}
```

Set it to `false` if your policy does not permit guest Run Command. No other feature depends on it.

## Validate exact domain/workgroup
Run VM Health on a running Windows VM. Expected:

```text
DOMAIN / WORKGROUP   Domain Joined
DOMAIN               corp.example.com
DNS SUFFIX           corp.example.com
WORKGROUP            -
FQDN                  VM01.corp.example.com
GUEST IDENTITY SOURCE Exact Windows guest query (Run Command)
```

or for a workgroup machine:

```text
DOMAIN / WORKGROUP   Workgroup
DOMAIN               -
DNS SUFFIX            <suffix or Unknown>
WORKGROUP             WORKGROUP
FQDN                  <hostname/FQDN>
```

If it is still Unknown, check the VM Health result JSON field `guestIdentityDiagnostics` and the Logic App `Run_Exact_Guest_Identity` action.

Common causes:
- VM is not running.
- Azure VM Agent is unavailable.
- Logic App identity lacks `Microsoft.Compute/virtualMachines/runCommand/action`.
- Run Command is blocked by policy.

## Validate historical process data
In the effective Log Analytics workspace run:

```kusto
Perf
| where TimeGenerated > ago(24h)
| where ObjectName == "Process"
| where CounterName in ("% Processor Time", "Working Set - Private", "ID Process")
| where InstanceName !in ("_Total", "Idle")
| summarize Samples=count(), First=min(TimeGenerated), Last=max(TimeGenerated) by CounterName
```

After enough samples exist, the portal shows Top 3 CPU and memory consumers for 1h, 5h and 24h.


## V2.7.3.1 save-validation fix
The exact guest identity PowerShell no longer uses the PowerShell hashtable token `@{` inside the Logic Apps JSON. Logic Apps treats strings beginning with or containing expression-style `@{...}` syntax specially during workflow validation. The script now builds the PSObject with `Add-Member`, avoiding workflow-expression parsing conflicts.

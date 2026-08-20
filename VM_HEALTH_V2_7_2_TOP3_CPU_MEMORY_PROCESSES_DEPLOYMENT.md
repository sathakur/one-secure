# VM Health Diagnostic V2.7.2 — Top 3 CPU and Memory Consumers

Based on V2.7.1 RAM spike fix. Existing total/used disk size, guest identity/domain information, CPU/RAM spike analysis, Windows events, backup, patching, alerts and exports remain.

## Added
- Top 3 CPU process instances from Log Analytics `Perf`.
- Top 3 memory process instances from Log Analytics `Perf`.
- PID, current value, 30-minute average, 30-minute peak and last sample.
- CPU is normalized by the VM vCPU count.
- Memory uses `Process(*)\Working Set - Private`.
- Primary and fallback LAW queries are both supported.

## Deploy Logic App
Paste `VM_Health_Diagnostic_V2_7_2_TOP3_CPU_MEMORY_PROCESSES_COMPLETE_CODE_VIEW.json` into the existing VM Health Logic App Code View and Save.

## Merge DCR counters
Merge `deployment/VM_Health_V2_7_2_DCR_Performance_And_Process_Counters_Snippet.json` into the approved DCR. New counters are:
- `\Process(*)\% Processor Time`
- `\Process(*)\Working Set - Private`
- `\Process(*)\ID Process`

Sampling is 60 seconds. `Process(*)` increases Log Analytics ingestion, so test on a non-production VM before broad rollout.

## Test KQL
```kusto
Perf
| where TimeGenerated > ago(30m)
| where ObjectName == "Process"
| where CounterName in ("% Processor Time", "Working Set - Private", "ID Process")
| where InstanceName !in ("_Total", "Idle")
| project TimeGenerated, Computer, InstanceName, CounterName, CounterValue, _ResourceId
| order by TimeGenerated desc
```

## Service-name note
These counters identify process instances and PID. A process such as `svchost` can host multiple Windows services, so exact Windows service-name-to-PID mapping is not claimed. Exact service mapping would require a guest-side collector/Run Command, which this read-only package intentionally does not use.

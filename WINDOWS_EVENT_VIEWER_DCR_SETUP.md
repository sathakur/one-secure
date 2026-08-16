# Windows Event Viewer DCR setup

VM Health V2.6.3 queries Critical and Error events from the Log Analytics `Event` table.

Configure the DCR associated with the VM to collect:

System!*[System[(Level=1 or Level=2)]]
Application!*[System[(Level=1 or Level=2)]]

Azure Portal:
Monitor -> Data Collection Rules -> <VM DCR> -> Data sources -> Add data source
Data source type: Windows Event Logs
Use Custom XPath and add the two expressions above.
Send the data to the LAW used by the VM.

Level 1 = Critical
Level 2 = Error

Azure CLI alternative:

az monitor data-collection rule windows-event-log add ^
  --rule-name "<DCR-NAME>" ^
  --resource-group "<DCR-RESOURCE-GROUP>" ^
  --name "VMHealthCriticalErrorEvents" ^
  --streams "Microsoft-WindowsEvent" ^
  --x-path-queries "System!*[System[(Level=1 or Level=2)]]" "Application!*[System[(Level=1 or Level=2)]]"

Verify in LAW:

Event
| where TimeGenerated > ago(24h)
| where Computer =~ "WINBASTION1"
| where EventLog in ("System","Application")
| where EventLevel in (1,2) or EventLevelName in ("Critical","Error")
| project TimeGenerated, EventLevelName, EventLog, EventID, Source, Message
| order by TimeGenerated desc

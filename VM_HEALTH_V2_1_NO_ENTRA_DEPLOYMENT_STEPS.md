# Deployment — No-Entra Portal + VM Health Diagnostic V2.1 Regional LAW

## 1. Portal behavior
This build does **not** use Microsoft Entra authentication.
`app/staticwebapp.config.json` permits the anonymous role. The start page captures only a manual requester user name and the frontend sends it as `X-Requester-User-Name` to the managed API.

Do not add `AZURE_CLIENT_ID` or `AZURE_CLIENT_SECRET` for this build.

## 2. Deploy portal/API
Copy the contents of this folder directly into the Git repository root, for example:
`C:\script\APR-SNAP-BACKUP`

Verify:
```powershell
Select-String -Path .\app\staticwebapp.config.json -Pattern 'anonymous'
Select-String -Path .\app\app.js -Pattern 'X-Requester-User-Name','Regional LAW'
Select-String -Path .\app\portal.html -Pattern 'VM Health Diagnostic V2.1','central-law-weu-law'
```

Then deploy:
```powershell
git status
git add .
git commit -m "Add VM Health V2.1 regional LAW to no-Entra portal"
git push origin main
```
Wait for the victorious-flower Static Web Apps workflow to complete, then use Ctrl+F5.

## 3. Health Logic App
Keep one Health Logic App. Open its Logic app code view and replace the existing definition with:
`VM_Health_Diagnostic_V2_1_Regional_LAW_COMPLETE_CODE_VIEW.json`

There is no fixed `logAnalyticsWorkspaceId` parameter in V2.1.
Current mapping:
`westeurope -> central-law-weu-law`

## 4. Health Logic App managed identity permissions
Assign the custom role in:
`deployment/VM_Health_Diagnostic_Reader_Custom_Role.json`
for the VM subscriptions / approved parent scope.

Assign **Log Analytics Data Reader** to the Health Logic App managed identity on:
`central-law-weu-law`

Keep **Storage Blob Data Contributor** on the health-status blob container used by the Health Logic App.

## 5. Static Web App environment variables
Keep your existing operation variables. Health requires:
- `HEALTH_LOGIC_APP_CALLBACK_URL`
- `HEALTH_STATUS_CONTAINER_SAS_URL`

Do not add Entra authentication variables for this no-Entra build.

## 6. Test
Open the site. Enter the manual requester user name on the start screen, then open VM Health Diagnostic.
Run a West Europe VM. Expected Monitoring detail includes:
- Regional LAW: `central-law-weu-law`
- LAW lookup: Succeeded
- Heartbeat state independent from guest metrics
- Memory/disk remain Unknown when InsightsMetrics is not collected

## 7. Adding regions later
Add another region-to-LAW mapping inside the same Health Logic App. No extra Logic App is needed.

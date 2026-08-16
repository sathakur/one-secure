# VM Health Diagnostic V2.8 - Complete PDF Export

This is a portal/UI enhancement on top of the existing working No-Entra VM Health portal.

## New button
Each VM result now has:

**Download PDF**

The PDF report contains the complete VM diagnostic output in one report:
- request ID / diagnostic period / overall status
- VM identity and Azure location
- Power and Resource Health
- Active Azure Monitor alerts
- CPU, memory, network and disk space
- all drive letters and free-space data
- Azure Backup
- Patch assessment
- Monitoring / LAW / heartbeat
- Findings
- VM configuration & runtime
- Performance and freshness
- Azure managed disks
- Guest logical disks
- Platform disk performance
- NIC / VNet / subnet / NSG
- effective routes and effective NSGs
- active alerts and recent Azure activity
- Resource Health history
- VM extensions
- AMA / DCR / Regional LAW information
- Backup and patching details
- Boot diagnostics
- Recommendations

All collapsed portal sections are automatically expanded in the PDF report.

## How PDF saving works
The portal uses the browser's built-in PDF/print engine. No third-party JavaScript PDF library or external CDN is required.

Click **Download PDF**.
The browser opens the print/save dialog.
Choose **Save as PDF** and save the report.

The report is formatted as A4 landscape for wide diagnostic tables.

## Deploy
Replace:
- app/app.js
- app/styles.css
- app/portal.html

No Logic App update is required for this PDF-export enhancement.

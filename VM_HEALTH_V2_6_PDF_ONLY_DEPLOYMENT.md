# VM Health Diagnostic V2.6 - PDF Export Only

Base: the reverted V2.6 professional disk-space portal.

Only one feature was added: **Download PDF**.

Nothing else was changed:
- no clickable Active Alerts KPI
- no clickable Patch Assessment KPI
- no Logic App change
- no Entra authentication
- existing Alert Suppression, Snapshot and Backup modules unchanged
- existing V2.6 professional disk display unchanged

## PDF contents
The PDF export opens every VM Health accordion in a print-only copy and includes the complete diagnostic output in one A4 landscape report.

## Deploy
Replace only:
- app/app.js
- app/styles.css
- app/portal.html

No Logic App replacement is required.

Click **Download PDF**, then choose **Save as PDF** in the browser print dialog.

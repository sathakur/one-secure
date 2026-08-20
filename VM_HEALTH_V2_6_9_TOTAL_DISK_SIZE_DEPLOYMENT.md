# VM Health V2.6.9 - Guest logical disk total size

Changes:
- Guest logical disk table now includes:
  - Free %
  - Free GB
  - Total GB
  - Used GB
  - Scope
  - Last sample
- Total GB is calculated from the LAW values already returned:
  Total GB = Free GB / (Free % / 100)
- Used GB = Total GB - Free GB

No Logic App change is required because the existing query already returns both
`% Free Space` and `Free Megabytes`.

Deploy:
- Replace app/app.js
- Replace app/portal.html
- Hard refresh after Static Web Apps deployment

PDF export automatically includes the new columns.

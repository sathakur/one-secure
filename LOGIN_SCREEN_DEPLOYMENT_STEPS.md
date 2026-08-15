# Manual User Name Screen - Deployment Steps

## What changed

- Microsoft Entra ID sign-in has been removed from the portal.
- `app/index.html` now contains one required **User Name** field.
- The user name is stored locally in the browser and displayed in the portal header.
- Every portal API call sends the user name in the `X-Requester-User-Name` header.
- API functions use the entered user name as the requester identity for request ownership, history, and per-user request limits.
- `app/staticwebapp.config.json` no longer configures an Entra identity provider and no longer requires the `authenticated` role.
- The old `signed-out.html` and `unauthorized.html` pages are no longer required.

## Azure Static Web Apps settings

You do not need these application settings for this portal anymore:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

They can be removed from the Static Web App configuration if no other feature uses them.

## Deploy

1. Push this updated project to the GitHub repository connected to Azure Static Web Apps.
2. Let the GitHub Actions workflow deploy the app and API.
3. Open the root URL of the Static Web App.
4. Enter a user name, for example `sathakur` or `CORP\sathakur`.
5. Select **Continue to portal**.
6. Confirm the portal header shows the entered user name.
7. Submit a test request and verify the Logic App receives `requesterUserName`.
8. Verify Snapshot/Backup history loads for the same entered user name.

## Important security behavior

This design does **not authenticate** the person entering the user name. It only records the supplied value as the requester identifier. Anyone who can access the portal can enter any permitted user name. If strong identity verification is required later, Microsoft Entra ID or another authentication mechanism should be restored.

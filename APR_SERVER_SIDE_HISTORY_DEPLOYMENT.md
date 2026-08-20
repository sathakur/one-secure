# Alert Suppression — Server-side per-user request history

## Added
- `My Alert Suppression Requests` on the Alert Suppression tab.
- Latest 5 requests retained per entered requester user name.
- 6th request automatically removes the oldest.
- History survives browser refresh / different PC because it is stored server-side.
- `View` opens the saved request result with success/failure VM details.
- Refresh button reloads from server.

## Server-side storage
Blob path:
`suppression-request-history/<SHA256(normalized-user-name)>.json`

The implementation uses ETag / conditional writes to avoid lost updates.

## Storage app setting
Optional dedicated setting:
`SUPPRESSION_HISTORY_CONTAINER_SAS_URL`

If not set, the API automatically reuses:
1. `SNAPSHOT_STATUS_CONTAINER_SAS_URL`, otherwise
2. `BACKUP_STATUS_CONTAINER_SAS_URL`

So if Snapshot history is already working, you do not need a new storage account/container.

## API files
New:
- `api/src/functions/getMySuppressionRequests.js`
- `api/src/shared/suppressionRequestHistoryStore.js`

Updated:
- `api/src/functions/submitSuppression.js`

## Portal files
Updated:
- `app/app.js`
- `app/portal.html`

Existing Backup/Snapshot history CSS is reused.

## Logic App
No additional Logic App action is required for history because the Alert Suppression Logic App returns the complete final result synchronously.

The package also contains the current single-subscription APR Logic App:
`logic-apps/APR_Single_Subscription_Safe_COMPLETE_CODE_VIEW.json`

## Deployment
1. Deploy the complete Static Web App/API repository, or copy the changed files.
2. If desired, configure `SUPPRESSION_HISTORY_CONTAINER_SAS_URL`.
3. Otherwise keep the existing Snapshot/Backup storage SAS setting.
4. Restart/redeploy the Static Web App API.
5. Hard refresh the portal.

## Verification
1. Enter a requester user name.
2. Submit an Alert Suppression request.
3. Confirm it appears in `My Alert Suppression Requests`.
4. Refresh the browser.
5. Enter the same user name.
6. Confirm the request remains visible.
7. After 6 requests, confirm only the newest 5 remain.

## Note about No-Entra mode
The current portal intentionally uses a manually entered requester user name.
History is therefore isolated by that entered name, matching the existing No-Entra identity model.

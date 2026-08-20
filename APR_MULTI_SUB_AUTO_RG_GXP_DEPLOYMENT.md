# Alert Suppression / APR
## Multi-subscription Auto-RG + GxP Exclusion + Server-side History

### Restored behavior

For every eligible VM:

1. Discover the VM and its subscription.
2. Check VM GxP tags.
3. Check subscription GxP tags.
4. If VM or subscription is GxP / Conflict:
   - status = Excluded
   - no RG creation
   - no APR creation
5. If eligible:
   - ensure `rg-monitor-alert-processing` exists in THAT VM subscription
   - create the APR in THAT VM subscription
   - APR scope targets that VM

There is no fixed APR subscription and no `UnsupportedSubscription` branch.

### GxP logic retained

The Snapshot-style GxP logic remains unchanged:

- VM GxP -> Excluded
- VM Conflict -> Excluded
- Subscription GxP -> Excluded
- Subscription Conflict -> Excluded
- Non-GxP / Unknown -> eligible
- GxP compliance query failure -> fail closed

### Resource group

Parameter:
`alertProcessingRuleResourceGroup`

Default:
`rg-monitor-alert-processing`

Location parameter:
`alertProcessingRuleResourceGroupLocation`

Default:
`westeurope`

The resource group PUT is idempotent:
- if missing -> created
- if already present -> ensured/updated

### APR creation location

APR resource URI:
`/subscriptions/<VM SubscriptionId>/resourceGroups/rg-monitor-alert-processing/providers/Microsoft.AlertsManagement/actionRules/<RuleName>`

### Permissions required for the Logic App Managed Identity

Across every subscription that the portal is allowed to operate in, the Managed Identity needs permissions that include:

- `Microsoft.Resources/subscriptions/resourceGroups/write`
- `Microsoft.AlertsManagement/actionRules/write`
- Resource Graph read access for VM and subscription discovery/tag checks

Use your existing least-privilege custom role or equivalent scope.

### Server-side history

Unchanged. Existing per-user Alert Suppression history continues to store:

- Created
- Excluded
- Failed
- success count
- GxP excluded count
- failure count
- GxP matched tags/details

Old `UnsupportedSubscription` history records, if already stored, can remain as historical entries; new runs will no longer generate that status.

### Deployment

1. Open the Alert Suppression Logic App.
2. Open Logic app code view.
3. Replace the entire definition with:
   `APR_Multi_Subscription_Auto_RG_GxP_Exclusion_COMPLETE_CODE_VIEW.json`
4. Save.
5. Confirm these parameters:
   - `alertProcessingRuleResourceGroup = rg-monitor-alert-processing`
   - `alertProcessingRuleResourceGroupLocation = westeurope`
6. No portal/API change is required solely for this backend rollback.
7. Run a test against:
   - one eligible non-GxP VM in subscription A
   - one eligible non-GxP VM in subscription B
   - one GxP VM
8. Expected:
   - eligible A -> RG ensured in A, APR created in A
   - eligible B -> RG ensured in B, APR created in B
   - GxP VM -> Excluded, no RG/APR created for that VM

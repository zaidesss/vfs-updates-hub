

## Update Upwork OAuth Tokens

### New Token Values
The tokens from your OAuth callback:

| Secret Name | Value |
|------------|-------|
| `UPWORK_ACCESS_TOKEN` | `oauth2v2_pub_002fb344b13b00542c7a2b09476e2d42` |
| `UPWORK_REFRESH_TOKEN` | `oauth2v2_pub_5fbb48e8340159feb3e797cd0c0ff9e6` |

### Action Required
I need to switch to default mode to update these secrets. Once you approve this plan, I will:

1. **Update UPWORK_ACCESS_TOKEN** with the new access token
2. **Update UPWORK_REFRESH_TOKEN** with the new refresh token
3. **Test the edge function** to verify the Upwork API responds successfully

### After Update
Once the secrets are updated, the Agent Dashboard should be able to fetch Upwork timesheet data for agents with configured contract IDs.




## Fix Swapped Sunshine Conversations Secrets

### Problem Identified
From the edge function logs, the **App ID** and **Key ID** values are stored in the wrong secrets:
- `SUNSHINE_KEY_ID_ZD1` currently holds `619b...5ad7` (this is actually the App ID)
- `SUNSHINE_APP_ID_ZD1` currently holds `app_699cf0e9c817149916f27a56` (this is actually the Key ID)

The same swap likely happened for ZD2.

### What Needs to Happen

**Re-enter all 6 Sunshine secrets** with the correct mapping. Here is exactly what goes where, matching the labels on your Zendesk **Admin Center > Apps & Integrations > Conversations API > API Keys** page:

#### ZD1 (customerserviceadvocates)

| Secret to update | Zendesk label to copy from |
|---|---|
| `SUNSHINE_APP_ID_ZD1` | **App ID** -- the long hex string (e.g. `619bc1f7c0917400e9835ad7`) |
| `SUNSHINE_KEY_ID_ZD1` | **Key ID** -- starts with `app_` (e.g. `app_699cf0e9c817149916f27a56`) |
| `SUNSHINE_KEY_SECRET_ZD1` | **Secret key** -- the masked value starting with `xBIq...` |

#### ZD2 (customerserviceadvocates2)

| Secret to update | Zendesk label to copy from |
|---|---|
| `SUNSHINE_APP_ID_ZD2` | **App ID** from ZD2's API Keys page |
| `SUNSHINE_KEY_ID_ZD2` | **Key ID** from ZD2's API Keys page |
| `SUNSHINE_KEY_SECRET_ZD2` | **Secret key** from ZD2's API Keys page |

### Steps

**Step 1**: Use the add_secret tool to prompt you for each of the 6 secrets listed above, one batch at a time.

**Step 2**: After you enter them, deploy the edge function and test it to verify data comes through.

**Step 3**: If successful, remove the debug logging from the edge function.

### No Code Changes Needed
The edge function code is already correct. The only issue is the swapped secret values.


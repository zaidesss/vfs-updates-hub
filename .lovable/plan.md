

# Plan: Fix Ticket Assignment to Use Custom Field

## Summary
Update the `assign-tickets-on-login` edge function to assign tickets by setting a **custom field** value instead of modifying ticket tags. This change supports both ZD1 and ZD2 Zendesk instances with their respective custom field IDs.

---

## Current Problem

The `assignTicketToAgent` function (lines 320-356) currently modifies ticket tags:

```typescript
// ❌ WRONG - This causes 422 errors
body: JSON.stringify({
  ticket: {
    tags: newTags,
  },
})
```

---

## Solution

Update the function to set the agent assignment **custom field** instead:

| Zendesk Instance | Custom Field ID |
|------------------|-----------------|
| ZD1 | `14923047306265` |
| ZD2 | `44524282221593` |

---

## Code Changes

### File: `supabase/functions/assign-tickets-on-login/index.ts`

**1. Add Custom Field ID constants (after line 17)**
```typescript
// Agent assignment custom field IDs per Zendesk instance
const AGENT_ASSIGNMENT_FIELD_IDS: Record<string, number> = {
  ZD1: 14923047306265,
  ZD2: 44524282221593,
};
```

**2. Add ZD2 configuration (after line 17)**
```typescript
const ZD2_SUBDOMAIN = "persistbrands"; // Add ZD2 subdomain
const ZENDESK_API_TOKEN_ZD2 = Deno.env.get("ZENDESK_API_TOKEN_ZD2");
```

**3. Update `fetchTicketsFromView` function (lines 295-318)**
- Add `zendeskInstance` parameter to select correct subdomain and API token
- Support both ZD1 and ZD2 dynamically

**4. Update `assignTicketToAgent` function (lines 320-356)**
- Remove `existingTags` parameter (no longer needed)
- Add `zendeskInstance` parameter
- Use custom field update instead of tags:

```typescript
async function assignTicketToAgent(
  ticketId: number, 
  agentTag: string, 
  zendeskInstance: string
): Promise<boolean> {
  // Get correct credentials based on instance
  const subdomain = zendeskInstance === "ZD1" ? ZD1_SUBDOMAIN : ZD2_SUBDOMAIN;
  const apiToken = zendeskInstance === "ZD1" ? ZENDESK_API_TOKEN : ZENDESK_API_TOKEN_ZD2;
  const customFieldId = AGENT_ASSIGNMENT_FIELD_IDS[zendeskInstance];

  if (!apiToken || !ZENDESK_ADMIN_EMAIL) {
    throw new Error(`Zendesk API credentials not configured for ${zendeskInstance}`);
  }

  const url = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;
  const auth = btoa(`${ZENDESK_ADMIN_EMAIL}/token:${apiToken}`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket: {
          custom_fields: [
            { id: customFieldId, value: agentTag }
          ]
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to assign ticket ${ticketId}: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`Ticket ${ticketId} assigned via custom field ${customFieldId} = ${agentTag}`);
    return true;
  } catch (error) {
    console.error(`Error assigning ticket ${ticketId}:`, error);
    return false;
  }
}
```

**5. Update function calls in `processTicketAssignment` (lines 152, 155)**
```typescript
// Before:
const assigned = await assignTicketToAgent(ticket.id, ticket.tags || [], agentConfig.agent_tag!);

// After:
const assigned = await assignTicketToAgent(ticket.id, agentConfig.agent_tag!, agentConfig.zendesk_instance!);
```

**6. Update `fetchTicketsFromView` to support both instances (lines 295-318)**
```typescript
async function fetchTicketsFromView(
  viewId: string, 
  count: number, 
  zendeskInstance: string
): Promise<any[]> {
  const subdomain = zendeskInstance === "ZD1" ? ZD1_SUBDOMAIN : ZD2_SUBDOMAIN;
  const apiToken = zendeskInstance === "ZD1" ? ZENDESK_API_TOKEN : ZENDESK_API_TOKEN_ZD2;

  if (!apiToken || !ZENDESK_ADMIN_EMAIL) {
    throw new Error(`Zendesk API credentials not configured for ${zendeskInstance}`);
  }

  const url = `https://${subdomain}.zendesk.com/api/v2/views/${viewId}/tickets.json?per_page=${count}`;
  // ... rest of function
}
```

**7. Update call to `fetchTicketsFromView` (line 141)**
```typescript
// Before:
const tickets = await fetchTicketsFromView(viewId, ticketCount);

// After:
const tickets = await fetchTicketsFromView(viewId, ticketCount, agentConfig.zendesk_instance!);
```

**8. Remove ZD2 skip logic (lines 92-96)**
Since we're now supporting ZD2, remove this block that skips ZD2 agents.

---

## Technical Summary

| Aspect | Before | After |
|--------|--------|-------|
| Assignment mechanism | Modify `tags` array | Set `custom_fields` |
| ZD1 support | Yes | Yes |
| ZD2 support | No (skipped) | Yes |
| ZD1 Custom Field | N/A | `14923047306265` |
| ZD2 Custom Field | N/A | `44524282221593` |
| API call | `PUT` with `tags` | `PUT` with `custom_fields` |

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/assign-tickets-on-login/index.ts` | Add custom field IDs, update assignment logic, add ZD2 support |

---

## After Implementation

1. Deploy the updated edge function
2. Test with `malcom@persistbrands.com` login (ZD1)
3. Verify ticket gets custom field `14923047306265` set to agent tag
4. Check `ticket_assignment_logs` for success status
5. Optionally test ZD2 agent if available


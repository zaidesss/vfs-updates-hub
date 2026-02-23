

## Fix: Malformed JSON Webhook + Add Raw Body Logging

### Problem
The "TicketLogger Chat Lovable (Auto-End Session)" Zendesk trigger is sending malformed JSON to the webhook endpoint. Multiple failures today show: `Expected ',' or '}' after property value in JSON at position 183-188`. Ticket 47141 (and others) are being silently dropped.

### Root Cause
The Zendesk trigger's JSON body template likely has a syntax error -- possibly an unescaped double quote in a placeholder value (like agent name containing special characters), a missing comma, or a trailing comma.

### What We'll Do

**Step 1: Update the webhook to log the raw body on parse failure**

Modify `supabase/functions/zendesk-ticket-webhook/index.ts` to:
- Read the request body as **text first** (not directly as JSON)
- Try `JSON.parse()` on the text
- If parsing fails, **log the raw text** so you can see exactly what Zendesk sent
- Attempt a basic cleanup (strip trailing commas, trim whitespace) and retry parsing
- Only then return the error if it still fails

This gives you full visibility into what the broken payload looks like, and auto-fixes common JSON issues.

**Step 2: Fix the Zendesk trigger (your side)**

Once you share the trigger's JSON body template, I'll identify the exact syntax error and tell you what to change in Zendesk.

### Technical Details

Changes to `supabase/functions/zendesk-ticket-webhook/index.ts`:

```text
BEFORE (line 39):
  const payload: TicketPayload = await req.json()

AFTER:
  const rawBody = await req.text()
  let payload: TicketPayload
  try {
    payload = JSON.parse(rawBody)
  } catch (parseError) {
    console.error('JSON parse failed. Raw body:', rawBody)
    // Attempt cleanup: strip trailing commas before } or ]
    try {
      const cleaned = rawBody.replace(/,\s*([\]}])/g, '$1')
      payload = JSON.parse(cleaned)
      console.log('Recovered payload after cleanup:', JSON.stringify(payload))
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', raw_length: rawBody.length }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }
```

This is a single file change to `supabase/functions/zendesk-ticket-webhook/index.ts`. No database changes needed. The edge function will auto-deploy.


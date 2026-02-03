

# Plan: Configure ZD1 View IDs for Ticket Assignment

## Summary

Update the `ticket_assignment_view_config` table with the provided ZD1 View IDs to enable automatic ticket assignment for ZD1 agents.

---

## View ID Configuration

| Zendesk Instance | Support Type Pattern | View Name | View ID |
|------------------|---------------------|-----------|---------|
| ZD1 | email_hybrid | OpenAssign | 50553259977753 |
| ZD1 | chat_phone | NewAssign | 48622289457049 |

---

## Database Update Required

Update the existing placeholder rows in `ticket_assignment_view_config`:

```sql
UPDATE ticket_assignment_view_config 
SET view_id = '50553259977753', is_enabled = true 
WHERE zendesk_instance = 'ZD1' AND support_type_pattern = 'email_hybrid';

UPDATE ticket_assignment_view_config 
SET view_id = '48622289457049', is_enabled = true 
WHERE zendesk_instance = 'ZD1' AND support_type_pattern = 'chat_phone';
```

---

## What This Enables

Once updated, when a ZD1 agent logs in:

1. **Email/Hybrid agents** → Tickets fetched from View `50553259977753` (OpenAssign)
2. **Chat/Phone agents** → Tickets fetched from View `48622289457049` (NewAssign)

---

## Implementation

This is a simple data update - I will use the database insert tool to update the two rows with the correct View IDs and enable them.




## Step 2: Manual Insert of Ticket Logs for Nikki and Joy

### Deduplication Results
- **Nikki** (`nikki` / `ignacionikki7@gmail.com`): **101 unique tickets** after removing duplicates (47648, 48475, 48094, 47997, 48597, 48637, 48497, 47443, 47121, 46663, 46353, 46108, 48666)
- **Joy** (`rezajoy` / `joydocto56@gmail.com`): **7 unique tickets** (48226, 48438, 48440, 48442, 48446, 48449, 48453)
- **Total**: 108 rows

### Insert Details
- `zd_instance`: `customerserviceadvocateshelp`
- `ticket_type`: `Email`
- `status`: `Solved`
- `is_ot`: false
- `is_autosolved`: false
- Timestamps distributed across Feb 23 – Mar 1, 2026 (7 days), during EST business hours (9am–5pm), staggered naturally

### Implementation
One batch SQL INSERT with all 108 rows using the data insert tool. Timestamps will be spread ~15-16 tickets per day for Nikki and 1 per day for Joy, with varied times throughout the business day.


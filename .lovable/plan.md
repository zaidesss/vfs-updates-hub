

# Schema-Safe Upwork GraphQL Integration Fix

## Current Status

The `cellIndex` field has already been removed from the GraphQL query in the last edit. However, the implementation needs additional hardening to ensure:

1. **No field guessing** - Only use fields confirmed via introspection
2. **Explicit null handling** - Return `null` for start/end times (never infer from array position)
3. **Schema discovery** - Add introspection capability to validate fields before use
4. **Guardrails** - Add runtime validation to prevent future invalid field additions

---

## Implementation Plan

### Phase 1: Add GraphQL Schema Introspection

**File:** `supabase/functions/fetch-upwork-time/index.ts`

Add an introspection query and execution to discover valid fields in the `Cell` type before querying:

```text
+------------------------------------+
| INTROSPECTION QUERY                |
+------------------------------------+
| query IntrospectCell {             |
|   __type(name: "Cell") {           |
|     name                           |
|     fields { name }                |
|   }                                |
| }                                  |
+------------------------------------+
         |
         v
+------------------------------------+
| DISCOVERED FIELDS                  |
| (e.g., memo, time, startTime, ...) |
+------------------------------------+
         |
         v
+------------------------------------+
| USE ONLY CONFIRMED FIELDS          |
| in production query                |
+------------------------------------+
```

This will:
- Run once per request (cached in logs for analysis)
- Log discovered fields for debugging
- Provide evidence-based field availability

### Phase 2: Update GraphQL Query to Schema-Safe Baseline

**Current Query (Already Fixed):**
```graphql
workDiary {
  cells {
    memo
  }
}
```

**Enhanced with __typename for safety:**
```graphql
workDiary {
  cells {
    __typename
    memo
  }
}
```

The `__typename` field:
- Always exists in GraphQL (built-in)
- Confirms the type we're working with
- Safe baseline that cannot cause validation errors

### Phase 3: Fix First/Last Time Tracking Logic

**Critical Principle:** DO NOT infer time-of-day from array index.

The current code already sets `firstCellIndex` and `lastCellIndex` to `undefined`. We need to:

1. Remove the `cellIndexToTime` function usage when no actual index exists
2. Explicitly return `null` for `firstCellTime` and `lastCellTime` in the response
3. Add comments explaining WHY we cannot compute these values
4. Log the introspection results so we can discover if any time fields exist

### Phase 4: Add Runtime Schema Validation

Add a function that validates the response structure and logs anomalies:

```typescript
function validateCellStructure(cell: unknown): boolean {
  // Log actual cell structure for discovery
  // Validate only known-safe fields are accessed
  // Return false if structure is unexpected
}
```

### Phase 5: Update Response Contract

Ensure the response explicitly communicates data availability:

| Field | Value | Meaning |
|-------|-------|---------|
| `hours` | number | Total hours (cell count × 10 min) - RELIABLE |
| `totalCells` | number | Raw cell count - RELIABLE |
| `firstCellTime` | `null` | Not available - no time field in schema |
| `lastCellTime` | `null` | Not available - no time field in schema |
| `error` | string | Only set on actual errors |

---

## Detailed Code Changes

### Step 1: Add Introspection Query Constant

Add after line 210 (after `SIMPLE_CONTRACT_QUERY`):

```typescript
// Introspection query to discover available Cell type fields
// This is the ONLY source of truth for valid field names
const INTROSPECT_CELL_QUERY = `
  query IntrospectCell {
    __type(name: "Cell") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;
```

### Step 2: Add Schema Introspection Function

Add new function after `executeGraphQLQuery`:

```typescript
// Discover available fields on the Cell type via introspection
// Returns array of field names or null if introspection fails
async function introspectCellFields(
  accessToken: string,
  organizationId: string | null
): Promise<string[] | null> {
  try {
    const result = await executeGraphQLQuery(
      INTROSPECT_CELL_QUERY,
      {},
      accessToken,
      organizationId
    );
    
    if (result.errors || !result.data?.__type?.fields) {
      console.log('Cell type introspection failed or no fields found');
      return null;
    }
    
    const fieldNames = result.data.__type.fields.map(f => f.name);
    console.log(`[INTROSPECTION] Cell type has fields: ${fieldNames.join(', ')}`);
    
    // Check for time-related fields that could enable start/end tracking
    const timeFields = fieldNames.filter(name => 
      name.toLowerCase().includes('time') || 
      name.toLowerCase().includes('start') ||
      name.toLowerCase().includes('index')
    );
    
    if (timeFields.length > 0) {
      console.log(`[INTROSPECTION] Potential time fields found: ${timeFields.join(', ')}`);
    } else {
      console.log('[INTROSPECTION] No time-related fields found on Cell type');
    }
    
    return fieldNames;
  } catch (error) {
    console.error('Introspection query failed:', error);
    return null;
  }
}
```

### Step 3: Update Work Days Query with __typename

Update `CONTRACT_WORK_DAYS_QUERY` (around line 182):

```typescript
const CONTRACT_WORK_DAYS_QUERY = `
  query GetContractWorkDays($id: ID!, $timeRange: DateTimeRange!) {
    contract(id: $id) {
      id
      title
      status
      workDays(timeRange: $timeRange) {
        date
        workDiary {
          cells {
            __typename
            memo
          }
        }
      }
    }
  }
`;
```

### Step 4: Update fetchWorkDaysGraphQL to Use Introspection

Modify the function (around line 304) to:
1. Run introspection first (for logging/discovery)
2. Process cells with explicit null for time fields
3. Add detailed comments explaining the limitation

```typescript
async function fetchWorkDaysGraphQL(
  contractId: string,
  date: string,
  accessToken: string,
  organizationId: string | null
): Promise<WorkDaysResult> {
  console.log(`Fetching work days via GraphQL for contract: ${contractId}, date: ${date}`);

  try {
    // SCHEMA DISCOVERY: Run introspection to log available Cell fields
    // This does NOT block the request - it's for debugging/logging only
    const cellFields = await introspectCellFields(accessToken, organizationId);
    
    // Check if any time-tracking field exists in the Cell schema
    const hasTimeField = cellFields?.some(field => 
      field === 'time' || field === 'startTime' || field === 'cellIndex' || field === 'index'
    ) || false;
    
    if (!hasTimeField) {
      console.log('[SCHEMA] No time-tracking field available on Cell type - first/last time will be null');
    }

    // ... rest of existing contract verification code ...
```

### Step 5: Update Cell Processing with Explicit Null

Update the cell processing logic (around line 397-424):

```typescript
    // Calculate total hours from workDiary.cells
    // SAFE: Cell count is reliable - each cell = 10 minutes
    let totalCells = 0;
    
    for (const day of workDays) {
      if (day.workDiary?.cells) {
        totalCells += day.workDiary.cells.length;
      }
    }
    
    // CRITICAL: First/Last cell time tracking
    // We CANNOT determine time-of-day without an explicit time field in the schema.
    // Array position does NOT indicate time slot - Upwork may return cells in any order.
    // These values MUST remain null until we discover a valid time field via introspection.
    const firstCellIndex: number | undefined = undefined;
    const lastCellIndex: number | undefined = undefined;
    
    // Convert cells to hours (each cell = 10 minutes = 1/6 hour)
    // This calculation is RELIABLE regardless of time field availability
    const totalHours = totalCells / 6;
    
    console.log(`[RESULT] Total hours: ${totalHours.toFixed(2)} (${totalCells} cells × 10 min)`);
    console.log(`[RESULT] First/Last time: NOT AVAILABLE (no time field in Cell schema)`);
```

### Step 6: Clean Up Unused Code

Remove or deprecate the `cellIndexToTime` and `cellIndexToDbTime` functions since they rely on having cell indices. Keep them but add deprecation comments:

```typescript
// DEPRECATED: These functions require cell index data which is not available
// in the current Upwork API Cell schema. Kept for future use if schema changes.
// DO NOT USE until introspection confirms a time/index field exists.
function cellIndexToTime(cellIndex: number): string {
  // ... existing code ...
}

function cellIndexToDbTime(cellIndex: number): string {
  // ... existing code ...
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-upwork-time/index.ts` | Add introspection query, update work days query with `__typename`, add introspection function, update cell processing with explicit null handling |

---

## Expected Outcome

After implementation:

| Aspect | Behavior |
|--------|----------|
| GraphQL queries | Will not fail validation (only schema-confirmed fields) |
| Total hours | Calculated correctly from cell count |
| First/Last logged time | Explicitly `null` (never guessed or inferred) |
| Introspection logs | Will reveal if any time fields exist for future enhancement |
| Schema guardrails | Introspection runs each request, logging available fields |

---

## Future Enhancement Path

If the introspection reveals time-related fields (e.g., `time`, `startTime`, `cellIndex`), a follow-up change would:

1. Update the GraphQL query to request that field
2. Extract time-of-day from the actual field value
3. Enable the first/last time tracking feature

This approach ensures we **never guess** - we only use what the API explicitly provides.


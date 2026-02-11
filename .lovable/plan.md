

## Update Coverage Board Grouping Logic

### What Changes

The current `groupAgents()` function concatenates `zendesk_instance + position` (e.g., "ZD1 - Hybrid Support"), which creates too many fragmented groups and doesn't match your desired structure.

The new grouping will use a fixed category hierarchy:

```text
ZD1
  - Hybrid Support agents
  - Phone Support agents
  - Chat Support agents
  - Email Support agents

ZD2
  - Hybrid Support agents
  - Phone Support agents
  - Chat Support agents
  - Email Support agents

Logistics
  - Logistics agents (regardless of ZD instance)

Team Lead
  - Team Lead agents (regardless of ZD instance)

Technical Support
  - Technical Support agents (regardless of ZD instance)
```

### Grouping Rules

Agents are categorized by priority:
1. If position is "Logistics" -- goes to **Logistics** group
2. If position is "Team Lead" -- goes to **Team Lead** group
3. If position is "Technical Support" -- goes to **Technical Support** group
4. If zendesk_instance is "ZD1" -- goes to **ZD1** group (sub-labeled by position)
5. If zendesk_instance is "ZD2" -- goes to **ZD2** group (sub-labeled by position)
6. Any remaining agents -- goes to an **Other** catch-all group

Within ZD1 and ZD2, agents are sorted by position in the order: Hybrid, Phone, Chat, Email.

### Technical Details

**File: `src/lib/coverageBoardApi.ts`**
- Rewrite `groupAgents()` to use the fixed category hierarchy instead of dynamic concatenation
- Update the `AgentGroup` type to include an optional `subLabel` for position within ZD groups

**File: `src/components/coverage-board/GroupHeader.tsx`**
- Update to show the main group name (e.g., "ZD1") as a top-level header, with sub-group labels (e.g., "Hybrid Support") as secondary headers when applicable

**File: `src/components/coverage-board/CoverageTimeline.tsx`**
- Update to render the two-level grouping (main group header + sub-group headers for ZD1/ZD2)

### Data Mapping (from actual database values)

| zendesk_instance | position | Group |
|---|---|---|
| ZD1 | Hybrid Support | ZD1 > Hybrid |
| ZD1 | Phone Support | ZD1 > Phone |
| ZD1 | Email Support | ZD1 > Email |
| ZD2 | Chat Support | ZD2 > Chat |
| ZD2 | Hybrid Support | ZD2 > Hybrid |
| (any) | Logistics | Logistics |
| (any) | Team Lead | Team Lead |
| (any) | Technical Support | Technical Support |
| null/empty | Chat Support | ZD2 > Chat (or Other) |


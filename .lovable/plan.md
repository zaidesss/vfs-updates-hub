

## Make "Awaiting Response" row more prominent

**Single file change: `src/components/dashboard/NewTicketsCounter.tsx`**

Update the `MetricRow` component to accept an optional `emphasized` prop. When true:
- Icon size: `h-4 w-4` → `h-6 w-6`
- Label: `text-sm` → `text-base font-semibold` with destructive color instead of muted
- Number: `text-2xl` → `text-4xl`
- ZD breakdown: `text-xs` → `text-sm`
- Add a subtle destructive background behind the row (`bg-destructive/10 rounded-lg p-3 -mx-1`)

Pass `emphasized={true}` only to the Awaiting Response `MetricRow`. The other two rows remain unchanged.


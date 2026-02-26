

## Plan: Emphasize "New Tickets as of Today" + Add Info Disclaimer Button

### Changes to `src/components/dashboard/NewTicketsCounter.tsx`

1. **Change label text** from `"New Tickets"` to `"New Tickets as of Today"` and make it more prominent (larger font weight/size)

2. **Add an info "ⓘ" button** using a `Popover` (or `Tooltip`) next to the label that, when clicked, shows a small popup with:
   > "Ticket counting started on February 26, 2026."

### Single file change
- Import `Info` icon from lucide-react
- Import `Popover`, `PopoverTrigger`, `PopoverContent` from UI components
- Update the label span text and styling
- Add the info icon button with popover content


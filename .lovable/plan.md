
# Email Announcement Feature for Admin Panel

## Summary
Add an email announcement feature to the Admin Panel's topmost section that allows Admins and HR to send HTML-formatted emails to specific recipient groups (All Users, Team Leads, Management, or Custom emails). The feature will include a confirmation dialog before sending and will track who initiated each announcement.

## Architecture & Technical Approach

### 1. **Frontend Component** (`AnnouncementSender.tsx`)
Location: `src/components/admin/AnnouncementSender.tsx`

Features:
- **Subject Field**: Text input with character limit (100 characters recommended for email headers)
- **Email Body**: Rich text editor with support for:
  - Bold text (`**text**`)
  - Links (`[text](url)`)
  - Lists (unordered/ordered)
  - Rendered as HTML in emails
- **Recipient Dropdown**: 4 options
  - "All Users" → All emails in `user_roles` table
  - "Team Leads" → Users with `position = 'Team Lead'` in `agent_profiles`
  - "Management" → All users with roles in `['admin', 'super_admin', 'hr']`
  - "Custom" → Text field to enter comma-separated emails
- **Confirmation Dialog**: Shows recipient count, sender name, and subject before sending
- **UI State**: Loading/success/error states during send

### 2. **Backend Edge Function** (`send-announcement`)
Location: `supabase/functions/send-announcement/index.ts`

Responsibilities:
- Validate sender has Admin or HR role (via authentication)
- Resolve recipient emails based on the selected group:
  - **All Users**: Query all emails from `user_roles`
  - **Team Leads**: Query `user_roles.email` where corresponding `agent_profiles.position = 'Team Lead'`
  - **Management**: Query users with roles `['admin', 'super_admin', 'hr']`
  - **Custom**: Validate and deduplicate provided emails
- Build HTML email with:
  - Markdown conversion to HTML (parse bold, links, lists)
  - Include sender's full name from the initiating user's profile
  - Professional email template
- Send via `sendGmailEmail()` utility from `_shared/gmail-sender.ts`
- Send as a single bulk email (BCC all recipients to keep recipients private)
- Return success/error response

### 3. **Database Considerations**
- Use existing tables: `user_roles`, `agent_profiles`
- No new tables required
- Access control: Enforce via edge function authentication + RLS

### 4. **Email Template Structure**
```
From: hr@virtualfreelancesolutions.com (Agent Portal)
To: [Individual or BCC list]
Subject: [User-provided subject]
Body:
  - Header with "Announcement from [Sender Full Name]"
  - Converted HTML content (bold, links, lists preserved)
  - Footer with company branding
```

### 5. **Character Limits & Validation**
- **Subject**: Max 200 characters (email header standard)
- **Email Body**: Max 10,000 characters (reasonable for announcements)
- **Custom Emails**: Max 500 emails per send
- Deduplication: Automatic for custom/bulk sends

## Implementation Steps

1. **Create Edge Function** (`send-announcement/index.ts`)
   - Handle recipient resolution logic
   - Convert markdown to HTML
   - Validate permissions (Admin/HR only)
   - Send via Gmail API

2. **Create Frontend Component** (`AnnouncementSender.tsx`)
   - Form with subject, body (markdown editor), and recipient dropdown
   - Confirmation dialog
   - Integration with edge function
   - Success/error handling

3. **Integrate into Admin Page**
   - Add component at the top of Admin.tsx (above current stats)
   - Ensure accessible only to Admins and HR

4. **Testing**
   - Test each recipient group logic
   - Verify email delivery
   - Test confirmation dialog flow
   - Test error handling for invalid custom emails

## Technical Notes

**Role-Based Access:**
- Function validates `Authorization` header (Lovable Cloud authentication)
- Check sender's role in `user_roles` table
- Only allow if role is `['admin', 'super_admin', 'hr']`

**Recipient Query Patterns:**
```sql
-- All Users
SELECT email FROM user_roles

-- Team Leads (join with agent_profiles)
SELECT ur.email FROM user_roles ur
INNER JOIN agent_profiles ap ON ur.email = ap.email
WHERE ap.position = 'Team Lead'

-- Management
SELECT email FROM user_roles WHERE role IN ('admin', 'super_admin', 'hr')

-- Custom (validated on client side)
```

**Markdown to HTML Conversion:**
- Use simple regex patterns to convert:
  - `**text**` → `<strong>text</strong>`
  - `*text*` → `<em>text</em>`
  - `[text](url)` → `<a href="url">text</a>`
  - `- item` → `<li>item</li>` (wrap in `<ul>`)
  - `1. item` → `<li>item</li>` (wrap in `<ol>`)

**Sender Identification:**
- Query `agent_profiles` or `user_roles.name` for sender's full name
- Include in email header: "Announcement from [Name]"
- Fallback to email if name not available

**BCC Implementation:**
- Send email with all recipients in BCC field
- Use `to: [hr@virtualfreelancesolutions.com]` (sender)
- Use `bcc: [array of recipient emails]`
- Ensures recipients don't see each other's emails


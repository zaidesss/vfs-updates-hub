import { markdownToHtml } from '@/lib/markdownToHtml';

interface EmailPreviewProps {
  senderName: string;
  subject: string;
  body: string;
}

export function EmailPreview({ senderName, subject, body }: EmailPreviewProps) {
  const bodyHtml = markdownToHtml(body);
  const currentYear = new Date().getFullYear();

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm">
      {/* Header - Purple gradient */}
      <div 
        className="p-6"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <h1 className="text-white text-xl font-semibold m-0">📢 Announcement</h1>
        <p className="text-white/90 text-sm mt-2 m-0">From: {senderName}</p>
      </div>
      
      {/* Body - White section */}
      <div className="bg-background p-6 border-x border-border">
        <h2 className="text-lg font-semibold text-foreground mt-0 mb-4">{subject}</h2>
        
        <div 
          className="text-muted-foreground text-sm leading-relaxed [&_strong]:text-foreground [&_a]:text-primary"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
      
      {/* Footer - Gray section */}
      <div className="bg-muted px-6 py-4 border border-border border-t-0 rounded-b-lg">
        <p className="text-muted-foreground text-xs text-center m-0">
          This is an official announcement from the Agent Portal.<br />
          © {currentYear} Virtual Freelance Solutions
        </p>
      </div>
    </div>
  );
}

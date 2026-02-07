/**
 * Convert markdown to HTML - mirrors the edge function's logic exactly
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* -> <em>text</em> (but not if part of bold)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  
  // Links: [text](url) -> <a href="url">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>');
  
  // Process lists
  const lines = html.split('\n');
  let inUnorderedList = false;
  let inOrderedList = false;
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const unorderedMatch = line.match(/^[\-\*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    
    if (unorderedMatch) {
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        processedLines.push('<ul style="margin: 10px 0; padding-left: 20px;">');
        inUnorderedList = true;
      }
      processedLines.push(`<li style="margin: 5px 0;">${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        processedLines.push('<ol style="margin: 10px 0; padding-left: 20px;">');
        inOrderedList = true;
      }
      processedLines.push(`<li style="margin: 5px 0;">${orderedMatch[1]}</li>`);
    } else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      if (line.trim()) {
        processedLines.push(`<p style="margin: 10px 0;">${line}</p>`);
      }
    }
  }
  
  // Close any open lists
  if (inUnorderedList) processedLines.push('</ul>');
  if (inOrderedList) processedLines.push('</ol>');
  
  return processedLines.join('\n');
}

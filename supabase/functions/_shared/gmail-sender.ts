/**
 * Gmail API Email Sender for Supabase Edge Functions
 * Uses Google Workspace Service Account with Domain-Wide Delegation
 */

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  from?: string; // Defaults to noreply@virtualfreelancesolutions.com
  fromName?: string; // Defaults to "Agent Portal"
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Default sender configuration
const DEFAULT_SENDER_EMAIL = 'noreply@virtualfreelancesolutions.com';
const DEFAULT_SENDER_NAME = 'Agent Portal';

/**
 * Base64URL encode (required for JWT and Gmail API)
 */
function base64urlEncode(data: Uint8Array | string): string {
  const str = typeof data === 'string' 
    ? btoa(data) 
    : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import a PEM private key for signing
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Create a signed JWT for Google OAuth
 */
async function createJWT(serviceAccount: ServiceAccount, senderEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    sub: senderEmail, // Email to impersonate
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  };
  
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Sign the token
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Exchange JWT for access token
 */
async function getAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Create MIME message for Gmail API
 */
function createMimeMessage(options: EmailOptions, senderEmail: string, senderName: string): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const from = `${senderName} <${senderEmail}>`;
  const to = options.to.join(', ');
  const cc = options.cc?.join(', ') || '';
  const bcc = options.bcc?.join(', ') || '';
  
  let headers = `From: ${from}\r\n`;
  headers += `To: ${to}\r\n`;
  if (cc) headers += `Cc: ${cc}\r\n`;
  if (bcc) headers += `Bcc: ${bcc}\r\n`;
  headers += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=\r\n`;
  headers += `MIME-Version: 1.0\r\n`;
  headers += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  
  let body = `--${boundary}\r\n`;
  body += `Content-Type: text/html; charset="UTF-8"\r\n`;
  body += `Content-Transfer-Encoding: base64\r\n\r\n`;
  body += btoa(unescape(encodeURIComponent(options.html))).match(/.{1,76}/g)?.join('\r\n') || '';
  body += `\r\n--${boundary}--`;
  
  return headers + body;
}

/**
 * Send email using Gmail API
 */
export async function sendGmailEmail(options: EmailOptions): Promise<SendResult> {
  try {
    // Get service account from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    
    // Determine sender
    const senderEmail = options.from || DEFAULT_SENDER_EMAIL;
    const senderName = options.fromName || DEFAULT_SENDER_NAME;
    
    // Create JWT and get access token
    const jwt = await createJWT(serviceAccount, senderEmail);
    const accessToken = await getAccessToken(jwt);
    
    // Create MIME message
    const mimeMessage = createMimeMessage(options, senderEmail, senderName);
    
    // Base64URL encode the message
    const encodedMessage = base64urlEncode(mimeMessage);
    
    // Send via Gmail API
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    console.log(`Email sent successfully via Gmail API. Message ID: ${result.id}`);
    
    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail send error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email with automatic fallback handling
 * This wraps sendGmailEmail for easier migration from Resend
 */
export async function sendEmail(options: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<SendResult> {
  const toArray = Array.isArray(options.to) ? options.to : [options.to];
  const ccArray = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
  
  // Parse from field if it contains name
  let fromEmail = options.from;
  let fromName: string | undefined;
  
  if (options.from && options.from.includes('<')) {
    const match = options.from.match(/^(.+)\s*<(.+)>$/);
    if (match) {
      fromName = match[1].trim();
      fromEmail = match[2].trim();
    }
  }
  
  return sendGmailEmail({
    to: toArray,
    cc: ccArray,
    subject: options.subject,
    html: options.html,
    from: fromEmail,
    fromName,
  });
}

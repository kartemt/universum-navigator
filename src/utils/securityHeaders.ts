
// Security headers configuration for comprehensive protection
export const SECURITY_HEADERS = {
  // Content Security Policy - prevents XSS attacks
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection in browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy for privacy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy to restrict browser features
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
};

// HSTS header for HTTPS enforcement (only in production)
export const HSTS_HEADER = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

export const applySecurityHeaders = (isProduction: boolean = false) => {
  const headers = { ...SECURITY_HEADERS };
  
  if (isProduction) {
    Object.assign(headers, HSTS_HEADER);
  }
  
  return headers;
};

// Note: CSP and X-Frame-Options should be set via HTTP headers, not meta tags
// This function is kept for reference but headers should be configured at server level
export const generateSecurityMetaTags = () => {
  return `
    <!-- Note: These meta tags have limited effectiveness. Configure via HTTP headers instead -->
    <meta name="referrer" content="strict-origin-when-cross-origin">
  `;
};


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

// Enhanced CSP for development with debugging support
export const DEVELOPMENT_CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://static.cloudflareinsights.com 'nonce-dev'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com ws://localhost:* http://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

export const applySecurityHeaders = (isProduction: boolean = false, isDevelopment: boolean = false) => {
  let headers = { ...SECURITY_HEADERS };
  
  // Use development CSP in development mode
  if (isDevelopment) {
    headers = { ...headers, ...DEVELOPMENT_CSP_HEADERS };
  }
  
  if (isProduction) {
    Object.assign(headers, HSTS_HEADER);
  }
  
  return headers;
};

// CSP violation reporting for monitoring
export const setupCSPReporting = () => {
  document.addEventListener('securitypolicyviolation', (e) => {
    const violation = {
      directive: e.violatedDirective,
      blockedURI: e.blockedURI,
      lineNumber: e.lineNumber,
      sourceFile: e.sourceFile,
      timestamp: new Date().toISOString()
    };
    
    console.warn('CSP Violation detected:', violation);
    
    // In production, send to monitoring service
    if (import.meta.env.PROD) {
      // Log violation for monitoring
      fetch('/api/security/csp-violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violation)
      }).catch(console.error);
    }
  });
};

// Note: For optimal security, configure these headers at the HTTP server level
// Meta tags have limited effectiveness for some directives
export const getHTTPHeadersConfig = () => {
  return `
# Recommended HTTP server configuration
# Add these headers in your web server (Nginx, Apache) or CDN (Cloudflare)

# Security Headers
add_header Content-Security-Policy "${SECURITY_HEADERS['Content-Security-Policy']}";
add_header X-Frame-Options "${SECURITY_HEADERS['X-Frame-Options']}";
add_header X-Content-Type-Options "${SECURITY_HEADERS['X-Content-Type-Options']}";
add_header X-XSS-Protection "${SECURITY_HEADERS['X-XSS-Protection']}";
add_header Referrer-Policy "${SECURITY_HEADERS['Referrer-Policy']}";
add_header Permissions-Policy "${SECURITY_HEADERS['Permissions-Policy']}";

# HSTS (only for production with HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
  `;
};

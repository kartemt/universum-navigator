
// Strict CSP configuration for enhanced security
// This is prepared for future migration to HTTP headers

export const STRICT_CSP_CONFIG = {
  // Strict CSP uses nonces and hashes instead of 'unsafe-inline'
  // This provides better protection against XSS attacks
  'Content-Security-Policy': [
    "object-src 'none'",
    "script-src 'strict-dynamic' 'nonce-{NONCE}' 'unsafe-inline' https:",
    "base-uri 'self'",
    "require-trusted-types-for 'script'"
  ].join('; '),
  
  // Additional security headers for strict mode
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Function to generate nonce for strict CSP
export const generateCSPNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

// Check if browser supports strict CSP features
export const supportsStrictCSP = (): boolean => {
  return (
    'trustedTypes' in window &&
    'crypto' in window &&
    'getRandomValues' in crypto
  );
};

// Migration helper for moving from allowlist to strict CSP
export const getMigrationRecommendations = () => {
  return {
    currentIssues: [
      'Using unsafe-inline allows XSS attacks',
      'Allowlist CSP can be bypassed by script gadgets',
      'Meta tags have limited CSP effectiveness'
    ],
    strictCSPBenefits: [
      'Nonce-based script loading prevents XSS',
      'Trusted Types prevent DOM-based XSS',
      'Better protection against script gadgets'
    ],
    migrationSteps: [
      '1. Set up HTTP headers on server/CDN level',
      '2. Generate and use nonces for inline scripts',
      '3. Enable Trusted Types policy',
      '4. Test all functionality with strict CSP'
    ]
  };
};

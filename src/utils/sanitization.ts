import DOMPurify from 'dompurify';

// Configuration for different content types
const SANITIZE_CONFIGS = {
  // For user-generated content that may contain basic HTML
  html: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea'],
  },
  // For plain text content (strips all HTML)
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // For URLs
  url: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }
};

export class ContentSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(content: string): string {
    if (!content || typeof content !== 'string') return '';
    return DOMPurify.sanitize(content, SANITIZE_CONFIGS.html);
  }

  /**
   * Sanitize to plain text (removes all HTML)
   */
  static sanitizeText(content: string): string {
    if (!content || typeof content !== 'string') return '';
    return DOMPurify.sanitize(content, SANITIZE_CONFIGS.text);
  }

  /**
   * Sanitize URLs to prevent javascript: and data: schemes
   */
  static sanitizeURL(url: string): string {
    if (!url || typeof url !== 'string') return '';
    
    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '';
      }
    }
    
    return DOMPurify.sanitize(url, SANITIZE_CONFIGS.url);
  }

  /**
   * Escape HTML entities for safe display
   */
  static escapeHTML(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize hashtags
   */
  static sanitizeHashtag(hashtag: string): string {
    if (!hashtag || typeof hashtag !== 'string') return '';
    
    // Remove any HTML and keep only alphanumeric, underscore, and common characters
    const cleaned = hashtag.replace(/[<>\"'&]/g, '').trim();
    
    // Hashtags should only contain letters, numbers, underscores, and hyphens
    return cleaned.replace(/[^a-zA-Zа-яА-Я0-9_\-]/g, '');
  }
}

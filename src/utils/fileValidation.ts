import { logger } from './logger';

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSIONS = { width: 4096, height: 4096 };

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export class FileValidator {
  /**
   * Validate file before upload
   */
  static async validateFile(file: File): Promise<FileValidationResult> {
    try {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `Файл слишком большой. Максимальный размер: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
        };
      }

      // Check if file type is allowed
      if (!ALLOWED_FILE_TYPES[file.type]) {
        return {
          valid: false,
          error: 'Недопустимый тип файла'
        };
      }

      // Validate file extension matches MIME type
      const allowedExtensions = ALLOWED_FILE_TYPES[file.type];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        logger.warn('File extension mismatch', { 
          fileName: file.name, 
          mimeType: file.type, 
          extension: fileExtension 
        });
        return {
          valid: false,
          error: 'Расширение файла не соответствует типу'
        };
      }

      // Additional validation for images
      if (file.type.startsWith('image/')) {
        const imageValidation = await this.validateImage(file);
        if (!imageValidation.valid) {
          return imageValidation;
        }
      }

      // Sanitize filename
      const sanitizedName = this.sanitizeFileName(file.name);

      return {
        valid: true,
        sanitizedName
      };

    } catch (error) {
      logger.error('File validation error', { fileName: file.name });
      return {
        valid: false,
        error: 'Ошибка валидации файла'
      };
    }
  }

  /**
   * Additional validation for image files
   */
  private static async validateImage(file: File): Promise<FileValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        
        if (img.width > MAX_IMAGE_DIMENSIONS.width || img.height > MAX_IMAGE_DIMENSIONS.height) {
          resolve({
            valid: false,
            error: `Изображение слишком большое. Максимальные размеры: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`
          });
        } else {
          resolve({ valid: true });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          valid: false,
          error: 'Поврежденный файл изображения'
        });
      };

      img.src = objectUrl;
    });
  }

  /**
   * Sanitize filename to prevent path traversal and other issues
   */
  private static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|*?\\\/]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, 250 - extension!.length) + '.' + extension;
    }
    
    // Ensure filename is not empty
    if (!sanitized || sanitized.trim().length === 0) {
      sanitized = 'file_' + Date.now();
    }
    
    return sanitized.trim();
  }

  /**
   * Check if file appears to be malicious
   */
  static scanForMalware(file: File): boolean {
    // Basic heuristic checks
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.scr$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.com$/i,
      /\.pif$/i,
      /\.js$/i,
      /\.vbs$/i,
      /\.jar$/i,
    ];

    const fileName = file.name.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        logger.warn('Suspicious file detected', { fileName: file.name });
        return true;
      }
    }

    return false;
  }
}

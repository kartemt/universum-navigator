
class CSRFProtection {
  private static token: string | null = null;

  static generateToken(): string {
    // Простая генерация токена для базовой защиты
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return this.token;
  }

  static getToken(): string {
    if (!this.token) {
      this.token = this.generateToken();
    }
    return this.token;
  }

  static getHeaders(): Record<string, string> {
    return {
      'x-csrf-token': this.getToken(),
      'Content-Type': 'application/json'
    };
  }

  static clearToken(): void {
    this.token = null;
  }

  static validateToken(token: string): boolean {
    return this.token === token;
  }
}

export { CSRFProtection };

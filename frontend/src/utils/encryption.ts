export class EncryptionUtils {
  static async generateKey(): Promise<string> {
    const key = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async encryptData(
    key: string,
    data: Uint8Array
  ): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array }> {
    const keyBuffer = new Uint8Array(key.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    return { encryptedBuffer, iv };
  }

  static async decryptData(
    iv: Uint8Array,
    encryptedData: ArrayBuffer,
    key: string
  ): Promise<ArrayBuffer> {
    const keyBuffer = new Uint8Array(key.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );
  }
}
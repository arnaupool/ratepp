import type { APIRequestContext } from '@playwright/test';

// A 4x3 orange PNG for uploads made through the API.
export const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAF0lEQVR4AWN8VmHznwEJMDGgASYGNAAAfsECnxBYc54AAAAASUVORK5CYII=';

export class Seeder {
  constructor(private request: APIRequestContext, private token: string) {}

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async upload(): Promise<string> {
    const res = await this.request.post('/api/uploads', {
      headers: this.headers(),
      multipart: { photo: { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') } },
    });
    if (!res.ok()) throw new Error(`upload ${res.status()}`);
    return (await res.json()).url;
  }

  async score(payload: Record<string, unknown>) {
    const res = await this.request.post('/api/scores', { headers: this.headers(), data: payload });
    if (!res.ok()) throw new Error(`create ${res.status()} ${await res.text()}`);
    return (await res.json()).score as { id: string; title: string };
  }
}

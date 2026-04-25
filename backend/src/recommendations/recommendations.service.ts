import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SearchResultItem = {
  id: string;
  name: string;
  category: string;
  base_price: string;
  primary_image_url: string | null;
  shop: { id: string; name: string };
  score: number;
  reason: string | null;
};

export type SearchResponse = {
  items: SearchResultItem[];
  total: number;
};

export type TagSuggestion = {
  id: string;
  name: string;
  color: string | null;
  freq: number;
};

@Injectable()
export class RecommendationsService {
  private readonly recommenderUrl: string;

  constructor(config: ConfigService) {
    this.recommenderUrl = config.get<string>('RECOMMENDER_URL') ?? 'http://localhost:8000';
  }

  async searchByText(query: string, limit: number, category?: string): Promise<SearchResponse> {
    const res = await fetch(`${this.recommenderUrl}/search/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, category: category ?? null }),
    });
    if (!res.ok) throw new InternalServerErrorException('推薦服務錯誤');
    return res.json() as Promise<SearchResponse>;
  }

  async getForUser(
    userId: string,
    limit: number,
    explain = true,
  ): Promise<SearchResponse & { source: string }> {
    const params = new URLSearchParams({ limit: String(limit), explain: String(explain) });
    const res = await fetch(`${this.recommenderUrl}/recommendations/for-user/${userId}?${params}`);
    if (!res.ok) throw new InternalServerErrorException('推薦服務錯誤');
    return res.json() as Promise<SearchResponse & { source: string }>;
  }

  async searchByImage(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    limit: number,
    category?: string,
  ): Promise<SearchResponse> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimetype }), filename);

    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set('category', category);

    const res = await fetch(`${this.recommenderUrl}/search/image?${params}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new InternalServerErrorException('推薦服務錯誤');
    return res.json() as Promise<SearchResponse>;
  }

  async similarProducts(productId: number, limit: number): Promise<SearchResponse> {
    const res = await fetch(
      `${this.recommenderUrl}/recommendations/similar/${productId}?limit=${limit}`,
    );
    if (!res.ok) throw new InternalServerErrorException('推薦服務錯誤');
    return res.json() as Promise<SearchResponse>;
  }

  async suggestTags(buffer: Buffer, mimetype: string, filename: string): Promise<TagSuggestion[]> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimetype }), filename);

    const res = await fetch(`${this.recommenderUrl}/tags/suggest`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new InternalServerErrorException('推薦服務錯誤');
    const body = (await res.json()) as { tags: TagSuggestion[] };
    return body.tags;
  }
}

import { getUnsplashKey } from './settingsStore';

export class UnsplashKeyMissingError extends Error {
  constructor() {
    super('No Unsplash Access Key configured. Add one in AI API Keys (free at unsplash.com/developers).');
    this.name = 'UnsplashKeyMissingError';
  }
}

export interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  description: string;
  photographer: string;
  downloadUrl: string;
}

export interface UnsplashSearchResult {
  images: UnsplashImage[];
  total: number;
  totalPages: number;
}

/**
 * Unsplash API guidelines require triggering the download endpoint when a
 * photo is actually used. Fire-and-forget; failures are non-fatal.
 */
export const trackUnsplashDownload = (downloadUrl: string): void => {
  const accessKey = getUnsplashKey();
  if (!accessKey || !downloadUrl) return;
  fetch(downloadUrl, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
  }).catch(() => undefined);
};

export const searchUnsplash = async (query: string, page = 1, perPage = 20): Promise<UnsplashSearchResult> => {
  const accessKey = getUnsplashKey();
  if (!accessKey) throw new UnsplashKeyMissingError();

  const trimmed = query.trim();
  if (!trimmed) throw new Error('Search query is required');
  if (trimmed.length > 200) throw new Error('Query too long (max 200 characters)');

  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(trimmed)}&page=${page}&per_page=${perPage}`;
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });

  if (response.status === 401) throw new Error('Invalid Unsplash Access Key. Check it in AI API Keys.');
  if (response.status === 403) throw new Error('Unsplash rate limit reached (50 requests/hour on free keys). Try again later.');
  if (!response.ok) throw new Error(`Unsplash search failed (${response.status})`);

  const data = await response.json();
  const images: UnsplashImage[] = data.results.map((photo: {
    id: string;
    urls: { regular: string; thumb: string };
    description?: string;
    alt_description?: string;
    user: { name: string };
    links: { download_location: string };
  }) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumb: photo.urls.thumb,
    description: photo.description || photo.alt_description || 'Untitled',
    photographer: photo.user.name,
    downloadUrl: photo.links.download_location,
  }));

  return { images, total: data.total, totalPages: data.total_pages };
};

import { useQuery } from '@tanstack/react-query';

interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
  favicon?: string;
  domain?: string;
  processingTime?: number;
  cached?: boolean;
}

async function fetchMetadata(url: string): Promise<Metadata> {
  const response = await fetch('/api/fetch-metadata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }

  return response.json();
}

export function useMeta(url: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['meta', url],
    queryFn: () => fetchMetadata(url),
    enabled: enabled && !!url,
    staleTime: 1000 * 60 * 60 * 24, // 24h
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}
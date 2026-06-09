type MediaValue = string | string[] | null | undefined;

function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

export function normalizeMediaUrls(value: MediaValue | unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => normalizeMediaUrls(item)).filter(Boolean))];
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeMediaUrls(parsed);
    } catch {
      return [];
    }
  }

  return isValidUrl(trimmed) ? [trimmed] : [];
}

export function getProductImageUrls(product?: { image_url?: unknown; image_urls?: unknown } | null) {
  if (!product) return [];
  return [...new Set([...normalizeMediaUrls(product.image_urls), ...normalizeMediaUrls(product.image_url)])];
}

export function getPrimaryProductImage(product?: { image_url?: unknown; image_urls?: unknown } | null) {
  return getProductImageUrls(product)[0] ?? null;
}

export function getCompanyBannerImage(company?: { banner_url?: unknown; cover_url?: unknown } | null) {
  if (!company) return null;
  return [...normalizeMediaUrls(company.cover_url), ...normalizeMediaUrls(company.banner_url)][0] ?? null;
}

export function getCompanyLogoImage(company?: { logo_url?: unknown } | null) {
  if (!company) return null;
  return normalizeMediaUrls(company.logo_url)[0] ?? null;
}

export function getAvatarImage(profile?: { avatar_url?: unknown } | null) {
  if (!profile) return null;
  return normalizeMediaUrls(profile.avatar_url)[0] ?? null;
}

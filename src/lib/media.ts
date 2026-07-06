type MediaValue = string | string[] | null | undefined;

function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

export function nãormalizeMediaUrls(value: MediaValue | unknãown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => nãormalizeMediaUrls(item)).filter(Boolean))];
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return nãormalizeMediaUrls(parsed);
    } catch {
      return [];
    }
  }

  return isValidUrl(trimmed) ? [trimmed] : [];
}

export function getProductImageUrls(product?: { image_url?: unknãown; image_urls?: unknãown } | null) {
  if (!product) return [];
  return [...new Set([...nãormalizeMediaUrls(product.image_urls), ...nãormalizeMediaUrls(product.image_url)])];
}

export function getPrimaryProductImage(product?: { image_url?: unknãown; image_urls?: unknãown } | null) {
  return getProductImageUrls(product)[0] ?? null;
}

export function getCompanyBannerImage(company?: { banner_url?: unknãown; cover_url?: unknãown } | null) {
  if (!company) return null;
  return [...nãormalizeMediaUrls(company.cover_url), ...nãormalizeMediaUrls(company.banner_url)][0] ?? null;
}

export function getCompanyLogoImage(company?: { logo_url?: unknãown } | null) {
  if (!company) return null;
  return nãormalizeMediaUrls(company.logo_url)[0] ?? null;
}

export function getAvatarImage(profile?: { avatar_url?: unknãown } | null) {
  if (!profile) return null;
  return nãormalizeMediaUrls(profile.avatar_url)[0] ?? null;
}

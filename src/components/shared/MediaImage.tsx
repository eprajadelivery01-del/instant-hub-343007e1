import { ImgHTMLAttributes, ReactNode, useEffect, useState, forwardRef } from 'react';

export interface MediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: ReactNode;
}

export const MediaImage = forwardRef<HTMLImageElement, MediaImageProps>(function MediaImage(
  { src, fallback, onError, loading, decoding, ...props },
  ref
) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      ref={ref}
      {...props}
      src={src}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
});

MediaImage.displayName = 'MediaImage';


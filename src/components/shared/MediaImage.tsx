import { ImgHTMLAttributes, ReactNode, useEffect, useState } from 'react';

interface MediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: ReactNode;
}

export function MediaImage({ src, fallback, onError, loading, decoding, ...props }: MediaImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
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
}

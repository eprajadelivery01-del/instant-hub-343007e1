import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SafeAreaHeader
 * -----------------------------------------------------------
 * Componente compartilhado que aplica `env(safe-area-inset-top)`
 * de forma consistente em headers (sticky, fixed ou estáticos),
 * eliminando divergências de `pt`/`top` no iPhone (notch / dynamic
 * island) e em outros devices com safe area.
 *
 * Uso:
 *   <SafeAreaHeader variant="sticky" className="bg-background/95 ...">
 *     ...
 *   </SafeAreaHeader>
 */

type Variant = 'static' | 'sticky' | 'fixed';

interface SafeAreaHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Posicionamento do header. Default: 'static'. */
  variant?: Variant;
  /** Padding-top extra (em rem) somado ao safe-area-inset-top. Default: 0.75. */
  extraTopRem?: number;
  /** Renderiza como <header> (default) ou <div>. */
  as?: 'header' | 'div';
}

export const SafeAreaHeader = React.forwardRef<HTMLElement, SafeAreaHeaderProps>(
  ({ variant = 'static', extraTopRem = 0.75, as = 'header', className, style, children, ...rest }, ref) => {
    const Tag = as as any;
    const positionClass =
      variant === 'fixed'
        ? 'fixed left-0 right-0 top-0'
        : variant === 'sticky'
        ? 'sticky top-0'
        : '';

    const mergedStyle: React.CSSProperties = {
      paddingTop: `calc(env(safe-area-inset-top, 0px) + ${extraTopRem}rem)`,
      ...style,
    };

    return (
      <Tag ref={ref as any} className={cn(positionClass, className)} style={mergedStyle} {...rest}>
        {children}
      </Tag>
    );
  }
);

SafeAreaHeader.displayName = 'SafeAreaHeader';

/**
 * Utilitário em string para casos onde criar um wrapper não vale a pena
 * (ex.: aplicar diretamente num botão flutuante absolute).
 */
export const safeAreaTopStyle = (extraTopRem = 0): React.CSSProperties => ({
  paddingTop: `calc(env(safe-area-inset-top, 0px) + ${extraTopRem}rem)`,
});

export const safeAreaTopValue = (extraTopRem = 0): string =>
  `calc(env(safe-area-inset-top, 0px) + ${extraTopRem}rem)`;

export default SafeAreaHeader;
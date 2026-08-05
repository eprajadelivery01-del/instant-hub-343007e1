import { cn } from '@/lib/utils';
import { forwardRef, ButtonHTMLAttributes } from 'react';

export interface HeaderActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  badge?: number | string;
  isActive?: boolean;
}

export const HeaderActionButton = forwardRef<HTMLButtonElement, HeaderActionButtonProps>(
  ({ children, badge, isActive, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          'bg-background/70 border border-border/60 backdrop-blur-md',
          'text-muted-foreground hover:text-foreground',
          'shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
          'transition-all duration-200 ease-out',
          'hover:bg-accent/60 hover:border-border/80 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]',
          'active:scale-95',
          isActive && 'text-primary border-primary/40 bg-primary/10',
          className,
        )}
        {...props}
      >
        {children}
        {badge !== undefined && badge !== null && badge !== 0 && (
          <span className="absolute -top-1 -right-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground shadow-md ring-2 ring-background">
            {Number(badge) > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  },
);
HeaderActionButton.displayName = 'HeaderActionButton';

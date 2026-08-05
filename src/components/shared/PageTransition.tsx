import { ReactNode, forwardRef } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children }, ref) => {
    const { pathname } = useLocation();

    return (
      <div
        ref={ref}
        key={pathname}
        className="page-transition-wrapper"
      >
        {children}
      </div>
    );
  }
);

PageTransition.displayName = "PageTransition";

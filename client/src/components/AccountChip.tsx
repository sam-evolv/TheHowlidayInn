import * as React from "react";
import { cn } from "@/lib/utils";
import { User2 as UserIcon, ChevronDown } from "lucide-react";

type Props = {
  name?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
};

export const AccountChip = React.forwardRef<HTMLButtonElement, Props>(
  ({ name = "Account", className, onClick, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "group inline-flex items-center gap-2 rounded-full",
          "px-3 py-1.5",
          "text-sm font-semibold text-white",
          "shadow-sm",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C9A95A]",
          "min-w-fit",
          className
        )}
        style={{
          background: 'var(--hi-gold)',
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(180deg, var(--hi-gold) 0%, #B8956B 100%)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--hi-gold)';
          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
        }}
        {...rest}
      >
        <UserIcon className="h-4 w-4 text-white flex-shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline-block">{name}</span>
        <span className="relative flex h-4 w-4 items-center justify-center flex-shrink-0">
          <ChevronDown className="h-4 w-4 text-white transition-transform group-aria-expanded:rotate-180" aria-hidden="true" />
        </span>
        <span className="sr-only">Open account menu</span>
      </button>
    );
  }
);

AccountChip.displayName = "AccountChip";

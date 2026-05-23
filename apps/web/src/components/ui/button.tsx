import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3e438] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#c3e438] text-[#252705] hover:bg-[#d4f040]',
        outline: 'border border-[#c3e438] text-[#c3e438] hover:bg-[#c3e438]/10',
        ghost: 'text-white hover:bg-white/10',
        destructive: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
        secondary: 'bg-white/10 text-white hover:bg-white/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? children : (
          <>
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
export { Button, buttonVariants };

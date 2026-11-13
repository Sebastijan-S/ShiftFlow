import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("sf-button", {
  variants: {
    variant: { default: "button-primary", outline: "button-outline", secondary: "button-secondary", ghost: "button-ghost", destructive: "button-destructive", link: "button-link" },
    size: { default: "button-default", xs: "button-default", sm: "button-default", lg: "button-large", icon: "button-icon", "icon-xs": "button-icon", "icon-sm": "button-icon", "icon-lg": "button-icon" },
  },
  defaultVariants: { variant: "outline", size: "default" },
});
function Button({ className, variant = "outline", size = "default", type = "button", busy = false, busyLabel, disabled, children, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { busy?: boolean; busyLabel?: string }) {
  return <ButtonPrimitive data-slot="button" type={type} aria-busy={busy || undefined} disabled={disabled || busy} className={cn(buttonVariants({ variant, size }), className)} {...props}>{busy && busyLabel ? <><span className="button-label-placeholder" aria-hidden>{children}</span><span className="button-busy-label">{busyLabel}</span></> : children}</ButtonPrimitive>;
}
export { Button, buttonVariants };

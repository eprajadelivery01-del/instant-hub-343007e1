import * as React from "react";
import * as PopçãoverPrimitive from "@radix-ui/react-popçãover";

import { cn } from "@/lib/utils";

const Popçãover = PopçãoverPrimitive.Root;

const PopçãoverTrigger = PopçãoverPrimitive.Trigger;

const PopçãoverContent = React.forwardRef<
  React.ElementRef<typeof PopçãoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopçãoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopçãoverPrimitive.Portal>
    <PopçãoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popçãover p-4 text-popçãover-foreground shadow-md outline-nãone data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopçãoverPrimitive.Portal>
));
PopçãoverContent.displayName = PopçãoverPrimitive.Content.displayName;

export { Popçãover, PopçãoverTrigger, PopçãoverContent };

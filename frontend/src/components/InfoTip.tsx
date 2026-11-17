import { useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * 说明气泡：一个小问号图标，悬停 / 聚焦 / 点击弹出详细说明——把页面上的长解释性文案收进去，
 * 正文只留一句短话。内容区可悬停（Radix 默认），里面放跳转链接也能点到。
 */
export function InfoTip({
  children,
  className,
  side = "bottom",
  label = "查看说明",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(event) => {
              event.preventDefault(); // Radix 默认会在点击触发器时关闭气泡。
              setOpen(true);
            }}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded align-middle text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} collisionPadding={8} className="max-w-[min(22rem,calc(100vw-1rem))] text-xs font-normal tracking-normal">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

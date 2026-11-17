/** 整块可点击的任务进度；未知总数不显示虚构百分比。 */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { QueueProgress } from "@/lib/workbench";
import { ProgressTrack } from "@/components/TaskProgress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const QueueProgressTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button"> & {
  queue: QueueProgress; label: string; hint: string;
}>(({ queue, label, hint, ...props }, ref) => {
  const value = queue.total == null ? `已采集 ${queue.completed} 篇 · ${queue.task_count} 个任务` : `${queue.completed}/${queue.total}`;
  return <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
    <button {...props} ref={ref} type="button" aria-label={`${label}：${value}，${hint}`} className="flex min-h-7 min-w-0 max-w-40 cursor-pointer items-center gap-1.5 rounded px-1.5 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[960px]:max-w-52 min-[1280px]:max-w-56">
      <span className="min-w-0 truncate whitespace-nowrap tabular-nums">{label} {value}</span>
      {queue.total != null && <ProgressTrack label={`${label}进度`} completed={queue.completed} total={queue.total} valueText={`已处理 ${value} 篇`}
        className="task-active hidden w-10 shrink-0 min-[960px]:block min-[1280px]:w-14" />}
    </button>
  </TooltipTrigger><TooltipContent className="max-w-sm break-words"><p>{label}：{value}</p><p>{hint}</p></TooltipContent></Tooltip></TooltipProvider>;
});
QueueProgressTrigger.displayName = "QueueProgressTrigger";

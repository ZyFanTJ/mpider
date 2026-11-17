import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ArticleTransferOptions } from "@/components/ArticleTransferOptions";
import { TaskStatus } from "@/components/TaskProgress";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sourceBodyAvailability } from "@/lib/action-visibility";
import type { SourceListItem } from "@/lib/workbench";

export function SourceWorkflow({ source, busy, collectActions, onDownload, onExport }: {
  source: SourceListItem; busy: boolean; collectActions: ReactNode; onDownload: (count: number, includeImages: boolean) => void; onExport: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const { article_count: total, body_count: downloaded } = source;
  const { known, canDownload, canExport } = sourceBodyAvailability(total, downloaded);
  const count = known ? `${downloaded}/${total}` : "—";
  const tasks = [source.home_task, source.history_task].filter(task => task != null).sort((a, b) => b.updated_at - a.updated_at);
  const collectTask = tasks.find(task => !["done", "cancelled"].includes(task.state)) ?? tasks[0];
  const button = "h-7 gap-0.5 px-1.5 text-xs sm:px-2";
  return <div className="flex shrink-0 items-center gap-1">
    <div className="mr-2 w-10 text-right text-[10px] tabular-nums text-muted-foreground" title={`正文已下载 / 已入库：${count}`}>
      {count}
      <div role="meter" aria-label="已下载正文" aria-valuetext={count} aria-valuenow={known ? downloaded : undefined} aria-valuemin={0} aria-valuemax={Math.max(total, 1)} className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-border">
        <div className={canExport && downloaded === total ? "task-fill task-success" : "task-fill task-active"} style={{ transform: `scaleX(${known && total > 0 ? downloaded / total : 0})` }} />
      </div>
    </div>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button size="sm" variant="ghost" className={button} disabled={busy}>采集{collectTask ? <TaskStatus task={collectTask} compact /> : <ChevronDown aria-hidden="true" className="!size-3.5" />}</Button></PopoverTrigger>
      <PopoverContent align="end" aria-label="采集操作" className="flex w-auto flex-col items-start gap-2 p-3" onClick={e => { if ((e.target as HTMLElement).closest("button")) setOpen(false); }}>
        {tasks.map(task => <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.kind === "home" ? "首页同步" : "历史采集"}<TaskStatus task={task} />
        </div>)}
        {collectActions}
      </PopoverContent>
    </Popover>
    <ArticleTransferOptions mode="下载" available={total - downloaded} initialCount={source.history_task?.target.count} busy={busy} onConfirm={onDownload}
      trigger={<Button size="sm" variant="ghost" className={button} disabled={busy || !canDownload}>下载</Button>} />
    <ArticleTransferOptions mode="导出" available={downloaded} busy={busy} onConfirm={onExport}
      trigger={<Button size="sm" variant="ghost" className={button} disabled={busy || !canExport}>导出</Button>} />
  </div>;
}

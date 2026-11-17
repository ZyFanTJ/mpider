import { Check, CircleAlert, CircleX, Clock3, LoaderCircle, Pause, X, CircleHelp } from "lucide-react";
import { recoveryIsWaiting } from "@/lib/home-sync";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workbench";

const states = {
  running:   { icon: LoaderCircle, tone: "task-active", text: "运行中" },
  queued:    { icon: Clock3, tone: "task-neutral", text: "排队中" },
  waiting:   { icon: Clock3, tone: "task-wait", text: "等待下次请求" },
  paused:    { icon: Pause, tone: "task-wait", text: "已暂停" },
  action:    { icon: CircleAlert, tone: "task-wait", text: "待人工处理" },
  recovery:  { icon: Clock3, tone: "task-wait", text: "等待更新会话" },
  done:      { icon: Check, tone: "task-success", text: "已完成" },
  issues:    { icon: CircleAlert, tone: "task-wait", text: "已结束 · 有异常" },
  failed:    { icon: CircleX, tone: "task-error", text: "失败" },
  cancelled: { icon: X, tone: "task-neutral", text: "已取消" },
  unknown:   { icon: CircleHelp, tone: "task-neutral", text: "状态未知" },
} as const;

function stateOf(task: Task) {
  switch (task.state) {
    case "needs_action": return recoveryIsWaiting(task) ? states.recovery : states.action;
    case "running": return task.next_action_at > Date.now() / 1000 ? states.waiting : states.running;
    case "done": return task.progress.failed || task.progress.partial ? states.issues : states.done;
    case "queued": case "paused": case "failed": case "cancelled": return states[task.state];
    default: return states.unknown;
  }
}

export function TaskStatus({ task, compact = false }: { task: Task; compact?: boolean }) {
  const state = stateOf(task);
  const Icon = state.icon;
  const title = compact ? `${task.kind === "home" ? "首页同步" : "历史采集"} · ${state.text}` : state.text;
  return <span title={title} className={cn(state.tone, "inline-flex shrink-0 items-center gap-1 whitespace-nowrap",
    !compact && "task-badge rounded-full px-2 py-0.5 text-xs font-medium")}>
    <Icon aria-hidden="true" className={cn("!size-3.5", state === states.running && "motion-safe:animate-spin")} />
    <span className={compact ? "sr-only" : undefined}>{title}</span>
  </span>;
}

export function ProgressTrack({ completed, total, label, valueText, active = false, className }: {
  completed: number; total?: number | null; label: string; valueText: string; active?: boolean; className?: string;
}) {
  const known = total != null && total > 0;
  const value = known ? Math.max(0, Math.min(completed, total)) : undefined;
  return <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={known ? total : undefined}
    aria-valuenow={value} aria-valuetext={valueText} className={cn("task-track block h-1 overflow-hidden rounded-full bg-border", className)}>
    {known ? <span className="task-fill" style={{ transform: `scaleX(${value! / total})` }} />
      : active && <span className="task-sweep" />}
  </span>;
}

export function TaskProgress({ task }: { task: Task }) {
  const pages = task.kind === "home" || !!task.target.pages;
  const total = pages ? task.target.pages ?? 1 : task.kind === "archive" ? task.target.article_ids?.length : task.target.count;
  const completed = pages ? task.progress.pages : task.progress.completed;
  const unit = pages ? "页" : "篇";
  const state = stateOf(task);
  return <div className="min-w-32 max-w-64">
    <div className="mb-1 flex items-baseline justify-between gap-3 text-xs tabular-nums">
      <span><strong className="text-sm font-semibold">{completed}</strong>{!!total && <span className="text-muted-foreground"> / {total}</span>} {unit}</span>
      {!!total && <span className="text-muted-foreground">{Math.min(100, Math.round(completed / total * 100))}%</span>}
    </div>
    <ProgressTrack label="任务进度" completed={completed} total={total} active={state === states.running}
      className={state.tone} valueText={total ? `已处理 ${completed} / ${total} ${unit}` : `已计入 ${completed} 篇，总数待确定`} />
  </div>;
}

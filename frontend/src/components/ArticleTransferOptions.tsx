import { useId, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ArticleTransferOptions({ mode, available, initialCount, fixed = false, busy, trigger, onConfirm }: {
  mode: "下载" | "导出"; available: number; initialCount?: number; fixed?: boolean; busy: boolean;
  trigger: ReactElement; onConfirm: (count: number, includeImages: boolean) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const max = Math.min(available, 100000);
  const value = fixed ? available : Number(count);
  const valid = Number.isInteger(value) && value > 0 && value <= max;
  return <Popover open={open} onOpenChange={next => {
    if (next) { setCount(String(Math.min(initialCount || max, max))); setIncludeImages(true); }
    setOpen(next);
  }}>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent align="end" aria-label={mode + "选项"} className="w-56 space-y-3 p-3">
      {fixed ? <p className="text-xs">已选 {available} 篇</p> : <>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm">{mode}篇数</label>
          <Input id={id} type="number" min={1} max={max} step={1} value={count} onChange={e => setCount(e.target.value)} className="h-8 w-20" />
        </div>
        <p className="text-xs text-muted-foreground">{mode === "下载" ? "待下载" : "已下载"} {available} 篇 · 最新优先</p>
      </>}
      {mode === "下载" && <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-primary" checked={includeImages} onChange={e => setIncludeImages(e.target.checked)} />下载封面和正文图片</label>}
      <Button size="sm" disabled={busy || !valid} onClick={() => { setOpen(false); onConfirm(value, includeImages); }}>
        {mode === "下载" ? "加入下载队列" : "选择导出目录"}
      </Button>
    </PopoverContent>
  </Popover>;
}

/** 关于弹窗：版本、公开入口和随应用打包的最新一条更新，离线也能查看。 */
import ReactMarkdown from "react-markdown";
import changelog from "../../../CHANGELOG.md?raw";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "@/components/ExternalLink";
import { PROJECT_LINKS } from "@/lib/project-links";

const latest = changelog.split(/^## /m)[1]?.trim() || "暂无更新记录";
const [latestTitle, ...latestBody] = latest.split("\n");

export function AboutDialog({ open, onOpenChange, version }: { open: boolean; onOpenChange: (open: boolean) => void; version: string }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>关于 MPider</DialogTitle>
        <DialogDescription>公众号文章采集与本地归档工作台</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">当前版本</dt><dd><ExternalLink href={PROJECT_LINKS.changelog} title="查看 GitHub 更新记录">v{version}</ExternalLink></dd>
        <dt className="text-muted-foreground">GitHub</dt><dd className="min-w-0 break-all"><ExternalLink href={PROJECT_LINKS.github}>github.com/ZyFanTJ/mpider</ExternalLink></dd>
      </dl>
      <section className="space-y-2 border-t pt-4" aria-labelledby="about-changelog">
        <div className="flex items-center justify-between gap-3"><h2 id="about-changelog" className="text-sm font-medium">最新更新</h2><ExternalLink href={PROJECT_LINKS.changelog} className="shrink-0 text-xs">完整更新记录 ↗</ExternalLink></div>
        <h3 className="text-sm font-medium">{latestTitle}</h3>
        <div className="prose prose-sm max-w-none text-xs dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-1">
          <ReactMarkdown components={{ a: ({ href, children }) => <ExternalLink href={new URL(href || "", `${PROJECT_LINKS.github}/blob/main/`).href}>{children}</ExternalLink> }}>{latestBody.join("\n").trim()}</ReactMarkdown>
        </div>
      </section>
      <section className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm" aria-label="MP2Rss 持续订阅">
        <p className="font-medium">RSS 订阅</p>
        <p className="text-xs text-muted-foreground">MP2Rss 提供公众号 RSS 订阅与结构化文章数据。</p>
        <ExternalLink href={PROJECT_LINKS.mp2rss} className="inline-block">了解 MP2Rss ↗</ExternalLink>
      </section>
    </DialogContent>
  </Dialog>;
}

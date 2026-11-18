import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { ChevronDown, List } from "lucide-react";
import ReactMarkdown from "react-markdown";
import faq from "../../../docs/faq.md?raw";
import { ExternalLink } from "@/components/ExternalLink";
import { PROJECT_LINKS } from "@/lib/project-links";
import { cn } from "@/lib/utils";

const questions = faq.split(/^## /m).slice(1).map(section => {
  const [title, ...body] = section.trim().split(/\r?\n/);
  const slug = title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return { id: `faq-${slug}`, title, body: body.join("\n").trim() };
});

export function Faq() {
  const article = useRef<HTMLElement>(null);
  const menu = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(questions[0]?.id);

  useEffect(() => {
    const scroller = article.current?.closest("main");
    const headings = Array.from(article.current?.querySelectorAll("h2[id]") ?? []);
    if (!scroller || !headings.length) return;
    const update = () => {
      const menuBottom = menu.current?.querySelector("button")?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(scroller.getBoundingClientRect().top, menuBottom) + 24;
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > top) break;
        current = heading;
      }
      setActive(current.id);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    if (open) flushSync(() => setOpen(false));
    const heading = document.getElementById(id);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
    setActive(id);
  }

  return <div className="mx-auto max-w-6xl min-[1080px]:grid min-[1080px]:grid-cols-[minmax(0,1fr)_13rem] min-[1080px]:gap-x-9">
    <h1 className="mb-4 text-2xl font-semibold tracking-tight">常见问题</h1>
    <nav ref={menu} aria-label="本页目录" className="sticky top-0 z-10 self-start border-y bg-background min-[1080px]:col-start-2 min-[1080px]:row-span-2 min-[1080px]:row-start-1 min-[1080px]:border-0">
      <button type="button" aria-controls="faq-contents" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center gap-2 text-sm font-medium min-[1080px]:hidden">
        <List aria-hidden="true" className="size-4" />本页目录<ChevronDown aria-hidden="true" className={cn("ml-auto size-4", open && "rotate-180")} />
      </button>
      <p className="mb-3 hidden items-center gap-2 text-sm font-semibold min-[1080px]:flex"><List aria-hidden="true" className="size-4" />本页目录</p>
      <ul id="faq-contents" className={cn("max-h-[48vh] overflow-y-auto overscroll-contain py-1 min-[1080px]:block min-[1080px]:max-h-[calc(100vh-8rem)]", !open && "hidden")}>
        {questions.map(({ id, title }) => <li key={id}><a href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={e => jump(e, id)}
          className="block border-l-2 border-transparent px-3 py-1.5 text-xs leading-relaxed text-muted-foreground hover:text-foreground focus-visible:outline-ring aria-[current=location]:border-link aria-[current=location]:font-medium aria-[current=location]:text-link">
          {title}
        </a></li>)}
      </ul>
    </nav>
    <article ref={article} className="min-w-0 max-w-prose divide-y divide-border-muted min-[1080px]:col-start-1">
      {questions.map(({ id, title, body }) => <section key={id} aria-labelledby={id} className="py-6 last:min-h-[calc(100vh-9rem)]">
        <h2 id={id} tabIndex={-1} className="mb-3 scroll-mt-14 text-lg font-semibold leading-snug tracking-tight focus:outline-none min-[1080px]:scroll-mt-4">{title}</h2>
        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:my-2 prose-p:leading-7 prose-a:text-link prose-strong:text-foreground">
          <ReactMarkdown components={{ a: ({ href, children }) => <ExternalLink href={new URL(href || "", `${PROJECT_LINKS.github}/blob/main/docs/`).href}>{children}</ExternalLink> }}>{body}</ReactMarkdown>
        </div>
      </section>)}
    </article>
  </div>;
}

'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Lightweight markdown for assistant messages — bold, lists, links, code, no raw HTML.
const components: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer" className="underline underline-offset-2" />
  ),
  ul: ({ node, ...props }) => <ul {...props} className="list-disc space-y-1 pl-4" />,
  ol: ({ node, ...props }) => <ol {...props} className="list-decimal space-y-1 pl-4" />,
  code: ({ node, ...props }) => (
    <code {...props} className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/15" />
  ),
  strong: ({ node, ...props }) => <strong {...props} className="font-semibold" />,
  blockquote: ({ node, ...props }) => (
    <blockquote {...props} className="border-l border-border pl-3 italic text-muted-foreground" />
  ),
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&_p]:m-0 [&_p+p]:mt-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

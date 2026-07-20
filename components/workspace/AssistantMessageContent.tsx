"use client";

import * as React from "react";
import Markdown from "react-markdown";

// ---------------------------------------------------------------------------
// Allowed elements -- tight, safe list (plan §5.3)
// ---------------------------------------------------------------------------
const ALLOWED = ["p", "strong", "em", "ol", "ul", "li", "code"] as const;

// ---------------------------------------------------------------------------
// Compact Tailwind components (no @tailwindcss/typography needed)
// ---------------------------------------------------------------------------
/** Use `any` for props so react-markdown's ExtraProps (`node`) don't conflict. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function P({ node: _node, ...props }: any) {
  return <p className="mb-1 last:mb-0 leading-relaxed" {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Ul({ node: _node, ...props }: any) {
  return <ul className="list-disc pl-4 mb-1 space-y-0.5" {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Ol({ node: _node, ...props }: any) {
  return <ol className="list-decimal pl-4 mb-1 space-y-0.5" {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Li({ node: _node, ...props }: any) {
  return <li className="leading-relaxed" {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Strong({ node: _node, ...props }: any) {
  return <strong className="font-semibold" {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Em({ node: _node, ...props }: any) {
  return <em {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InlineCode({ node: _node, ...props }: any) {
  return (
    <code
      className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] text-xs"
      {...props}
    />
  );
}

const COMPONENTS = {
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  strong: Strong,
  em: Em,
  code: InlineCode,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AssistantMessageContentProps {
  content: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AssistantMessageContent({
  content,
}: AssistantMessageContentProps) {
  return (
    <Markdown
      allowedElements={ALLOWED as unknown as string[]}
      unwrapDisallowed
      skipHtml
      components={COMPONENTS}
    >
      {content}
    </Markdown>
  );
}

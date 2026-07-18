"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List as ListIcon, ListOrdered, Quote, Undo2, Redo2, Heading1, Heading2, Heading3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = React.useRef<Editor | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap-surface px-5 py-4 text-[var(--color-deep-gray)] leading-relaxed" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onTransaction: ({ editor: e }) => {
      editorRef.current = e;
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
      setHydrated(true);
    },
  });

  // sync external value when differs (e.g. fetching new section)
  React.useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor || !hydrated) {
    return <div className="px-5 py-4 text-sm text-[var(--color-soft-gray)]">Loading editor…</div>;
  }

  const tools: { icon: React.ReactNode; onClick: () => void; active?: boolean; label: string }[] = [
    { icon: <Heading1 className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), label: "H1" },
    { icon: <Heading2 className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "H2" },
    { icon: <Heading3 className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), label: "H3" },
    { icon: <Bold className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Bold" },
    { icon: <Italic className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Italic" },
    { icon: <ListIcon className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Bullet" },
    { icon: <ListOrdered className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Ordered" },
    { icon: <Quote className="h-4 w-4" />, onClick: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Quote" },
    { icon: <Undo2 className="h-4 w-4" />, onClick: () => editor.chain().focus().undo().run(), label: "Undo" },
    { icon: <Redo2 className="h-4 w-4" />, onClick: () => editor.chain().focus().redo().run(), label: "Redo" },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-publiora-border)] bg-white overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] flex-wrap">
        {tools.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={t.onClick}
            aria-label={t.label}
            title={t.label}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors",
              t.active
                ? "bg-white text-[var(--color-publiora-black)] shadow-sm"
                : "text-[var(--color-medium-gray)] hover:bg-white"
            )}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}

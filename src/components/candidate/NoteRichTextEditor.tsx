"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { noteHtmlIsEmpty } from "@/lib/note-html";

type NoteRichTextEditorProps = {
  candidateId: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onUploadError?: (message: string) => void;
};

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
        active ? "bg-slate-200 text-foreground" : "text-muted hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export function NoteRichTextEditor({
  candidateId,
  value,
  onChange,
  placeholder = "Натисніть тут, щоб додати примітку...",
  disabled = false,
  onUploadError,
}: NoteRichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-h-48 rounded-md border border-border",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "note-editor min-h-[6rem] px-3 py-2 text-sm leading-relaxed text-foreground outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p.is-editor-empty:first-child]::before:pointer-events-none [&_p.is-editor-empty:first-child]::before:float-left [&_p.is-editor-empty:first-child]::before:h-0 [&_p.is-editor-empty:first-child]::before:text-muted [&_p.is-editor-empty:first-child]::before:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  // Sync external clear (after successful submit) without fighting typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value === "" && !noteHtmlIsEmpty(current)) {
      editor.commands.clearContent(true);
      return;
    }
    if (value && value !== current && noteHtmlIsEmpty(current)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (uploadingRef.current || !editor) return;
      uploadingRef.current = true;
      try {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch(
          `/api/candidates/${candidateId}/notes/attachments`,
          {
            method: "POST",
            credentials: "same-origin",
            body: formData,
          },
        );
        const payload = (await response.json()) as {
          error?: string;
          url?: string;
          mimeType?: string;
          fileName?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? "Не вдалося завантажити файл");
        }

        if (payload.mimeType?.startsWith("image/")) {
          editor
            .chain()
            .focus()
            .setImage({ src: payload.url, alt: payload.fileName ?? "image" })
            .run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent(
              `<p><a href="${payload.url}">${payload.fileName ?? "Файл"}</a></p>`,
            )
            .run();
        }
      } catch (err) {
        onUploadError?.(
          err instanceof Error ? err.message : "Не вдалося завантажити файл",
        );
      } finally {
        uploadingRef.current = false;
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [candidateId, editor, onUploadError],
  );

  const addLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL посилання", previous ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  };

  if (!editor) {
    return (
      <div className="min-h-[8rem] rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
        Завантаження редактора…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        <ToolbarButton
          label="Жирний"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Курсив"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="Підкреслений"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          label="Маркований список"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </ToolbarButton>
        <ToolbarButton
          label="Посилання"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={addLink}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          label="Файл або зображення"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          File
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.zip,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

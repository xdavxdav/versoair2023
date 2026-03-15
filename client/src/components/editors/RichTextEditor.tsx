import React, { Suspense, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Lazy-loaded editors — code-split into separate chunks
const TipTapEditor = React.lazy(() => import("./TipTapEditor"));
const QuillEditor = React.lazy(() => import("./QuillEditor"));

const EDITOR_PREF_KEY = "verso_editor_pref";

type EditorType = "tiptap" | "quill";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

function getPreferredEditor(): EditorType {
  try {
    const pref = localStorage.getItem(EDITOR_PREF_KEY);
    if (pref === "quill" || pref === "tiptap") return pref;
  } catch {
    // ignore
  }
  return "tiptap"; // Default to TipTap
}

function setPreferredEditor(editor: EditorType) {
  try {
    localStorage.setItem(EDITOR_PREF_KEY, editor);
  } catch {
    // ignore
  }
}

const EditorFallback = () => (
  <div className="flex items-center justify-center h-48 border border-gray-700 rounded-lg bg-gray-900/50">
    <Loader2 className="h-6 w-6 animate-spin text-amber-400 mr-2" />
    <span className="text-gray-400">Loading editor...</span>
  </div>
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const [editorType, setEditorType] = useState<EditorType>(getPreferredEditor);

  const switchEditor = useCallback((type: EditorType) => {
    setEditorType(type);
    setPreferredEditor(type);
  }, []);

  return (
    <div className={className}>
      {/* Editor toggle */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">Editor:</span>
        <Button
          type="button"
          size="sm"
          variant={editorType === "tiptap" ? "default" : "outline"}
          className="h-6 text-xs px-2"
          onClick={() => switchEditor("tiptap")}
        >
          TipTap
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editorType === "quill" ? "default" : "outline"}
          className="h-6 text-xs px-2"
          onClick={() => switchEditor("quill")}
        >
          Quill
        </Button>
      </div>

      <Suspense fallback={<EditorFallback />}>
        {editorType === "tiptap" ? (
          <TipTapEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight={minHeight}
          />
        ) : (
          <QuillEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight={minHeight}
          />
        )}
      </Suspense>
    </div>
  );
}

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy-loaded editors — code-split into separate chunks
const TipTapEditor = React.lazy(() => import("./TipTapEditor"));

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
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
  return (
    <div className={className}>
      <Suspense fallback={<EditorFallback />}>
        <TipTapEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
        />
      </Suspense>
    </div>
  );
}

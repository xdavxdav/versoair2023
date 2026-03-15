import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote"],
    ["link", "image"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "align",
  "blockquote",
  "link",
  "image",
  "color",
  "background",
];

export default function QuillEditor({
  value,
  onChange,
  placeholder,
  minHeight,
}: QuillEditorProps) {
  return (
    <div className="quill-dark-wrapper" style={{ minHeight }}>
      <style>{`
        .quill-dark-wrapper .ql-toolbar {
          background: rgba(31, 41, 55, 0.5);
          border-color: rgb(55, 65, 81) !important;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .quill-dark-wrapper .ql-toolbar .ql-stroke { stroke: #9ca3af; }
        .quill-dark-wrapper .ql-toolbar .ql-fill { fill: #9ca3af; }
        .quill-dark-wrapper .ql-toolbar .ql-picker-label { color: #9ca3af; }
        .quill-dark-wrapper .ql-toolbar button:hover .ql-stroke,
        .quill-dark-wrapper .ql-toolbar .ql-active .ql-stroke { stroke: #f59e0b; }
        .quill-dark-wrapper .ql-toolbar button:hover .ql-fill,
        .quill-dark-wrapper .ql-toolbar .ql-active .ql-fill { fill: #f59e0b; }
        .quill-dark-wrapper .ql-container {
          background: rgba(17, 24, 39, 0.5);
          border-color: rgb(55, 65, 81) !important;
          border-radius: 0 0 0.5rem 0.5rem;
          color: #e5e7eb;
          font-size: 1rem;
          min-height: ${minHeight || "200px"};
        }
        .quill-dark-wrapper .ql-editor {
          min-height: ${minHeight || "200px"};
        }
        .quill-dark-wrapper .ql-editor.ql-blank::before {
          color: #6b7280;
          font-style: normal;
        }
        .quill-dark-wrapper .ql-editor a { color: #f59e0b; }
        .quill-dark-wrapper .ql-picker-options {
          background: #1f2937;
          border-color: #374151 !important;
        }
        .quill-dark-wrapper .ql-picker-item { color: #e5e7eb; }
        .quill-dark-wrapper .ql-picker-item:hover { color: #f59e0b; }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Start writing..."}
      />
    </div>
  );
}

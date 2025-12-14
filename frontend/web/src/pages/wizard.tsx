import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { WizardFlow } from "../components/wizard-flow";

export function WizardPage() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Start your product wizard here…</p>",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold" data-testid="wizard-title">
        Wizard
      </h1>

      {/* stable marker for tests (always present) */}
      <div data-testid="wizard-ready" style={{ width: 1, height: 1 }} />
      {!editor ? (
        <div>Loading editor…</div>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 text-sm border rounded"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              Bold
            </button>
            <button
              type="button"
              className="px-3 py-1 text-sm border rounded"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              Italic
            </button>
          </div>

          <div className="border rounded bg-white p-3 min-h-[200px]">
            <EditorContent editor={editor} />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Agent flow</h2>
            <WizardFlow />
          </div>
        </>
      )}
    </div>
  );
}

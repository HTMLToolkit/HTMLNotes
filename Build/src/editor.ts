// editor.ts - TinyMDE editor functions
const TinyMDE = window.TinyMDE;
import { showToast } from "./notifications.js";
import { showSavingIndicator, hideSavingIndicator } from "./ui.js";

let tinyMdeEditor: any = null;

export function initializeTinyMDE(debounceCallback: () => void, attempts: number = 3): void {
  const editorContainer = document.getElementById("tinymde-editor") as HTMLElement;
  if (!editorContainer) {
    if (attempts > 0) {
      setTimeout(() => initializeTinyMDE(debounceCallback, attempts - 1), 100);
      return;
    }
    showToast("Editor container not found.", "error");
    return;
  }

  try {
    tinyMdeEditor = new TinyMDE.Editor({
      element: editorContainer,
      content: "",
    });
    tinyMdeEditor.addEventListener("change", () => {
      if (!(window as any).isSettingEditorContent) debounceCallback();
    });
    new TinyMDE.CommandBar({
      element: "tinymde_commandbar1",
      editor: tinyMdeEditor,
    });
  } catch (error) {
    console.error("Error initializing TinyMDE:", error);
    showToast("Error initializing editor.", "error");
  }
}

export function setEditorContent(content: string): void {
  if (!tinyMdeEditor) return;
  try {
    (window as any).isSettingEditorContent = true;
    tinyMdeEditor.setContent(content || "");
  } catch (error) {
    console.error("Error setting editor content:", error);
  } finally {
    (window as any).isSettingEditorContent = false;
  }
}

export function getEditorContent(): string {
  return tinyMdeEditor ? tinyMdeEditor.getContent().trim() : "";
}

export function enableEditor(): void {
  if (tinyMdeEditor && typeof tinyMdeEditor.enable === "function") {
    tinyMdeEditor.enable();
  }
}

export function focusEditor(): void {
  if (tinyMdeEditor) {
    tinyMdeEditor.setSelection(tinyMdeEditor.getSelection() || { row: 0, col: 0 });
  }
}

export interface NoteSnapshot {
  // The shared target gains its generated ID after the first save commits.
  target: { id: number | null };
  content: string;
  title: string;
  tags: string;
  category: string;
}

export function createDebounceAutosave(
  handleSaveNoteCallback: (showNotification: boolean, snapshot: NoteSnapshot) => Promise<void>,
  getSnapshot: () => NoteSnapshot,
): () => void {
  let timeout: number;
  let lastSnapshot: NoteSnapshot | null = null;
  let pendingSave: NoteSnapshot | null = null;
  let isSaving = false;

  const processQueue = async () => {
    if (!pendingSave || isSaving) return;
    isSaving = true;
    const addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
    addNoteBtn.disabled = true;
    addNoteBtn.setAttribute("aria-disabled", "true");
    showSavingIndicator();
    try {
      while (pendingSave) {
        const snapshot = pendingSave;
        pendingSave = null;
        try {
          await handleSaveNoteCallback(false, snapshot);
          lastSnapshot = snapshot;
        } catch (error) {
          showToast("Error saving note.", "error");
        }
      }
    } finally {
      hideSavingIndicator();
      isSaving = false;
      addNoteBtn.disabled = false;
      addNoteBtn.setAttribute("aria-disabled", "false");
    }
  };

  return () => {
    clearTimeout(timeout);
    const snapshot = getSnapshot();
    if (
      !isSaving && !pendingSave && lastSnapshot &&
      snapshot.target === lastSnapshot.target &&
      snapshot.content === lastSnapshot.content &&
      snapshot.title === lastSnapshot.title &&
      snapshot.tags === lastSnapshot.tags &&
      snapshot.category === lastSnapshot.category
    ) return;

    pendingSave = snapshot;
    timeout = setTimeout(processQueue, 1000);
  };
}

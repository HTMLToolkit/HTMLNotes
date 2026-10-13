// notes.ts - Note CRUD operations

import {
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getAllNotes as dbGetAllNotes,
  getNoteById as dbGetNoteById,
} from "./database";
import { showToast } from "./notifications";
import { showEditor, clearEditor, scrollToActiveNote, updatePinButton, showEmptyState } from "./ui";
import {
  setEditorContent,
  getEditorContent,
  enableEditor,
  focusEditor,
  type NoteSnapshot,
} from "./editor";
import { validateTags, inferCategory } from "./utils";
import { setAllNotesCache as setRenderingNotesCache, renderNotesList } from "./rendering";

let currentNoteTarget: NoteSnapshot["target"] = { id: null };
let lastDeletedNote: Note | undefined = undefined;
let untitledNoteCount = 0;
let allNotesCache: Note[] = [];
let beforeNoteChange: () => Promise<boolean> = async () => true;

export function setBeforeNoteChange(callback: () => Promise<boolean>): void {
  beforeNoteChange = callback;
}

export function setCurrentEditingNoteId(id: number | null): void {
  currentNoteTarget = { id };
}

export function getCurrentEditingNoteId(): number | null {
  return currentNoteTarget.id;
}

export function setAllNotesCache(notes: Note[]): void {
  allNotesCache = notes;
}

export function getAllNotesCache(): Note[] {
  return allNotesCache;
}

export function getNoteSnapshot(): NoteSnapshot {
  return {
    target: currentNoteTarget,
    title: (document.getElementById("noteTitle") as HTMLInputElement).value.trim(),
    content: getEditorContent(),
    tags: (document.getElementById("noteTags") as HTMLInputElement).value.trim(),
    category: (document.getElementById("noteCategory") as HTMLSelectElement).value,
  };
}

export async function handleSaveNote(showNotification: boolean = true, snapshot: NoteSnapshot = getNoteSnapshot()): Promise<void> {
  if (snapshot.target.deleted) return;
  const addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
  if (showNotification) addNoteBtn.disabled = true;
  const isNewNote = snapshot.target.id === null;
  const existingNote = allNotesCache.find(note => note.id === snapshot.target.id);
  const title = snapshot.title || `Untitled ${untitledNoteCount++}`;
  const tags = validateTags(snapshot.tags);
  const category = snapshot.category || inferCategory(tags);
  const currentDate = new Date().toISOString().split("T")[0];
  const note: Note = {
    title,
    content: snapshot.content,
    tags,
    date: existingNote?.date ?? currentDate,
    pinned: existingNote?.pinned ?? false,
    category,
  };

  try {
    if (!isNewNote) {
      note.id = snapshot.target.id!;
      await dbUpdateNote(note);
      if (showNotification) showToast("Note updated.", "success");
    } else {
      const newId = await dbAddNote(note);
      note.id = newId;
      snapshot.target.id = newId;
      if (showNotification) showToast("Note created.", "success");
      if (snapshot.target === currentNoteTarget) {
        document.getElementById("deleteNoteBtn")!.style.display = "inline-flex";
        document.getElementById("exportNoteBtn")!.style.display = "inline-flex";
      }
    }
    if (isNewNote) {
      allNotesCache.push(note);
      allNotesCache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      const index = allNotesCache.findIndex(n => n.id === note.id);
      if (index !== -1) allNotesCache[index] = { ...note };
    }
    if (snapshot.target === currentNoteTarget) updatePinButton(note.pinned || false);
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
  } catch (error) {
    showToast("Error saving note.", "error");
    throw error;
  } finally {
    if (showNotification) addNoteBtn.disabled = false;
  }
}

export async function handleDeleteNote(id: number): Promise<void> {
  if (!(await beforeNoteChange())) return;
  const target = currentNoteTarget.id === id ? currentNoteTarget : null;
  if (target) target.deleted = true;
  try {
    lastDeletedNote = await dbGetNoteById(id);
    await dbDeleteNote(id);
    // Remove from cache
    allNotesCache = allNotesCache.filter(n => n.id !== id);
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
    clearEditor();
    setCurrentEditingNoteId(null);
    showEmptyState("main");
    const undoToast = showToast(
      "Note deleted.",
      "success",
      10000,
      { label: "Undo", onClick: () => { void undoDelete(); } }
    );
    (window as any).currentUndoToast = undoToast;
  } catch (error) {
    if (target) target.deleted = false;
    showToast("Error deleting note.", "error");
  }
}

export async function undoDelete(): Promise<number | undefined> {
  if (typeof (window as any).currentUndoToast === "function") {
    (window as any).currentUndoToast();
    (window as any).currentUndoToast = null;
  }
  if (lastDeletedNote) {
    try {
      const newId = await dbAddNote(lastDeletedNote);
      lastDeletedNote.id = newId;
      // Add to cache
      allNotesCache.push(lastDeletedNote);
      allNotesCache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRenderingNotesCache(allNotesCache);
      renderNotesList();
      lastDeletedNote = undefined;
      await openEditorForEdit(newId);
      showToast("Note restored.", "success");
      return newId;
    } catch (error) {
      showToast("Error restoring note.", "error");
    }
  }
}

export async function handleExport(format: string = "json"): Promise<void> {
  if (!(await beforeNoteChange())) return;
  if (currentNoteTarget.id === null) {
    showToast("No note selected to export.", "error");
    return;
  }
  try {
    const note = await dbGetNoteById(currentNoteTarget.id);
    if (!note) {
      showToast("Note not found.", "error");
      return;
    }
    let blob: Blob, filename: string, mimeType: string;
    if (format === "md") {
      const title = note.title ? `# ${note.title}\n\n` : "";
      const tags =
        note.tags && note.tags.length > 0
          ? `**Tags:** ${note.tags.join(", ")}\n\n`
          : "";
      const date = note.date ? `*Created: ${note.date}*\n\n` : "";
      const content = note.content || "";
      const markdownContent = `${title}${tags}${date}${content}`;
      blob = new Blob([markdownContent], {
        type: "text/markdown;charset=utf-8",
      });
      filename = `${note.title || "note"}.md`;
      mimeType = "text/markdown";
    } else {
      const jsonContent = JSON.stringify(
        {
          title: note.title,
          content: note.content,
          tags: note.tags,
          date: note.date,
          category: note.category,
        },
        null,
        2
      );
      blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8",
      });
      filename = `${note.title || "note"}.json`;
      mimeType = "application/json";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    showToast(`Note exported as ${format.toUpperCase()}.`, "success");
  } catch (error) {
    showToast("Error exporting note.", "error");
  }
}

export async function handleImport(event: Event): Promise<number | undefined> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    let note: Note;
    if (file.name.endsWith(".json")) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed.content !== "string") {
        throw new Error("Invalid JSON format: content is required");
      }
      const tags = validateTags(Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === "string").join(",")
        : "");
      note = {
        title: (typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim() : file.name.replace(".json", "")).substring(0, 100),
        content: parsed.content,
        tags,
        date: typeof parsed.date === "string" ? parsed.date : new Date().toISOString().split("T")[0],
        category: typeof parsed.category === "string" ? parsed.category : inferCategory(tags),
      };
    } else {
      const lines = text.split("\n");
      let title = file.name.replace(/\.[^/.]+$/, "");
      let contentStart = 0;
      if (lines[0]?.startsWith("# ")) {
        title = lines[0].substring(2).trim();
        contentStart = 1;
      }
      note = {
        title: title.substring(0, 100),
        content: lines.slice(contentStart).join("\n").trim(),
        tags: [],
        date: new Date().toISOString().split("T")[0],
        category: "personal",
      };
    }
    const newId = await dbAddNote(note);
    note.id = newId;
    allNotesCache.push(note);
    allNotesCache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
    showToast("Note imported successfully!", "success");
    return newId;
  } catch (error) {
    showToast(`Error importing note: ${(error as Error).message}`, "error");
  } finally {
    target.value = "";
  }
}

export async function openEditorForAdd(): Promise<void> {
  if (!(await beforeNoteChange())) return;
  setCurrentEditingNoteId(null);
  clearEditor();
  showEditor();
  const notes = await dbGetAllNotes();
  const untitledNotes = notes.filter(
    (note) => note.title && note.title.startsWith("Untitled ")
  );
  const maxNumber = untitledNotes.reduce((max, note) => {
    const match = note.title.match(/Untitled (\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  untitledNoteCount = maxNumber + 1;
  const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
  noteTitleInput.value = `Untitled ${untitledNoteCount}`;
  setEditorContent("");
  enableEditor();
  setTimeout(() => focusEditor(), 100);
}

export async function togglePinNote(id: number): Promise<void> {
  if (!(await beforeNoteChange())) return;
  try {
    const note = await dbGetNoteById(id);
    if (!note) {
      showToast("Note not found.", "error");
      return;
    }
    note.pinned = !note.pinned;
    await dbUpdateNote(note);
    // Update cache
    const index = allNotesCache.findIndex(n => n.id === id);
    if (index !== -1) {
      allNotesCache[index] = { ...note };
    }
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
    updatePinButton(note.pinned || false);
    showToast(note.pinned ? "Note pinned." : "Note unpinned.", "success");
  } catch (error) {
    showToast("Error toggling pin.", "error");
  }
}

export async function openEditorForEdit(id: number): Promise<void> {
  if (!(await beforeNoteChange())) return;
  try {
    const note = await dbGetNoteById(id);
    if (!note) {
      showToast("Note not found.", "error");
      return;
    }
    setCurrentEditingNoteId(id);
    showEditor();
    const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
    const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
    const noteCategorySelect = document.getElementById("noteCategory") as HTMLSelectElement;
    const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
    const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
    const notesList = document.getElementById("notesList") as HTMLElement;

    noteTitleInput.value = note.title || "";
    noteTagsInput.value = note.tags ? note.tags.join(", ") : "";
    noteCategorySelect.value = note.category || "";
    updatePinButton(note.pinned || false);
    setEditorContent(note.content || "");
    enableEditor();
    deleteNoteBtn.style.display = "inline-flex";
    exportNoteBtn.style.display = "inline-flex";
    notesList.querySelectorAll(".note-list-item").forEach((item) => {
      item.classList.toggle("active", parseInt((item as HTMLElement).dataset.id!) === id);
    });
    scrollToActiveNote();
  } catch (error) {
    showToast("Error loading note.", "error");
  }
}

// Expose functions to window for HTML onclick attributes
(window as any).undoDelete = undoDelete;
(window as any).togglePinNote = togglePinNote;
(window as any).handleSaveNote = handleSaveNote;
(window as any).getCurrentEditingNoteId = getCurrentEditingNoteId;

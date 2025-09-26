// notes.ts - Note CRUD operations

import {
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getAllNotes as dbGetAllNotes,
  getNoteById as dbGetNoteById,
} from "./database";
import { showToast } from "./notifications";
import { showEditor, clearEditor, scrollToActiveNote, updatePinButton } from "./ui";
import {
  setEditorContent,
  getEditorContent,
  enableEditor,
  focusEditor,
} from "./editor";
import { validateTags, inferCategory } from "./utils";
import { setAllNotesCache as setRenderingNotesCache, renderNotesList } from "./rendering";

let currentEditingNoteId: number | null = null;
let lastDeletedNote: Note | undefined = undefined;
let untitledNoteCount = 0;
let allNotesCache: Note[] = [];

export function setCurrentEditingNoteId(id: number | null): void {
  currentEditingNoteId = id;
}

export function getCurrentEditingNoteId(): number | null {
  return currentEditingNoteId;
}

export function setAllNotesCache(notes: Note[]): void {
  allNotesCache = notes;
}

export function getAllNotesCache(): Note[] {
  return allNotesCache;
}

export async function handleSaveNote(showNotification: boolean = true): Promise<void> {
  const addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
  const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
  const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
  const noteCategorySelect = document.getElementById("noteCategory") as HTMLSelectElement;
  const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
  const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
  const notesList = document.getElementById("notesList") as HTMLElement;

  addNoteBtn.disabled = true;
  const title =
    noteTitleInput.value.trim() || `Untitled ${untitledNoteCount++}`;
  const content = getEditorContent();
  const tagsInput = noteTagsInput.value.trim();
  const tags = validateTags(tagsInput);
  const category = noteCategorySelect.value || inferCategory(tags);
  const currentDate = new Date().toISOString().split("T")[0];
  const note: Note = { title, content, tags, date: currentDate, category };

  try {
    if (currentEditingNoteId !== null) {
      note.id = currentEditingNoteId;
      await dbUpdateNote(note);
      if (showNotification) showToast("Note updated.", "success");
    } else {
      const newId = await dbAddNote(note);
      note.id = newId;
      currentEditingNoteId = newId;
      if (showNotification) showToast("Note created.", "success");
      deleteNoteBtn.style.display = "inline-block";
      exportNoteBtn.style.display = "inline-block";
    }
    // Update cache and re-render
    if (currentEditingNoteId !== null) {
      const index = allNotesCache.findIndex(n => n.id === currentEditingNoteId);
      if (index !== -1) {
        allNotesCache[index] = { ...note };
      }
    } else {
      allNotesCache.push(note);
      allNotesCache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
  } catch (error) {
    showToast("Error saving note.", "error");
    throw error;
  } finally {
    addNoteBtn.disabled = false;
  }
}

export async function handleDeleteNote(id: number): Promise<void> {
  try {
    lastDeletedNote = await dbGetNoteById(id);
    await dbDeleteNote(id);
    // Remove from cache
    allNotesCache = allNotesCache.filter(n => n.id !== id);
    setRenderingNotesCache(allNotesCache);
    renderNotesList();
    clearEditor();
    setCurrentEditingNoteId(null);
    // showEmptyState("main") from ui
    const undoToast = showToast(
      'Note deleted. <button onclick="event.stopPropagation(); undoDelete()">Undo</button>',
      "success",
      10000
    );
    (window as any).currentUndoToast = undoToast;
  } catch (error) {
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
      // openEditorForEdit(newId) from main
      showToast("Note restored.", "success");
      return newId;
    } catch (error) {
      showToast("Error restoring note.", "error");
    }
  }
}

export async function handleExport(format: string = "json"): Promise<void> {
  if (currentEditingNoteId === null) {
    showToast("No note selected to export.", "error");
    return;
  }
  try {
    const note = await dbGetNoteById(currentEditingNoteId);
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
  const reader = new FileReader();
  reader.onload = async (e: ProgressEvent<FileReader>) => {
    try {
      let note: Note;
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(e.target!.result as string);
        if (!parsed.content || typeof parsed.content !== "string") {
          throw new Error("Invalid JSON format: content is required");
        }
        note = {
          title: parsed.title || file.name.replace(".json", ""),
          content: parsed.content,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          date: parsed.date || new Date().toISOString().split("T")[0],
          category: parsed.category || inferCategory(parsed.tags || []),
        };
      } else {
        const lines = (e.target!.result as string).split("\n");
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
      // openEditorForEdit(newId) from main
      showToast("Note imported successfully!", "success");
      return newId;
    } catch (error) {
      showToast(`Error importing note: ${(error as Error).message}`, "error");
    }
    target.value = "";
  };
  reader.readAsText(file);
}

export async function openEditorForAdd(): Promise<void> {
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
  try {
    const note = await dbGetNoteById(id);
    if (!note) {
      showToast("Note not found.", "error");
      return;
    }
    currentEditingNoteId = id;
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
    deleteNoteBtn.style.display = "inline-block";
    exportNoteBtn.style.display = "inline-block";
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

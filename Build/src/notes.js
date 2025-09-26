// notes.js - Note CRUD operations
import {
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getAllNotes as dbGetAllNotes,
  getNoteById as dbGetNoteById,
} from "./database.js";
import { showToast } from "./notifications.js";
import { showEditor, clearEditor, scrollToActiveNote } from "./ui.js";
import {
  setEditorContent,
  getEditorContent,
  enableEditor,
  focusEditor,
} from "./editor.js";
import { validateTags, inferCategory } from "./utils.js";

let currentEditingNoteId = null;
let lastDeletedNote = null;
let untitledNoteCount = 0;
let allNotesCache = [];

export function setCurrentEditingNoteId(id) {
  currentEditingNoteId = id;
}

export function getCurrentEditingNoteId() {
  return currentEditingNoteId;
}

export function setAllNotesCache(notes) {
  allNotesCache = notes;
}

export function getAllNotesCache() {
  return allNotesCache;
}

export async function handleSaveNote(showNotification = true) {
  const addNoteBtn = document.getElementById("addNoteBtn");
  const noteTitleInput = document.getElementById("noteTitle");
  const noteTagsInput = document.getElementById("noteTags");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const exportNoteBtn = document.getElementById("exportNoteBtn");
  const notesList = document.getElementById("notesList");

  addNoteBtn.disabled = true;
  const title =
    noteTitleInput.value.trim() || `Untitled ${untitledNoteCount++}`;
  const content = getEditorContent();
  const tagsInput = noteTagsInput.value.trim();
  const tags = validateTags(tagsInput);
  const category = inferCategory(tags);
  const currentDate = new Date().toISOString().split("T")[0];
  const note = { title, content, tags, date: currentDate, category };

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
    // Note: loadAndRenderNotes is in main.js, so we'll call it from there
    if (currentEditingNoteId !== null) {
      notesList.querySelectorAll(".note-list-item").forEach((item) => {
        item.classList.toggle(
          "active",
          parseInt(item.dataset.id) === currentEditingNoteId
        );
      });
    }
  } catch (error) {
    showToast("Error saving note.", "error");
    throw error;
  } finally {
    addNoteBtn.disabled = false;
  }
}

export async function handleDeleteNote(id) {
  try {
    lastDeletedNote = await dbGetNoteById(id);
    await dbDeleteNote(id);
    clearEditor();
    setCurrentEditingNoteId(null);
    // showEmptyState("main") from ui.js
    const undoToast = showToast(
      'Note deleted. <button onclick="event.stopPropagation(); undoDelete()">Undo</button>',
      "success",
      10000
    );
    window.currentUndoToast = undoToast;
  } catch (error) {
    showToast("Error deleting note.", "error");
  }
}

export async function undoDelete() {
  if (typeof window.currentUndoToast === "function") {
    window.currentUndoToast();
    window.currentUndoToast = null;
  }
  if (lastDeletedNote) {
    try {
      const newId = await dbAddNote(lastDeletedNote);
      lastDeletedNote.id = newId;
      // openEditorForEdit(newId) from main.js
      showToast("Note restored.", "success");
      return newId;
    } catch (error) {
      showToast("Error restoring note.", "error");
    }
  }
}

export async function handleExport(format = "json") {
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
    let blob, filename, mimeType;
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

export async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let note;
      if (file.name.endsWith(".json")) {
        note = JSON.parse(e.target.result);
        if (!note.content || typeof note.content !== "string") {
          throw new Error("Invalid JSON format: content is required");
        }
        note.title = note.title || file.name.replace(".json", "");
        note.tags = Array.isArray(note.tags) ? note.tags : [];
        note.category = note.category || inferCategory(note.tags);
      } else {
        const lines = e.target.result.split("\n");
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
      // openEditorForEdit(newId) from main.js
      showToast("Note imported successfully!", "success");
      return newId;
    } catch (error) {
      showToast(`Error importing note: ${error.message}`, "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

export async function openEditorForAdd() {
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
  const noteTitleInput = document.getElementById("noteTitle");
  noteTitleInput.value = `Untitled ${untitledNoteCount}`;
  setEditorContent("");
  enableEditor();
  setTimeout(() => focusEditor(), 100);
}

export async function openEditorForEdit(id) {
  try {
    const note = await dbGetNoteById(id);
    if (!note) {
      showToast("Note not found.", "error");
      return;
    }
    currentEditingNoteId = id;
    showEditor();
    const noteTitleInput = document.getElementById("noteTitle");
    const noteTagsInput = document.getElementById("noteTags");
    const deleteNoteBtn = document.getElementById("deleteNoteBtn");
    const exportNoteBtn = document.getElementById("exportNoteBtn");
    const notesList = document.getElementById("notesList");

    noteTitleInput.value = note.title || "";
    noteTagsInput.value = note.tags ? note.tags.join(", ") : "";
    setEditorContent(note.content || "");
    enableEditor();
    deleteNoteBtn.style.display = "inline-block";
    exportNoteBtn.style.display = "inline-block";
    notesList.querySelectorAll(".note-list-item").forEach((item) => {
      item.classList.toggle("active", parseInt(item.dataset.id) === id);
    });
    scrollToActiveNote();
  } catch (error) {
    showToast("Error loading note.", "error");
  }
}

// Expose functions to window for HTML onclick attributes
window.undoDelete = undoDelete;

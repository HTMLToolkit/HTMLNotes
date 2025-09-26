// main.ts - Application entry point
const TinyMDE = window.TinyMDE;
import { marked } from "marked";

// Import modules
import { openDatabase, getAllNotes } from "./database";
import { showToast, showEmptyState, clearEditor } from "./ui";
import { initializeTinyMDE, createDebounceAutosave } from "./editor";
import { setupEventListeners, setupNavigation, setupImport } from "./events";
import {
  renderFilterButtons,
  renderNotesList,
  setCurrentFilter,
  setCurrentPage,
  setAllNotesCache,
  changePage,
} from "./rendering";
import {
  handleSaveNote,
  handleDeleteNote,
  undoDelete,
  handleExport,
  handleImport,
  openEditorForAdd,
  openEditorForEdit,
  setCurrentEditingNoteId,
  getCurrentEditingNoteId,
} from "./notes";

let allNotesCache: Note[] = [];

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await openDatabase();
    await loadAndRenderNotes();
    showEmptyState("main");
    const debounceAutosave = createDebounceAutosave(handleSaveNote);
    initializeTinyMDE(debounceAutosave);
    setupEventListeners(loadAndRenderNotes);
    setupImport();
    setupNavigation(loadAndRenderNotes);
    // Set up debounce for title and tags
    const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
    const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
    noteTitleInput.addEventListener("input", debounceAutosave);
    noteTagsInput.addEventListener("input", debounceAutosave);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showToast("Failed to load the application.", "error");
  }
});

async function loadAndRenderNotes(): Promise<void> {
  try {
    allNotesCache = await getAllNotes();
    allNotesCache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAllNotesCache(allNotesCache);
    renderFilterButtons();
    renderNotesList(loadAndRenderNotes);
  } catch (error) {
    showToast("Error loading notes.", "error");
    setTimeout(loadAndRenderNotes, 2000);
  }
}

// Expose functions to window for HTML onclick attributes
(window as any).undoDelete = undoDelete;

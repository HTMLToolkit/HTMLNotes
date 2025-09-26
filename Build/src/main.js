const TinyMDE = window.TinyMDE;
import { marked } from "marked";

// Import modules
import { openDatabase, getAllNotes } from "./database.js";
import { showToast, showEmptyState, clearEditor } from "./ui.js";
import { initializeTinyMDE, createDebounceAutosave } from "./editor.js";
import { setupEventListeners, setupNavigation, setupImport } from "./events.js";
import {
  renderFilterButtons,
  renderNotesList,
  setCurrentFilter,
  setCurrentPage,
  setAllNotesCache,
  changePage,
} from "./rendering.js";
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
} from "./notes.js";

let allNotesCache = [];

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
    const noteTitleInput = document.getElementById("noteTitle");
    const noteTagsInput = document.getElementById("noteTags");
    noteTitleInput.addEventListener("input", debounceAutosave);
    noteTagsInput.addEventListener("input", debounceAutosave);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showToast("Failed to load the application.", "error");
  }
});

async function loadAndRenderNotes() {
  try {
    allNotesCache = await getAllNotes();
    allNotesCache.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAllNotesCache(allNotesCache);
    renderFilterButtons();
    renderNotesList(loadAndRenderNotes);
  } catch (error) {
    showToast("Error loading notes.", "error");
    setTimeout(loadAndRenderNotes, 2000);
  }
}

// Expose functions to window for HTML onclick attributes
window.undoDelete = undoDelete;

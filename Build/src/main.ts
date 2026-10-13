// main.ts - Application entry point
import { refreshIcons } from "./icons";

// Import modules
import { openDatabase, getAllNotes } from "./database";
import { showToast, showEmptyState } from "./ui";
import { initializeTinyMDE, createDebounceAutosave } from "./editor";
import { setupEventListeners, setupNavigation, setupImport } from "./events";
import {
  renderNotesList,
  setCurrentPage,
  setAllNotesCache,
} from "./rendering";
import {
  handleSaveNote,
  getNoteSnapshot,
  setBeforeNoteChange,
  undoDelete,
  setAllNotesCache as setNotesCache,
} from "./notes";

let allNotesCache: Note[] = [];

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize theme
    const savedTheme = localStorage.getItem("theme") || "dark";
    let actualTheme = savedTheme;
    
    if (savedTheme === "auto") {
      // Detect system preference for auto mode
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    document.documentElement.setAttribute("data-theme", actualTheme);
    
    // Initialize theme options active state
    const themeOptions = document.querySelectorAll(".theme-option") as NodeListOf<HTMLButtonElement>;
    themeOptions.forEach(option => {
      if (option.dataset.theme === savedTheme) {
        option.classList.add("active");
        option.setAttribute("aria-pressed", "true");
      } else {
        option.classList.remove("active");
        option.setAttribute("aria-pressed", "false");
      }
    });

    // Initialize Lucide icons
    refreshIcons();

    setCurrentPage(Math.max(1, Math.trunc(Number(new URLSearchParams(location.search).get("page")) || 1)));
    await openDatabase();
    await loadAndRenderNotes();
    showEmptyState("main");
    const debounceAutosave = createDebounceAutosave(handleSaveNote, getNoteSnapshot);
    setBeforeNoteChange(async () => {
      try {
        await debounceAutosave.flush();
        return true;
      } catch {
        return false;
      }
    });
    initializeTinyMDE(debounceAutosave);
    setupEventListeners(loadAndRenderNotes, () => {
      debounceAutosave();
      void debounceAutosave.flush().catch(() => {});
    });
    setupImport();
    setupNavigation();
    // Set up debounce for title and tags
    const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
    const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
    const noteCategorySelect = document.getElementById("noteCategory") as HTMLSelectElement;
    noteTitleInput.addEventListener("input", debounceAutosave);
    noteTagsInput.addEventListener("input", debounceAutosave);
    noteCategorySelect.addEventListener("change", debounceAutosave);
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
    setNotesCache(allNotesCache);
    renderNotesList(loadAndRenderNotes);
  } catch (error) {
    showToast("Error loading notes.", "error");
    setTimeout(loadAndRenderNotes, 2000);
  }
}

// Expose functions to window for HTML onclick attributes
(window as any).undoDelete = undoDelete;

// events.ts - Event listeners setup
import { showToast } from "./notifications";
import { toggleSidebar, clearEditor, showEmptyState } from "./ui";
import {
  openEditorForAdd,
  openEditorForEdit,
  handleDeleteNote,
  handleExport,
  handleImport,
  getCurrentEditingNoteId,
  setCurrentEditingNoteId,
} from "./notes";
import {
  setCurrentFilter,
  setCurrentPage,
  renderNotesList,
  changePage,
} from "./rendering";

export function setupEventListeners(loadAndRenderCallback: () => Promise<void>): void {
  const filterControls = document.getElementById("filterControls")!;
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;
  const addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
  const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
  const exportJsonBtn = document.getElementById("exportJsonBtn") as HTMLElement;
  const exportMarkdownBtn = document.getElementById("exportMarkdownBtn") as HTMLElement;
  const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
  const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
  const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
  const notesList = document.getElementById("notesList")!;
  const settingsToggle = document.getElementById("settingsToggle") as HTMLButtonElement;
  const settingsOverlay = document.getElementById("settingsOverlay") as HTMLElement;
  const settingsPanel = document.getElementById("settingsPanel") as HTMLElement;
  const settingsClose = document.getElementById("settingsClose") as HTMLButtonElement;
  const themeOptions = document.querySelectorAll(".theme-option") as NodeListOf<HTMLButtonElement>;
  const pinNoteBtn = document.getElementById("pinNoteBtn") as HTMLButtonElement;

  filterControls.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLButtonElement;
    if (target.classList.contains("btn") && !target.disabled) {
      filterControls
        .querySelectorAll(".btn")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      const currentFilter = target.dataset.filter!;
      setCurrentFilter(currentFilter);
      setCurrentPage(1);
      renderNotesList(loadAndRenderCallback);
    }
  });

  searchInput.addEventListener("input", () => {
    setCurrentPage(1);
    renderNotesList(loadAndRenderCallback);
  });
  
  settingsToggle.addEventListener("click", () => {
    settingsOverlay.classList.add("active");
    settingsPanel.classList.add("active");
  });

  settingsClose.addEventListener("click", () => {
    settingsOverlay.classList.remove("active");
    settingsPanel.classList.remove("active");
  });

  settingsOverlay.addEventListener("click", (e: Event) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.remove("active");
      settingsPanel.classList.remove("active");
    }
  });

  themeOptions.forEach(option => {
    option.addEventListener("click", () => {
      const selectedTheme = option.dataset.theme!;
      let actualTheme = selectedTheme;
      
      if (selectedTheme === "auto") {
        // Detect system preference for auto mode
        actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      
      document.documentElement.setAttribute("data-theme", actualTheme);
      localStorage.setItem("theme", selectedTheme);
      
      // Update active state
      themeOptions.forEach(opt => opt.classList.remove("active"));
      option.classList.add("active");
      
      // Re-create icons after theme change
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  });

  // Listen for system theme changes when in auto mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "auto") {
      const actualTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", actualTheme);
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  });

  pinNoteBtn.addEventListener("click", () => {
    const currentEditingNoteId = (window as any).getCurrentEditingNoteId();
    if (currentEditingNoteId !== null) {
      // Toggle pin status - this will be handled in notes.ts
      (window as any).togglePinNote(currentEditingNoteId);
    }
  });

  addNoteBtn.addEventListener("click", openEditorForAdd);

  deleteNoteBtn.addEventListener("click", async () => {
    const currentEditingNoteId = getCurrentEditingNoteId();
    if (
      currentEditingNoteId !== null &&
      confirm("Are you sure you want to delete this note?")
    ) {
      await handleDeleteNote(currentEditingNoteId);
    } else {
      clearEditor();
      setCurrentEditingNoteId(null);
      showEmptyState("main");
    }
  });

  exportJsonBtn.addEventListener("click", () => handleExport("json"));
  exportMarkdownBtn.addEventListener("click", () => handleExport("md"));

  document.addEventListener("click", (e: Event) => {
    const target = e.target as Element;
    if (!target.closest(".export-dropdown")) {
      document
        .querySelectorAll(".export-dropdown-content")
        .forEach((d) => (d as HTMLElement).style.display = "none");
    }
  });

  exportNoteBtn.addEventListener("click", (e: Event) => {
    const event = e as MouseEvent;
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const dropdown = target.nextElementSibling as HTMLElement;
    const isExpanded = dropdown.style.display === "block";
    document
      .querySelectorAll(".export-dropdown-content")
      .forEach((d) => (d as HTMLElement).style.display = "none");
    dropdown.style.display = isExpanded ? "none" : "block";
    exportNoteBtn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
  });

  // Note: debounceAutosave is set up in main

  notesList.addEventListener("keydown", (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("note-list-item") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      const noteId = parseInt(target.dataset.id!);
      if (noteId) openEditorForEdit(noteId);
    }
  });

  // Sidebar toggle
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          addNoteBtn.click();
          break;
        case "s":
          e.preventDefault();
          // Save is handled by autosave, but we can trigger it manually
          (window as any).handleSaveNote();
          break;
        case "d":
          e.preventDefault();
          const currentId = (window as any).getCurrentEditingNoteId();
          if (currentId !== null) {
            handleDeleteNote(currentId);
          }
          break;
        case "f":
          e.preventDefault();
          searchInput.focus();
          break;
      }
    }
  });
}

export function setupNavigation(loadAndRenderCallback: () => Promise<void>): void {
  window.addEventListener("popstate", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get("page")!) || 1;
    changePage(page, loadAndRenderCallback);
  });
}

export function setupImport(): void {
  const importBtn = document.getElementById("importNoteBtn") as HTMLElement;
  const fileInput = document.getElementById("importFileInput") as HTMLInputElement;
  if (!importBtn || !fileInput) return;
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleImport);
}

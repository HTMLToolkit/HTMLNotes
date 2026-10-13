// events.ts - Event listeners setup
import { toggleSidebar, setSidebarCollapsed, clearEditor, showEmptyState } from "./ui";
import {
  openEditorForAdd,
  openEditorForEdit,
  handleDeleteNote,
  handleExport,
  handleImport,
  getCurrentEditingNoteId,
  setCurrentEditingNoteId,
  togglePinNote,
} from "./notes";
import {
  setCurrentFilter,
  setCurrentPage,
  renderNotesList,
  changePage,
  getTotalPages,
} from "./rendering";

export function setupEventListeners(loadAndRenderCallback: () => Promise<void>, requestSave: () => void): void {
  const filterControls = document.getElementById("filterControls")!;
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;
  const addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
  const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
  const exportJsonBtn = document.getElementById("exportJsonBtn") as HTMLElement;
  const exportMarkdownBtn = document.getElementById("exportMarkdownBtn") as HTMLElement;
  const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
  const notesList = document.getElementById("notesList")!;
  const settingsToggle = document.getElementById("settingsToggle") as HTMLButtonElement;
  const settingsOverlay = document.getElementById("settingsOverlay") as HTMLElement;
  const settingsPanel = document.getElementById("settingsPanel") as HTMLElement;
  const settingsClose = document.getElementById("settingsClose") as HTMLButtonElement;
  const themeOptions = document.querySelectorAll(".theme-option") as NodeListOf<HTMLButtonElement>;
  const pinNoteBtn = document.getElementById("pinNoteBtn") as HTMLButtonElement;

  filterControls.addEventListener("click", (e: Event) => {
    const target = (e.target as Element).closest<HTMLButtonElement>("[data-filter]");
    if (target && !target.disabled) {
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
  
  const setSettingsOpen = (open: boolean) => {
    settingsOverlay.classList.toggle("active", open);
    settingsPanel.classList.toggle("active", open);
    settingsToggle.setAttribute("aria-expanded", String(open));
    (document.querySelector(".sidebar") as HTMLElement).inert = open;
    (document.getElementById("mainContent") as HTMLElement).inert = open;
    requestAnimationFrame(() => (open ? settingsClose : settingsToggle).focus({ preventScroll: true }));
  };
  settingsToggle.addEventListener("click", () => setSettingsOpen(true));
  settingsClose.addEventListener("click", () => setSettingsOpen(false));
  settingsOverlay.addEventListener("click", (event: Event) => {
    if (event.target === settingsOverlay) setSettingsOpen(false);
  });
  settingsPanel.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSettingsOpen(false);
    } else if (event.key === "Tab") {
      const buttons = settingsPanel.querySelectorAll<HTMLButtonElement>("button");
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
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
      themeOptions.forEach(opt => {
        opt.classList.remove("active");
        opt.setAttribute("aria-pressed", "false");
      });
      option.classList.add("active");
      option.setAttribute("aria-pressed", "true");
      
    });
  });

  // Listen for system theme changes when in auto mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "auto") {
      const actualTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", actualTheme);
    }
  });

  pinNoteBtn.addEventListener("click", () => {
    const currentEditingNoteId = getCurrentEditingNoteId();
    if (currentEditingNoteId !== null) {
      void togglePinNote(currentEditingNoteId);
    }
  });

  addNoteBtn.addEventListener("click", openEditorForAdd);
  document.getElementById("emptyAddNoteBtn")!.addEventListener("click", () => addNoteBtn.click());

  deleteNoteBtn.addEventListener("click", async () => {
    const currentEditingNoteId = getCurrentEditingNoteId();
    if (
      currentEditingNoteId !== null &&
      confirm("Are you sure you want to delete this note?")
    ) {
      await handleDeleteNote(currentEditingNoteId);
    } else if (currentEditingNoteId === null) {
      clearEditor();
      setCurrentEditingNoteId(null);
      showEmptyState("main");
    }
  });

  const dropdown = document.getElementById("exportMenu")!;
  const closeExportMenu = () => {
    dropdown.classList.remove("open");
    exportNoteBtn.setAttribute("aria-expanded", "false");
  };
  exportJsonBtn.addEventListener("click", () => { closeExportMenu(); void handleExport("json"); });
  exportMarkdownBtn.addEventListener("click", () => { closeExportMenu(); void handleExport("md"); });
  document.addEventListener("click", (event: Event) => {
    if (!(event.target as Element).closest(".export-dropdown")) closeExportMenu();
  });
  exportNoteBtn.addEventListener("click", () => {
    const open = !dropdown.classList.contains("open");
    dropdown.classList.toggle("open", open);
    exportNoteBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      dropdown.style.right = "0";
      const bounds = dropdown.getBoundingClientRect();
      if (bounds.left < 8) dropdown.style.right = `${bounds.left - 8}px`;
      else if (bounds.right > window.innerWidth - 8) {
        dropdown.style.right = `${bounds.right - window.innerWidth + 8}px`;
      }
      exportJsonBtn.focus();
    }
  });
  window.addEventListener("resize", closeExportMenu);
  dropdown.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault(); closeExportMenu(); exportNoteBtn.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      (document.activeElement === exportJsonBtn ? exportMarkdownBtn : exportJsonBtn).focus();
    }
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
    if (settingsOverlay.classList.contains("active")) return;
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          addNoteBtn.click();
          break;
        case "s":
          e.preventDefault();
          // Save is handled by autosave, but we can trigger it manually
          if (document.getElementById("editorArea")!.style.display !== "none") requestSave();
          break;
        case "d": {
          const target = e.target as HTMLElement;
          if (target.closest('input, textarea, select, [contenteditable="true"]')) break;
          e.preventDefault();
          const currentId = getCurrentEditingNoteId();
          if (currentId !== null && confirm("Are you sure you want to delete this note?")) {
            void handleDeleteNote(currentId);
          }
          break;
        }
        case "f":
          e.preventDefault();
          setSidebarCollapsed(false);
          searchInput.focus();
          break;
      }
    }
  });
}

export function setupNavigation(): void {
  window.addEventListener("popstate", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get("page")!) || 1;
    const totalPages = getTotalPages();
    void changePage(Math.min(Math.max(1, page), totalPages), totalPages, null, false);
  });
}

export function setupImport(): void {
  const importBtn = document.getElementById("importNoteBtn") as HTMLElement;
  const fileInput = document.getElementById("importFileInput") as HTMLInputElement;
  if (!importBtn || !fileInput) return;
  importBtn.addEventListener("click", () => fileInput.click());
  document.getElementById("emptyImportBtn")!.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async event => {
    const id = await handleImport(event);
    if (id !== undefined) await openEditorForEdit(id);
  });
}

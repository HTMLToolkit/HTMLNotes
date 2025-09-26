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

// events.js - Event listeners setup
import { showToast } from "./notifications.js";
import { toggleSidebar, clearEditor, showEmptyState } from "./ui.js";
import {
  openEditorForAdd,
  openEditorForEdit,
  handleDeleteNote,
  handleExport,
  handleImport,
  getCurrentEditingNoteId,
  setCurrentEditingNoteId,
} from "./notes.js";
import {
  setCurrentFilter,
  setCurrentPage,
  renderNotesList,
  changePage,
} from "./rendering.js";

export function setupEventListeners(loadAndRenderCallback) {
  const filterControls = document.getElementById("filterControls");
  const searchInput = document.getElementById("searchInput");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportMarkdownBtn = document.getElementById("exportMarkdownBtn");
  const exportNoteBtn = document.getElementById("exportNoteBtn");
  const noteTitleInput = document.getElementById("noteTitle");
  const noteTagsInput = document.getElementById("noteTags");
  const notesList = document.getElementById("notesList");

  filterControls.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn") && !e.target.disabled) {
      filterControls
        .querySelectorAll(".btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const currentFilter = e.target.dataset.filter;
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".export-dropdown")) {
      document
        .querySelectorAll(".export-dropdown-content")
        .forEach((d) => (d.style.display = "none"));
    }
  });

  exportNoteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = e.currentTarget.nextElementSibling;
    const isExpanded = dropdown.style.display === "block";
    document
      .querySelectorAll(".export-dropdown-content")
      .forEach((d) => (d.style.display = "none"));
    dropdown.style.display = isExpanded ? "none" : "block";
    exportNoteBtn.setAttribute("aria-expanded", !isExpanded);
  });

  // Note: debounceAutosave is set up in main.js

  notesList.addEventListener("keydown", (e) => {
    if (
      e.target.classList.contains("note-list-item") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      const noteId = parseInt(e.target.dataset.id);
      if (noteId) openEditorForEdit(noteId);
    }
  });

  // Sidebar toggle
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }
}

export function setupNavigation(loadAndRenderCallback) {
  window.addEventListener("popstate", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get("page")) || 1;
    changePage(page, loadAndRenderCallback);
  });
}

export function setupImport() {
  const importBtn = document.getElementById("importNoteBtn");
  const fileInput = document.getElementById("importFileInput");
  if (!importBtn || !fileInput) return;
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleImport);
}

// ui.js - UI manipulation functions
import { showToast } from './notifications.js';

export { showToast };

export function showSavingIndicator() {
  document.getElementById("savingIndicator").classList.add("visible");
}

export function hideSavingIndicator() {
  document.getElementById("savingIndicator").classList.remove("visible");
}

export function showEmptyState(area) {
  const notesList = document.getElementById("notesList");
  const sidebarEmptyState = document.getElementById("sidebarEmptyState");
  const editorArea = document.getElementById("editorArea");
  const mainEmptyState = document.getElementById("mainEmptyState");

  if (area === "sidebar") {
    notesList.style.display = "none";
    sidebarEmptyState.style.display = "block";
  } else if (area === "main") {
    editorArea.style.display = "none";
    mainEmptyState.style.display = "flex";
  }
}

export function showEditor() {
  const mainEmptyState = document.getElementById("mainEmptyState");
  const editorArea = document.getElementById("editorArea");
  mainEmptyState.style.display = "none";
  editorArea.style.display = "flex";
}

export function clearEditor() {
  const noteTitleInput = document.getElementById("noteTitle");
  const noteTagsInput = document.getElementById("noteTags");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const exportNoteBtn = document.getElementById("exportNoteBtn");
  const notesList = document.getElementById("notesList");

  noteTitleInput.value = "";
  noteTagsInput.value = "";
  // Note: tinyMdeEditor is handled in editor.js
  deleteNoteBtn.style.display = "none";
  exportNoteBtn.style.display = "none";
  notesList
    .querySelectorAll(".note-list-item")
    .forEach((item) => item.classList.remove("active"));
}

export function scrollToActiveNote() {
  const activeNote = document.querySelector(".note-list-item.active");
  if (activeNote) {
    activeNote.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}

export function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("collapsed");
}
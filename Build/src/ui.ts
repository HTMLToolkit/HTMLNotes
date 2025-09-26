// ui.ts - UI manipulation functions
import { showToast } from './notifications';

export { showToast };

export function showSavingIndicator(): void {
  document.getElementById("savingIndicator")!.classList.add("visible");
}

export function hideSavingIndicator(): void {
  document.getElementById("savingIndicator")!.classList.remove("visible");
}

export function showEmptyState(area: string): void {
  const notesList = document.getElementById("notesList")!;
  const sidebarEmptyState = document.getElementById("sidebarEmptyState")!;
  const editorArea = document.getElementById("editorArea")!;
  const mainEmptyState = document.getElementById("mainEmptyState")!;

  if (area === "sidebar") {
    notesList.style.display = "none";
    sidebarEmptyState.style.display = "block";
  } else if (area === "main") {
    editorArea.style.display = "none";
    mainEmptyState.style.display = "flex";
  }
}

export function showEditor(): void {
  const mainEmptyState = document.getElementById("mainEmptyState")!;
  const editorArea = document.getElementById("editorArea")!;
  mainEmptyState.style.display = "none";
  editorArea.style.display = "flex";
}

export function clearEditor(): void {
  const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
  const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
  const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
  const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
  const notesList = document.getElementById("notesList")!;

  noteTitleInput.value = "";
  noteTagsInput.value = "";
  // Note: tinyMdeEditor is handled in editor
  deleteNoteBtn.style.display = "none";
  exportNoteBtn.style.display = "none";
  notesList
    .querySelectorAll(".note-list-item")
    .forEach((item) => item.classList.remove("active"));
}

export function scrollToActiveNote(): void {
  const activeNote = document.querySelector(".note-list-item.active");
  if (activeNote) {
    activeNote.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}

export function toggleSidebar(): void {
  document.querySelector(".sidebar")!.classList.toggle("collapsed");
}
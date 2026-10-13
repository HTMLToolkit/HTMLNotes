// ui.ts - UI manipulation functions
import { showToast } from './notifications';
import { refreshIcons } from './icons';
import { setEditorContent } from './editor';

export { showToast };

export function updatePinButton(isPinned: boolean, canPin: boolean = true): void {
  const pinNoteBtn = document.getElementById("pinNoteBtn") as HTMLButtonElement;

  // Clear existing content and create new icon element
  pinNoteBtn.innerHTML = '';
  const iconElement = document.createElement('i');
  iconElement.setAttribute('data-lucide', isPinned ? 'pin-off' : 'pin');
  pinNoteBtn.disabled = !canPin;
  pinNoteBtn.setAttribute('aria-pressed', String(isPinned));
  pinNoteBtn.setAttribute('aria-label', isPinned ? 'Unpin note' : 'Pin note');

  if (isPinned) {
    pinNoteBtn.appendChild(iconElement);
    pinNoteBtn.appendChild(document.createTextNode(' Unpin Note'));
    pinNoteBtn.classList.add("pinned");
  } else {
    pinNoteBtn.appendChild(iconElement);
    pinNoteBtn.appendChild(document.createTextNode(' Pin Note'));
    pinNoteBtn.classList.remove("pinned");
  }

  // Re-create icons after DOM change
  refreshIcons();
}

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
  if (window.matchMedia("(max-width: 768px)").matches) setSidebarCollapsed(true);
}

export function clearEditor(): void {
  const noteTitleInput = document.getElementById("noteTitle") as HTMLInputElement;
  const noteTagsInput = document.getElementById("noteTags") as HTMLInputElement;
  const noteCategorySelect = document.getElementById("noteCategory") as HTMLSelectElement;
  const deleteNoteBtn = document.getElementById("deleteNoteBtn") as HTMLElement;
  const exportNoteBtn = document.getElementById("exportNoteBtn") as HTMLElement;
  const notesList = document.getElementById("notesList")!;

  noteTitleInput.value = "";
  noteTagsInput.value = "";
  noteCategorySelect.value = "";
  updatePinButton(false, false);
  setEditorContent("");
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

export function setSidebarCollapsed(collapsed: boolean): void {
  document.querySelector(".sidebar")!.classList.toggle("collapsed", collapsed);
  const toggle = document.querySelector(".sidebar-toggle")!;
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
}

export function toggleSidebar(): void {
  setSidebarCollapsed(!document.querySelector(".sidebar")!.classList.contains("collapsed"));
}
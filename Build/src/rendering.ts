// rendering.ts - Functions for rendering notes list and pagination

import {
  formatDate,
  isRecent,
  escapeHTML,
  renderNotePreview,
} from "./utils";
import { openEditorForEdit, getCurrentEditingNoteId } from "./notes";

let currentFilter = "all";
let currentPage = 1;
const PAGE_SIZE = 20;
let allNotesCache: Note[] = [];

export function setCurrentFilter(filter: string): void {
  currentFilter = filter;
}

export function getCurrentFilter(): string {
  return currentFilter;
}

export function setCurrentPage(page: number): void {
  currentPage = page;
}

export function getCurrentPage(): number {
  return currentPage;
}

export function setAllNotesCache(notes: Note[]): void {
  allNotesCache = notes;
}

export function renderFilterButtons(): void {
  const filterControls = document.getElementById("filterControls")!;
  const existingButtons = filterControls.querySelectorAll(
    '.btn:not([data-filter="all"]):not([data-filter="recent"])'
  );
  existingButtons.forEach((btn) => btn.remove());

  const allTags = new Set<string>();
  allNotesCache.forEach((note) => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach((tag) => allTags.add(tag.trim().toLowerCase()));
    }
  });

  const sortedTags = Array.from(allTags).sort();
  const fragment = document.createDocumentFragment();
  sortedTags.forEach((tag) => {
    if (tag) {
      const button = document.createElement("button");
      button.classList.add("btn");
      (button as HTMLElement).dataset.filter = tag;
      button.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
      button.setAttribute("aria-label", `Filter by ${tag} tag`);
      fragment.appendChild(button);
    }
  });

  filterControls.appendChild(fragment);
  filterControls.querySelector('[data-filter="all"]')!.classList.add("active");
}

export function renderNotesList(loadAndRenderCallback: (() => Promise<void>) | null = null): void {
  const notesList = document.getElementById("notesList")!;
  const sidebarEmptyState = document.getElementById("sidebarEmptyState")!;
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;

  const searchTerm = searchInput.value.toLowerCase();
  let filteredNotes = allNotesCache.filter((note) => {
    const matchesSearch =
      (note.title && note.title.toLowerCase().includes(searchTerm)) ||
      (note.content && note.content.toLowerCase().includes(searchTerm)) ||
      (note.tags &&
        note.tags.some((tag) => tag.toLowerCase().includes(searchTerm)));
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "recent" && note.date && isRecent(note.date)) ||
      (note.tags &&
        note.tags.some((tag) => tag.toLowerCase() === currentFilter));
    return matchesSearch && matchesFilter;
  });

  if (currentFilter !== "recent") {
    filteredNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedNotes = filteredNotes.slice(start, end);

  if (paginatedNotes.length === 0) {
    notesList.style.display = "none";
    sidebarEmptyState.style.display = "block";
  } else {
    notesList.style.display = "flex";
    sidebarEmptyState.style.display = "none";
    notesList.innerHTML = paginatedNotes
      .map(
        (note) => `
                    <div class="note-list-item ${
                      note.id === getCurrentEditingNoteId() ? "active" : ""
                    }" data-id="${note.id}" role="listitem" tabindex="0">
                        <div class="note-title">${escapeHTML(
                          note.title || "Untitled"
                        )}</div>
                        <div class="note-date">${
                          note.date ? formatDate(note.date) : "No date"
                        }</div>
                        <div class="note-preview">${renderNotePreview(
                          note.content
                        )}</div>
                    </div>
                `
      )
      .join("");

    notesList.querySelectorAll(".note-list-item").forEach((item) => {
      item.addEventListener("click", () => {
        const noteId = parseInt((item as HTMLElement).dataset.id!);
        openEditorForEdit(noteId);
      });
    });
  }

  const totalPages = Math.ceil(filteredNotes.length / PAGE_SIZE);
  renderPagination(totalPages, loadAndRenderCallback);
}

export function renderPagination(totalPages: number, loadAndRenderCallback: (() => Promise<void>) | null): void {
  const notesList = document.getElementById("notesList")!;
  const existingPagination = document.querySelector(".pagination");
  if (existingPagination) existingPagination.remove();

  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination";
  paginationContainer.setAttribute("role", "navigation");
  paginationContainer.setAttribute("aria-label", "Pagination");

  const prevButton = document.createElement("button");
  prevButton.className = "pagination-btn";
  prevButton.disabled = currentPage === 1;
  prevButton.innerHTML = "← Previous";
  prevButton.setAttribute("aria-label", "Previous page");
  prevButton.addEventListener("click", () =>
    changePage(currentPage - 1, loadAndRenderCallback)
  );

  const pageInfo = document.createElement("span");
  pageInfo.className = "page-info";
  pageInfo.textContent = `Page ${currentPage} of ${Math.max(
    1,
    totalPages || 1
  )}`;

  const nextButton = document.createElement("button");
  nextButton.className = "pagination-btn";
  nextButton.disabled = currentPage >= (totalPages || 1);
  nextButton.innerHTML = "Next →";
  nextButton.setAttribute("aria-label", "Next page");
  nextButton.addEventListener("click", () =>
    changePage(currentPage + 1, loadAndRenderCallback)
  );

  paginationContainer.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" && currentPage > 1) {
      changePage(currentPage - 1, loadAndRenderCallback);
      prevButton.focus();
    } else if (e.key === "ArrowRight" && currentPage < (totalPages || 1)) {
      changePage(currentPage + 1, loadAndRenderCallback);
      nextButton.focus();
    }
  });

  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(pageInfo);
  paginationContainer.appendChild(nextButton);
  notesList.parentNode!.insertBefore(paginationContainer, notesList.nextSibling);
}

export async function changePage(newPage: number, loadAndRenderCallback: (() => Promise<void>) | null): Promise<void> {
  if (newPage < 1 || newPage > Math.ceil(allNotesCache.length / PAGE_SIZE))
    return;
  currentPage = newPage;
  if (loadAndRenderCallback) await loadAndRenderCallback();
  const url = new URL(window.location.href);
  url.searchParams.set("page", newPage.toString());
  window.history.pushState({}, "", url);
  document.querySelector(".notes-list")?.scrollIntoView({ behavior: "smooth" });
}

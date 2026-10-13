// rendering.ts - Functions for rendering notes list and pagination

import {
  formatDate,
  isRecent,
  escapeHTML,
  renderNotePreview,
} from "./utils";
import { refreshIcons } from "./icons";
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
    '.btn:not([data-filter="all"]):not([data-filter="recent"]):not([data-filter="pinned"])'
  );
  existingButtons.forEach((btn) => btn.remove());

  const allTags = new Set<string>();
  const allCategories = new Set<string>();
  allNotesCache.forEach((note) => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach((tag) => allTags.add(tag.trim().toLowerCase()));
    }
    if (note.category) {
      allCategories.add(note.category.trim().toLowerCase());
    }
  });

  const fragment = document.createDocumentFragment();
  const filters = new Set([...allCategories, ...allTags]);
  ["all", "recent", "pinned"].forEach(filter => filters.delete(filter));
  Array.from(filters).sort().forEach(filter => {
    if (!filter) return;
    const button = document.createElement("button");
    button.classList.add("btn");
    button.dataset.filter = filter;
    button.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
    button.setAttribute("aria-label", `Filter by ${filter}`);
    fragment.appendChild(button);
  });
  filterControls.appendChild(fragment);
  filterControls.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getFilteredNotes(): Note[] {
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;

  const searchTerm = searchInput.value.toLowerCase();
  return allNotesCache.filter((note) => {
    const matchesSearch =
      (note.title && note.title.toLowerCase().includes(searchTerm)) ||
      (note.content && note.content.toLowerCase().includes(searchTerm)) ||
      (note.tags &&
        note.tags.some((tag) => tag.toLowerCase().includes(searchTerm)));
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "recent" && note.date && isRecent(note.date)) ||
      (currentFilter === "pinned" && note.pinned) ||
      (note.tags &&
        note.tags.some((tag) => tag.toLowerCase() === currentFilter)) ||
      (note.category && note.category.toLowerCase() === currentFilter);
    return matchesSearch && matchesFilter;
  });
}

export function getTotalPages(): number {
  return Math.max(1, Math.ceil(getFilteredNotes().length / PAGE_SIZE));
}

export function renderNotesList(loadAndRenderCallback: (() => Promise<void>) | null = null): void {
  const notesList = document.getElementById("notesList")!;
  const sidebarEmptyState = document.getElementById("sidebarEmptyState")!;
  renderFilterButtons();
  const filteredNotes = getFilteredNotes();
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  if (currentFilter !== "recent") {
    filteredNotes.sort((a, b) => {
      // Pinned notes come first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Then sort by date
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
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
                        )} ${note.pinned ? '<i data-lucide="pin" class="pin-icon"></i>' : ''}</div>
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

    // Re-create Lucide icons after DOM update
    refreshIcons();
  }

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
  prevButton.textContent = "← Prev";
  prevButton.setAttribute("aria-label", "Previous page");
  prevButton.addEventListener("click", () =>
    changePage(currentPage - 1, totalPages, loadAndRenderCallback)
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
  nextButton.textContent = "Next →";
  nextButton.setAttribute("aria-label", "Next page");
  nextButton.addEventListener("click", () =>
    changePage(currentPage + 1, totalPages, loadAndRenderCallback)
  );

  paginationContainer.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" && currentPage > 1) {
      changePage(currentPage - 1, totalPages, loadAndRenderCallback);
      prevButton.focus();
    } else if (e.key === "ArrowRight" && currentPage < (totalPages || 1)) {
      changePage(currentPage + 1, totalPages, loadAndRenderCallback);
      nextButton.focus();
    }
  });

  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(pageInfo);
  paginationContainer.appendChild(nextButton);
  notesList.parentNode!.insertBefore(paginationContainer, notesList.nextSibling);
}

export async function changePage(newPage: number, totalPages: number, loadAndRenderCallback: (() => Promise<void>) | null, updateHistory: boolean = true): Promise<void> {
  if (!Number.isInteger(newPage) || newPage < 1 || newPage > totalPages)
    return;
  currentPage = newPage;
  if (loadAndRenderCallback) await loadAndRenderCallback();
  else renderNotesList();
  const url = new URL(window.location.href);
  url.searchParams.set("page", newPage.toString());
  if (updateHistory) window.history.pushState({}, "", url);
  document.querySelector(".notes-list")?.scrollIntoView({ behavior: "smooth" });
}

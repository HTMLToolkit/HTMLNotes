// utils.ts - Helper utility functions
import { marked } from "marked";
import DOMPurify from "dompurify";

const markdownCache = new Map<string, string>();

function parseStoredDate(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return new Date(dateString);
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date(NaN);
  }
  return date;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = parseStoredDate(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

export function isRecent(dateString: string): boolean {
  try {
    const noteDate = parseStoredDate(dateString);
    if (isNaN(noteDate.getTime())) return false;
    const now = new Date();
    const noteDay = Date.UTC(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = (today - noteDay) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  } catch (e) {
    return false;
  }
}

export function inferCategory(tags: string[]): string {
  if (!tags || tags.length === 0) return "personal";
  if (
    tags.some((tag) => ["work", "meeting", "project", "business"].includes(tag))
  )
    return "work";
  if (
    tags.some((tag) =>
      ["idea", "concept", "brainstorm", "innovation"].includes(tag)
    )
  )
    return "ideas";
  return "personal";
}

export function escapeHTML(str: string): string {
  if (typeof str !== "string") return "";
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function validateTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag && /^[a-z0-9-_]+$/.test(tag))
    .filter((tag, index, arr) => arr.indexOf(tag) === index);
}

export function renderNotePreview(content: string): string {
  if (!content) return "No content";
  const key = content;
  if (!markdownCache.has(key)) {
    const preview = marked.parse(
      escapeHTML(
        content.substring(0, 120) + (content.length > 120 ? "..." : "")
      )
    ) as string;
    markdownCache.set(key, DOMPurify.sanitize(preview));
    if (markdownCache.size > 100) {
      const firstKey = markdownCache.keys().next().value;
      if (firstKey) {
        markdownCache.delete(firstKey);
      }
    }
  }
  return markdownCache.get(key)!;
}

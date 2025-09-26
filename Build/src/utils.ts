// utils.ts - Helper utility functions
import { marked } from "marked";

const markdownCache = new Map<string, string>();

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
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
    const noteDate = new Date(dateString);
    if (isNaN(noteDate.getTime())) return false;
    const now = new Date();
    noteDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24));
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
  const key = content.substring(0, 100);
  if (!markdownCache.has(key)) {
    const preview = marked.parse(
      escapeHTML(
        content.substring(0, 120) + (content.length > 120 ? "..." : "")
      )
    ) as string;
    markdownCache.set(key, preview);
    if (markdownCache.size > 100) {
      const firstKey = markdownCache.keys().next().value;
      if (firstKey) {
        markdownCache.delete(firstKey);
      }
    }
  }
  return markdownCache.get(key)!;
}

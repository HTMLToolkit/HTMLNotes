// editor.js - TinyMDE editor functions
const TinyMDE = window.TinyMDE;
import { showToast } from "./notifications.js";
import { showSavingIndicator, hideSavingIndicator } from "./ui.js";

let tinyMdeEditor = null;

export function initializeTinyMDE(debounceCallback, attempts = 3) {
  const editorContainer = document.getElementById("tinymde-editor");
  if (!editorContainer) {
    if (attempts > 0) {
      setTimeout(() => initializeTinyMDE(attempts - 1), 100);
      return;
    }
    showToast("Editor container not found.", "error");
    return;
  }

  try {
    tinyMdeEditor = new TinyMDE.Editor({
      element: editorContainer,
      forceSync: true,
      status: false,
      spellChecker: false,
      promptURLs: true,
      autofocus: true,
      placeholder: "Start writing your note here...",
      toolbar: [
        "bold",
        "italic",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "image",
        "table",
        "|",
        "preview",
        "side-by-side",
        "fullscreen",
        "|",
        "guide",
      ],
      onUpdate: debounceCallback,
    });
    var commandBar1 = new TinyMDE.CommandBar({
      element: "tinymde_commandbar1",
      editor: tinyMdeEditor,
    });

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (m) =>
            m.type === "childList" ||
            (m.type === "characterData" &&
              m.target.parentNode?.closest(".TinyMDE"))
        )
      ) {
        if (!window.isSettingEditorContent) debounceCallback();
      }
    });

    const editorContent = editorContainer.querySelector(".TinyMDE");
    if (editorContent) {
      observer.observe(editorContent, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    window.editorObserver = observer;
  } catch (error) {
    console.error("Error initializing TinyMDE:", error);
    showToast("Error initializing editor.", "error");
  }
}

export function setEditorContent(content) {
  if (!tinyMdeEditor) return;
  try {
    window.isSettingEditorContent = true;
    tinyMdeEditor.setContent(content || "");
    setTimeout(() => (window.isSettingEditorContent = false), 100);
  } catch (error) {
    console.error("Error setting editor content:", error);
    window.isSettingEditorContent = false;
  }
}

export function getEditorContent() {
  return tinyMdeEditor ? tinyMdeEditor.getContent().trim() : "";
}

export function enableEditor() {
  if (tinyMdeEditor && typeof tinyMdeEditor.enable === "function") {
    tinyMdeEditor.enable();
  }
}

export function focusEditor() {
  if (tinyMdeEditor && tinyMdeEditor.codemirror) {
    tinyMdeEditor.codemirror.focus();
  }
}

export function createDebounceAutosave(handleSaveNoteCallback) {
  let timeout;
  let lastContent = "";
  let lastTitle = "";
  let lastTags = "";
  let saveQueue = [];
  let isSaving = false;

  return () => {
    clearTimeout(timeout);
    const currentContent = getEditorContent();
    const noteTitleInput = document.getElementById("noteTitle");
    const noteTagsInput = document.getElementById("noteTags");
    const currentTitle = noteTitleInput ? noteTitleInput.value.trim() : "";
    const currentTags = noteTagsInput ? noteTagsInput.value.trim() : "";

    if (
      currentContent === lastContent &&
      currentTitle === lastTitle &&
      currentTags === lastTags
    )
      return;

    saveQueue.push({ currentContent, currentTitle, currentTags });

    const processQueue = async () => {
      if (saveQueue.length === 0 || isSaving) return;
      isSaving = true;
      const addNoteBtn = document.getElementById("addNoteBtn");
      addNoteBtn.disabled = true;
      addNoteBtn.setAttribute("aria-disabled", "true");
      const timeoutId = setTimeout(() => {
        if (isSaving) {
          isSaving = false;
          addNoteBtn.disabled = false;
          addNoteBtn.setAttribute("aria-disabled", "false");
          showToast("Autosave timed out.", "error");
        }
      }, 5000);

      const { currentContent, currentTitle, currentTags } = saveQueue.shift();
      const { showSavingIndicator, hideSavingIndicator } = await import(
        "./ui.js"
      );
      showSavingIndicator();
      try {
        await handleSaveNoteCallback(false);
        lastContent = currentContent;
        lastTitle = currentTitle;
        lastTags = currentTags;
      } catch (error) {
        showToast("Error saving note.", "error");
      } finally {
        clearTimeout(timeoutId);
        hideSavingIndicator();
        isSaving = false;
        addNoteBtn.disabled = false;
        addNoteBtn.setAttribute("aria-disabled", "false");
        if (saveQueue.length > 0) setTimeout(processQueue, 100);
      }
    };

    timeout = setTimeout(processQueue, 1000);
  };
}

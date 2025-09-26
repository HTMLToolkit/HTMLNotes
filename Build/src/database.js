// database.js - IndexedDB operations for notes

let db;
const DB_NAME = "HTMLNotesDB";
const DB_VERSION = 1;
const OBJECT_STORE_NAME = "notes";

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("Database error");
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      const objectStore = db.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      objectStore.createIndex("date", "date", { unique: false });
      objectStore.createIndex("category", "category", { unique: false });
    };
    request.onsuccess = () => {
      db = event.target.result;
      resolve(db);
    };
  });
}

export function addNote(note) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.add(note);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Error adding note");
  });
}

export function updateNote(note) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.put(note);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error updating note");
  });
}

export function deleteNote(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error deleting note");
  });
}

export function getAllNotes() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Error getting all notes");
  });
}

export function getNoteById(id) {
  const noteId = parseInt(id);
  if (isNaN(noteId)) return Promise.reject("Invalid note ID");
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.get(noteId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Error getting note by ID");
  });
}
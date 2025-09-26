// database.ts - IndexedDB operations for notes
let db: IDBDatabase;
const DB_NAME = "HTMLNotesDB";
const DB_VERSION = 1;
const OBJECT_STORE_NAME = "notes";

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("Database error");
    };
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      if (!event.target) {
        reject("Database upgrade event target is null");
        return;
      }
      db = (event.target as IDBOpenDBRequest).result;
      const objectStore = db.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      objectStore.createIndex("date", "date", { unique: false });
      objectStore.createIndex("category", "category", { unique: false });
    };
    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
  });
}

export function addNote(note: Note): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.add(note);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject("Error adding note");
  });
}

export function updateNote(note: Note): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.put(note);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error updating note");
  });
}

export function deleteNote(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error deleting note");
  });
}

export function getAllNotes(): Promise<Note[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.getAll();
    request.onsuccess = () => resolve(request.result as Note[]);
    request.onerror = () => reject("Error getting all notes");
  });
}

export function getNoteById(id: number): Promise<Note | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OBJECT_STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
    const request = objectStore.get(id);
    request.onsuccess = () => resolve(request.result as Note | undefined);
    request.onerror = () => reject("Error getting note by ID");
  });
}
interface Note {
  id?: number;
  title: string;
  content: string;
  tags: string[];
  date: string;
  category: string;
  pinned?: boolean;
}
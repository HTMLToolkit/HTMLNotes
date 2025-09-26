interface TinyMDE {
    Editor: any;
    CommandBar: any;
}

interface LucideAPI {
    createIcons(): void;
}

declare var lucide: LucideAPI;

interface Window {
    TinyMDE: TinyMDE;
}
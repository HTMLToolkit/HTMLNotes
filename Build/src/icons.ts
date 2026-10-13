import {
  createIcons, Menu, Settings, X, Sun, Moon, Monitor, Pin, PinOff,
  ChevronDown, Plus, Upload, Download, Trash2, Search, FileText,
} from "lucide";

// Bundle only the icons the app uses, including dynamically rendered pins.
export function refreshIcons(): void {
  createIcons({
    icons: { Menu, Settings, X, Sun, Moon, Monitor, Pin, PinOff, ChevronDown, Plus, Upload, Download, Trash2, Search, FileText },
    attrs: { "aria-hidden": "true", focusable: "false" },
  });
}

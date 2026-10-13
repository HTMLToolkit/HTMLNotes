// notifications.ts - Toast notifications

export function showToast(message: string, type: string = "error", duration: number = 3000, action?: { label: string; onClick: () => void }): () => void {
  const toastContainer = document.getElementById("toastContainer")!;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  if (action) {
    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = action.label;
    actionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      action.onClick();
    });
    toast.appendChild(actionButton);
  }
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.onclick = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };
  toast.appendChild(closeButton);
  toastContainer.appendChild(toast);
  void toast.offsetWidth;
  toast.classList.add("show");
  const timeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
  return () => {
    clearTimeout(timeout);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };
}

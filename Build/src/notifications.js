// notifications.js - Toast notifications

export function showToast(message, type = "error", duration = 3000) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
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

export function pushToast(options: {
  message: string;
  type?: "success" | "error" | "info";
  containerId?: string;
  durationMs?: number;
}): void {
  const {
    message,
    type = "info",
    containerId = "toastContainer",
    durationMs = 3000,
  } = options;

  const container = document.getElementById(containerId);
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

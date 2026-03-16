export function openModalDialog(options: {
  title: string;
  bodyHtml: string;
  titleId?: string;
  bodyId?: string;
  overlayId?: string;
}): void {
  const {
    title,
    bodyHtml,
    titleId = "modalTitle",
    bodyId = "modalBody",
    overlayId = "modalOverlay",
  } = options;

  document.getElementById(titleId)!.textContent = title;
  document.getElementById(bodyId)!.innerHTML = bodyHtml;
  document.getElementById(overlayId)!.classList.add("active");
  document.body.style.overflow = "hidden";
}

export function closeModalDialog(overlayId = "modalOverlay"): void {
  document.getElementById(overlayId)!.classList.remove("active");
  document.body.style.overflow = "";
}

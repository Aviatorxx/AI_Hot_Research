export function getPaginationSequence(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "..."> = [1];

  if (current > 3) {
    pages.push("...");
  }

  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page++
  ) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

export function renderPagination(options: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageClick?: string;
}): string {
  const { currentPage, totalPages, totalItems, pageSize } = options;

  if (totalPages <= 1) {
    return "";
  }

  const startIdx = (currentPage - 1) * pageSize;
  const pages = getPaginationSequence(currentPage, totalPages);

  let html = '<div class="pagination">';
  html += `<button class="page-btn" data-action="goToPage" data-page="${currentPage - 1}" ${
    currentPage <= 1 ? "disabled" : ""
  }>‹</button>`;

  for (const page of pages) {
    if (page === "...") {
      html += '<span class="page-info">…</span>';
      continue;
    }

    html += `<button class="page-btn ${
      page === currentPage ? "active" : ""
    }" data-action="goToPage" data-page="${page}">${page}</button>`;
  }

  html += `<button class="page-btn" data-action="goToPage" data-page="${currentPage + 1}" ${
    currentPage >= totalPages ? "disabled" : ""
  }>›</button>`;
  html += `<span class="page-info">${startIdx + 1}-${Math.min(
    startIdx + pageSize,
    totalItems,
  )} / ${totalItems}</span>`;
  html += "</div>";

  return html;
}

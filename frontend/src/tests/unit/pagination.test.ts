import {
  getPaginationSequence,
  renderPagination,
} from "@/shared/components/pagination/pagination";

describe("getPaginationSequence", () => {
  it("returns compact page sequence with ellipsis", () => {
    expect(getPaginationSequence(5, 10)).toEqual([
      1,
      "...",
      4,
      5,
      6,
      "...",
      10,
    ]);
  });
});

describe("renderPagination", () => {
  it("renders pagination summary and active page", () => {
    const html = renderPagination({
      currentPage: 2,
      totalPages: 4,
      totalItems: 77,
      pageSize: 20,
    });

    expect(html).toContain('class="page-btn active"');
    expect(html).toContain("21-40 / 77");
    expect(html).toContain('data-action="goToPage"');
    expect(html).toContain('data-page="3"');
  });
});

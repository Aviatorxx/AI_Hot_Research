import { expect, test, type Page } from "@playwright/test";

async function registerUser(page: Page) {
  const username = `pw_${Date.now()}`;
  const password = "pw_test_1234";
  const response = await page.request.post("/api/auth/register", {
    data: { username, password },
  });

  expect(response.ok()).toBeTruthy();
  return { username, password };
}

test("core dashboard flow works end-to-end", async ({ page }) => {
  test.setTimeout(120_000);
  const credentials = await registerUser(page);

  const htmlResponse = await page.request.get("/");
  expect(htmlResponse.ok()).toBeTruthy();
  const rawHtml = await htmlResponse.text();
  expect(rawHtml).toContain('data-action="refreshData"');
  expect(rawHtml).toContain('data-keydown-action="submitAuthOnEnter"');
  expect(rawHtml).toContain('id="profileModalOverlay"');
  expect(rawHtml).toContain('data-action="saveProfile"');
  expect(rawHtml).not.toContain("onclick=");
  expect(rawHtml).toContain('id="themeToggle"');
  expect(rawHtml).toContain('id="statNewTopics"');
  expect(rawHtml).toContain('id="feedModeResonance"');

  await page.goto("/");

  await expect(page.locator("#platformTabs")).toBeVisible();
  await expect(page.locator("#statTotal")).not.toHaveText("--", {
    timeout: 30_000,
  });
  await expect(page.locator("#statNewTopics")).not.toHaveText("--");
  await expect(page.locator("#statResonance")).not.toHaveText("--");
  await expect(page.locator("#statRising")).not.toHaveText("--");
  await expect(page.locator("#themeToggle")).toBeVisible();

  await page.getByRole("button", { name: "登录" }).click();
  await page.fill("#authUsername", credentials.username);
  await page.fill("#authPassword", credentials.password);
  await page.click("#authSubmitBtn");
  await expect(page.locator("#authArea")).toContainText(credentials.username, {
    timeout: 15_000,
  });
  await expect(page.locator("#chatInput")).toBeEnabled();

  await page.click("#authArea .user-menu-trigger");
  await expect(page.locator("#authArea .user-dropdown")).toHaveClass(/active/);
  await expect(page.locator("#authArea .user-dropdown")).toContainText("我的偏好");
  await expect(page.locator("#authArea .user-dropdown")).toContainText("编辑资料");

  await page.click('#authArea [data-action="openProfileEditor"]');
  await expect(page.locator("#profileModalOverlay")).toHaveClass(/active/);
  await page.fill("#profileNicknameInput", "测试昵称");
  await page.click("#profileSaveBtn");
  await expect(page.locator("#profileModalOverlay")).not.toHaveClass(/active/, {
    timeout: 15_000,
  });
  await expect(page.locator("#authArea")).toContainText("测试昵称");

  await page.locator('button[data-platform="all"]').click();
  await expect(page.locator("#searchWrap")).toBeVisible();
  await expect(page.locator("#topicListContainer .topic-item").first()).toBeVisible({
    timeout: 30_000,
  });

  const firstTopic = page.locator("#topicListContainer .topic-item").first();
  const firstTopicTitle = (await firstTopic.locator(".topic-title").textContent())?.trim() || "";
  await firstTopic.hover();
  await firstTopic.locator(".like-btn").click();

  await page.locator('button[data-platform="mine"]').click();
  await expect(page.locator("#searchWrap")).toBeHidden();
  await expect(page.locator("#myChatSection")).toBeVisible();
  await expect(page.locator("#topicCount")).toContainText("saved");
  await expect(page.locator(".summary-strip")).toContainText("关注话题");
  await expect(page.locator(".summary-strip")).toContainText("订阅关键词");
  await expect(page.locator(".summary-strip")).toContainText("热榜关联");
  await expect(page.locator("#myDiscoverSection")).toContainText("热榜相关情报入口");

  await page.click("#authArea .user-menu-trigger");
  await page.click('#authArea [data-action="openUserPreferences"]');
  await expect(page.locator('button[data-platform="mine"]')).toHaveClass(/active/);
  await expect(page.locator("#keywordInput")).toBeFocused();

  await page.click('button:has-text("查看收藏")');
  await expect(page.locator("#modalOverlay")).toHaveClass(/active/);
  await expect(page.locator("#modalBody")).toContainText(firstTopicTitle.slice(0, 4));
  await page.click("#modalOverlay .modal-close");

  await page.fill("#keywordInput", "AI");
  await page.click('button:has-text("添加")');
  await expect(page.locator("#keywordTagsContainer")).toContainText("AI");

  await page.click('.discover-tab:has-text("外部新闻")');
  await expect(page.locator("#externalFeedContainer")).not.toContainText("加载中", {
    timeout: 30_000,
  });

  await page.locator('button[data-platform="all"]').click();
  await page.click("#feedModeResonance");
  await expect(page.locator("#feedModeResonance")).toHaveClass(/active/);
  await page.click("#feedModeRising");
  await expect(page.locator("#feedModeRising")).toHaveClass(/active/);
  const analysisPanelBefore = (await page.locator("#aiPanelContainer").textContent())?.trim() || "";
  await page.click("#btnAnalyze");
  await expect
    .poll(
      async () => (await page.locator("#aiPanelContainer").textContent())?.trim() || "",
      { timeout: 45_000 },
    )
    .not.toBe(analysisPanelBefore);
  await expect(page.locator("#aiPanelContainer")).not.toBeEmpty();

  await firstTopic.locator('button[title*="AI"]').click();
  await expect(page.locator("#aiPanelContainer")).toContainText("分析任务");
  await expect(page.locator("#aiPanelContainer .analysis-job-card")).toHaveCount(1);
  await expect(page.locator("#aiPanelContainer")).toContainText(/分析中|已完成|失败/);

  await page.locator('button[data-platform="mine"]').click();
  await page.click('#aiPanelContainer button:has-text("刷新推荐")');
  await expect(page.locator("#aiPanelContainer .loading-skeleton")).toBeVisible();
  await expect(page.locator("#aiPanelContainer .loading-skeleton")).toBeHidden({
    timeout: 45_000,
  });
  await expect(page.locator("#chatMessages")).toContainText(/你好！我是全能 AI 助手|个性化报告|关键词抓取/);
  await expect(page.locator("#aiPanelContainer")).toContainText(/查看热榜相关|去添加关注|兴趣画像|为你推荐/);

  await page.fill("#chatInput", "请用一句话总结今天的热点");
  await page.click('button[aria-label="发送"]');
  await expect(page.locator("#chatMessages .chat-msg.user").last()).toContainText("请用一句话总结今天的热点");
  await expect(page.locator("#chatMessages #chatPending")).toBeVisible();
  await expect(page.locator("#chatMessages #chatPending")).toBeHidden({
    timeout: 45_000,
  });

  await page.click("#authArea .user-menu-trigger");
  await page.click('#authArea [data-action="logout"]');
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
  await expect(page.locator("#chatInput")).toBeDisabled();
});

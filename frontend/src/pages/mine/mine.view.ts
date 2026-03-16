interface MineLikeInfo {
  platform: string;
  url: string;
}

interface MineKeyword {
  id: number;
  value: string;
}

interface RelatedTopic {
  title: string;
  url?: string;
  platform: string;
  matchedTerm: string;
}

interface RecommendedTopic {
  title: string;
  url?: string;
  platform?: string;
  reason?: string;
}

interface FeedArticle {
  title: string;
  url: string;
  keyword: string;
  source?: string;
}

interface ChatSessionSummary {
  id: number;
  title?: string;
  created_at?: string;
}

export function renderMinePageMarkup(options: {
  likes: Array<[string, MineLikeInfo]>;
  related: RelatedTopic[];
  keywords: MineKeyword[];
  hasCurrentUser: boolean;
  platformNames: Record<string, string>;
  visiblePlatformIds: string[];
  activeDiscoverTab: "hot" | "ext";
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const {
    likes,
    related,
    keywords,
    hasCurrentUser,
    platformNames,
    visiblePlatformIds,
    activeDiscoverTab,
    escapeHtml,
    escapeAttr,
  } = options;

  const hasTerms = keywords.length > 0 || likes.length > 0;
  const relatedStatus = !hasTerms
    ? "先添加关注"
    : related.length > 0
      ? `有 ${related.length} 条命中`
      : "暂无命中";
  const relatedStatusClass = related.length > 0 ? "is-ready" : "is-empty";

  let html = '<div class="my-page mine-workspace">';

  html += `<div class="mine-main-column">
    <div class="mine-shell-header">
      <div class="mine-shell-copy">
        <div class="mine-shell-kicker">我的关注工作台</div>
        <div class="mine-shell-title">把关注方向、热榜线索和 AI 追问集中到一个工作区里。</div>
        <div class="mine-shell-desc">左侧看内容和相关线索，右侧做订阅管理与推荐操作，避免在长页面里来回切换。</div>
      </div>
      <div class="mine-shell-actions">
        <button class="focus-link-btn primary" data-action="openRelatedHotSection">查看热榜相关</button>
        <button class="focus-link-btn secondary" data-action="fetchRecommendations">刷新推荐</button>
        <button class="focus-link-btn tertiary" data-action="focusKeywordInput">管理关注</button>
      </div>
    </div>

    <div class="summary-strip">
        <div class="summary-card">
          <div class="summary-kicker">关注话题</div>
          <div class="summary-value">${likes.length}</div>
          <div class="summary-note">已收藏的重点话题，会持续追踪。</div>
        </div>
        <div class="summary-card">
          <div class="summary-kicker">订阅关键词</div>
          <div class="summary-value">${keywords.length}</div>
          <div class="summary-note">命中热榜与外部新闻时会第一时间提醒。</div>
        </div>
        <div class="summary-card">
          <div class="summary-kicker">热榜关联</div>
          <div class="summary-value">${related.length}</div>
          <div class="summary-note">当前热榜中与你关注方向相关的线索数量。</div>
        </div>
      </div>

    <div class="my-focus-card" id="myDiscoverSection">
      <div class="my-focus-head">
        <div class="my-focus-copy">
          <div class="my-focus-title">热榜相关情报入口</div>
          <div class="my-focus-desc">把你收藏的话题和订阅关键词直接映射到热榜与外部新闻，快速判断今天有没有值得跟进的新线索。</div>
        </div>
        <div class="my-focus-status ${relatedStatusClass}">${relatedStatus}</div>
      </div>
      <div class="my-focus-actions">
        ${
          hasTerms
            ? `<button class="focus-link-btn primary" data-action="openRelatedHotSection">查看热榜相关</button>
               <button class="focus-link-btn" data-action="openFeedMode" data-mode="all">查看全部平台</button>`
            : `<button class="focus-link-btn primary" data-action="focusKeywordInput">去添加关注</button>
               <button class="focus-link-btn" data-action="openFeedMode" data-mode="resonance">先看跨平台共振</button>`
        }
      </div>
      <div class="discover-tabs">
        <button class="discover-tab ${activeDiscoverTab === "hot" ? "active" : ""}" data-action="switchDiscoverTab" data-tab="hot">
          热榜相关 <span class="dtab-count">${related.length}</span>
        </button>
        ${
          keywords.length > 0
            ? `<button class="discover-tab ${activeDiscoverTab === "ext" ? "active" : ""}" data-action="switchDiscoverTab" data-tab="ext">
                外部新闻 <span class="dtab-count" id="extNewsCount">…</span>
              </button>`
            : ""
        }
      </div>
      <div class="discover-pane ${activeDiscoverTab === "hot" ? "active" : ""}" id="discoverPaneHot">`;

  if (related.length === 0) {
    html += `<div class="discover-empty">
      <strong>${hasTerms ? "当前热榜里还没有命中你的关注方向。" : "你还没有建立关注方向。"}</strong>
      ${hasTerms ? "可以先刷新数据，或补充更具体的关键词来缩小范围。" : "添加关键词或收藏话题后，这里会自动筛出与你相关的热榜内容。"}
    </div>`;
  } else {
    html += '<div class="topic-list">';
    for (const topic of related) {
      const platformName = platformNames[topic.platform] || topic.platform || "";
      const highlighted = escapeHtml(topic.title).replace(
        new RegExp(
          escapeHtml(topic.matchedTerm).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi",
        ),
        (match) =>
          `<mark style="background:rgba(0,255,255,0.15);color:var(--neon-cyan);border-radius:2px">${match}</mark>`,
      );
      html += `<a class="topic-item" ${
        topic.url
          ? `href="${escapeAttr(topic.url)}" target="_blank" rel="noopener noreferrer"`
          : ""
      }>
        <div class="topic-content">
          <div class="topic-title">${highlighted}</div>
          <div class="topic-meta">
            <span class="topic-category">${escapeHtml(platformName)}</span>
            <span class="topic-heat" style="color:var(--neon-cyan);opacity:0.7">${escapeHtml(topic.matchedTerm)}</span>
          </div>
        </div>
        <div class="topic-actions">
          <button class="topic-action-btn like-btn" data-action="toggleLike" data-title="${escapeAttr(topic.title)}" data-platform="${escapeAttr(topic.platform)}" data-url="${escapeAttr(topic.url || "")}" title="收藏">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="topic-action-btn" data-action="analyzeTopic" data-title="${escapeAttr(topic.title)}" title="AI 分析">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-5 7h14l-5-7c1-1 2-2 2-4a4 4 0 0 0-4-4z"/><path d="M12 18v4"/></svg>
          </button>
        </div>
      </a>`;
    }
    html += "</div>";
  }

  html += `</div>`;

  if (keywords.length > 0) {
    html += `<div class="discover-pane ${activeDiscoverTab === "ext" ? "active" : ""}" id="discoverPaneExt">
      <div id="externalFeedContainer">
        <div style="font-size:12px;color:var(--text-muted);padding:4px 0">🔄 加载中...</div>
      </div>
    </div>`;
  }

  html += `</div>
  </div>`;

  html += `<aside class="mine-side-column">
      <div class="mine-side-label">管理与偏好</div>
      <section class="mine-side-card" id="keywordSubscriptionSection">
        <div class="mine-side-card-header">
          <div>
            <div class="mine-side-card-title">关键词订阅</div>
            <div class="mine-side-card-copy">把稳定关注的主题沉淀成订阅项，减少每次手动筛选。</div>
          </div>
        </div>
        <div class="keyword-input-row">
          <input class="keyword-input" id="keywordInput" type="text"
            placeholder="输入关键词（如：AI、比特币）" maxlength="50"
            data-keydown-action="addKeyword">
          <button class="btn btn-primary" data-action="addKeyword">添加</button>
        </div>
        <div class="keyword-tags" id="keywordTagsContainer"></div>
      </section>`;

  html += `<details class="mine-collapsible mine-side-card" id="platformVisibilitySection">
      <summary class="mine-collapsible-summary">
        <div>
          <div class="mine-side-card-title">平台展示</div>
          <div class="mine-side-card-copy">控制首页 tabs 和“全部平台”里真正要看的来源。</div>
        </div>
        <span class="mine-collapsible-meta">${visiblePlatformIds.length} / ${Object.keys(platformNames).length}</span>
      </summary>
      <div class="mine-collapsible-body">
        <div class="platform-visibility-copy">未勾选的平台会从顶部 tabs 和“全部平台”聚合页中隐藏。</div>
        <div class="platform-visibility-grid">
          ${Object.entries(platformNames)
            .map(([platform, name]) => {
              const active = visiblePlatformIds.includes(platform);
              return `<button class="platform-visibility-chip ${active ? "active" : ""}" data-action="togglePlatformVisibility" data-platform="${escapeAttr(platform)}" aria-pressed="${active ? "true" : "false"}">
                <span>${escapeHtml(name)}</span>
                <span class="platform-visibility-state">${active ? "显示" : "隐藏"}</span>
              </button>`;
            })
            .join("")}
        </div>
      </div>
    </details>`;

  html += `<section class="mine-side-card">
      <div class="mine-side-card-header">
        <div>
          <div class="mine-side-card-title">收藏夹</div>
          <div class="mine-side-card-copy">把确认值得追踪的话题沉淀下来，后续可以直接分析和回看。</div>
        </div>
        <div class="mine-side-pill">${likes.length} 条</div>
      </div>
      <div class="mine-side-actions">
        <button class="btn mine-side-btn" data-action="showLikesModal" ${likes.length === 0 ? "disabled" : ""}>
          查看收藏
        </button>
      </div>
    </section>`;

  if (hasCurrentUser) {
    html += `<details class="mine-collapsible mine-side-card" id="chatHistorySection">
      <summary class="mine-collapsible-summary">
        <div>
          <div class="mine-side-card-title">历史会话</div>
          <div class="mine-side-card-copy">保留最近的追问上下文，适合继续跟进同一批热点。</div>
        </div>
        <span class="mine-collapsible-meta">最近记录</span>
      </summary>
      <div class="mine-collapsible-body">
        <div id="chatHistoryList"><div style="font-size:12px;color:var(--text-muted)">加载中...</div></div>
      </div>
    </details>`;
  }

  html += "</aside></div>";
  return html;
}

export function renderLikesModalMarkup(options: {
  likes: Array<[string, MineLikeInfo]>;
  platformNames: Record<string, string>;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const { likes, platformNames, escapeHtml, escapeAttr } = options;

  if (likes.length === 0) {
    return '<p style="color:var(--text-muted);font-size:13px">暂无收藏，在话题列表中点击 ❤️ 即可收藏。</p>';
  }

  let html = '<div class="topic-list">';
  for (const [title, info] of likes) {
    const platformName = platformNames[info.platform] || info.platform || "";
    html += `<a class="topic-item" ${
      info.url
        ? `href="${escapeAttr(info.url)}" target="_blank" rel="noopener noreferrer"`
        : ""
    }>
      <div class="topic-content">
        <div class="topic-title">${escapeHtml(title)}</div>
        <div class="topic-meta"><span class="topic-category">${escapeHtml(platformName)}</span></div>
      </div>
      <div class="topic-actions" style="opacity:1">
        <button class="topic-action-btn like-btn liked" data-action="deleteLikeAndRefresh" data-title="${escapeAttr(title)}" title="取消收藏">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="topic-action-btn" data-action="analyzeTopic" data-title="${escapeAttr(title)}" title="AI 分析">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-5 7h14l-5-7c1-1 2-2 2-4a4 4 0 0 0-4-4z"/><path d="M12 18v4"/></svg>
        </button>
      </div>
    </a>`;
  }
  html += "</div>";
  return html;
}

export function renderRecommendationsPanelMarkup(options: {
  data: {
    query_summary?: string;
    interest_tags?: string[];
    recommended_topics?: RecommendedTopic[];
  } | null;
  prefixHtml?: string;
  hasTerms: boolean;
  statusSummary: {
    likesCount: number;
    keywordsCount: number;
    relatedCount: number;
  };
  platformNames: Record<string, string>;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const {
    data,
    prefixHtml = "",
    hasTerms,
    statusSummary,
    platformNames,
    escapeHtml,
    escapeAttr,
  } = options;
  const recommendationCount = data?.recommended_topics?.length || 0;
  const statusNote = !hasTerms
    ? "你还没有建立稳定的关注方向，先补关键词或收藏话题，推荐结果才会更像个人工作台。"
    : recommendationCount > 0
      ? "推荐已经就绪，建议先看第一条推荐，再决定是加入关注还是直接分析。"
      : "你已经有关注方向，但还没有最新推荐，刷新一次就能把当前热榜映射进来。";
  const stateSectionHtml = `<div class="insight-section insight-section--state">
      <div class="insight-section-header">
        <div class="insight-section-title">当前状态</div>
        <div class="insight-section-meta">个人助手概览</div>
      </div>
      <div class="ai-state-grid">
        <div class="ai-state-chip">
          <span class="ai-state-chip-label">收藏话题</span>
          <span class="ai-state-chip-value">${statusSummary.likesCount}</span>
        </div>
        <div class="ai-state-chip">
          <span class="ai-state-chip-label">订阅关键词</span>
          <span class="ai-state-chip-value">${statusSummary.keywordsCount}</span>
        </div>
        <div class="ai-state-chip">
          <span class="ai-state-chip-label">热榜命中</span>
          <span class="ai-state-chip-value">${statusSummary.relatedCount}</span>
        </div>
        <div class="ai-state-chip">
          <span class="ai-state-chip-label">推荐结果</span>
          <span class="ai-state-chip-value">${recommendationCount}</span>
        </div>
      </div>
      <div class="ai-state-note">${escapeHtml(statusNote)}</div>
    </div>`;
  const headActionHtml = hasTerms
    ? `<button class="ai-head-action" data-action="fetchRecommendations">刷新推荐</button>`
    : `<button class="ai-head-action" data-action="focusKeywordInput">去添加关注</button>`;

  if (!data) {
    return `<div class="ai-assistant-shell">
      <div class="ai-assistant-head">
        <div>
          <div class="ai-assistant-kicker">推荐助手</div>
          <div class="ai-assistant-title">基于你的关注方向，给出下一步可执行动作。</div>
        </div>
        <div class="ai-assistant-head-right">
          ${headActionHtml}
          <div class="ai-assistant-badge">${hasTerms ? "已建立关注" : "待补充关注"}</div>
        </div>
      </div>
      ${stateSectionHtml}
      <div class="insight-section">
        <div class="insight-section-header">
          <div class="insight-section-title">当前状态</div>
          <div class="insight-section-meta">还没有生成推荐结果</div>
        </div>
        <div class="ai-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M12 2l2 7h7l-5.5 4 2 7L12 17l-5.5 3 2-7L3 9h7z"/>
          </svg>
          <p>这里不只是推荐区，也是一块行动面板。你可以立刻刷新推荐、回到热榜相关，或先补充关注方向。</p>
        </div>
      </div>
      <div class="insight-section">
        <div class="insight-section-header">
          <div class="insight-section-title">下一步动作</div>
          <div class="insight-section-meta">从推荐面板直接进入下一步</div>
        </div>
        <div class="ai-quick-actions">
          <button class="ai-quick-btn primary" data-action="${hasTerms ? "fetchRecommendations" : "focusKeywordInput"}">${hasTerms ? "刷新推荐" : "去添加关注"}</button>
          <button class="ai-quick-btn secondary" data-action="${hasTerms ? "openRelatedHotSection" : "fetchRecommendations"}">${hasTerms ? "查看热榜相关" : "稍后刷新推荐"}</button>
          <button class="ai-quick-btn tertiary" data-action="openFeedMode" data-mode="resonance">看跨平台共振</button>
          <button class="ai-quick-btn tertiary" data-action="openFeedMode" data-mode="rising">看上升最快</button>
        </div>
      </div>
      ${prefixHtml}
    </div>`;
  }

  let html = `<div class="ai-assistant-shell">
    <div class="ai-assistant-head">
      <div>
        <div class="ai-assistant-kicker">推荐助手</div>
        <div class="ai-assistant-title">把你的关注方向转成可执行的热点追踪动作。</div>
      </div>
      <div class="ai-assistant-head-right">
        ${headActionHtml}
        <div class="ai-assistant-badge">${data.recommended_topics?.length || 0} 条推荐</div>
      </div>
    </div>
    ${stateSectionHtml}`;

  if (data.query_summary) {
    html += `<div class="insight-section">
      <div class="insight-section-header">
        <div class="insight-section-title">兴趣画像</div>
        <div class="insight-section-meta">当前关注方向总结</div>
      </div>
      <div class="ai-overview">
        <strong style="color:var(--neon-cyan)">兴趣画像：</strong>${escapeHtml(data.query_summary)}
      </div>
    </div>`;
  }

  if (data.interest_tags && data.interest_tags.length > 0) {
    html += `<div class="insight-section">
      <div class="insight-section-header">
        <div class="insight-section-title">兴趣标签</div>
        <div class="insight-section-meta">帮助推荐继续收敛</div>
      </div>
      <div class="interest-tags">${data.interest_tags.map((tag) => `<span class="interest-tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>`;
  }

  if (data.recommended_topics && data.recommended_topics.length > 0) {
    html += `<div class="insight-section">
      <div class="insight-section-header">
        <div class="insight-section-title">为你推荐</div>
        <div class="insight-section-meta">${data.recommended_topics.length} 条线索</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">`;
    for (const item of data.recommended_topics) {
      html += `<div class="recommend-topic-item">
        <a class="recommend-topic-link" ${
          item.url
            ? `href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer"`
            : ""
        }>
          <div class="recommend-topic-title">${escapeHtml(item.title)}</div>
          <div class="recommend-topic-meta">
            <span>${escapeHtml(platformNames[item.platform || ""] || item.platform || "")}</span>
            ${item.reason ? `<span class="recommend-reason">· ${escapeHtml(item.reason)}</span>` : ""}
          </div>
        </a>
        <div class="recommend-topic-actions">
          <button class="recommend-topic-action primary" data-action="openTopicInFeed" data-title="${escapeAttr(item.title)}" data-platform="${escapeAttr(item.platform || "all")}">看对应热榜</button>
          <button class="recommend-topic-action secondary" data-action="addRecommendedKeyword" data-title="${escapeAttr(item.title)}" data-reason="${escapeAttr(item.reason || "")}">加入关注</button>
          <button class="recommend-topic-action tertiary" data-action="analyzeTopic" data-title="${escapeAttr(item.title)}">立即分析</button>
        </div>
      </div>`;
    }
    html += "</div></div>";
  }

  html += `<div class="insight-section">
    <div class="insight-section-header">
      <div class="insight-section-title">下一步动作</div>
      <div class="insight-section-meta">快速切回热点工作流</div>
    </div>
    <div class="ai-quick-actions">
      <button class="ai-quick-btn primary" data-action="openRelatedHotSection">查看热榜相关</button>
      <button class="ai-quick-btn tertiary" data-action="openFeedMode" data-mode="resonance">共振优先</button>
      <button class="ai-quick-btn tertiary" data-action="openFeedMode" data-mode="rising">上升最快</button>
      <button class="ai-quick-btn secondary" data-action="fetchRecommendations">刷新推荐</button>
    </div>
  </div>
  ${prefixHtml}</div>`;

  return html;
}

export function renderRecommendationChatMarkup(options: {
  report?: string;
  articles?: FeedArticle[];
  formatChatText: (value: string) => string;
  escapeAttr: (value: string) => string;
  escapeHtml: (value: string) => string;
}): string {
  const { report, articles = [], formatChatText, escapeAttr, escapeHtml } = options;
  let chatHtml =
    '<div class="chat-msg ai"><strong>📊 个性化报告</strong><br>';
  chatHtml += report ? formatChatText(report) : "暂无报告";
  chatHtml += "</div>";

  if (articles.length > 0) {
    chatHtml += `<div class="chat-msg ai"><strong>📰 关键词抓取（${articles.length}篇）</strong>
      <div class="articles-list" style="margin-top:8px">`;
    for (const article of articles) {
      chatHtml += `<a class="article-item" href="${escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer">
        <div class="article-title">${escapeHtml(article.title)}</div>
        <div class="article-meta">
          <span class="article-kw-badge">${escapeHtml(article.keyword)}</span>
          <span>${escapeHtml(article.source || "")}</span>
        </div>
      </a>`;
    }
    chatHtml += "</div></div>";
  }

  return chatHtml;
}

export function renderChatHistoryMarkup(options: {
  sessions: ChatSessionSummary[];
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const { sessions, escapeHtml, escapeAttr } = options;

  if (sessions.length === 0) {
    return '<div style="font-size:12px;color:var(--text-muted);padding:4px 0">暂无历史会话</div>';
  }

  let html = '<div style="display:flex;flex-direction:column;gap:6px">';
  for (const session of sessions) {
    const date = session.created_at
      ? new Date(session.created_at).toLocaleString("zh-CN", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    html += `<div class="chat-history-item">
      <button class="chat-history-main" data-action="restoreSession" data-session-id="${session.id}" data-title="${escapeAttr(session.title || "对话")}">
        <div class="chat-history-title">${escapeHtml(session.title || "未命名对话")}</div>
        <div class="chat-history-meta">${escapeHtml(date)}</div>
      </button>
      <button class="chat-history-delete" data-action="deleteSession" data-session-id="${session.id}" title="删除会话">×</button>
    </div>`;
  }
  html += "</div>";
  return html;
}

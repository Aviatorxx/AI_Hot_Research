import { renderEmptyState } from "@/shared/components/empty-state/empty-state";
import { renderPagination } from "@/shared/components/pagination/pagination";
import type { HotFeedTopic } from "@/pages/hot-feed/hot-feed.types";
import type { AnalysisCluster } from "@/features/analysis/analysis.types";

interface TopicOpinion {
  positive?: string;
  negative?: string;
  neutral?: string;
}

interface TopicAnalysisData {
  error?: string;
  title?: string;
  impact_score?: number;
  category?: string;
  background?: string;
  public_opinion?: TopicOpinion;
  trend_prediction?: string;
  related_topics?: string[];
}

function renderPlatformPills(
  platforms: string[] | undefined,
  platformNames: Record<string, string>,
  escapeHtml: (value: string) => string,
): string {
  if (!platforms || platforms.length === 0) return "";
  return `<span class="topic-platform-pills">${platforms
    .map(
      (platform) =>
        `<span class="topic-platform-pill">${escapeHtml(
          platformNames[platform] || platform,
        )}</span>`,
    )
    .join("")}</span>`;
}

function renderVelocityBadge(
  velocity: HotFeedTopic["velocity"],
  escapeAttr: (value: string) => string,
): string {
  if (!velocity?.direction) return "";
  const direction = velocity.direction;
  const delta = Number(velocity.delta || 0);
  const title =
    direction === "up"
      ? `热度上升，排名上升 ${delta} 位`
      : direction === "down"
        ? `热度下降，排名下降 ${delta} 位`
        : direction === "new"
          ? "本轮新上榜"
          : "排名基本不变";
  const inner =
    direction === "new"
      ? '<span class="velocity-bars"><span class="velocity-spark"></span></span>'
      : '<span class="velocity-bars"><span class="velocity-bar"></span><span class="velocity-bar"></span><span class="velocity-bar"></span></span>';
  return `<span class="velocity-chip ${escapeAttr(direction)}" title="${escapeAttr(
    title,
  )}" aria-label="${escapeAttr(title)}">${inner}</span>`;
}

export function getHotFeedRoot(): HTMLElement | null {
  return document.getElementById("topicListContainer");
}

export function renderHotFeedMarkup(options: {
  topics: HotFeedTopic[];
  currentPlatform: string;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  likedTitles: Set<string>;
  keywordTerms: string[];
  platformNames: Record<string, string>;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
  highlightText: (escapedHtml: string, term: string, cls: string) => string;
  feedContext?: {
    label: string;
    title: string;
    meta: string;
    clearAction: string;
    clearLabel: string;
    clearKeywords?: string;
    status?: string;
  } | null;
}): string {
  const {
    topics,
    currentPlatform,
    currentPage,
    pageSize,
    searchQuery,
    likedTitles,
    keywordTerms,
    platformNames,
    escapeHtml,
    escapeAttr,
    highlightText,
    feedContext,
  } = options;

  const totalTopics = topics.length;
  const totalPages = Math.max(1, Math.ceil(totalTopics / pageSize));

  if (totalTopics === 0) {
    const empty = searchQuery
      ? renderEmptyState(`没有匹配「${escapeHtml(searchQuery)}」的话题`)
      : renderEmptyState("暂无数据，请点击「刷新数据」获取最新热点");
    return `${feedContext ? `<div class="feed-context-bar${feedContext.status ? ` lookup-context is-${escapeAttr(feedContext.status)}` : ""}">
      <div class="feed-context-copy">
        <div class="feed-context-label">${escapeHtml(feedContext.label)}</div>
        <div class="feed-context-title">${escapeHtml(feedContext.title)}</div>
        <div class="feed-context-meta">${escapeHtml(feedContext.meta)}</div>
      </div>
      <button class="feed-context-clear" data-action="${escapeAttr(feedContext.clearAction)}"${
        feedContext.clearKeywords
          ? ` data-keywords="${escapeAttr(feedContext.clearKeywords)}"`
          : ""
      }>${escapeHtml(feedContext.clearLabel)}</button>
    </div>` : ""}${empty}`;
  }

  const startIdx = (currentPage - 1) * pageSize;
  const pageTopics = topics.slice(startIdx, startIdx + pageSize);

  let html = "";
  if (feedContext) {
    html += `<div class="feed-context-bar${feedContext.status ? ` lookup-context is-${escapeAttr(
      feedContext.status,
    )}` : ""}">
      <div class="feed-context-copy">
        <div class="feed-context-label">${escapeHtml(feedContext.label)}</div>
        <div class="feed-context-title">${escapeHtml(feedContext.title)}</div>
        <div class="feed-context-meta">${escapeHtml(feedContext.meta)}</div>
      </div>
      <button class="feed-context-clear" data-action="${escapeAttr(feedContext.clearAction)}"${
        feedContext.clearKeywords
          ? ` data-keywords="${escapeAttr(feedContext.clearKeywords)}"`
          : ""
      }>${escapeHtml(feedContext.clearLabel)}</button>
    </div>`;
  }

  html +=
    '<div class="topic-list">' +
    pageTopics
      .map((topic, index) => {
        const globalIdx = startIdx + index;
        const rankClass =
          globalIdx === 0 ? "top-1" : globalIdx === 1 ? "top-2" : globalIdx === 2 ? "top-3" : "";
        const platformLabel =
          currentPlatform === "all"
            ? renderPlatformPills(topic.platforms || [topic.platform || ""], platformNames, escapeHtml)
            : "";
        const category = topic.category
          ? `<span class="topic-category">${escapeHtml(topic.category)}</span>`
          : "";
        const heatLabel =
          topic.hot_value ||
          (currentPlatform === "all" && (topic.platform_count || 0) > 1
            ? `跨 ${topic.platform_count} 平台`
            : "");
        const velocityHtml = renderVelocityBadge(topic.velocity, escapeAttr);
        const resonanceHtml =
          currentPlatform === "all" && (topic.platform_count || 0) > 1
            ? `<span class="topic-resonance" title="该话题同时出现在 ${escapeAttr(
                String(topic.platform_count),
              )} 个平台热榜">共振 ×${topic.platform_count}</span>`
            : "";
        const isLiked = likedTitles.has(topic.title);
        const lower = topic.title.toLowerCase();
        const matchedKw = keywordTerms.find((keyword) => lower.includes(keyword));
        const kwMatchClass = matchedKw ? " kw-match" : "";
        const kwBadge = matchedKw
          ? `<span class="kw-badge">🔖 ${escapeHtml(matchedKw)}</span>`
          : "";

        let titleHtml = escapeHtml(topic.title);
        if (matchedKw) {
          titleHtml = highlightText(titleHtml, matchedKw, "kw-hl");
        }
        if (searchQuery) {
          titleHtml = highlightText(titleHtml, searchQuery, "sq-hl");
        }

        return `<a class="topic-item${kwMatchClass}${(topic.platform_count || 0) > 1 ? " resonant" : ""}${globalIdx < 3 ? " rank-featured" : ""}" ${
          topic.url
            ? `href="${topic.url}" target="_blank" rel="noopener noreferrer"`
            : ""
        } aria-label="${escapeAttr(topic.title)}">
      <div class="topic-rank ${rankClass}">${globalIdx + 1}</div>
      <div class="topic-content">
        <div class="topic-title">${titleHtml}</div>
        <div class="topic-meta">
          ${resonanceHtml}${velocityHtml}${platformLabel}<span class="topic-heat">${escapeHtml(
            heatLabel,
          )}</span>${category}${kwBadge}
        </div>
      </div>
      <div class="topic-actions">
        <button class="topic-action-btn like-btn ${isLiked ? "liked" : ""}" data-action="toggleLike" data-title="${escapeAttr(topic.title)}" data-platform="${escapeAttr((topic.platforms && topic.platforms[0]) || topic.platform || currentPlatform)}" data-url="${escapeAttr(topic.url || "")}" title="${isLiked ? "取消收藏" : "收藏"}" aria-label="${isLiked ? "取消收藏" : "收藏"} ${escapeAttr(topic.title)}">
          <svg viewBox="0 0 24 24" fill="${isLiked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="topic-action-btn" data-action="analyzeTopic" data-title="${escapeAttr(topic.title)}" title="AI 分析此话题" aria-label="分析 ${escapeAttr(topic.title)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-5 7h14l-5-7c1-1 2-2 2-4a4 4 0 0 0-4-4z"/><path d="M12 18v4"/></svg>
        </button>
      </div>
    </a>`;
      })
      .join("") +
    "</div>";

  html += renderPagination({
    currentPage,
    totalPages,
    totalItems: totalTopics,
    pageSize,
  });

  return html;
}

export interface AnalysisJobCard {
  id: string;
  title: string;
  status: "queued" | "running" | "done" | "error";
  message?: string;
  createdAt: number;
}

function getAnalysisJobStatusLabel(status: AnalysisJobCard["status"]): string {
  if (status === "running") return "分析中";
  if (status === "done") return "已完成";
  if (status === "error") return "失败";
  return "排队中";
}

function formatAnalysisJobTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderAnalysisJobTrayMarkup(options: {
  jobs: AnalysisJobCard[];
  selectedJobId?: string | null;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const { jobs, selectedJobId = null, escapeHtml, escapeAttr } = options;
  if (!jobs.length) return "";

  return `<div class="analysis-job-tray">
    <div class="analysis-job-header">
      <div class="analysis-job-title">分析任务</div>
      <div class="analysis-job-count">${jobs.length} active</div>
    </div>
    <div class="analysis-job-list">
      ${jobs
        .map((job) => {
          const actionHtml =
            job.status === "done"
              ? `<button class="analysis-job-action primary" data-action="openTopicAnalysisJob" data-job-id="${escapeAttr(job.id)}">查看结果</button>`
              : job.status === "error"
                ? `<button class="analysis-job-action primary" data-action="retryTopicAnalysisJob" data-job-id="${escapeAttr(job.id)}">重新分析</button>`
                : `<button class="analysis-job-action" disabled>后台处理中</button>`;
          return `<div class="analysis-job-card ${escapeAttr(job.status)}${selectedJobId === job.id ? " selected" : ""}">
            <div class="analysis-job-main">
              <div class="analysis-job-copy">
                <div class="analysis-job-name">${escapeHtml(job.title)}</div>
                <div class="analysis-job-meta">${escapeHtml(job.message || "等待开始")} · ${formatAnalysisJobTime(job.createdAt)}</div>
              </div>
              <span class="analysis-job-badge ${escapeAttr(job.status)}">${getAnalysisJobStatusLabel(job.status)}</span>
            </div>
            <div class="analysis-job-actions">${actionHtml}</div>
          </div>`;
        })
        .join("")}
    </div>
  </div>`;
}

export function renderAnalysisPanelMarkup(options: {
  data: {
    error?: string;
    overview?: string;
    recommendation?: string;
    clusters?: AnalysisCluster[];
  } | null;
  jobs?: AnalysisJobCard[];
  selectedJobId?: string | null;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): string {
  const { data, jobs = [], selectedJobId = null, escapeHtml, escapeAttr } = options;
  const jobTrayHtml = renderAnalysisJobTrayMarkup({
    jobs,
    selectedJobId,
    escapeHtml,
    escapeAttr,
  });

  if (!data) {
    return `${jobTrayHtml}<div class="ai-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
        <path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-5 7h14l-5-7c1-1 2-2 2-4a4 4 0 0 0-4-4z" />
        <path d="M12 18v4" />
      </svg>
      <p>点击顶部「AI 分析」按钮，生成今日热点摘要；单话题后台分析结果也会回到这里。</p>
      <div class="ai-quick-actions">
        <button class="ai-quick-btn" data-action="aiAnalyze">今日摘要</button>
        <button class="ai-quick-btn" data-action="setFeedMode" data-mode="resonance">看共振话题</button>
        <button class="ai-quick-btn" data-action="setFeedMode" data-mode="rising">看上升最快</button>
      </div>
    </div>`;
  }

  if (data.error) {
    return `${jobTrayHtml}<div class="ai-placeholder"><p style="color:var(--neon-red)">${escapeHtml(data.error)}</p></div>`;
  }

  let html = "";

  if (data.overview) {
    html += `<div class="ai-overview">${escapeHtml(data.overview)}</div>`;
  }

  if (data.clusters?.length) {
    html += '<div class="ai-panel-content">';
    for (const cluster of data.clusters) {
      const trendMap: Record<string, string> = {
        rising: "上升",
        stable: "稳定",
        falling: "下降",
      };
      const badgeClass =
        cluster.trend === "rising"
          ? "badge-rising"
          : cluster.trend === "falling"
            ? "badge-falling"
            : "badge-stable";
      const keywordPayload = (cluster.keywords || [cluster.name]).join("|");
      html += `<div class="ai-cluster">
        <div class="ai-cluster-header">
          <div class="ai-cluster-name">${escapeHtml(cluster.name)}</div>
          <span class="ai-cluster-badge ${badgeClass}">${trendMap[cluster.trend] || cluster.trend}</span>
        </div>
        <div class="ai-cluster-summary">${escapeHtml(cluster.summary || "")}</div>
        <div class="ai-heat-bar"><div class="ai-heat-bar-fill" style="width:${cluster.heat_score || 50}%"></div></div>
        <div class="ai-quick-actions" style="margin-top:10px">
          <button class="ai-quick-btn" data-action="focusCluster" data-keywords="${escapeAttr(keywordPayload)}">聚焦这一组</button>
        </div>
      </div>`;
    }
    html += "</div>";
  }

  if (data.recommendation) {
    html += `<div class="ai-overview" style="margin-top:12px;border-color:rgba(255,0,255,0.15);background:linear-gradient(135deg,rgba(255,0,255,0.05),rgba(0,255,255,0.03))">
      <strong style="color:var(--neon-magenta)">推荐关注：</strong> ${escapeHtml(data.recommendation)}
    </div>`;
  }

  html += `<div class="ai-quick-actions">
      <button class="ai-quick-btn" data-action="aiAnalyze">今日摘要</button>
      <button class="ai-quick-btn" data-action="setFeedMode" data-mode="resonance">看共振话题</button>
      <button class="ai-quick-btn" data-action="setFeedMode" data-mode="rising">看上升最快</button>
    </div>`;

  return `${jobTrayHtml}${html}`;
}

export function renderTopicAnalysisMarkup(options: {
  data: TopicAnalysisData;
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): { title: string; bodyHtml: string } {
  const { data, escapeHtml, escapeAttr } = options;

  if (data.error) {
    return {
      title: "分析失败",
      bodyHtml: `<p style="color:var(--neon-red)">${escapeHtml(data.error)}</p>`,
    };
  }

  let html = "";

  if (data.impact_score !== undefined) {
    html += `<div class="analysis-section" style="text-align:center">
      <div class="analysis-label">影响力指数</div>
      <div class="analysis-score">${data.impact_score}</div>
    </div>`;
  }

  if (data.category) {
    html += `<div class="analysis-section"><div class="analysis-label">分类</div>
      <div class="analysis-tags"><span class="analysis-tag">${escapeHtml(data.category)}</span></div></div>`;
  }

  if (data.background) {
    html += `<div class="analysis-section"><div class="analysis-label">背景</div>
      <div class="analysis-text">${escapeHtml(data.background)}</div></div>`;
  }

  if (data.public_opinion) {
    html += `<div class="analysis-section"><div class="analysis-label">舆论分析</div>`;
    if (data.public_opinion.positive) {
      html += `<div class="analysis-text" style="margin-bottom:4px"><span style="color:var(--neon-green)">正面：</span>${escapeHtml(data.public_opinion.positive)}</div>`;
    }
    if (data.public_opinion.negative) {
      html += `<div class="analysis-text" style="margin-bottom:4px"><span style="color:var(--neon-red)">负面：</span>${escapeHtml(data.public_opinion.negative)}</div>`;
    }
    if (data.public_opinion.neutral) {
      html += `<div class="analysis-text"><span style="color:var(--neon-cyan)">中立：</span>${escapeHtml(data.public_opinion.neutral)}</div>`;
    }
    html += "</div>";
  }

  if (data.trend_prediction) {
    html += `<div class="analysis-section"><div class="analysis-label">趋势预测</div>
      <div class="analysis-text">${escapeHtml(data.trend_prediction)}</div></div>`;
  }

  if (data.related_topics && data.related_topics.length > 0) {
    html += `<div class="analysis-section"><div class="analysis-label">关联话题</div>
      <div class="analysis-tags">${data.related_topics
        .map(
          (topic) =>
            `<span class="analysis-tag" style="cursor:pointer" data-action="analyzeRelated" data-title="${escapeAttr(
              topic,
            )}">${escapeHtml(topic)}</span>`,
        )
        .join("")}</div></div>`;
  }

  return {
    title: data.title || "话题分析",
    bodyHtml: html,
  };
}

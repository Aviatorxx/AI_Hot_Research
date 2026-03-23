import { topicsStore } from "@/features/topics/topics.store";
import { analysisStore } from "@/features/analysis/analysis.store";
import { authStore } from "@/features/auth/auth.store";
import { loadPreferencesState } from "@/features/preferences/preferences.service";
import { closeModalDialog } from "@/shared/components/modal/modal";
import { pushToast } from "@/shared/components/toast/toast";
import { applyPlatformShell } from "@/app/router";
import { appBus } from "@/app/app-event-bus";
import { registerActionDelegation } from "@/app/event-handler";
import * as auth from "@/app/auth.coordinator";
import * as hotFeed from "@/app/hot-feed.coordinator";
import * as mine from "@/app/mine.coordinator";
import * as chat from "@/app/chat.coordinator";
import * as theme from "@/app/theme";
import * as typography from "@/app/typography";
import { hydrateTopicsSnapshot } from "@/features/topics/topics.service";

let initialized = false;

function ensureAiAccess(): boolean {
  const { token, currentUser } = authStore.getState();
  if (token || currentUser) {
    return true;
  }
  auth.openLoginModal();
  pushToast({ message: "登录后可使用 AI 分析与推荐功能", type: "info" });
  return false;
}

function updateUI(): void {
  hotFeed.updateStats();
  hotFeed.updatePlatformTabs();
  applyPlatformShell({
    platform: hotFeed.getCurrentPlatform(),
    chatSection: document.getElementById("myChatSection"),
    searchWrap: document.getElementById("searchWrap"),
  });

  if (hotFeed.getCurrentPlatform() === "mine") {
    mine.renderMyPage(topicsStore.getState().platforms);
  } else {
    hotFeed.renderTopics();
    hotFeed.renderAnalysisPanel(analysisStore.getState().summary);
  }
}

function wireEventBus(): void {
  appBus.on("auth:login", () => {
    updateUI();
  });

  appBus.on("auth:logout", () => {
    updateUI();
  });

  appBus.on("ui:update", () => {
    updateUI();
  });
}

function wireDataActionDelegation(): void {
  registerActionDelegation({
    actions: {
      // Auth actions
      openLoginModal: () => auth.openLoginModal(),
      closeLoginModal: () => auth.closeLoginModal(),
      closeLoginModalOnBackdrop: (el, event) => {
        if (event.target === el) {
          auth.closeLoginModal();
        }
      },
      switchAuthTab: (el) => auth.switchAuthTab(el.dataset.tab as "login" | "register"),
      submitAuth: () => auth.submitAuth(),
      logout: () => auth.logout(),
      toggleUserMenu: () => auth.toggleAuthMenu(),
      openProfileEditor: () => auth.openProfileEditor("nickname"),
      openUserPreferences: () => {
        auth.closeAuthMenu();
        hotFeed.switchPlatform("mine");
        mine.focusKeywordInput("已定位到我的偏好区，可直接管理关键词和收藏");
      },
      closeProfileModal: () => auth.closeProfileModal(),
      closeProfileModalOnBackdrop: (el, event) => {
        if (event.target === el) {
          auth.closeProfileModal();
        }
      },
      saveProfile: () => auth.saveProfile(true),
      selectAvatarPreset: (el) => auth.onSelectAvatarPreset(el.dataset.preset || ""),
      openAvatarUpload: () => auth.triggerAvatarUpload(),
      clearUploadedAvatar: () => auth.resetUploadedAvatar(),

      // Hot-feed actions
      refreshData: () => hotFeed.refreshData(),
      switchPlatform: (el) => hotFeed.switchPlatform(el.dataset.platform || "mine"),
      setCategory: (el) => hotFeed.setCategory(el.dataset.category || "all"),
      focusVelocityDirection: (el) =>
        hotFeed.focusVelocityDirection((el.dataset.direction as "new") || "new"),
      toggleLike: (el) => {
        const { title = "", platform = "", url = "" } = el.dataset;
        void hotFeed.toggleLike(el, title, platform, url);
      },
      analyzeTopic: (el) => {
        if (!ensureAiAccess()) return;
        void hotFeed.analyzeTopic(el.dataset.title || "");
      },
      analyzeRelated: (el) => {
        if (!ensureAiAccess()) return;
        closeModalDialog();
        void hotFeed.analyzeTopic(el.dataset.title || "");
      },
      aiAnalyze: () => {
        if (!ensureAiAccess()) return;
        if (hotFeed.getCurrentPlatform() === "mine") {
          void mine.fetchRecommendations();
        } else {
          void hotFeed.runAiAnalysis();
        }
      },
      closeModal: () => hotFeed.closeModal(),
      closeModalOnBackdrop: (el, event) => {
        if (event.target === el) {
          hotFeed.closeModal();
        }
      },
      goToPage: (el) => hotFeed.goToPage(Number(el.dataset.page)),
      clearSearch: () => hotFeed.clearSearch(),
      toggleAutoRefresh: () => hotFeed.toggleAutoRefresh(),
      toggleNotify: () => hotFeed.toggleNotify(),
      setFeedMode: (el) => hotFeed.setFeedMode((el.dataset.mode as "all" | "resonance" | "rising") || "all"),
      openFeedMode: (el) => hotFeed.openFeedMode((el.dataset.mode as "all" | "resonance" | "rising") || "all"),
      focusCluster: (el) => hotFeed.focusCluster(el.dataset.keywords || ""),
      resetFeedContext: () => hotFeed.resetFeedContext(),
      resetCategoryContext: () => hotFeed.resetCategoryContext(),
      clearTopicLookup: () => hotFeed.clearTopicLookup(),
      toggleTheme: () => {
        theme.toggleTheme();
      },
      setFontScale: (el) => {
        const scale = el.dataset.scale;
        if (scale === "md" || scale === "lg" || scale === "xl") {
          typography.setFontScale(scale);
          auth.updateAuthUI();
        }
      },

      // Mine actions
      addKeyword: () => mine.addKeyword(),
      removeKeyword: (el) => mine.removeKeyword(Number(el.dataset.id)),
      showLikesModal: () => mine.showLikesModal(),
      fetchRecommendations: () => {
        if (!ensureAiAccess()) return;
        void mine.fetchRecommendations();
      },
      deleteLikeAndRefresh: (el) => mine.deleteLikeAndRefresh(el.dataset.title || ""),
      switchDiscoverTab: (el) =>
        mine.switchDiscoverTab(el.dataset.tab as "hot" | "ext", el),
      openRelatedHotSection: () => mine.openRelatedHotSection(),
      focusKeywordInput: () => mine.focusKeywordInput("先添加关键词或收藏话题，系统才知道你关心什么"),
      openPreferencesSection: (el) =>
        mine.openPreferencesSection(
          (el.dataset.section as "keywords" | "platforms" | "saved" | "history") || "keywords",
        ),
      addRecommendedKeyword: (el) =>
        mine.addRecommendedKeyword(el.dataset.title || "", el.dataset.reason || ""),
      openTopicInFeed: (el) =>
        hotFeed.openTopicInFeed(el.dataset.title || "", el.dataset.platform || "all"),
      openTopicAnalysisJob: (el) => hotFeed.openTopicAnalysisJob(el.dataset.jobId || ""),
      retryTopicAnalysisJob: (el) => hotFeed.retryTopicAnalysisJob(el.dataset.jobId || ""),
      togglePlatformVisibility: (el) => hotFeed.togglePlatformVisibility(el.dataset.platform || ""),

      // Chat actions
      sendChat: () => chat.sendChat(() => auth.openLoginModal()),
      newChatSession: () => chat.newChatSession(),
      restoreSession: (el) =>
        chat.restoreSession(
          Number(el.dataset.sessionId),
          el.dataset.title || "对话",
      ),
      deleteSession: (el) => chat.deleteSession(Number(el.dataset.sessionId)),
      toggleChatFocus: () => chat.toggleChatFocus(),
      closeChatFocus: () => chat.closeChatFocus(),
    },
    inputActions: {
      onSearchInput: (el) =>
        hotFeed.onSearchInput((el as HTMLInputElement).value),
      handleProfileNicknameInput: (el) =>
        auth.onProfileNicknameInput((el as HTMLInputElement).value),
    },
    keydownActions: {
      searchInputKeydown: (el, event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key !== "Escape") return;
        hotFeed.clearSearch();
        (el as HTMLInputElement).blur();
      },
      sendChatOnEnter: (_el, event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (
          keyboardEvent.key !== "Enter" ||
          keyboardEvent.isComposing ||
          keyboardEvent.shiftKey
        ) {
          return;
        }
        keyboardEvent.preventDefault();
        void chat.sendChat(() => auth.openLoginModal());
      },
      submitAuthOnEnter: (_el, event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (
          keyboardEvent.key !== "Enter" ||
          keyboardEvent.isComposing ||
          keyboardEvent.shiftKey
        ) {
          return;
        }
        keyboardEvent.preventDefault();
        void auth.submitAuth();
      },
      addKeyword: (_el, event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key !== "Enter" || keyboardEvent.isComposing) return;
        keyboardEvent.preventDefault();
        mine.addKeyword();
      },
      saveProfileOnEnter: (_el, event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (
          keyboardEvent.key !== "Enter" ||
          keyboardEvent.isComposing ||
          keyboardEvent.shiftKey
        ) {
          return;
        }
        keyboardEvent.preventDefault();
        void auth.saveProfile(true);
      },
    },
    changeActions: {
      handleAvatarUpload: (el) => {
        const input = el as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        void auth.onAvatarFileSelected(file).finally(() => {
          input.value = "";
        });
      },
    },
  });
}

export async function initializeApp(): Promise<void> {
  if (initialized) return;
  initialized = true;

  theme.applyStoredTheme();
  typography.applyStoredFontScale();
  hotFeed.subscribeAnalysisStore();
  mine.subscribeFeedStore();
  wireEventBus();
  wireDataActionDelegation();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModalDialog();
      auth.closeLoginModal();
      auth.closeProfileModal();
      auth.closeAuthMenu();
      chat.closeChatFocus();
    }
  });

  document.addEventListener("click", (event) => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const withinAuthArea = path.some((node) => {
      return node instanceof HTMLElement && node.id === "authArea";
    });
    if (!withinAuthArea) {
      auth.closeAuthMenu();
    }
  });

  auth.updateAuthUI();
  hotFeed.initNotifyButton();
  hydrateTopicsSnapshot();
  updateUI();

  void auth.verifyStoredToken().finally(() => {
    appBus.emit("ui:update", undefined);
  });
  void loadPreferencesState().finally(() => {
    appBus.emit("ui:update", undefined);
  });
  void hotFeed.loadInitialTopics();
  hotFeed.autoRefresh.start();

  applyPlatformShell({
    platform: hotFeed.getCurrentPlatform(),
    chatSection: document.getElementById("myChatSection"),
    searchWrap: document.getElementById("searchWrap"),
  });
}

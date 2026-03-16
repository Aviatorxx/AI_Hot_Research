import type { AuthUser } from "@/features/auth/auth.types";
import { preferencesStore } from "@/features/preferences/preferences.store";
import { escapeAttr, escapeHtml } from "@/shared/lib/format";

interface AvatarPreset {
  id: string;
  name: string;
  desc: string;
}

interface ProfileDraft {
  nickname: string;
  avatar_preset: string | null;
  avatar_data: string | null;
}

const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "orbit-cyan", name: "星轨青", desc: "冷静科技风" },
  { id: "sunset-amber", name: "落日橙", desc: "活跃提醒感" },
  { id: "violet-comet", name: "彗星紫", desc: "高辨识度" },
  { id: "mint-grid", name: "薄荷绿", desc: "轻盈监控感" },
  { id: "rose-pulse", name: "脉冲粉", desc: "醒目但柔和" },
  { id: "slate-core", name: "石墨灰", desc: "克制专业向" },
];

let isUserMenuOpen = false;
let isProfileModalOpen = false;
let profileDraft: ProfileDraft = {
  nickname: "",
  avatar_preset: AVATAR_PRESETS[0]?.id ?? "orbit-cyan",
  avatar_data: null,
};

function getAvatarPreset(presetId?: string | null): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.id === presetId) ?? AVATAR_PRESETS[0];
}

export function getDisplayName(user: AuthUser | null): string {
  if (!user) return "访客";
  const nickname = (user.nickname || "").trim();
  return nickname || user.username || "访客";
}

function getUserInitial(user: AuthUser | null): string {
  return getDisplayName(user).charAt(0).toUpperCase() || "A";
}

export function renderUserAvatar(user: AuthUser | null, extraClass = ""): string {
  const preset = getAvatarPreset(user?.avatar_preset);
  const className = ["user-avatar", extraClass].filter(Boolean).join(" ");
  if (user?.avatar_data) {
    return `<span class="${className} has-image" data-avatar="${preset.id}" aria-hidden="true"><img class="user-avatar-img" src="${escapeAttr(user.avatar_data)}" alt="" /></span>`;
  }
  return `<span class="${className}" data-avatar="${preset.id}" aria-hidden="true"><span>${escapeHtml(getUserInitial(user))}</span></span>`;
}

function renderProfilePreview(user: AuthUser): void {
  const preview = document.getElementById("profilePreview");
  if (!preview) return;
  const { likes, keywords } = preferencesStore.getState();
  const previewUser: AuthUser = {
    ...user,
    nickname: profileDraft.nickname,
    avatar_preset: profileDraft.avatar_preset,
    avatar_data: profileDraft.avatar_data,
  };
  preview.innerHTML = `
    ${renderUserAvatar(previewUser, "large")}
    <div>
      <div class="profile-preview-name">${escapeHtml(getDisplayName(previewUser))}</div>
      <div class="profile-preview-meta">
        账号 ${escapeHtml(user.username)}<br />
        已关注 ${keywords.length} 个关键词 · 已收藏 ${Object.keys(likes).length} 条话题
      </div>
    </div>
  `;
}

function renderAvatarPresetGrid(user: AuthUser): void {
  const container = document.getElementById("avatarPresetGrid");
  if (!container) return;
  container.innerHTML = AVATAR_PRESETS.map((preset) => {
    const active = !profileDraft.avatar_data && getAvatarPreset(profileDraft.avatar_preset).id === preset.id;
    const previewUser: AuthUser = {
      ...user,
      nickname: profileDraft.nickname,
      avatar_preset: preset.id,
      avatar_data: null,
    };
    return `
      <button class="avatar-preset ${active ? "active" : ""}" data-action="selectAvatarPreset" data-preset="${preset.id}" title="${escapeAttr(preset.name)}">
        ${renderUserAvatar(previewUser, "preset")}
        <div class="avatar-preset-copy">
          <div class="avatar-preset-name">${escapeHtml(preset.name)}</div>
          <div class="avatar-preset-desc">${escapeHtml(preset.desc)}</div>
        </div>
      </button>
    `;
  }).join("");
}

function updateProfileUploadState(): void {
  const desc = document.getElementById("profileUploadDesc");
  const resetBtn = document.getElementById("profileAvatarResetBtn");
  if (desc) {
    desc.textContent = profileDraft.avatar_data
      ? "已使用自定义图片头像，点击“恢复预设”可切回下方样式"
      : "推荐方形图片，系统会自动压缩为适合头像展示的尺寸";
  }
  if (resetBtn) {
    resetBtn.classList.toggle("is-hidden", !profileDraft.avatar_data);
  }
}

export function isProfileOpen(): boolean {
  return isProfileModalOpen;
}

export function isUserMenuActive(): boolean {
  return isUserMenuOpen;
}

export function closeUserMenu(): void {
  if (!isUserMenuOpen) return;
  isUserMenuOpen = false;
}

export function toggleUserMenu(): void {
  isUserMenuOpen = !isUserMenuOpen;
}

export function openLoginModalUI(): void {
  document.getElementById("loginModalOverlay")?.classList.add("active");
  window.setTimeout(() => {
    const input = document.getElementById("authUsername") as HTMLInputElement | null;
    input?.focus();
  }, 100);
}

export function closeLoginModalUI(): void {
  document.getElementById("loginModalOverlay")?.classList.remove("active");
}

export function switchAuthTabUI(tab: "login" | "register"): void {
  document.getElementById("authTabLogin")?.classList.toggle("active", tab === "login");
  document.getElementById("authTabRegister")?.classList.toggle("active", tab === "register");
  const submit = document.getElementById("authSubmitBtn");
  if (submit) {
    submit.textContent = tab === "login" ? "登录" : "注册";
  }
  const error = document.getElementById("authError");
  if (error) {
    error.textContent = "";
  }
  const password = document.getElementById("authPassword") as HTMLInputElement | null;
  if (password) {
    password.autocomplete = tab === "login" ? "current-password" : "new-password";
  }
}

export function resetAuthFormUI(): void {
  const error = document.getElementById("authError");
  if (error) {
    error.textContent = "";
  }

  const username = document.getElementById("authUsername") as HTMLInputElement | null;
  const password = document.getElementById("authPassword") as HTMLInputElement | null;
  if (username) username.value = "";
  if (password) password.value = "";
}

export function getAuthCredentials(): { username: string; password: string } {
  const username = (document.getElementById("authUsername") as HTMLInputElement | null)?.value.trim() || "";
  const password = (document.getElementById("authPassword") as HTMLInputElement | null)?.value || "";
  return { username, password };
}

export function setAuthError(message: string): void {
  const error = document.getElementById("authError");
  if (error) {
    error.textContent = message;
  }
}

export function renderAuthUI(options: {
  currentUser: AuthUser | null;
  escapeHtml: (value: string) => string;
}): void {
  const { currentUser, escapeHtml } = options;
  const area = document.getElementById("authArea");
  const sessionBar = document.getElementById("chatSessionBar");
  const sessionTitle = document.getElementById("sessionTitle");
  const chatInput = document.getElementById("chatInput") as HTMLInputElement | null;
  const { likes, keywords } = preferencesStore.getState();

  if (area) {
    area.innerHTML = currentUser
      ? `
        <div class="user-menu">
          <button class="user-menu-trigger ${isUserMenuOpen ? "open" : ""}" data-action="toggleUserMenu" aria-haspopup="menu" aria-expanded="${isUserMenuOpen ? "true" : "false"}">
            ${renderUserAvatar(currentUser)}
            <span class="user-menu-copy">
              <span class="user-menu-name">${escapeHtml(getDisplayName(currentUser))}</span>
              <span class="user-menu-meta">${escapeHtml(currentUser.username)}</span>
            </span>
            <svg class="user-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div class="user-dropdown ${isUserMenuOpen ? "active" : ""}" role="menu">
            <div class="user-dropdown-head">
              ${renderUserAvatar(currentUser, "large")}
              <div>
                <div class="user-dropdown-name">${escapeHtml(getDisplayName(currentUser))}</div>
                <div class="user-dropdown-username">@${escapeHtml(currentUser.username)}</div>
                <div class="user-dropdown-summary">已关注 ${keywords.length} 个关键词 · 已收藏 ${Object.keys(likes).length} 条话题</div>
              </div>
            </div>
            <div class="user-dropdown-actions">
              <button class="user-dropdown-item" data-action="openUserPreferences" role="menuitem">
                <div>
                  <strong>我的偏好</strong>
                  <span>定位到关键词订阅与收藏区，便于继续管理</span>
                </div>
              </button>
              <button class="user-dropdown-item" data-action="openProfileEditor" role="menuitem">
                <div>
                  <strong>编辑资料</strong>
                  <span>统一修改昵称和预设头像，昵称优先显示</span>
                </div>
              </button>
              <button class="user-dropdown-item danger" data-action="logout" role="menuitem">
                <div>
                  <strong>退出登录</strong>
                  <span>清除当前会话并返回游客状态</span>
                </div>
              </button>
            </div>
          </div>
        </div>`
      : '<button class="btn-login" id="loginBtn" data-action="openLoginModal">登录</button>';
  }

  if (sessionBar) {
    sessionBar.style.display = currentUser ? "flex" : "none";
  }

  if (!currentUser && sessionTitle) {
    sessionTitle.textContent = "新对话";
  }

  if (chatInput) {
    chatInput.disabled = !currentUser;
    chatInput.placeholder = currentUser ? "问我任何事情，全知全能..." : "请先登录后使用 AI 功能";
  }
}

export function openProfileModal(user: AuthUser, focus: "nickname" | "avatar" = "nickname"): void {
  profileDraft = {
    nickname: user.nickname || "",
    avatar_preset: user.avatar_preset || getAvatarPreset(user.avatar_preset).id,
    avatar_data: user.avatar_data || null,
  };
  isProfileModalOpen = true;
  setProfileFeedback();
  const nicknameInput = document.getElementById("profileNicknameInput") as HTMLInputElement | null;
  if (nicknameInput) {
    nicknameInput.value = profileDraft.nickname || "";
  }
  renderProfilePreview(user);
  renderAvatarPresetGrid(user);
  updateProfileUploadState();
  document.getElementById("profileModalOverlay")?.classList.add("active");
  closeUserMenu();
  window.setTimeout(() => {
    const targetId = focus === "avatar" ? "avatarPresetGrid" : "profileNicknameInput";
    document.getElementById(targetId)?.focus?.();
  }, 90);
}

export function closeProfileModal(): void {
  if (!isProfileModalOpen) return;
  isProfileModalOpen = false;
  document.getElementById("profileModalOverlay")?.classList.remove("active");
}

export function setProfileFeedback(message = "", type = ""): void {
  const feedback = document.getElementById("profileError");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.remove("info", "success");
  if (type) feedback.classList.add(type);
}

export function handleProfileNicknameInput(value: string, user: AuthUser | null): void {
  profileDraft.nickname = value;
  if (user) {
    renderProfilePreview(user);
  }
}

export function selectAvatarPreset(presetId: string, user: AuthUser | null): void {
  profileDraft.avatar_preset = presetId;
  profileDraft.avatar_data = null;
  if (user) {
    renderProfilePreview(user);
    renderAvatarPresetGrid(user);
  }
  updateProfileUploadState();
}

export function openAvatarUpload(): void {
  (document.getElementById("profileAvatarFile") as HTMLInputElement | null)?.click();
}

async function resizeAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("浏览器不支持头像处理"));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.onerror = () => reject(new Error("图片读取失败"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export async function handleAvatarUpload(file: File, user: AuthUser | null): Promise<ProfileDraft> {
  if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
    throw new Error("仅支持 PNG、JPEG、WebP 图片");
  }
  const avatarData = await resizeAvatarFile(file);
  profileDraft.avatar_data = avatarData;
  profileDraft.avatar_preset = null;
  if (user) {
    renderProfilePreview(user);
    renderAvatarPresetGrid(user);
  }
  updateProfileUploadState();
  return { ...profileDraft };
}

export function clearUploadedAvatar(user: AuthUser | null): ProfileDraft {
  const fallbackPreset = profileDraft.avatar_preset || getAvatarPreset().id;
  profileDraft.avatar_data = null;
  profileDraft.avatar_preset = fallbackPreset;
  if (user) {
    renderProfilePreview(user);
    renderAvatarPresetGrid(user);
  }
  updateProfileUploadState();
  return { ...profileDraft };
}

export function buildProfilePayload(includeNickname = true): ProfileDraft {
  const nicknameInput = document.getElementById("profileNicknameInput") as HTMLInputElement | null;
  if (includeNickname && nicknameInput) {
    profileDraft.nickname = nicknameInput.value;
  }
  return { ...profileDraft };
}

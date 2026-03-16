import {
  clearAuthSession,
  saveProfileUpdate,
  submitAuthRequest,
  verifyAuthSession,
} from "@/features/auth/auth.service";
import { authStore } from "@/features/auth/auth.store";
import { clearPreferencesState, loadPreferencesState } from "@/features/preferences/preferences.service";
import { resetChatSessionState } from "@/features/chat/chat.service";
import {
  closeLoginModalUI,
  closeProfileModal,
  closeUserMenu,
  buildProfilePayload,
  clearUploadedAvatar,
  getAuthCredentials,
  getDisplayName,
  handleAvatarUpload,
  handleProfileNicknameInput,
  openLoginModalUI,
  openProfileModal,
  openAvatarUpload,
  renderAuthUI,
  resetAuthFormUI,
  selectAvatarPreset,
  setAuthError,
  setProfileFeedback,
  switchAuthTabUI,
  toggleUserMenu,
} from "@/app/session";
import { appBus } from "@/app/app-event-bus";
import { pushToast } from "@/shared/components/toast/toast";
import { escapeHtml } from "@/shared/lib/format";

type AuthTab = "login" | "register";

let authTab: AuthTab = "login";

export function updateAuthUI(): void {
  const { currentUser } = authStore.getState();
  renderAuthUI({ currentUser, escapeHtml });
}

export function openLoginModal(): void {
  switchAuthTab(authTab);
  resetAuthFormUI();
  openLoginModalUI();
}

export function closeLoginModal(): void {
  closeLoginModalUI();
}

export function switchAuthTab(tab: AuthTab): void {
  authTab = tab;
  switchAuthTabUI(tab);
}

export async function submitAuth(): Promise<void> {
  const { username, password } = getAuthCredentials();
  if (!username || !password) {
    setAuthError("请输入用户名和密码");
    return;
  }

  try {
    const data = await submitAuthRequest(
      authTab === "login" ? "login" : "register",
      { username, password },
    );
    closeLoginModal();
    updateAuthUI();
    await loadPreferencesState();
    appBus.emit("auth:login", { username: data.username });
    pushToast({ message: `欢迎，${getDisplayName(authStore.getState().currentUser)}！`, type: "success" });
  } catch (error: any) {
    setAuthError(`网络错误: ${error.message}`);
  }
}

export function logout(): void {
  clearAuthSession();
  resetChatSessionState();
  clearPreferencesState();
  closeProfileModal();
  closeUserMenu();
  updateAuthUI();
  void loadPreferencesState();
  appBus.emit("auth:logout", undefined);
  pushToast({ message: "已退出登录", type: "info" });
}

export async function verifyStoredToken(): Promise<void> {
  const { token } = authStore.getState();
  if (!token) {
    updateAuthUI();
    return;
  }
  try {
    await verifyAuthSession();
  } catch {
    // Keep token for retry on transient network errors.
  }
  updateAuthUI();
}

export function toggleAuthMenu(): void {
  toggleUserMenu();
  updateAuthUI();
}

export function closeAuthMenu(): void {
  closeUserMenu();
  updateAuthUI();
}

export { closeProfileModal };

export function openProfileEditor(focus: "nickname" | "avatar" = "nickname"): void {
  const { currentUser } = authStore.getState();
  if (!currentUser) {
    openLoginModal();
    return;
  }
  openProfileModal(currentUser, focus);
  updateAuthUI();
}

export function onProfileNicknameInput(value: string): void {
  handleProfileNicknameInput(value, authStore.getState().currentUser);
}

export function onSelectAvatarPreset(presetId: string): void {
  selectAvatarPreset(presetId, authStore.getState().currentUser);
}

export function triggerAvatarUpload(): void {
  openAvatarUpload();
}

export async function onAvatarFileSelected(file: File): Promise<void> {
  const { currentUser } = authStore.getState();
  if (!currentUser) return;
  try {
    const draft = await handleAvatarUpload(file, currentUser);
    await saveProfileUpdate({
      avatar_data: draft.avatar_data,
      avatar_preset: "",
    });
    setProfileFeedback("图片头像已更新", "success");
    updateAuthUI();
  } catch (error: any) {
    setProfileFeedback(error.message || "图片上传失败");
  }
}

export async function resetUploadedAvatar(): Promise<void> {
  const { currentUser } = authStore.getState();
  if (!currentUser) return;
  const draft = clearUploadedAvatar(currentUser);
  try {
    await saveProfileUpdate({
      avatar_data: "",
      avatar_preset: draft.avatar_preset,
    });
    setProfileFeedback("已恢复预设头像", "success");
    updateAuthUI();
  } catch (error: any) {
    setProfileFeedback(error.message || "恢复预设失败");
  }
}

export async function saveProfile(includeNickname = true): Promise<void> {
  const { currentUser } = authStore.getState();
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const payload = buildProfilePayload(includeNickname);
  if (includeNickname && payload.nickname.trim().length > 20) {
    setProfileFeedback("昵称需为1-20个字符");
    return;
  }
  try {
    await saveProfileUpdate({
      nickname: includeNickname ? payload.nickname.trim() : undefined,
      avatar_preset: payload.avatar_preset,
      avatar_data: payload.avatar_data,
    });
    setProfileFeedback(includeNickname ? "资料已更新" : "头像已更新", "success");
    updateAuthUI();
    if (includeNickname) {
      closeProfileModal();
      pushToast({ message: "资料已更新", type: "success" });
    }
  } catch (error: any) {
    setProfileFeedback(error.message || "保存失败");
  }
}

import type { User } from "../services/dashboardService";

const CURRENT_USER_ID_KEY = "banting_current_user_id";
const CURRENT_USER_KEY = "banting_current_user";

export const saveCurrentUserId = (idUser: number) => {
  window.localStorage.setItem(CURRENT_USER_ID_KEY, String(idUser));
};

export const saveCurrentUser = (user: User) => {
  saveCurrentUserId(user.id_user);
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getCurrentUserId = () => {
  const value = window.localStorage.getItem(CURRENT_USER_ID_KEY);
  const parsed = value ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
};

export const getCurrentUser = () => {
  const value = window.localStorage.getItem(CURRENT_USER_KEY);

  if (!value) return null;

  try {
    return JSON.parse(value) as User;
  } catch {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
};

export const clearCurrentUserId = () => {
  window.localStorage.removeItem(CURRENT_USER_ID_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
};

export const clearCurrentUser = clearCurrentUserId;

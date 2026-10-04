import API from "../api/axiosInstance";
import type { UserRole } from "./dashboardService";
export type { UserRole } from "./dashboardService";

export type UserPayload = {
  nama: string;
  email: string;
  password?: string;
  role: UserRole;
};

export const getUsers = () => {
  return API.get("/users/");
};

export const getUserById = (id: number) => {
  return API.get(`/users/${id}`);
};

export const createUser = (data: UserPayload) => {
  return API.post("/users/", data);
};

export const updateUser = (id: number, data: UserPayload) => {
  return API.put(`/users/${id}`, data);
};

export const deleteUser = (id: number, actorUserId?: number) => {
  return API.delete(`/users/${id}`, {
    params: actorUserId ? { actor_id: actorUserId } : undefined,
  });
};

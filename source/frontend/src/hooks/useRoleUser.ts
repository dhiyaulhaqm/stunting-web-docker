import { useEffect, useMemo, useState } from "react";
import { getErrorMessage, getUsers, type User } from "../services/dashboardService";
import { getCurrentUserId } from "../utils/authSession";

export type AppRole = "admin" | "petugas_kesehatan" | "orang_tua";

const isUserInRole = (user: User, role: AppRole) => {
  if (role === "petugas_kesehatan") {
    return user.role === "petugas" || user.role === "petugas_kesehatan";
  }

  return user.role === role;
};

export function useRoleUser(role: AppRole) {
  const [users, setUsers] = useState<User[]>([]);
  const [sessionUserId] = useState(() => getCurrentUserId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roleUsers = useMemo(
    () => users.filter((user) => isUserInRole(user, role)),
    [role, users]
  );
  const currentUser = useMemo(() => {
    if (!sessionUserId) {
      return roleUsers[0] ?? null;
    }

    const sessionUser = users.find((user) => user.id_user === sessionUserId);
    if (!sessionUser) {
      return null;
    }

    return isUserInRole(sessionUser, role) ? sessionUser : null;
  }, [role, roleUsers, sessionUserId, users]);

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getUsers();
      setUsers(response.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal mengambil data user."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUsers();
  }, []);

  return {
    users,
    roleUsers,
    currentUser,
    loading,
    error,
    refreshUsers,
  };
}

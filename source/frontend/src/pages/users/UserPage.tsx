import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type UserPayload,
  type UserRole,
} from "../../services/userService";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { getCurrentUserId } from "../../utils/authSession";

type User = {
  id_user: number;
  nama: string;
  email: string;
  role: UserRole;
};

type UserForm = {
  nama: string;
  email: string;
  password: string;
  role: UserRole;
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  petugas: "Petugas Kesehatan",
  petugas_kesehatan: "Petugas Kesehatan",
  orang_tua: "Orang Tua",
};

const maxAdminUsers = 1;
const maxPetugasUsers = 2;
const usersPerPage = 10;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

type UserPageProps = {
  onChanged?: () => void;
  variant?: "default" | "officer";
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
};

function UserPage({ onChanged, variant = "default" }: UserPageProps) {
  const isOfficer = variant === "officer";
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState<UserForm>({
    nama: "",
    email: "",
    password: "",
    role: "admin",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actorUserId] = useState(() => getCurrentUserId());
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const adminCount = users.filter((user) => user.role === "admin").length;
  const petugasCount = users.filter(
    (user) => user.role === "petugas" || user.role === "petugas_kesehatan"
  ).length;
  const editingUser = editId
    ? users.find((user) => user.id_user === editId)
    : undefined;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getUsers();
      const fetchedUsers = response.data.data as User[];
      setUsers(fetchedUsers);
      setCurrentPage((page) =>
        Math.min(page, Math.max(Math.ceil(fetchedUsers.length / usersPerPage), 1))
      );
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: "Gagal mengambil data user.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!editId && form.role === "admin" && adminCount >= maxAdminUsers) {
      setForm((current) => ({
        ...current,
        role:
          petugasCount < maxPetugasUsers
            ? "petugas_kesehatan"
            : "orang_tua",
      }));
    }
  }, [adminCount, editId, form.role, petugasCount]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value as UserRole,
    });
  };

  const resetForm = () => {
    setForm({
      nama: "",
      email: "",
      password: "",
      role: getDefaultRole(),
    });

    setEditId(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setNotice(null);

      if (editId) {
        const dataUpdate: UserPayload = {
          nama: form.nama,
          email: form.email,
          role: form.role,
        };

        if (form.password !== "") {
          dataUpdate.password = form.password;
        }

        await updateUser(editId, dataUpdate);
        setNotice({
          type: "success",
          message: "User berhasil diperbarui.",
        });
      } else {
        if (!form.password.trim()) {
          setNotice({
            type: "error",
            message: "Password wajib diisi untuk user baru.",
          });
          return;
        }

        await createUser(form);
        setNotice({
          type: "success",
          message: "User berhasil ditambahkan.",
        });
      }

      resetForm();
      fetchUsers();
      onChanged?.();
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Terjadi kesalahan"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditId(user.id_user);

    setForm({
      nama: user.nama,
      email: user.email,
      password: "",
      role: user.role,
    });
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;

    try {
      setDeletingUserId(pendingDeleteUser.id_user);
      setNotice(null);
      await deleteUser(pendingDeleteUser.id_user, actorUserId ?? undefined);
      setNotice({
        type: "success",
        message: "User dan data terkait berhasil dihapus.",
      });
      setPendingDeleteUser(null);
      fetchUsers();
      onChanged?.();
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Gagal menghapus user"),
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const canChooseRole = (role: UserRole) => {
    if (editingUser?.role === role) return true;

    if (editingUser?.role === "admin" && role !== "admin" && adminCount <= 1) {
      return false;
    }

    if (role === "admin") {
      return adminCount < maxAdminUsers;
    }

    if (role === "petugas_kesehatan" || role === "petugas") {
      return petugasCount < maxPetugasUsers;
    }

    return true;
  };
  const getDefaultRole = (): UserRole => {
    if (adminCount < maxAdminUsers) return "admin";
    if (petugasCount < maxPetugasUsers) return "petugas_kesehatan";

    return "orang_tua";
  };
  const getDeleteBlockReason = (user: User) => {
    if (actorUserId === user.id_user) {
      return "Akun yang sedang digunakan tidak bisa dihapus.";
    }

    if (user.role === "admin" && adminCount <= 1) {
      return "Admin terakhir tidak bisa dihapus.";
    }

    return "";
  };
  const totalPages = Math.max(Math.ceil(users.length / usersPerPage), 1);
  const rowNumberStart = (currentPage - 1) * usersPerPage;
  const visibleUsers = users.slice(rowNumberStart, rowNumberStart + usersPerPage);

  const sectionClass = isOfficer
    ? "min-w-0 max-w-full rounded-lg border border-[#d7e5ee] bg-white p-5 shadow-[0_12px_28px_rgba(31,78,101,0.07)]"
    : "min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const titleClass = isOfficer
    ? "text-lg font-bold text-[#102636]"
    : "text-lg font-bold text-slate-950";
  const labelClass = isOfficer
    ? "text-sm font-semibold text-[#354d5a]"
    : "text-sm font-semibold text-slate-700";
  const fieldClass = isOfficer
    ? "rounded-lg border border-[#bfd3df] px-3 py-2 outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
    : "rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
  const primaryButtonClass = isOfficer
    ? "rounded-lg bg-[#0369a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#075985]"
    : "rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800";
  const secondaryButtonClass = isOfficer
    ? "rounded-lg border border-[#bfd3df] bg-white px-4 py-2 text-sm font-bold text-[#4d6471] transition hover:border-[#0369a1] hover:text-[#0369a1]"
    : "rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50";
  const tableHeadClass = isOfficer
    ? "border-b border-[#d7e5ee] text-xs uppercase tracking-wide text-[#5a6d78]"
    : "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500";
  const tableBodyClass = isOfficer
    ? "divide-y divide-[#e4edf3] text-sm text-[#354d5a]"
    : "divide-y divide-slate-100 text-sm text-slate-700";
  const strongTextClass = isOfficer
    ? "px-3 py-4 font-semibold text-[#102636]"
    : "px-3 py-4 font-semibold text-slate-950";
  const editButtonClass = isOfficer
    ? "rounded-lg bg-[#eef7fb] px-3 py-1.5 text-xs font-bold text-[#0369a1] transition hover:bg-[#dff1fb] disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50";
  const getNoticeClass = (type: Notice["type"]) => {
    if (type === "success") {
      return isOfficer
        ? "mb-4 rounded-lg border border-[#cfe5db] bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#0f766e]"
        : "mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700";
    }

    if (type === "error") {
      return "mb-4 rounded-lg border border-[#f0d4b4] bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#8a4d16]";
    }

    return isOfficer
      ? "mb-4 rounded-lg border border-[#cbe2ef] bg-[#eef7fb] px-4 py-3 text-sm font-semibold text-[#0369a1]"
      : "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700";
  };
  const deleteButtonClass =
    "rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <section className={sectionClass}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={titleClass}>Kelola Data User</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]">
            Admin {adminCount}/{maxAdminUsers}
          </span>
          <span className="rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]">
            Petugas {petugasCount}/{maxPetugasUsers}
          </span>
          <span className="rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]">
            Orang Tua {users.filter((user) => user.role === "orang_tua").length}
          </span>
        </div>
      </div>

      <form className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px_auto]" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className={labelClass}>Nama</span>
          <input
            className={fieldClass}
            type="text"
            name="nama"
            value={form.nama}
            onChange={handleChange}
            disabled={submitting}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Email</span>
          <input
            className={fieldClass}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled={submitting}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Password</span>
          <input
            className={fieldClass}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            disabled={submitting}
            required={!editId}
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Role</span>
          <select
            className={fieldClass}
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={submitting}
          >
            <option value="admin" disabled={!canChooseRole("admin")}>
              Admin
            </option>
            <option
              value="petugas_kesehatan"
              disabled={!canChooseRole("petugas_kesehatan")}
            >
              Petugas Kesehatan
            </option>
            <option value="orang_tua">Orang Tua</option>
          </select>
        </label>

        <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
        <button
          className={`${primaryButtonClass} h-10 disabled:cursor-not-allowed disabled:opacity-60`}
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Menyimpan..." : editId ? "Update" : "Tambah"}
        </button>

        {editId && (
          <button
            className={`${secondaryButtonClass} h-10 disabled:cursor-not-allowed disabled:opacity-60`}
            type="button"
            disabled={submitting}
            onClick={resetForm}
          >
            Batal
          </button>
        )}
        </div>
      </form>

      {notice && <p className={getNoticeClass(notice.type)}>{notice.message}</p>}

      {loading ? (
        <p className="text-sm font-semibold text-[#5a6d78]">Memuat data...</p>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left">
          <thead>
            <tr className={tableHeadClass}>
              <th className="px-3 py-3">No.</th>
              <th className="px-3 py-3">Nama</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className={tableBodyClass}>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center font-semibold" colSpan={5}>
                  Belum ada user terdaftar.
                </td>
              </tr>
            ) : (
              visibleUsers.map((user, index) => {
                const deleteBlockReason = getDeleteBlockReason(user);
                const deleteDisabled =
                  deletingUserId === user.id_user || Boolean(deleteBlockReason);

                return (
                  <tr key={user.id_user}>
                    <td className="px-3 py-4">{rowNumberStart + index + 1}</td>
                    <td className={strongTextClass}>{user.nama}</td>
                    <td className="px-3 py-4">{user.email}</td>
                    <td className="px-3 py-4">{roleLabels[user.role] || user.role}</td>
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                      <button
                        className={editButtonClass}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className={deleteButtonClass}
                        type="button"
                        disabled={deleteDisabled || submitting}
                        title={deleteBlockReason || undefined}
                        onClick={() => setPendingDeleteUser(user)}
                      >
                        {deletingUserId === user.id_user
                          ? "Menghapus..."
                          : deleteBlockReason
                            ? "Terkunci"
                            : "Hapus"}
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      )}
      {!loading && users.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={isOfficer ? "text-sm font-semibold text-[#5a6d78]" : "text-sm font-semibold text-slate-600"}>
            Menampilkan {rowNumberStart + 1}-{Math.min(rowNumberStart + visibleUsers.length, users.length)} dari {users.length} user
          </p>
          <div className="flex items-center gap-2">
            <button
              className={`${secondaryButtonClass} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50`}
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Sebelumnya
            </button>
            <span className={isOfficer ? "text-sm font-bold text-[#314b5a]" : "text-sm font-bold text-slate-700"}>
              {currentPage}/{totalPages}
            </span>
            <button
              className={`${secondaryButtonClass} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50`}
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDeleteUser)}
        variant={variant}
        title="Hapus user?"
        description="Akun ini akan dihapus permanen bersama data anak, pengukuran, prediksi, upload, laporan, dan aktivitas yang terhubung."
        details={
          <>
            <strong>{pendingDeleteUser?.nama ?? "User"}</strong>
            <br />
            {pendingDeleteUser?.email ?? "-"} |{" "}
            {pendingDeleteUser ? roleLabels[pendingDeleteUser.role] : "-"}
          </>
        }
        loading={deletingUserId === pendingDeleteUser?.id_user}
        confirmLabel="Hapus User"
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={confirmDeleteUser}
      />
    </section>
  );
}

export default UserPage;

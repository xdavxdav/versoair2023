import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle, Check } from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
}

export function UsersSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: "",
    name: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const API_BASE_URL =
    typeof window !== "undefined"
      ? process.env.REACT_APP_API_URL ||
        import.meta.env.VITE_API_URL ||
        ""
      : "";

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/users`,
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 30000,
  });

  // Create/Update user
  const mutation = useMutation({
    mutationFn: async (data: CreateUserInput & { id?: number }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/users/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/users`;
      const method = data.id ? "PUT" : "POST";

      const payload: Record<string, any> = {
        email: data.email,
        username: data.name, // server expects 'username', form uses 'name'
        role: data.role,
      };
      if (data.password) {
        payload.password = data.password;
      }
      if (!data.id && !data.password) {
        throw new Error("Password is required for new users");
      }

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to save user");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccess(
        editingUser ? "User updated successfully" : "User created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/users/${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccess("User deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "user",
    });
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      setError("Email and name are required");
      return;
    }
    mutation.mutate({ ...formData, id: editingUser?.id });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const columns: DataTableColumn<User>[] = [
    { key: "name", label: "Name", width: "25%" },
    { key: "email", label: "Email", width: "30%" },
    { key: "role", label: "Role", width: "15%" },
    {
      key: "isActive",
      label: "Status",
      width: "15%",
      render: (value) => (
        <span className={value ? "text-green-600" : "text-red-600"}>
          {value ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      width: "15%",
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Users</h2>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(user) => deleteMutation.mutate(user.id)}
        emptyMessage="No users yet. Create one to get started!"
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-slate-900">
                {editingUser ? "Edit User" : "New User"}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {mutation.isPending ? "Saving..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

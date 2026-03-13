"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Mail,
  Key,
  AlertCircle,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import LoadingAnimation from "../components/loading-animation";

interface Account {
  id: string;
  mainid: string;
  name: string;
  email: string;
  adminId: string;
}

interface AdminCredentialsResponse {
  "max-accounts": number;
  accounts: Account[];
}

export default function AdminCredentials() {
  const [data, setData] = useState<AdminCredentialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete" | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    adminId: "",
    password: "",
    confirmPassword: "", // New field
  });

  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch admin credentials
  useEffect(() => {
    const fetchAdminCredentials = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${baseURL}/subadmin/get-Admincredentials`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const result: AdminCredentialsResponse = await response.json();
        setData(result);
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || "Failed to fetch admin credentials");
      } finally {
        setLoading(false);
      }
    };

    if (baseURL) fetchAdminCredentials();
  }, [baseURL]);

  // Open modal
  const openModal = (mode: "add" | "edit" | "delete", account?: Account) => {
    setModalMode(mode);
    setSelectedAccount(account || null);
    setApiError(null);

    if (mode === "edit" && account) {
      setFormData({
        name: account.name,
        email: account.email,
        adminId: account.adminId,
        password: "",
        confirmPassword: "", // Reset confirm password
      });
    } else {
      setFormData({ name: "", email: "", adminId: "", password: "", confirmPassword: "" });
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAccount(null);
    setModalMode(null);
    setFormData({ name: "", email: "", adminId: "", password: "", confirmPassword: "" });
    setApiError(null);
  };

  // Refresh data
  const refreshData = async () => {
    try {
      const response = await fetch(`${baseURL}/subadmin/get-Admincredentials`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to refresh");
      const result: AdminCredentialsResponse = await response.json();
      setData(result);
    } catch {
      // Silent fail
    }
  };

  // Handle add/edit
  const handleSubmit = async () => {
    setApiError(null);

    const isAdd = modalMode === "add";
    const isEdit = modalMode === "edit";

    if (!formData.name || !formData.email || !formData.adminId) {
      setApiError("All fields except password (on edit) are required.");
      return;
    }

    if (isAdd && !formData.password) {
      setApiError("Password is required for new accounts.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setApiError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      let url = "";
      let method = "";
      let body = null;

      if (isAdd) {
        url = `${baseURL}/subadmin/add-Admincredential`;
        method = "POST";
        body = JSON.stringify(formData);
      } else if (isEdit && selectedAccount) {
        url = `${baseURL}/subadmin/update-Admincredential/${selectedAccount.id}`;
        method = "PUT";
        body = JSON.stringify({
          name: formData.name,
          email: formData.email,
          adminId: formData.adminId,
          ...(formData.password && { password: formData.password }),
        });
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.error || "Operation failed");
      }

      await refreshData();
      closeModal();
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch(
        `${baseURL}/subadmin/delete-Admincredential/${selectedAccount.id}`,
        { method: "DELETE" }
      );

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.error || "Failed to delete");
      }

      await refreshData();
      closeModal();
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isMainAccount = selectedAccount?.mainid === "yes";

  return (
    <div className="flex bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Sidebar */}
      <div className="fixed w-64 h-screen shadow-xl z-10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Sub-Admin Management</h1>
            <p className="text-gray-600">Create, edit, and manage sub-admin accounts</p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <LoadingAnimation />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Content */}
          {!loading && !error && data && (
            <div className="grid gap-6">
              {/* Max Accounts */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Maximum Accounts Allowed</p>
                    <p className="text-4xl font-bold text-slate-900 mt-1">{data["max-accounts"]}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {data.accounts.length} / {data["max-accounts"]} in use
                    </p>
                  </div>
                  <button
                    onClick={() => openModal("add")}
                    disabled={data.accounts.length >= data["max-accounts"]}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    Add Account
                  </button>
                </div>
              </div>

              {/* Accounts List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Active Accounts ({data.accounts.length})
                  </h2>
                </div>

                {data.accounts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No sub-admins yet</p>
                    <p className="text-sm mt-1">Click &quot;Add Account&quot; to create one</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {data.accounts.map((acc) => {
                      const isMain = acc.mainid === "yes";
                      return (
                        <li
                          key={acc.id}
                          className="p-6 hover:bg-slate-50 transition-colors duration-200"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium text-slate-900">{acc.name}</span>
                                {isMain && (
                                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <Shield className="w-3 h-3" />
                                    Main Admin
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-4 h-4" />
                                {acc.email}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Key className="w-4 h-4" />
                                <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                  {acc.adminId}
                                </code>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => openModal("edit", acc)}
                                disabled={isMain}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isMain ? "Cannot edit main admin" : "Edit account"}
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => openModal("delete", acc)}
                                disabled={isMain}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isMain ? "Cannot delete main admin" : "Delete account"}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6">
                {/* Delete Confirmation */}
                {modalMode === "delete" ? (
                  <>
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                      <div className="bg-red-100 p-2 rounded-full">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Confirm Deletion</h3>
                    </div>
                    <p className="text-slate-600 mb-2">
                      Delete <strong>{selectedAccount?.name}</strong>?
                    </p>
                    {isMainAccount && (
                      <p className="text-amber-700 text-sm flex items-center gap-1 mt-2">
                        <AlertTriangle className="w-4 h-4" />
                        This is the main admin account and cannot be deleted.
                      </p>
                    )}
                    {apiError && <p className="text-red-600 text-sm mt-2">{apiError}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={submitting || isMainAccount}
                        className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Account"
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Add/Edit Form */}
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className={`p-2 rounded-full ${
                          modalMode === "add" ? "bg-green-100" : "bg-blue-100"
                        }`}
                      >
                        {modalMode === "add" ? (
                          <Plus className="w-6 h-6 text-green-600" />
                        ) : (
                          <Edit2 className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {modalMode === "add" ? "Add New Sub-Admin" : "Edit Sub-Admin"}
                      </h3>
                    </div>

                    {isMainAccount && modalMode === "edit" && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                        <strong>Note:</strong> You cannot change Email or Admin ID of the main admin.
                      </div>
                    )}

                    {apiError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {apiError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <User className="w-4 h-4" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          disabled={isMainAccount && modalMode === "edit"}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <Key className="w-4 h-4" />
                          Admin ID
                        </label>
                        <input
                          type="text"
                          placeholder="ADMIN-001"
                          value={formData.adminId}
                          onChange={(e) =>
                            setFormData({ ...formData, adminId: e.target.value })
                          }
                          readOnly // Set the field as read-only
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-slate-100 cursor-not-allowed font-mono"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <Key className="w-4 h-4" />
                          Password{" "}
                          {modalMode === "edit" && (
                            <span className="text-slate-500 text-xs">
                              (Leave blank to keep current)
                            </span>
                          )}
                        </label>
                        <input
                          type="password"
                          placeholder={
                            modalMode === "edit" ? "••••••••" : "Enter password"
                          }
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <Key className="w-4 h-4" />
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                      <button
                        onClick={closeModal}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {modalMode === "add" ? "Adding..." : "Updating..."}
                          </>
                        ) : modalMode === "add" ? (
                          "Add Account"
                        ) : (
                          "Update Account"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
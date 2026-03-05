import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle, Check, Briefcase } from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";
import { useScrollLock } from "@/hooks/use-scroll-lock";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  location?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  status: string;
  createdAt: string;
}

export function JobsSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  useScrollLock(isModalOpen);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    description: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    type: "full-time",
    currency: "USD",
    status: "active",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 60000,
  });

  // Create/Update job
  const mutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/jobs/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/jobs`;
      const method = data.id ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          company: data.company,
          description: data.description,
          location: data.location,
          salaryMin: data.salaryMin ? parseInt(data.salaryMin) : null,
          salaryMax: data.salaryMax ? parseInt(data.salaryMax) : null,
          type: data.type,
          currency: data.currency,
          status: data.status,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to save job");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSuccess(
        editingJob ? "Job updated successfully" : "Job created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete job
  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs/${jobId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) throw new Error("Failed to delete job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSuccess("Job deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      company: "",
      description: "",
      location: "",
      salaryMin: "",
      salaryMax: "",
      type: "full-time",
      currency: "USD",
      status: "active",
    });
    setEditingJob(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company,
      description: job.description || "",
      location: job.location || "",
      salaryMin: job.salaryMin?.toString() || "",
      salaryMax: job.salaryMax?.toString() || "",
      type: job.type || "full-time",
      currency: job.currency || "USD",
      status: job.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Job title is required");
      return;
    }

    if (!formData.company.trim()) {
      setError("Company name is required");
      return;
    }

    if (!formData.description.trim()) {
      setError("Job description is required");
      return;
    }

    if (!formData.location.trim()) {
      setError("Job location is required");
      return;
    }

    mutation.mutate({
      ...formData,
      id: editingJob?.id ?? undefined,
    } as typeof formData & { id?: string });
  };

  const columns: DataTableColumn<Job>[] = [
    {
      key: "title",
      label: "Job Title",
      sortable: true,
      width: "200px",
    },
    {
      key: "company",
      label: "Company",
      sortable: true,
      width: "150px",
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      width: "150px",
    },
    {
      key: "type",
      label: "Type",
      render: (value: string | undefined) => (
        <span className="text-xs font-medium bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
          {value || "N/A"}
        </span>
      ),
      width: "100px",
    },
    {
      key: "salaryMin",
      label: "Salary Range",
      render: (value, row: Job) => {
        if (!value && !row.salaryMax) return "Not specified";
        const min = value?.toLocaleString() || "0";
        const max = row.salaryMax?.toLocaleString() || "0";
        return `$${min} - $${max}`;
      },
      width: "150px",
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value === "active"
              ? "bg-green-600/20 text-green-400"
              : value === "closed"
                ? "bg-red-600/20 text-red-400"
                : "bg-yellow-600/20 text-yellow-400"
          }`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      width: "100px",
    },
  ];

  // Stats cards
  const activeJobs = jobs.filter((j: Job) => j.status === "active").length;
  const closedJobs = jobs.filter((j: Job) => j.status === "closed").length;

  const stats = [
    {
      label: "Total Jobs",
      value: String(jobs.length),
      icon: Briefcase,
      color: "blue",
    },
    {
      label: "Active",
      value: String(activeJobs),
      color: "green",
    },
    {
      label: "Closed",
      value: String(closedJobs),
      color: "red",
    },
    {
      label: "Avg Salary",
      value:
        jobs.length > 0
          ? `$${(jobs.reduce((sum: number, j: Job) => sum + (j.salaryMin || 0), 0) / jobs.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : "$0",
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Jobs Management</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage job postings and opportunities
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-700 rounded-lg p-4"
          >
            <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-white">
              {String(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-600/10 border border-red-600/50 text-red-400 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError("")}
            className="p-1 hover:bg-red-600/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 bg-green-600/10 border border-green-600/50 text-green-400 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
          <button
            onClick={() => setSuccess("")}
            className="p-1 hover:bg-green-600/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={jobs}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete job "${row.title}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No jobs found. Click 'New Job' to get started."
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900">
              <h4 className="text-lg font-bold">
                {editingJob ? "Edit Job" : "Create New Job"}
              </h4>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Senior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Company Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Describe the job position..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Job Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Min Salary ($)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMin: e.target.value })
                    }
                    min="0"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Max Salary ($)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMax: e.target.value })
                    }
                    min="0"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="80000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="New York, NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {mutation.isPending
                    ? "Saving..."
                    : editingJob
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

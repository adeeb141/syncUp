"use client";
import React, { useState } from "react";
import { api } from "@/lib/api";
import { useTaskStore } from "@/stores/taskStore";
import { TaskRow } from "@/stores/taskStore";

export function AddTaskModal({
  onClose,
  projectId,
}: {
  onClose?: () => void;
  projectId: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("low");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { addTask } = useTaskStore();

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post<any>(
        `/api/projects/${projectId}/tasks`,
        {
          title,
          description,
          status,
          priority,
        }
      );

      console.log("API RESPONSE:", response);

      const taskData = response.task ? response.task : response;

      const newTask: TaskRow = {
        ...taskData,
        created_at: taskData.created_at || new Date().toISOString(),
      };

      addTask(newTask);
      onClose?.();
    } catch (e: any) {
      setError(e.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b flex justify-between">
          <h3 className="text-xl font-bold text-gray-800">Add New Task</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✖</button>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 px-6 pt-2">{error}</p>}

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
              Task Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Design homepage hero section"
              className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add more details..."
              className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm outline-none resize-none"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-500">
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-gray-800 text-white px-5 py-2 rounded-lg"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>

      </div>
    </div>
  );
}
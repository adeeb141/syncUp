"use client";
import React, { useState,useRef,useEffect} from "react";
import { api } from "@/lib/api";
import { useTaskStore } from "@/stores/taskStore";
import { TaskRow } from "@/stores/taskStore";
import { useMemberStore } from "@/stores/memberStore";
import { useAuthStore } from "@/stores/authStore";
import { workspace_member } from "@/types";
import { create } from "zustand";

export function AddTaskModal({
  onClose,
  projectId,
  workspaceId,
}: {
  onClose?: () => void;
  projectId: string;
  workspaceId: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("low");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { addTask } = useTaskStore();
  const [assigneeSearch, setAssigneeSearch] = useState("");
const [selectedAssignees, setSelectedAssignees] = useState<workspace_member[]>([]);
const [showDropdown, setShowDropdown] = useState(false);

const dropdownRef = useRef<HTMLDivElement>(null);
const fetchMembers = useMemberStore((s) => s.fetchMembers);
const members = useMemberStore((s) => s.members);

useEffect(() => {
  if (!workspaceId) return;

  fetchMembers(workspaceId); 
}, [workspaceId]);

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

const filteredMembers = members
  .filter(
    (m) =>
      !selectedAssignees.find((s) => s.user_id === m.user_id) // remove selected
  )
  .filter(
    (m) =>
      (m.name || "").toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  
console.log("MEMBERS:", members);
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
  assignee_ids: selectedAssignees.map((m) => m.user_id),
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
          <div  ref={dropdownRef} className="relative">
  <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">
    Assignee
  </label>

  {/* Selected chips */}
  <div className="flex flex-wrap gap-2 mb-2">
    {selectedAssignees.map((m) => (
      <span
        key={m.user_id}
        className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center gap-1"
      >
        {m.name}
        <button
          onClick={() =>
            setSelectedAssignees((prev) =>
              prev.filter((p) => p.user_id !== m.user_id)
            )
          }
        >
          ✖
        </button>
      </span>
    ))}
  </div>

  {/* Input */}
  <input
    value={assigneeSearch}
    onChange={(e) => {
      setAssigneeSearch(e.target.value);
      setShowDropdown(true);
    }}
    onFocus={() => setShowDropdown(true)}
    placeholder="Search member..."
    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm"
  />

  {/* Dropdown */}
  {showDropdown && (
    <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg max-h-40 overflow-y-auto">
      {filteredMembers.map((m) => (
        <div
          key={m.user_id}
          onClick={() => {
            setSelectedAssignees((prev) => {
              if (prev.find((p) => p.user_id === m.user_id)) return prev;
              return [...prev, m];
            });
            setAssigneeSearch(""); // clear input
            setShowDropdown(false);
          }}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
        >
          {m.name} ({m.role})
        </div>
      ))}
    </div>
  )}
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

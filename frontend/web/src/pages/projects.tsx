import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  type Project
} from "../lib/projects-store";

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const createMutation = useMutation({
    mutationFn: (newName: string) => createProject(newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setName("");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameProject(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingId(null);
      setEditingName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Projects</h1>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMutation.mutate(name.trim());
        }}
      >
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="px-3 py-1 border rounded bg-blue-600 text-white text-sm"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Add"}
        </button>
      </form>

      {data.length === 0 && <p className="text-gray-600">No projects yet.</p>}

      <ul className="space-y-2">
        {data.map((p) => (
          <li key={p.id} className="p-3 border rounded bg-white">
            {editingId === p.id ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editingName.trim()) return;
                  renameMutation.mutate({ id: p.id, name: editingName.trim() });
                }}
              >
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-1 border rounded bg-blue-600 text-white text-sm"
                  disabled={renameMutation.isPending}
                >
                  {renameMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 border rounded text-sm"
                  onClick={() => {
                    setEditingId(null);
                    setEditingName("");
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name || "Untitled project"}</div>
                  <div className="text-xs text-gray-500">{p.created_at}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditingName(p.name || "");
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs text-red-600"
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

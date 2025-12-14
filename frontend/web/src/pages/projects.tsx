import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject } from "../lib/projects-api";
import { useState } from "react";

type Project = {
  id: string;
  name: string | null;
  created_at: string;
};

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

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

  if (isLoading) return <div>Loading…</div>;
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
            <div className="font-medium">{p.name || "Untitled project"}</div>
            <div className="text-xs text-gray-500">{p.created_at}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

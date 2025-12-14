const API_URL = import.meta.env.VITE_PROJECTS_API_URL!;

export async function listProjects() {
  const res = await fetch(API_URL, { method: "GET" });
  if (!res.ok) throw new Error("Failed to load projects");
  const json = await res.json();
  return json.projects ?? [];
}

export async function createProject(name: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error("Failed to create project");
  const json = await res.json();
  return json.project;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, GripVertical, MoreVertical, Wand2 } from "lucide-react";
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  listProjectDocumentItems,
  createProjectDocumentItems,
  deleteProjectDocumentItem,
  getProjectDocumentState,
  setProjectDocumentState,
  type Project,
  type ProjectDocumentItem
} from "../lib/projects-store";
import { WizardPage } from "./wizard";

const wizardCards = [
  { title: "Discovery", active: true, href: "/wizard" },
  { title: "Product Definition", active: false },
  { title: "Product Requirements", active: false },
  { title: "User Experience", active: false },
  { title: "User Interface", active: false },
  { title: "Technical Architecture", active: false },
  { title: "Delivery Planning", active: false },
  { title: "Testing", active: false },
  { title: "Deployment and Launch", active: false }
];

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

type LatestDiscovery = {
  record?: {
    version?: number;
    timestamp?: string;
    discoveryDocument?: Record<string, unknown>;
    productIdea?: string;
    lastStatusMessage?: string;
  };
  status?: string;
};

const initialDocumentItems = [
  "Discovery",
  "Product Definition",
  "Product Requirements",
  "User Experience",
  "User Interface",
  "Technical Architecture",
  "Delivery Planning",
  "Testing",
  "Deployment and Launch"
];

const formatProductIdea = (value: string) =>
  value
    .replace(/\r?\n+/g, " ")
    .replace(/([.!?])\s+/g, "$1\n\n")
    .trim();

export function ProjectsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [latestDiscovery, setLatestDiscovery] = useState<LatestDiscovery | null>(null);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [documentMarkdown, setDocumentMarkdown] = useState<string>("");
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [projectOrder, setProjectOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem("projects.order");
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [projectActionError, setProjectActionError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<
    Record<string, ProjectDocumentItem[]>
  >({});
  const loadedDocumentProjects = useRef<Set<string>>(new Set());
  const documentLoadToken = useRef(0);
  const [documentMenuId, setDocumentMenuId] = useState<string | null>(null);
  const documentItems = activeProjectId
    ? projectDocuments[activeProjectId] || []
    : [];

  const { data = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const createMutation = useMutation({
    mutationFn: (newName: string) => createProject(newName),
    onMutate: () => {
      setIsCreatingProject(true);
      setProjectActionError(null);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setActiveProjectId(created.id);
      setEditingId(created.id);
      setEditingName(created.name || "New Project");
      setName("");
      setProjectActionError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setProjectActionError(err.message);
      } else {
        setProjectActionError(
          typeof err === "string" ? err : JSON.stringify(err)
        );
      }
    },
    onSettled: () => {
      setIsCreatingProject(false);
    },
  });

  const hasAutoCreated = useRef(false);
  useEffect(() => {
    if (hasAutoCreated.current) return;
    if (!location.state || typeof location.state !== "object") return;
    const state = location.state as { createProject?: boolean };
    if (!state.createProject) return;
    hasAutoCreated.current = true;
    createMutation.mutate("New Project");
    navigate(window.location.pathname + window.location.search, {
      replace: true,
      state: null
    });
  }, [location.state, navigate, createMutation]);

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

  useEffect(() => {
    if (!activeProjectId && data.length > 0) {
      setActiveProjectId(data[0].id);
    }
  }, [activeProjectId, data]);

  useEffect(() => {
    let isMounted = true;
    const loadDocuments = async () => {
      if (!activeProjectId) return;
      const currentToken = ++documentLoadToken.current;
      try {
        let docs = projectDocuments[activeProjectId];
        if (!docs || docs.length === 0) {
          docs = await listProjectDocumentItems(activeProjectId);
          if (docs.length === 0) {
            docs = await createProjectDocumentItems(
              activeProjectId,
              initialDocumentItems
            );
          }
          if (!isMounted || documentLoadToken.current !== currentToken) return;
          loadedDocumentProjects.current.add(activeProjectId);
          setProjectDocuments((prev) => ({
            ...prev,
            [activeProjectId]: docs
          }));
        }
        const state = await getProjectDocumentState(activeProjectId);
        if (!isMounted || documentLoadToken.current !== currentToken) return;
        const selected =
          (state?.last_selected_document_id &&
            docs.find((doc) => doc.id === state.last_selected_document_id)) ||
          docs.find((doc) => doc.name === "Discovery") ||
          docs[0];
        if (!selected) return;
        setActiveDocument(selected.name);
        setActiveDocumentId(selected.id);
        if (selected.id !== state?.last_selected_document_id) {
          await setProjectDocumentState(activeProjectId, selected.id);
        }
      } catch (err) {
        if (err instanceof Error) {
          setProjectActionError(err.message);
        } else {
          setProjectActionError(
            typeof err === "string" ? err : JSON.stringify(err)
          );
        }
      }
    };
    loadDocuments();
    return () => {
      isMounted = false;
    };
  }, [activeProjectId, projectDocuments]);

  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      setIsDiscoveryLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002"}/discovery/latest`
        );
        if (!response.ok) {
          throw new Error("Failed to load latest discovery.");
        }
        const payload = (await response.json()) as LatestDiscovery;
        if (isMounted) {
          setLatestDiscovery(payload);
        }
      } catch {
        if (isMounted) {
          setLatestDiscovery(null);
        }
      } finally {
        if (isMounted) {
          setIsDiscoveryLoading(false);
        }
      }
    };
    fetchLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  const projectIdea = useMemo(() => {
    const rawIdea = latestDiscovery?.record?.productIdea
      || localStorage.getItem("discoveryWizard.productIdea")
      || "";
    return rawIdea ? formatProductIdea(rawIdea) : "";
  }, [latestDiscovery]);

  useEffect(() => {
    setIdea(projectIdea);
  }, [projectIdea]);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [idea]);

  const generateIdea = async (currentProductIdea?: string) => {
    setIsGenerating(true);
    setIdeaError(null);
    try {
      const response = await fetch(`${API_BASE}/discovery/random-inputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentProductIdea: currentProductIdea?.trim() || idea.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to generate an idea.");
      }
      if (typeof data?.productIdea !== "string" || !data.productIdea.trim()) {
        throw new Error("Random generation returned incomplete data.");
      }
      const formattedIdea = data.productIdea
        .replace(/\r?\n+/g, " ")
        .replace(/([.!?])\s+/g, "$1\n\n");
      setIdea(formattedIdea);
      localStorage.setItem("discoveryWizard.productIdea", formattedIdea);
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : "Failed to generate an idea.");
    } finally {
      setIsGenerating(false);
    }
  };

  const projectsList = useMemo(() => data, [data]);

  useEffect(() => {
    if (projectsList.length === 0) {
      setProjectOrder([]);
      return;
    }
    setProjectOrder((prev) => {
      const ids = projectsList.map((project) => project.id);
      const hasNew = ids.some((id) => !prev.includes(id));
      const hasRemoved = prev.some((id) => !ids.includes(id));
      if (prev.length === 0 || hasNew || hasRemoved) {
        return ids;
      }
      return prev;
    });
  }, [projectsList]);

  useEffect(() => {
    if (projectOrder.length === 0) {
      localStorage.removeItem("projects.order");
      return;
    }
    localStorage.setItem("projects.order", JSON.stringify(projectOrder));
  }, [projectOrder]);

  const orderedProjects = useMemo(() => {
    if (projectOrder.length === 0) {
      return projectsList;
    }
    const lookup = new Map(projectsList.map((project) => [project.id, project]));
    return projectOrder.map((id) => lookup.get(id)).filter(Boolean) as Project[];
  }, [projectOrder, projectsList]);

  const moveProject = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setProjectOrder((prev) => {
      const next = prev.slice();
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      return next;
    });
  };

  const renderProjectItem = (project: Project) => {
    const isActive = activeProjectId === project.id;
    return (
      <div
        key={project.id}
        className={`rounded-xl px-3 py-2 text-sm transition ${
          isActive
            ? "bg-gradient-to-br from-blue-200/80 to-violet-200/80 text-gray-800"
            : "text-gray-800 hover:bg-gray-100"
        } ${dragOverId === project.id ? "bg-blue-100" : ""} group`}
        onDragOver={(event) => {
          if (!draggingId) return;
          event.preventDefault();
          setDragOverId(project.id);
        }}
        onDragLeave={() => {
          if (dragOverId === project.id) {
            setDragOverId(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingId) {
            moveProject(draggingId, project.id);
          }
          setDraggingId(null);
          setDragOverId(null);
        }}
      >
        {editingId === project.id ? (
          <input
            className="w-full rounded border px-2 py-1 text-sm text-gray-800 leading-none ml-6"
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            onBlur={() => {
              const nextName = editingName.trim();
              if (nextName) {
                renameMutation.mutate({ id: project.id, name: nextName });
              }
              setEditingId(null);
              setEditingName("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const nextName = editingName.trim();
                if (nextName) {
                  renameMutation.mutate({ id: project.id, name: nextName });
                }
                setEditingId(null);
                setEditingName("");
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setEditingId(null);
                setEditingName("");
              }
            }}
            autoFocus
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="mt-0.5 flex h-6 w-6 cursor-grab items-center justify-center text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-gray-600 active:cursor-grabbing"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggingId(project.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => {
                  setActiveProjectId(project.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {project.name || "Untitled project"}
                    </p>
                  </div>
                </div>
              </button>
              <div className="relative group/menu" data-project-menu={project.id}>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    setProjectMenuId((prev) =>
                      prev === project.id ? null : project.id
                    );
                  }}
                  aria-label="Project options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {projectMenuId === project.id && (
                  <div className="absolute right-0 top-full z-10 mt-2 w-28 rounded border bg-white shadow-md">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(project.id);
                        setEditingName(project.name || "");
                        setProjectMenuId(null);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteMutation.mutate(project.id);
                        setProjectMenuId(null);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!projectMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const wrapper = document.querySelector(
        `[data-project-menu=\"${projectMenuId}\"]`
      );
      if (wrapper && target && wrapper.contains(target)) {
        return;
      }
      setProjectMenuId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [projectMenuId]);

  useEffect(() => {
    if (!documentMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const wrapper = document.querySelector(
        `[data-document-menu=\"${documentMenuId}\"]`
      );
      if (wrapper && target && wrapper.contains(target)) {
        return;
      }
      setDocumentMenuId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [documentMenuId]);

  useEffect(() => {
    const version = latestDiscovery?.record?.version ?? null;
    if (!version) {
      setDocumentMarkdown("");
      return;
    }
    let isMounted = true;
    const loadMarkdown = async () => {
      setIsDocumentLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002"}/discovery/export/markdown?version=${version}`
        );
        if (!response.ok) {
          throw new Error("Failed to load document.");
        }
        const text = await response.text();
        if (isMounted) {
          setDocumentMarkdown(text);
        }
      } catch {
        if (isMounted) {
          setDocumentMarkdown("");
        }
      } finally {
        if (isMounted) {
          setIsDocumentLoading(false);
        }
      }
    };
    loadMarkdown();
    return () => {
      isMounted = false;
    };
  }, [latestDiscovery?.record?.version]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;

  const leftColumn = orderedProjects.filter((_, index) => index % 2 === 0);
  const rightColumn = orderedProjects.filter((_, index) => index % 2 === 1);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,64rem)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <button
          type="button"
          className="self-start rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white"
          onClick={() => {
            const fallbackName = `Project ${data.length + 1}`;
            createMutation.mutate(name.trim() || fallbackName);
            setName("");
          }}
          disabled={isCreatingProject}
        >
          {isCreatingProject ? "Creating..." : "+ Project"}
        </button>

        {projectActionError && (
          <p className="text-xs text-red-600">{projectActionError}</p>
        )}

        <div className="grid gap-0 sm:grid-cols-2">
          <div className="space-y-2 pr-3">
            {orderedProjects.map(renderProjectItem)}
          </div>
          <div className="border-l border-gray-200 pl-3">
            <div className="space-y-2">
              {documentItems.map((item) => {
                const isActive = activeDocumentId === item.id;
                return (
                <div
                  key={item.id}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-blue-50 text-gray-800"
                      : "text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    setActiveDocument(item.name);
                    setActiveDocumentId(item.id);
                    if (activeProjectId) {
                      setProjectDocumentState(activeProjectId, item.id).catch(
                        () => undefined
                      );
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <div className="relative" data-document-menu={item.id}>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDocumentMenuId((prev) =>
                          prev === item.id ? null : item.id
                        );
                      }}
                      aria-label="Document options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {documentMenuId === item.id && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-28 rounded border bg-white shadow-md">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!activeProjectId) return;
                            deleteProjectDocumentItem(item.id)
                              .then(() => {
                                setProjectDocuments((prev) => ({
                                  ...prev,
                                  [activeProjectId]: (prev[activeProjectId] || []).filter(
                                    (entry) => entry.id !== item.id
                                  )
                                }));
                                if (activeDocumentId === item.id) {
                                  setActiveDocument(null);
                                  setActiveDocumentId(null);
                                  setProjectDocumentState(activeProjectId, null).catch(
                                    () => undefined
                                  );
                                }
                                setDocumentMenuId(null);
                              })
                              .catch((err) => {
                                if (err instanceof Error) {
                                  setProjectActionError(err.message);
                                } else {
                                  setProjectActionError(
                                    typeof err === "string" ? err : JSON.stringify(err)
                                  );
                                }
                                setDocumentMenuId(null);
                              });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      </aside>

      <div className="w-full max-w-5xl justify-self-center space-y-0">
        <section className="p-8 pb-0">
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-left text-sm text-gray-500">
                Use this idea, or bring your own
              </p>
              <button
                type="button"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
                onClick={() => generateIdea()}
                disabled={isGenerating}
              >
                <Wand2 className="h-4 w-4" />
                <span className="ml-2">
                  {isGenerating ? "Generating..." : "Another Great Idea"}
                </span>
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 p-[3px]">
              <textarea
                className="min-h-[160px] w-full resize-none overflow-hidden rounded-lg bg-white px-4 py-3 text-base leading-tight shadow-sm focus:outline-none"
                value={idea}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setIdea(nextValue);
                  localStorage.setItem("discoveryWizard.productIdea", nextValue);
                  resizeTextarea();
                }}
                onInput={resizeTextarea}
                placeholder={isGenerating ? "Generating idea..." : undefined}
                ref={textareaRef}
              />
            </div>
            {ideaError && <p className="mt-2 text-sm text-red-600">{ideaError}</p>}
          </div>
        </section>

        <section className="space-y-6">
          <WizardPage embedded debugTargetId="wizard-debug-panel" />
        </section>
      </div>

      <div id="wizard-debug-panel" className="space-y-4" />
    </div>
  );
}

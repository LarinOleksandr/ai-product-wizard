import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, Wand2 } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import appIcon from "../assets/alchemia-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import {
  getSession,
  listProjects,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
  type Project
} from "../lib/projects-store";
import { supabase } from "../lib/supabase";

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

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

const sampleIdea = `For students with dyslexia, our AI-powered 'Sensory Atlas' uses supportive graphics and personalized soundscapes to create an immersive learning environment.

The core mechanic is a system adaptation to their individual reading patterns, fostering a deeper connection between the senses and the material being learned.

By cultivating this multisensory awareness, students can develop a more intuitive understanding of complex concepts and retain information more effectively.`;

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [idea, setIdea] = useState(sampleIdea);
  const [resetEmailFromLink, setResetEmailFromLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    "sign-in" | "sign-up" | "forgot" | "reset"
  >("sign-up");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [isGoogleAuthWorking, setIsGoogleAuthWorking] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentProjectIdeas, setRecentProjectIdeas] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const orderedRecentProjects = useMemo(() => {
    if (recentProjects.length === 0) return [];
    const stored = localStorage.getItem("projects.order");
    if (!stored) return recentProjects;
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return recentProjects;
      const order = parsed.filter((id) => typeof id === "string") as string[];
      const lookup = new Map(recentProjects.map((project) => [project.id, project]));
      const ordered = order.map((id) => lookup.get(id)).filter(Boolean) as Project[];
      return ordered.length > 0 ? ordered : recentProjects;
    } catch {
      return recentProjects;
    }
  }, [recentProjects]);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const generateIdea = async (currentProductIdea?: string) => {
    setIsGenerating(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate an idea.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = authEmail.trim();
    if (authMode === "forgot") {
      if (!email) {
        setAuthError("Enter your email to reset the password.");
        return;
      }
      setIsAuthWorking(true);
      setAuthError(null);
      setAuthSuccess(null);
      try {
        await resetPassword(email, window.location.origin);
        setAuthSuccess("Password reset email sent. Check your inbox.");
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Password reset failed.");
      } finally {
        setIsAuthWorking(false);
      }
      return;
    }
    if (authMode !== "reset" && (!email || !authPassword)) {
      setAuthError("Email and password are required.");
      return;
    }
    if (authMode === "reset" && !authPassword) {
      setAuthError("Enter your new password.");
      return;
    }
    if (authMode === "reset" && authPassword !== authPasswordConfirm) {
      setAuthError("Passwords do not match.");
      return;
    }
    setIsAuthWorking(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (authMode === "reset") {
        await updatePassword(authPassword);
        setAuthSuccess("Password updated. You can sign in.");
        setAuthMode("sign-in");
        setAuthPassword("");
        setAuthPasswordConfirm("");
      } else {
        const session =
          authMode === "sign-in"
            ? await signInWithEmail(email, authPassword)
            : await signUpWithEmail(email, authPassword);
        if (!session && authMode === "sign-up") {
          setAuthSuccess(
            "Check your email to confirm the account, then sign in."
          );
          return;
        }
        setAuthSuccess("Signed in successfully.");
        setIsAuthOpen(false);
        setAuthPassword("");
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsAuthWorking(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsGoogleAuthWorking(true);
    try {
      await signInWithGoogle(window.location.origin + window.location.pathname);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Google sign-in failed.");
      setIsGoogleAuthWorking(false);
    }
  };

  const handlePasswordReset = () => {
    setAuthMode("forgot");
    setAuthError(null);
    setAuthSuccess(null);
    setAuthPassword("");
    setAuthPasswordConfirm("");
  };

  useEffect(() => {
    resizeTextarea();
  }, [idea]);
  useEffect(() => {
    if (authMode !== "reset") {
      return;
    }
    getSession()
      .then((currentSession) => {
        if (currentSession?.user?.email) {
          setAuthEmail(currentSession.user.email);
        }
      })
      .catch(() => undefined);
  }, [authMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      return;
    }
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (data.session?.user?.email) {
          setAuthEmail(data.session.user.email);
        }
        setAuthMode("reset");
        setIsAuthOpen(true);
        const url = new URL(window.location.href);
        url.search = "";
        url.hash = "";
        window.history.replaceState({}, "", url.toString());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    getSession()
      .then((currentSession) => {
        if (!active) return;
        if (currentSession?.user?.email) {
          setAuthEmail(currentSession.user.email);
        }
      })
      .catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY" && nextSession?.user?.email) {
        setAuthEmail(nextSession.user.email);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    getSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      })
      .catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setRecentProjects([]);
      setRecentProjectIdeas({});
      return;
    }
    let active = true;
    listProjects()
      .then((projects) => {
        if (active) {
          setRecentProjects(projects.slice(0, 3));
        }
      })
      .catch(() => {
        if (active) {
          setRecentProjects([]);
          setRecentProjectIdeas({});
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!recentProjects.length) {
      setRecentProjectIdeas({});
      return;
    }
    let active = true;
    const projectIds = recentProjects.map((project) => project.id);
    const storedIdeas: Record<string, string> = {};
    const ideaPromises = projectIds.map((projectId) =>
      fetch(`${API_BASE}/discovery/latest?projectId=${projectId}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          const idea = payload?.record?.productIdea;
          if (typeof idea === "string" && idea.trim()) {
            storedIdeas[projectId] = idea.trim();
          }
        })
        .catch(() => undefined)
    );
    Promise.all(ideaPromises).then(() => {
      if (active) {
        setRecentProjectIdeas(storedIdeas);
      }
    });
    return () => {
      active = false;
    };
  }, [recentProjects]);

  const truncateIdea = (idea: string) => {
    const normalized = idea.replace(/\s+/g, " ").trim();
    if (!normalized) return "No project idea yet...";
    const words = normalized.split(" ");
    const short = words.slice(0, 24).join(" ");
    return words.length > 24 ? `${short}...` : `${short}...`;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authParam = params.get("auth");
    const emailParam = params.get("email");
    if (authParam === "sign-in" || authParam === "sign-up" || authParam === "reset") {
      setAuthMode(authParam);
      setIsAuthOpen(true);
      if (emailParam) {
        setResetEmailFromLink(emailParam);
        setAuthEmail(emailParam);
      }
      params.delete("auth");
      params.delete("email");
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : ""
        },
        { replace: true }
      );
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const isRecovery = params.get("type") === "recovery";
    const emailFromLink = params.get("email");
    if (!isRecovery) {
      return;
    }
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (!error && data.session?.user?.email) {
            setAuthEmail(data.session.user.email);
          }
        })
        .catch(() => undefined);
    }
    if (emailFromLink) {
      setResetEmailFromLink(emailFromLink);
    }
    setAuthMode("reset");
    setIsAuthOpen(true);
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {session && (
        <section className="mt-4 space-y-2">
          <div className="h-3" />
          <div className="grid gap-4 md:grid-cols-3">
            {(() => {
              const topProjects = orderedRecentProjects.slice(0, 3);
              const showPlaceholder = topProjects.length < 3;
              const cards =
                topProjects.length >= 3
                  ? topProjects.map((project) => ({
                      type: "project" as const,
                      project
                    }))
                  : [
                      ...topProjects.map((project) => ({
                        type: "project" as const,
                        project
                      })),
                      ...(showPlaceholder
                        ? [{ type: "placeholder" as const }]
                        : [])
                    ];

              return cards.map((card, index) =>
                card.type === "project" ? (
                  <Link
                    key={card.project.id}
                    to="/projects"
                    className="w-full rounded-xl bg-gradient-to-br from-blue-200/80 to-violet-200/80 p-4 text-sm text-gray-800 shadow-sm transition hover:from-blue-200/90 hover:to-violet-200/90"
                  >
                    <p className="font-semibold">
                      {card.project.name || "Untitled project"}
                    </p>
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      {truncateIdea(recentProjectIdeas[card.project.id] || "")}
                    </p>
                  </Link>
                ) : (
                  <Link
                    key={`project-placeholder-${index}`}
                    to="/projects"
                    state={{ createProject: true }}
                    className="flex w-full flex-col rounded-xl border-2 border-dashed border-blue-200 bg-white p-4 text-sm text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="font-semibold">+ Project</p>
                    <p className="mt-2 text-xs text-gray-600 opacity-0">
                      Placeholder
                    </p>
                  </Link>
                )
              );
            })()}
          </div>
        </section>
      )}

      <section className="p-8 text-center">
        <img
          src={appIcon}
          alt="AlchemIA"
          className="mx-auto h-64 w-64"
        />
        <p className="mt-3 text-gray-600">
          <span className="block text-2xl">
            Turn{" "}
            <span className="font-semibold" style={{ color: "#5F23C2" }}>
              Your Idea
            </span>{" "}
            into a{" "}
            <span className="font-semibold" style={{ color: "#426BDB" }}>
              Digital Product
            </span>
            {" "}specification
          </span>
          <span className="mt-2 block text-base">
            and then build it with full control and maximum speed
          </span>
        </p>

        <div className="mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-left text-sm text-gray-500">Use this idea, or bring your own</p>
            <button
              type="button"
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
              onClick={() => generateIdea()}
              disabled={isGenerating}
            >
              <Wand2 className="h-4 w-4" />
              <span className="ml-2">{isGenerating ? "Generating..." : "Another Great Idea"}</span>
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 p-[3px]">
            <textarea
              className="min-h-[160px] w-full resize-none overflow-hidden rounded-lg bg-white px-4 py-3 text-base leading-tight shadow-sm focus:outline-none"
              value={idea}
              onChange={(event) => {
                setIdea(event.target.value);
                resizeTextarea();
              }}
              onInput={resizeTextarea}
              placeholder={isGenerating ? "Generating idea..." : undefined}
              ref={textareaRef}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-8 flex justify-center">
            <Link
              to="/wizard"
              state={{ pendingIdea: idea }}
              className="w-full max-w-xs rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 px-6 py-3 text-center text-base font-semibold text-white hover:from-blue-700 hover:to-violet-700"
              onClick={() => {
                if (idea.trim()) {
                  localStorage.setItem("discoveryWizard.productIdea", idea.trim());
                  localStorage.setItem("discoveryWizard.pendingIdea", idea.trim());
                }
              }}
            >
              Let the magic begin
            </Link>
          </div>
          <div className="mt-6 text-center text-sm text-gray-600">
            To save your work{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={() => {
                setAuthMode("sign-in");
                setIsAuthOpen(true);
              }}
            >
              Sign in
            </button>{" "}
            or{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={() => {
                setAuthMode("sign-up");
                setIsAuthOpen(true);
              }}
            >
              Register
            </button>
            .
          </div>
        </div>

      </section>

      <section className="space-y-4 mt-12">
        <h2 className="text-center text-base font-semibold text-gray-800">
          Start with Wizards
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {wizardCards.map((card) => {
            const cardClasses = `rounded-xl p-4 shadow-sm ${
              card.active
                ? "bg-transparent border border-gray-300"
                : "bg-gray-200 opacity-60"
            }`;
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                    <FileText className="h-4 w-4" />
                    {card.title}
                  </h3>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {card.active ? "Start building a discovery document." : "Coming soon..."}
                </p>
              </>
            );
            return card.active && card.href ? (
              <Link
                key={card.title}
                to={card.href}
                className={cardClasses}
              >
                {content}
              </Link>
            ) : (
              <div key={card.title} className={cardClasses}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <Dialog
        open={isAuthOpen}
        onOpenChange={(open) => {
          setIsAuthOpen(open);
          if (!open) {
            setAuthError(null);
            setAuthPassword("");
            setAuthPasswordConfirm("");
            setIsGoogleAuthWorking(false);
            setShowPassword(false);
            setShowPasswordConfirm(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <img src={appIcon} alt="AlchemIA" className="h-24 w-24" />
              {authMode === "sign-up" && (
                <DialogTitle>Create your account</DialogTitle>
              )}
              {authMode === "reset" && (
                <DialogTitle>Reset your password</DialogTitle>
              )}
              <DialogDescription className="text-center">
                {authMode === "reset"
                  ? "Enter your new password to finish recovery."
                  : authMode === "forgot"
                    ? "We will email you a link to reset your password."
                  : authMode === "sign-in"
                    ? "Welcome back! Please sign in to continue."
                    : "Welcome! Please fill in the details to get started."}
              </DialogDescription>
            </div>
          </DialogHeader>
          {authMode !== "reset" && authMode !== "forgot" && (
            <div className="space-y-3">
              <button
                type="button"
                className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
                onClick={handleGoogleAuth}
                disabled={isGoogleAuthWorking}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.2 0 5.9-1.1 7.8-2.9l-3.9-3c-1.1.8-2.5 1.3-3.9 1.3-3 0-5.5-2-6.4-4.7H1.6v3.1C3.5 21.4 7.4 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.6 14.7c-.2-.6-.4-1.2-.4-1.9s.1-1.3.3-1.9V7.8H1.6C.6 9.7 0 11.8 0 12.8c0 1 .6 3.1 1.6 4.9l4-3z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.8c1.7 0 3.2.6 4.3 1.7l3.2-3.2C17.8 1.2 15.1 0 12 0 7.4 0 3.5 2.6 1.6 7.8l4 3.1c.9-2.7 3.4-4.7 6.4-4.7z"
                      fill="#EA4335"
                    />
                  </svg>
                  {isGoogleAuthWorking ? "Connecting..." : "Continue with Google"}
                </span>
              </button>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                or
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            </div>
          )}
          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            {authMode !== "reset" && authMode !== "forgot" && (
              <div>
                <label className="text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}
            {authMode === "reset" && (
              <div>
                <label className="text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={resetEmailFromLink || authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={Boolean(resetEmailFromLink || authEmail)}
                />
              </div>
            )}
            {authMode === "forgot" && (
              <div>
                <label className="text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}
            {authMode !== "reset" && authMode !== "forgot" && (
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded border border-slate-200 px-3 py-2 pr-10 text-sm"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="********"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              {authMode === "sign-in" && (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                  onClick={handlePasswordReset}
                >
                  Forgot password?
                </button>
              )}
            </div>
            )}
            {authMode === "reset" && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600">New password</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded border border-slate-200 px-3 py-2 pr-10 text-sm"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Confirm password</label>
                  <div className="relative mt-1">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      className="w-full rounded border border-slate-200 px-3 py-2 pr-10 text-sm"
                      value={authPasswordConfirm}
                      onChange={(event) => setAuthPasswordConfirm(event.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPasswordConfirm((prev) => !prev)}
                      aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                    >
                      {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            {authSuccess && (
              <p className="text-xs text-emerald-600">{authSuccess}</p>
            )}
            {authMode === "sign-up" && authSuccess ? (
              <DialogFooter className="flex justify-center gap-2">
                <button
                  type="button"
                  className="mx-auto min-w-[120px] rounded border px-3 py-2 text-sm"
                  onClick={() => setIsAuthOpen(false)}
                >
                  Close
                </button>
              </DialogFooter>
            ) : (
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm"
                  onClick={() => setIsAuthOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={isAuthWorking}
                >
                  {isAuthWorking
                    ? authMode === "sign-in"
                      ? "Signing in..."
                      : authMode === "reset"
                        ? "Updating password..."
                        : authMode === "forgot"
                          ? "Sending email..."
                          : "Creating account..."
                    : authMode === "sign-in"
                      ? "Sign in"
                      : authMode === "reset"
                        ? "Update password"
                        : authMode === "forgot"
                          ? "Send reset link"
                          : "Create account"}
                </button>
              </DialogFooter>
            )}
          </form>
          {null}
          {authMode === "forgot" && null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import appIcon from "../assets/ai-product-wizard-app.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import { signInWithEmail, signUpWithEmail } from "../lib/projects-store";

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

const wizardCards = [
  { title: "Discovery Wizard", active: true, href: "/wizard" },
  { title: "Product Definition Wizard", active: false },
  { title: "Product Requirements Wizard", active: false },
  { title: "User Experience Wizard", active: false },
  { title: "User Interface Wizard", active: false },
  { title: "Technical Architecture Wizard", active: false },
  { title: "Delivery Planning Wizard", active: false },
  { title: "Testing Wizard", active: false },
  { title: "Deployment and Launch Wizard", active: false }
];

const sampleIdea = `This product is designed for individuals with chronic pain who live in rural areas, providing a personalized virtual reality therapy program tailored to their specific condition and environment.

The core mechanic involves using AI-powered avatars to simulate real-world environments, allowing users to confront and overcome triggers that exacerbate their pain.

By doing so, users experience a sense of control and empowerment over their wellbeing, leading to improved mental health outcomes.`;

export function HomePage() {
  const [idea, setIdea] = useState(sampleIdea);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (!email || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    setIsAuthWorking(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
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
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsAuthWorking(false);
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [idea]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="p-8 text-center">
        <img
          src={appIcon}
          alt="AI Product Wizard"
          className="mx-auto h-64 w-64"
        />
        <h1 className="mt-4 text-5xl font-semibold text-gray-900">
          AI Product Wizard
        </h1>
        <p className="mt-3 text-gray-600">
          <span className="block text-2xl">
            Transform your{" "}
            <span className="font-semibold" style={{ color: "#5F23C2" }}>
              unique idea
            </span>{" "}
            into a functional, scalable{" "}
            <span className="font-semibold" style={{ color: "#426BDB" }}>
              digital product
            </span>
            .
          </span>
          <span className="mt-2 block text-base">
            Consistently, controlled, and with guaranteed results.
          </span>
        </p>

        <div className="mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-left text-sm text-gray-500">Use this idea, or bring your own</p>
            <button
              type="button"
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
              onClick={() => generateIdea()}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Another idea"}
            </button>
          </div>
          <div className="mt-3">
            <textarea
              className="min-h-[160px] w-full resize-none overflow-hidden rounded-lg border-[3px] border-blue-500 bg-white px-4 py-3 text-base shadow-sm focus:border-blue-600 focus:outline-none"
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
          <div className="mt-6 flex justify-center">
            <Link
              to="/wizard"
              className="w-full max-w-xs rounded-lg bg-blue-600 px-6 py-3 text-center text-base font-semibold text-white"
              onClick={() => {
                if (idea.trim()) {
                  localStorage.setItem("discoveryWizard.productIdea", idea.trim());
                }
              }}
            >
              Let the magic begin
            </Link>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            To save results of your work you will need to register.
            <button
              type="button"
              className="ml-2 text-sm font-semibold text-blue-600 hover:underline"
              onClick={() => {
                setAuthMode("sign-up");
                setIsAuthOpen(true);
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Wizards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {wizardCards.map((card) => {
            const cardClasses = `rounded-xl border bg-white p-4 shadow-sm ${
              card.active ? "border-blue-200" : "border-gray-200 opacity-60"
            }`;
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {card.title}
                  </h3>
                  {!card.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Locked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {card.active
                    ? "Start building a discovery document."
                    : "In Development"}
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

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {authMode === "sign-in" ? "Sign in" : "Create an account"}
            </DialogTitle>
            <DialogDescription>
              Register to save documents and manage projects.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleAuthSubmit}>
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
            <div>
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="********"
              />
            </div>
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            {authSuccess && (
              <p className="text-xs text-emerald-600">{authSuccess}</p>
            )}
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
                    : "Creating account..."
                  : authMode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </DialogFooter>
          </form>
          <div className="pt-2 text-xs text-slate-500">
            {authMode === "sign-in" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-blue-600"
              onClick={() =>
                setAuthMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))
              }
            >
              {authMode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

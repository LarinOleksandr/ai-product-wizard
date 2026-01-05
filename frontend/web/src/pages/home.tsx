import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Wand2 } from "lucide-react";

import appIcon from "../assets/alchemia-big-logo.png";
import textLogo from "../assets/alchemia-small-text-logo.png";
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

const sampleIdea = `For students with dyslexia, our AI-powered 'Sensory Atlas' uses supportive graphics and personalized soundscapes to create an immersive learning environment.

The core mechanic is a system adaptation to their individual reading patterns, fostering a deeper connection between the senses and the material being learned.

By cultivating this multisensory awareness, students can develop a more intuitive understanding of complex concepts and retain information more effectively.`;

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
          <div className="mt-6 flex justify-center">
            <Link
              to="/wizard"
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
          <div className="mt-4 text-center text-sm text-gray-600">
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

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {wizardCards.map((card) => {
            const cardClasses = `rounded-xl p-4 shadow-sm ${
              card.active
                ? "bg-gradient-to-br from-blue-200/80 to-violet-200/80"
                : "bg-gray-200 opacity-60"
            }`;
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-800">
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

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <img src={textLogo} alt="AlchemIA" className="h-6" />
              <DialogTitle>
                {authMode === "sign-in" ? "Sign in" : "Create your account"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {authMode === "sign-in"
                  ? "Welcome back! Please sign in to continue."
                  : "Welcome! Please fill in the details to get started."}
              </DialogDescription>
            </div>
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
            {authMode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-blue-600"
              onClick={() =>
                setAuthMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))
              }
            >
              {authMode === "sign-in" ? "Register" : "Sign in"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

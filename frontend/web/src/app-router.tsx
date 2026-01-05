import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./layouts/main-layout";
import { GlossaryPage } from "./pages/glossary";
import { HomePage } from "./pages/home";
import { ProjectsPage } from "./pages/projects";
import { WizardPage } from "./pages/wizard";

const queryClient = new QueryClient();

export function AppRouter() {
  useEffect(() => {
    const resizeTextarea = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflow = "hidden";
    };

    const handleInput = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) {
        resizeTextarea(event.target);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement) &&
        (event.key === " " || event.code === "Space")
      ) {
        event.stopPropagation();
      }
    };

    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleInput);
    document.addEventListener("keydown", handleKeyDown, true);
    document.querySelectorAll("textarea").forEach((textarea) => {
      resizeTextarea(textarea as HTMLTextAreaElement);
    });

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        document.querySelectorAll("textarea").forEach((textarea) => {
          resizeTextarea(textarea as HTMLTextAreaElement);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "value"]
    });

    return () => {
      document.removeEventListener("input", handleInput);
      document.removeEventListener("change", handleInput);
      document.removeEventListener("keydown", handleKeyDown, true);
      observer.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="glossary" element={<GlossaryPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="wizard" element={<WizardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

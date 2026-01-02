import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./layouts/main-layout";
import { GlossaryPage } from "./pages/glossary";
import { HomePage } from "./pages/home";
import { ProjectsPage } from "./pages/projects";
import { WizardPage } from "./pages/wizard";

const queryClient = new QueryClient();

export function AppRouter() {
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

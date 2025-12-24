import { Link, Outlet } from "react-router-dom";
import appIcon from "../assets/ai-product-wizard-app.png";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="w-full px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-3 text-2xl font-semibold"
            data-testid="nav-home"
          >
            <img src={appIcon} alt="AI Product Wizard" className="h-12 w-12" />
            AI Product Wizard
          </Link>

          <Link to="/wizard" className="text-sm text-blue-600 hover:underline" data-testid="nav-wizard">
            Wizard
          </Link>

          <Link to="/projects" className="text-sm text-blue-600 hover:underline" data-testid="nav-projects">
            Projects
          </Link>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

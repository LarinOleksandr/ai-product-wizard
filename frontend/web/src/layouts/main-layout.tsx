import { Link, Outlet, useLocation } from "react-router-dom";
import appIcon from "../assets/alchemia-small-text-logo.png";

export function MainLayout() {
  const location = useLocation();
  const showLogo = location.pathname.startsWith("/wizard");

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="mx-6 mt-4 px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            {showLogo && (
              <Link
                to="/"
                className="flex items-center gap-3 text-2xl font-semibold"
                data-testid="nav-home"
              >
                <img src={appIcon} alt="AlchemIA" className="h-5" />
              </Link>
            )}

            <Link
              to="/wizard"
              className="text-sm text-blue-600 hover:underline"
              data-testid="nav-wizard"
            >
              Wizard
            </Link>

            <Link
              to="/projects"
              className="text-sm text-blue-600 hover:underline"
              data-testid="nav-projects"
            >
              Projects
            </Link>

            <Link
              to="/glossary"
              className="text-sm text-blue-600 hover:underline"
              data-testid="nav-glossary"
            >
              Glossary
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wizard?auth=sign-in"
              className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Sign In
            </Link>
            <Link
              to="/wizard?auth=sign-up"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

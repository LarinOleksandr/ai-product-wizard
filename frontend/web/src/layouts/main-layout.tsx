import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import appIcon from "../assets/alchemia-small-text-logo.png";
import { supabase } from "../lib/supabase";
import { getSession, signOut } from "../lib/projects-store";

export function MainLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSession()
      .then((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      })
      .catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  const userEmail = session?.user?.email ?? "";
  const rawName =
    (session?.user?.user_metadata as { full_name?: string; name?: string } | null)
      ?.full_name ||
    (session?.user?.user_metadata as { name?: string } | null)?.name ||
    "";
  const displayName = rawName || (userEmail ? userEmail.split("@")[0] : "User");
  const userInitial = displayName ? displayName[0].toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="mt-4 px-4 py-3">
        <div className="mx-auto flex w-full items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center" data-testid="nav-home">
              <img src={appIcon} alt="AlchemIA" className="h-5" />
            </Link>

            {session && (
              <Link
                to="/projects"
                className="text-sm text-blue-600 hover:underline"
                data-testid="nav-projects"
              >
                Projects
              </Link>
            )}

            <Link
              to="/glossary"
              className="text-sm text-blue-600 hover:underline"
              data-testid="nav-glossary"
            >
              Glossary
            </Link>
            <Link
              to="/about"
              className="text-sm text-blue-600 hover:underline"
              data-testid="nav-about"
            >
              About
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {session ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-700 bg-blue-600 text-xs font-semibold text-white"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  {userInitial}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-700 bg-blue-600 text-xs font-semibold text-white">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {displayName}
                        </p>
                        {userEmail && (
                          <p className="truncate text-xs text-gray-500">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-t">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-6 pb-6">
        <Outlet />
      </main>
    </div>
  );
}

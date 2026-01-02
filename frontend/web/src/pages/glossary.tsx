import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";

type GlossaryDomain = {
  id: string;
  name: string;
  description: string;
};

type GlossaryTerm = {
  id: string;
  name: string;
  domain_id: string;
  definition: string;
  description: string;
  relates_to: string[];
  produces: "artifact" | "decision" | "structure" | "constraint";
};

type GlossaryPayload = {
  domains: GlossaryDomain[];
  terms: GlossaryTerm[];
  sources: string[];
};

export function GlossaryPage() {
  const [data, setData] = useState<GlossaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch("/api/glossary")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load glossary.");
        }
        if (active) {
          setData(payload.glossary);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load glossary.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const domains = useMemo(() => {
    const list = data?.domains ?? [];
    return list.slice().sort((a, b) => {
      const aNum = Number(a.id.replace(/[^\d]/g, "")) || 0;
      const bNum = Number(b.id.replace(/[^\d]/g, "")) || 0;
      return aNum - bNum;
    });
  }, [data?.domains]);
  const terms = data?.terms ?? [];

  const termById = useMemo(() => {
    const map = new Map<string, GlossaryTerm>();
    terms.forEach((term) => map.set(term.id, term));
    return map;
  }, [terms]);

  const filteredTerms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return terms.filter((term) => {
      const matchesDomain =
        selectedDomain === "all" || term.domain_id === selectedDomain;
      if (!matchesDomain) return false;
      if (!query) return true;
      return (
        term.name.toLowerCase().includes(query) ||
        term.definition.toLowerCase().includes(query) ||
        term.description.toLowerCase().includes(query) ||
        term.id.toLowerCase().includes(query)
      );
    });
  }, [terms, search, selectedDomain]);

  const termsByDomain = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    filteredTerms.forEach((term) => {
      if (!map.has(term.domain_id)) {
        map.set(term.domain_id, []);
      }
      map.get(term.domain_id)?.push(term);
    });
    return map;
  }, [filteredTerms]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Glossary</h1>
      </div>

      <div className="flex flex-col gap-3">
        <input
          className="min-w-[240px] flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
          placeholder="Search terms"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
          value={selectedDomain}
          onChange={(event) => setSelectedDomain(event.target.value)}
        >
          <option value="all">All domains</option>
          {domains.map((domain, index) => (
            <option key={domain.id} value={domain.id}>
              {index + 1}. {domain.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading glossary...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLoading && !error && filteredTerms.length === 0 && (
        <p className="text-sm text-gray-500">No matching terms.</p>
      )}

      {domains.map((domain) => {
        const domainTerms = termsByDomain.get(domain.id) || [];
        if (domainTerms.length === 0) {
          return null;
        }
        return (
          <section key={domain.id} className="space-y-3">
            <div className="px-4 py-1">
              <h2 className="text-lg font-semibold text-gray-800">
                {domains.findIndex((item) => item.id === domain.id) + 1}.{" "}
                {domain.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{domain.description}</p>
            </div>
            <div className="space-y-3">
              {domainTerms.map((term) => (
                <div
                  key={term.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    {term.name}
                  </h3>
                  <p className="mt-2 text-base text-gray-700">{term.definition}</p>
                  <p className="mt-2 text-base text-gray-600">{term.description}</p>
                  {term.relates_to?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {term.relates_to.map((relatedId) => {
                        const related = termById.get(relatedId);
                        const label = related?.name || relatedId;
                        return (
                          <button
                            key={relatedId}
                            type="button"
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                            onClick={() => related && setActiveTerm(related)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <Dialog open={Boolean(activeTerm)} onOpenChange={() => setActiveTerm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeTerm?.name}</DialogTitle>
            <DialogDescription>{activeTerm?.definition}</DialogDescription>
          </DialogHeader>
          {activeTerm && (
            <div className="space-y-3 text-sm text-gray-700">
              <p>{activeTerm.description}</p>
              {activeTerm.relates_to?.length > 0 && (
                <p className="text-xs text-gray-500">
                  Related terms:{" "}
                  {activeTerm.relates_to
                    .map((id) => termById.get(id)?.name || id)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

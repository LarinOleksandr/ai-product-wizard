export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-gray-900">About</h1>
      <p className="text-base text-gray-700">
        AlchemIA helps you turn a product idea into a structured, high-quality
        discovery document through guided, section-by-section generation.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">What it does</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Guides you through core discovery sections with clear prompts.</li>
          <li>Generates consistent, structured outputs you can review.</li>
          <li>Lets you export and save work when you are ready.</li>
        </ul>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Why it matters</h2>
        <p className="mt-2 text-sm text-gray-600">
          It keeps early product thinking focused, traceable, and aligned before
          you invest in delivery.
        </p>
      </div>
    </div>
  );
}

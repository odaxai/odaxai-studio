'use client';

export default function IDEPage(): JSX.Element {
  return (
    <div className="w-full h-full bg-[#1e1e1e] overflow-hidden relative">
        {/* VS Code iframe */}
        <iframe
            src="http://localhost:8080/"
            className="w-full h-full border-0"
            title="VS Code IDE"
            allow="clipboard-read; clipboard-write"
        />
    </div>
  );
}
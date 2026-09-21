import { useState } from "react";
import { Button, Input, SearchResultRow, SearchShell } from "@threadlabs/looma/react";

const results = [
  ["Design tokens", "Color, type, spacing, and motion."],
  ["Token overrides", "Customize shared and component tokens."],
  ["Button variants", "Choose solid, outline, ghost, or danger."]
];

export function Example() {
  const [query, setQuery] = useState("");
  const filtered = results.filter((result) =>
    result.join(" ").toLowerCase().includes(query.toLowerCase())
  );
  return (
    <SearchShell open dismissible label="Search documentation">
      <Input slot="search" type="search" aria-label="Search documentation"
        value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
      <div slot="status" aria-live="polite">{filtered.length} results</div>
      <div slot="body">
        {filtered.map(([title, excerpt]) => (
          <SearchResultRow key={title}>
            <strong slot="title">{title}</strong><span slot="excerpt">{excerpt}</span>
          </SearchResultRow>
        ))}
        {filtered.length === 0 ? <p>No matching documentation.</p> : null}
      </div>
      <form slot="footer" method="dialog"><Button type="submit" size="sm">Close</Button></form>
    </SearchShell>
  );
}

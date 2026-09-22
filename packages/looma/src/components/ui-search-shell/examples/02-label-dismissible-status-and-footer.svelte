<script lang="ts">
  import "@threadlabs/looma";
  let query = "";
  const results = [
    ["Design tokens", "Color, type, spacing, and motion."],
    ["Token overrides", "Customize shared and component tokens."],
    ["Button variants", "Choose solid, outline, ghost, or danger."]
  ];
  $: filtered = results.filter((result) =>
    result.join(" ").toLowerCase().includes(query.toLowerCase())
  );
</script>

<ui-search-shell open dismissible label="Search documentation">
  <ui-input slot="search" type="search" aria-label="Search documentation"
    value={query} oninput={(event) => query = event.currentTarget.value}></ui-input>
  <div slot="status" aria-live="polite">{filtered.length} results</div>
  <div slot="body">
    {#each filtered as result (result[0])}
      <ui-search-result-row>
        <strong slot="title">{result[0]}</strong><span slot="excerpt">{result[1]}</span>
      </ui-search-result-row>
    {/each}
    {#if filtered.length === 0}<p>No matching documentation.</p>{/if}
  </div>
  <form slot="footer" method="dialog"><ui-button type="submit" size="sm">Close</ui-button></form>
</ui-search-shell>

---
title: Blocks
description: Compose Looma components into complete screens and adapt them as workflows grow.
---

# Blocks

- [Write or edit a document](#editor-workspace)
- [Browse records and read a selection](#list-and-detail)
- [Review and save preferences](#settings-form)
- [Find and open an item without leaving the workspace](#search-and-open)

Each preview shows a complete HTML Next composition. Open **View HTML and JavaScript** below it or copy both files from `@threadlabs/looma/blocks/`. In the repository, the files live in `packages/looma/src/blocks/`.

Keep the component links when copying into an [HTML Next page](/getting-started/#html-next-pages). After the host lowers the markup to native elements, call the companion setup once with the element marked `data-block`. Run the returned cleanup before removing that instance. Give each copy its own IDs if you use an example more than once on a page.

## Editor workspace

Use this layout when writing or editing is the primary task and readers need to jump between sections. Try editing the draft, opening Details, and toggling the Outline.

<!-- looma:block editor-workspace -->

### Start with one pane

Place the document in Container at its default reading measure. Use Stack for the title, editor, and supporting content. Let the page scroll. Keep text formatting in the editor toolbar. Group peer controls like Outline and Details in a Cluster. When the workflow has a primary action such as Publish, use Action Bar to give it a predictable place alongside secondary actions.

### Add navigation when the document needs it

Dock Sidebar beside the document in a nonwrapping Cluster. Keep the toggle in the action row, where it stays reachable in both modes. In this example Sidebar is a drawer below 64rem. With scripting disabled, the outline links stay in the page and Sidebar reserves most of the row for the document. Choose the breakpoint by testing the longest navigation label alongside the editor at its minimum usable width. In embedded layouts, check the available parent width too.

On a narrow screen, following an outline link closes the drawer and focuses the destination heading. The link itself still handles fragment navigation and scrolling.

### Add details as the workflow grows

Use an on-demand dialog for reference information people check occasionally. Give it a named trigger and verify that Escape returns focus to that trigger. If users need to edit while reading the details, use an end-side Sidebar on wide layouts and a drawer at smaller widths. Keep the editor central and verify its reading measure with both panes open.

If the application needs fixed chrome, bound the shell and give the document a single Scroll Area with a name and keyboard access. Sidebar already scrolls its own panel. Test a document longer than the viewport and confirm that the document, outline, and toolbar each behave as intended.

### Review the result

- At desktop and 375px widths, the draft should remain the first thing readers notice. Test long titles, a long outline, and a populated inspector.
- Open and close both secondary surfaces using the keyboard. Check focus, Escape, and the return path to writing.
- Resize while a surface is open. Check that document actions remain reachable and that the page has no horizontal overflow.
- Verify that a second action, second panel, or second scrolling region supports an actual task before adding it.

### Customize interaction behavior

Use the standard components for common interactions. The [Behaviors guide](/behaviors/) explains how to compose navigation, focus, and selection for a custom picker.

## List and detail

Use this when people repeatedly choose an item and read its details. Filter the reports, open a result, and expand Source notes. The summary stays visible above the optional material.

<!-- looma:block list-detail -->

Use Switcher when both regions can stack in reading order. Its threshold follows the space available to the block, including an embedded panel. On phones, the selected heading receives focus so the reader can reach the detail below the list. Keep the selected item's identity in the URL when it needs to survive navigation or be shared.

Put the list in Switcher's `start` slot and the detail in its `end` slot. Set `balance="narrow-start"` when the list needs less room, as in this preview. Use `balance="narrow-end"` for a compact inspector after the main content. Use Sidebar when it makes sense to move the rail into a drawer. Test the longest row at the smallest width that fits both panes.

Keep the search label above the field and use one status message for results. Filtering changes the list while the open report stays available. If no reports match, show Clear filter alongside the empty result and return focus to the field when it clears. Use Nav Item to mark the open report whenever it appears in the list and Disclosure for optional material such as source notes.

If the detail becomes a full editing workflow, give it a route and preserve the list filters and scroll position on return. Check long names, empty results, a deleted selection, and back navigation.

Use a single active pane when readers spend time editing or need their full attention on the detail. Let the application commit which pane is active. Resizing can change which panes fit while keeping the selection, draft, and history intact. For an app with native presenters, keep this decision in the shared app state so the web and native views can render the same committed choice. Check that a rejected Back request leaves the detail and draft in place.

## Settings form

Use a settings form for preferences that people can edit together and save in one action. This preview demonstrates validation, submission feedback, and restoring authored defaults.

<!-- looma:block settings-form -->

Start with a readable single column and a visible label for every field. Set required on Form Field when it wraps the input so it can apply native validation to the control. Give each section a clear topic when the form grows. Group fields in one row only when people benefit from reading them together. Use Action Bar when one action commits the edits and secondary actions need a lower emphasis.

If sections grow into independent tasks, make them separate destinations and give each its own save boundary. In the real workflow, keep entered values on failure, connect errors to their fields, and report success after the application confirms the save. Check empty required fields, long labels, and keyboard submission at narrow widths.

## Search and open

Use a Search Shell when people need to make one quick choice and return to the workspace. Give the search field a visible starting point, announce the results, and use Search Result Row for each action. Arrow keys reach eligible results, Enter opens the focused result, and Escape returns to the trigger. Opening a guide moves focus to its heading.

<!-- looma:block search-and-open -->

For a short list, filter in place and let the search status announce when there are no results. With a remote index, keep the query editable while results load and discard responses for superseded queries. Move search into a dedicated page when people need persistent filters, comparison, or their place in a long result list. Keep a clear focus destination for both cancel and selection.

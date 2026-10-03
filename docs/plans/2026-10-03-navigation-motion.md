# Navigation geometry and motion

Navigation destinations and disclosure headers share density-based row geometry: icon column, label gap, padding, hit area, hover surface, and corners. A navigation presentation for Disclosure is additive; ordinary disclosure styling remains available. A leading slot removes the need to recreate icon/label rows in summary content.

Disclosure adds opt-in `requiredOpen` for named exclusive groups. At least one registered item stays open; initially empty groups choose an item after registration, and opening a peer may close the former item. Ordinary groups retain optional collapse. Independent group names do not affect each other, and group membership is cleaned up on removal.

Feedback, reveal, and layout motion tokens derive from the existing motion seed. Indicators stay mounted and rotate; disclosure grids animate 0fr/1fr in both content-sized and bounded fill layouts. Bounded fill preserves reachable headers and scrolling bodies. Docked Sidebar animates occupied width with its content, supports a themed collapsed rail width, and does not animate pointer resizing. Reduced motion removes spatial transitions; interruption settles at the latest state.

Qualification covers HTML/Vue parity, default behavior, required group state, cleanup/isolation, intermediate animation frames, rapid reversal, reduced motion, browser find reveal, bounded scrolling, docked/drawer layout, and density geometry across component families. Public examples remain application-neutral.

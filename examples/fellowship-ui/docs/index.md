---
title: Fellowship UI
---

# A little more room to do good work.

Fellowship UI brings forest greens, warm paper, and editorial headings to a shared set of components.

<link rel="component" href="../components/fellowship-project/fellowship-project.html">
<link rel="component" href="@threadlabs/looma/components/ui-stack/ui-stack.html">
<link rel="component" href="@threadlabs/looma/components/ui-grid/ui-grid.html">
<link rel="component" href="@threadlabs/looma/components/ui-cluster/ui-cluster.html">
<link rel="component" href="@threadlabs/looma/components/ui-button/ui-button.html">
<link rel="component" href="@threadlabs/looma/components/ui-text/ui-text.html">
<link rel="component" href="@threadlabs/looma/components/ui-card/ui-card.html">

<ui-stack gap="xl">
  <ui-cluster gap="s">
    <ui-button href="/components/" preset="primary">Explore components</ui-button>
    <ui-button href="/customize/" variant="outline">Shape the theme</ui-button>
  </ui-cluster>
  <ui-card tone="accent" padding="lg">
    <ui-stack gap="s">
      <ui-text variant="eyebrow" tone="accent">Built for the team</ui-text>
      <ui-text variant="heading" as="h2">One identity, shared everywhere.</ui-text>
      <ui-text>Our own project card sits beside Looma's controls. Both use the same theme, in light and dark.</ui-text>
    </ui-stack>
  </ui-card>
  <ui-grid columns="2" min="sm">
    <fellowship-project name="The field guide" status="In review" owner="Sam">Practical notes for the next person joining the team.</fellowship-project>
    <fellowship-project name="A place to gather" status="In progress" owner="Alex">A welcoming home for decisions, ideas, and the work ahead.</fellowship-project>
  </ui-grid>
</ui-stack>

## Made from a small set of decisions

Warm canvas. Forest actions. Serif headings. Soft corners. The same recipe shapes every control and every project card.

[Browse the project card](/components/fellowship-project/) · [Create your design system](/design-system/)

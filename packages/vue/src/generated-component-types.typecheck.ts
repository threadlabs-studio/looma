import { h } from 'vue';
import { Checkbox, Dialog, Tree } from './index';

h(Dialog, {
  open: false,
  defaultOpen: true,
  onClose: (detail) => detail.reason,
});

h(Checkbox, {
  checked: false,
  onChange: (detail) => detail.checked,
});

h(Tree, {
  onReorderRejected: (detail) => detail.maxDepth,
});

// @ts-expect-error Dialog open state is boolean, not an HTML string attribute.
h(Dialog, { open: 'false' });

// @ts-expect-error Checkbox change details do not expose a selected tab value.
h(Checkbox, { onChange: (detail) => detail.selectedValue });

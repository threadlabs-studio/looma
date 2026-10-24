import { createApp, h, ref } from 'vue';
import { LoomaEditor } from '@threadlabs/looma/vue/editor';
import '@threadlabs/looma/vue.css';

/** The same published editor used by applications; HTMLKit owns this demo's lifecycle. */
export function connect(host) {
  const content = ref({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'The Fellowship office' }] },
    ...[
      'Frodo is drafting the quarterly journey report. Sam has already booked second breakfast, and Sméagol would like the conference room all to himself.',
      'Select a few words to format them. Type / to add a block, or @ to mention Frodo, Sam or Sméagol.',
      'Gandalf has requested a table for the next planning meeting. Aragorn is still waiting for everyone to accept the calendar invitation.',
      'Try a list, quote, callout, code block or table. Your changes stay here while you switch toolbar modes.',
      'The office policy on precious objects is under review. Please contact Sam with questions about lunch.'
    ].map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] }))
  ] });
  const mode = ref('sticky');
  const app = createApp({ render: () => h(LoomaEditor, {
    modelValue: content.value, label: 'Editor guide playground', toolbarMode: mode.value,
    mentionItems: [{ id: 'frodo', label: 'Frodo Baggins', detail: 'Delivery', initials: 'FB' }, { id: 'sam', label: 'Samwise Gamgee', detail: 'Operations', initials: 'SG' }, { id: 'smeagol', label: 'Sméagol', detail: 'Asset management', initials: 'S' }],
    'onUpdate:modelValue': value => { content.value = value; }
  }) });
  const change = event => { mode.value = event.target.value; };
  try { app.mount(host.refs.editor); }
  catch (error) { host.refs.message.textContent = 'The editor demo could not load.'; host.refs.message.setAttribute('role', 'alert'); throw error; }
  host.refs.mode.addEventListener('change', change);
  return () => { host.refs.mode.removeEventListener('change', change); app.unmount(); };
}

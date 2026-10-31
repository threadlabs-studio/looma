/** The guide composes the native HTML Next editor and retains its controlled document. */
export function connect(host) {
  host.state.content = { type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'The Fellowship office' }] },
    ...[
      'Frodo is drafting the quarterly journey report. Sam has already booked second breakfast, and Sméagol would like the conference room all to himself.',
      'Select a few words to format them. Type / to add a block, or @ to mention Frodo, Sam or Sméagol.',
      'Gandalf has requested a table for the next planning meeting. Aragorn is still waiting for everyone to accept the calendar invitation.',
      'Try a list, quote, callout, code block or table. Your changes stay here while you switch toolbar modes.',
      'The office policy on precious objects is under review. Please contact Sam with questions about lunch.'
    ].map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] }))
  ] };
  return host.on("change", event => {
    if (event.target === host.refs.mode) host.state.mode = event.target.value;
    else if (event.target === host.refs.editor && event.detail?.content) host.state.content = event.detail.content;
  });
}

let descriptions = 0;

// A choice's description (Radio, Checkbox, Switch) sits inside its label, so a press on it still
// chooses. It is hidden from the label and named as the input's description instead, so a screen
// reader says "Private, radio button, Only the people you add can open it" rather than one long name.
export function describeInput(input, description) {
  description.id ||= `ui-description-${++descriptions}`;
  input.setAttribute("aria-describedby", description.id);
}

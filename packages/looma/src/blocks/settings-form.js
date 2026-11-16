export default function setup(root) {
  const form = root;
  const message = form.querySelector("[data-message]");
  const submit = (event) => {
    event.preventDefault();
    const values = new FormData(form);
    message.textContent = `Preview updated for ${values.get("displayName")}.`;
  };
  const reset = () => { message.textContent = ""; };
  form.addEventListener("submit", submit);
  form.addEventListener("reset", reset);
  return () => {
    form.removeEventListener("submit", submit);
    form.removeEventListener("reset", reset);
  };
}

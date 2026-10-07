/** Shows a hidden authored toast when the example's button is pressed; the toast hides itself when dismissed. */
export function showToastOnClick(buttonId: string, toastId: string): (root: HTMLElement) => () => void {
  return (root) => {
    const button = root.querySelector<HTMLElement>(`#${buttonId}`);
    const toast = root.querySelector<HTMLElement>(`#${toastId}`);
    if (!button || !toast) return () => {};
    const show = () => {
      toast.hidden = false;
    };
    button.addEventListener("click", show);
    return () => button.removeEventListener("click", show);
  };
}

export default showToastOnClick("show-saved-toast", "saved-toast");

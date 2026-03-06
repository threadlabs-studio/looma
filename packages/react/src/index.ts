import "@ui/layout";
import "@ui/core";
import {
  createElement,
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
  type RefCallback
} from "react";

export interface AdapterEventMap {
  open: { open: boolean; reason: string; trigger: string };
  close: { open: boolean; reason: string; trigger: string };
  select: { value: string; previousValue?: string; trigger: string };
}

type AdapterCallbacks = {
  onOpen?: (detail: AdapterEventMap["open"]) => void;
  onClose?: (detail: AdapterEventMap["close"]) => void;
  onSelect?: (detail: AdapterEventMap["select"]) => void;
};

export type AdapterProps = Omit<HTMLAttributes<HTMLElement>, "children" | "onClose" | "onSelect"> &
  AdapterCallbacks & {
    children?: ReactNode;
  };

type AdapterComponent = ReturnType<typeof forwardRef<HTMLElement, AdapterProps>>;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  (ref as MutableRefObject<T | null>).current = value;
}

function createAdapterComponent(tagName: string, displayName: string): AdapterComponent {
  const Component = forwardRef<HTMLElement, AdapterProps>(
    ({ children, onOpen, onClose, onSelect, ...rest }, forwardedRef) => {
      const elementRef = useRef<HTMLElement | null>(null);

      const refCallback: RefCallback<HTMLElement> = (node) => {
        elementRef.current = node;
        assignRef(forwardedRef, node);
      };

      useEffect(() => {
        const element = elementRef.current;
        if (!element) {
          return;
        }

        const handlers: Array<[string, ((event: Event) => void) | undefined]> = [
          ["open", onOpen ? (event) => onOpen((event as CustomEvent<AdapterEventMap["open"]>).detail) : undefined],
          [
            "close",
            onClose ? (event) => onClose((event as CustomEvent<AdapterEventMap["close"]>).detail) : undefined
          ],
          [
            "select",
            onSelect
              ? (event) => onSelect((event as CustomEvent<AdapterEventMap["select"]>).detail)
              : undefined
          ]
        ];

        for (const [eventName, handler] of handlers) {
          if (handler) {
            element.addEventListener(eventName, handler);
          }
        }

        return () => {
          for (const [eventName, handler] of handlers) {
            if (handler) {
              element.removeEventListener(eventName, handler);
            }
          }
        };
      }, [onOpen, onClose, onSelect]);

      return createElement(tagName, { ...rest, ref: refCallback }, children);
    }
  );

  Component.displayName = displayName;
  return Component;
}

export const Stack = createAdapterComponent("ui-stack", "Stack");
export const Inline = createAdapterComponent("ui-inline", "Inline");
export const Cluster = createAdapterComponent("ui-cluster", "Cluster");
export const Grid = createAdapterComponent("ui-grid", "Grid");
export const Center = createAdapterComponent("ui-center", "Center");
export const Separator = createAdapterComponent("ui-separator", "Separator");

export const Disclosure = createAdapterComponent("ui-disclosure", "Disclosure");
export const Tabs = createAdapterComponent("ui-tabs", "Tabs");
export const Dialog = createAdapterComponent("ui-dialog", "Dialog");
export const Popover = createAdapterComponent("ui-popover", "Popover");
export const Menu = createAdapterComponent("ui-menu", "Menu");
export const MenuItem = createAdapterComponent("ui-menu-item", "MenuItem");
export const Button = createAdapterComponent("ui-button", "Button");
export const Input = createAdapterComponent("ui-input", "Input");
export const FormField = createAdapterComponent("ui-form-field", "FormField");

export const ADAPTER_COMPONENT_TAG_MAP = {
  Stack: "ui-stack",
  Inline: "ui-inline",
  Cluster: "ui-cluster",
  Grid: "ui-grid",
  Center: "ui-center",
  Separator: "ui-separator",
  Disclosure: "ui-disclosure",
  Tabs: "ui-tabs",
  Dialog: "ui-dialog",
  Popover: "ui-popover",
  Menu: "ui-menu",
  MenuItem: "ui-menu-item",
  Button: "ui-button",
  Input: "ui-input",
  FormField: "ui-form-field"
} as const;

export type ReactAdapterNote =
  "Thin adapter only: props/children pass through to custom elements and DOM events map to typed callbacks.";

export const REACT_ADAPTER_NOTE: ReactAdapterNote =
  "Thin adapter only: props/children pass through to custom elements and DOM events map to typed callbacks.";

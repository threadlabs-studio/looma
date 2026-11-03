import { APP_ID, Directive, ElementRef, ErrorHandler, Input, Renderer2, Injector, ViewContainerRef, inject, provideZonelessChangeDetection, signal, type ApplicationRef, type EmbeddedViewRef, type Type } from "@angular/core";
import { createApplication, provideClientHydration } from "@angular/platform-browser";
import { component, componentProps, connectNode } from "./component";
import type { MountedScene, Scene, SceneNode, SceneSlots, SceneValue } from "./scene";
import { InjectionToken } from "@angular/core";
import { renderAngularHTML } from "@looma-test/angular-server";

export const SCENE = new InjectionToken<ReturnType<typeof signal<SceneValue>>>("Looma test scene");
const booleanAttributes = new Set("disabled required hidden inert multiple autofocus readonly open controls loop muted autoplay allowfullscreen formnovalidate novalidate reversed ismap nomodule".split(" "));
const pending = new Set<Promise<ApplicationRef>>();
const applications = new Set<ApplicationRef>();

export function isNode(value: unknown): value is SceneNode { return value !== null && typeof value === "object" && "type" in value && "props" in value; }
export function nodeTag(value: SceneNode): string {
  if (typeof value.type === "string") return value.type;
  if (component(value.type)) return component(value.type)!.tag;
  if (value.type && typeof value.type === "object" && "kind" in value.type && value.type.kind === "native-scene") return "native-scene";
  throw new Error("Unknown scene node.");
}
export const nodeKey = (value: SceneValue, index: number): unknown => value && typeof value === "object" && !Array.isArray(value) ? (value as SceneNode).props?.key ?? index : index;
export function slotValue(node: SceneNode, name: string, props?: any): SceneValue {
  const source = node.children;
  if (typeof source === "function") return name === "" ? source(props) : undefined;
  if (source && typeof source === "object" && !Array.isArray(source) && !("type" in source)) return (source as SceneSlots)[name || "default"]?.(props);
  return name === "" ? source as SceneValue : undefined;
}
const hasContent = (value: SceneValue): boolean => Array.isArray(value) ? value.some(hasContent) : value !== undefined && value !== null && typeof value !== "boolean";
export function slotMask(node: SceneNode): number {
  return component(node.type)!.slots.reduce((mask, slot, index) => {
    const present = slot.props.length > 0
      ? !!node.children && typeof node.children === "object" && (slot.name || "default") in node.children
      : hasContent(slotValue(node, slot.name));
    return present ? mask | (1 << index) : mask;
  }, 0);
}
export function projected(node: SceneNode, name: string, props?: any): SceneValue {
  const value = slotValue(node, name, props);
  if (!name) return value;
  const stamp = (value: SceneValue): SceneValue => Array.isArray(value) ? value.map(stamp) : value && typeof value === "object" ? { ...(value as SceneNode), props: { ...(value as SceneNode).props, slot: name } } : value;
  return stamp(value);
}
export function nativeAttributes(node: SceneNode): Record<string, any> {
  const type = component(node.type);
  return Object.fromEntries(Object.entries(componentProps(node)).filter(([name]) => !type?.props.includes(name) && name !== "key"));
}

/** Fixture attributes and event observation use the native element Angular rendered. */
@Directive({ selector: "[loomaNode]", standalone: true })
export class SceneNodeDirective {
  @Input("loomaNode") node!: SceneNode;
  private readonly element = inject<ElementRef<Node>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly injector = inject(Injector);
  private readonly connection = connectNode(() => this.node);
  private root: Element | undefined;
  private previous: Record<string, any> = {};
  private baseClasses = new Set<string>();
  ngAfterViewChecked(): void {
    const type = component(this.node.type);
    const views = type?.nativeHost === "ng-template" ? this.injector.get(ViewContainerRef) : undefined;
    const candidate = views ? Array.from({ length: views.length }, (_, index) => (views.get(index) as EmbeddedViewRef<unknown>).rootNodes as Node[]).flat().find(node => node.nodeType === 1 && (node as Element).matches(`[${type!.tag}]`)) : this.element;
    const root = candidate?.nodeType === 1 && (!type || (candidate as Element).matches(`[${type.tag}]`)) ? candidate as Element : undefined;
    if (root !== this.root) {
      this.root = root; this.previous = {}; this.baseClasses = new Set(root?.getAttribute("class")?.split(/\s+/).filter(Boolean));
      this.connection.attach(root);
    }
    if (!root) return;
    // Structural components forward attributes through their public hnAttributes input.
    if (type?.nativeHost !== "ng-template") {
      const next = nativeAttributes(this.node);
      for (const name of new Set([...Object.keys(this.previous), ...Object.keys(next)])) {
        const value = next[name];
        if (Object.is(value, this.previous[name])) continue;
        if (name === "class") {
          for (const token of String(this.previous[name] ?? "").split(/\s+/).filter(Boolean)) if (!this.baseClasses.has(token)) this.renderer.removeClass(root, token);
          for (const token of String(value ?? "").split(/\s+/).filter(Boolean)) this.renderer.addClass(root, token);
        } else if (name === "style") {
          if (value === undefined || value === null) this.renderer.removeAttribute(root, name);
          else if (typeof value === "string") this.renderer.setAttribute(root, name, value);
          else for (const [key, item] of Object.entries(value)) this.renderer.setStyle(root, key, item, key.startsWith("--") ? 2 : undefined);
        } else if (["value", "checked", "indeterminate", "selected"].includes(name)) {
          this.renderer.setProperty(root, name, value);
          if (value === null || value === undefined || value === false) this.renderer.removeAttribute(root, name);
          else this.renderer.setAttribute(root, name, value === true ? "" : String(value));
        } else if (value === null || value === undefined || value === false && booleanAttributes.has(name.toLowerCase())) this.renderer.removeAttribute(root, name);
        else this.renderer.setAttribute(root, name, value === true && booleanAttributes.has(name.toLowerCase()) ? "" : String(value));
      }
      this.previous = next;
    }
    this.connection.update();
  }
  ngOnDestroy(): void { this.connection.destroy(); }
}

@Directive({ selector: "[loomaFixture]", standalone: true })
export class NativeFixtureDirective {
  @Input("loomaFixture") node!: SceneNode;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private view: MountedScene | undefined;
  ngAfterViewInit(): void { this.view = (this.node.type as import("./scene").NativeSceneComponent).mount(this.element, () => this.node.props); }
  ngAfterViewChecked(): void { this.view?.update(); }
  ngOnDestroy(): void { this.view?.unmount(); }
}

export function createRenderer(root: Type<unknown>) {
  return {
    mount(scene: Scene, target: Element, hydrate: boolean): MountedScene {
      if (hydrate) for (const style of target.querySelectorAll('style[ng-app-id="looma-test"]')) target.ownerDocument.head.append(style);
      const value = signal(scene.render());
      const documentNodes = target.querySelector<HTMLTemplateElement>("template[data-looma-angular-document]");
      if (hydrate && documentNodes) {
        target.ownerDocument.body.append(documentNodes.content);
        documentNodes.remove();
      }
      const marker = target.querySelector("script[data-looma-angular-root]");
      if (hydrate && marker) {
        for (const [name, attribute] of Object.entries(JSON.parse(marker.textContent!))) target.setAttribute(name, String(attribute));
        marker.remove();
      }
      target.setAttribute("looma-scene-root", "");
      const application = createApplication({ providers: [
        provideZonelessChangeDetection(), { provide: SCENE, useValue: value }, { provide: APP_ID, useValue: "looma-test" },
        ...(hydrate ? [provideClientHydration()] : []),
        { provide: ErrorHandler, useValue: { handleError(error: unknown) { if (scene.onError) scene.onError(error); else queueMicrotask(() => { throw error; }); } } },
      ] }).then(app => { app.bootstrap(root, target); return app; });
      let running: ApplicationRef | undefined; void application.then(app => { running = app; });
      pending.add(application); void application.then(app => applications.add(app)); void application.finally(() => pending.delete(application));
      return { update() { value.set(scene.render()); running?.tick(); }, unmount() { void application.then(app => { applications.delete(app); app.destroy(); }); } };
    },
    renderHTML(scene: Scene): Promise<string> { return renderAngularHTML(root, scene, SCENE); },
    async settle(): Promise<void> {
      await Promise.all(pending);
      await Promise.all([...applications].map(app => app.whenStable()));
      await new Promise(resolve => setTimeout(resolve, 0));
    },
  };
}

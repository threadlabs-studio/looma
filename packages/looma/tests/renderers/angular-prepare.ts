import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(packageRoot, "package.json"));
const pascal = (name: string) => name.split("-").map(part => part[0]?.toUpperCase() + part.slice(1)).join("");

/** Angular compiles each fixture template independently, then shares those templates across scenes. */
export async function angularScene(directory: string, components: any[]) {
  const names = (component: any): string[] => [component.name, ...component.slots.filter((slot: any) => slot.props.length > 0).map((slot: any) => component.name + pascal(slot.name || "default") + "Slot")];
  const outlet = (expression: string, template = "render") => `<ng-container [ngTemplateOutlet]="${template}" [ngTemplateOutletContext]="{ $implicit: ${expression}, render: render }"></ng-container>`;
  const voids = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
  const helpers = 'readonly slotMask = slotMask; readonly slotValue = slotValue; readonly projected = projected; readonly nativeAttributes = nativeAttributes;';
  const holders = components.map(component => {
    const inputs = component.props.map((name: string) => `[${name}]="$any(value.props[${JSON.stringify(name).replaceAll('"', "'")}])"`).join(" ");
    const host = component.nativeHost;
    const variants = Array.from({ length: 2 ** component.slots.length }, (_, mask) => {
      const templates: string[] = [];
      const slots: string[] = [];
      const content = component.slots.flatMap((slot: any, index: number) => {
        if (!(mask & (1 << index))) return [];
        const name = JSON.stringify(slot.name).replaceAll('"', "'");
        const locals = slot.props.map((prop: string) => `let-${prop}="${prop}"`).join(" ");
        const context = slot.props.length ? `, { ${slot.props.map((prop: string) => `${prop}: ${prop}`).join(", ")} }` : "";
        const body = outlet(`projected(value, ${name}${context})`);
        if (host === "ng-template" && (slot.name || slot.props.length)) {
          const ref = `slot${index}`;
          templates.push(`<ng-template #${ref}${slot.props.length ? ` ${component.tag}-${slot.name || "default"}` : ""} ${locals}>${body}</ng-template>`);
          slots.push(`${name}: ${ref}`);
          return [];
        }
        if (slot.props.length) return `<ng-template ${component.tag}-${slot.name || "default"} ${locals}>${body}</ng-template>`;
        return `<ng-container${slot.name ? ` ngProjectAs="[slot='${slot.name}']"` : ""}>${body}</ng-container>`;
      }).join("");
      const element = `<${host} ${component.tag} [loomaNode]="value" ${inputs} ${host === "ng-template" ? `[hnAttributes]="nativeAttributes(value)" [slots]="{ ${slots.join(", ")} }"` : ""}>${content}${voids.has(host) ? "" : `</${host}>`}`;
      // Native autofocus candidates are registered on insertion, before lifecycle attributes.
      const rendered = host === "input" ? `@if (value.props['autofocus']) {${element.replace(`<${host} `, `<${host} autofocus `)}} @else {${element}}` : element;
      return `@case (${mask}) {${templates.join("")}${rendered}}`;

    });
    const template = `<ng-template #view let-value let-render="render">@switch (slotMask(value)) {${variants.join("")}}</ng-template>`;
    return `@Component({selector: "looma-view-${component.tag}", standalone: true, imports: [${component.slots.length ? "NgTemplateOutlet, " : ""}SceneNodeDirective, ${names(component).join(", ")}], template: ${JSON.stringify(template)}})
class ${component.name}Scene { readonly view = viewChild.required<TemplateRef<unknown>>("view"); ${helpers} }`;
  });
  const nativeTags = new Set<string>();
  const discover = async (directory: string) => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory() && item.name !== "renderers") await discover(file);
      else if (item.isFile() && item.name.endsWith(".ts")) for (const match of (await readFile(file, "utf8")).matchAll(/sceneNode\(\s*["']([a-z][a-z0-9:-]*)["']/g)) nativeTags.add(match[1]!);
    }
  };
  await discover(path.join(packageRoot, "tests"));
  const nativeCases = [...nativeTags].map(tag => `@case ('${tag}') {<${tag} [loomaNode]="value">${voids.has(tag) ? "" : outlet("slotValue(value, '')")}${voids.has(tag) ? "" : `</${tag}>`}}`);
  nativeCases.push(`@case ('native-scene') {<div [loomaFixture]="value"></div>}`);
  const template = `${outlet("value()")}<ng-template #render let-value>@if (isArray(value)) {@for (child of value; track nodeKey(child, $index)) {${outlet("child")}}} @else if (value !== null && value !== undefined && value !== true && value !== false) {@if (isNode(value)) {@if (templateFor(nodeTag(value)); as template) {${outlet("value", "template")}} @else {@switch (nodeTag(value)) {${nativeCases.join("")} @default {Unknown scene node}}}} @else {{{value}}}}</ng-template>`;
  const source = path.join(directory, "angular-scene.ts");
  const helper = "./" + path.relative(directory, fileURLToPath(new URL("./angular-scene.ts", import.meta.url))).replaceAll(path.sep, "/");
  await writeFile(source, `import { ApplicationRef, Component, EnvironmentInjector, Injector, PLATFORM_ID, PendingTasks, Renderer2, TemplateRef, TransferState, createComponent, inject, makeStateKey, viewChild, type ComponentRef, type Type } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { ${components.flatMap(names).join(", ")} } from "@threadlabs/looma";
import { SCENE, SceneNodeDirective, NativeFixtureDirective, createRenderer, isNode, nodeTag, nodeKey, slotMask, slotValue, projected, nativeAttributes } from ${JSON.stringify(helper)};
${holders.join("\n")}
@Component({selector: "[looma-scene-root]", standalone: true, imports: [NgTemplateOutlet, SceneNodeDirective, NativeFixtureDirective], template: ${JSON.stringify(template)}})
class LoomaScene {
 readonly value = inject(SCENE); readonly nodeTag = nodeTag; readonly nodeKey = nodeKey; ${helpers}
 readonly isArray = Array.isArray; readonly isNode = isNode;
 private readonly environmentInjector = inject(EnvironmentInjector); private readonly injector = inject(Injector);
 private readonly tasks = inject(PendingTasks); private orderQueued = false;
 private readonly application = inject(ApplicationRef); private readonly transfer = inject(TransferState);
 private readonly browser = inject(PLATFORM_ID) === "browser"; private readonly renderer = inject(Renderer2);
 private readonly definitions: Record<string, Type<{ view(): TemplateRef<unknown> }>> = { ${components.map(component => `${JSON.stringify(component.tag)}: ${component.name}Scene`).join(", ")} };
 private readonly holders = new Map<string, ComponentRef<{ view(): TemplateRef<unknown> }>>();
 templateFor(tag: string): TemplateRef<unknown> | undefined {
   const definition = this.definitions[tag]; if (!definition) return;
   let holder = this.holders.get(tag);
   if (!holder) {
     const key = makeStateKey<string>("looma.scene-template:" + tag);
     const saved = this.browser ? this.transfer.get(key, "") : "";
     let hostElement: Element | undefined;
     if (saved) {
       const template = this.renderer.createElement("template") as HTMLTemplateElement;
       this.renderer.setProperty(template, "innerHTML", saved); hostElement = template.content.firstElementChild ?? undefined; this.transfer.remove(key);
     }
     holder = createComponent(definition, { environmentInjector: this.environmentInjector, elementInjector: this.injector, ...(hostElement ? { hostElement } : {}) });
     this.application.attachView(holder.hostView);
     if (!this.browser && !this.orderQueued) {
       this.orderQueued = true;
       void this.tasks.run(async () => {
         await Promise.resolve(); this.orderQueued = false;
         for (const component of this.application.components) {
           const element = component.location.nativeElement as Element, parent = element.parentNode, next = element.nextSibling;
           this.application.detachView(component.hostView); this.application.attachView(component.hostView); parent?.insertBefore(element, next);
         }
       });
     }
     if (!this.browser) this.transfer.onSerialize(key, () => holder!.location.nativeElement.outerHTML as string);
     holder.changeDetectorRef.detectChanges(); this.holders.set(tag, holder);
   }
   return holder.instance.view();
 }
 ngOnDestroy(): void { for (const holder of this.holders.values()) { this.application.detachView(holder.hostView); holder.destroy(); } }
}
const renderer = createRenderer(LoomaScene);
export const mount = renderer.mount, renderHTML = renderer.renderHTML, settle = renderer.settle;\n`);
  const root = path.resolve(packageRoot, "../..");
  const outDir = path.join(directory, "angular");
  const entry = path.join(outDir, path.relative(root, source)).replace(/\.ts$/, ".js");
  return { entry, async compile() {
    const config = path.join(directory, "tsconfig.angular.json");
    await writeFile(config, JSON.stringify({ extends: path.join(root, "tests/framework-consumer/node_modules/.html-next/angular-consumer.angular.json"), compilerOptions: {
      target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, skipLibCheck: true, experimentalDecorators: true, rewriteRelativeImportExtensions: true, types: [], rootDir: root, outDir,
    }, angularCompilerOptions: { strictTemplates: true }, files: [source, fileURLToPath(new URL("./env.d.ts", import.meta.url))] }));
    const ngc = path.join(path.dirname(require.resolve("@angular/compiler-cli/package.json")), "bundles/src/bin/ngc.js");
    try { await promisify(execFile)(process.execPath, [ngc, "-p", config], { maxBuffer: 8 * 1024 * 1024 }); }
    catch (error) { throw new Error((error as { stdout?: string; stderr?: string }).stdout + ((error as { stderr?: string }).stderr ?? ""), { cause: error }); }
  } };
}

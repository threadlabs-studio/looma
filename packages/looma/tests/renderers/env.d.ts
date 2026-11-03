declare module "@looma-test/components" {
  export const rendererTarget: string;
}

declare module "@looma-test/style" {
  export function jsxStyle(source: string): Record<string, string>;
}

declare module "postcss/lib/tokenize" {
  export default function tokenize(input: { css: string }, options: { ignoreErrors: boolean }): {
    endOfFile(): boolean;
    nextToken(): readonly [kind: string, value: string] | undefined;
  };
}

declare module "@looma-test/renderer" {
  export const rendererTarget: string;
  export function mount(scene: import("./scene").Scene, target: Element, hydrate: boolean): import("./scene").MountedScene;
  export function renderHTML(scene: import("./scene").Scene): Promise<string>;
  export function settle(): Promise<void>;
}

declare module "@looma-test/angular-server" {
  export function renderAngularHTML(root: import("@angular/core").Type<unknown>, scene: import("./scene").Scene, token: import("@angular/core").InjectionToken<import("@angular/core").WritableSignal<import("./scene").SceneValue>>): Promise<string>;
}

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { componentExamples, renderExample } from './examples';
import { startingPoints, themeCSS } from '../../../../packages/looma/tooling/docs/theme.mjs';
import { loadGoogleFonts } from '../../../../packages/looma/tooling/docs/fonts.mjs';
import systemCSS from '@threadlabs/looma/theme-system.css?inline';
const behaviors = import.meta.glob('../../../../packages/looma/src/components/*/examples/*.behavior.{ts,js}', {
  eager: true, import: 'default',
}) as Record<string, (root: HTMLElement) => (() => void) | void>;
const meta = {
  title: 'Visual/Component states',
  parameters: { layout: 'fullscreen' },
  render: () => {
    const query = new URLSearchParams(location.search);
    const tag = query.get('component') ?? 'ui-button';
    const theme = query.get('theme') ?? 'minimal';
    document.documentElement.dataset.theme = query.get('mode') ?? 'light';
    const recipe = startingPoints[theme] ?? startingPoints.minimal;
    const fontsReady = loadGoogleFonts(document, recipe.fonts);
    const css = document.createElement('style');
    css.textContent = themeCSS(recipe, systemCSS) + '\nbody{margin:0;background:var(--ui-surface);color:var(--ui-text);font-family:var(--ui-font-sans)}#visual-state-stage{padding:16px;display:flow-root}*,*::before,*::after{animation:none!important;transition:none!important}';
    const stage = document.createElement('section');
    stage.id = 'visual-state-stage';
    const mount = document.createElement('div');
    mount.append(css, stage);
    let cleanup: (() => void) | void, generation = 0;
    const renderVisualCase = async (props: Record<string, unknown>, example = 0) => {
      const current = ++generation;
      // A stylesheet import may not have registered its faces when fonts.ready first resolves.
      await fontsReady;
      if (current !== generation) return;
      cleanup?.(); cleanup = undefined;
      stage.replaceChildren(renderExample(tag, props, example));
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (current !== generation) return;
      const file = componentExamples(tag)[example].file;
      const setup = behaviors[file.replace(/\.html$/, '.behavior.ts')] ?? behaviors[file.replace(/\.html$/, '.behavior.js')];
      cleanup = setup?.(stage);
    };
    void renderVisualCase({});
    Object.assign(window, { renderVisualCase });
    return mount;
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fixture: Story = {};

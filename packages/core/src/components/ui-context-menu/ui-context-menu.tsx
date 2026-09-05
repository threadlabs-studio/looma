import { Component, Prop, Element, State, Watch, Host, h } from '@stencil/core';
import { openOverlay, closeOverlay, requestTopOverlayClose } from '../../overlay/manager';
import { dispatchDetail } from '../../utils/events';
import { createAnchoredSurface, type AnchoredSurface } from '../../overlay/positioning';

type ContextMenuTrigger = 'keyboard' | 'pointer' | 'programmatic';

@Component({
  tag: 'ui-context-menu',
  styleUrl: 'ui-context-menu.css',
  shadow: true,
})
export class UIContextMenu {
  @Element() host: HTMLElement;

  /** Controls the menu when the consumer owns open state. */
  @Prop() open = false;
  /** Opens the menu on first client render. */
  @Prop({ attribute: 'default-open' }) defaultOpen = false;
  /** Optional id of the region that should also respond to a context-menu gesture. */
  @Prop() for?: string;

  @State() internalOpen = false;

  private overlayId = `ui-context-menu-${Math.random().toString(36).slice(2, 11)}`;
  private trigger: HTMLElement | null = null;
  private contextTarget: HTMLElement | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private pointPositioned = false;
  private surface: AnchoredSurface | null = null;

  @Watch('open')
  syncFromProp() {
    this.internalOpen = this.open;
  }

  @Watch('for')
  syncTarget() {
    this.resolveTargets();
    this.attachTargetListeners();
  }

  @Watch('internalOpen')
  syncOverlay() {
    this.syncTriggerState();
    if (this.internalOpen) {
      if (this.pointPositioned) {
        this.surface?.showAtPoint({ x: this.pointerX, y: this.pointerY });
      } else {
        this.surface?.show();
      }
      openOverlay({
        id: this.overlayId,
        modal: false,
        element: this.host,
        dismissible: true,
        requestClose: (reason, trigger) => this.closeMenu(reason, trigger),
      });
    } else {
      this.surface?.hide();
      closeOverlay(this.overlayId);
    }
  }

  componentDidLoad() {
    this.syncFromProp();
    this.internalOpen = this.internalOpen || this.defaultOpen;
    this.resolveTargets();
    this.attachTargetListeners();
    this.setupSurface();
    this.syncTriggerState();
    this.syncOverlay();
  }

  componentDidUpdate() {
    this.resolveTargets();
    this.attachTargetListeners();
    if (!this.pointPositioned) this.surface?.setAnchor(this.trigger);
    this.syncTriggerState();
  }

  disconnectedCallback() {
    this.detachTargetListeners();
    this.surface?.destroy();
    this.surface = null;
    closeOverlay(this.overlayId);
  }

  private setupSurface() {
    const menu = this.host.shadowRoot?.querySelector<HTMLElement>('.menu');
    if (!menu) return;
    this.surface?.destroy();
    this.surface = createAnchoredSurface(menu, {
      anchor: this.trigger,
      placement: 'bottom-start',
    });
  }

  private resolveTargets() {
    const previousTrigger = this.trigger;
    const previousContextTarget = this.contextTarget;
    const explicitTrigger = this.host.querySelector<HTMLElement>('[slot="trigger"]');
    const referencedTarget = this.for ? document.getElementById(this.for) : null;

    this.trigger = explicitTrigger;
    this.contextTarget = referencedTarget ?? explicitTrigger ?? this.host.parentElement;

    if (previousTrigger !== this.trigger || previousContextTarget !== this.contextTarget) {
      previousTrigger?.removeEventListener('click', this.onTriggerClick);
      previousTrigger?.removeEventListener('keydown', this.onTriggerKeydown);
      previousContextTarget?.removeEventListener('contextmenu', this.onContextMenu);
    }
  }

  private attachTargetListeners() {
    this.detachTargetListeners();
    this.trigger?.addEventListener('click', this.onTriggerClick);
    this.trigger?.addEventListener('keydown', this.onTriggerKeydown);
    this.contextTarget?.addEventListener('contextmenu', this.onContextMenu);
  }

  private detachTargetListeners() {
    this.trigger?.removeEventListener('click', this.onTriggerClick);
    this.trigger?.removeEventListener('keydown', this.onTriggerKeydown);
    this.contextTarget?.removeEventListener('contextmenu', this.onContextMenu);
  }

  private syncTriggerState() {
    if (!this.trigger) return;
    this.trigger.setAttribute('aria-haspopup', 'menu');
    this.trigger.setAttribute('aria-expanded', this.internalOpen ? 'true' : 'false');
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>('ui-menu-item')).filter(
      (item) => !this.isItemDisabled(item),
    );
  }

  private focusFirstItem() {
    requestAnimationFrame(() => this.getItems()[0]?.focus());
  }

  private openMenu(x: number, y: number, trigger: ContextMenuTrigger) {
    this.pointerX = x;
    this.pointerY = y;
    this.pointPositioned = true;
    // Context-click can reposition an already-open trigger menu, so do not
    // depend on a state transition to run the positioning controller.
    this.surface?.showAtPoint({ x, y });
    this.internalOpen = true;
    dispatchDetail(this.host, 'open', {
      open: true,
      reason: 'action',
      trigger,
    });
    this.focusFirstItem();
  }

  private openFromTrigger(trigger: ContextMenuTrigger) {
    if (!this.trigger) return;
    this.pointPositioned = false;
    this.internalOpen = true;
    dispatchDetail(this.host, 'open', {
      open: true,
      reason: 'action',
      trigger,
    });
    this.focusFirstItem();
  }

  private closeMenu(reason: string, trigger: string, returnFocus = true) {
    if (!this.internalOpen) return;
    this.internalOpen = false;
    dispatchDetail(this.host, 'close', {
      open: false,
      reason: reason as 'programmatic' | 'light-dismiss' | 'escape' | 'action',
      trigger: trigger as ContextMenuTrigger,
    });
    if (returnFocus) {
      this.trigger?.focus();
    }
  }

  private onTriggerClick = (event: MouseEvent) => {
    if (this.internalOpen) {
      this.closeMenu('action', event.detail === 0 ? 'keyboard' : 'pointer');
      return;
    }
    this.openFromTrigger(event.detail === 0 ? 'keyboard' : 'pointer');
  };

  private onTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (!this.internalOpen) {
      this.openFromTrigger('keyboard');
      return;
    }
    this.focusFirstItem();
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    this.openMenu(event.clientX, event.clientY, 'pointer');
  };

  private isItemDisabled(item: HTMLElement): boolean {
    return (
      item.getAttribute('aria-disabled') === 'true' ||
      item.hasAttribute('disabled') ||
      item.getAttribute('disabled') === 'true' ||
      (item as HTMLElement & { disabled?: boolean }).disabled === true
    );
  }

  private onKeydown = (event: KeyboardEvent) => {
    if (!this.internalOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      requestTopOverlayClose('escape', 'keyboard');
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const target = (event.target as HTMLElement).closest?.('ui-menu-item');
      if (!target || this.isItemDisabled(target)) return;
      event.preventDefault();
      const value = target.getAttribute('value') ?? target.getAttribute('data-value') ?? '';
      dispatchDetail(this.host, 'select', { value, trigger: 'keyboard' });
      this.closeMenu('action', 'keyboard');
    }
  };

  private onItemClick = (event: MouseEvent) => {
    const item = (event.target as HTMLElement).closest?.('ui-menu-item');
    if (!item || this.isItemDisabled(item)) return;
    const value = item.getAttribute('value') ?? item.getAttribute('data-value') ?? '';
    dispatchDetail(this.host, 'select', { value, trigger: 'pointer' });
    this.closeMenu('action', 'pointer');
  };

  render() {
    return (
      <Host
        data-open={this.internalOpen ? '' : undefined}
        onKeyDown={this.onKeydown}
        onClick={this.onItemClick}
      >
        <slot name="trigger" />
        <div
          class="menu"
          data-open={this.internalOpen ? '' : undefined}
        >
          <ui-menu open={this.internalOpen}>
            <slot />
          </ui-menu>
        </div>
      </Host>
    );
  }
}

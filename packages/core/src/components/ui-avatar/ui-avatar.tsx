import { Component, Prop, State, Watch, Host, h } from '@stencil/core';
import { toInitials } from '../../utils/initials';

@Component({
  tag: 'ui-avatar',
  styleUrl: 'ui-avatar.css',
  shadow: true,
})
export class UIAvatar {
  @Prop() src = '';
  @Prop() alt = '';
  @Prop() name = '';
  @Prop() fallback = '';

  @State() hasImage = false;

  @Watch('src')
  watchSrc() {
    this.hasImage = false;
  }

  private onImageLoad = () => {
    this.hasImage = true;
  };

  private onImageError = () => {
    this.hasImage = false;
  };

  render() {
    const fallbackText = this.fallback || toInitials(this.name || this.alt);
    const label = this.alt || this.name || 'Avatar';

    return (
      <Host
        role="img"
        aria-label={label}
        data-has-image={this.hasImage ? '' : undefined}
      >
        <div class="avatar">
          <img
            src={this.src}
            alt={label}
            onLoad={this.onImageLoad}
            onError={this.onImageError}
            hidden={!this.hasImage}
            aria-hidden={this.hasImage ? 'false' : 'true'}
          />
          <span
            class="fallback"
            hidden={this.hasImage}
            aria-hidden={this.hasImage ? 'true' : 'false'}
          >
            {fallbackText}
          </span>
        </div>
      </Host>
    );
  }
}

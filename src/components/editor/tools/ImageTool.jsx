/**
 * Custom Image Tool for Editor.js
 */
export default class ImageTool {
  constructor({ data = {}, config = {}, api, readOnly }) {
    this.data = data;
    this.config = config;
    this.api = api;
    this.readOnly = readOnly ?? config.readOnly ?? api.readOnly?.isEnabled;
  }

  static get isReadOnlySupported() {
    return true;
  }

  static get toolbox() {
    return {
      title: 'Image',
      icon: '<svg class="icon icon--picture" viewBox="0 0 24 24"><path d="M3 9h18v10c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V9z" fill="currentColor"/><path d="M3 4h18c.55 0 1 .45 1 1v2H2V5c0-.55.45-1 1-1z" fill="currentColor"/><circle cx="8.5" cy="12.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-6-4 5-3-4-4 5v2h16z" fill="currentColor"/></svg>',
    };
  }

  render() {
    const container = document.createElement('div');
    container.className = 'ce-image-tool';

    if (this.data.url) {
      container.innerHTML = `
        <figure class="image">
          <img src="${this.data.url}" alt="${this.data.caption || ''}" />
          ${this.data.caption ? `<figcaption>${this.data.caption}</figcaption>` : ''}
        </figure>
      `;
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', this._handleFileSelect.bind(this));

      const button = document.createElement('button');
      button.textContent = 'Upload Image';
      button.className = 'ce-button';
      button.type = 'button';
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => input.click());

      container.appendChild(input);
      container.appendChild(button);
    }

    this.element = container;
    return container;
  }

  async _handleFileSelect(event) {
    const files = event.target.files;
    if (!files || !files.length) return;

    const file = files[0];
    if (this.config.onUpload) {
      try {
        const urls = await this.config.onUpload([file]);
        if (urls && urls.length) {
          this.data.url = urls[0];
          this.element.innerHTML = `
            <figure class="image">
              <img src="${urls[0]}" alt="" />
            </figure>
          `;
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }

  save() {
    return this.data;
  }

  static get pasteConfig() {
    return {
      files: {
        mimeTypes: ['image/*'],
      },
    };
  }

  async onPaste(event) {
    const files = event.detail.data.files;
    if (files && files.length) {
      if (this.config.onUpload) {
        const urls = await this.config.onUpload(Array.from(files));
        if (urls && urls.length) {
          this.data.url = urls[0];
        }
      }
    }
  }
}

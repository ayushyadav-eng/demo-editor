/**
 * Custom Gallery Tool for Editor.js
 */
export default class GalleryTool {
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
      title: 'Gallery',
      icon: '<svg class="icon icon--gallery" viewBox="0 0 24 24"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="14" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    };
  }

  render() {
    const container = document.createElement('div');
    container.className = 'ce-gallery-tool';

    if (this.data.urls && this.data.urls.length) {
      container.innerHTML = `
        <div class="gallery">
          ${this.data.urls.map((src, idx) => `
            <figure class="gallery-item" key="${src}-${idx}">
              <img src="${src}" alt="" />
            </figure>
          `).join('')}
        </div>
      `;
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.style.display = 'none';
      input.addEventListener('change', this._handleFileSelect.bind(this));

      const button = document.createElement('button');
      button.textContent = 'Upload Gallery Images';
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

    if (this.config.onUpload) {
      try {
        const urls = await this.config.onUpload(Array.from(files));
        if (urls && urls.length) {
          this.data.urls = urls;
          this.element.innerHTML = `
            <div class="gallery">
              ${urls.map((src, idx) => `
                <figure class="gallery-item" key="${src}-${idx}">
                  <img src="${src}" alt="" />
                </figure>
              `).join('')}
            </div>
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
          this.data.urls = urls;
        }
      }
    }
  }
}

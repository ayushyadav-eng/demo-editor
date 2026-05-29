/**
 * Custom Grid Tool for Editor.js
 */
const GRID_SIZE_LIMIT = 10;

export default class GridTool {
  constructor({ data = {}, config = {}, api, readOnly }) {
    this.data = data;
    this.config = config;
    this.api = api;
    this.readOnly = readOnly ?? config.readOnly ?? api.readOnly?.isEnabled;
    this.gridSelection = { rows: 1, columns: 1 };
  }

  static get isReadOnlySupported() {
    return true;
  }

  static get toolbox() {
    return {
      title: 'Grid',
      icon: '<svg class="icon icon--grid" viewBox="0 0 24 24"><rect x="2" y="2" width="4" height="4" stroke="currentColor" fill="none"/><rect x="8" y="2" width="4" height="4" stroke="currentColor" fill="none"/><rect x="14" y="2" width="4" height="4" stroke="currentColor" fill="none"/><rect x="20" y="2" width="2" height="4" stroke="currentColor" fill="none"/><rect x="2" y="8" width="4" height="4" stroke="currentColor" fill="none"/><rect x="8" y="8" width="4" height="4" stroke="currentColor" fill="none"/><rect x="14" y="8" width="4" height="4" stroke="currentColor" fill="none"/><rect x="20" y="8" width="2" height="4" stroke="currentColor" fill="none"/><rect x="2" y="14" width="4" height="4" stroke="currentColor" fill="none"/><rect x="8" y="14" width="4" height="4" stroke="currentColor" fill="none"/><rect x="14" y="14" width="4" height="4" stroke="currentColor" fill="none"/><rect x="20" y="14" width="2" height="4" stroke="currentColor" fill="none"/></svg>',
    };
  }

  _gridPickerMarkup() {
    const { rows, columns } = this.gridSelection;
    const cells = Array.from({ length: GRID_SIZE_LIMIT }, (_, rowIndex) =>
      Array.from({ length: GRID_SIZE_LIMIT }, (_, columnIndex) => {
        const isActive = rowIndex < rows && columnIndex < columns;
        return `
          <button
            type="button"
            class="gridCell ${isActive ? 'active' : ''}"
            data-row="${rowIndex + 1}"
            data-col="${columnIndex + 1}"
            style="width: 20px; height: 20px; background: ${isActive ? '#1f8fff' : '#e8e8e8'}; border: 1px solid #ccc; cursor: pointer;"
          />
        `;
      }).join('')
    ).join('');

    return `
      <div class="grid-picker" style="padding: 20px;">
        <p>Select grid size first, then upload images</p>
        <div class="gridCells" style="display: grid; grid-template-columns: repeat(${GRID_SIZE_LIMIT}, 20px); gap: 5px; margin: 10px 0;">
          ${cells}
        </div>
        <p class="grid-selection-label">Selected: ${rows} x ${columns}</p>
        <input type="file" accept="image/*" multiple style="display: none;" class="gridFileInput" />
        <button type="button" class="ce-button gridUploadBtn">Upload Images</button>
      </div>
    `;
  }

  _bindGridPicker(container) {
    container.querySelectorAll('.gridCell').forEach((cell) => {
      cell.addEventListener('click', (event) => {
        const row = parseInt(event.currentTarget.dataset.row, 10);
        const col = parseInt(event.currentTarget.dataset.col, 10);
        this.gridSelection = { rows: row, columns: col };
        this._paintGridPicker(container);
      });
    });

    const fileInput = container.querySelector('.gridFileInput');
    const uploadBtn = container.querySelector('.gridUploadBtn');
    uploadBtn.addEventListener('mousedown', (event) => event.preventDefault());
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', this._handleFileSelect.bind(this));
  }

  _paintGridPicker(container) {
    const { rows, columns } = this.gridSelection;

    container.querySelectorAll('.gridCell').forEach((cell) => {
      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);
      const isActive = row <= rows && col <= columns;
      cell.classList.toggle('active', isActive);
      cell.style.background = isActive ? '#1f8fff' : '#e8e8e8';
    });

    const label = container.querySelector('.grid-selection-label');
    if (label) {
      label.textContent = `Selected: ${rows} x ${columns}`;
    }
  }

  render() {
    const container = document.createElement('div');
    container.className = 'ce-grid-tool';

    if (this.data.urls && this.data.urls.length) {
      const columns = this.data.columns || 3;
      container.innerHTML = `
        <div class="grid" style="display: grid; gap: 10px; grid-template-columns: repeat(${columns}, 1fr);">
          ${this.data.urls.map((src, idx) => `
            <figure class="grid-item" key="${src}-${idx}">
              <img src="${src}" alt="" />
            </figure>
          `).join('')}
        </div>
      `;
    } else {
      container.innerHTML = this._gridPickerMarkup();
      this._bindGridPicker(container);
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
          const totalCells = this.gridSelection.rows * this.gridSelection.columns;
          const gridUrls = urls.slice(0, totalCells);
          this.data.urls = gridUrls;
          this.data.columns = this.gridSelection.columns;
          
          const columns = this.data.columns || 3;
          this.element.innerHTML = `
            <div class="grid" style="display: grid; gap: 10px; grid-template-columns: repeat(${columns}, 1fr);">
              ${gridUrls.map((src, idx) => `
                <figure class="grid-item" key="${src}-${idx}">
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
          const totalCells = this.gridSelection.rows * this.gridSelection.columns;
          this.data.urls = urls.slice(0, totalCells);
          this.data.columns = this.gridSelection.columns;
        }
      }
    }
  }
}

export { GRID_SIZE_LIMIT };

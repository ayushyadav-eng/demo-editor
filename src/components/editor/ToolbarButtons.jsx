import { useRef, useState } from 'react';
import { GRID_SIZE_LIMIT } from './AtomicBlocks';

export function UploadImageButton({ disabled, onSelectFiles }) {
  const inputRef = useRef(null);

  return (
    <div className="rdw-custom-toolbar-btn">
      <button
        type="button"
        className="rdw-option-wrapper"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        title="Upload Image"
      >
        Upload Image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hiddenInput"
        onChange={(event) => {
          const files = event.target.files ? [event.target.files[0]] : [];
          event.target.value = '';
          if (files.length) {
            onSelectFiles(files);
          }
        }}
      />
    </div>
  );
}

export function InsertGalleryButton({ disabled, onSelectFiles }) {
  const inputRef = useRef(null);

  return (
    <div className="rdw-custom-toolbar-btn">
      <button
        type="button"
        className="rdw-option-wrapper"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        title="Insert Gallery"
      >
        Insert Gallery
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hiddenInput"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          if (files.length) {
            onSelectFiles(files);
          }
        }}
      />
    </div>
  );
}

export function InsertGridButton({
  disabled,
  gridSelection,
  setGridSelection,
  onSelectFiles,
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleGridPick = (rows, columns) => {
    setGridSelection({ rows, columns });
    setOpen(false);
    inputRef.current?.click();
  };

  return (
    <div className="rdw-custom-toolbar-btn rdw-insert-grid-wrapper">
      <button
        type="button"
        className="rdw-option-wrapper"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title="Insert Grid"
      >
        Insert Grid
      </button>
      {open && (
        <div className="rdw-insert-grid-popover">
          <span>Grid selection (10x10 parity):</span>
          <div className="gridCells">
            {Array.from({ length: GRID_SIZE_LIMIT }, (_, rowIndex) =>
              Array.from({ length: GRID_SIZE_LIMIT }, (_, columnIndex) => {
                const isActive =
                  rowIndex < gridSelection.rows && columnIndex < gridSelection.columns;
                return (
                  <button
                    key={`${rowIndex}-${columnIndex}`}
                    type="button"
                    className={`gridCell ${isActive ? 'active' : ''}`}
                    onClick={() => handleGridPick(rowIndex + 1, columnIndex + 1)}
                    disabled={disabled}
                    aria-label={`Select ${rowIndex + 1} by ${columnIndex + 1}`}
                  />
                );
              })
            )}
          </div>
          <p>
            Selected: {gridSelection.rows} x {gridSelection.columns}
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hiddenInput"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          if (files.length) {
            onSelectFiles(files);
          }
        }}
      />
    </div>
  );
}

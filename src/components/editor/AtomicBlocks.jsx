const GRID_SIZE_LIMIT = 10;

export function ImageBlock({ block, contentState }) {
  const entity = contentState.getEntity(block.getEntityAt(0));
  const { src = '' } = entity.getData();

  return (
    <figure className="image" contentEditable={false}>
      <img src={src} alt="" />
    </figure>
  );
}

export function GalleryBlock({ block, contentState }) {
  const entity = contentState.getEntity(block.getEntityAt(0));
  const { urls = [] } = entity.getData();

  return (
    <div className="gallery" contentEditable={false}>
      {urls.map((src, index) => (
        <figure className="gallery-item" key={`${src}-${index}`}>
          <img src={src} alt="" />
        </figure>
      ))}
    </div>
  );
}

export function GridBlock({ block, contentState }) {
  const entity = contentState.getEntity(block.getEntityAt(0));
  const { urls = [], columns = 3 } = entity.getData();

  return (
    <div
      className="grid"
      style={{
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
      contentEditable={false}
    >
      {urls.map((src, index) => (
        <figure className="grid-item" key={`${src}-${index}`}>
          <img src={src} alt="" />
        </figure>
      ))}
    </div>
  );
}

export { GRID_SIZE_LIMIT };

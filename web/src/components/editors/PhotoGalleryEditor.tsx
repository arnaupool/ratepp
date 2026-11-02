import { useState } from 'react';
import { errorMessage } from '../../api/client';
import { pickImageFile, uploadImageFile } from '../../utils/upload';
import { Photo, Spinner } from '../bits';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  onError: (message: string) => void;
  onOpenCoverSearch: () => void;
  onUploadingChange?: (uploading: boolean) => void;
}

// Ordered photo list where the first one is always the cover. Photos upload
// as soon as they are picked; the parent only ever gets URLs.
export default function PhotoGalleryEditor({ photos, onChange, onError, onOpenCoverSearch, onUploadingChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    const file = await pickImageFile();
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const url = await uploadImageFile(file);
      onChange([...photos, url]);
    } catch (e) {
      onError(errorMessage(e, 'No se pudo subir la foto'));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const next = photos.slice();
    [next[target], next[idx]] = [next[idx], next[target]];
    onChange(next);
  };

  return (
    <div className="gallery-editor">
      <div className="gallery-editor-row no-scrollbar">
        {photos.map((url, idx) => (
          <div key={`${url}-${idx}`} className="gallery-editor-item">
            <div className="gallery-editor-thumb">
              <Photo url={url} thumb sizes="84px" />
              {idx === 0 && <span className="gallery-editor-cover">PORTADA</span>}
              <button type="button" className="gallery-editor-remove" onClick={() => onChange(photos.filter((_, i) => i !== idx))} aria-label="Quitar foto">
                ✕
              </button>
            </div>
            <div className="gallery-editor-moves">
              <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Mover foto a la izquierda">
                ‹
              </button>
              <button type="button" disabled={idx === photos.length - 1} onClick={() => move(idx, 1)} aria-label="Mover foto a la derecha">
                ›
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="gallery-editor-add" onClick={upload} disabled={uploading} aria-label="Añadir foto a la galería">
          {uploading ? <Spinner small label="Subiendo foto" /> : '+'}
        </button>
      </div>
      <button type="button" className="quick-chip gallery-editor-search" onClick={onOpenCoverSearch}>
        Buscar carátula
      </button>
    </div>
  );
}

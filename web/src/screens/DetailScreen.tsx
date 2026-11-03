import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { scoresApi } from '../api/endpoints';
import type { ScoreDetail } from '../api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import DetailFieldRow from '../components/DetailFieldRow';
import { EditIcon, TrashIcon } from '../components/Icons';
import PhotoLightbox from '../components/PhotoLightbox';
import { BackButton } from '../components/ScreenHeader';
import { Photo, PhotoStripe, ScoreBadge, Spinner, TagChip } from '../components/bits';
import { useGoBack } from '../hooks/useGoBack';
import { usePageBackground } from '../hooks/usePageBackground';
import { contrastTextColors } from '../utils/colors';
import NumberPillRow from '../components/editors/NumberPillRow';
import '../components/editors/editors.css';
import EditMode from './DetailEditMode';
import './DetailScreen.css';

export default function DetailScreen() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['score', id], queryFn: () => scoresApi.get(id).then((r) => r.score) });

  if (query.isPending) {
    return (
      <div className="center-fill">
        <Spinner />
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="screen">
        <div className="detail-error-head">
          <BackButton />
        </div>
        <div className="center-fill detail-error">{errorMessage(query.error, 'No se pudo cargar la puntuación')}</div>
      </div>
    );
  }
  return <Detail key={id} serverScore={query.data} />;
}

function Detail({ serverScore }: { serverScore: ScoreDetail }) {
  const queryClient = useQueryClient();
  const goBack = useGoBack();
  const [editMode, setEditMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Width / height of the cover photo once loaded: sizes its frame on wide
  // screens (desktop.css), whatever the photo's pixel size.
  const [heroRatio, setHeroRatio] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Local copy that edit mode updates optimistically. It is mirrored into the
  // query cache, and a fresh server copy replaces it whenever it arrives
  // outside edit mode.
  const [score, setScore] = useState(serverScore);
  useEffect(() => {
    if (!editMode) setScore(serverScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverScore]);
  useEffect(() => {
    queryClient.setQueryData(['score', score.id], score);
  }, [queryClient, score]);
  const photos = score.photoUrls;
  const heroUrl = photos[activeIndex] ?? photos[0];
  // Your own score (made with your account), other members' scores in a
  // group note, and the free-named "Nota adicional" ones.
  const mine = score.ratings.find((r) => r.isMe);
  const members = score.ratings.filter((r) => r.userId && !r.isMe);
  const guests = score.ratings.filter((r) => !r.userId);
  const inGroup = !!score.groupId;
  const iAmAuthor = score.ratings.some((r) => r.isOwner && r.isMe);
  const [rating, setRating] = useState(false);

  // In a group note each member scores it with their own account, right
  // from read mode (no need to enter edit mode for that).
  const rateMe = async (value: number) => {
    setRating(false);
    setError('');
    try {
      const { rating: r } = await scoresApi.rateMe(score.id, value);
      setScore((s) => ({ ...s, ratings: s.ratings.some((x) => x.id === r.id) ? s.ratings.map((x) => (x.id === r.id ? r : x)) : [...s.ratings, r] }));
      queryClient.invalidateQueries({ queryKey: ['scores'] });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la puntuación'));
    }
  };

  const pageBg = score.cardColor || undefined;
  usePageBackground(score.cardColor);
  const onColor = contrastTextColors(score.cardColor);
  const inkStyle = onColor ? { color: onColor.ink } : undefined;
  const subStyle = onColor ? { color: onColor.sub } : undefined;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await scoresApi.remove(score.id);
      queryClient.removeQueries({ queryKey: ['score', score.id] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      goBack();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo eliminar la puntuación'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (editMode) {
    return <EditMode score={score} setScore={setScore} onDone={() => setEditMode(false)} />;
  }

  return (
    <div className="detail-screen" style={{ background: pageBg }}>
      {/* Stacked on phones; two columns (photos | info) on wide screens. */}
      <div className="detail-layout">
        <div className="detail-media">
          <div className="detail-hero-wrap" style={heroRatio ? ({ '--hero-ratio': heroRatio } as CSSProperties) : undefined}>
            {heroUrl ? (
              <button type="button" className="detail-hero-btn" onClick={() => setLightbox(heroUrl)} aria-label="Ampliar foto">
                <Photo
                  url={heroUrl}
                  className="detail-hero"
                  loading="eager"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) setHeroRatio(img.naturalWidth / img.naturalHeight);
                  }}
                />
              </button>
            ) : (
              <PhotoStripe id={score.id} className="detail-hero" />
            )}
            <button type="button" className="detail-hero-back" onClick={goBack} aria-label="Volver">
              <span className="back-arrow light" />
            </button>
            <button type="button" className="detail-hero-action edit" onClick={() => setEditMode(true)} aria-label="Editar puntuación">
              <EditIcon size={16} color="#2a2a2a" />
            </button>
            {score.canManage && (
              <button type="button" className="detail-hero-action delete" onClick={() => setConfirmDelete(true)} aria-label="Eliminar puntuación">
                <TrashIcon size={16} color="#2a2a2a" />
              </button>
            )}
          </div>

          {photos.length > 1 && (
            <div className="detail-thumbs">
              {photos.map((url, idx) => (
                <Thumb key={`${url}-${idx}`} url={url} active={idx === activeIndex} onSelect={() => setActiveIndex(idx)} onLongPress={() => setLightbox(url)} />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-content">
            <h1 className="detail-title" style={inkStyle}>
              {score.title}
            </h1>
            {score.categories.length > 0 && (
              <div className="detail-categories">
                {score.categories.map((c) => (
                  <TagChip key={c} label={c} />
                ))}
              </div>
            )}

            {inGroup && (
              <p className="detail-group-line" style={subStyle}>
                👥 {score.groupName} · {iAmAuthor ? 'creada por ti' : `creada por ${score.authorName ?? 'un antiguo miembro'}`}
              </p>
            )}

            {!!error && <p className="detail-error-banner">{error}</p>}

            <div className="detail-owner">
              <span className="t-section-label" style={subStyle}>
                Tu puntuación
              </span>
              {inGroup ? (
                mine ? (
                  <ScoreBadge value={mine.value} size={40} onClick={() => setRating((v) => !v)} label="Cambiar tu puntuación" />
                ) : (
                  <button type="button" className="select-chip detail-rate-btn" onClick={() => setRating((v) => !v)}>
                    Puntuar
                  </button>
                )
              ) : (
                mine && <ScoreBadge value={mine.value} size={40} />
              )}
              {inGroup && rating && (
                <div className="detail-rate-pills">
                  <NumberPillRow value={mine?.value ?? null} onSelect={rateMe} />
                </div>
              )}
            </div>

            {members.length > 0 && (
              <div className="detail-people-section">
                <span className="t-section-label" style={subStyle}>
                  Miembros
                </span>
                <div className="detail-people">
                  {members.map((p) => (
                    <div key={p.id} className="detail-person">
                      <span className="detail-person-name" style={subStyle}>
                        {p.personName}
                      </span>
                      <ScoreBadge value={p.value} size={44} />
                      {p.formerMember && (
                        <span className="detail-person-former" style={subStyle}>
                          ex miembro
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(guests.length > 0 || members.length === 0) && (
              <div className="detail-people-section">
                <span className="t-section-label" style={subStyle}>
                  Nota adicional
                </span>
                {guests.length > 0 ? (
                  <div className="detail-people">
                    {guests.map((p) => (
                      <div key={p.id} className="detail-person">
                        <span className="detail-person-name" style={subStyle}>
                          {p.personName}
                        </span>
                        <ScoreBadge value={p.value} size={44} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="detail-nobody" style={subStyle}>
                    Nadie más ha puntuado esto todavía.
                  </p>
                )}
              </div>
            )}
          </div>

          {score.fields.length > 0 && (
            <div className="detail-fields">
              {score.fields.map((f) => (
                <DetailFieldRow key={f.id} field={f} onPhoto={setLightbox} />
              ))}
            </div>
          )}
        </div>
      </div>

      <PhotoLightbox url={lightbox} onClose={() => setLightbox(null)} />

      <ConfirmDialog
        visible={confirmDelete}
        title="¿Eliminar esta puntuación?"
        message="Se borrará para siempre, junto con sus fotos y campos. No se puede deshacer."
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// Tap selects the photo for the hero; a long press opens it full screen.
function Thumb({ url, active, onSelect, onLongPress }: { url: string; active: boolean; onSelect: () => void; onLongPress: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  return (
    <button
      type="button"
      className={`detail-thumb${active ? ' active' : ''}`}
      onPointerDown={(e) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, 450);
      }}
      onPointerMove={(e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!fired.current) onSelect();
      }}
      aria-label="Ver foto"
    >
      <Photo url={url} thumb sizes="120px" />
    </button>
  );
}

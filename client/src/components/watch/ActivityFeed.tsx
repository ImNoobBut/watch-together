import { useCallback, useEffect, useId, useRef, useState } from "react";

export type ActivityLine = { id: number; text: string };

const PREVIEW_COUNT = 5;

type Props = {
  lines: ActivityLine[];
};

export function ActivityFeed({ lines }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const preview = lines.slice(-PREVIEW_COUNT);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen, closeModal]);

  if (lines.length === 0) return null;

  return (
    <>
      <div className="activity-feed" aria-live="polite">
        <div className="activity-feed__header">
          <p id={titleId} className="activity-feed__title">
            Room activity
          </p>
          {lines.length > PREVIEW_COUNT && (
            <button
              type="button"
              className="activity-feed__more-btn"
              onClick={openModal}
              aria-haspopup="dialog"
              aria-expanded={modalOpen}
            >
              See all ({lines.length})
            </button>
          )}
        </div>
        <ul className="activity-feed__list" aria-label="Recent room activity">
          {preview.map((l) => (
            <li key={l.id} className="activity-feed__item">
              {l.text}
            </li>
          ))}
        </ul>
      </div>

      {modalOpen && (
        <div
          className="activity-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="activity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-modal`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="activity-modal__header">
              <h2 id={`${titleId}-modal`} className="activity-modal__title">
                Room activity
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="activity-modal__close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ul className="activity-modal__list">
              {lines.map((l) => (
                <li key={l.id} className="activity-modal__item">
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

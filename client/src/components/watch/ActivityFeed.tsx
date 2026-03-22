type Line = { id: number; text: string };

type Props = {
  lines: Line[];
};

export function ActivityFeed({ lines }: Props) {
  if (lines.length === 0) return null;
  return (
    <div className="activity-feed" aria-live="polite">
      <p className="activity-feed__title">Room activity</p>
      <ul className="activity-feed__list">
        {lines.map((l) => (
          <li key={l.id} className="activity-feed__item">
            {l.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

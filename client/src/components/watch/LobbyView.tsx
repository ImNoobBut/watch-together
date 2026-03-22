import { Link } from "react-router-dom";
import { APP_DISPLAY_NAME } from "../../appName";
import { SiteFooter } from "../../SiteFooter";

type Props = {
  isAdmin?: boolean;
  onLogout: () => void;
  banner: string | null;
  joinInput: string;
  onJoinInputChange: (v: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  lobbyBusy: boolean;
  lobbyAction: null | "create" | "join";
};

export function LobbyView({
  isAdmin,
  onLogout,
  banner,
  joinInput,
  onJoinInputChange,
  onCreateRoom,
  onJoinRoom,
  lobbyBusy,
  lobbyAction,
}: Props) {
  return (
    <div className="app lobby">
      <header className="lobby-top">
        <div className="lobby-nav">
          {isAdmin && (
            <Link to="/admin" className="nav-link">
              Admin
            </Link>
          )}
          <button type="button" className="linkish" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <h1>{APP_DISPLAY_NAME}</h1>
      <p className="muted">
        YouTube, Vimeo, direct video files, or generic embed URLs.
      </p>
      {banner && <p className="banner">{banner}</p>}
      <div className="lobby-actions">
        <button
          type="button"
          onClick={onCreateRoom}
          disabled={lobbyBusy}
        >
          {lobbyAction === "create" ? "Creating…" : "Create room"}
        </button>
        <div className="join-row">
          <input
            value={joinInput}
            onChange={(e) => onJoinInputChange(e.target.value.toUpperCase())}
            placeholder="ROOM ID"
            maxLength={12}
            disabled={lobbyBusy}
          />
          <button
            type="button"
            onClick={onJoinRoom}
            disabled={lobbyBusy || !joinInput.trim()}
          >
            {lobbyAction === "join" ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

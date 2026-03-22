import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getIceServers } from "./webrtc/iceServers";

export type ScreenSharePeer = { socketId: string };

type RtcPayload =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type Props = {
  socket: Socket;
  mySocketId: string;
  hostSocketId: string;
  isHost: boolean;
  peers: ScreenSharePeer[];
  onError: (message: string) => void;
};

export function ScreenShareStage({
  socket,
  mySocketId,
  hostSocketId,
  isHost,
  peers,
  onError,
}: Props) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const hostPCsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    return () => {
      for (const [, pc] of hostPCsRef.current) {
        pc.close();
      }
      hostPCsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const [vt] = stream.getVideoTracks();
        if (vt) {
          vt.onended = () => {
            stream?.getTracks().forEach((t) => t.stop());
            socket.emit("unload_video");
          };
        }
        setLocalStream(stream);
      } catch (e) {
        onError(
          e instanceof Error ? e.message : "Could not capture display or tab.",
        );
        socket.emit("unload_video");
      }
    })();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setLocalStream(null);
    };
  }, [isHost, socket, onError]);

  useEffect(() => {
    if (!isHost || !localStream) {
      if (isHost && !localStream) {
        for (const [, pc] of hostPCsRef.current) {
          pc.close();
        }
        hostPCsRef.current.clear();
      }
      return;
    }

    const hostPCs = hostPCsRef.current;
    const viewerIds = peers
      .map((p) => p.socketId)
      .filter((id) => id !== mySocketId);

    for (const [id, pc] of [...hostPCs]) {
      if (!viewerIds.includes(id)) {
        pc.close();
        hostPCs.delete(id);
      }
    }

    const onSignal = async (msg: {
      fromSocketId: string;
      payload: RtcPayload;
    }) => {
      if (msg.fromSocketId === mySocketId) return;
      const pc = hostPCs.get(msg.fromSocketId);
      if (!pc) return;
      try {
        if (msg.payload.type === "answer") {
          await pc.setRemoteDescription({
            type: "answer",
            sdp: msg.payload.sdp,
          });
        } else if (msg.payload.type === "ice" && msg.payload.candidate) {
          await pc.addIceCandidate(msg.payload.candidate);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.on("rtc_signal", onSignal);

    async function addViewer(vid: string) {
      if (hostPCs.has(vid)) return;
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      hostPCs.set(vid, pc);
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("rtc_signal", {
            targetSocketId: vid,
            payload: { type: "ice", candidate: ev.candidate.toJSON() },
          });
        }
      };
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdp = pc.localDescription?.sdp;
        if (sdp) {
          socket.emit("rtc_signal", {
            targetSocketId: vid,
            payload: { type: "offer", sdp },
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    for (const vid of viewerIds) {
      void addViewer(vid);
    }

    return () => {
      socket.off("rtc_signal", onSignal);
    };
  }, [isHost, localStream, peers, mySocketId, socket]);

  useEffect(() => {
    const v = localVideoRef.current;
    if (v && localStream) {
      v.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (isHost) return;

    setRemoteReady(false);
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    pc.ontrack = (ev) => {
      const el = remoteVideoRef.current;
      if (el && ev.streams[0]) {
        el.srcObject = ev.streams[0];
        setRemoteReady(true);
      }
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit("rtc_signal", {
          targetSocketId: hostSocketId,
          payload: { type: "ice", candidate: ev.candidate.toJSON() },
        });
      }
    };

    const onSignal = async (msg: {
      fromSocketId: string;
      payload: RtcPayload;
    }) => {
      if (msg.fromSocketId !== hostSocketId) return;
      try {
        if (msg.payload.type === "offer") {
          await pc.setRemoteDescription({
            type: "offer",
            sdp: msg.payload.sdp,
          });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const sdp = pc.localDescription?.sdp;
          if (sdp) {
            socket.emit("rtc_signal", {
              targetSocketId: hostSocketId,
              payload: { type: "answer", sdp },
            });
          }
        } else if (msg.payload.type === "ice" && msg.payload.candidate) {
          await pc.addIceCandidate(msg.payload.candidate);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.on("rtc_signal", onSignal);

    return () => {
      socket.off("rtc_signal", onSignal);
      pc.close();
      setRemoteReady(false);
      const el = remoteVideoRef.current;
      if (el) el.srcObject = null;
    };
  }, [isHost, hostSocketId, socket]);

  function stopSharing() {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    for (const [, pc] of hostPCsRef.current) {
      pc.close();
    }
    hostPCsRef.current.clear();
    socket.emit("unload_video");
  }

  if (isHost) {
    return (
      <div className="synced-player-wrap">
        {!localStream && (
          <div className="synced-player-placeholder">
            Starting screen capture…
          </div>
        )}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: localStream ? "block" : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="muted small" style={{ flex: 1, minWidth: 120 }}>
            Sharing includes audio when the browser offers it (e.g. Chrome: pick a
            tab and check &quot;Share tab audio&quot;).
          </span>
          <button type="button" onClick={stopSharing}>
            Stop sharing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="synced-player-wrap">
      {!remoteReady && (
        <div className="synced-player-placeholder">
          Waiting for host video…
        </div>
      )}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: remoteReady ? "block" : "none",
        }}
      />
    </div>
  );
}

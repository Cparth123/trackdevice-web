"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../lib/config";
import { getViewerSocket } from "../lib/socket";
import { fetchIceServers } from "../lib/webrtc";
import { useParams } from "next/navigation";

type Props = {
  deviceId: string;
  password: string;
};

type Status =
  | "connecting"
  | "authenticating"
  | "waiting-device"
  | "receiving-offer"
  | "streaming"
  | "error";

type DeviceData = {
  files?: Array<{ id: string; name: string; path?: string; size?: string }>;
  gallery?: Array<{ id: string; name: string; type: string }>;
  messages?: Array<{ id: string; sender: string; text: string; date: string }>;
  callLogs?: Array<{ id: string; number: string; type: string; duration: string; date: string }>;
};

export default function ViewerClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [dataError, setDataError] = useState<string>("");
  const params = useParams();
  const deviceId = params?.deviceId;
  const password = params?.password;

  const fetchDeviceData = useCallback(async () => {
    if (!deviceId) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/data`);
      if (!response.ok) {
        throw new Error(`Failed to fetch device data: ${response.statusText}`);
      }

      const payload = await response.json();
      setDeviceData(payload.deviceData || null);
      setDataError("");
    } catch (fetchError) {
      setDataError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load device data",
      );
    }
  }, [deviceId]);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  useEffect(() => {
    const socket = getViewerSocket();
    let active = true;

    const cleanupPeer = () => {
      pcRef.current?.close();
      pcRef.current = null;
      remoteDescSetRef.current = false;
      pendingCandidatesRef.current = [];
    };

    const authenticate = async () => {
      setStatus("authenticating");
      const result = await new Promise<{
        ok: boolean;
        error?: string;
        device?: { deviceName?: string };
      }>((resolve) => {
        socket.emit(
          "viewer:authenticate",
          {
            deviceId,
            password,
            viewerLabel: "Next.js Web Viewer",
          },
          resolve,
        );
      });

      if (!active) {
        return;
      }

      if (!result.ok) {
        setStatus("error");
        setError(result.error || "Authentication failed");
        return;
      }

      console.log(result, "result=======");
      setDeviceName(result.device?.deviceName || "");
      setStatus("waiting-device");
    };

    const ensurePeer = async () => {
      if (pcRef.current) {
        return pcRef.current;
      }

      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("streaming");
        }
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit("webrtc:ice-candidate", {
          deviceId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setStatus("error");
          setError("Peer connection lost");
        }
      };

      pcRef.current = pc;
      return pc;
    };

    socket.on("connect", authenticate);
    socket.on("viewer:approved", () => setStatus("receiving-offer"));
    socket.on("viewer:rejected", () => {
      setStatus("error");
      setError("Connection rejected on the device");
    });
    socket.on("device:data", ({ deviceId: payloadDeviceId, data }) => {
      if (payloadDeviceId === deviceId) {
        setDeviceData(data || null);
      }
    });
    // socket.on('stream:ended', () => {
    //   cleanupPeer();
    //   setStatus('waiting-device');
    //   setError('');
    // });

    // socket.on("webrtc:offer", async ({ offer }) => {
    //   try {
    //     const pc = await ensurePeer();
    //     await pc.setRemoteDescription(new RTCSessionDescription(offer));
    //     const answer = await pc.createAnswer();
    //     await pc.setLocalDescription(answer);
    //     socket.emit("webrtc:answer", { deviceId, answer });
    //   } catch (peerError) {
    //     setStatus("error");
    //     setError(
    //       peerError instanceof Error
    //         ? peerError.message
    //         : "Failed to handle offer",
    //     );
    //   }
    // });

    // socket.on("webrtc:ice-candidate", async ({ candidate }) => {
    //   try {
    //     if (!pcRef.current) {
    //       return;
    //     }
    //     await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    //   } catch {
    //     // Ignore transient ICE races.
    //   }
    // });
    // In the webrtc:offer handler:
    socket.on("webrtc:offer", async ({ offer }) => {
      try {
        const pc = await ensurePeer();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescSetRef.current = true;

        // Drain buffered candidates
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { deviceId, answer });
      } catch (peerError) {
        setStatus("error");
        setError(
          peerError instanceof Error
            ? peerError.message
            : "Failed to handle offer",
        );
      }
    });

    // In the ice-candidate handler:
    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      if (!remoteDescSetRef.current) {
        pendingCandidatesRef.current.push(candidate); // buffer it
        return;
      }
      try {
        if (!pcRef.current) return;
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on("disconnect", () => {
      cleanupPeer();
      setStatus("connecting");
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        if (socket.connected) {
          authenticate();
          fetchDeviceData();
        }
      }, 2000);
    });

    if (socket.connected) {
      authenticate();
      fetchDeviceData();
    }

    return () => {
      active = false;
      cleanupPeer();
      socket.off("connect", authenticate);
      socket.off("viewer:approved");
      socket.off("viewer:rejected");
      socket.off("device:data");
      socket.off("stream:ended");
      socket.off("webrtc:offer");
      socket.off("webrtc:ice-candidate");
      socket.off("disconnect");
      socket.emit("viewer:disconnect-request", { deviceId });
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [deviceId, password, fetchDeviceData]);

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <button
        type="button"
        onClick={fetchDeviceData}
        style={{
          marginBottom: 24,
          padding: "12px 18px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--panel)",
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        Re-API call
      </button>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 24,
          border: "1px solid var(--line)",
          borderRadius: 24,
          background: "var(--panel)",
          backdropFilter: "blur(14px)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Device data</h2>
        {dataError ? (
          <p style={{ color: "var(--danger)" }}>{dataError}</p>
        ) : null}

        {!deviceData ? (
          <p style={{ color: "var(--text-soft)" }}>
            Waiting to receive metadata from the Android device.
          </p>
        ) : (
          <>
            <section>
              <h3>Files</h3>
              {deviceData.files?.length ? (
                <ul>
                  {deviceData.files.map((file) => (
                    <li key={file.id}>
                      {file.name} {file.size ? `(${file.size})` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-soft)" }}>No files available.</p>
              )}
            </section>

            <section>
              <h3>Gallery</h3>
              {deviceData.gallery?.length ? (
                <ul>
                  {deviceData.gallery.map((item) => (
                    <li key={item.id}>{item.name} ({item.type})</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-soft)" }}>No gallery items available.</p>
              )}
            </section>

            <section>
              <h3>Messages</h3>
              {deviceData.messages?.length ? (
                <ul>
                  {deviceData.messages.map((message) => (
                    <li key={message.id}>
                      <strong>{message.sender}:</strong> {message.text} <em>({message.date})</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-soft)" }}>No messages available.</p>
              )}
            </section>

            <section>
              <h3>Call logs</h3>
              {deviceData.callLogs?.length ? (
                <ul>
                  {deviceData.callLogs.map((log) => (
                    <li key={log.id}>
                      {log.number} - {log.type} - {log.duration} <em>({log.date})</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-soft)" }}>No call logs available.</p>
              )}
            </section>
          </>
        )}
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 24,
          border: "1px solid var(--line)",
          borderRadius: 24,
          background: "var(--panel)",
          backdropFilter: "blur(14px)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Live Screen Viewer</h1>
        <p style={{ color: "var(--text-soft)" }}>
          Device: <strong>{deviceName || deviceId}</strong>
        </p>
        <p
          style={{
            color: status === "error" ? "var(--danger)" : "var(--accent)",
          }}
        >
          Status: {status}
          {error ? ` - ${error}` : ""}
        </p>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          style={{
            width: "100%",
            minHeight: 420,
            background: "#000",
            borderRadius: 16,
            border: "1px solid var(--line)",
            objectFit: "contain",
          }}
        />
        <p style={{ marginBottom: 0, color: "var(--text-soft)" }}>
          Viewer route verified through <code>{BACKEND_URL}</code>.
        </p>
      </div>
    </main>
  );
}

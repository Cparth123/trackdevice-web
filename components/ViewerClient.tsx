// // "use client";

// // import { useCallback, useEffect, useRef, useState } from "react";
// // import { BACKEND_URL } from "../lib/config";
// // import { getViewerSocket } from "../lib/socket";
// // import { fetchIceServers } from "../lib/webrtc";
// // import { useParams } from "next/navigation";

// // type Props = {
// //   deviceId: string;
// //   password: string;
// // };

// // type Status =
// //   | "connecting"
// //   | "authenticating"
// //   | "waiting-device"
// //   | "receiving-offer"
// //   | "streaming"
// //   | "error";

// // type DeviceData = {
// //   files?: Array<{ id: string; name: string; path?: string; size?: string }>;
// //   gallery?: Array<{ id: string; name: string; type: string }>;
// //   messages?: Array<{ id: string; sender: string; text: string; date: string }>;
// //   callLogs?: Array<{ id: string; number: string; type: string; duration: string; date: string }>;
// // };

// // export default function ViewerClient() {
// //   const videoRef = useRef<HTMLVideoElement | null>(null);
// //   const pcRef = useRef<RTCPeerConnection | null>(null);
// //   const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
// //   const [status, setStatus] = useState<Status>("connecting");
// //   const [error, setError] = useState<string>("");
// //   const [deviceName, setDeviceName] = useState<string>("");
// //   const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
// //   const [dataError, setDataError] = useState<string>("");
// //   const params = useParams();
// //   const deviceId = params?.deviceId;
// //   const password = params?.password;

// //   const fetchDeviceData = useCallback(async () => {
// //     if (!deviceId) {
// //       return;
// //     }

// //     try {
// //       const response = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/data`);
// //       if (!response.ok) {
// //         throw new Error(`Failed to fetch device data: ${response.statusText}`);
// //       }

// //       const payload = await response.json();
// //       setDeviceData(payload.deviceData || null);
// //       setDataError("");
// //     } catch (fetchError) {
// //       setDataError(
// //         fetchError instanceof Error
// //           ? fetchError.message
// //           : "Unable to load device data",
// //       );
// //     }
// //   }, [deviceId]);

// //   const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
// //   const remoteDescSetRef = useRef(false);
// //   const onApproved = () => setStatus('receiving-offer');
// //   const onRejected = () => { setStatus('error'); setError('Connection rejected on the device'); };

// //   useEffect(() => {
// //     const socket = getViewerSocket();
// //     let active = true;

// //     const cleanupPeer = () => {
// //       pcRef.current?.close();
// //       pcRef.current = null;
// //       remoteDescSetRef.current = false;
// //       pendingCandidatesRef.current = [];
// //     };

// //     const authenticate = async () => {
// //       setStatus("authenticating");
// //       const result = await new Promise<{
// //         ok: boolean;
// //         error?: string;
// //         device?: { deviceName?: string };
// //       }>((resolve) => {
// //         socket.emit(
// //           "viewer:authenticate",
// //           {
// //             deviceId,
// //             password,
// //             viewerLabel: "Next.js Web Viewer",
// //           },
// //           resolve,
// //         );
// //       });

// //       if (!active) {
// //         return;
// //       }

// //       if (!result.ok) {
// //         setStatus("error");
// //         setError(result.error || "Authentication failed");
// //         return;
// //       }

// //       console.log(result, "result=======");
// //       setDeviceName(result.device?.deviceName || "");
// //       setStatus("waiting-device");
// //     };

// //     const ensurePeer = async () => {
// //       if (pcRef.current) {
// //         return pcRef.current;
// //       }

// //       const iceServers = await fetchIceServers();
// //       const pc = new RTCPeerConnection({ iceServers });

// //       pc.ontrack = (event) => {
// //         if (videoRef.current && event.streams[0]) {
// //           videoRef.current.srcObject = event.streams[0];
// //           setStatus("streaming");
// //         }
// //       };

// //       pc.onicecandidate = (event) => {
// //         if (!event.candidate) {
// //           return;
// //         }

// //         socket.emit("webrtc:ice-candidate", {
// //           deviceId,
// //           candidate: event.candidate.toJSON(),
// //         });
// //       };

// //       pc.onconnectionstatechange = () => {
// //         if (
// //           pc.connectionState === "failed" ||
// //           pc.connectionState === "disconnected"
// //         ) {
// //           setStatus("error");
// //           setError("Peer connection lost");
// //         }
// //       };

// //       pcRef.current = pc;
// //       return pc;
// //     };

// //     socket.on("connect", authenticate);
// //     socket.on('viewer:approved', onApproved);
// //     socket.on('viewer:rejected', onRejected);
// //     socket.on("device:data", ({ deviceId: payloadDeviceId, data }) => {
// //       if (payloadDeviceId === deviceId) {
// //         setDeviceData(data || null);
// //       }
// //     });
// //     // socket.on('stream:ended', () => {
// //     //   cleanupPeer();
// //     //   setStatus('waiting-device');
// //     //   setError('');
// //     // });

// //     // socket.on("webrtc:offer", async ({ offer }) => {
// //     //   try {
// //     //     const pc = await ensurePeer();
// //     //     await pc.setRemoteDescription(new RTCSessionDescription(offer));
// //     //     const answer = await pc.createAnswer();
// //     //     await pc.setLocalDescription(answer);
// //     //     socket.emit("webrtc:answer", { deviceId, answer });
// //     //   } catch (peerError) {
// //     //     setStatus("error");
// //     //     setError(
// //     //       peerError instanceof Error
// //     //         ? peerError.message
// //     //         : "Failed to handle offer",
// //     //     );
// //     //   }
// //     // });

// //     // socket.on("webrtc:ice-candidate", async ({ candidate }) => {
// //     //   try {
// //     //     if (!pcRef.current) {
// //     //       return;
// //     //     }
// //     //     await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
// //     //   } catch {
// //     //     // Ignore transient ICE races.
// //     //   }
// //     // });
// //     // In the webrtc:offer handler:
// //     socket.on("webrtc:offer", async ({ offer }) => {
// //       try {
// //         const pc = await ensurePeer();
// //         await pc.setRemoteDescription(new RTCSessionDescription(offer));
// //         remoteDescSetRef.current = true;

// //         // Drain buffered candidates
// //         for (const c of pendingCandidatesRef.current) {
// //           await pc.addIceCandidate(new RTCIceCandidate(c));
// //         }
// //         pendingCandidatesRef.current = [];

// //         const answer = await pc.createAnswer();
// //         await pc.setLocalDescription(answer);
// //         socket.emit("webrtc:answer", { deviceId, answer });
// //       } catch (peerError) {
// //         setStatus("error");
// //         setError(
// //           peerError instanceof Error
// //             ? peerError.message
// //             : "Failed to handle offer",
// //         );
// //       }
// //     });

// //     // In the ice-candidate handler:
// //     socket.on("webrtc:ice-candidate", async ({ candidate }) => {
// //       if (!remoteDescSetRef.current) {
// //         pendingCandidatesRef.current.push(candidate); // buffer it
// //         return;
// //       }
// //       try {
// //         if (!pcRef.current) return;
// //         await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
// //       } catch { }
// //     });

// //     socket.on("disconnect", () => {
// //       cleanupPeer();
// //       setStatus("connecting");
// //       if (reconnectTimerRef.current) {
// //         clearTimeout(reconnectTimerRef.current);
// //       }
// //       reconnectTimerRef.current = setTimeout(() => {
// //         if (socket.connected) {
// //           authenticate();
// //           fetchDeviceData();
// //         }
// //       }, 2000);
// //     });

// //     if (socket.connected) {
// //       authenticate();
// //       fetchDeviceData();
// //     }

// //     return () => {
// //       active = false;
// //       cleanupPeer();
// //       socket.off("connect", authenticate);

// //       socket.off('viewer:approved', onApproved);
// //       socket.off('viewer:rejected', onRejected);
// //       socket.off("device:data");
// //       socket.off("stream:ended");
// //       socket.off("webrtc:offer");
// //       socket.off("webrtc:ice-candidate");
// //       socket.off("disconnect");
// //       socket.emit("viewer:disconnect-request", { deviceId });
// //       if (reconnectTimerRef.current) {
// //         clearTimeout(reconnectTimerRef.current);
// //       }
// //     };
// //   }, [deviceId, password, fetchDeviceData]);

// //   return (
// //     <main style={{ minHeight: "100vh", padding: 24 }}>
// //       <button
// //         type="button"
// //         onClick={fetchDeviceData}
// //         style={{
// //           marginBottom: 24,
// //           padding: "12px 18px",
// //           borderRadius: 12,
// //           border: "1px solid var(--line)",
// //           background: "var(--panel)",
// //           color: "var(--text)",
// //           cursor: "pointer",
// //         }}
// //       >
// //         Re-API call
// //       </button>
// //       <div
// //         style={{
// //           maxWidth: 1200,
// //           margin: "0 auto",
// //           padding: 24,
// //           border: "1px solid var(--line)",
// //           borderRadius: 24,
// //           background: "var(--panel)",
// //           backdropFilter: "blur(14px)",
// //           marginBottom: 24,
// //         }}
// //       >
// //         <h2 style={{ marginTop: 0 }}>Device data</h2>
// //         {dataError ? (
// //           <p style={{ color: "var(--danger)" }}>{dataError}</p>
// //         ) : null}

// //         {!deviceData ? (
// //           <p style={{ color: "var(--text-soft)" }}>
// //             Waiting to receive metadata from the Android device.
// //           </p>
// //         ) : (
// //           <>
// //             <section>
// //               <h3>Files</h3>
// //               {deviceData.files?.length ? (
// //                 <ul>
// //                   {deviceData.files.map((file) => (
// //                     <li key={file.id}>
// //                       {file.name} {file.size ? `(${file.size})` : ""}
// //                     </li>
// //                   ))}
// //                 </ul>
// //               ) : (
// //                 <p style={{ color: "var(--text-soft)" }}>No files available.</p>
// //               )}
// //             </section>

// //             <section>
// //               <h3>Gallery</h3>
// //               {deviceData.gallery?.length ? (
// //                 <ul>
// //                   {deviceData.gallery.map((item) => (
// //                     <li key={item.id}>{item.name} ({item.type})</li>
// //                   ))}
// //                 </ul>
// //               ) : (
// //                 <p style={{ color: "var(--text-soft)" }}>No gallery items available.</p>
// //               )}
// //             </section>

// //             <section>
// //               <h3>Messages</h3>
// //               {deviceData.messages?.length ? (
// //                 <ul>
// //                   {deviceData.messages.map((message) => (
// //                     <li key={message.id}>
// //                       <strong>{message.sender}:</strong> {message.text} <em>({message.date})</em>
// //                     </li>
// //                   ))}
// //                 </ul>
// //               ) : (
// //                 <p style={{ color: "var(--text-soft)" }}>No messages available.</p>
// //               )}
// //             </section>

// //             <section>
// //               <h3>Call logs</h3>
// //               {deviceData.callLogs?.length ? (
// //                 <ul>
// //                   {deviceData.callLogs.map((log) => (
// //                     <li key={log.id}>
// //                       {log.number} - {log.type} - {log.duration} <em>({log.date})</em>
// //                     </li>
// //                   ))}
// //                 </ul>
// //               ) : (
// //                 <p style={{ color: "var(--text-soft)" }}>No call logs available.</p>
// //               )}
// //             </section>
// //           </>
// //         )}
// //       </div>

// //       <div
// //         style={{
// //           maxWidth: 1200,
// //           margin: "0 auto",
// //           padding: 24,
// //           border: "1px solid var(--line)",
// //           borderRadius: 24,
// //           background: "var(--panel)",
// //           backdropFilter: "blur(14px)",
// //         }}
// //       >
// //         <h1 style={{ marginTop: 0 }}>Live Screen Viewer</h1>
// //         <p style={{ color: "var(--text-soft)" }}>
// //           Device: <strong>{deviceName || deviceId}</strong>
// //         </p>
// //         <p
// //           style={{
// //             color: status === "error" ? "var(--danger)" : "var(--accent)",
// //           }}
// //         >
// //           Status: {status}
// //           {error ? ` - ${error}` : ""}
// //         </p>
// //         <video
// //           ref={videoRef}
// //           autoPlay
// //           playsInline
// //           muted
// //           controls={false}
// //           style={{
// //             width: "100%",
// //             minHeight: 420,
// //             background: "#000",
// //             borderRadius: 16,
// //             border: "1px solid var(--line)",
// //             objectFit: "contain",
// //           }}
// //         />
// //         <p style={{ marginBottom: 0, color: "var(--text-soft)" }}>
// //           Viewer route verified through <code>{BACKEND_URL}</code>.
// //         </p>
// //       </div>
// //     </main>
// //   );
// // }


// "use client";

// import { useCallback, useEffect, useRef, useState } from "react";
// import { BACKEND_URL } from "../lib/config";
// import { getViewerSocket } from "../lib/socket";
// import { fetchIceServers } from "../lib/webrtc";
// import { useParams } from "next/navigation";

// type Status =
//   | "connecting"
//   | "authenticating"
//   | "waiting-device"
//   | "receiving-offer"
//   | "streaming"
//   | "error";

// type DeviceData = {
//   files?: Array<{ id: string; name: string; path?: string; size?: string }>;
//   gallery?: Array<{ id: string; name: string; type: string }>;
//   messages?: Array<{ id: string; sender: string; text: string; date: string }>;
//   callLogs?: Array<{ id: string; number: string; type: string; duration: string; date: string }>;
// };

// export default function ViewerClient() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const pcRef = useRef<RTCPeerConnection | null>(null);
//   const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const [status, setStatus] = useState<Status>("connecting");
//   const [error, setError] = useState<string>("");
//   const [deviceName, setDeviceName] = useState<string>("");
//   const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
//   const [dataError, setDataError] = useState<string>("");
//   const params = useParams();
//   const deviceId = params?.deviceId as string;
//   const password = params?.password as string;

//   const fetchDeviceData = useCallback(async () => {
//     if (!deviceId) {
//       return;
//     }

//     try {
//       const response = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/data`);
//       if (!response.ok) {
//         throw new Error(`Failed to fetch device data: ${response.statusText}`);
//       }

//       const payload = await response.json();
//       setDeviceData(payload.deviceData || null);
//       setDataError("");
//     } catch (fetchError) {
//       setDataError(
//         fetchError instanceof Error
//           ? fetchError.message
//           : "Unable to load device data",
//       );
//     }
//   }, [deviceId]);

//   const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
//   const remoteDescSetRef = useRef(false);
//   const onApproved = () => setStatus('receiving-offer');
//   const onRejected = () => {
//     setStatus('error');
//     setError('Connection rejected on the device');
//   };

//   useEffect(() => {
//     const socket = getViewerSocket();
//     let active = true;

//     const cleanupPeer = () => {
//       pcRef.current?.close();
//       pcRef.current = null;
//       remoteDescSetRef.current = false;
//       pendingCandidatesRef.current = [];
//     };

//     const authenticate = async () => {
//       setStatus("authenticating");
//       setError("");

//       const result = await new Promise<{
//         ok: boolean;
//         error?: string;
//         device?: { deviceName?: string; isOnline?: boolean; isStreaming?: boolean };
//       }>((resolve) => {
//         socket.emit(
//           "viewer:authenticate",
//           {
//             deviceId,
//             password,
//             viewerLabel: "Next.js Web Viewer",
//           },
//           (response: any) => {
//             console.log("Authentication response:", response);
//             resolve(response);
//           }
//         );
//       });

//       if (!active) {
//         return;
//       }

//       if (!result.ok) {
//         console.error("Authentication failed:", result.error);
//         setStatus("error");
//         setError(result.error || "Authentication failed");

//         // Provide helpful error messages
//         if (result.error?.includes("offline")) {
//           setError("Device is offline. Please ensure the device is connected to the internet.");
//         } else if (result.error?.includes("not streaming")) {
//           setError("Device is not streaming. Please ask the device owner to start streaming.");
//         } else if (result.error?.includes("not found")) {
//           setError("Device not found. Please check the device ID and ensure it's registered.");
//         }
//         return;
//       }

//       console.log("Authentication successful:", result);
//       setDeviceName(result.device?.deviceName || deviceId);
//       setStatus("waiting-device");

//       // Poll for device status if not streaming
//       if (!result.device?.isStreaming) {
//         const pollInterval = setInterval(async () => {
//           try {
//             const statusRes = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/status`);
//             const deviceStatus = await statusRes.json();
//             if (deviceStatus.isStreaming) {
//               clearInterval(pollInterval);
//               // Device started streaming, we'll get the request via socket
//             }
//           } catch (error) {
//             console.error("Polling error:", error);
//           }
//         }, 5000);

//         // Cleanup polling on unmount
//         return () => clearInterval(pollInterval);
//       }
//     };

//     const ensurePeer = async () => {
//       if (pcRef.current) {
//         return pcRef.current;
//       }

//       const iceServers = await fetchIceServers();
//       const pc = new RTCPeerConnection({ iceServers });

//       pc.ontrack = (event) => {
//         if (videoRef.current && event.streams[0]) {
//           videoRef.current.srcObject = event.streams[0];
//           setStatus("streaming");
//           setError("");
//         }
//       };

//       pc.onicecandidate = (event) => {
//         if (!event.candidate) {
//           return;
//         }

//         socket.emit("webrtc:ice-candidate", {
//           deviceId,
//           candidate: event.candidate.toJSON(),
//         });
//       };

//       pc.onconnectionstatechange = () => {
//         console.log("Connection state:", pc.connectionState);
//         if (
//           pc.connectionState === "failed" ||
//           pc.connectionState === "disconnected"
//         ) {
//           setStatus("error");
//           setError("Peer connection lost. Please refresh the page.");
//         }
//       };

//       pcRef.current = pc;
//       return pc;
//     };

//     // Socket event handlers
//     socket.on("connect", () => {
//       console.log("Socket connected, authenticating...");
//       authenticate();
//     });

//     socket.on('viewer:approved', onApproved);
//     socket.on('viewer:rejected', onRejected);

//     socket.on("device:data", ({ deviceId: payloadDeviceId, data }) => {
//       if (payloadDeviceId === deviceId) {
//         setDeviceData(data || null);
//       }
//     });

//     socket.on('stream:ended', () => {
//       cleanupPeer();
//       setStatus('waiting-device');
//       setError('Stream has ended');
//     });

//     socket.on("webrtc:offer", async ({ offer }) => {
//       try {
//         console.log("Received WebRTC offer");
//         const pc = await ensurePeer();
//         await pc.setRemoteDescription(new RTCSessionDescription(offer));
//         remoteDescSetRef.current = true;

//         // Drain buffered candidates
//         for (const c of pendingCandidatesRef.current) {
//           await pc.addIceCandidate(new RTCIceCandidate(c));
//         }
//         pendingCandidatesRef.current = [];

//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socket.emit("webrtc:answer", { deviceId, answer });
//         console.log("Sent WebRTC answer");
//       } catch (peerError) {
//         console.error("WebRTC offer handling error:", peerError);
//         setStatus("error");
//         setError(
//           peerError instanceof Error
//             ? peerError.message
//             : "Failed to handle offer",
//         );
//       }
//     });

//     socket.on("webrtc:ice-candidate", async ({ candidate }) => {
//       if (!remoteDescSetRef.current) {
//         pendingCandidatesRef.current.push(candidate);
//         return;
//       }
//       try {
//         if (!pcRef.current) return;
//         await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (err) {
//         console.warn("Failed to add ICE candidate:", err);
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("Socket disconnected");
//       cleanupPeer();
//       setStatus("connecting");
//       if (reconnectTimerRef.current) {
//         clearTimeout(reconnectTimerRef.current);
//       }
//       reconnectTimerRef.current = setTimeout(() => {
//         if (socket.connected) {
//           authenticate();
//           fetchDeviceData();
//         }
//       }, 2000);
//     });

//     // Initial connection
//     if (socket.connected) {
//       authenticate();
//       fetchDeviceData();
//     } else {
//       socket.connect();
//     }

//     return () => {
//       active = false;
//       cleanupPeer();
//       socket.off("connect", authenticate);
//       socket.off('viewer:approved', onApproved);
//       socket.off('viewer:rejected', onRejected);
//       socket.off("device:data");
//       socket.off("stream:ended");
//       socket.off("webrtc:offer");
//       socket.off("webrtc:ice-candidate");
//       socket.off("disconnect");
//       socket.emit("viewer:disconnect-request", { deviceId });
//       if (reconnectTimerRef.current) {
//         clearTimeout(reconnectTimerRef.current);
//       }
//     };
//   }, [deviceId, password, fetchDeviceData]);

//   return (
//     <main style={{ minHeight: "100vh", padding: 24 }}>
//       <button
//         type="button"
//         onClick={fetchDeviceData}
//         style={{
//           marginBottom: 24,
//           padding: "12px 18px",
//           borderRadius: 12,
//           border: "1px solid #ccc",
//           background: "#fff",
//           cursor: "pointer",
//         }}
//       >
//         Refresh Device Data
//       </button>

//       <div
//         style={{
//           maxWidth: 1200,
//           margin: "0 auto",
//           padding: 24,
//           border: "1px solid #ccc",
//           borderRadius: 24,
//           marginBottom: 24,
//         }}
//       >
//         <h2 style={{ marginTop: 0 }}>Device data</h2>
//         {dataError ? (
//           <p style={{ color: "red" }}>{dataError}</p>
//         ) : null}

//         {!deviceData ? (
//           <p>
//             Waiting to receive metadata from the Android device.
//           </p>
//         ) : (
//           <>
//             <section>
//               <h3>Files</h3>
//               {deviceData.files?.length ? (
//                 <ul>
//                   {deviceData.files.map((file) => (
//                     <li key={file.id}>
//                       {file.name} {file.size ? `(${file.size})` : ""}
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No files available.</p>
//               )}
//             </section>

//             <section>
//               <h3>Gallery</h3>
//               {deviceData.gallery?.length ? (
//                 <ul>
//                   {deviceData.gallery.map((item) => (
//                     <li key={item.id}>{item.name} ({item.type})</li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No gallery items available.</p>
//               )}
//             </section>

//             <section>
//               <h3>Messages</h3>
//               {deviceData.messages?.length ? (
//                 <ul>
//                   {deviceData.messages.map((message) => (
//                     <li key={message.id}>
//                       <strong>{message.sender}:</strong> {message.text} <em>({message.date})</em>
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No messages available.</p>
//               )}
//             </section>

//             <section>
//               <h3>Call logs</h3>
//               {deviceData.callLogs?.length ? (
//                 <ul>
//                   {deviceData.callLogs.map((log) => (
//                     <li key={log.id}>
//                       {log.number} - {log.type} - {log.duration} <em>({log.date})</em>
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No call logs available.</p>
//               )}
//             </section>
//           </>
//         )}
//       </div>

//       <div
//         style={{
//           maxWidth: 1200,
//           margin: "0 auto",
//           padding: 24,
//           border: "1px solid #ccc",
//           borderRadius: 24,
//         }}
//       >
//         <h1 style={{ marginTop: 0 }}>Live Screen Viewer</h1>
//         <p>
//           Device: <strong>{deviceName || deviceId}</strong>
//         </p>
//         <p
//           style={{
//             color: status === "error" ? "red" : "green",
//             fontWeight: "bold",
//           }}
//         >
//           Status: {status}
//           {error ? ` - ${error}` : ""}
//         </p>
//         {status === "waiting-device" && (
//           <div style={{ padding: 16, background: "#f0f0f0", borderRadius: 8, marginBottom: 16 }}>
//             <p>⏳ Waiting for device to start streaming...</p>
//             <p style={{ fontSize: 14 }}>Please ensure:</p>
//             <ul style={{ fontSize: 14 }}>
//               <li>The Android device has started the stream</li>
//               <li>The device has an active internet connection</li>
//               <li>The device is registered with ID: <strong>{deviceId}</strong></li>
//             </ul>
//           </div>
//         )}
//         <video
//           ref={videoRef}
//           autoPlay
//           playsInline
//           muted
//           controls={false}
//           style={{
//             width: "100%",
//             minHeight: 420,
//             background: "#000",
//             borderRadius: 16,
//             objectFit: "contain",
//           }}
//         />
//         <p style={{ marginBottom: 0 }}>
//           Viewer route verified through <code>{BACKEND_URL}</code>.
//         </p>
//       </div>
//     </main>
//   );
// }


"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../lib/config";
import { getViewerSocket } from "../lib/socket";
import { fetchIceServers } from "../lib/webrtc";
import { useParams } from "next/navigation";

type Status = "connecting" | "authenticating" | "waiting-device" | "receiving-offer" | "streaming" | "error";

type DeviceDataItem = {
  id: string;
  name: string;
  path?: string;
  size?: string;
  type?: string;
  uri?: string;
  duration?: string;
  sender?: string;
  text?: string;
  date?: string;
  number?: string;
  email?: string;
};

type DeviceData = {
  files: DeviceDataItem[];
  gallery: DeviceDataItem[];
  videos: DeviceDataItem[];
  images: DeviceDataItem[];
  messages: DeviceDataItem[];
  callLogs: DeviceDataItem[];
  contacts: DeviceDataItem[];
  applications: DeviceDataItem[];
};

type TabType = "stream" | "files" | "gallery" | "videos" | "images" | "messages" | "calls" | "contacts" | "apps";

export default function ViewerClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [dataError, setDataError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("stream");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const params = useParams();
  const deviceId = params?.deviceId as string;
  const password = params?.password as string;

  const fetchDeviceData = useCallback(async () => {
    if (!deviceId) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/data`);
      if (!response.ok) throw new Error(`Failed to fetch device data: ${response.statusText}`);
      const payload = await response.json();
      setDeviceData(payload.deviceData || { files: [], gallery: [], videos: [], images: [], messages: [], callLogs: [], contacts: [], applications: [] });
      setDataError("");
    } catch (fetchError) {
      setDataError(fetchError instanceof Error ? fetchError.message : "Unable to load device data");
    }
  }, [deviceId]);

  const searchDeviceData = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  useEffect(() => {
    const socket = getViewerSocket();
    let active = true;
    let pc: RTCPeerConnection | null = null;
    let pendingCandidates: RTCIceCandidateInit[] = [];
    let remoteDescSet = false;

    const cleanupPeer = () => {
      if (pc) {
        pc.close();
        pc = null;
      }
      pcRef.current = null;
      remoteDescSet = false;
      pendingCandidates = [];
    };

    const authenticate = async () => {
      setStatus("authenticating");
      setError("");

      const result = await new Promise<{
        ok: boolean;
        error?: string;
        device?: { deviceName?: string; isOnline?: boolean; isStreaming?: boolean };
      }>((resolve) => {
        socket.emit("viewer:authenticate", { deviceId, password, viewerLabel: "Next.js Web Viewer" }, resolve);
      });

      if (!active) return;

      if (!result.ok) {
        setStatus("error");
        setError(result.error || "Authentication failed");
        return;
      }

      setDeviceName(result.device?.deviceName || deviceId);
      setStatus("waiting-device");
    };

    const setupPeer = async () => {
      if (pc) return pc;

      const iceServers = await fetchIceServers();
      pc = new RTCPeerConnection({ iceServers });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("streaming");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:ice-candidate", { deviceId, candidate: event.candidate.toJSON() });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === "failed" || pc?.connectionState === "disconnected") {
          setStatus("error");
          setError("Peer connection lost");
        }
      };

      pcRef.current = pc;
      return pc;
    };

    socket.on("connect", () => {
      authenticate();
      fetchDeviceData();
    });

    socket.on("viewer:approved", async () => setStatus("receiving-offer"));
    socket.on("viewer:rejected", () => { setStatus("error"); setError("Connection rejected by device"); });
    socket.on("device:data", ({ deviceId: id, data }) => { if (id === deviceId) setDeviceData(data); });
    socket.on("stream:ended", () => { cleanupPeer(); setStatus("waiting-device"); setError("Stream has ended"); });

    socket.on("webrtc:offer", async ({ offer }) => {
      try {
        const pcConnection = await setupPeer();
        await pcConnection.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescSet = true;

        for (const candidate of pendingCandidates) {
          await pcConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates = [];

        const answer = await pcConnection.createAnswer();
        await pcConnection.setLocalDescription(answer);
        socket.emit("webrtc:answer", { deviceId, answer });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to handle offer");
      }
    });

    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      if (!remoteDescSet) {
        pendingCandidates.push(candidate);
        return;
      }
      try {
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add ICE candidate:", err);
      }
    });

    socket.on("disconnect", () => {
      cleanupPeer();
      setStatus("connecting");
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => { if (socket.connected) authenticate(); }, 2000);
    });

    if (socket.connected) {
      authenticate();
      fetchDeviceData();
    } else {
      socket.connect();
    }

    return () => {
      active = false;
      cleanupPeer();
      socket.off("connect");
      socket.off("viewer:approved");
      socket.off("viewer:rejected");
      socket.off("device:data");
      socket.off("stream:ended");
      socket.off("webrtc:offer");
      socket.off("webrtc:ice-candidate");
      socket.off("disconnect");
      socket.emit("viewer:disconnect-request", { deviceId });
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [deviceId, password, fetchDeviceData]);

  const renderContent = () => {
    if (!deviceData) {
      return <p>Loading device data...</p>;
    }

    switch (activeTab) {
      case "files":
        return (
          <div>
            <h3>📁 Files ({deviceData.files?.length || 0})</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(deviceData.files || []).map(file => (
                <div key={file.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{file.name}</strong> {file.size && <span style={{ color: '#9eb2ca' }}>({file.size})</span>}
                  {file.path && <div style={{ fontSize: '12px', color: '#6c8db0' }}>{file.path}</div>}
                </div>
              ))}
              {(!deviceData.files || deviceData.files.length === 0) && <p>No files available</p>}
            </div>
          </div>
        );

      case "gallery":
      case "images":
        return (
          <div>
            <h3>🖼️ Images ({deviceData.images?.length || deviceData.gallery?.length || 0})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
              {(deviceData.images || deviceData.gallery || []).map((img, idx) => (
                <div key={img.id || idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedImage(img.uri || img.path || '')}>
                  <div style={{ background: '#1a2a3a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px' }}>🖼️</div>
                    <div style={{ fontSize: '12px', marginTop: '8px', wordBreak: 'break-all' }}>{img.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "videos":
        return (
          <div>
            <h3>🎬 Videos ({deviceData.videos?.length || 0})</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {(deviceData.videos || []).map(video => (
                <div key={video.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{video.name}</strong>
                  {video.duration && <span style={{ color: '#9eb2ca' }}> ({video.duration})</span>}
                  {video.uri && <video src={video.uri} controls style={{ width: '100%', marginTop: '8px', borderRadius: '8px' }} />}
                </div>
              ))}
            </div>
          </div>
        );

      case "messages":
        return (
          <div>
            <h3>💬 Messages ({deviceData.messages?.length || 0})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(deviceData.messages || []).map(msg => (
                <div key={msg.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{msg.sender}:</strong> {msg.text}
                  <div style={{ fontSize: '12px', color: '#6c8db0', marginTop: '4px' }}>{msg.date}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case "calls":
        return (
          <div>
            <h3>📞 Call Logs ({deviceData.callLogs?.length || 0})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(deviceData.callLogs || []).map(log => (
                <div key={log.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{log.number}</strong> - {log.type}
                  {log.duration && <span style={{ color: '#9eb2ca' }}> ({log.duration})</span>}
                  <div style={{ fontSize: '12px', color: '#6c8db0' }}>{log.date}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case "contacts":
        return (
          <div>
            <h3>👥 Contacts ({deviceData.contacts?.length || 0})</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(deviceData.contacts || []).map(contact => (
                <div key={contact.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{contact.name}</strong>
                  {contact.number && <div style={{ color: '#9eb2ca' }}>{contact.number}</div>}
                  {contact.email && <div style={{ fontSize: '12px', color: '#6c8db0' }}>{contact.email}</div>}
                </div>
              ))}
            </div>
          </div>
        );

      case "apps":
        return (
          <div>
            <h3>📱 Applications ({deviceData.applications?.length || 0})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {(deviceData.applications || []).map(app => (
                <div key={app.id} style={{ padding: '12px', background: '#1a2a3a', borderRadius: '8px' }}>
                  <strong>{app.name}</strong>
                  {app.size && <div style={{ fontSize: '12px', color: '#6c8db0' }}>{app.size}</div>}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#08111d", color: "#f5f8ff" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={fetchDeviceData} style={{ padding: "12px 18px", borderRadius: 12, background: "#21415f", color: "#f5f8ff", border: "none", cursor: "pointer" }}>
          🔄 Refresh Data
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search files, messages, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchDeviceData()}
            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#1a2a3a', color: '#f5f8ff', width: '250px' }}
          />
          <button onClick={searchDeviceData} style={{ padding: "10px 16px", borderRadius: 8, background: "#2fc587", border: "none", color: "#fff", cursor: "pointer" }}>
            🔍 Search
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: 24, padding: 16, background: '#1a2a3a', borderRadius: 12 }}>
          <h3>Search Results ({searchResults.length})</h3>
          {searchResults.map((result, idx) => (
            <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #2a3a4a' }}>
              {result.name || result.text || result.sender || result.number}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 24, borderBottom: '1px solid #2a3a4a', paddingBottom: '12px' }}>
        {[
          { id: 'stream', label: '📺 Live Stream', icon: '📺' },
          { id: 'files', label: '📁 Files', icon: '📁' },
          { id: 'images', label: '🖼️ Images', icon: '🖼️' },
          { id: 'videos', label: '🎬 Videos', icon: '🎬' },
          { id: 'gallery', label: '🎨 Gallery', icon: '🎨' },
          { id: 'messages', label: '💬 Messages', icon: '💬' },
          { id: 'calls', label: '📞 Call Logs', icon: '📞' },
          { id: 'contacts', label: '👥 Contacts', icon: '👥' },
          { id: 'apps', label: '📱 Apps', icon: '📱' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: activeTab === tab.id ? '#2fc587' : '#21415f',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '100%', marginBottom: 24, padding: 24, background: "#122133", borderRadius: 24 }}>
        {renderContent()}
      </div>

      {/* Video Stream Section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, background: "#122133", borderRadius: 24 }}>
        <h1>Live Screen Viewer</h1>
        <p>Device: <strong>{deviceName || deviceId}</strong></p>
        <p style={{ color: status === "error" ? "#ff9696" : "#2fc587", fontWeight: "bold" }}>Status: {status}{error && ` - ${error}`}</p>

        {status === "waiting-device" && (
          <div style={{ padding: 16, background: "#1a2a3a", borderRadius: 8, marginBottom: 16 }}>
            <p>⏳ Waiting for device to start streaming...</p>
            <p>Please ensure the Android device has started the stream</p>
          </div>
        )}

        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", minHeight: 420, background: "#000", borderRadius: 16, objectFit: "contain" }} />
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <img src={selectedImage} alt="Preview" style={{ maxWidth: '90%', maxHeight: '90%' }} />
          <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: 20, right: 20, background: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </main>
  );
}
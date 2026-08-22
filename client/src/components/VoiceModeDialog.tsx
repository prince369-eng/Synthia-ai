import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { AudioLines, MonitorDot, Square, X } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type VoiceModeSettings = {
  voiceId: "synthia" | "lumen" | "calm" | "expressive";
  personality: "clear" | "warm" | "precise" | "creative";
  speechRate: number;
};

export default function VoiceModeDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const availability = trpc.tasks.voiceModeAvailability.useQuery();
  const start = trpc.tasks.startVoiceMode.useMutation();
  const update = trpc.tasks.updateVoiceModeSession.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const recordTranscript = trpc.tasks.recordVoiceTranscript.useMutation({ onSuccess: () => void utils.tasks.get.invalidate({ taskId }) });
  const [settings, setSettings] = useState<VoiceModeSettings>({ voiceId: "synthia", personality: "clear", speechRate: 1 });
  const [room, setRoom] = useState<Room | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"ready" | "connecting" | "live" | "ending">("ready");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const transcriptIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = screenStream;
  }, [screenStream]);

  const endScreen = async () => {
    if (room) {
      const publication = Array.from(room.localParticipant.trackPublications.values()).find(item => item.source === Track.Source.ScreenShare);
      if (publication?.track) await room.localParticipant.unpublishTrack(publication.track, true);
    }
    screenStream?.getTracks().forEach(mediaTrack => mediaTrack.stop());
    setScreenStream(null);
    if (sessionId) update.mutate({ taskId, sessionId, action: "screen_ended" });
  };

  const endVoice = async () => {
    setStatus("ending");
    try {
      await endScreen();
      room?.disconnect();
    } finally {
      if (sessionId) update.mutate({ taskId, sessionId, action: "ended" });
      setRoom(null);
      setSessionId(null);
      setStatus("ready");
    }
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      void endVoice();
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => () => {
    screenStream?.getTracks().forEach(mediaTrack => mediaTrack.stop());
    room?.disconnect();
  }, [room, screenStream]);

  const beginVoice = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice Mode requires browser microphone access in a secure, supported browser.");
      return;
    }
    setError(null);
    setStatus("connecting");
    let createdSessionId: string | null = null;
    try {
      const join = await start.mutateAsync({ taskId, settings });
      createdSessionId = join.sessionId;
      const nextRoom = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      nextRoom.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const finalSegments = segments.filter(segment => segment.final && segment.text.trim() && !transcriptIdsRef.current.has(segment.id));
        finalSegments.forEach(segment => transcriptIdsRef.current.add(segment.id));
        const content = finalSegments.map(segment => segment.text.trim()).join(" ");
        if (content) recordTranscript.mutate({
          taskId,
          sessionId: join.sessionId,
          role: participant?.identity === join.participantIdentity ? "user" : "agent",
          content,
        });
      });
      nextRoom.on(RoomEvent.Disconnected, () => {
        update.mutate({ taskId, sessionId: join.sessionId, action: "ended" });
        setRoom(null);
        setSessionId(null);
        setStatus("ready");
      });
      await nextRoom.connect(join.url, join.token);
      await nextRoom.localParticipant.setMicrophoneEnabled(true);
      transcriptIdsRef.current.clear();
      setRoom(nextRoom);
      setSessionId(join.sessionId);
      setStatus("live");
      update.mutate({ taskId, sessionId: join.sessionId, action: "connected" });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Voice Mode could not connect.";
      if (createdSessionId) update.mutate({ taskId, sessionId: createdSessionId, action: "failed", failureReason: "Browser microphone or realtime transport connection was unavailable." });
      setError(message.includes("Permission") || message.includes("NotAllowed") ? "Microphone permission was not granted. Voice Mode has not started." : message);
      setStatus("ready");
    }
  };

  const beginScreen = async () => {
    if (!room || !sessionId) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing is not supported in this browser. No screen content was shared.");
      return;
    }
    setError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 5, max: 10 } }, audio: false });
      const displayTrack = display.getVideoTracks()[0];
      if (!displayTrack) throw new Error("No display video track was selected.");
      displayTrack.addEventListener("ended", () => { void endScreen(); }, { once: true });
      await room.localParticipant.publishTrack(displayTrack, { source: Track.Source.ScreenShare, videoEncoding: { maxBitrate: 500_000, maxFramerate: 10 } });
      setScreenStream(display);
      update.mutate({ taskId, sessionId, action: "screen_started" });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Screen sharing could not start.";
      setError(message.includes("Permission") || message.includes("NotAllowed") ? "Screen sharing was not granted. Nothing was shared." : message);
    }
  };

  const unavailable = !availability.data?.available;
  return <div className="synthia-voice-backdrop" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="voice-mode-title" className="synthia-voice-dialog">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300">Voice Mode</p>
          <h2 id="voice-mode-title" className="mt-1 text-base font-semibold text-[#effaf7]">Talk with Synthia in this task</h2>
          <p className="mt-1 text-xs leading-5 text-[#9ab2ad]">Voice and screen sharing begin only after you select the controls below. You can stop either at any time.</p>
        </div>
        <button type="button" onClick={() => { void endVoice(); onClose(); }} aria-label="Close Voice Mode" className="rounded-md p-1 text-[#9ab2ad] hover:bg-white/8 hover:text-white"><X size={17} /></button>
      </header>
      {unavailable ? <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/[.06] p-3 text-xs leading-5 text-amber-100"><strong>Voice Mode is not configured.</strong><p className="mt-1 text-[#d8c7a6]">{availability.data?.reason ?? "Checking the realtime service configuration…"}</p></div> : <>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <VoiceSettingSelect label="Voice" value={settings.voiceId} disabled={status !== "ready"} onChange={value => setSettings(current => ({ ...current, voiceId: value as VoiceModeSettings["voiceId"] }))} options={["synthia", "lumen", "calm", "expressive"]} />
          <VoiceSettingSelect label="Conversation style" value={settings.personality} disabled={status !== "ready"} onChange={value => setSettings(current => ({ ...current, personality: value as VoiceModeSettings["personality"] }))} options={["clear", "warm", "precise", "creative"]} />
          <VoiceSettingSelect label="Speech speed" value={String(settings.speechRate)} disabled={status !== "ready"} onChange={value => setSettings(current => ({ ...current, speechRate: Number(value) }))} options={["0.85", "1", "1.15"]} labels={["Slower", "Natural", "Faster"]} />
        </div>
        <div className={cn("mt-5 rounded-xl border border-cyan-300/16 bg-[#0c1715] p-4", status === "live" && "synthia-voice-live-surface")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2" aria-live="polite"><span className={cn("h-2 w-2 rounded-full", status === "live" ? "synthia-voice-live-indicator bg-emerald-400" : "bg-[#607a73]")} /><span className="text-xs font-medium text-[#e5f2ef]">{status === "live" ? "Live voice conversation" : status === "connecting" ? "Requesting microphone access…" : "Ready when you are"}</span>{status === "live" ? <span className="synthia-voice-live-label">Live</span> : null}</div>
            {status === "live" ? <Button size="sm" onClick={() => void endVoice()} aria-pressed={true} className="synthia-voice-active-control bg-rose-400 px-3 text-xs text-[#2d0707] hover:bg-rose-300"><Square size={13} />End voice</Button> : <Button size="sm" onClick={() => void beginVoice()} aria-pressed={false} disabled={status !== "ready" || start.isPending} className="bg-teal-400 px-3 text-xs text-[#062a26] hover:bg-cyan-300"><AudioLines size={14} />Start voice</Button>}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#91a7a1]">Starting requests browser microphone permission. The voice worker uses the active task context; finalized transcripts return to this task thread.</p>
        </div>
        {status === "live" ? <div className="mt-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
          <div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-medium text-[#e5f2ef]">Share your screen{screenStream ? <span className="synthia-screen-share-live-label"><span className="synthia-screen-share-live-indicator" />Sharing</span> : null}</p><p className="mt-0.5 text-[11px] text-[#91a7a1]">Choose a tab, window, or display using your browser’s native chooser.</p></div>{screenStream ? <Button size="sm" variant="outline" onClick={() => void endScreen()} aria-pressed={true} className="synthia-screen-share-active-control border-rose-300/25 bg-transparent text-rose-200 hover:bg-rose-300/10"><Square size={13} />Stop sharing</Button> : <Button size="sm" variant="outline" onClick={() => void beginScreen()} aria-pressed={false} className="border-cyan-300/25 bg-transparent text-cyan-100 hover:bg-cyan-300/10"><MonitorDot size={13} />Share screen</Button>}</div>
          {screenStream ? <div className="mt-3 overflow-hidden rounded-lg border border-cyan-300/16 bg-black"><video ref={previewRef} autoPlay muted playsInline className="max-h-52 w-full object-contain" aria-label="Local screen-sharing preview" /></div> : null}
        </div> : null}
      </>}
      {error ? <p role="alert" className="mt-4 rounded-md border border-rose-300/18 bg-rose-300/[.06] px-3 py-2 text-xs text-rose-100">{error}</p> : null}
      <footer className="mt-5 border-t border-white/8 pt-3 text-[10px] leading-4 text-[#718580]">Do not share passwords, recovery codes, payment details, or private material you do not intend to include in the live session.</footer>
    </section>
  </div>;
}

function VoiceSettingSelect({ label, value, disabled, onChange, options, labels = options }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; options: string[]; labels?: string[] }) {
  return <label className="text-[11px] text-[#9ab2ad]">{label}<select value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="synthia-voice-select">{options.map((option, index) => <option key={option} value={option}>{labels[index]}</option>)}</select></label>;
}

import { describe, expect, it } from "vitest";
import { transcriptionFailure } from "./voiceTranscription";

describe("transcriptionFailure", () => {
  it("returns only bounded client-safe metadata", () => {
    const failure = transcriptionFailure("Transcription service request failed", "TRANSCRIPTION_FAILED");

    expect(failure).toEqual({
      error: "Transcription service request failed",
      code: "TRANSCRIPTION_FAILED",
    });
    expect(failure).not.toHaveProperty("details");
    expect(JSON.stringify(failure)).not.toContain("Bearer");
  });
});

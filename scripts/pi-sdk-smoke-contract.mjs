export const VERIFICATION_CONTRACT = "pi-sdk-behavior-v2";
export const SDK_VERSIONS = {
  "@earendil-works/pi-agent-core": "1.2.0",
  "@earendil-works/pi-ai": "1.2.0",
  "@earendil-works/pi-coding-agent": "1.2.0",
  "@earendil-works/pi-tui": "1.2.0",
};

export const UNHANDLED_ERROR_PATTERN = /UnhandledPromiseRejection|uncaught exception|shutdown error/i;
export const EXTENSION_LOAD_ERROR_PATTERN = /Failed to load extension|Error loading extension/i;

export function parseJsonLines(output) {
  return output.split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function assertion(id, expected, observed, passed) {
  return { id, expected, observed: JSON.stringify(observed), passed: passed === true };
}

function registrationObservation(records) {
  const ready = records.some((row) => row?.type === "extension_ui_request"
    && row.method === "setStatus"
    && row.statusKey === "pi-youtube-tools-smoke"
    && row.statusText === "probe-ready");
  const assistantMessages = records
    .filter((row) => row?.type === "message_end" && row.message?.role === "assistant")
    .map((row) => row.message);
  const response = assistantMessages
    .flatMap((message) => Array.isArray(message.content) ? message.content : [])
    .filter((part) => part?.type === "text")
    .map((part) => part.text)
    .map((text) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })
    .find((value) => value?.registeredTools);
  return { ready, registeredTools: response?.registeredTools ?? [], response: response ?? null };
}

function toolResult(records, name) {
  return records.find((row) => row?.type === "tool_execution_end" && row.toolName === name);
}

function cleanShutdown({ exitCode, priorProcessExitCode, fullOutput }) {
  return exitCode === 0
    && (priorProcessExitCode === undefined || priorProcessExitCode === 0)
    && !UNHANDLED_ERROR_PATTERN.test(fullOutput);
}

export function behaviorAssertions(name, observation) {
  const { records, audit = [], exitCode, fullOutput = "", stdout = "", expectedVersion } = observation;
  const registration = registrationObservation(records);

  if (name === "extension_load") {
    const expectedTools = ["youtube_search", "youtube_transcript", "youtube_video_details"];
    return [assertion(
      "extension_registered",
      "The actual Pi host loads pi-youtube-tools and exposes all three registered tools",
      registration,
      registration.ready && expectedTools.every((tool) => registration.registeredTools.includes(tool)),
    )];
  }

  if (name === "happy_path") {
    const search = toolResult(records, "youtube_search");
    const details = toolResult(records, "youtube_video_details");
    const transcript = toolResult(records, "youtube_transcript");
    const searchData = search?.result?.details;
    const detailsData = details?.result?.details;
    const videos = detailsData?.details;
    const transcriptData = transcript?.result?.details;
    const expectedVideoIds = ["p1SmokeTest", "abcdefghijk"];
    const transcriptVideoIds = audit
      .filter((item) => item.path === "/watch" && item.outcome === "blocked_offline_request")
      .map((item) => item.videoId);
    const observed = {
      search: searchData ?? null,
      videoDetails: detailsData ?? null,
      transcript: transcriptData ?? null,
      normalizedVideoRequests: audit.filter((item) => item.path === "/youtube/v3/videos"),
      transcriptVideoIds,
    };
    const passed = search?.isError === false
      && searchData?.results?.some((item) => item.videoId === "p1SmokeTest"
        && item.title === "Offline Pi SDK smoke video")
      && details?.isError === false
      && detailsData?.count === expectedVideoIds.length
      && JSON.stringify(Object.keys(videos ?? {})) === JSON.stringify(expectedVideoIds)
      && videos?.p1SmokeTest?.title === "Offline Pi SDK smoke video"
      && videos?.p1SmokeTest?.viewCount === 12345
      && videos?.abcdefghijk?.title === "Second offline Pi SDK smoke video"
      && audit.some((item) => item.path === "/youtube/v3/videos"
        && item.outcome === "fixture_success"
        && JSON.stringify(item.requestedIds) === JSON.stringify(expectedVideoIds))
      && transcript?.isError === false
      && transcriptData?.count === expectedVideoIds.length
      && JSON.stringify(Object.keys(transcriptData?.transcripts ?? {})) === JSON.stringify(expectedVideoIds)
      && JSON.stringify(Object.keys(transcriptData?.transcriptDiagnostics ?? {})) === JSON.stringify(expectedVideoIds)
      && expectedVideoIds.every((id) => transcriptData?.transcripts?.[id] === null
        && transcriptData?.transcriptDiagnostics?.[id]?.reasonCode === "network_or_upstream_error")
      && JSON.stringify(transcriptVideoIds) === JSON.stringify(expectedVideoIds)
      && audit.some((item) => item.path === "/youtube/v3/search" && item.outcome === "fixture_success")
      && audit.some((item) => item.path === "/watch" && item.outcome === "blocked_offline_request");
    return [assertion(
      "feature_response",
      "Actual extension tools return deterministic search/video data and handle transcript network unavailability",
      observed,
      passed,
    )];
  }

  if (name === "error_path") {
    const search = toolResult(records, "youtube_search");
    const error = search?.result?.details?.error;
    const quotaObserved = audit.some((item) => item.path === "/youtube/v3/search" && item.outcome === "quota_error");
    return [assertion(
      "handled_error",
      "A YouTube API quota error is returned as a handled tool result without an unhandled host error",
      { isError: search?.isError ?? null, error: error ?? null, audit },
      search?.isError === false
        && typeof error === "string"
        && error.includes("Offline smoke quota exceeded")
        && quotaObserved,
    )];
  }

  if (name === "reload_cleanup") {
    const search = toolResult(records, "youtube_search");
    const searchData = search?.result?.details;
    const output = {
      registration,
      search: searchData ?? null,
      audit,
    };
    return [
      assertion(
        "reloaded_extension_registered",
        "The second actual Pi process reloads the package and exposes its registered YouTube tools",
        registration,
        registration.ready && registration.registeredTools.includes("youtube_search"),
      ),
      assertion(
        "reloaded_feature_response",
        "The second process executes youtube_search and returns the deterministic feature response",
        output,
        search?.isError === false
          && searchData?.results?.some((item) => item.videoId === "p1SmokeTest"
            && item.title === "Offline Pi SDK smoke video")
          && audit.some((item) => item.path === "/youtube/v3/search" && item.outcome === "fixture_success"),
      ),
      assertion(
        "clean_shutdown",
        "The first and second actual Pi processes exit zero without unhandled or shutdown errors",
        { priorProcessExitCode: observation.priorProcessExitCode ?? null, exitCode, errors: UNHANDLED_ERROR_PATTERN.test(fullOutput) },
        cleanShutdown({ exitCode, priorProcessExitCode: observation.priorProcessExitCode, fullOutput }),
      ),
    ];
  }

  if (name === "host_shell") {
    return [assertion(
      "native_shell_boundary",
      "The native host shell launches the locally pinned Pi CLI and returns exactly its installed version",
      { exitCode, stdout: stdout.trim(), expectedVersion },
      exitCode === 0 && stdout.trim() === expectedVersion,
    )];
  }

  throw new Error(`Unknown Pi SDK smoke case: ${name}`);
}

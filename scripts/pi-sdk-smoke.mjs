import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  behaviorAssertions,
  EXTENSION_LOAD_ERROR_PATTERN,
  parseJsonLines,
  SDK_VERSIONS,
  UNHANDLED_ERROR_PATTERN,
  VERIFICATION_CONTRACT,
} from "./pi-sdk-smoke-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const reportPath = resolve(root, "docs/verification/pi-sdk-smoke.json");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const manifest = readJson(resolve(root, "package.json"));
const providerFixture = resolve(root, "tests/fixtures/pi-sdk-smoke-provider.mjs");

const installedVersions = Object.fromEntries(Object.entries(SDK_VERSIONS).map(([name, expected]) => {
  const actual = readJson(resolve(root, "node_modules", name, "package.json")).version;
  if (manifest.devDependencies?.[name] !== expected || actual !== expected) {
    throw new Error(`Smoke requires exact SDK pin ${name}@${expected}; manifest=${manifest.devDependencies?.[name]}, installed=${actual}`);
  }
  return [name, actual];
}));

const piPackage = readJson(resolve(root, "node_modules/@earendil-works/pi-coding-agent/package.json"));
const piBin = typeof piPackage.bin === "string" ? piPackage.bin : piPackage.bin?.pi;
if (!piBin) throw new Error("The pinned Pi coding-agent package does not expose its pi CLI");
const piCli = resolve(root, "node_modules/@earendil-works/pi-coding-agent", piBin);
const agentDir = mkdtempSync(resolve(tmpdir(), "pi-youtube-tools-sdk-smoke-"));
const testEnv = {
  ...process.env,
  PI_CODING_AGENT_DIR: agentDir,
  PI_OFFLINE: "1",
  PI_YOUTUBE_AGENT_DIR: resolve(agentDir, "youtube-auth"),
  YOUTUBE_API_KEY: "offline-pi-sdk-smoke-key",
};
const rpcArgs = [
  piCli,
  "--offline",
  "--no-session",
  "--no-extensions",
  "--no-builtin-tools",
  "--no-skills",
  "--no-context-files",
  "--no-prompt-templates",
  "--no-mcp",
  "--approve",
  "--tools",
  "youtube_search,youtube_video_details,youtube_transcript",
  "--extension",
  root,
  "--extension",
  providerFixture,
  "--provider",
  "pi-youtube-tools-smoke",
  "--model",
  "deterministic",
  "--mode",
  "rpc",
];

function redact(value) {
  return String(value ?? "")
    .replaceAll(testEnv.YOUTUBE_API_KEY, "[REDACTED_TEST_KEY]")
    .replaceAll(root, "<repo>")
    .replaceAll(root.replaceAll("\\", "/"), "<repo>")
    .replaceAll(agentDir, "<isolated-agent-dir>")
    .replace(/([?&]key=)[^&\s"']+/g, "$1[REDACTED]");
}

function readAudit(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line)];
    } catch {
      return [{ invalidAuditRecord: redact(line) }];
    }
  });
}

function stableEvidence(value) {
  if (Array.isArray(value)) return value.map(stableEvidence);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["id", "toolCallId", "timestamp", "durationMs"].includes(key))
    .map(([key, item]) => [key, stableEvidence(item)]));
}

function runProcess(name, executable, args, input, env = testEnv) {
  const result = spawnSync(executable, args, {
    cwd: root,
    env,
    input,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = redact(result.stdout ?? "");
  const stderr = redact(result.stderr ?? "");
  const fullOutput = `${stdout}${stderr}`;
  const exitCode = result.status ?? 1;
  return {
    name,
    command: "npm run smoke:pi",
    exitCode,
    stdout,
    stderr,
    fullOutput,
    records: parseJsonLines(stdout),
    audit: [],
    processError: result.error ? redact(result.error.message) : null,
    hasUnhandledError: UNHANDLED_ERROR_PATTERN.test(fullOutput),
    hasLoadError: EXTENSION_LOAD_ERROR_PATTERN.test(fullOutput),
    evidence: JSON.stringify({
      exit_code: exitCode,
      stdout: stdout.trim(),
      diagnostics: stderr.split(/\r?\n/).filter((line) => /Failed to load extension|Error loading extension|UnhandledPromiseRejection|uncaught exception|shutdown error/i.test(line)),
    }),
  };
}

function runRpcProcess(name, input, env) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, rpcArgs, {
      cwd: root,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let pendingLine = "";
    let agentSettled = false;
    let timedOut = false;
    let processError = null;
    let killTimer;
    const deadline = setTimeout(() => {
      timedOut = true;
      processError = "Pi RPC process exceeded the 15000ms deadline";
      child.kill();
      killTimer = setTimeout(() => child.kill("SIGKILL"), 1000);
    }, 15_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      pendingLine += chunk;
      let newline;
      while ((newline = pendingLine.indexOf("\n")) !== -1) {
        const line = pendingLine.slice(0, newline).replace(/\r$/, "");
        pendingLine = pendingLine.slice(newline + 1);
        try {
          if (JSON.parse(line)?.type === "agent_settled" && !agentSettled) {
            agentSettled = true;
            child.stdin.end();
          }
        } catch {
          // Keep malformed protocol output for the assertion/evidence layer.
        }
      }
      if (stdout.length > 8 * 1024 * 1024 && !processError) {
        processError = "Pi RPC stdout exceeded the 8MiB safety limit";
        child.kill();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 8 * 1024 * 1024 && !processError) {
        processError = "Pi RPC stderr exceeded the 8MiB safety limit";
        child.kill();
      }
    });
    child.stdin.on("error", (error) => {
      if (!processError) processError = `Pi RPC stdin failed: ${error.message}`;
    });
    child.on("error", (error) => {
      processError = `Pi RPC spawn failed: ${error.message}`;
    });
    child.on("close", (status, signal) => {
      clearTimeout(deadline);
      clearTimeout(killTimer);
      const cleanStdout = redact(stdout);
      const cleanStderr = redact(stderr);
      const fullOutput = `${cleanStdout}${cleanStderr}`;
      const records = parseJsonLines(cleanStdout);
      resolveResult({
        name,
        command: "npm run smoke:pi",
        exitCode: status ?? 1,
        stdout: cleanStdout,
        stderr: cleanStderr,
        fullOutput,
        records,
        agentSettled,
        timedOut,
        audit: [],
        processError: processError ?? (timedOut ? "Pi RPC timeout" : null),
        hasUnhandledError: UNHANDLED_ERROR_PATTERN.test(fullOutput),
        hasLoadError: EXTENSION_LOAD_ERROR_PATTERN.test(fullOutput),
      });
    });
    child.stdin.write(input);
  });
}

async function runPi(name) {
  const auditPath = resolve(agentDir, `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  writeFileSync(auditPath, "");
  const env = { ...testEnv, PI_YOUTUBE_SMOKE_AUDIT_FILE: auditPath };
  const input = `${JSON.stringify({ type: "prompt", message: `pi-youtube-tools-smoke:${name}` })}\n`;
  const result = await runRpcProcess(name, input, env);
  result.audit = readAudit(auditPath);
  const relevantRecords = result.records.filter((row) => [
    "extension_ui_request",
    "response",
    "extension_error",
    "tool_execution_start",
    "tool_execution_end",
    "agent_settled",
  ].includes(row?.type) || (row?.type === "message_end" && row.message?.role === "assistant"));
  const diagnostics = result.stderr.split(/\r?\n/).filter((line) => /Failed to load extension|Error loading extension|UnhandledPromiseRejection|uncaught exception|shutdown error/i.test(line));
  result.evidence = JSON.stringify({
    exit_code: result.exitCode,
    agent_settled: result.agentSettled,
    records: stableEvidence(relevantRecords),
    audit: result.audit,
    diagnostics,
    process_error: result.processError,
  });
  return result;
}

function runHostShell() {
  const env = { ...testEnv };
  if (process.platform === "win32") {
    const shell = resolve(process.env.SystemRoot ?? "C:/Windows", "System32/WindowsPowerShell/v1.0/powershell.exe");
    const quote = (value) => `'${value.replaceAll("'", "''")}'`;
    const command = `& ${quote(process.execPath)} ${quote(piCli)} --no-extensions --version; exit $LASTEXITCODE`;
    return runProcess("host_shell", shell, ["-NoProfile", "-NonInteractive", "-Command", command], "", env);
  }

  return runProcess(
    "host_shell",
    "/bin/sh",
    ["-c", '"$1" "$2" --no-extensions --version', "pi-host-shell", process.execPath, piCli],
    "",
    env,
  );
}

function reportCase(result, assertions, evidence = result.evidence) {
  const passed = result.exitCode === 0
    && result.processError === null
    && result.agentSettled !== false
    && !result.hasUnhandledError
    && !result.hasLoadError
    && assertions.every((item) => item.passed);
  return {
    name: result.name,
    command: result.command,
    exit_code: result.exitCode,
    passed,
    evidence: redact(evidence).slice(-6000) || result.processError || "No output captured",
    assertions,
    hasUnhandledError: result.hasUnhandledError,
    hasLoadError: result.hasLoadError,
  };
}

try {
  const load = await runPi("extension_load");
  const happy = await runPi("happy_path");
  const error = await runPi("error_path");
  const reloadFirst = await runPi("reload_cleanup");
  const reloadSecond = await runPi("reload_cleanup");
  const reloadCombined = {
    ...reloadSecond,
    fullOutput: `${reloadFirst.fullOutput}\n--- second actual Pi process ---\n${reloadSecond.fullOutput}`,
    priorProcessExitCode: reloadFirst.exitCode,
    hasUnhandledError: reloadFirst.hasUnhandledError || reloadSecond.hasUnhandledError,
    hasLoadError: reloadFirst.hasLoadError || reloadSecond.hasLoadError,
    processError: reloadFirst.processError ?? reloadSecond.processError,
  };
  const host = runHostShell();

  const cases = [
    reportCase(load, behaviorAssertions("extension_load", load)),
    reportCase(happy, behaviorAssertions("happy_path", happy)),
    reportCase(error, behaviorAssertions("error_path", error)),
    reportCase(
      reloadCombined,
      behaviorAssertions("reload_cleanup", reloadCombined),
      JSON.stringify({
        first_process: {
          exit_code: reloadFirst.exitCode,
          evidence: reloadFirst.evidence,
        },
        second_process: {
          exit_code: reloadSecond.exitCode,
          evidence: reloadSecond.evidence,
        },
        second_process_api_audit: reloadSecond.audit,
      }),
    ),
    reportCase(host, behaviorAssertions("host_shell", {
      ...host,
      expectedVersion: installedVersions["@earendil-works/pi-coding-agent"],
    })),
  ];

  const report = {
    schema_version: 1,
    verification_contract: VERIFICATION_CONTRACT,
    sdk_versions: installedVersions,
    platform: process.platform,
    model_inference: "deterministic offline provider; actual Pi RPC host, package extension lifecycle and tool executions",
    external_api_boundary: "YouTube Data API responses are deterministic local fetch fixtures; all other fetch requests are blocked offline and recorded",
    unhandled_errors: cases.filter((item) => item.hasUnhandledError).length,
    extension_load_errors: cases.filter((item) => item.hasLoadError).length,
    cases: cases.map(({ hasUnhandledError, hasLoadError, ...item }) => item),
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    verification_contract: VERIFICATION_CONTRACT,
    platform: process.platform,
    cases: cases.map(({ name, passed, exit_code }) => ({ name, passed, exit_code })),
    unhandled_errors: report.unhandled_errors,
    extension_load_errors: report.extension_load_errors,
  }));
  if (cases.some((item) => !item.passed)) process.exitCode = 1;
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}

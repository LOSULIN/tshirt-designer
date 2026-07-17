/**
 * SubmissionProfiler — non-functional timing instrumentation (Phase 30-4A / 30-4D / 30-4E).
 * console.info() only; does not change submit behavior.
 */

export type SubmissionProfileScope = "client" | "server-sync" | "server-background";

export interface SubmissionProfileEntry {
  label: string;
  durationMs: number;
  scope: SubmissionProfileScope;
}

const CLIENT_SUBMIT_URL_PATTERN = /\/api\/designs\/submit(?:\?|$)/;
const PROFILER_WINDOW_STATE_KEY = "__submissionProfilerWindowState__";

interface ProfilerWindowState {
  nativeFetch?: typeof fetch;
  observerInstalled?: boolean;
}

export function isSubmissionProfilingEnabled(): boolean {
  try {
    if (process.env.SUBMISSION_PROFILING === "0") {
      return false;
    }
    if (process.env.SUBMISSION_PROFILING === "1") {
      return true;
    }
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function safeMark(name: string): void {
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    try {
      performance.mark(name);
    } catch {
      // ignore duplicate or unsupported mark names
    }
  }
}

function safeMeasure(name: string, startMark: string, endMark: string): void {
  if (
    typeof performance !== "undefined" &&
    typeof performance.measure === "function"
  ) {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // ignore missing marks
    }
  }
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0 ms";
  }
  return `${Math.round(ms)} ms`;
}

function formatNetworkWaiting(network: number | null): string {
  if (network == null) {
    return "N/A";
  }
  return formatMs(network);
}

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function getProfilerWindowState(): ProfilerWindowState {
  if (typeof window === "undefined") {
    return {};
  }

  const scopedWindow = window as Window & {
    [PROFILER_WINDOW_STATE_KEY]?: ProfilerWindowState;
  };

  if (!scopedWindow[PROFILER_WINDOW_STATE_KEY]) {
    scopedWindow[PROFILER_WINDOW_STATE_KEY] = {};
  }

  return scopedWindow[PROFILER_WINDOW_STATE_KEY]!;
}

function getNativeFetch(): typeof fetch | null {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return null;
  }

  const state = getProfilerWindowState();
  if (!state.nativeFetch) {
    state.nativeFetch = window.fetch.bind(window);
  }

  return state.nativeFetch;
}

function restoreNativeFetch(): void {
  if (typeof window === "undefined") {
    return;
  }

  const nativeFetch = getProfilerWindowState().nativeFetch;
  if (nativeFetch) {
    window.fetch = nativeFetch;
  }
}

export class SubmissionProfiler {
  private readonly entries = new Map<string, SubmissionProfileEntry>();
  private clientSessionStart: number | null = null;
  private clientFetchWatchActive = false;
  private clientSummaryEmitted = false;
  private serverSummaryEmitted = false;
  private topPhasesEmitted = false;

  isEnabled(): boolean {
    return isSubmissionProfilingEnabled();
  }

  beginClientSession(): void {
    this.safe(() => {
      if (!this.isEnabled()) return;
      this.uninstallClientFetchWatch();
      this.resetSession();
      this.clientSessionStart = nowMs();
      safeMark("submission:client:start");
    });
  }

  record(
    label: string,
    durationMs: number,
    scope: SubmissionProfileScope,
  ): void {
    this.safe(() => {
      if (!this.isEnabled()) return;
      this.entries.set(`${scope}:${label}`, { label, durationMs, scope });
    });
  }

  mark(name: string): void {
    this.safe(() => {
      if (!this.isEnabled()) return;
      safeMark(name);
    });
  }

  measure(name: string, startMark: string, endMark: string): void {
    this.safe(() => {
      if (!this.isEnabled()) return;
      safeMeasure(name, startMark, endMark);
    });
  }

  async run<T>(label: string, scope: SubmissionProfileScope, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled()) {
      return fn();
    }

    const startMark = `submission:${scope}:${label}:start`;
    const endMark = `submission:${scope}:${label}:end`;
    safeMark(startMark);
    const started = nowMs();

    try {
      return await fn();
    } finally {
      this.safe(() => {
        const durationMs = nowMs() - started;
        safeMark(endMark);
        safeMeasure(`submission:${scope}:${label}`, startMark, endMark);
        this.record(label, durationMs, scope);
      });
    }
  }

  installClientNetworkWatch(): void {
    this.safe(() => {
      if (!this.isEnabled() || typeof window === "undefined") {
        return;
      }

      this.installPerformanceObserverSupplement();
      this.installClientFetchWatch();
    });
  }

  private installPerformanceObserverSupplement(): void {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    const state = getProfilerWindowState();
    if (state.observerInstalled) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        this.safe(() => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === "resource" &&
              CLIENT_SUBMIT_URL_PATTERN.test(entry.name)
            ) {
              this.record("Network Waiting", entry.duration, "client");
            }
          }
        });
      });
      observer.observe({ type: "resource", buffered: true });
      state.observerInstalled = true;
    } catch {
      state.observerInstalled = false;
    }
  }

  private installClientFetchWatch(): void {
    if (typeof window === "undefined" || this.clientFetchWatchActive) {
      return;
    }

    const nativeFetch = getNativeFetch();
    if (!nativeFetch) {
      return;
    }

    const profiler = this;
    this.clientFetchWatchActive = true;

    window.fetch = function profilerSubmitFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      let isSubmitRequest = false;

      try {
        isSubmitRequest = CLIENT_SUBMIT_URL_PATTERN.test(resolveFetchUrl(input));
      } catch {
        return nativeFetch(input, init);
      }

      if (!isSubmitRequest) {
        return nativeFetch(input, init);
      }

      const started = nowMs();
      return nativeFetch(input, init).then(
        (response) => {
          profiler.onSubmitFetchSettled(nowMs() - started);
          return response;
        },
        (error) => {
          profiler.onSubmitFetchSettled(nowMs() - started);
          throw error;
        },
      );
    };
  }

  private onSubmitFetchSettled(durationMs: number): void {
    this.safe(() => {
      if (!this.entries.has("client:Network Waiting")) {
        this.record("Network Waiting", durationMs, "client");
      }
      this.flush();
    });
    this.uninstallClientFetchWatch();
  }

  private uninstallClientFetchWatch(): void {
    if (!this.clientFetchWatchActive || typeof window === "undefined") {
      return;
    }

    restoreNativeFetch();
    this.clientFetchWatchActive = false;
  }

  readClientNetworkDuration(): number | null {
    if (typeof performance === "undefined") {
      return null;
    }

    try {
      const entries = performance.getEntriesByType("resource");
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (CLIENT_SUBMIT_URL_PATTERN.test(entry.name)) {
          return entry.duration;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  getDuration(label: string, scope: SubmissionProfileScope): number | null {
    return this.entries.get(`${scope}:${label}`)?.durationMs ?? null;
  }

  private resolveClientNetworkDuration(): number | null {
    const recorded = this.getDuration("Network Waiting", "client");
    if (recorded != null) {
      return recorded;
    }
    return this.readClientNetworkDuration();
  }

  private hasClientEntries(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.scope === "client") {
        return true;
      }
    }
    return false;
  }

  private hasServerEntries(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.scope !== "client") {
        return true;
      }
    }
    return false;
  }

  flushClientSummary(): void {
    this.safe(() => {
      if (!this.isEnabled() || this.clientSummaryEmitted) return;
      if (!this.hasClientEntries()) return;

      const network = this.resolveClientNetworkDuration();
      if (network != null && !this.entries.has("client:Network Waiting")) {
        this.record("Network Waiting", network, "client");
      }

      const prepare = this.getDuration("Prepare", "client") ?? 0;
      const generate = this.getDuration("Generate Artifacts", "client") ?? 0;
      const mockups = this.getDuration("Generate Mockups", "client") ?? 0;
      const prints = this.getDuration("Generate Prints", "client") ?? 0;
      const append = this.getDuration("Append FormData", "client") ?? 0;
      const measuredTotal =
        prepare + generate + mockups + prints + append + (network ?? 0);
      const sessionTotal =
        this.clientSessionStart != null ? nowMs() - this.clientSessionStart : measuredTotal;

      console.info(
        [
          "====================",
          "Submit Profile (Client)",
          "====================",
          `Prepare                ${formatMs(prepare)}`,
          `Generate Artifacts     ${formatMs(generate)}`,
          `Generate Mockups       ${formatMs(mockups)}`,
          `Generate Prints        ${formatMs(prints)}`,
          `Append FormData        ${formatMs(append)}`,
          `Network Waiting        ${formatNetworkWaiting(network)}`,
          `Total                  ${formatMs(sessionTotal)}`,
          "====================",
        ].join("\n"),
      );

      this.clientSummaryEmitted = true;
    });
  }

  flushServerSummary(): void {
    this.safe(() => {
      if (!this.isEnabled() || this.serverSummaryEmitted) return;
      if (!this.hasServerEntries()) return;

      const validation = this.getDuration("Validation", "server-sync") ?? 0;
      const repository = this.getDuration("Repository", "server-sync") ?? 0;
      const upload = this.getDuration("Upload", "server-sync") ?? 0;
      const response = this.getDuration("Response", "server-sync") ?? 0;
      const background = this.getDuration("Background", "server-background") ?? 0;
      const mockup = this.getDuration("Mockup", "server-background") ?? 0;
      const pdf = this.getDuration("PDF", "server-background") ?? 0;
      const zip = this.getDuration("ZIP", "server-background") ?? 0;
      const proofUpload = this.getDuration("Proof Upload", "server-background") ?? 0;
      const email = this.getDuration("Email", "server-background") ?? 0;

      console.info(
        [
          "====================",
          "Submit Profile (Server)",
          "====================",
          `Validation             ${formatMs(validation)}`,
          `Repository             ${formatMs(repository)}`,
          `Upload                 ${formatMs(upload)}`,
          `Response               ${formatMs(response)}`,
          `Background             ${formatMs(background)}`,
          `Mockup                 ${formatMs(mockup)}`,
          `PDF                    ${formatMs(pdf)}`,
          `ZIP                    ${formatMs(zip)}`,
          `Proof Upload           ${formatMs(proofUpload)}`,
          `Email                  ${formatMs(email)}`,
          "====================",
        ].join("\n"),
      );

      this.serverSummaryEmitted = true;
    });
  }

  flush(): void {
    this.safe(() => {
      if (!this.isEnabled()) return;

      this.flushClientSummary();
      this.flushServerSummary();
      this.flushTopPhases();
      this.resetSession();
    });
  }

  flushTopPhases(): void {
    this.safe(() => {
      if (!this.isEnabled() || this.topPhasesEmitted) return;

      const buckets: { label: string; ms: number }[] = [
        { label: "Print PNG Encode (client)", ms: this.getDuration("Generate Prints", "client") ?? 0 },
        { label: "Mockup PNG Encode (client)", ms: this.getDuration("Generate Mockups", "client") ?? 0 },
        {
          label: "Network / Upload (server sync)",
          ms:
            (this.getDuration("Upload", "server-sync") ?? 0) +
            (this.getDuration("Network Waiting", "client") ?? 0),
        },
        { label: "PDF (background)", ms: this.getDuration("PDF", "server-background") ?? 0 },
        {
          label: "Image Decode + Draw (client, est.)",
          ms: Math.max(
            0,
            (this.getDuration("Generate Artifacts", "client") ?? 0) -
              (this.getDuration("Generate Prints", "client") ?? 0) -
              (this.getDuration("Generate Mockups", "client") ?? 0),
          ),
        },
        { label: "ZIP (background)", ms: this.getDuration("ZIP", "server-background") ?? 0 },
        { label: "Proof Upload (background)", ms: this.getDuration("Proof Upload", "server-background") ?? 0 },
        { label: "Repository / Database", ms: this.getDuration("Repository", "server-sync") ?? 0 },
        { label: "Append FormData (client)", ms: this.getDuration("Append FormData", "client") ?? 0 },
        { label: "Email (background)", ms: this.getDuration("Email", "server-background") ?? 0 },
        { label: "Validation (server)", ms: this.getDuration("Validation", "server-sync") ?? 0 },
      ];

      const total = buckets.reduce((sum, item) => sum + item.ms, 0);
      const ranked = [...buckets].sort((a, b) => b.ms - a.ms).slice(0, 5);
      const lines = ranked.map((item, index) => {
        const pct = total > 0 ? Math.round((item.ms / total) * 100) : 0;
        return `${index + 1}. ${item.label} — ${pct}% (${formatMs(item.ms)})`;
      });

      console.info(
        ["[submission-profiler] Top 5 phases (measured subset):", ...lines].join("\n"),
      );

      this.topPhasesEmitted = true;
    });
  }

  private resetSession(): void {
    this.entries.clear();
    this.clientSessionStart = null;
    this.clientSummaryEmitted = false;
    this.serverSummaryEmitted = false;
    this.topPhasesEmitted = false;
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch {
      // Profiler instrumentation must never break Designer or Submit.
    }
  }
}

export const submissionProfiler = new SubmissionProfiler();

export function createSubmissionProfiler(): SubmissionProfiler {
  return submissionProfiler;
}

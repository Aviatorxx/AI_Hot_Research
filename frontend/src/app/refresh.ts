export interface AutoRefreshController {
  start(): void;
  stop(): void;
  toggle(): boolean;
  getEnabled(): boolean;
}

export function updateCountdownUI(options: {
  enabled: boolean;
  countdown: number;
  interval: number;
}): void {
  const { enabled, countdown, interval } = options;
  const label = document.getElementById("autoRefreshLabel");
  const arc = document.getElementById("countdownArc") as SVGCircleElement | null;
  const circumference = 2 * Math.PI * 10;

  if (!label || !arc) return;

  if (!enabled) {
    label.textContent = "已暂停";
    arc.style.strokeDashoffset = String(circumference);
    arc.style.stroke = "var(--text-muted)";
    return;
  }

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  label.textContent = `${mins}:${String(secs).padStart(2, "0")}`;

  const progress = countdown / interval;
  arc.style.strokeDashoffset = String(circumference * (1 - progress));
  arc.style.stroke = progress < 0.2 ? "var(--neon-amber)" : "var(--neon-green)";
}

export function syncAutoRefreshToggle(enabled: boolean): void {
  document.getElementById("autoRefreshToggle")?.classList.toggle("active", enabled);
}

export function createAutoRefreshController(options: {
  intervalSeconds: number;
  onRefresh: () => void;
  onStateChange: (payload: { enabled: boolean; countdown: number }) => void;
}): AutoRefreshController {
  const { intervalSeconds, onRefresh, onStateChange } = options;
  let enabled = true;
  let countdown = intervalSeconds;
  let timerId: number | null = null;

  const emit = () => onStateChange({ enabled, countdown });

  const tick = () => {
    if (!enabled) return;
    countdown -= 1;
    emit();

    if (countdown <= 0) {
      countdown = intervalSeconds;
      onRefresh();
    }
  };

  return {
    start() {
      if (timerId !== null) {
        window.clearInterval(timerId);
      }
      countdown = intervalSeconds;
      emit();
      timerId = window.setInterval(tick, 1000);
    },
    stop() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    },
    toggle() {
      enabled = !enabled;
      if (enabled) {
        countdown = intervalSeconds;
      }
      emit();
      return enabled;
    },
    getEnabled() {
      return enabled;
    },
  };
}

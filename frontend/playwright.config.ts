import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8010",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "/opt/anaconda3/envs/fastapi/bin/uvicorn --app-dir .. backend.main:app --host 127.0.0.1 --port 8010",
    url: "http://127.0.0.1:8010",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      MAX_REGISTERED_USERS: "1000",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});

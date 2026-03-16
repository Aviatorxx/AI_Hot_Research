import "@/shared/styles/index.css";
import { bootstrapApp } from "@/app/bootstrap";
import { registerLegacyBridge } from "@/legacy/legacy-app";

registerLegacyBridge(window);
bootstrapApp();

import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBase = import.meta.env.VITE_API_BASE_URL;
if (apiBase) {
  // Remove trailing /api or /api/ to prevent double prefixing
  setBaseUrl(apiBase.replace(/\/api\/?$/, "").replace(/\/$/, ""));
}

createRoot(document.getElementById("root")!).render(<App />);

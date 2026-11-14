import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { EphemeralKeyProvider } from "./features/settings/EphemeralKeyContext";
import "./common/theme.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EphemeralKeyProvider>
      <App />
    </EphemeralKeyProvider>
  </StrictMode>,
);

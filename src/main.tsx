import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Appliquer le thème sauvegardé avant le premier rendu pour éviter le flash
try {
  const raw = localStorage.getItem("nexa-os-storage");
  if (raw) {
    const parsed = JSON.parse(raw);
    const savedTheme = parsed?.state?.theme;
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }
} catch {}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

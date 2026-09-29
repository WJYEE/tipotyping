import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { seedIfEmpty } from "@/db/seed/seed";
import "./index.css";

seedIfEmpty().catch((error) => {
  console.error("DB 시드 초기화 실패:", error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

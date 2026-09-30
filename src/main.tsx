import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { syncDefaultContent } from "@/db/seed/seed";
import "./index.css";

syncDefaultContent().catch((error) => {
  console.error("기본 문제은행 동기화 실패:", error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

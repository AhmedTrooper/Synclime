import "./main.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./routes/Home";
import About from "./routes/About";
import Downloads from "./routes/Downloads";
import DownloadsDetail from "./routes/DownloadsDetail";
import Settings from "./routes/Settings";
import ParsedFileDetail from "./routes/ParsedFileDetail";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import "@fontsource-variable/inter";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<App />}
          >
            <Route
              index
              element={<Home />}
            />
            <Route
              path="about"
              element={<About />}
            />
            <Route
              path="downloads"
              element={<Downloads />}
            />
            <Route
              path="downloads/:slug"
              element={<DownloadsDetail />}
            />
            <Route
              path="settings"
              element={<Settings />}
            />
            <Route
              path="parsed_file/:slug"
              element={<ParsedFileDetail />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </HeroUIProvider>
  </React.StrictMode>
);


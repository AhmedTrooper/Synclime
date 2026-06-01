/* @refresh reload */
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import "./index.css";

import App from "./App";
import MainLayout from "./layouts/MainLayout";

import Home from "./routes/Home";
import About from "./routes/About";
import Downloads from "./routes/Downloads";
import DownloadsDetail from "./routes/DownloadsDetail";
import Settings from "./routes/Settings";
import ParsedFileDetail from "./routes/ParsedFileDetail";
import ParsedFiles from "./routes/ParsedFiles";
import SitesConfig from "./routes/SitesConfig";
import Logs from "./routes/Logs";
import Inbox from "./routes/Inbox";
import InboxDetail from "./routes/InboxDetail";
import Extentions from "./routes/Extentions";

const root = document.getElementById("root");

render(
  () => (
    <Router root={App}>
      <Route path="/" component={MainLayout}>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/downloads" component={Downloads} />
        <Route path="/downloads/:slug" component={DownloadsDetail} />
        <Route path="/settings" component={Settings} />
        <Route path="/parsed_file/:slug" component={ParsedFileDetail} />
        <Route path="/parsed_files" component={ParsedFiles} />
        <Route path="/sites_config" component={SitesConfig} />
        <Route path="/logs" component={Logs} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/inbox/:slug" component={InboxDetail} />
        <Route path="/extentions" component={Extentions} />
      </Route>
    </Router>
  ),
  root!
);

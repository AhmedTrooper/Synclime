/* @refresh reload */
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import "./index.css";

import App from "./App";
import MainLayout from "./layouts/MainLayout";

// Stubs for now, will create real routes later
const Home = () => <div>Home</div>;
const About = () => <div>About</div>;
const Downloads = () => <div>Downloads</div>;
const DownloadsDetail = () => <div>DownloadsDetail</div>;
const Settings = () => <div>Settings</div>;
const ParsedFileDetail = () => <div>ParsedFileDetail</div>;
const ParsedFiles = () => <div>ParsedFiles</div>;
const SitesConfig = () => <div>SitesConfig</div>;
const Logs = () => <div>Logs</div>;

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
      </Route>
    </Router>
  ),
  root!
);

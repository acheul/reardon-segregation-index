/* @refresh reload */
import { render } from "solid-js/web";
import init from "./pkg/segindex_wasm";
import App from "./App";
import "./index.css";

init().then(() => {
  const root = document.getElementById("root")!;
  root.textContent = "";
  render(() => <App />, root);
});

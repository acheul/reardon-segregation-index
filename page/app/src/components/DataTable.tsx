import { For } from "solid-js";
import type { Details } from "../lib/data";
import { polyval } from "../lib/data";

export default function DataTable(props: { details: Details }) {
  return (
    <details>
      <summary>Data table: H(p) by threshold</summary>
      <table class="data">
        <thead>
          <tr>
            <th>p</th>
            <th>H(p) observed</th>
            <th>H(p) fitted</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.details.thresholds}>
            {(p, i) => (
              <tr>
                <td>{p.toFixed(4)}</td>
                <td>{props.details.hp[i()].toFixed(6)}</td>
                <td>{polyval(props.details.betas, p).toFixed(6)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </details>
  );
}

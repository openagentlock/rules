// Vanilla JS — fetch the static index, render rule cards, wire search +
// the copy-install button. No framework, no bundler. The page must
// render correctly on plain GitHub Pages with no build step.
//
// Rendering uses createElement + textContent throughout so user-supplied
// rule data (names, descriptions, tags) never reaches an HTML parser.
// Treat every field on a rule as untrusted — the registry is a public
// PR target.

const REGISTRY = "openagentlock/rules";
const INSTALL_CMD = (id) => `agentlock rules install ${REGISTRY}:${id}`;

const $q = document.getElementById("q");
const $results = document.getElementById("results");
const $generated = document.getElementById("generated-at");
const $filters = Array.from(document.querySelectorAll('.filters input[type="checkbox"]'));

let RULES = [];

function severityClass(sev) {
  return ["critical", "high", "medium", "low", "info"].includes(sev)
    ? sev
    : "info";
}

function activeSeverities() {
  return new Set(
    $filters.filter((c) => c.checked).map((c) => c.dataset.severity),
  );
}

function matches(rule, query, sevSet) {
  if (!sevSet.has(rule.severity)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    rule.id.toLowerCase().includes(q) ||
    rule.name.toLowerCase().includes(q) ||
    rule.description.toLowerCase().includes(q) ||
    (rule.tags || []).some((t) => t.toLowerCase().includes(q)) ||
    (rule.readme_excerpt || "").toLowerCase().includes(q)
  );
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "dataset") {
        for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
      } else node.setAttribute(k, v);
    }
  }
  if (children !== undefined) {
    if (!Array.isArray(children)) children = [children];
    for (const c of children) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

function ruleCard(r) {
  const cmd = INSTALL_CMD(r.id);

  const head = el("div", { class: "rule-head" }, [
    el("h3", { class: "rule-name" }, r.name),
    el("span", { class: `severity ${severityClass(r.severity)}` }, r.severity),
  ]);

  const meta = el("div", { class: "rule-meta" });
  meta.appendChild(el("span", null, [`verdict: `, el("code", null, r.on_hit)]));
  if (r.require_strong) {
    meta.appendChild(el("span", null, "requires strong signer"));
  }
  if (r.compatible_agentlock) {
    meta.appendChild(
      el("span", null, [
        "agentlock ",
        el("code", null, r.compatible_agentlock),
      ]),
    );
  }
  for (const t of r.tags || []) {
    meta.appendChild(el("span", { class: "tag" }, t));
  }

  const left = el("div", null, [
    head,
    el("div", { class: "rule-id" }, r.id),
    el("p", { class: "rule-desc" }, r.description),
    meta,
  ]);

  const cmdNode = el("code", null, cmd);
  const btn = el("button", null, "Copy install command");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      btn.textContent = "Copied — paste in your terminal";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy install command";
        btn.classList.remove("copied");
      }, 2200);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(cmdNode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  const right = el("div", { class: "install" }, [cmdNode, btn]);

  return el("article", { class: "rule" }, [left, right]);
}

function render() {
  const q = $q.value.trim();
  const sevSet = activeSeverities();
  const visible = RULES.filter((r) => matches(r, q, sevSet));

  $results.replaceChildren();

  if (visible.length === 0) {
    $results.appendChild(
      el("div", { class: "empty" }, "No rules match. Try a different query."),
    );
    return;
  }

  for (const r of visible) {
    $results.appendChild(ruleCard(r));
  }
}

async function main() {
  try {
    const res = await fetch("data/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`fetch index.json: HTTP ${res.status}`);
    const data = await res.json();
    RULES = data.rules || [];
    if (data.generated_at) {
      $generated.textContent = `index built ${data.generated_at}`;
    }
  } catch (err) {
    $results.replaceChildren(
      el("div", { class: "empty" }, `Failed to load index.json — ${err.message}`),
    );
    return;
  }

  render();
  $q.addEventListener("input", render);
  for (const c of $filters) c.addEventListener("change", render);
}

main();

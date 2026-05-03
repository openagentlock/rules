// Vanilla JS — fetch the static index, render rule cards, wire search,
// theme toggle, sort, and pagination. No framework, no bundler.
//
// Rendering uses createElement + textContent throughout so user-supplied
// rule data (names, descriptions, tags) never reaches an HTML parser.
// Treat every field on a rule as untrusted — the registry is a public
// PR target.

const INSTALL_CMD = (id) => `agentlock rules install ${id}`;
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const THEME_KEY = "oal-rules-theme";

const $q = document.getElementById("q");
const $results = document.getElementById("results");
const $pagination = document.getElementById("pagination");
const $generated = document.getElementById("generated-at");
const $count = document.getElementById("count");
const $metaCount = document.getElementById("meta-count");
const $sort = document.getElementById("sort");
const $pageSize = document.getElementById("page-size");
const $themeToggle = document.getElementById("theme-toggle");
const $filters = Array.from(document.querySelectorAll('.filters input[type="checkbox"]'));

let RULES = [];
let page = 1;

// ---------- theme ----------

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) ?? "system";
  } catch {
    return "system";
  }
}
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  if ($themeToggle) {
    for (const btn of $themeToggle.querySelectorAll("button[data-theme]")) {
      btn.setAttribute("aria-pressed", btn.dataset.theme === theme ? "true" : "false");
    }
  }
}
function setTheme(theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch { /* ignore — private mode etc. */ }
  applyTheme(theme);
}
applyTheme(readTheme());
if ($themeToggle) {
  $themeToggle.addEventListener("click", (e) => {
    const target = e.target;
    if (target instanceof HTMLButtonElement && target.dataset.theme) {
      setTheme(target.dataset.theme);
    }
  });
}

// ---------- helpers ----------

function severityClass(sev) {
  return ["critical", "high", "medium", "low", "info"].includes(sev) ? sev : "info";
}

function activeSeverities() {
  return new Set($filters.filter((c) => c.checked).map((c) => c.dataset.severity));
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

function sortBy(sortKey) {
  return (a, b) => {
    if (sortKey === "severity") {
      const da = SEVERITY_ORDER[a.severity] ?? 99;
      const db = SEVERITY_ORDER[b.severity] ?? 99;
      if (da !== db) return da - db;
    }
    if (sortKey === "name") return a.name.localeCompare(b.name);
    return a.id.localeCompare(b.id);
  };
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
  meta.appendChild(el("span", null, [`action: `, el("code", null, r.action)]));
  if (r.compatible_agentlock) {
    meta.appendChild(
      el("span", null, ["agentlock ", el("code", null, r.compatible_agentlock)]),
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

// ---------- pagination ----------

function pageSize() {
  const v = $pageSize?.value ?? "10";
  return v === "all" ? Infinity : Math.max(1, parseInt(v, 10));
}

function renderPagination(totalPages) {
  if (!$pagination) return;
  $pagination.replaceChildren();
  if (totalPages <= 1) return;

  const prev = el("button", { type: "button" }, "‹ Prev");
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => goTo(page - 1));
  $pagination.appendChild(prev);

  // Compact numeric paginator: 1 ... (page-1) page (page+1) ... last.
  const slots = new Set([1, totalPages, page, page - 1, page + 1]);
  const ordered = [...slots].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  let last = 0;
  for (const n of ordered) {
    if (last && n - last > 1) {
      $pagination.appendChild(el("span", { class: "ellipsis" }, "…"));
    }
    const btn = el("button", { type: "button" }, String(n));
    if (n === page) btn.setAttribute("aria-current", "page");
    btn.addEventListener("click", () => goTo(n));
    $pagination.appendChild(btn);
    last = n;
  }

  const next = el("button", { type: "button" }, "Next ›");
  next.disabled = page >= totalPages;
  next.addEventListener("click", () => goTo(page + 1));
  $pagination.appendChild(next);
}

function goTo(n) {
  page = Math.max(1, n);
  render();
  // Scroll the result list into view so paging on mobile doesn't strand
  // the user at the bottom of the previous page.
  document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- main render ----------

function render() {
  const q = $q.value.trim();
  const sevSet = activeSeverities();
  const sortKey = $sort?.value ?? "severity";

  const filtered = RULES.filter((r) => matches(r, q, sevSet)).sort(sortBy(sortKey));
  const total = filtered.length;
  const sz = pageSize();
  const totalPages = sz === Infinity ? 1 : Math.max(1, Math.ceil(total / sz));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * (sz === Infinity ? 0 : sz);
  const pageRules = sz === Infinity ? filtered : filtered.slice(start, start + sz);

  $results.replaceChildren();
  if ($count) {
    if (total === 0) {
      $count.textContent = "0 rules";
    } else if (sz === Infinity || total <= sz) {
      $count.textContent = `${total} rule${total === 1 ? "" : "s"}`;
    } else {
      $count.textContent = `${start + 1}–${Math.min(start + sz, total)} of ${total}`;
    }
  }

  if (pageRules.length === 0) {
    $results.appendChild(
      el("div", { class: "empty" }, "No rules match. Try a different query."),
    );
  } else {
    for (const r of pageRules) $results.appendChild(ruleCard(r));
  }

  renderPagination(totalPages);
}

// ---------- bootstrap ----------

async function main() {
  try {
    const res = await fetch("data/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`fetch index.json: HTTP ${res.status}`);
    const data = await res.json();
    RULES = data.rules || [];
    if (data.generated_at && $generated) {
      const t = new Date(data.generated_at);
      const fmt = Number.isNaN(t.getTime())
        ? data.generated_at
        : t.toISOString().slice(0, 16).replace("T", " ") + " UTC";
      $generated.textContent = `index built ${fmt}`;
    }
    if ($metaCount) {
      $metaCount.textContent = `${RULES.length} rule${RULES.length === 1 ? "" : "s"}`;
    }
  } catch (err) {
    $results.replaceChildren(
      el("div", { class: "empty" }, `Failed to load index.json — ${err.message}`),
    );
    return;
  }

  render();
  const onChange = () => {
    page = 1;
    render();
  };
  $q.addEventListener("input", onChange);
  for (const c of $filters) c.addEventListener("change", onChange);
  $sort?.addEventListener("change", onChange);
  $pageSize?.addEventListener("change", onChange);
}

main();

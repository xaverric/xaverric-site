import { projects } from "./data/projects.js";
import { liveView, needleAngle } from "./lib/format.js";

const COPY_RESET_MS = 2500;

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const link = ({ label, href }) => {
  const anchor = element("a", "text-link arrow", label);
  anchor.href = href;
  return anchor;
};

const linkItem = (item) => {
  const li = element("li");
  li.append(link(item));
  return li;
};

const flowStep = ({ title, text, emphasis }) => {
  const item = element("li", "flow__step");
  item.append(element("span", "flow__line"), element("span", "flow__index"), element("h4", "flow__title", title));
  const body = element("p", "flow__text", text);
  if (emphasis) body.append(" ", element("strong", "flow__em", emphasis));
  item.append(body);
  return item;
};

const setupCopy = (root, command) => {
  const button = root.querySelector("[data-copy]");
  const status = root.querySelector("[data-copy-status]");
  const code = root.querySelector("[data-field='command']");
  let timer = 0;
  const show = (state, label, message) => {
    button.dataset.state = state;
    button.textContent = label;
    status.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => {
      delete button.dataset.state;
      button.textContent = "Copy";
      status.textContent = "";
    }, COPY_RESET_MS);
  };
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(command);
      show("copied", "Copied", `${command} copied to the clipboard`);
    } catch {
      getSelection()?.selectAllChildren(code);
      show("error", "Selected", "Clipboard unavailable, the command is selected");
    }
  });
};

const renderProject = (template, project) => {
  const fragment = template.content.cloneNode(true);
  const root = fragment.querySelector(".project");
  const nameId = `project-${project.id}`;
  root.dataset.project = project.id;
  root.querySelector("article").setAttribute("aria-labelledby", nameId);
  root.querySelector("[data-field='name']").id = nameId;
  ["name", "kind", "summary", "command"].forEach((field) => {
    const target = root.querySelector(`[data-field='${field}']`);
    if (target) target.textContent = project[field] ?? "";
  });
  root.querySelector("[data-slot='links']").append(...(project.links ?? []).map(linkItem));
  root.querySelector("[data-slot='flow']").append(...(project.flow ?? []).map(flowStep));
  root.querySelector("[data-slot='stack']").append(...(project.stack ?? []).map((name) => element("li", "", name)));
  if (project.command) {
    root.querySelector("[data-slot='command']").hidden = false;
    setupCopy(root, project.command);
  }
  if (project.live) {
    const side = root.querySelector("[data-slot='live']");
    side.hidden = false;
    side.dataset.live = project.live;
    side.classList.add("is-loading");
    side.setAttribute("aria-busy", "true");
  }
  return fragment;
};

const renderProjects = () => {
  const list = document.querySelector("[data-projects]");
  const template = document.querySelector("#project-template");
  if (!list || !template) return;
  list.append(...projects.map((project) => renderProject(template, project)));
};

const ready = (node) => {
  node.classList.remove("is-loading");
  node.classList.add("is-ready");
  node.setAttribute("aria-busy", "false");
};

const fillLeaderborder = (side, stats) => {
  if (!stats) {
    side.querySelector(".project__live").hidden = true;
    side.querySelector("[data-live-note]").textContent = "Live numbers could not be loaded right now. The board itself is always at leaderborder.xaverric.cz.";
    ready(side);
    return;
  }
  side.querySelectorAll("[data-stat]").forEach((node) => {
    node.textContent = stats[node.dataset.stat] ?? "";
  });
  side.querySelectorAll("[data-weekly]").forEach((node) => {
    node.hidden = stats.suppressed;
  });
  side.querySelector("[data-live-note]").textContent = stats.suppressed
    ? `Weekly numbers stay private until at least ${stats.minGroup ?? "a few"} players are active in the same week.`
    : "";
  ready(side);
};

const fillGithub = (strip, github, fetchedAt) => {
  const grid = strip.querySelector("[data-live-grid]");
  const time = strip.querySelector("[data-live-time]");
  if (!github) {
    grid.hidden = true;
    strip.querySelector("[data-github-fallback]").hidden = false;
    time.hidden = true;
    ready(strip);
    return;
  }
  strip.querySelectorAll("[data-github-field]").forEach((node) => {
    node.textContent = github[node.dataset.githubField] ?? "-";
  });
  time.textContent = fetchedAt ? `checked ${new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
  ready(strip);
};

const fetchLive = async () => {
  try {
    const response = await fetch("/api/live", { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const loadLive = async () => {
  const strip = document.querySelector("[data-github]");
  strip?.classList.add("is-loading");
  strip?.setAttribute("aria-busy", "true");
  const payload = await fetchLive();
  const view = liveView(payload);
  if (strip) fillGithub(strip, view.github, payload?.fetchedAt);
  document.querySelectorAll("[data-live='leaderborder']").forEach((side) => fillLeaderborder(side, view.leaderborder));
};

const followPointer = () => {
  const needle = document.querySelector("[data-needle]");
  const bar = needle?.querySelector(".needle__bar");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  if (!bar || !finePointer.matches || calm.matches) return;
  let frame = 0;
  let pointer = null;
  const update = () => {
    frame = 0;
    const box = needle.getBoundingClientRect();
    if (box.bottom < 0 || !pointer) return;
    bar.style.setProperty("--tilt", `${needleAngle(pointer, { x: box.left + box.width / 2, y: box.bottom })}deg`);
  };
  addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    pointer = null;
    bar.style.removeProperty("--tilt");
  });
};

renderProjects();
followPointer();
loadLive();

export const projects = [
  {
    id: "leaderborder",
    name: "leaderborder",
    kind: "macOS menu bar app + CLI",
    summary:
      "A leaderboard for AI coding tools. It counts the tokens you spend in Claude Code, Codex, Cursor and more, right on your machine, and shares only the daily totals.",
    flow: [
      {
        title: "On your machine",
        text: "Reads the local usage logs of your AI coding tools through the open-source tokscale engine.",
      },
      {
        title: "Daily totals only",
        text: "Sends daily aggregates to a Cloudflare Worker with D1.",
        emphasis: "Never prompts, code or paths.",
      },
      {
        title: "On the board",
        text: "Everyone who signs in with GitHub is ranked on one shared leaderboard.",
      },
    ],
    links: [
      { label: "leaderborder.xaverric.cz", href: "https://leaderborder.xaverric.cz" },
      { label: "Source on GitHub", href: "https://github.com/xaverric/leaderborder" },
    ],
    command: "npx leaderborder",
    stack: ["Node.js", "Electron", "Cloudflare Workers", "D1", "GitHub Actions"],
    live: "leaderborder",
  },
];

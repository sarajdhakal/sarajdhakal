// Fetches recent public GitHub activity and writes it into README.md
// between the START/END markers. Run by .github/workflows/update-readme.yml
// on a schedule, so the "Live Activity" section stays current with no
// manual edits.

import { readFileSync, writeFileSync } from "node:fs";

const USERNAME = "sarajdhakal";
const README_PATH = "README.md";
const START_MARKER = "<!--START_SECTION:activity-->";
const END_MARKER = "<!--END_SECTION:activity-->";

const EVENT_LABELS = {
  PushEvent: (e) => `Pushed to \`${e.repo.name}\``,
  PullRequestEvent: (e) =>
    `${e.payload.action === "opened" ? "Opened" : "Updated"} a PR in \`${e.repo.name}\``,
  IssuesEvent: (e) =>
    `${e.payload.action === "opened" ? "Opened" : "Updated"} an issue in \`${e.repo.name}\``,
  CreateEvent: (e) =>
    e.payload.ref_type === "repository"
      ? `Created repository \`${e.repo.name}\``
      : `Created ${e.payload.ref_type} \`${e.payload.ref}\` in \`${e.repo.name}\``,
  ReleaseEvent: (e) => `Published a release in \`${e.repo.name}\``,
};

async function fetchRecentActivity() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/events/public?per_page=30`,
    { headers: { "User-Agent": USERNAME, Accept: "application/vnd.github+json" } }
  );

  if (!res.ok) {
    throw new Error(`GitHub API request failed: ${res.status}`);
  }

  const events = await res.json();

  const lines = events
    .filter((e) => EVENT_LABELS[e.type])
    .slice(0, 5)
    .map((e) => {
      const date = new Date(e.created_at).toISOString().slice(0, 10);
      return `- ${EVENT_LABELS[e.type](e)} — ${date}`;
    });

  return lines.length ? lines.join("\n") : "- No recent public activity.";
}

function updateReadme(activityBlock) {
  const readme = readFileSync(README_PATH, "utf8");
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Markers not found in README.md");
  }

  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);
  const updated = `${before}\n${activityBlock}\n${after}`;

  writeFileSync(README_PATH, updated);
}

const activity = await fetchRecentActivity();
updateReadme(activity);

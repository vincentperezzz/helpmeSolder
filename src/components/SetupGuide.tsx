"use client";

import { useState } from "react";
import { CopyBlock } from "@/components/CopyBlock";

type ClientId = "claude" | "cursor" | "codex" | "antigravity";

const CLIENTS: { id: ClientId; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
  { id: "antigravity", label: "Antigravity" },
];

const DEPLOYED_ORIGIN = "https://helpmesolder.vercel.app";

function apiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured && !configured.includes("localhost")
    ? configured
    : DEPLOYED_ORIGIN;
}

function jsonConfig(origin: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        helpmesolder: {
          command: "node",
          args: ["/ABSOLUTE/PATH/TO/helpmeSolder/mcp/dist/index.js"],
          env: {
            HELPMESOLDER_API_URL: origin,
          },
        },
      },
    },
    null,
    2,
  );
}

function claudeCodeCommand(origin: string): string {
  return [
    "claude mcp add helpmesolder \\",
    `  -e HELPMESOLDER_API_URL=${origin} \\`,
    "  -- node /ABSOLUTE/PATH/TO/helpmeSolder/mcp/dist/index.js",
  ].join("\n");
}

function codexToml(origin: string): string {
  return [
    "[mcp_servers.helpmesolder]",
    'command = "node"',
    'args = ["/ABSOLUTE/PATH/TO/helpmeSolder/mcp/dist/index.js"]',
    "",
    "[mcp_servers.helpmesolder.env]",
    `HELPMESOLDER_API_URL = "${origin}"`,
  ].join("\n");
}

function codexCommand(origin: string): string {
  return [
    "codex mcp add helpmesolder \\",
    `  --env HELPMESOLDER_API_URL=${origin} \\`,
    "  -- node /ABSOLUTE/PATH/TO/helpmeSolder/mcp/dist/index.js",
  ].join("\n");
}

export function SetupGuide() {
  const origin = apiOrigin();
  const [client, setClient] = useState<ClientId>("claude");
  const index = CLIENTS.findIndex((item) => item.id === client);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div
        role="tablist"
        aria-label="MCP client"
        className="dip"
        style={{ "--n": CLIENTS.length } as React.CSSProperties}
      >
        <span
          aria-hidden="true"
          className="dip__thumb"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {CLIENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === client}
            onClick={() => setClient(item.id)}
            className="dip__tab"
          >
            {item.label}
          </button>
        ))}
      </div>

      {client === "claude" && (
        <>
          <p className="text-ink-soft">
            <strong>Claude Code:</strong> run this once in your terminal. Add{" "}
            <code className="font-mono text-sm">--scope user</code> to make it
            available in every project.
          </p>
          <CopyBlock label="terminal" code={claudeCodeCommand(origin)} />
          <p className="text-ink-soft">
            <strong>Claude Desktop:</strong> open{" "}
            <strong>Settings → Developer → Edit Config</strong> and merge this
            into{" "}
            <code className="font-mono text-sm">claude_desktop_config.json</code>
            , then restart the app.
          </p>
          <CopyBlock label="claude_desktop_config.json" code={jsonConfig(origin)} />
        </>
      )}
      {client === "codex" && (
        <>
          <p className="text-ink-soft">
            Run this in your terminal, or add the TOML block to{" "}
            <code className="font-mono text-sm">~/.codex/config.toml</code>{" "}
            yourself. Restart Codex afterwards.
          </p>
          <CopyBlock label="terminal" code={codexCommand(origin)} />
          <CopyBlock label="~/.codex/config.toml" code={codexToml(origin)} />
        </>
      )}
      {client === "antigravity" && (
        <>
          <p className="text-ink-soft">
            In the agent panel open <strong>… → MCP Servers → Manage MCP
            Servers → View raw config</strong>, merge this into{" "}
            <code className="font-mono text-sm">mcp_config.json</code>, save,
            then refresh the server list.
          </p>
          <CopyBlock label="mcp_config.json" code={jsonConfig(origin)} />
        </>
      )}
      {client === "cursor" && (
        <>
          <p className="text-ink-soft">
            Open <strong>Settings → MCP → Add new MCP server</strong> (or edit{" "}
            <code className="font-mono text-sm">~/.cursor/mcp.json</code>) and
            paste:
          </p>
          <CopyBlock label="mcp.json" code={jsonConfig(origin)} />
        </>
      )}
    </div>
  );
}

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

function mcpUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const origin =
    configured && !configured.includes("localhost") ? configured : DEPLOYED_ORIGIN;
  return `${origin.replace(/\/$/, "")}/mcp`;
}

function urlConfig(key: "url" | "serverUrl", url: string): string {
  return JSON.stringify({ mcpServers: { helpmesolder: { [key]: url } } }, null, 2);
}

function codexToml(url: string): string {
  return ["[mcp_servers.helpmesolder]", `url = "${url}"`].join("\n");
}

export function SetupGuide() {
  const url = mcpUrl();
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
          <CopyBlock
            label="terminal"
            code={`claude mcp add --transport http helpmesolder ${url}`}
          />
          <p className="text-ink-soft">
            <strong>Claude Desktop and claude.ai:</strong> open{" "}
            <strong>Settings → Connectors → Add custom connector</strong> and
            paste the URL. If your version has no custom connectors, use the{" "}
            <code className="font-mono text-sm">mcp-remote</code> bridge in{" "}
            <code className="font-mono text-sm">claude_desktop_config.json</code>.
          </p>
          <CopyBlock label="server URL" code={url} />
        </>
      )}
      {client === "codex" && (
        <>
          <p className="text-ink-soft">
            Run this in your terminal, or add the TOML block to{" "}
            <code className="font-mono text-sm">~/.codex/config.toml</code>{" "}
            yourself. Restart Codex afterwards.
          </p>
          <CopyBlock label="terminal" code={`codex mcp add helpmesolder --url ${url}`} />
          <CopyBlock label="~/.codex/config.toml" code={codexToml(url)} />
        </>
      )}
      {client === "antigravity" && (
        <>
          <p className="text-ink-soft">
            In the agent panel open{" "}
            <strong>… → MCP Servers → Manage MCP Servers → View raw config</strong>
            , merge this into{" "}
            <code className="font-mono text-sm">mcp_config.json</code>, save,
            then refresh the server list.
          </p>
          <CopyBlock label="mcp_config.json" code={urlConfig("serverUrl", url)} />
        </>
      )}
      {client === "cursor" && (
        <>
          <p className="text-ink-soft">
            Open <strong>Settings → MCP → Add new MCP server</strong> (or edit{" "}
            <code className="font-mono text-sm">~/.cursor/mcp.json</code>) and
            paste:
          </p>
          <CopyBlock label="mcp.json" code={urlConfig("url", url)} />
        </>
      )}
    </div>
  );
}

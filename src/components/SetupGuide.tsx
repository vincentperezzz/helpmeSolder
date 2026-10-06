"use client";

import { useEffect, useState } from "react";
import { CopyBlock } from "@/components/CopyBlock";

type ClientId = "app" | "cursor" | "terminal" | "antigravity";

const CLIENTS: { id: ClientId; label: string }[] = [
  { id: "app", label: "Claude app" },
  { id: "cursor", label: "Cursor" },
  { id: "terminal", label: "Terminal" },
  { id: "antigravity", label: "Antigravity" },
];

const DEPLOYED_ORIGIN = "https://helpmesolder.vercel.app";

function mcpUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/mcp`;
  }
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

function cursorDeeplink(url: string): string {
  const config = btoa(JSON.stringify({ url }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=helpmesolder&config=${encodeURIComponent(config)}`;
}

const CODE = "font-mono text-sm";

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li
          key={i}
          style={{ "--i": i } as React.CSSProperties}
          className="tab-step flex items-start gap-3 text-ink-soft"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-copper font-mono text-xs font-bold text-ink"
          >
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Who({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-ink">{children}</p>;
}

export function SetupGuide() {
  const [url, setUrl] = useState<string>(mcpUrl());
  const [client, setClient] = useState<ClientId>("app");
  const [direction, setDirection] = useState<1 | -1>(1);
  const index = CLIENTS.findIndex((item) => item.id === client);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setUrl(`${window.location.origin}/mcp`);
    }
  }, []);

  function select(next: ClientId): void {
    const nextIndex = CLIENTS.findIndex((item) => item.id === next);
    setDirection(nextIndex >= index ? 1 : -1);
    setClient(next);
  }

  function handleTabKey(event: React.KeyboardEvent<HTMLDivElement>): void {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: CLIENTS.length - 1,
    };
    if (!(event.key in keys)) {
      return;
    }
    event.preventDefault();
    const target = CLIENTS[(keys[event.key] + CLIENTS.length) % CLIENTS.length];
    select(target.id);
    document.getElementById(`setup-tab-${target.id}`)?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p className="text-ink-soft">
        Pick the app you use. Not sure which one you use? Start with the Claude
        app.
      </p>
      <div
        role="tablist"
        aria-label="Your AI app"
        className="dip"
        style={{ "--n": CLIENTS.length } as React.CSSProperties}
        onKeyDown={handleTabKey}
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
            id={`setup-tab-${item.id}`}
            aria-controls="setup-panel"
            tabIndex={item.id === client ? 0 : -1}
            aria-selected={item.id === client}
            onClick={() => select(item.id)}
            className="dip__tab"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        key={client}
        id="setup-panel"
        role="tabpanel"
        aria-labelledby={`setup-tab-${client}`}
        className="tab-panel flex min-w-0 flex-col gap-5"
        style={{ "--dir": direction } as React.CSSProperties}
      >
      {client === "app" && (
        <>
          <Who>
            Easiest way. For the Claude app or claude.ai in your browser. No
            coding.
          </Who>
          <CopyBlock label="Address to paste" code={url} prominent />
          <Steps
            items={[
              <>Copy the address above.</>,
              <>
                Open Claude and click <strong>Settings</strong>.
              </>,
              <>
                Click <strong>Connectors</strong>.
              </>,
              <>
                Press <strong>Add custom connector</strong>.
              </>,
              <>
                In <strong>Name</strong>, type <strong>HelpmeSolder</strong>.
              </>,
              <>
                Click the address box and paste the address.
              </>,
              <>
                Press <strong>Add</strong>.
              </>,
              <>
                Start a new chat. Press the <strong>+</strong> button (or the
                tools menu).
              </>,
              <>
                Switch <strong>HelpmeSolder</strong> on.
              </>,
            ]}
          />
          <p className="text-sm text-mute">
            Some plans only let the account owner add connectors. If you do not
            see the button, ask whoever manages your team.
          </p>
        </>
      )}

      {client === "cursor" && (
        <>
          <Who>For people who use the Cursor code editor.</Who>
          <a
            href={cursorDeeplink(url)}
            className="press inline-flex items-center justify-center rounded-md bg-ink px-5 py-3.5 text-center text-base font-bold text-paper hover:bg-copper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
          >
            Add to Cursor
          </a>
          <p className="text-sm text-mute">
            Cursor opens and asks you to confirm. Press Install, then switch
            HelpmeSolder on.
          </p>
          <p className="text-ink-soft">
            Button did nothing? Add it by hand instead.
          </p>
          <Steps
            items={[
              <>
                Open <strong>Settings</strong>, then <strong>MCP</strong>.
              </>,
              <>
                Press <strong>Add new MCP server</strong>.
              </>,
              <>Paste this in, then save.</>,
            ]}
          />
          <CopyBlock label="mcp.json" code={urlConfig("url", url)} />
        </>
      )}

      {client === "terminal" && (
        <>
          <Who>
            Only if you use Claude Code, the terminal tool for developers.
          </Who>
          <p className="text-ink-soft">
            Paste this in your terminal and press Enter. Add{" "}
            <code className={CODE}>--scope user</code> to use it in every
            project.
          </p>
          <CopyBlock
            label="Claude Code, in your terminal"
            code={`claude mcp add --transport http helpmesolder ${url}`}
          />
          <Who>Only if you use Codex, the OpenAI terminal tool.</Who>
          <p className="text-ink-soft">
            Paste this in your terminal, or add the block below to{" "}
            <code className={CODE}>~/.codex/config.toml</code> yourself. Then
            restart Codex.
          </p>
          <CopyBlock label="Codex, in your terminal" code={`codex mcp add helpmesolder --url ${url}`} />
          <CopyBlock label="~/.codex/config.toml" code={codexToml(url)} />
        </>
      )}

      {client === "antigravity" && (
        <>
          <Who>Only if you use Antigravity, the Google code editor.</Who>
          <Steps
            items={[
              <>
                In the agent panel, open the <strong>...</strong> menu.
              </>,
              <>
                Click <strong>MCP Servers</strong>, then{" "}
                <strong>Manage MCP Servers</strong>.
              </>,
              <>
                Click <strong>View raw config</strong>.
              </>,
              <>
                Add the block below to{" "}
                <code className={CODE}>mcp_config.json</code> and save.
              </>,
              <>Refresh the server list.</>,
            ]}
          />
          <CopyBlock label="mcp_config.json" code={urlConfig("serverUrl", url)} />
        </>
      )}
      </div>

      <div className="flex flex-col gap-3 border-t border-line-strong pt-5">
        <h4 className="font-display text-lg font-bold text-ink">
          Or let your AI do it
        </h4>
        <p className="text-ink-soft">
          Paste this sentence into a chat with your assistant. Some assistants
          can set it up for you.
        </p>
        <CopyBlock
          label="Say this to your assistant"
          code={`Please add this remote MCP server to yourself: ${url} (name: helpmesolder)`}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-line-strong pt-5">
        <h4 className="font-display text-lg font-bold text-ink">
          How do I know it worked?
        </h4>
        <p className="text-ink-soft">
          Start a new chat and ask this:
        </p>
        <p className="rounded-md bg-paper-deep/70 px-4 py-3 font-medium leading-relaxed text-ink">
          What can HelpmeSolder do?
        </p>
        <p className="text-ink-soft">
          It should list tools like <code className={CODE}>create_guide</code>{" "}
          and <code className={CODE}>add_part</code>. Or just describe your
          project and it will start asking about power and sensors.
        </p>
      </div>
    </div>
  );
}

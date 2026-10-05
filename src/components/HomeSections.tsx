import { InView } from "@/components/InView";
import { SetupGuide } from "@/components/SetupGuide";
import { retentionNotice } from "@/lib/guides/retention";

const HOW_IT_WORKS = [
  {
    title: "Plan in chat",
    body: "Describe your project to Claude or Cursor. It picks a board and parts from the catalog and asks about power and sensors.",
  },
  {
    title: "Tools write the guide",
    body: "MCP tools add parts, wires and steps. Bad pins or unsafe voltages are blocked, with safer alternatives suggested.",
  },
  {
    title: "Open the link",
    body: "You get a secret URL with a parts prep list, a full wiring diagram and step-by-step soldering notes. It updates as the chat iterates.",
  },
];

const TOOLS = [
  { name: "list_catalog", body: "Browse boards, modules, passives and ready-made recipes." },
  { name: "get_part_details", body: "Read a part in full: how to tell it apart, pins, voltage limits and what to watch out for." },
  { name: "create_guide", body: "Start a guide and get its secret link." },
  { name: "ask_power_source", body: "Ask you how the build is powered, never guessing." },
  { name: "ask_sensor", body: "Ask you which exact sensor or input module to use." },
  { name: "add_part", body: "Place a catalog part on the guide." },
  { name: "add_connection", body: "Wire two exact pins together." },
  { name: "set_steps", body: "Write the ordered soldering steps and notes." },
  { name: "validate_guide", body: "Check pins and voltages, and get alternatives for any problem." },
];

const HEADING =
  "font-display text-4xl font-bold leading-[1.02] tracking-tight text-ink sm:text-5xl";

export function HomeSections() {
  return (
    <>
      <section
        id="how"
        className="relative z-10 bg-paper px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={HEADING}>
              Your chat plans it. We draw it from real parts.
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
              HelpmeSolder is not a chatbot. Your own Claude or Cursor does the
              planning and calls our tools. Every diagram is drawn from a parts
              catalog, so pins are never invented.
            </p>
          </div>

          <InView className="trace-scope min-w-0">
            <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              <span
                aria-hidden="true"
                className="trace-rail md:hidden"
              />
              <span
                aria-hidden="true"
                className="trace-rail-h hidden md:block"
              />
              {HOW_IT_WORKS.map((item, index) => (
                <li
                  key={item.title}
                  style={{ "--i": index } as React.CSSProperties}
                  className="trace-step relative flex flex-col gap-3 pl-14 md:pl-0 md:pt-14"
                >
                  <span
                    aria-hidden="true"
                    className="pad absolute left-0 top-0"
                  />
                  <h3 className="font-display text-2xl font-bold tracking-tight text-ink">
                    {item.title}
                  </h3>
                  <p className="text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ol>
          </InView>
        </div>
      </section>

      <section
        id="setup"
        tabIndex={-1}
        className="relative z-10 bg-paper-deep/60 px-6 py-24 outline-none sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className={HEADING}>Connect it to your AI in two minutes</h2>
            <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
              This is a small plug that lets your AI assistant, like Claude or
              Cursor, use HelpmeSolder. You add one web address, once. Then you
              can ask your assistant for a soldering guide. There is nothing to
              install and no key to find.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <InView className="trace-scope min-w-0">
              <ol className="relative flex flex-col gap-10">
                <span aria-hidden="true" className="trace-rail" />

                <li
                  style={{ "--i": 0 } as React.CSSProperties}
                  className="trace-step relative flex flex-col gap-3 pl-14"
                >
                  <span aria-hidden="true" className="pad absolute left-0 top-0">
                    1
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Add the address to your AI app
                  </h3>
                  <p className="text-ink-soft">
                    Choose your app with the switch and follow the numbered steps.
                    In some menus you will see the letters MCP. That is the
                    name of the plug. If the app asks, restart it.
                  </p>
                </li>

                <li
                  style={{ "--i": 1 } as React.CSSProperties}
                  className="trace-step relative flex flex-col gap-3 pl-14"
                >
                  <span aria-hidden="true" className="pad absolute left-0 top-0">
                    2
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Say what you want to build
                  </h3>
                  <p className="text-ink-soft">
                    Claude asks which power source and sensor you have, then
                    replies with a secret link to your guide.
                  </p>
                  <p className="rounded-md bg-paper px-4 py-3 font-medium leading-relaxed text-ink shadow-[0_1px_0_var(--line-strong)]">
                    Use HelpmeSolder to make me a guide for an ESP32 that reads a
                    soil moisture sensor and sounds a buzzer when the soil is
                    dry.
                  </p>
                </li>
              </ol>
            </InView>

            <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
              <SetupGuide />
            </div>
          </div>
        </div>
      </section>

      <section
        id="tools"
        className="relative z-10 bg-paper px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          <h2 className={HEADING}>Eight tools, one guide</h2>
          <dl className="grid gap-x-12 border-t border-line-strong md:grid-cols-2">
            {TOOLS.map((tool) => (
              <div key={tool.name} className="pinout-row">
                <span aria-hidden="true" className="pinout-row__pad" />
                <dt className="pinout-row__name font-mono text-sm font-medium text-copper-deep">
                  {tool.name}
                </dt>
                <dd className="text-ink-soft">{tool.body}</dd>
              </div>
            ))}
          </dl>
          <div className="flex max-w-xl flex-col gap-2 text-sm text-mute">
            <p>
              Guides live at a secret, unguessable link. There are no accounts,
              so anyone with the link can view the guide.
            </p>
            <p>
              Your guide link is private and unlisted. {retentionNotice()}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

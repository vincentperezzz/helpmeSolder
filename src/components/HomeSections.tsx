import { ExampleGuide } from "@/components/ExampleGuide";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InView } from "@/components/InView";
import { SetupGuide } from "@/components/SetupGuide";
import { TOOL_GROUPS, TOOL_NAMES } from "@/lib/home/tools";

const HEADING =
  "font-display text-balance text-4xl font-bold leading-[1.02] tracking-tight text-ink sm:text-5xl";

const PROMPT_EXAMPLE =
  "Use HelpmeSolder to make me a guide for an ESP32 that reads a soil moisture sensor and sounds a buzzer when the soil is dry.";

export function HomeSections() {
  return (
    <>
      <InView className="scroll-reveal">
        <ExampleGuide />
      </InView>

      <section
        id="how"
        className="relative z-10 scroll-mt-20 bg-paper-deep/60 px-6 py-24 sm:px-10 lg:px-16"
      >
        <InView className="scroll-reveal mx-auto flex w-full max-w-5xl flex-col gap-12">
          <HowItWorks />
        </InView>
      </section>

      <section
        id="setup"
        tabIndex={-1}
        className="relative z-10 scroll-mt-20 bg-paper px-6 py-24 outline-none sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
          <InView className="scroll-reveal flex max-w-[60ch] flex-col gap-4">
            <span className="font-mono text-xs font-bold tracking-wider text-copper uppercase">
              03 · Integration
            </span>
            <h2 className={HEADING}>Set up the MCP</h2>
            <p className="text-lg leading-relaxed text-ink-soft">
              MCP is a small plug that lets your AI assistant, like Claude or
              Cursor, use HelpmeSolder. You add one web address, once. Then you
              can ask your assistant for a soldering guide. There is nothing to
              install and no key to find.
            </p>
          </InView>

          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
            <InView className="scroll-reveal trace-scope min-w-0" style={{ "--stagger": 1 } as React.CSSProperties}>
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
                    Choose your app with the switch and follow the numbered
                    steps. In some menus you will see the letters MCP. That is
                    the name of the plug. If the app asks, restart it.
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
                  <p className="rounded-md bg-paper-deep/70 px-4 py-3 font-medium leading-relaxed text-ink">
                    {PROMPT_EXAMPLE}
                  </p>
                </li>
              </ol>
            </InView>

            <InView className="scroll-reveal min-w-0" style={{ "--stagger": 2 } as React.CSSProperties}>
              <SetupGuide />
            </InView>
          </div>
        </div>
      </section>

      <section
        id="tools"
        className="relative z-10 scroll-mt-20 bg-paper-deep/60 px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
          <InView className="scroll-reveal flex max-w-[60ch] flex-col gap-4">
            <span className="font-mono text-xs font-bold tracking-wider text-copper uppercase">
              04 · Reference
            </span>
            <h2 className={HEADING}>The tools your assistant uses</h2>
            <p className="text-lg leading-relaxed text-ink-soft">
              {TOOL_NAMES.length} tools in four groups. Your assistant picks
              them. You never call them yourself.
            </p>
          </InView>

          <InView className="scroll-reveal tool-groups" style={{ "--stagger": 1 } as React.CSSProperties}>
            {TOOL_GROUPS.map((group) => (
              <section key={group.title} className="tool-group">
                <h3 className="tool-group__title">{group.title}</h3>
                <dl className="tool-group__list">
                  {group.tools.map((tool, index) => (
                    <div
                      key={tool.name}
                      tabIndex={0}
                      className="tool-row"
                      style={{ "--i": index } as React.CSSProperties}
                    >
                      <dt className="tool-row__name">
                        <span>{tool.name}</span>
                        <span className="tool-row__arrow" aria-hidden="true">→</span>
                      </dt>
                      <dd className="tool-row__body">{tool.body}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </InView>
        </div>
      </section>
    </>
  );
}

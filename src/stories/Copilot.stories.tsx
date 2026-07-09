import type { Meta, StoryObj } from "@storybook/react";
import { ArtifactRenderer } from "../components/copilot/artifacts";
import ChatThread from "../components/copilot/ChatThread";
import { CopilotProvider } from "../components/copilot/CopilotProvider";
import { CopilotLauncher } from "../components/copilot/CopilotLauncher";
import { CopilotSelectionTrigger } from "../components/copilot/CopilotSelectionTrigger";
import type { CopilotClient } from "../components/copilot/client";
import type { CopilotQuickAction } from "../components/copilot/types";
import { LanguageProvider } from "@togo-framework/ui-core";

const meta: Meta = {
  title: "Components/Copilot",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Copilot UI ported from prism, decoupled from the cortex SDK. The **artifacts** " +
          "(ArtifactRenderer → table/chart/**rich card**/markdown/actions) and the **chat** shell " +
          "(ChatThread). Assistant text renders through the kit MarkdownRenderer, so a full reply " +
          "parses over markdown (tables → DataTable, code → CodeBlock) AND artifacts. The live dock " +
          "(CopilotProvider/UnifiedCopilotDock) takes a host-injected `CopilotClient`.",
      },
    },
  },
};
export default meta;

const md = { version: 1, kind: "markdown", title_en: "Executive summary", data: { content: "## Key findings\n\n- Coordinated activity **up 23%**\n- Two dominant source clusters\n- Recommend escalation to the regional desk" } } as any;
const table = { version: 1, kind: "table", title_en: "Top sources", data: { columns: ["Source", "Mentions", "Reach"], rows: [["Reuters", 333, "High"], ["AFP", 276, "Medium"], ["Al Jazeera", 190, "Medium"]] } } as any;

// Rich intelligence card — summary + metric grid + related + footer (bilingual).
const richCard = {
  version: 1, kind: "card",
  title_en: "Renewable energy policy debate", title_ar: "النقاش حول سياسات الطاقة المتجددة",
  data: {
    summary_en: "Debate on renewable energy policy in the Gulf rose 340% yesterday, driven by coordinated political signals.",
    summary_ar: "ارتفع النقاش حول سياسات الطاقة المتجددة في منطقة الخليج بنسبة 340٪ أمس، مدفوعاً بإشارات سياسية منسقة.",
    metrics: [
      { label_en: "Volume change", label_ar: "تغير الحجم", value: "+340%", tone: "positive", icon: "trend", trend: [3, 5, 4, 8, 12, 9, 14] },
      { label_en: "Key influencers", label_ar: "المؤثرون الرئيسيون", value: "12 accounts", tone: "neutral", icon: "users" },
      { label_en: "Monitoring window", label_ar: "فترة المراقبة", value: "48 hours", tone: "neutral", icon: "clock" },
      { label_en: "Source", label_ar: "المصدر", value: "Organic", tone: "positive", icon: "source" },
    ],
    related_en: [
      "Saudi Arabia 2030 climate commitments draft leaked",
      "UAE surprise solar-grid announcement",
      "Coordinated discussion via major influencer accounts",
    ],
    related_ar: [
      "تسرب مسودة التزامات المملكة العربية السعودية المناخية لعام 2030",
      "إعلان الإمارات المفاجئ عن شبكة الطاقة الشمسية",
      "نقاش منسق عبر حسابات المؤثرين الكبار",
    ],
    footer_en: "Recommend monitoring political announcements over the next 48 hours.",
    footer_ar: "يُنصح برصد الإعلانات السياسية خلال الـ 48 ساعة القادمة.",
  },
} as any;

const chart = {
  version: 1, kind: "chart",
  title_en: "Mentions — last 7 days", title_ar: "الإشارات — آخر 7 أيام",
  data: {
    type: "bar",
    series: [{
      label_en: "Mentions", label_ar: "الإشارات",
      points: [
        { x: "Mon", y: 120 }, { x: "Tue", y: 180 }, { x: "Wed", y: 165 },
        { x: "Thu", y: 240 }, { x: "Fri", y: 320 }, { x: "Sat", y: 280 }, { x: "Sun", y: 410 },
      ],
    }],
  },
} as any;

export const Artifacts: StoryObj = {
  name: "Artifacts — rich card / chart / table / markdown",
  render: () => (
    <div className="max-w-2xl space-y-4">
      <ArtifactRenderer artifact={richCard} />
      <ArtifactRenderer artifact={chart} />
      <ArtifactRenderer artifact={table} />
      <ArtifactRenderer artifact={md} />
    </div>
  ),
};

export const ArtifactsRTL: StoryObj = {
  name: "Artifacts — Arabic / RTL",
  render: () => (
    <div className="max-w-2xl space-y-4" dir="rtl">
      <ArtifactRenderer artifact={richCard} language="ar" />
      <ArtifactRenderer artifact={chart} language="ar" />
    </div>
  ),
};

export const Chat: StoryObj = {
  name: "Chat thread",
  render: () => (
    <div className="max-w-2xl">
      <ChatThread
        messages={[
          { id: "1", role: "user", content: "Summarize the latest narrative." } as any,
          { id: "2", role: "assistant", content: "Coordinated activity is up 23% across monitored regions, concentrated in two source clusters.", a2uiArtifacts: [richCard] } as any,
          { id: "3", role: "user", content: "Which sources?" } as any,
          { id: "4", role: "assistant", content: "Here are the top contributors:", a2uiArtifacts: [table] } as any,
        ]}
      />
    </div>
  ),
};

// ── Full Dock — wired CopilotProvider with a mock streaming client ──────────────
// The streamed reply text contains BOTH a markdown table AND a fenced code block
// (so it parses over the MarkdownRenderer: DataTable + CodeBlock), then emits a
// rich card artifact + a chart artifact — full response = markdown + artifacts.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const replyMd = [
  "Sure — coordinated activity is **up 23%** this week, concentrated in two source clusters. Top contributors:\n\n",
  "| Source | Mentions | Reach |\n",
  "| --- | --- | --- |\n",
  "| Reuters | 333 | High |\n",
  "| AFP | 276 | Medium |\n",
  "| Al Jazeera | 190 | Medium |\n\n",
  "A quick query to reproduce these counts:\n\n",
  "```sql\n",
  "SELECT source, count(*) AS mentions\n",
  "FROM raw_envelopes\n",
  "GROUP BY source\n",
  "ORDER BY mentions DESC;\n",
  "```\n",
];

const mockClient: CopilotClient = {
  async *copilotDispatch() {
    yield { type: "step", step: { step: "search", message: "Searching sources…", done: false } } as any;
    await sleep(400);
    for (const chunk of replyMd) {
      await sleep(70);
      yield { type: "delta", text: chunk } as any;
    }
    yield { type: "step", step: { step: "search", message: "Searched 3 sources", done: true, count: 3 } } as any;
    await sleep(250);
    yield { type: "artifact", artifact: richCard } as any;
    await sleep(150);
    yield { type: "artifact", artifact: chart } as any;
    yield { type: "done" } as any;
  },
};

// Intro quick-action chips (empty state). Each sends its prompt on click.
const quickActions: CopilotQuickAction[] = [
  { label_en: "Summarise alerts", label_ar: "لخّص التنبيهات", prompt: "Summarise the latest alerts." },
  { label_en: "Top sources", label_ar: "أبرز المصادر", prompt: "Which sources are driving the coverage?" },
  { label_en: "7-day trend", label_ar: "اتجاه 7 أيام", prompt: "Show the mention trend over the last 7 days." },
];

export const FullDock: StoryObj = {
  name: "Full Dock — markdown + artifacts (mock streaming)",
  parameters: { layout: "fullscreen", fullBleed: true, docs: { story: { inline: false, height: "640px" } } },
  render: () => (
    <LanguageProvider initialLanguage="en">
      <CopilotProvider
        client={mockClient}
        quickActions={quickActions}
        context={{ contextType: "global", contextRef: "", title_en: "Demo", title_ar: "تجربة", suggestions: [] } as any}
      >
        <div className="min-h-screen bg-background p-8 text-foreground">
          <h1 className="mb-2 text-2xl font-semibold">Copilot demo</h1>
          <p className="mb-4 max-w-prose text-sm text-muted-foreground">
            Click the launcher → the intro shows <strong>quick-action chips</strong>. Send a message and
            the reply streams a markdown table + code block (kit DataTable + CodeBlock) and returns a
            rich card + chart artifact. The thinking indicator stays until the full response renders.
          </p>
          <ul className="mb-6 max-w-prose list-disc ps-5 text-sm text-muted-foreground space-y-1">
            <li><strong>Float mode:</strong> open the ⋮ menu → “Float (undock)”, or click the undock icon in the header. Then drag the window by its header and resize it from the bottom corner — position + size persist across reloads.</li>
            <li><strong>Smart action:</strong> select any of this paragraph’s text → an “Ask Copilot” bubble appears → click it to open the dock pre-filled with your selection.</li>
          </ul>
          <p data-copilot-selectable className="mb-6 max-w-prose rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            Try selecting this sentence. Coordinated activity rose 23% this week across two source
            clusters, with renewable-energy policy the dominant narrative in the Gulf region.
          </p>
          <CopilotLauncher variant="header" />
          {/* Smart action: select page text → "Ask Copilot" → opens prefilled. */}
          <CopilotSelectionTrigger boundarySelector="[data-copilot-selectable]" />
        </div>
      </CopilotProvider>
    </LanguageProvider>
  ),
};

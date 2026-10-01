<!-- togo-header -->
# @togo-framework/ui-copilot

> [!WARNING]
> **Deprecated.** This package is no longer maintained. togo now uses
> [Nasaq](https://nasaq.fadymondy.com) (`@fadymondy/nasaq`) as its default UI kit:
> new apps from `create-togo-app` and the official plugins are built on it.
> Install it with `npm i @fadymondy/nasaq` and import from `@fadymondy/nasaq/web`.

Copilot chat dock + streaming (host injects a `CopilotClient`), chat
message/artifact renderers (tables, charts, cards, markdown), and the intel
severity chip. Part of the togo UI kit.

`chat/` and `copilot/` are merged into this one package because they have a
circular dependency on each other in the original source.

```bash
npm install @togo-framework/ui-copilot
```

```tsx
import { CopilotProvider, UnifiedCopilotDock } from "@togo-framework/ui-copilot";
```

Requires `@togo-framework/ui-core` and `@togo-framework/ui-markdown`.
<!-- togo-sponsors -->

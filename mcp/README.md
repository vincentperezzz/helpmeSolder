# HelpmeSolder MCP

Thin MCP server for Cursor/Claude. Tools call the Next.js API. No hosted LLM.

## Tools

- `create_guide`
- `ask_power_source` — **ask the user** battery vs USB wall (never guess)
- `set_power_source`
- `add_part`
- `add_connection`
- `set_steps`
- `get_guide`
- `list_catalog` — boards, modules, passives (breadboard/resistors/LEDs/…), recipes
- `validate_guide`

## Env

| Variable | Purpose |
| --- | --- |
| `HELPMESOLDER_API_URL` | API base URL (default `http://localhost:3000`) |
| `MCP_API_KEY` | Optional bearer key if the API requires it |

## Run locally

```bash
cd mcp
npm install
npm run build
HELPMESOLDER_API_URL=http://localhost:3000 node dist/index.js
```

## Cursor MCP config

Add to Cursor MCP settings (example):

```json
{
  "mcpServers": {
    "helpmesolder": {
      "command": "node",
      "args": ["/ABS/PATH/TO/helpmeSolder/mcp/dist/index.js"],
      "env": {
        "HELPMESOLDER_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Claude Desktop config

Same shape under `mcpServers` in `claude_desktop_config.json`.

## Flow for the LLM

1. `list_catalog` to pick board + modules + passives (resistor/breadboard when needed)
2. `ask_power_source` → **ask the user** battery pack vs USB wall adapter — do not invent it
3. `create_guide` → tell user the secret URL
4. `set_power_source` with their answer (this picks the power diagram on the guide page)
5. `add_part`, `add_connection`, `set_steps`
6. `validate_guide` and fix using `alternatives[]`

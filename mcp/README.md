# HelpmeSolder MCP

Thin MCP server for Cursor/Claude. Tools call the Next.js API. No hosted LLM.

## Tools

- `create_guide`
- `ask_power_source` — **ask the user** USB wall vs battery kind (never guess)
- `ask_sensor` — **ask the user** which exact sensor/input module (never guess)
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

1. `list_catalog` to pick board + passives (resistor/breadboard when needed)
2. `ask_power_source` → **ask the user** USB wall vs specific battery kind — do not invent it
3. When the build needs sensing, measurement, or a specific input module → `ask_sensor` → **ask the user** which exact part — do not invent it
4. `create_guide` → tell user the secret URL
5. `set_power_source` with their power answer (`usb_wall` or `battery`; note battery kind in steps)
6. `add_part` using catalog ids from the sensor answer and catalog
7. `add_connection`, `set_steps`
8. `validate_guide` and fix using `alternatives[]`

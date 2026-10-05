# Product

## Problem

Non-EE builders can plan a project in chat, but turning that into a clear prep list, wiring diagram, and steps is messy. Generic LLM diagrams invent pins. Simulators are overkill.

## Solution

HelpmeSolder is the durable guide surface. The LLM stays in Cursor/Claude. Our MCP tools write structured guide state. The web page is canonical.

## Guide page (locked)

1. Prep / parts
2. Full wiring diagram
3. Structured steps / notes

## Delivery (locked)

- Chat says: open this link
- Web URL is the source of truth
- Same secret URL updates when chat iterates

## Visuals (locked)

- Photo boards + skeleton modules
- Catalog-rendered SVG only
- No LLM freestyle diagrams

## Boards v1

- ESP32
- Pico
- Uno / Nano
- ESP8266

## Modules / recipes v1

- Buzzer
- LCD (I2C 1602)
- Soil moisture

## Power (locked)

- LLM sets one id from the power table (USB wall or power bank, AA/AAA/C/D alkaline, NiMH or lithium holders, 9V, CR2032, LiPo, Li-ion cells, 9V/12V barrel supply); `battery` still means 3xAA
- If unknown, API tells the LLM to ask the user

## Validation (locked)

- Hard block on bad pins/parts
- Response includes `alternatives[]`

## Auth v1 (locked)

- Secret unguessable `/guides/[id]` only
- No login

## Non-goals v1

- User accounts
- Public gallery
- Real-time collaboration
- Arbitrary custom boards outside catalog
- Hosted LLM chat UI

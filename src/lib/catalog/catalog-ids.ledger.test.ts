import { describe, expect, it } from "vitest";
import ledger from "./catalog-ids.ledger.json";
import { getCatalogPart, listCatalog } from "./index";
import { ID_PATTERN } from "./schema";

const ids: string[] = ledger.ids;

describe("catalog id ledger", () => {
  it("is sorted, unique and made of valid ids", () => {
    expect(ids).toEqual([...new Set(ids)].sort());
    for (const id of ids) expect(ID_PATTERN.test(id), id).toBe(true);
  });

  it("every ledger id still resolves (deprecated parts count), so ids are never removed", () => {
    const missing = ids.filter((id) => !getCatalogPart(id));
    expect(missing, "Ids must never be removed or renamed: deprecate the part instead").toEqual([]);
  });

  it("every listed catalog part is in the ledger (add new ids to catalog-ids.ledger.json)", () => {
    const c = listCatalog();
    const known = new Set(ids);
    const unlisted = [...c.boards, ...c.modules, ...c.passives]
      .map((p) => p.id)
      .filter((id) => !known.has(id));
    expect(unlisted).toEqual([]);
  });
});

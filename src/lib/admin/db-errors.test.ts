import { describe, expect, it } from "vitest";
import { classifyDbError } from "./db-errors";

describe("classifyDbError", () => {
  it("recognises a missing table", () => {
    expect(classifyDbError({ code: "42P01" }, "part_requests")).toBe("missing");
    expect(classifyDbError({ code: "PGRST205" }, "part_requests")).toBe("missing");
    expect(
      classifyDbError({ message: 'relation "public.part_requests" does not exist' }, "part_requests"),
    ).toBe("missing");
    expect(
      classifyDbError(
        { message: "Could not find the table 'public.daily_clients' in the schema cache" },
        "daily_clients",
      ),
    ).toBe("missing");
  });

  it("does not call a permission error a missing table", () => {
    expect(
      classifyDbError({ code: "42501", message: "permission denied for table part_requests" }, "part_requests"),
    ).toBe("denied");
    expect(classifyDbError({ message: "permission denied for table daily_clients" }, "daily_clients")).toBe(
      "denied",
    );
  });

  it("treats everything else as other", () => {
    expect(classifyDbError({ code: "500", message: "boom" }, "part_requests")).toBe("other");
    expect(classifyDbError({ message: "unrelated does not exist" }, "part_requests")).toBe("other");
    expect(classifyDbError(null, "part_requests")).toBe("other");
  });
});

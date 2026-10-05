export type DbError = { message?: string; code?: string } | null;

/** What a failed read tells us: the table is not there, we may not read it, or something else broke. */
export type DbProblem = "missing" | "denied" | "other";

export const DENIED_TEXT =
  "The server cannot read this table. It is probably using a key without access. Check that SUPABASE_SERVICE_ROLE_KEY is set to the service key.";

/**
 * Tells "table missing" apart from "no access". A message that merely names the
 * table is not enough: "permission denied for table x" names it too.
 */
export function classifyDbError(error: DbError, table: string): DbProblem {
  if (!error) return "other";
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "denied";
  }

  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes(table.toLowerCase()) &&
      /does not exist|could not find the table|schema cache/.test(message))
  ) {
    return "missing";
  }

  return "other";
}

import { afterEach, beforeEach } from "vitest";
import { resetCatalogToSeed } from "@/lib/catalog/registry";

// Every test starts and ends on the bundled seed, whatever it swapped in.
beforeEach(resetCatalogToSeed);
afterEach(resetCatalogToSeed);

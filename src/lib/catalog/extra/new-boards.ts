import arduinoA from "./new-boards/arduino-a";
import arduinoB from "./new-boards/arduino-b";
import espRp from "./new-boards/esp-rp";
import type { NewBoardsGroup } from "./new-boards/_helpers";

const GROUPS: NewBoardsGroup[] = [arduinoA, arduinoB, espRp];

/** Boards added after the first expansion; one group file per family in ./new-boards/. */
export const NEW_BOARDS = GROUPS.flatMap((g) => g.parts);
export const NEW_BOARDS_MEDIA: Record<string, string> = Object.assign({}, ...GROUPS.map((g) => g.media));
export const NEW_BOARDS_QUERIES = Object.assign({}, ...GROUPS.map((g) => g.queries)) as NewBoardsGroup["queries"];

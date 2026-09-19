import type { FieldId } from "../types";
import { ART_BANK } from "./art";
import { BIZ_BANK } from "./biz";
import { EDU_BANK } from "./edu";
import { ENG_BANK } from "./eng";
import { ENV_BANK } from "./env";
import { IT_BANK } from "./it";
import { LAW_BANK } from "./law";
import { MED_BANK } from "./med";
import { SCI_BANK } from "./sci";
import { SEC_BANK } from "./sec";
import { TRD_BANK } from "./trd";
import type { Stage2Question } from "./types";

export type { Stage2Question } from "./types";

export const STAGE2_BANKS: Readonly<Record<FieldId, readonly Stage2Question[]>> = {
  ENG: ENG_BANK,
  IT: IT_BANK,
  SCI: SCI_BANK,
  MED: MED_BANK,
  BIZ: BIZ_BANK,
  LAW: LAW_BANK,
  ART: ART_BANK,
  EDU: EDU_BANK,
  ENV: ENV_BANK,
  TRD: TRD_BANK,
  SEC: SEC_BANK,
};

export function bankOf(field: FieldId): readonly Stage2Question[] {
  return STAGE2_BANKS[field];
}

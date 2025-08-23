
import { JurisdictionRules } from "./types.js";
import { ESRules } from "./es.js";
import { PTRules } from "./pt.js";
import { USRules } from "./us.js";

export const rulesRegistry: Record<string, JurisdictionRules> = {
  ES: ESRules,
  PT: PTRules,
  US: USRules
};



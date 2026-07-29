import { createDocumentViaUI } from "./documents.mjs";

export const ITEM_TYPES = [
  "ammo",
  "armor",
  "clothing",
  "criticalInjury",
  "cyberdeck",
  "cyberware",
  "drug",
  "gear",
  "itemUpgrade",
  "netarch",
  "program",
  "role",
  "skill",
  "vehicle",
  "weapon",
];

export async function createItemViaUI(page, { type, name }) {
  return createDocumentViaUI(page, { documentTab: "items", type, name });
}

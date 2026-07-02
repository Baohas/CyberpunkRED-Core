import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";
import CPR from "../../system/config.js";

/**
 * A NET Architecture is purchasable hardware whose floors are structured data. Each floor
 * holds one node: password/file/controlNode/program/blackIce/demon/root. blackIce & demon
 * floors link a Program item (`programUuid`); file floors link a document (`fileContentUuid`,
 * an Item/JournalEntry/JournalEntryPage); control-node floors link device actors
 * (`controlNodeDeviceUuids`). Reveal state is split into `revealed` (content, via Pathfinder)
 * and `dvRevealed` (the DV, learned separately).
 */
export default class NetArchDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ValuableSchema,
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      // The in-fiction owner of this architecture (a Corp, gang, or individual), shown in the
      // Netrunning App header. Blank when unset.
      owner: new fields.StringField({
        required: false,
        blank: true,
        initial: "",
      }),
      difficulty: new fields.StringField({
        blank: false,
        initial: "standard",
        choices: Object.keys(CPR.netArchDifficulty),
      }),
      floors: new fields.ArrayField(
        new fields.SchemaField({
          content: new fields.StringField({
            blank: false,
            initial: "password",
            choices: Object.keys(CPR.netArchFloorContent),
          }),
          dv: new fields.NumberField({
            required: true,
            nullable: true,
            integer: true,
            initial: null,
            min: 0,
          }),
          // A branch path: null on the main spine, else a dot-separated line id ("a", "a.b" for a
          // branch nested under "a"). Free-form (no fixed choices) so branches can nest.
          branch: new fields.StringField({
            required: true,
            nullable: true,
            blank: false,
            initial: null,
          }),
          depth: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 1,
            min: 1,
          }),
          revealed: new fields.BooleanField({ initial: false }),
          dvRevealed: new fields.BooleanField({ initial: false }),
          // Link to a GM-supplied Program item (blackIce/demon floors).
          programUuid: new fields.StringField({ blank: true, initial: "" }),
          // Display label for the intended ICE/demon when no programUuid is linked yet
          // (set by generation, or carried over from the legacy `blackice` value on migration).
          iceName: new fields.StringField({ blank: true, initial: "" }),
          // Link to an Item / JournalEntry / JournalEntryPage (file floors).
          fileContentUuid: new fields.StringField({ blank: true, initial: "" }),
          // Device actors granted to the runner on a successful Control (control-node floors).
          controlNodeDeviceUuids: new fields.ArrayField(
            new fields.StringField(),
          ),
          virusPlanted: new fields.BooleanField({ initial: false }),
          description: new fields.StringField({ blank: true }),
        }),
      ),
    });
  }

  /** @inheritdoc */
  static migrateData(source) {
    // Legacy floors stored `content` as an i18n key, `dv`/`floor` as strings, and the ICE
    // choice in `blackice`. Remap to the new shape. Idempotent: new-shape floors carry a
    // short `content` key ("password", …) which is absent from CONTENT_MAP, so they skip.
    if (Array.isArray(source.floors)) {
      const CONTENT_MAP = {
        "CPR.netArchitecture.floor.options.password": "password",
        "CPR.netArchitecture.floor.options.file": "file",
        "CPR.netArchitecture.floor.options.controlnode": "controlNode",
        "CPR.global.programClass.blackice": "blackIce",
      };
      source.floors = source.floors.map((floor) => {
        if (!floor || !(floor.content in CONTENT_MAP)) return floor;
        const isBlackIce = floor.content === "CPR.global.programClass.blackice";
        return {
          content: CONTENT_MAP[floor.content],
          dv: floor.dv && floor.dv !== "N/A" ? parseInt(floor.dv, 10) : null,
          branch: floor.branch || null,
          depth: floor.floor ? parseInt(floor.floor, 10) : 1,
          revealed: false,
          dvRevealed: false,
          programUuid: "",
          iceName:
            isBlackIce && floor.blackice && floor.blackice !== "--"
              ? floor.blackice
              : "",
          fileContentUuid: "",
          controlNodeDeviceUuids: [],
          virusPlanted: false,
          description: floor.description || "",
        };
      });
    }
    return super.migrateData(source);
  }
}

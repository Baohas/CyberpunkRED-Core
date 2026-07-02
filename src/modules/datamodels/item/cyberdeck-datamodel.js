import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import QualitySchema from "./mixins/quality-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class CyberdeckDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema,
  ElectronicSchema,
  EquippableSchema,
  InstallableSchema,
  PhysicalSchema,
  QualitySchema,
  UpgradableSchema,
  ValuableSchema,
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(
      super.defineSchema({
        initialAllowedTypes: ["itemUpgrade", "program"],
        initialSlots: 7,
        initialSize: 1,
        isElectronic: true,
      }),
      {
        // Jack-In range in metres (RAW default 6); raised by the "Range" itemUpgrade.
        range: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 6,
          min: 0,
        }),
      },
    );
  }

  /**
   * The Jack-In range after applying any installed "Range" upgrades.
   *
   * @returns {Number} effective range in metres
   */
  get effectiveRange() {
    const upgrade = this.parent.getTotalUpgradeValues?.("range") ?? {
      type: "modifier",
      value: 0,
    };
    return upgrade.type === "override"
      ? upgrade.value
      : this.range + upgrade.value;
  }

  get installedPrograms() {
    return this.parent.getInstalledItems("program");
  }

  get rezzedPrograms() {
    return this.parent
      .getInstalledItems("program")
      .filter((p) => p.system.isRezzed);
  }
}

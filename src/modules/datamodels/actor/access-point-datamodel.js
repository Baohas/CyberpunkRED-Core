import CPRSystemDataModel from "../system-data-model.js";

/**
 * An Access Point is a canvas anchor for a NET Architecture. It is a blank shell until a
 * NET Architecture Item is installed onto it (dragged on, or picked from a dropdown); the
 * installed architecture and its Black-ICE/Demon Program instances live as embedded Items,
 * so this data model itself is deliberately thin. The shared board is rendered by the
 * standalone Netrunning App, which reads this actor's embedded items.
 */
export default class AccessPointDataModel extends CPRSystemDataModel.mixin() {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      notes: new fields.HTMLField(),
    });
  }
}

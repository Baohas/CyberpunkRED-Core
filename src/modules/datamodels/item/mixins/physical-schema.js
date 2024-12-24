export default class PhysicalSchema extends foundry.abstract.DataModel {
  static mixinName = "physical";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      concealable: new fields.SchemaField({
        concealable: new fields.BooleanField({ initial: false }),
        isConcealed: new fields.BooleanField({ initial: false }),
      }),
      brand: new fields.StringField({ blank: true }),
    };
  }
}

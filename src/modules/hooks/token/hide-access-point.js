/**
 * Access points are hidden until a netrunner's Scanner reveals them. PrototypeToken has no
 * `hidden` field (it is a placed-token property), so we set it when an Access Point token is
 * created on a scene.
 *
 * @public
 * @memberof hookEvents
 */
const HideAccessPointToken = () => {
  Hooks.on("preCreateToken", (tokenDoc) => {
    if (tokenDoc.actor?.type === "accessPoint" && tokenDoc.hidden !== true) {
      tokenDoc.updateSource({ hidden: true });
    }
  });
};

export default HideAccessPointToken;

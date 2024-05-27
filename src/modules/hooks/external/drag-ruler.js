/* eslint-disable class-methods-use-this */
import LOGGER from "../../utils/cpr-logger.js";

const InitializeDragRulerIntegration = () => {
  /**
   * DragRuler Module Integration
   * https://github.com/manuelVo/foundryvtt-drag-ruler/
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.once("dragRuler.ready", (SpeedProvider) => {
    LOGGER.trace("dragRulerHook | cprSpeedProvider | Called.");
    class cprSpeedProvider extends SpeedProvider {
      get colors() {
        LOGGER.trace("dragRulerHook | get colors | Called.");
        return [
          { id: "walk", default: 0x00ff00, name: "cprDragRuler.speeds.walk" },
          { id: "run", default: 0xff8000, name: "cprDragRuler.speeds.run" },
        ];
      }

      getRanges(token) {
        LOGGER.trace("dragRulerHook | getRanges  | Called.");
        const walkSpeed =
          token.actor.system.derivedStats.walk.value + token.actor.bonuses.walk;
        const runSpeed =
          token.actor.system.derivedStats.run.value + token.actor.bonuses.run;
        const ranges = [
          { range: walkSpeed, color: "walk" },
          { range: runSpeed, color: "run" },
        ];
        return ranges;
      }
    }

    dragRuler.registerSystem(game.system.id, cprSpeedProvider);
  });
};

export default InitializeDragRulerIntegration;

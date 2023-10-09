module.exports.rules = {
  "logger-after-function-definition": (context) => ({
    MethodDefinition: (node) => {
      const message1 =
        "After a method definition a LOGGER.trace call is needed.";
      const message2 =
        "The LOGGER.trace call after a method definition needs to contain the function name.";
      const functionName = node.key.name;
      if (
        node &&
        node.value &&
        node.value.type === "FunctionExpression" &&
        node.value.body &&
        node.value.body.type === "BlockStatement" &&
        node.value.body.body
      ) {
        if (node.value.body.body[0].type !== "ExpressionStatement") {
          context.report(node, message1);
        } else if (
          node.value.body.body[0].expression &&
          node.value.body.body[0].expression.type !== "CallExpression"
        ) {
          context.report(node, message1);
        } else if (
          node.value.body.body[0].expression.callee &&
          node.value.body.body[0].expression.callee.type !== "MemberExpression"
        ) {
          context.report(node, message1);
        } else if (
          node.value.body.body[0].expression.callee.object &&
          node.value.body.body[0].expression.callee.object.name !== "LOGGER"
        ) {
          context.report(node, message1);
        } else if (
          node.value.body.body[0].expression.arguments[0] &&
          node.value.body.body[0].expression.arguments[0].type !== "Literal"
        ) {
          context.report(node.value.body.body[0].expression, message2);
        } else if (
          node.value.body.body[0].expression.arguments[0].value &&
          !node.value.body.body[0].expression.arguments[0].value.includes(
            functionName
          )
        ) {
          context.report(node.value.body.body[0].expression, message2);
        }
      }
    },
  }),
};

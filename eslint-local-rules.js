// eslint-plugin-local-rules.js
module.exports = {
  rules: {
    'no-router-replace-except-auth': {
      meta: {
        type: 'problem',
        docs: { description: 'Disallow router.replace outside auth screens' },
        messages: {
          unexpected: 'Use `push` for navigation. `router.replace` is only allowed inside auth screens (login/logout).',
        },
      },
      create(context) {
        const filename = context.getFilename();
        const isAuthFile = /(auth|login|logout)/i.test(filename);
        return {
          CallExpression(node) {
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object?.name === 'router' &&
              node.callee.property?.name === 'replace'
            ) {
              if (!isAuthFile) {
                context.report({ node, messageId: 'unexpected' });
              }
            }
          },
        };
      },
    },
  },
};
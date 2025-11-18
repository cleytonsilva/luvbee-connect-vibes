const ruleMeta = (description) => ({
  type: 'problem',
  docs: {
    description,
    recommended: true
  },
  messages: {
    default: description
  },
  schema: []
})

const noInnerHTMLRule = {
  meta: ruleMeta('Evite atribuir diretamente a innerHTML para prevenir XSS.'),
  create(context) {
    return {
      AssignmentExpression(node) {
        if (
          node.left &&
          node.left.type === 'MemberExpression' &&
          !node.left.computed &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'innerHTML'
        ) {
          context.report({ node, messageId: 'default' })
        }
      }
    }
  }
}

const noDangerouslySetInnerHTMLRule = {
  meta: ruleMeta('dangerouslySetInnerHTML deve ser evitado sem sanitização.'),
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name && node.name.name === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'default' })
        }
      }
    }
  }
}

const noImpliedEvalRule = {
  meta: ruleMeta('Evite usar strings em setTimeout/setInterval, use funções em vez disso.'),
  create(context) {
    const disallowed = new Set(['setTimeout', 'setInterval'])
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          disallowed.has(node.callee.name) &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          context.report({ node, messageId: 'default' })
        }
      }
    }
  }
}

const noEvalRule = {
  meta: ruleMeta('eval() é proibido por motivos de segurança.'),
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          context.report({ node, messageId: 'default' })
        }
      }
    }
  }
}

const plugin = {
  rules: {
    'no-inner-html': noInnerHTMLRule,
    'no-dangerously-set-innerhtml': noDangerouslySetInnerHTMLRule,
    'no-implied-eval': noImpliedEvalRule,
    'no-eval': noEvalRule
  }
}

export default plugin

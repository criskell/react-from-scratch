// @ts-nocheck

const createTextElement = (text) => ({
  type: 'TEXT_ELEMENT',
  props: {
    nodeValue: text,
    children: [],
  },
});

const createElement = (type, props, ...children) => ({
  type,
  props: {
    ...props,
    children: children.map((child) =>
      typeof child === 'object' ? child : createTextElement(child)
    ),
  },
});

const createFiberNode = (fiber) => {
  const node =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);

  updateNode(node, {}, fiber.props);

  return node;
};

const isEvent = (key) => key.startsWith('on');
const isProperty = (key) => key !== 'children' && !isEvent(key);

const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

const updateNode = (node, previousProps, nextProps) => {
  // Remove removed or changed event listeners.
  Object.keys(previousProps)
    .filter(isEvent)
    .filter(
      (key) => !(key in nextProps) || isNew(previousProps, nextProps)(key)
    )
    .forEach((key) => {
      const eventType = name.toLowerCase().substring(2);

      node.removeEventListener(eventType, previousProps[name]);
    });

  // Remove old properties.
  Object.keys(previousProps)
    .filter(isProperty)
    .filter(isGone(previousProps, nextProps))
    .forEach((name) => {
      node[name] = '';
    });

  // Save properties.
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(previousProps, nextProps))
    .forEach((name) => {
      node[name] = nextProps[name];
    });

  // Add event listeners.
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(previousProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);

      node.addEventListener(eventType, nextProps[name]);
    });
};

const commitRootFiber = () => {
  deletions.forEach(commitWork);
  commitWork(wipRootFiber.child);
  currentRootFiber = wipRootFiber;
  wipRootFiber = null;
};

const commitWork = (fiber) => {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;

  while (!domParentFiber.node) {
    domParentFiber = domParentFiber.parent;
  }

  const parentNode = domParentFiber.node;

  if (fiber.effectTag === 'PLACEMENT' && fiber.node != null) {
    // Insert nodes in the DOM.
    parentNode.appendChild(fiber.node);
  } else if (fiber.effectTag === 'UPDATE' && fiber.node != null) {
    updateNode(fiber.node, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    // Delete node.
    commitDeletion(fiber, parentNode);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

const commitDeletion = (fiber, parentNode) => {
  if (fiber.node) {
    parentNode.removeChild(fiber.node);
  } else {
    commitDeletion(fiber.child, parentNode);
  }
};

const render = (element, container) => {
  nextUnitOfWork = {
    node: container,
    props: {
      children: [element],
    },
    alternate: currentRootFiber,
  };
  wipRootFiber = nextUnitOfWork;
  deletions = [];
};

let nextUnitOfWork = null;
let wipRootFiber = null;
let currentRootFiber = null; // Last fiber tree committed to the DOM.
let deletions = [];

const workLoop = (deadline) => {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRootFiber) {
    commitRootFiber();
  }

  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

const performUnitOfWork = (fiber) => {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // Determine the next unit of work to run.
  // First, we try the child of fiber.
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;

  while (nextFiber) {
    // We try the sibling.
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    // We go up one level in the tree, performing this search on the parent.
    nextFiber = nextFiber.parent;
  }
};

let wipFiber = null;
let hookIndex = 0;

const updateFunctionComponent = (fiber) => {
  // Function components do not have an associated DOM node.
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];

  // Run the function component to get the children.
  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
};

const useState = (initial) => {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];

  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    hook.queue.push(action);

    wipRootFiber = {
      node: currentRootFiber.node,
      props: currentRootFiber.props,
      alternate: currentRootFiber,
    };

    // Work loop starts a new render phrase.
    nextUnitOfWork = wipRootFiber;

    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;

  return [hook.state, setState];
};

const updateHostComponent = (fiber) => {
  // Create a DOM node if it has not already been created.
  // For example, the fiber root already has a DOM node already created.

  if (!fiber.node) {
    fiber.node = createFiberNode(fiber);
  }

  // Create a fiber for each child and reconcile.
  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);
};

const reconcileChildren = (wipFiber, elements) => {
  // Generate new fibers and compare changes between virtual DOM and real DOM.

  let index = 0; // Fiber counter.
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child; // We keep a reference to the last committed fiber tree.
  let previousSibling = null; // We keep the previous sibling so we know where to attach when the fiber is not the first child.

  while (index < elements.length || oldFiber != null) {
    // We compare element with oldFiber tree and detect any changes to the DOM.

    const element = elements[index];
    let newFiber = null;

    const isSameNodeType =
      oldFiber && element && element.type === oldFiber.type;

    // Update props.
    if (isSameNodeType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        node: oldFiber.node,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }

    // Element needs a new DOM node.
    if (!isSameNodeType && element) {
      newFiber = {
        type: element.type,
        props: element.props,
        node: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    // Delete DOM node.
    if (oldFiber && !isSameNodeType) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // The fiber will be attached as a child of the element if it is the first child or as a sibling if it is a later child.
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      previousSibling.sibling = newFiber;
    }

    previousSibling = newFiber;
    index++;
  }
};

const Aire = {
  createElement,
  render,
  useState,
};

/** @jsx Aire.createElement */
const Counter = () => {
  const [state, setState] = Aire.useState(1);

  return <h1 onClick={() => setState((c) => c + 1)}>Counter: {state}</h1>;
};

const element = <Counter />;
const container = document.getElementById('root');

Aire.render(element, container);

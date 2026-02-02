import Reconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants';
import { createElement, createTextNode } from './dom';
import { VNode, ElementNode, TextNode } from './types';

const hostConfig: Reconciler.HostConfig<
  string, // Type
  Record<string, any>, // Props
  VNode, // Container
  VNode, // Instance
  TextNode, // TextInstance
  VNode, // SuspenseInstance
  VNode, // HydratableInstance
  VNode, // PublicInstance
  Record<string, any>, // HostContext
  string[], // UpdatePayload
  unknown, // ChildSet
  number, // TimeoutHandle
  number // NoTimeout
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  createInstance(type, props) {
    return createElement(type, props, []);
  },

  createTextInstance(text) {
    return createTextNode(text);
  },

  appendInitialChild(parent, child) {
    if (parent.type !== 'TEXT') {
      (parent as ElementNode).children.push(child);
    }
  },

  appendChild(parent, child) {
    if (parent.type !== 'TEXT') {
      (parent as ElementNode).children.push(child);
    }
  },

  appendChildToContainer(container, child) {
    if (container.type !== 'TEXT') {
      (container as ElementNode).children.push(child);
    }
  },

  removeChild(parent, child) {
    if (parent.type !== 'TEXT') {
      const children = (parent as ElementNode).children;
      const index = children.indexOf(child);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
  },

  removeChildFromContainer(container, child) {
    if (container.type !== 'TEXT') {
      const children = (container as ElementNode).children;
      const index = children.indexOf(child);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
  },

  insertBefore(parent, child, beforeChild) {
    if (parent.type !== 'TEXT') {
      const children = (parent as ElementNode).children;
      const index = children.indexOf(beforeChild);
      if (index !== -1) {
        children.splice(index, 0, child);
      }
    }
  },

  insertInContainerBefore(container, child, beforeChild) {
    if (container.type !== 'TEXT') {
      const children = (container as ElementNode).children;
      const index = children.indexOf(beforeChild);
      if (index !== -1) {
        children.splice(index, 0, child);
      }
    }
  },

  finalizeInitialChildren() {
    return false;
  },

  prepareUpdate() {
    return [];
  },

  commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    if (instance.type !== 'TEXT') {
      (instance as ElementNode).props = { ...newProps };
    }
  },

  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.content = newText;
  },

  getRootHostContext() {
    return {};
  },

  getChildHostContext(parentHostContext) {
    return parentHostContext;
  },

  shouldSetTextContent() {
    return false;
  },

  getPublicInstance(instance) {
    return instance;
  },

  prepareForCommit() {
    return null;
  },

  resetAfterCommit() {},

  preparePortalMount() {},

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  isPrimaryRenderer: false,

  getCurrentEventPriority() {
    return DefaultEventPriority;
  },

  getInstanceFromNode() {
    return null;
  },

  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},

  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null;
  },

  detachDeletedInstance() {},

  clearContainer(container) {
    if (container.type !== 'TEXT') {
      (container as ElementNode).children = [];
    }
  }
};

export const reconciler = Reconciler(hostConfig);

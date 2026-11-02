import assert from "node:assert/strict";
import test from "node:test";
import { installTranslateDomGuard } from "./translate-dom-guard";

// A tiny DOM with the same "not a child of this node" failure the browser has.
function makeDom() {
  return class Dom {
    parentNode: Dom | null = null;
    childNodes: Dom[] = [];

    constructor(readonly name = "node") {}

    appendChild(node: Dom) {
      return this.insertBefore(node, null);
    }

    removeChild(child: Dom) {
      if (child.parentNode !== this) throw new Error("NotFoundError: removeChild");
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      child.parentNode = null;
      return child;
    }

    insertBefore(node: Dom, reference: Dom | null) {
      if (node === this) throw new Error("HierarchyRequestError");
      if (reference && reference.parentNode !== this) {
        throw new Error("NotFoundError: insertBefore");
      }
      const index = reference
        ? this.childNodes.indexOf(reference)
        : this.childNodes.length;
      this.childNodes.splice(index, 0, node);
      node.parentNode = this;
      return node;
    }
  };
}

// What Google Translate does: the original node leaves the tree, a wrapper takes its place.
function translateAway<T extends { parentNode: any; childNodes: any[] }>(
  parent: T,
  original: T,
  wrapper: T,
) {
  parent.childNodes.splice(parent.childNodes.indexOf(original), 1, wrapper);
  wrapper.parentNode = parent;
  original.parentNode = null;
}

test("the unguarded DOM throws when translation moved the node", () => {
  const Dom = makeDom();
  const parent = new Dom("p");
  const text = new Dom("text");
  parent.appendChild(text);
  translateAway(parent, text, new Dom("font"));

  assert.throws(() => parent.removeChild(text), /NotFoundError/);
  assert.throws(() => parent.insertBefore(new Dom(), text), /NotFoundError/);
});

test("removeChild on a node translation moved is skipped instead of thrown", () => {
  const Dom = makeDom();
  assert.equal(installTranslateDomGuard(Dom.prototype, () => {}), true);
  const parent = new Dom("p");
  const text = new Dom("text");
  const font = new Dom("font");
  parent.appendChild(text);
  translateAway(parent, text, font);

  assert.equal(parent.removeChild(text), text);
  assert.deepEqual(parent.childNodes, [font]);
});

test("insertBefore next to a node translation moved is skipped instead of thrown", () => {
  const Dom = makeDom();
  installTranslateDomGuard(Dom.prototype, () => {});
  const parent = new Dom("p");
  const text = new Dom("text");
  const font = new Dom("font");
  parent.appendChild(text);
  translateAway(parent, text, font);

  const added = new Dom("added");
  assert.equal(parent.insertBefore(added, text), added);
  assert.deepEqual(parent.childNodes, [font]);
});

test("normal DOM work is untouched", () => {
  const Dom = makeDom();
  installTranslateDomGuard(Dom.prototype, () => {});
  const parent = new Dom("p");
  const a = new Dom("a");
  const b = new Dom("b");
  const c = new Dom("c");

  assert.equal(parent.appendChild(a), a);
  assert.equal(parent.insertBefore(b, a), b);
  assert.equal(parent.insertBefore(c, null), c);
  assert.deepEqual(parent.childNodes, [b, a, c]);
  assert.equal(parent.removeChild(a), a);
  assert.deepEqual(parent.childNodes, [b, c]);
  assert.equal(a.parentNode, null);
});

test("errors that are not about a moved node still surface", () => {
  const Dom = makeDom();
  installTranslateDomGuard(Dom.prototype, () => {});
  const parent = new Dom("p");

  assert.throws(() => parent.insertBefore(parent, null), /HierarchyRequestError/);
  assert.throws(() => parent.removeChild(null as never), TypeError);
});

test("warns once per method, not on every skipped call", () => {
  const Dom = makeDom();
  const warnings: string[] = [];
  installTranslateDomGuard(Dom.prototype, (message) => warnings.push(message));
  const parent = new Dom("p");
  const stray = new Dom("stray");

  parent.removeChild(stray);
  parent.removeChild(stray);
  parent.insertBefore(new Dom(), stray);
  parent.insertBefore(new Dom(), stray);

  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /removeChild/);
  assert.match(warnings[1], /insertBefore/);
});

test("installing twice does not wrap twice", () => {
  const Dom = makeDom();
  assert.equal(installTranslateDomGuard(Dom.prototype, () => {}), true);
  const { removeChild, insertBefore } = Dom.prototype;

  assert.equal(installTranslateDomGuard(Dom.prototype, () => {}), false);
  assert.equal(Dom.prototype.removeChild, removeChild);
  assert.equal(Dom.prototype.insertBefore, insertBefore);
});

test("without a DOM there is nothing to guard", () => {
  assert.equal(installTranslateDomGuard(undefined), false);
});

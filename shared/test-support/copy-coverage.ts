import { readFileSync } from "node:fs";
import ts from "typescript";
import { getPublicCopyId } from "../public-translations";

const COPY_ATTRIBUTES = new Set(["placeholder", "title", "aria-label", "alt"]);
const COPY_CALLS = new Set(["translateText", "tr"]);
const NON_COPY_PROPERTIES = new Set([
  "id", "key", "icon", "gradient", "cardRing", "badgeClassName", "className",
  "redirectPath", "registerEndpoint", "loginEndpoint", "color", "href", "path",
  "to", "emoji", "variant",
]);

export interface CopyScanOptions {
  // Constants whose string literals are authored copy, e.g. a portal catalogue.
  dataConstants?: readonly string[];
  // Strings that are intentionally not translated (brands, symbols, examples).
  allow?: ReadonlySet<string>;
  // Extra function names whose first argument is user-facing copy, e.g. setError.
  calls?: readonly string[];
  // Also check literals rendered through {cond ? "a" : "b"} and {value || "fallback"}.
  expressions?: boolean;
}

// Returns the user-facing strings of a component that have no catalogue entry:
// JSX text, placeholder/title/aria-label/alt literals, literals passed to
// translateText()/tr(), and every literal inside the listed data constants.
export function uncataloguedCopy(
  relativePath: string,
  {
    dataConstants = [],
    allow = new Set<string>(),
    calls = [],
    expressions = false,
  }: CopyScanOptions = {},
): string[] {
  const copyCalls = new Set([...COPY_CALLS, ...calls]);
  const url = new URL(`../../${relativePath}`, import.meta.url);
  const source = ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const missing = new Set<string>();
  const check = (raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text && /\p{L}/u.test(text) && !allow.has(text) && getPublicCopyId(text) === undefined) {
      missing.add(text);
    }
  };
  const literal = (node: ts.Node | undefined): string | undefined => {
    if (!node) return undefined;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isJsxExpression(node) && node.expression) return literal(node.expression);
    return undefined;
  };
  const FALLBACK_OPERATORS = new Set([
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
  ]);
  const literalsOf = (node: ts.Node | undefined): string[] => {
    if (!node) return [];
    const direct = literal(node);
    if (direct !== undefined) return [direct];
    if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node)) return literalsOf(node.expression);
    if (ts.isConditionalExpression(node)) return [...literalsOf(node.whenTrue), ...literalsOf(node.whenFalse)];
    if (ts.isBinaryExpression(node) && FALLBACK_OPERATORS.has(node.operatorToken.kind)) {
      return [...literalsOf(node.left), ...literalsOf(node.right)];
    }
    return [];
  };
  const visit = (node: ts.Node, inData: boolean): void => {
    if (ts.isJsxText(node)) {
      check(node.text);
    } else if (ts.isJsxAttribute(node) && COPY_ATTRIBUTES.has(node.name.getText())) {
      const values = expressions ? literalsOf(node.initializer) : [literal(node.initializer) ?? ""];
      values.forEach((value) => value && check(value));
    } else if (
      expressions &&
      ts.isJsxExpression(node) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      literalsOf(node).forEach(check);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      copyCalls.has(node.expression.text)
    ) {
      const values = expressions ? literalsOf(node.arguments[0]) : [literal(node.arguments[0])];
      values.forEach((value) => value !== undefined && check(value));
    } else if (inData && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      const { parent } = node;
      const isPropertyKey = ts.isPropertyAssignment(parent) && parent.name === node;
      const key = ts.isPropertyAssignment(parent) ? parent.name.getText() : undefined;
      if (!isPropertyKey && (!key || !NON_COPY_PROPERTIES.has(key))) check(node.text);
    }
    ts.forEachChild(node, (child) =>
      visit(
        child,
        inData ||
          (ts.isVariableDeclaration(child) &&
            ts.isIdentifier(child.name) &&
            dataConstants.includes(child.name.text)),
      ),
    );
  };
  visit(source, false);
  return [...missing];
}

// Tiny validator for the narrow input schemas our tools declare.
//
// The tool surface deliberately uses a small JSON-Schema subset (flat object,
// string/integer props, enum, maxLength, required, additionalProperties:
// false) so inputs stay narrow (see the WebMCP over-parameterization risk)
// and validation stays dependency-free and auditable.

export type PropSchema = {
  type: "string" | "integer" | "array";
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  // For type "array": items are always strings.
  items?: { type: "string"; maxLength?: number; enum?: readonly string[] };
  minItems?: number;
  maxItems?: number;
};

export type InputSchema = {
  type: "object";
  properties: Record<string, PropSchema>;
  required?: readonly string[];
  additionalProperties: false;
};

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: string[] };

export function validateInput(
  schema: InputSchema,
  input: unknown,
): ValidationResult {
  const errors: string[] = [];
  const raw =
    input === undefined || input === null
      ? {}
      : typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null;
  if (raw === null) {
    return { ok: false, errors: ["input must be a JSON object"] };
  }

  for (const key of Object.keys(raw)) {
    if (!(key in schema.properties)) {
      errors.push(`unexpected property "${key}"`);
    }
  }
  for (const key of schema.required ?? []) {
    if (raw[key] === undefined || raw[key] === null) {
      errors.push(`missing required property "${key}"`);
    }
  }

  const value: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (prop.type === "string") {
      if (typeof v !== "string") {
        errors.push(`"${key}" must be a string`);
        continue;
      }
      if (prop.minLength !== undefined && v.length < prop.minLength) {
        errors.push(`"${key}" is below minLength ${prop.minLength}`);
        continue;
      }
      if (prop.maxLength !== undefined && v.length > prop.maxLength) {
        errors.push(`"${key}" exceeds maxLength ${prop.maxLength}`);
        continue;
      }
      if (prop.enum && !prop.enum.includes(v)) {
        errors.push(`"${key}" must be one of: ${prop.enum.join(", ")}`);
        continue;
      }
      value[key] = v;
    } else if (prop.type === "array") {
      if (!Array.isArray(v)) {
        errors.push(`"${key}" must be an array of strings`);
        continue;
      }
      if (prop.minItems !== undefined && v.length < prop.minItems) {
        errors.push(`"${key}" needs at least ${prop.minItems} items`);
        continue;
      }
      if (prop.maxItems !== undefined && v.length > prop.maxItems) {
        errors.push(`"${key}" exceeds maxItems ${prop.maxItems}`);
        continue;
      }
      const items: string[] = [];
      let itemError = false;
      for (const item of v) {
        if (typeof item !== "string") {
          errors.push(`"${key}" items must be strings`);
          itemError = true;
          break;
        }
        if (
          prop.items?.maxLength !== undefined &&
          item.length > prop.items.maxLength
        ) {
          errors.push(`"${key}" items exceed maxLength ${prop.items.maxLength}`);
          itemError = true;
          break;
        }
        if (prop.items?.enum && !prop.items.enum.includes(item)) {
          errors.push(
            `"${key}" items must be one of: ${prop.items.enum.join(", ")}`,
          );
          itemError = true;
          break;
        }
        items.push(item);
      }
      if (!itemError) value[key] = items;
    } else {
      if (typeof v !== "number" || !Number.isInteger(v)) {
        errors.push(`"${key}" must be an integer`);
        continue;
      }
      if (prop.minimum !== undefined && v < prop.minimum) {
        errors.push(`"${key}" must be >= ${prop.minimum}`);
        continue;
      }
      if (prop.maximum !== undefined && v > prop.maximum) {
        errors.push(`"${key}" must be <= ${prop.maximum}`);
        continue;
      }
      value[key] = v;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

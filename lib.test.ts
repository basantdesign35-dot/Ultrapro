import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, whatsappUrl } from "../src/lib/phone";
import { followChain, validSources, panelErrors, resolveSource } from "../src/lib/panels";
import { formSchema } from "../src/lib/schema";

test("phone: Indian formats", () => {
  assert.deepEqual(normalizePhone("98765 43210"), { valid: true, digits: "919876543210" });
  assert.deepEqual(normalizePhone("09876543210"), { valid: true, digits: "919876543210" });
  assert.deepEqual(normalizePhone("+91-98765-43210"), { valid: true, digits: "919876543210" });
  assert.equal(normalizePhone("12345").valid, false);
  assert.equal(normalizePhone("5876543210").valid, false);
  assert.equal(normalizePhone("98abc43210").valid, false);
  assert.deepEqual(normalizePhone("+971 50 123 4567"), { valid: true, digits: "971501234567" });
});

test("whatsapp url only from clean digits", () => {
  assert.equal(whatsappUrl("919876543210"), "https://wa.me/919876543210");
  assert.equal(whatsappUrl("91987<script>"), null);
  assert.equal(whatsappUrl(""), null);
});

const base = {
  front: { mode: "custom" as const },
  back: { mode: "repeat" as const, sourcePanel: "front" as const },
  left: { mode: "designer" as const },
  right: { mode: "repeat" as const, sourcePanel: "left" as const },
};

test("panels: default arrangement is valid and resolves", () => {
  assert.deepEqual(panelErrors(base), {});
  assert.equal(resolveSource(base, "back"), "front");
  assert.equal(resolveSource(base, "right"), "left");
});

test("panels: detects loops, self reference and missing source", () => {
  const loop = { ...base, front: { mode: "repeat" as const, sourcePanel: "back" as const } };
  assert.equal(followChain(loop, "front").error, "cycle");
  assert.ok(panelErrors(loop).front);
  const self = { ...base, back: { mode: "repeat" as const, sourcePanel: "back" as const } };
  assert.ok(panelErrors(self).back);
  const missing = { ...base, back: { mode: "repeat" as const, sourcePanel: "" as const } };
  assert.ok(panelErrors(missing).back);
});

test("panels: validSources excludes loop-creating choices", () => {
  // front -> repeat back would loop, because back repeats front
  const p = { ...base, front: { mode: "repeat" as const, sourcePanel: "left" as const } };
  const opts = validSources(base, "front"); // front is custom; back->front, so back is not allowed
  assert.ok(!opts.includes("back"));
  assert.ok(opts.includes("left"));
  assert.ok(!opts.includes("front"));
});

const panel = (mode: string, sourcePanel = "") => ({ mode, sourcePanel });
function valid(over: Record<string, unknown> = {}) {
  return {
    brand: {
      brandName: "Shree Sweets", contactName: "Ramesh", contactPhone: "9876543210", alternatePhone: "", preferredContact: "whatsapp",
      useContactOnBag: true, printPhone: "",
      printOn: { logo: true, phone: true, address: true, tagline: false, email: false, social: false },
    },
    bag: { sizeUnknown: false, width: "10", height: "12", depth: "4", unit: "in" },
    panels: { front: panel("custom"), back: panel("repeat", "front"), left: panel("designer"), right: panel("repeat", "left") },
    instructions: { written: "Front par logo bada rakhna", designerDecidesLayout: false, hasAudio: false },
    consent: true,
    clientKey: "a".repeat(32),
    ...over,
  };
}

test("schema: valid submission passes", () => {
  const r = formSchema.safeParse(valid());
  assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
});

test("schema: bag size unknown allows empty dimensions", () => {
  const r = formSchema.safeParse(valid({ bag: { sizeUnknown: true, unit: "cm" } }));
  assert.equal(r.success, true);
});

test("schema: known size must be positive numbers", () => {
  for (const bad of [{ width: "0" }, { height: "-3" }, { depth: "abc" }, { width: "" }]) {
    const r = formSchema.safeParse(valid({ bag: { sizeUnknown: false, width: "10", height: "12", depth: "4", unit: "in", ...bad } }));
    assert.equal(r.success, false, JSON.stringify(bad));
  }
});

test("schema: honeypot, consent, bad phone, panel loop are rejected", () => {
  assert.equal(formSchema.safeParse(valid({ website: "http://spam" })).success, false);
  assert.equal(formSchema.safeParse(valid({ consent: false })).success, false);
  const badPhone = valid();
  (badPhone.brand as any).contactPhone = "123";
  assert.equal(formSchema.safeParse(badPhone).success, false);
  const loop = valid({ panels: { front: panel("repeat", "back"), back: panel("repeat", "front"), left: panel("blank"), right: panel("blank") } });
  assert.equal(formSchema.safeParse(loop).success, false);
});

test("schema: separate print number required when contact number not used on bag", () => {
  const v = valid();
  (v.brand as any).useContactOnBag = false;
  assert.equal(formSchema.safeParse(v).success, false);
  (v.brand as any).printPhone = "9123456780";
  assert.equal(formSchema.safeParse(v).success, true);
});

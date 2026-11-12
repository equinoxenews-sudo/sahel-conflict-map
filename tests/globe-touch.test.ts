import assert from "node:assert/strict";
import test from "node:test";
import { MOUSE_CLICK_TOLERANCE, TOUCH_TAP_MAX, pagePxPerScreenPx, touchClickTolerance } from "../lib/globeTouch";

test("téléphone tenu en hauteur, page de 980 px : un toucher qui bouge de quelques pixels d'écran reste un clic", () => {
  const phone = { visibleWidth: 980, visibleHeight: 2122, screenWidth: 390, screenHeight: 844 };
  assert.ok(Math.abs(pagePxPerScreenPx(phone) - 980 / 390) < 1e-9);
  const tolerance = touchClickTolerance(phone);
  assert.equal(tolerance, 25);
  assert.ok(tolerance > MOUSE_CLICK_TOLERANCE * 4, "bien plus large que les 5 px de la souris, qui ne valaient que 2 px d'écran");
});

test("téléphone en paysage : c'est le grand côté de l'écran qui compte, même si l'appareil donne toujours ses dimensions en hauteur (iOS)", () => {
  const ios = { visibleWidth: 980, visibleHeight: 452, screenWidth: 390, screenHeight: 844 };
  const android = { visibleWidth: 980, visibleHeight: 452, screenWidth: 844, screenHeight: 390 };
  assert.equal(touchClickTolerance(ios), touchClickTolerance(android));
  assert.equal(touchClickTolerance(ios), 12);
});

test("page agrandie avec deux doigts : la tolérance diminue avec la partie visible, sans passer sous celle d'un écran d'ordinateur", () => {
  const zoomed = { visibleWidth: 490, visibleHeight: 1061, screenWidth: 390, screenHeight: 844 };
  assert.equal(touchClickTolerance(zoomed), 13);
  const veryZoomed = { visibleWidth: 200, visibleHeight: 433, screenWidth: 390, screenHeight: 844 };
  assert.equal(touchClickTolerance(veryZoomed), 10);
});

test("écran tactile d'ordinateur ou tablette à sa largeur réelle : 10 px, jamais moins", () => {
  assert.equal(touchClickTolerance({ visibleWidth: 1200, visibleHeight: 800, screenWidth: 1920, screenHeight: 1080 }), 10);
  assert.equal(touchClickTolerance({ visibleWidth: 820, visibleHeight: 1180, screenWidth: 820, screenHeight: 1180 }), 10);
});

test("la tolérance est plafonnée et ne casse pas sur des dimensions absentes", () => {
  assert.equal(touchClickTolerance({ visibleWidth: 5000, visibleHeight: 9000, screenWidth: 320, screenHeight: 568 }), TOUCH_TAP_MAX);
  assert.equal(touchClickTolerance({ visibleWidth: 0, visibleHeight: 0, screenWidth: 0, screenHeight: 0 }), 10);
  assert.equal(touchClickTolerance({ visibleWidth: Number.NaN, visibleHeight: 100, screenWidth: 390, screenHeight: 844 }), 10);
});

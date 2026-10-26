// Texte envoyé à l'API : un emoji ou un drapeau tient sur deux unités UTF-16. Couper un texte à longueur fixe
// (slice) entre ces deux unités laisse une moitié orpheline, que le format JSON de l'API refuse (400
// invalid_request_error, la requête n'est même pas traitée). On la remplace par le caractère de remplacement.

const ANY_SURROGATE = /[\ud800-\udfff]/;

/** Le même texte, sans moitié d'emoji orpheline. Un texte sans caractère invalide est renvoyé tel quel. */
export function wellFormed(text: string): string {
  if (!ANY_SURROGATE.test(text)) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[i] + text[i + 1];
        i += 1;
      } else {
        out += "�";
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      out += "�";
    } else {
      out += text[i];
    }
  }
  return out;
}

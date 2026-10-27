import { FLAG_COUNTRIES } from "../countryFlagIndex";
import type { Zone } from "./model";

/** Une zone en une phrase lisible : « Cercle de 150 km autour de 13,63 ; 25,35 » ou « Mali, Burkina Faso ». */
export function describeZone(zone: Zone): string {
  if (zone.kind === "circle") {
    return `Cercle de ${zone.radiusKm} km autour de ${zone.lat.toFixed(2).replace(".", ",")} ; ${zone.lon.toFixed(2).replace(".", ",")}`;
  }
  const names = zone.codes.map((code) => FLAG_COUNTRIES.find((country) => country.iso2 === code)?.name ?? code);
  return names.join(", ");
}

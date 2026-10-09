// Position du Soleil : point de la Terre où il est au zénith à un instant donné (UTC).
// Formules astronomiques usuelles (précision de l'ordre du demi-degré, largement
// suffisante pour tracer la limite jour/nuit d'un globe).

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;
const mod = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;

export interface SubsolarPoint {
  /** Latitude (degrés, nord positif) : la déclinaison du Soleil. */
  lat: number;
  /** Longitude (degrés, est positif, de -180 à 180). */
  lon: number;
}

export function subsolarPoint(date: Date): SubsolarPoint {
  // Jours depuis J2000.0 (1er janvier 2000, 12 h TT), fractions comprises.
  const n = date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545.0;

  const meanLongitude = mod(280.46 + 0.9856474 * n, 360);
  const meanAnomaly = rad(mod(357.528 + 0.9856003 * n, 360));
  const eclipticLongitude = rad(meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly));
  const obliquity = rad(23.439 - 0.0000004 * n);

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));

  // Temps sidéral de Greenwich : l'angle dont la Terre a tourné par rapport aux étoiles.
  const greenwichSidereal = mod(280.46061837 + 360.98564736629 * n, 360);
  const lon = mod(deg(rightAscension) - greenwichSidereal + 180, 360) - 180;
  return { lat: deg(declination), lon };
}

/** Direction du Soleil dans le repère de la texture de la Terre (longitude 0 sur +x, nord sur +y). */
export function sunDirectionLocal({ lat, lon }: SubsolarPoint): [number, number, number] {
  const phi = rad(lat);
  const lambda = rad(lon);
  return [Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)];
}

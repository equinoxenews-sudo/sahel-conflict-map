export interface VesselPosition {
  mmsi: string;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  course: number | null;
  region: string;
  updated_at: string;
}

import type { CountryData } from "./schema";

// Cohérence des références d'un fichier pays : un identifiant cité doit exister. La structure (Zod) garantit la forme des champs ;
// ce contrôle garantit que les liens entre éléments mènent quelque part : sources, observations, images, parents de l'organigramme,
// objets de carte. Il s'applique à la validation (`npm run approche:validate`) et à la publication (`publishProblems`).

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function referenceProblems(data: CountryData): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(data.sources.map((source) => source.id));
  const observationKeys = new Set(data.observations.map((observation) => observation.key));
  const mediaIds = new Set((data.modules.media?.assets ?? []).map((asset) => asset.id));
  const itemIds = new Map<string, string>();
  const maps: { path: string; map: Record<string, unknown> }[] = [];

  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (!isRecord(value)) return;
    const hasSources = Array.isArray(value.sourceIds);
    if (hasSources) {
      for (const id of value.sourceIds as unknown[]) if (typeof id === "string" && !sourceIds.has(id)) problems.push(`${path} : source inconnue « ${id} »`);
    }
    if (typeof value.observationKey === "string" && !observationKeys.has(value.observationKey)) problems.push(`${path} : observation inconnue « ${value.observationKey} » (observationKey)`);
    if (typeof value.imageId === "string" && !mediaIds.has(value.imageId)) problems.push(`${path} : image inconnue « ${value.imageId} » (modules.media.assets)`);
    // Les identifiants des éléments éditoriaux sont uniques dans toute la fiche (les objets de carte le sont par couche, voir plus bas).
    if (hasSources && typeof value.id === "string" && typeof value.lat !== "number") {
      const previous = itemIds.get(value.id);
      if (previous) problems.push(`${path} : identifiant « ${value.id} » déjà utilisé (${previous})`);
      else itemIds.set(value.id, path);
    }
    if (Array.isArray(value.layers) && isRecord(value.view)) maps.push({ path, map: value });
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  };
  walk(data.modules, "modules");

  const features = new Set<string>();
  for (const { path, map } of maps) {
    const layerIds = new Set<string>();
    for (const layer of map.layers as Record<string, unknown>[]) {
      const layerId = String(layer.id);
      if (layerIds.has(layerId)) problems.push(`${path} : couche « ${layerId} » en double`);
      layerIds.add(layerId);
      const featureIds = new Set<string>();
      for (const feature of (layer.features as Record<string, unknown>[] | undefined) ?? []) {
        const featureId = String(feature.id);
        if (featureIds.has(featureId)) problems.push(`${path}.${layerId} : objet « ${featureId} » en double`);
        featureIds.add(featureId);
        features.add(`${layerId}:${featureId}`);
      }
    }
  }

  const hero = data.modules.hero;
  if (hero?.imageId && !mediaIds.has(hero.imageId)) problems.push(`modules.hero : image inconnue « ${hero.imageId} »`);
  for (const [tab, imageId] of Object.entries(hero?.bannerImages ?? {})) if (!mediaIds.has(imageId)) problems.push(`modules.hero.bannerImages.${tab} : image inconnue « ${imageId} »`);

  const organization = data.modules.defense?.organization ?? [];
  const nodeIds = new Set(organization.map((node) => node.id));
  for (const node of organization) if (node.parentId !== null && !nodeIds.has(node.parentId)) problems.push(`modules.defense.organization « ${node.id} » : parent inconnu « ${node.parentId} »`);

  for (const operation of data.modules.defense?.operations ?? []) {
    if (operation.layerId && operation.featureId && !features.has(`${operation.layerId}:${operation.featureId}`)) problems.push(`modules.defense.operations « ${operation.id} » : objet de carte inconnu « ${operation.layerId}:${operation.featureId} »`);
  }

  for (const dependency of data.modules.outlook?.dependencies ?? []) {
    if (dependency.state === "measured" && !dependency.observationKey) problems.push(`modules.outlook.dependencies « ${dependency.id} » : « measured » exige une observationKey`);
  }

  return problems;
}

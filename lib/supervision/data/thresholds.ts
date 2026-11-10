// Supervision V1 : seuils de priorité d'un signalement médiatique violent (décision du 10/11/2026, option A). Module minuscule et sans
// dépendance, importable aussi bien par le serveur que par les composants.
//
// Mesure sur le Nigeria, 30 jours, 323 publications distinctes : les mentions sont groupées par paliers (3 à 10 pour la quasi-totalité,
// 159 signalements à exactement 10), puis un vrai trou jusqu'à 16. Avec 6 et 20 on obtenait 232 alertes de signalements ; avec 15 et 20,
// on en obtient 11 (6 critiques, 5 importantes).
// Seuils FIXES, valables pour tous les pays : les petites zones (Mali, Niger, Burkina Faso : au plus 12 mentions) n'ont donc d'alertes
// que par les articles analysés. Un seuil relatif reste possible plus tard ; le tri par IA remplacera cette source faible.

export const SIGNAL_IMPORTANT_MENTIONS = 15;
export const SIGNAL_CRITICAL_MENTIONS = 20;

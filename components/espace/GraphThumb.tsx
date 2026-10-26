import type { GraphPreview } from "@/lib/investigation/graphPreview";

// Miniature d'un graphe (vignette de la page Graph) : cartes et traits à leur place, sans texte.
export default function GraphThumb({ preview, className }: { preview: GraphPreview; className?: string }) {
  const { viewBox, nodes, edges } = preview;
  return (
    <svg
      className={className}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Aperçu du graphe"
    >
      {edges.map((edge, index) => (
        <line
          key={index}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={edge.color}
          strokeOpacity={0.7}
          strokeWidth={1.2}
          strokeDasharray={edge.dashed ? "4 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nodes.map((node, index) => (
        <rect
          key={index}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={Math.min(node.width, node.height) * 0.12}
          fill={node.image ? node.color : "#16233a"}
          fillOpacity={node.image ? 0.35 : 1}
          stroke={node.color}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

const nodes = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Idea" }, type: "input" },
  { id: "2", position: { x: 200, y: 0 }, data: { label: "Discovery" } },
  { id: "3", position: { x: 400, y: 0 }, data: { label: "Specification" } },
];

const edges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
];

export function WizardFlow() {
  return (
    <div style={{ height: 300 }} className="border rounded bg-white">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

import { Annotation, StateGraph } from "@langchain/langgraph";

const combineStringArrays = (left, right) => {
  if (!right) return left;
  if (Array.isArray(right)) {
    return left.concat(right.filter(Boolean));
  }
  return left.concat([right]);
};

const DiscoveryState = Annotation.Root({
  productIdea: Annotation(),
  currentStage: Annotation(),
  decisions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  openQuestions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  pendingQuestions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  discoveryDocument: Annotation(),
  approvalStatus: Annotation(),
  lastPrompt: Annotation(),
  lastPromptFieldKey: Annotation(),
  lastOutput: Annotation(),
  lastOutputFieldKey: Annotation()
});

function shouldRunDiscovery(state) {
  return state.discoveryDocument ? "finished" : "generate";
}

async function orchestratorNode(state) {
  if (!state.productIdea) {
    throw new Error("Product idea is required before running discovery.");
  }

  return {
    currentStage: state.discoveryDocument ? "complete" : "discovery_planning"
  };
}

async function discoveryAgentNode(state) {
  const { produceDiscoveryDocument } = await import("./index.js");
  const result = await produceDiscoveryDocument({
    productIdea: state.productIdea
  });

  return {
    discoveryDocument: result.discoveryDocument,
    decisions: [
      `Discovery document drafted at ${new Date().toISOString()}`
    ],
    lastPrompt: result.lastPrompt,
    lastPromptFieldKey: result.lastPromptFieldKey,
    lastOutput: result.lastOutput,
    lastOutputFieldKey: result.lastOutputFieldKey,
    lastValidationStatus: result.lastValidationStatus || null
  };
}

function buildDiscoveryGraph() {
  const builder = new StateGraph(DiscoveryState)
    .addNode("orchestrator", orchestratorNode)
    .addNode("discovery_agent", discoveryAgentNode)
    .addEdge("__start__", "orchestrator")
    .addConditionalEdges("orchestrator", shouldRunDiscovery, {
      generate: "discovery_agent",
      finished: "__end__"
    })
    .addEdge("discovery_agent", "__end__");

  return builder.compile();
}

export const agent = buildDiscoveryGraph();

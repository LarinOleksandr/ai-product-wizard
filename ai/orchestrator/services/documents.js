import path from "path";

const DOCUMENT_DEFINITIONS = [
  {
    id: "discovery",
    key: "1-discovery-document"
  }
];

export function createDocumentRegistry({ promptsRootDir }) {
  const documents = DOCUMENT_DEFINITIONS.map((doc) => ({
    ...doc,
    promptsDir: path.join(promptsRootDir, "documents", doc.key)
  }));

  function getDocumentConfig(documentId) {
    return documents.find((doc) => doc.id === documentId) || null;
  }

  function listDocuments() {
    return documents.slice();
  }

  return {
    getDocumentConfig,
    listDocuments
  };
}

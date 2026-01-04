export function createWorkflowService({
  storageService,
  validationService,
  fieldDefinitions,
  requiredFields,
  emptyDocument,
  emptyValueForField,
  buildFieldStatus,
  buildApprovedDocument,
  setNestedValue,
  getNestedValue,
  generateFieldValueWithOutput
}) {
  async function computeNextVersion() {
    if (!storageService.supabaseEnabled) {
      throw new Error(
        "Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    const latest = await storageService.fetchLatestRecord();
    const latestVersion = latest?.version ? Number(latest.version) : 0;
    return latestVersion + 1;
  }

  async function updateDiscoveryRecord(record, stage, reason) {
    if (!storageService.supabaseEnabled) {
      throw new Error(
        "Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    const timestamp = new Date().toISOString();
    const changeEntry = {
      version: record.version,
      timestamp,
      reason: reason || "Update",
      stage: stage || "discovery_update"
    };

    const updatedRecord = {
      ...record,
      timestamp,
      changeLog: Array.isArray(record.changeLog)
        ? record.changeLog.concat([changeEntry])
        : [changeEntry]
    };

    await storageService.updateRecord(record.version, updatedRecord);
    return { record: updatedRecord, savedToSupabase: true };
  }

  async function persistDiscoveryResult(record) {
    if (!storageService.supabaseEnabled) {
      throw new Error(
        "Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    const version = await computeNextVersion();
    const timestamp = record.timestamp || new Date().toISOString();
    const changeReason = record.changeReason || "Initial discovery draft";

    const persistedRecord = {
      ...record,
      version,
      timestamp,
      changeReason,
      changeLog: [
        {
          version,
          timestamp,
          reason: changeReason,
          stage: "discovery_generation"
        }
      ]
    };

    await storageService.insertRecord(version, persistedRecord);
    return { version, record: persistedRecord, savedToSupabase: true };
  }

  function validateUserInput(input) {
    const missingFields = requiredFields.filter((field) => {
      const value = (input[field.key] || "").toString().trim();
      return value.length === 0;
    });
    return {
      valid: missingFields.length === 0,
      missingFields: missingFields.map((field) => field.key),
      questions: missingFields.map((field) => field.question)
    };
  }

  function isDocumentCleared(record) {
    return (
      record?.changeReason === "Cleared document" ||
      record?.lastStatusMessage === "Document cleared."
    );
  }

  async function checkApprovalGate() {
    const latestRecord = await storageService.getLatestRecord();
    if (!latestRecord) {
      return null;
    }
    const cleared = isDocumentCleared(latestRecord);
    if (!latestRecord.fieldStatus) {
      return null;
    }
    if (latestRecord.approved === true || cleared) {
      return null;
    }

    return {
      status: "in_progress",
      resultType: "existing",
      record: latestRecord,
      message: "Finish approving the current document before creating a new one."
    };
  }

  function buildEmptyDocument() {
    return JSON.parse(JSON.stringify(emptyDocument));
  }

  async function runDiscoveryWorkflow(input) {
    const validation = validateUserInput(input);
    if (!validation.valid) {
      return {
        status: "needs_input",
        resultType: "missing_inputs",
        missingFields: validation.missingFields,
        questions: validation.questions
      };
    }

    const gate = await checkApprovalGate();
    if (gate) {
      return gate;
    }

    const fieldStatus = buildFieldStatus();
    const draft = buildEmptyDocument();
    const record = {
      version: 0,
      timestamp: new Date().toISOString(),
      productIdea: input.productIdea,
      discoveryDocument: draft,
      fieldStatus,
      currentFieldKey: null,
      approved: false,
      changeReason: input.changeReason || "Start discovery draft",
      lastPrompt: null,
      lastOutput: null,
      lastOutputFieldKey: null,
      lastStatusMessage: "Generating first section..."
    };

    const firstField = fieldDefinitions[0];
    record.currentFieldKey = firstField.key;
    const { value: firstValue, prompt, rawText, validationStatus } =
      await generateFieldValueWithOutput({
        field: firstField,
        productIdea: input.productIdea,
        currentDocument: record.discoveryDocument,
        fieldStatus
      });

    setNestedValue(record.discoveryDocument, firstField.key, firstValue);
    record.lastPrompt = prompt;
    record.lastPromptFieldKey = firstField.key;
    record.lastOutput = rawText;
    record.lastOutputFieldKey = firstField.key;
    record.lastValidationStatus = validationStatus || null;
    record.lastStatusMessage = `${firstField.label || firstField.key} generated and saved. Review and approve.`;

    const persisted = await persistDiscoveryResult(record);
    return {
      status: "in_progress",
      resultType: "created",
      version: persisted.version,
      record: persisted.record,
      savedToSupabase: persisted.savedToSupabase,
      validationStatus: record.lastValidationStatus || null
    };
  }

  async function generateEntireDiscoveryDocument(input, shouldAbort) {
    const validation = validateUserInput(input);
    if (!validation.valid) {
      return {
        status: "needs_input",
        resultType: "missing_inputs",
        missingFields: validation.missingFields,
        questions: validation.questions
      };
    }

    const gate = await checkApprovalGate();
    if (gate) {
      return gate;
    }

    const fieldStatus = buildFieldStatus();
    const draft = buildEmptyDocument();
    const record = {
      version: 0,
      timestamp: new Date().toISOString(),
      productIdea: input.productIdea,
      discoveryDocument: draft,
      fieldStatus,
      currentFieldKey: null,
      approved: false,
      changeReason: "Generating entire document",
      lastPrompt: null,
      lastOutput: null,
      lastOutputFieldKey: null,
      lastStatusMessage: "Generating entire document..."
    };

    const initialField = fieldDefinitions[0];
    record.currentFieldKey = initialField.key;
    const { value: firstValue, prompt, rawText, validationStatus } =
      await generateFieldValueWithOutput({
        field: initialField,
        productIdea: input.productIdea,
        currentDocument: record.discoveryDocument,
        fieldStatus
      });

    setNestedValue(record.discoveryDocument, initialField.key, firstValue);
    record.lastPrompt = prompt;
    record.lastPromptFieldKey = initialField.key;
    record.lastOutput = rawText;
    record.lastOutputFieldKey = initialField.key;
    record.lastValidationStatus = validationStatus || null;

    const persisted = await persistDiscoveryResult(record);
    record.version = persisted.version;

    for (let index = 1; index < fieldDefinitions.length; index += 1) {
      const field = fieldDefinitions[index];
      record.currentFieldKey = field.key;
      record.lastStatusMessage = `Generating ${field.label || field.key}...`;
      const preUpdate = await updateDiscoveryRecord(
        record,
        "discovery_generation",
        record.lastStatusMessage
      );
      record.discoveryDocument = preUpdate.record.discoveryDocument;
      record.fieldStatus = preUpdate.record.fieldStatus;

      if (shouldAbort && shouldAbort()) {
        record.lastStatusMessage = "Generation canceled.";
        const updated = await updateDiscoveryRecord(
          record,
          "generate_all_canceled",
          record.lastStatusMessage
        );
        return {
          status: "in_progress",
          resultType: "canceled",
          record: updated.record,
          savedToSupabase: updated.savedToSupabase
        };
      }

      const { value, prompt: nextPrompt, rawText: nextRawText, validationStatus: nextValidationStatus } =
        await generateFieldValueWithOutput({
          field,
          productIdea: input.productIdea,
          currentDocument: record.discoveryDocument,
          fieldStatus: record.fieldStatus
        });

      setNestedValue(record.discoveryDocument, field.key, value);
      record.lastPrompt = nextPrompt;
      record.lastPromptFieldKey = field.key;
      record.lastOutput = nextRawText;
      record.lastOutputFieldKey = field.key;
      record.lastValidationStatus = nextValidationStatus || null;
    }

      const approvedAt = new Date().toISOString();
      for (const field of fieldDefinitions) {
        fieldStatus[field.key] = { approved: true, approvedAt };
      }
      record.fieldStatus = fieldStatus;
      record.approved = true;
      record.approvedAt = approvedAt;
      record.currentFieldKey = null;
      record.lastStatusMessage = "Full document generated and ready.";
      record.changeReason = "Generated entire document";

    const finalUpdate = await updateDiscoveryRecord(
      record,
      "generate_all_complete",
      record.lastStatusMessage
    );
      return {
        status: "approved",
        resultType: "updated",
        record: finalUpdate.record,
        savedToSupabase: finalUpdate.savedToSupabase,
        validationStatus: record.lastValidationStatus || null
      };
  }

  async function approveDiscoveryVersion(version, approver) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required for approval.");
    }
    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }

    if (record.approved) {
      return { record, alreadyApproved: true, savedToSupabase: false };
    }

    const timestamp = new Date().toISOString();
    const approvalHistory = Array.isArray(record.approvalHistory)
      ? record.approvalHistory
      : [];
    approvalHistory.push({
      timestamp,
      approver: approver || "system"
    });

    const updatedRecord = {
      ...record,
      approved: true,
      approvedAt: timestamp,
      approvalHistory
    };

    await storageService.updateRecord(numericVersion, updatedRecord);
    return { record: updatedRecord, alreadyApproved: false, savedToSupabase: true };
  }

  async function saveDiscoveryDocument({ version, discoveryDocument, approver }) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required to save a document.");
    }
    if (!discoveryDocument || typeof discoveryDocument !== "object") {
      throw new Error("discoveryDocument is required.");
    }
    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }
    record.discoveryDocument = discoveryDocument;
    record.changeReason = approver ? `Saved by ${approver}` : "Saved document";
    record.lastStatusMessage = "Document saved.";
    const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
      record,
      "document_saved",
      record.lastStatusMessage
    );
    return { record: updatedRecord, savedToSupabase };
  }

  async function clearDiscoveryField({ version, fieldKey, approver }) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required to clear a field.");
    }
    if (!fieldKey) {
      throw new Error("fieldKey is required.");
    }

    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }

    const fieldStatus = record.fieldStatus || buildFieldStatus();
    const fieldIndex = fieldDefinitions.findIndex((field) => field.key === fieldKey);
    if (fieldIndex === -1) {
      throw new Error("Unknown field key.");
    }

    for (let index = fieldIndex; index < fieldDefinitions.length; index += 1) {
      const field = fieldDefinitions[index];
      fieldStatus[field.key] = { approved: false, approvedAt: null };
      setNestedValue(record.discoveryDocument, field.key, emptyValueForField(field));
    }

    record.fieldStatus = fieldStatus;
    record.currentFieldKey = fieldKey;
    record.approved = false;
    record.approvedAt = null;
    record.lastPrompt = null;
    record.lastOutput = null;
    record.lastOutputFieldKey = null;
    record.lastValidationStatus = null;
    record.changeReason = approver ? `Cleared by ${approver}` : "Cleared field";
    record.lastStatusMessage = "Field cleared.";

    const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
      record,
      "field_cleared",
      record.lastStatusMessage
    );
    return {
      record: updatedRecord,
      savedToSupabase
    };
  }

  async function clearDiscoveryDocument(version, approver) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required to clear a document.");
    }
    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }
    record.discoveryDocument = buildEmptyDocument();
    record.fieldStatus = buildFieldStatus();
    record.currentFieldKey = null;
    record.approved = false;
    record.approvedAt = null;
    record.lastPrompt = null;
    record.lastOutput = null;
    record.lastOutputFieldKey = null;
    record.lastValidationStatus = null;
    record.changeReason = approver ? `Cleared by ${approver}` : "Cleared document";
    record.lastStatusMessage = "Document cleared.";

    const { record: persisted } = await updateDiscoveryRecord(
      record,
      "document_cleared",
      record.lastStatusMessage
    );
    return persisted;
  }

  async function approveDiscoveryField({
    version,
    fieldKey,
    value,
    approver
  }) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required for approval.");
    }
    if (!fieldKey) {
      throw new Error("fieldKey is required.");
    }
    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }

    const fieldStatus = record.fieldStatus || buildFieldStatus();
    const field = fieldDefinitions.find((item) => item.key === fieldKey);
    if (!field) {
      throw new Error("Unknown field key.");
    }

    if (field.type === "string") {
      if (typeof value !== "string") {
        throw new Error("Value must be a string.");
      }
      setNestedValue(record.discoveryDocument, fieldKey, value.trim());
    } else {
      setNestedValue(record.discoveryDocument, fieldKey, value);
    }

    fieldStatus[fieldKey] = { approved: true, approvedAt: new Date().toISOString() };
    record.fieldStatus = fieldStatus;

    if (fieldDefinitions.every((item) => fieldStatus[item.key]?.approved)) {
      record.approved = true;
      record.approvedAt = new Date().toISOString();
      record.currentFieldKey = null;
      record.lastStatusMessage = "All fields approved. Discovery document is complete.";
    } else {
      const nextField = fieldDefinitions.find((item) => !fieldStatus[item.key]?.approved);
      record.currentFieldKey = nextField?.key || null;
      record.lastStatusMessage = "Field approved. Next field is ready.";
    }

    record.changeReason = approver ? `Approved by ${approver}` : "Field approved";
    record.lastValidationStatus = null;

    const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
      record,
      "field_approved",
      record.lastStatusMessage
    );
    return {
      record: updatedRecord,
      savedToSupabase,
      validationStatus: null
    };
  }

  async function regenerateDiscoveryField({
    version,
    fieldKey,
    approver,
    productIdea
  }) {
    if (!Number.isFinite(Number(version))) {
      throw new Error("A numeric version is required to regenerate a field.");
    }
    if (!fieldKey) {
      throw new Error("fieldKey is required.");
    }
    const numericVersion = Number(version);
    const record = await storageService.loadDiscoveryRecord(numericVersion);
    if (!record) {
      throw new Error(`Discovery document v${numericVersion} was not found.`);
    }

    const fieldStatus = record.fieldStatus || buildFieldStatus();
    const fieldIndex = fieldDefinitions.findIndex((item) => item.key === fieldKey);
    if (fieldIndex === -1) {
      throw new Error("Unknown field key.");
    }

    for (let index = fieldIndex; index < fieldDefinitions.length; index += 1) {
      const field = fieldDefinitions[index];
      fieldStatus[field.key] = { approved: false, approvedAt: null };
      setNestedValue(record.discoveryDocument, field.key, emptyValueForField(field));
    }

    record.fieldStatus = fieldStatus;
    record.currentFieldKey = fieldKey;
    record.approved = false;
    record.approvedAt = null;
    record.changeReason = approver ? `Regenerated by ${approver}` : "Regenerated field";
    record.lastStatusMessage = "Field regenerated. Review and approve.";
    if (typeof productIdea === "string" && productIdea.trim()) {
      record.productIdea = productIdea.trim();
    }

    const { value, prompt, rawText, validationStatus } =
      await generateFieldValueWithOutput({
        field: fieldDefinitions[fieldIndex],
        productIdea: record.productIdea,
        currentDocument: record.discoveryDocument,
        fieldStatus: record.fieldStatus
      });

    setNestedValue(record.discoveryDocument, fieldKey, value);
    record.lastPrompt = prompt;
    record.lastPromptFieldKey = fieldKey;
    record.lastOutput = rawText;
    record.lastOutputFieldKey = fieldKey;
    record.lastValidationStatus = validationStatus || null;

    const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
      record,
      "field_regenerated",
      record.lastStatusMessage
    );
    return {
      record: updatedRecord,
      savedToSupabase,
      validationStatus: record.lastValidationStatus || null
    };
  }

  return {
    runDiscoveryWorkflow,
    generateEntireDiscoveryDocument,
    approveDiscoveryVersion,
    approveDiscoveryField,
    regenerateDiscoveryField,
    saveDiscoveryDocument,
    clearDiscoveryField,
    clearDiscoveryDocument
  };
}


export function createDiscoveryRouter({
  applyCorsHeaders,
  parseRequestBody,
  sendJson,
  createAbortSignal,
  getExportRecord,
  renderDiscoveryMarkdown,
  renderDiscoveryHtml,
  renderPdfFromHtml,
  runDiscoveryWorkflow,
  generateEntireDiscoveryDocument,
  generateRandomInputs,
  approveDiscoveryField,
  regenerateDiscoveryField,
  saveDiscoveryDocument,
  clearDiscoveryField,
  approveDiscoveryVersion,
  clearDiscoveryDocument,
  getLatestRecord,
  getGlossary
}) {
  return async function handleDiscoveryRoutes(req, res) {
    if (req.method === "GET" && req.url?.startsWith("/discovery/export/markdown")) {
      applyCorsHeaders(res);
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const versionParam = parsedUrl.searchParams.get("version");
      const record = await getExportRecord(versionParam);
      const markdown = renderDiscoveryMarkdown(
        record.discoveryDocument || {},
        record.productIdea || ""
      );
      const filename = `discovery-document-v${record.version}.md`;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      res.writeHead(200);
      res.end(markdown);
      return true;
    }

    if (req.method === "GET" && req.url?.startsWith("/discovery/export/pdf")) {
      applyCorsHeaders(res);
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const versionParam = parsedUrl.searchParams.get("version");
      const record = await getExportRecord(versionParam);
      const markdown = renderDiscoveryMarkdown(
        record.discoveryDocument || {},
        record.productIdea || ""
      );
      const html = renderDiscoveryHtml(markdown);
      const pdfBuffer = await renderPdfFromHtml(html);
      const filename = `discovery-document-v${record.version}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      res.writeHead(200);
      res.end(pdfBuffer);
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery") {
      const body = await parseRequestBody(req);
      const result = await runDiscoveryWorkflow(body);
      sendJson(res, 200, result);
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/generate-all") {
      const body = await parseRequestBody(req);
      const shouldAbort = createAbortSignal(req);
      const result = await generateEntireDiscoveryDocument(body, shouldAbort);
      sendJson(res, 200, result);
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/random-inputs") {
      const body = await parseRequestBody(req);
      const result = await generateRandomInputs(body);
      sendJson(res, 200, result);
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/field/approve") {
      const body = await parseRequestBody(req);
      const result = await approveDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        value: body.value,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: result.record.approved ? "approved" : "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase,
        validationStatus: result.validationStatus || null
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/field/regenerate") {
      const body = await parseRequestBody(req);
      const result = await regenerateDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        approver: body.approver,
        productIdea: body.productIdea
      });
      sendJson(res, 200, {
        status: "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase,
        validationStatus: result.validationStatus || null
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/field/clear") {
      const body = await parseRequestBody(req);
      const result = await clearDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/save") {
      const body = await parseRequestBody(req);
      const result = await saveDiscoveryDocument({
        version: body.version,
        discoveryDocument: body.discoveryDocument,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: result.record.approved ? "approved" : "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/approve") {
      const body = await parseRequestBody(req);
      const approval = await approveDiscoveryVersion(body.version, body.approver);
      sendJson(res, 200, {
        status: "approved",
        version: approval.record.version,
        approved: approval.record.approved,
        timestamp: approval.record.approvedAt,
        discoveryDocument: approval.record.discoveryDocument,
        savedToSupabase: approval.savedToSupabase
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/discovery/clear") {
      const body = await parseRequestBody(req);
      const updatedRecord = await clearDiscoveryDocument(body.version, body.approver);
      sendJson(res, 200, {
        status: "in_progress",
        record: updatedRecord
      });
      return true;
    }

    if (req.method === "GET" && req.url?.startsWith("/discovery/latest")) {
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const projectId = parsedUrl.searchParams.get("projectId");
      const latest = await getLatestRecord(projectId || null);
      if (!latest) {
        sendJson(res, 404, {
          status: "not_found",
          message: "No discovery document exists yet."
        });
        return true;
      }
      sendJson(res, 200, {
        status: latest.approved ? "approved" : "in_progress",
        record: latest
      });
      return true;
    }

    if (req.method === "GET" && req.url === "/glossary") {
      const glossary = await getGlossary();
      sendJson(res, 200, {
        status: "ok",
        glossary
      });
      return true;
    }

    return false;
  };
}

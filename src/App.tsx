import { useState, useEffect, useRef } from "react";
import { BrowserSDK } from "@100printswithme/browser-sdk";
import { Agentation } from "agentation";
export default function App() {
  const [key, setKey] = useState(localStorage.getItem("sdk_test_key") || "");
  const [templateId, setTemplateId] = useState(localStorage.getItem("sdk_test_template_id") || "");
  const [baseUrl, setBaseUrl] = useState("https://api.100printswith.me");

  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("Idle");
  const [isInitialising, setIsInitialising] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Single render states
  const [renderFormat, setRenderFormat] = useState<"png" | "pdf">("png");
  const [renderQuality, setRenderQuality] = useState<"draft" | "standard" | "high" | "ultra">("standard");
  const [renderSide, setRenderSide] = useState<"front" | "back" | "both">("both");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);


  // New Table Bulk Export State
  const [tableRows, setTableRows] = useState<Record<string, string>[]>([]);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<BrowserSDK | null>(null);

  useEffect(() => {
    localStorage.setItem("sdk_test_key", key);
  }, [key]);

  useEffect(() => {
    localStorage.setItem("sdk_test_template_id", templateId);
  }, [templateId]);

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const clearLogs = () => setLogs([]);

  // Extracts mustache variables {{name}} from layers to build dynamic inputs
  const extractVariables = (layers: any[]): string[] => {
    const vars = new Set<string>();

    const scanString = (str: any) => {
      if (typeof str !== "string") return;
      let match;
      const localRegex = /\{\{([^}]+)\}\}/g;
      while ((match = localRegex.exec(str)) !== null) {
        vars.add(match[1].trim());
      }
    };

    const scanLogic = (logic: any) => {
      if (!logic || !logic.rules) return;
      for (const rule of logic.rules) {
        if (rule.left && rule.left.type === 'variable') {
          vars.add(rule.left.value.trim());
        }
        if (rule.left && rule.left.type === 'template') {
          scanString(rule.left.value);
        }
        if (rule.right && rule.right.type === 'variable') {
          vars.add(rule.right.value.trim());
        }
        if (rule.right && rule.right.type === 'template') {
          scanString(rule.right.value);
        }
      }
      if (logic.overrides) {
        for (const over of logic.overrides) {
          if (over.value && typeof over.value === 'string') {
            scanString(over.value);
          }
        }
      }
    };

    const scan = (list: any[]) => {
      for (const layer of list) {
        if (layer.content) {
          scanString(layer.content);
        }
        if (layer.logic) {
          scanLogic(layer.logic);
        }

        if (layer.tableData && Array.isArray(layer.tableData.cells)) {
          for (const row of layer.tableData.cells) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (cell && cell.content) {
                  scanString(cell.content);
                }
              }
            }
          }
        }

        if (layer.chartData) {
          if (layer.chartData.percentage) {
            scanString(layer.chartData.percentage);
          }
          if (Array.isArray(layer.chartData.categories)) {
            for (const cat of layer.chartData.categories) {
              scanString(cat);
            }
          }
          if (Array.isArray(layer.chartData.series)) {
            for (const ser of layer.chartData.series) {
              if (ser.label) {
                scanString(ser.label);
              }
              if (Array.isArray(ser.values)) {
                for (const val of ser.values) {
                  scanString(val);
                }
              }
            }
          }
        }

        if (layer.layers) {
          scan(layer.layers);
        }
      }
    };

    scan(layers);
    return Array.from(vars);
  };

  async function loadTemplate() {
    if (!key) {
      log("❌ Error: API Key is required");
      return;
    }
    if (!templateId) {
      log("❌ Error: Template ID is required");
      return;
    }

    setIsInitialising(true);
    try {
      setStatus("Loading template...");
      log(`🔄 Initializing BrowserSDK with baseUrl: ${baseUrl}`);

      const sdk = new BrowserSDK({
        key,
        baseUrl,
      });
      sdkRef.current = sdk;

      log(`🔄 Fetching template definition for: ${templateId}`);
      const response = await (sdk as any).fetchTemplateData(templateId);
      log("✅ Template metadata loaded successfully");

      const frontLayers = response.frontLayers || [];
      const backLayers = response.backLayers || [];
      const foundVars = extractVariables([...frontLayers, ...backLayers]);

      log(`🔍 Extracted variables: ${foundVars.join(", ") || "None"}`);

      const initialVars: Record<string, string> = {};
      foundVars.forEach(v => {
        initialVars[v] = response.sample_data?.[v] || `[${v}]`;
      });

      setVariables(initialVars);
      setTemplateInfo(response);

      // Initialize bulk export table with sample data or empty row if no variables
      if (foundVars.length > 0) {
        setTableRows([initialVars, { ...initialVars, [foundVars[0]]: `${initialVars[foundVars[0]]} (Copy)` }]);
      } else {
        setTableRows([{}]);
      }

      setStatus("Connected");
      log(`🎉 Ready to render! Template: ${response.template_data?.name || "Untitled"}`);

      // Render the actual initial preview using sample data!
      await updatePreview(initialVars);
    } catch (err) {
      console.error(err);
      log("❌ Failed to load template: " + (err as Error).message);
      setStatus("Failed");
    } finally {
      setIsInitialising(false);
    }
  }

  async function updatePreview(overrideVars?: Record<string, string>) {
    if (!sdkRef.current || !templateId) {
      log("❌ Error: SDK not initialized or Template ID missing. Load the template first.");
      return;
    }

    try {
      log("🔄 Generating interactive canvas preview...");
      const startTime = performance.now();

      const varsToUse = overrideVars || variables;
      const canvas = await sdkRef.current.preview({
        templateId,
        payload: varsToUse,
        container: previewContainerRef.current!
      });

      const endTime = performance.now();
      log(`✅ Canvas Preview completed in ${Math.round(endTime - startTime)}ms`);

      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = "";
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";
        canvas.style.borderRadius = "8px";
        canvas.style.boxShadow = "0 20px 25px -5px rgb(0 0 0 / 0.5)";
        previewContainerRef.current.appendChild(canvas);
      }
    } catch (err) {
      log("❌ Preview Error: " + (err as Error).message);
    }
  }

  async function downloadSingle() {
    if (!sdkRef.current || !templateId) {
      log("❌ Error: Load template first");
      return;
    }

    try {
      log(`🔄 Rendering single record as format: ${renderFormat}, quality: ${renderQuality}, side: ${renderSide}`);
      const startTime = performance.now();

      const result = await sdkRef.current.render({
        templateId,
        payload: variables,
        format: renderFormat,
        quality: renderQuality,
        side: renderSide
      });

      const endTime = performance.now();
      log(`✅ Render completed in ${Math.round(endTime - startTime)}ms`);

      const blob = result.blob;
      if (!blob) {
        log("❌ Render Error: No blob returned");
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);

      const filename = `rendered-card.${renderFormat}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      log(`🎉 Download started: ${filename}`);
    } catch (err) {
      log("❌ Render Error: " + (err as Error).message);
    }
  }


  // Interactive Table Bulk Export Functions
  const addTableRow = () => {
    const newRow: Record<string, string> = {};
    Object.keys(variables).forEach(k => {
      newRow[k] = "";
    });
    setTableRows(prev => [...prev, newRow]);
    log("➕ Added new record row to the table");
  };

  const deleteTableRow = (index: number) => {
    if (tableRows.length <= 1) {
      log("⚠️ Info: Keeping at least one row in the table");
      return;
    }
    setTableRows(prev => prev.filter((_, i) => i !== index));
    log(`➖ Removed row ${index + 1} from table`);
  };

  const handleTableCellChange = (rowIndex: number, key: string, value: string) => {
    setTableRows(prev => prev.map((row, idx) => {
      if (idx === rowIndex) {
        return { ...row, [key]: value };
      }
      return row;
    }));
  };

  async function triggerTableBulkExport() {
    if (!sdkRef.current || !templateId) {
      log("❌ Error: Load template first");
      return;
    }
    if (tableRows.length === 0) {
      log("❌ Error: No records in the table to export");
      return;
    }

    try {
      log(`🔄 Starting bulk render from Interactive Table for ${tableRows.length} records...`);
      setStatus(`Bulk rendering (${tableRows.length} items)...`);

      const startTime = performance.now();
      const result = await sdkRef.current.renderBulk({
        templateId,
        rows: tableRows,
        mode: renderFormat === "pdf" ? "merged" : "zip",
        quality: renderQuality,
        onProgress: (current: number, total: number, recordName: string) => {
          log(`📈 Progress: ${current}/${total} - ${recordName} (${Math.round((current / total) * 100)}%)`);
        }
      });

      const endTime = performance.now();
      log(`✅ Table bulk rendering finished in ${Math.round((endTime - startTime) / 1000)}s`);

      const blob = result.blob;
      if (!blob) {
        log("❌ Bulk Render Error: No blob returned");
        setStatus("Connected");
        return;
      }

      const url = URL.createObjectURL(blob);
      const filename = renderFormat === "pdf" ? "table-bulk-export.pdf" : "table-bulk-export.zip";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      log(`🎉 Table bulk download started: ${filename}`);
      setStatus("Connected");
    } catch (err) {
      log("❌ Table Bulk Render Error: " + (err as Error).message);
      setStatus("Failed");
    }
  }

  // State code for helper text selection
  const statusColorClass = status === "Connected" ? "connected" : status === "Failed" ? "failed" : status.includes("Loading") || status.includes("rendering") ? "loading" : "idle";

  return (
    <>
      {/* <Agentation /> */}
      {/* HEADER SECTION */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <h1>100PrintsWithMe Browser SDK Testbed</h1>
          <p className="subtitle">Framework-Agnostic Engine Playpen & Testing Environment</p>
        </div>
        <div className="status-pill">
          <span className={`status-dot ${statusColorClass}`} />
          Status: <span style={{ color: "white" }}>{status}</span>
        </div>
      </header>

      {/* INITIALIZATION PANEL */}
      <section className="panel">
        <div className="panel-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-purple)" }}>
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            1. SDK Initialisation
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr auto", gap: "16px", alignItems: "end" }}>
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Publishable SDK Key</label>
            <input
              type="password"
              placeholder="pk_live_..."
              className="form-input"
              value={key}
              onChange={e => setKey(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Template ID</label>
            <input
              type="text"
              placeholder="Template ID"
              className="form-input"
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
            />
          </div>
          <button onClick={loadTemplate} className="btn btn-primary" style={{ height: "42px" }} disabled={isInitialising}>
            {isInitialising ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Initialise & Fetch
              </>
            )}
          </button>
        </div>
      </section>

      {/* SINGLE RENDER / PREVIEW SPLIT */}
      <section className="grid-2">
        {/* Controls */}
        {templateInfo ? (
          <div className="panel">
            <div className="panel-header">
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-pink)" }}>
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                2. Template Customization
              </h2>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Active Template: <strong style={{ color: "white" }}>{templateInfo.template_data?.name}</strong> (Dimensions: {templateInfo.dimensions?.width}x{templateInfo.dimensions?.height})
            </p>

            <h3 className="form-label" style={{ marginBottom: "12px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Mustache Payloads</h3>
            <div style={{ maxHeight: "220px", overflowY: "auto", paddingRight: "6px", marginBottom: "24px", border: "1px solid var(--panel-border)", borderRadius: "8px", padding: "12px", background: "#030712" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {Object.keys(variables).map(vKey => (
                  <div key={vKey} className="form-group">
                    <label className="form-label" style={{ fontSize: "0.6875rem", color: "var(--accent-purple)", textTransform: "none" }}>{vKey}</label>
                    <input
                      type="text"
                      value={variables[vKey]}
                      onChange={e => setVariables({ ...variables, [vKey]: e.target.value })}
                      className="form-input"
                    />
                  </div>
                ))}
                {Object.keys(variables).length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", gridColumn: "span 2", textAlign: "center" }}>No mustache variables detected in template layers.</p>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: "20px" }}>
              <h3 className="form-label" style={{ marginBottom: "12px", fontSize: "0.75rem" }}>Render Options</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div className="form-group">
                  <label className="form-label">Format</label>
                  <select value={renderFormat} onChange={e => setRenderFormat(e.target.value as any)} className="form-select">
                    <option value="png">PNG Image</option>
                    <option value="pdf">PDF Document</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quality Scale</label>
                  <select value={renderQuality} onChange={e => setRenderQuality(e.target.value as any)} className="form-select">
                    <option value="draft">Draft (1x)</option>
                    <option value="standard">Standard (2x)</option>
                    <option value="high">High (4x)</option>
                    <option value="ultra">Ultra (8x)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Side</label>
                  <select value={renderSide} onChange={e => setRenderSide(e.target.value as any)} className="form-select">
                    <option value="both">Both (Front & Back)</option>
                    <option value="front">Front Only</option>
                    <option value="back">Back Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => updatePreview()} className="btn btn-primary" style={{ flex: 1 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Update Preview
                </button>
                <button onClick={downloadSingle} className="btn btn-success" style={{ flex: 1 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Render Single
                </button>
              </div>
              {previewBlobUrl && (
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <a href={previewBlobUrl} target="_blank" rel="noreferrer" className="btn-text" style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                    🔗 Open Last Rendered File ({renderFormat.toUpperCase()})
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "360px", textAlign: "center", color: "var(--text-secondary)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-pink)", marginBottom: "16px" }}>
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>2. Customize Template</h3>
            <p style={{ fontSize: "0.875rem", maxWidth: "260px" }}>Fetch a template definition above to load customization options and variables.</p>
          </div>
        )}

        {/* Preview Container */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-blue)" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Canvas Output Preview
            </h2>
          </div>
          <div className="preview-canvas-container" style={{ position: "relative" }}>
            <div
              key="canvas-mount"
              ref={previewContainerRef}
              className="canvas-mount-point"
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}
            />
            {!templateInfo && (
              <div key="placeholder" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textAlign: "center", maxWidth: "280px" }}>
                  Initialize SDK & Fetch Template above to activate preview
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NEW INTERACTIVE TABLE BULK EXPORT */}
      {templateInfo && (
        <section className="panel">
          <div className="panel-header">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-green)" }}>
                <path d="M3 3h18v18H3z"></path>
                <path d="M21 9H3"></path>
                <path d="M21 15H3"></path>
                <path d="M12 3v18"></path>
              </svg>
              3. Interactive Bulk Export Grid
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="form-label" style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginBottom: 0, textTransform: "none" }}>Format:</span>
                <select
                  value={renderFormat}
                  onChange={e => setRenderFormat(e.target.value as any)}
                  className="form-select"
                  style={{ padding: "4px 8px", width: "auto", fontSize: "0.75rem", height: "28px", background: "#030712" }}
                >
                  <option value="pdf">PDF (Merged)</option>
                  <option value="png">ZIP (PNGs)</option>
                </select>
              </div>
              <button onClick={addTableRow} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Record Row
              </button>
            </div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "16px" }}>
            Add, edit, or delete records in the table grid below. Click Export to download a merged PDF or a ZIP archive containing individual PNGs.
          </p>

          <div className="table-container">
            {tableRows.length > 0 ? (
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>#</th>
                    {Object.keys(variables).map(vKey => (
                      <th key={vKey}>{vKey}</th>
                    ))}
                    <th style={{ width: "80px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                        {rowIndex + 1}
                      </td>
                      {Object.keys(variables).map(vKey => (
                        <td key={vKey}>
                          <input
                            type="text"
                            value={row[vKey] !== undefined ? row[vKey] : ""}
                            onChange={e => handleTableCellChange(rowIndex, vKey, e.target.value)}
                            className="table-input"
                            placeholder={`Enter ${vKey}...`}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => deleteTableRow(rowIndex)}
                          className="btn btn-text"
                          style={{ color: "#ef4444", padding: "4px" }}
                          title="Delete Row"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-placeholder">
                No rows in the bulk export table. Click "Add Record Row" to get started.
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              onClick={triggerTableBulkExport}
              disabled={tableRows.length === 0}
              className="btn btn-pink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export Grid Data ({renderFormat.toUpperCase()})
            </button>
          </div>
        </section>
      )}

      {/* CSV BULK RENDER PANEL */}
      {/* LOGS PANEL */}
      <section className="panel">
        <div className="panel-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            4. Execution Console Logs
          </h2>
          <button onClick={clearLogs} className="btn-text">Clear Console</button>
        </div>

        <div className="log-console">
          {logs.length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>Console idle. Ready for SDK commands...</div>
          ) : (
            logs.map((logStr, i) => {
              let logClass = "log-entry default";
              if (logStr.includes("❌")) logClass = "log-entry error";
              else if (logStr.includes("✅") || logStr.includes("🎉")) logClass = "log-entry success";
              else if (logStr.includes("🔄") || logStr.includes("📈")) logClass = "log-entry info";
              return (
                <div key={i} className={logClass}>
                  {logStr}
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
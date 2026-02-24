import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name.toLowerCase();
    let extractedText = "";

    if (fileName.endsWith(".txt")) {
      extractedText = await file.text();
    } else if (fileName.endsWith(".pdf")) {
      extractedText = await extractPdfText(file);
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      extractedText = await extractDocxText(file);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload TXT, PDF, or DOCX." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text: extractedText.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-document-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract text" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── PDF extraction ──────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const rawText = extractPdfTextSimple(bytes);

  if (rawText.trim().length > 50) return rawText;

  return await extractWithAI(buffer, file.name, "pdf");
}

function extractPdfTextSimple(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const textBlocks: string[] = [];

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(text)) !== null) {
    const streamContent = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
      textBlocks.push(tjMatch[1]);
    }
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(streamContent)) !== null) {
      const innerParens = /\(([^)]*)\)/g;
      let inner;
      const parts: string[] = [];
      while ((inner = innerParens.exec(tjArrayMatch[1])) !== null) {
        parts.push(inner[1]);
      }
      if (parts.length) textBlocks.push(parts.join(""));
    }
  }

  return textBlocks
    .map((b) =>
      b.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
    )
    .join("\n");
}

// ── DOCX extraction with images ─────────────────────────────────────

async function extractDocxText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const zipEntries = await parseZipEntriesAsync(new Uint8Array(buffer));

    // Find key XML files
    const docEntry = zipEntries.find((e) => e.name === "word/document.xml");
    const relsEntry = zipEntries.find((e) => e.name === "word/_rels/document.xml.rels");

    if (!docEntry) {
      return await extractWithAI(buffer, file.name, "docx");
    }

    const xmlText = new TextDecoder().decode(docEntry.data);
    const relsText = relsEntry ? new TextDecoder().decode(relsEntry.data) : "";

    // Build relationship map (rId -> target path)
    const relMap = new Map<string, string>();
    if (relsText) {
      const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]*\/>/g;
      let relMatch;
      while ((relMatch = relRegex.exec(relsText)) !== null) {
        relMap.set(relMatch[1], relMatch[2]);
      }
    }

    // Find image entries in ZIP
    const imageEntries = zipEntries.filter((e) => e.name.startsWith("word/media/"));

    // Upload images to storage and build path -> URL map
    const imageUrlMap = new Map<string, string>();
    if (imageEntries.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      for (const entry of imageEntries) {
        const relPath = entry.name.replace("word/", "");
        const ext = entry.name.split(".").pop()?.toLowerCase() || "png";
        const mimeMap: Record<string, string> = {
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
          tiff: "image/tiff", emf: "image/emf", wmf: "image/wmf",
        };
        const mime = mimeMap[ext] || "application/octet-stream";

        // Skip non-web-displayable formats
        if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) continue;

        const storagePath = `docx-extract/${Date.now()}-${entry.name.split("/").pop()}`;
        const { data, error } = await supabase.storage
          .from("article-attachments")
          .upload(storagePath, entry.data, { contentType: mime, upsert: false });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("article-attachments")
            .getPublicUrl(data.path);
          imageUrlMap.set(relPath, urlData.publicUrl);
        }
      }
    }

    // Parse document.xml — extract text with inline images
    const paragraphs: string[] = [];
    const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
    let pMatch;

    while ((pMatch = pRegex.exec(xmlText)) !== null) {
      const pContent = pMatch[0];
      const parts: string[] = [];

      // Process runs and drawings in order
      const elementRegex = /<w:r[\s>][\s\S]*?<\/w:r>|<w:drawing>[\s\S]*?<\/w:drawing>/g;
      let elemMatch;

      while ((elemMatch = elementRegex.exec(pContent)) !== null) {
        const elem = elemMatch[0];

        if (elem.startsWith("<w:drawing>") || elem.includes("<w:drawing>")) {
          // Extract image reference
          const embedMatch = elem.match(/r:embed="([^"]+)"/);
          if (embedMatch) {
            const rId = embedMatch[1];
            const target = relMap.get(rId);
            if (target) {
              const url = imageUrlMap.get(target);
              if (url) {
                const imgName = target.split("/").pop() || "image";
                parts.push(`\n\n![${imgName}](${url})\n\n`);
              }
            }
          }
        } else {
          // Extract text from run
          const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
          let tMatch;
          while ((tMatch = tRegex.exec(elem)) !== null) {
            parts.push(tMatch[1]);
          }
        }
      }

      // Also check for standalone text nodes not in runs
      if (parts.length === 0) {
        const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let tMatch;
        while ((tMatch = tRegex.exec(pContent)) !== null) {
          parts.push(tMatch[1]);
        }
      }

      if (parts.length) {
        paragraphs.push(parts.join(""));
      }
    }

    const result = paragraphs.join("\n");
    if (result.trim().length > 20) return result;

    return await extractWithAI(buffer, file.name, "docx");
  } catch (e) {
    console.error("DOCX parse error, falling back to AI:", e);
    const buffer = await file.arrayBuffer();
    return await extractWithAI(buffer, file.name, "docx");
  }
}

// ── Async ZIP parser with DecompressionStream ───────────────────────

async function parseZipEntriesAsync(
  data: Uint8Array
): Promise<{ name: string; data: Uint8Array }[]> {
  const entries: { name: string; data: Uint8Array }[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  while (offset < data.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = data.slice(offset + 30, offset + 30 + fileNameLen);
    const name = new TextDecoder().decode(nameBytes);

    const dataStart = offset + 30 + fileNameLen + extraLen;
    const rawData = data.slice(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      entries.push({ name, data: rawData });
    } else if (compressionMethod === 8) {
      try {
        const decompressed = await decompressRaw(rawData);
        entries.push({ name, data: decompressed });
      } catch (e) {
        console.warn(`Failed to decompress ${name}:`, e);
        entries.push({ name, data: rawData });
      }
    } else {
      entries.push({ name, data: rawData });
    }

    offset = dataStart + compressedSize;
  }

  return entries;
}

async function decompressRaw(compressed: Uint8Array): Promise<Uint8Array> {
  // Wrap raw deflate data with zlib header so we can use "deflate" format
  // zlib header: 0x78 0x01 (lowest compression level marker)
  const zlibWrapped = new Uint8Array(compressed.length + 6);
  zlibWrapped[0] = 0x78;
  zlibWrapped[1] = 0x01;
  zlibWrapped.set(compressed, 2);
  // Compute Adler-32 checksum for the decompressed data (required by zlib)
  // We'll skip the checksum and just try — most implementations tolerate it
  // Set dummy checksum bytes
  zlibWrapped[compressed.length + 2] = 0;
  zlibWrapped[compressed.length + 3] = 0;
  zlibWrapped[compressed.length + 4] = 0;
  zlibWrapped[compressed.length + 5] = 0;

  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    const writePromise = writer.write(zlibWrapped).then(() => writer.close()).catch(() => {});

    const chunks: Uint8Array[] = [];
    let totalLen = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLen += value.length;
      }
    } catch {
      // Checksum error at end is expected — we still got the data
    }

    await writePromise;

    if (totalLen === 0) throw new Error("No data decompressed");

    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  } catch {
    // Final fallback: try "deflate-raw" if available
    try {
      const ds = new DecompressionStream("deflate-raw" as any);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      const writePromise = writer.write(compressed).then(() => writer.close()).catch(() => {});
      const chunks: Uint8Array[] = [];
      let totalLen = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalLen += value.length;
        }
      } catch {}
      await writePromise;
      if (totalLen === 0) throw new Error("deflate-raw failed");
      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
      return result;
    } catch {
      throw new Error("Decompression not supported in this runtime");
    }
  }
}

// ── AI fallback ─────────────────────────────────────────────────────

async function extractWithAI(
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<string> {
  // Gemini only supports PDF for document extraction, not DOCX
  if (fileType !== "pdf") {
    throw new Error(
      "Could not extract text from this file. The document parser failed. Please try a .txt file or paste the content directly."
    );
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error(
      "Could not extract text from this file. Please try a .txt file instead."
    );
  }

  // Convert to base64 in chunks to avoid stack overflow
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  const mimeType = "application/pdf";

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a document text extractor. Extract ALL text content from the provided document exactly as written. Preserve paragraph breaks. Do not add any commentary, headers, or formatting — output only the raw text content of the document.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all text from this ${fileType.toUpperCase()} file named "${fileName}". Return only the raw text content.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI extraction error:", response.status, errText);
    throw new Error(
      "Could not extract text from this file. Please try a .txt file or paste the content directly."
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

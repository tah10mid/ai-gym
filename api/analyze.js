// POST /api/analyze  — Vercel serverless function
// Reads an uploaded InBody report image with Claude Opus 4.8 (vision) and
// returns structured body-composition metrics. The client feeds these into
// plan-engine.js to produce the diet + workout. This is the real OCR step
// that replaces the mocked "Reading your report…" screen.
//
// Requires env var ANTHROPIC_API_KEY (set it in the Vercel dashboard).

const Anthropic = require("@anthropic-ai/sdk");

// JSON schema for the values we extract. Every field is nullable so the model
// returns null for anything not clearly printed on the report (no guessing).
const SCHEMA = {
  type: "object",
  properties: {
    sex:          { type: ["string", "null"], enum: ["male", "female", null] },
    age:          { type: ["integer", "null"] },
    heightCm:     { type: ["number", "null"] },
    weightKg:     { type: ["number", "null"] },
    pbf:          { type: ["number", "null"] },   // percent body fat
    smm:          { type: ["number", "null"] },   // skeletal muscle mass (kg)
    bmi:          { type: ["number", "null"] },
    inbodyScore:  { type: ["integer", "null"] },
    notes:        { type: "string" }              // brief read confidence / caveats
  },
  required: ["sex", "age", "heightCm", "weightKg", "pbf", "smm", "bmi", "inbodyScore", "notes"],
  additionalProperties: false
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, mediaType } = body;
    if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64." });

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA }
      },
      system:
        "You read InBody (or similar) body-composition report images and extract the exact printed values. " +
        "Return null for any field that is not clearly visible — never guess or infer. " +
        "Weight and SMM are in kilograms; PBF is percent body fat; heightCm in centimetres. " +
        "Put a one-line confidence note (and flag any low-confidence fields) in `notes`.",
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType || "image/jpeg",
              data: imageBase64
            }
          },
          { type: "text", text: "Extract the body-composition metrics from this report." }
        ]
      }]
    });

    // With output_config.format, the first text block is valid JSON for SCHEMA.
    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock) return res.status(502).json({ error: "No structured output returned." });

    const metrics = JSON.parse(textBlock.text);
    return res.status(200).json({ metrics });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err && err.message ? err.message : "Analysis failed." });
  }
};

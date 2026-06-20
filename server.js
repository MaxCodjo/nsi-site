import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static NSI site (index.html, css, js, data, assets) from the repo root.
app.use(express.static(__dirname));

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`nsi-site running on port ${PORT}`);
});

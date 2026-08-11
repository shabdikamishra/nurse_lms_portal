import { ChromaClient } from "chromadb";
import ollama from "ollama";
import fs from "fs";
import path from "path";

const chroma = new ChromaClient({ 
  host: "127.0.0.1", 
  port: 8000 
});

async function runIngestion() {
  const collection = await chroma.getOrCreateCollection({ 
    name: "nurse_lms_docs",
    embeddingFunction: null 
  });
  
  // Define your targets in an array to index multiple sources
  const filesToIngest = [
    "lms_project_summary.md", 
    "NURSE_LMS_RAG_BASE.md"
  ];

  for (const fileName of filesToIngest) {
    const filePath = path.join("./data", fileName);

    // Verify file physical presence before reading
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found, skipping: ${filePath}`);
      continue;
    }

    console.log(`Processing file: ${fileName}...`);
    const text = fs.readFileSync(filePath, "utf-8");
    
    // Split your markdown structures into logical paragraphs
    const chunks = text.split(/\n\s*\n/).filter(c => c.trim().length > 0);

    for (let i = 0; i < chunks.length; i++) {
      const embedRes = await ollama.embed({
        model: "nomic-embed-text",
        input: chunks[i],
      });

const embeddingVector = embedRes.embeddings[0];

await collection.add({
  ids: [`chunk_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}_${i}`],
  embeddings: [embeddingVector], // Pass the corrected 1D array inside Chroma's list
  documents: [chunks[i]],
  metadatas: [{ source: fileName }] 
});
    }
    console.log(` Successfully indexed ${chunks.length} chunks from ${fileName}!`);
  }
}

runIngestion().catch(console.error);

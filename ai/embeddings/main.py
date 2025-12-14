from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

app = FastAPI()

# Small, fast model for local dev / infra testing only
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@app.get("/health")
def health():
    return {"status": "ok", "service": "embeddings"}

@app.post("/embed")
def embed(text: str):
    vector = model.encode(text).tolist()
    return {"embedding": vector}

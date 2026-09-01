from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from .models import ExtractionResponse
from .service import MAX_FILE_BYTES, DocumentError, process_document


app = FastAPI(
    title="National Land Document OCR API",
    version="0.1.0",
    description="OCR and human-review-oriented extraction for land-acquisition records.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/documents/extract", response_model=ExtractionResponse)
async def extract_document(file: UploadFile = File(...)) -> ExtractionResponse:
    data = await file.read(MAX_FILE_BYTES + 1)
    await file.close()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_FILE_BYTES // 1024 // 1024} MB limit")
    try:
        pages, record = await run_in_threadpool(process_document, data)
    except DocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ExtractionResponse(
        filename=file.filename or "upload",
        page_count=len(pages),
        pages=pages,
        record=record,
    )

# Land document OCR API

A backend-only API that accepts scanned PDFs or images, runs full-page OCR with
Hugging Face's `microsoft/Florence-2-base`, then asks a local Ollama model for a
schema-validated land-acquisition record. Every result includes the source OCR
by page and a `review_required` flag; it is not intended to make autonomous
legal or compensation decisions.

## Run

Prerequisites: Python 3.10+, [Ollama](https://ollama.com/), and enough memory for
the selected OCR and language models. A CUDA GPU is used automatically when
PyTorch detects one; CPU also works but is slower.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[test]"
ollama pull qwen2.5:7b-instruct
ollama serve
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The Hugging Face OCR model and its custom model code download on the first
extraction. The default `HF_MODEL_REVISION` pins both to a reviewed Hub commit;
review and update that pin deliberately when upgrading the model.
Configuration defaults are listed in `.env.example`; export them in the process
environment (the service deliberately does not add a dotenv dependency).

## API

```bash
curl -X POST http://127.0.0.1:8000/v1/documents/extract \
  -F "file=@land-notice.pdf"
```

The response contains `pages` with raw OCR plus a `record` with people and
roles, parcel/survey references, locations, dates, amounts, authority, purpose,
jurisdiction-specific land identifiers, legal references, confidence, warnings,
and review status. Interactive OpenAPI documentation is
available at `http://127.0.0.1:8000/docs`.

Supported inputs are PDF, PNG, JPEG, WEBP, and multi-frame TIFF. Defaults limit
uploads to 25 MB, 50 pages, and 16 megapixels per page. Do not expose the API
directly to the internet: put authentication, TLS, rate limits, malware
scanning, encrypted storage, retention controls, and audit logging at the
deployment boundary because land documents contain sensitive personal data.

## Test

```powershell
python -m pytest
```

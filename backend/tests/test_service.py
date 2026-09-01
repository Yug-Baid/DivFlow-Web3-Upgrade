import json
from io import BytesIO
from unittest.mock import patch

from PIL import Image

from app.models import LandRecord
from app.service import DocumentError, extract_land_record, render_document


def test_render_image() -> None:
    buffer = BytesIO()
    Image.new("RGB", (20, 10), "white").save(buffer, format="PNG")
    pages = render_document(buffer.getvalue())
    assert len(pages) == 1
    assert pages[0].size == (20, 10)


def test_rejects_unknown_file() -> None:
    try:
        render_document(b"not a document")
    except DocumentError:
        pass
    else:
        raise AssertionError("invalid input must be rejected")


def test_ollama_structured_response() -> None:
    record = LandRecord(document_type="award", confidence=0.9, review_required=False)
    response = BytesIO(json.dumps({"message": {"content": record.model_dump_json()}}).encode())
    with patch("app.service.urlopen", return_value=response):
        parsed = extract_land_record("Owner: Asha")
    assert parsed.document_type == "award"
    assert parsed.confidence == 0.9


def test_low_confidence_always_requires_review() -> None:
    record = LandRecord(confidence=0.5, review_required=False)
    assert record.review_required is True
    assert any("confidence" in warning.lower() for warning in record.warnings)

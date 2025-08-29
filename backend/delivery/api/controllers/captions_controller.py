from domain.captions_dto import CaptionRequest
from usecases.captions_service import generate_captions
from fastapi import HTTPException

def generate_caption_controller(request: CaptionRequest):
    try:
        return generate_captions(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate captions: {e}")

from fastapi import APIRouter,HTTPException
from delivery.api.controllers import captions_controller
from domain.captions_dto import CaptionRequest

router = APIRouter()

@router.post("/generate/caption")
def generate_storyboard(request: CaptionRequest):
    try:
        return captions_controller.generate_caption_controller(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from domain.videos_dto import StoryboardRequest, StoryboardResponse
from infrastructure.ai_services import get_structured_response
from templates.prompt_templates import STORYBOARD_PROMPT_TEMPLATE


def generate_storyboard(request: StoryboardRequest) -> StoryboardResponse:
    
    """
    Generates a storyboard for a video based on the provided request.
    """
    try:
        input_variables = {
            "idea": request.idea,
            "language": request.language or "English",
            "number_of_shots": request.number_of_shots or 3,
            "brand_name": request.brand_presets.name,
            "colors": ", ".join(request.brand_presets.colors),
            "brand_tone": request.brand_presets.tone,
            "platform": request.platform,
            "cta": request.cta or "tiktok"
        }
        
        return get_structured_response(
            prompt_template_str=STORYBOARD_PROMPT_TEMPLATE,
            input_variables=input_variables,
            pydantic_model=StoryboardResponse
        )
    except Exception as e:
        raise Exception(f"Failed to generate storyboard: {e}")

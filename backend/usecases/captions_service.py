from infrastructure.ai_services import get_structured_response
from domain.captions_dto import CaptionRequest,CaptiononResponse
from templates.prompt_templates import Caption_PROMPT_TEMPLATE



def generate_captions(req : CaptionRequest):

    try:
        input_variables = {
            "idea": req.idea,
            "platform": req.platform,
            "language": req.language ,
            "brand_name": req.brand_presets.name,
            "hashtags_count":req.hashtags_count,
            "colors": ", ".join(req.brand_presets.colors),
            "brand_tone": req.brand_presets.tone,        
            "default_hashtags": ", ".join(req.brand_presets.default_hashtags)}
         
        return get_structured_response(prompt_template_str=Caption_PROMPT_TEMPLATE,input_variables=input_variables,pydantic_model=CaptiononResponse)
         

    except Exception as e:
         raise Exception(f'Failed to generate Caption {e}') 

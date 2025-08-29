STORYBOARD_PROMPT_TEMPLATE = """
You are a creative assistant that helps create storyboards for social media videos.
Generate a storyboard for a video about "{idea}".
The video should be in {language}.
The video should have {number_of_shots} shots.

The brand that uses this video for marketing is {brand_name}.
The brand personality is {brand_tone}.
The color pallete for the brand is {colors}.
The platform is {platform}.
The call to action is {cta}.

Generate a list of shots, where each shot has a duration, a description of the scene, and a suggestion for the background music genre.
"""

Caption_PROMPT_TEMPLATE = """
You are a creative assistant that helps create caption and hashtags for social media videos.
Generate a caption for a video about "{idea}".
The video should be in {language}.
The video should have {default_hashtags} it there is any .
The video should have a max of  {hashtags_count} hashtags.

The brand that uses this video for marketing is {brand_name}.
The brand personality is {brand_tone}.
The color pallete for the brand is {colors}.
The platform is {platform}.

Generate a list of shots, where each shot has a duration, a description of the scene, and a suggestion for the background music genre.
"""
from typing import Dict, Tuple

# Scoring Category Max Scores
SCORE_MAX_LIMITS = {
    "technical_skills": 40,
    "experience": 20,
    "education": 10,
    "projects": 15,
    "certifications": 5,
    "resume_quality": 5,
    "bonus_skills": 5
}

def calculate_recommendation(total_score: int) -> Tuple[str, str]:
    """
    Determines recommendation and label based on backend hiring rules.
    - Score >= 85: 'Shortlist' category, 'Strong Shortlist' label
    - Score >= 70: 'Shortlist' category, 'Shortlist' label
    - Score >= 60: 'Review' category, 'Needs HR Review' label
    - Score < 60: 'Reject' category, 'Reject' label
    """
    if total_score >= 85:
        return "Shortlist", "Strong Shortlist"
    elif total_score >= 70:
        return "Shortlist", "Shortlist"
    elif total_score >= 60:
        return "Review", "Needs HR Review"
    else:
        return "Reject", "Reject"

def process_scoring(raw_scores: Dict[str, int]) -> Tuple[Dict[str, int], int, str, str]:
    """
    Validates and caps category scores, computes the total score, 
    and determines recommendations.
    """
    normalized = {}
    total = 0
    
    for key, max_val in SCORE_MAX_LIMITS.items():
        # Handle cases where LLM returns camelCase keys or raw scores
        raw_val = raw_scores.get(key)
        if raw_val is None:
            # Try camelCase fallback
            camel_key = "".join(x.title() if i > 0 else x for i, x in enumerate(key.split("_")))
            raw_val = raw_scores.get(camel_key, 0)
        
        # Ensure it's an integer and clamp within [0, max_val]
        try:
            val = int(raw_val)
        except (ValueError, TypeError):
            val = 0
            
        val = max(0, min(max_val, val))
        normalized[key] = val
        total += val
        
    rec, label = calculate_recommendation(total)
    return normalized, total, rec, label

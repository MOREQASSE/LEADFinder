SEARCH_MODES = {
    "job_hunter": {
        "label": "Job Hunter",
        "description": "Find employment, full-time roles, contracts",
        "icon": "fa-briefcase",
        "keywords_modifiers": [
            "hiring", "position", "full-time", "remote", "salary",
            "job opening", "opportunity", "career", "we are looking for",
        ],
        "exclude_modifiers": [
            "internship", "intern", "volunteer", "unpaid", "freelance project",
        ],
        "geo_weight": 0.8,
    },
    "internship_scout": {
        "label": "Internship Scout",
        "description": "Discover internships and entry-level programs",
        "icon": "fa-graduation-cap",
        "keywords_modifiers": [
            "internship", "intern", "graduate trainee", "fresher",
            "entry-level", "new grad", "apprentice", "summer intern",
        ],
        "exclude_modifiers": [
            "senior", "lead", "manager", "principal",
            "5+ years", "10 years", "experienced",
        ],
        "geo_weight": 0.6,
    },
    "clients_excavator": {
        "label": "Clients Excavator",
        "description": "Find buyers who need services",
        "icon": "fa-users",
        "keywords_modifiers": [
            "looking for", "need help", "looking to build",
            "want to hire", "seeking freelancer", "need a developer",
            "need a designer", "looking for a developer",
        ],
        "exclude_modifiers": [
            "looking for work", "looking for a job", "available for hire",
            "seeking employment", "resume attached", "open to work",
        ],
        "geo_weight": 0.3,
    },
}

# Built-in preset to mode associations (optional — preset can leave blank for no override)
PRESET_MODE_ASSOCIATIONS = {
    "websites": "clients_excavator",
    "high_ticket_agency": "clients_excavator",
    "broad_freelance": "clients_excavator",
    "network_telecom_jobs": "job_hunter",
    "cybersecurity_jobs": "job_hunter",
    "network_telecom_internship": "internship_scout",
    "cybersecurity_internship": "internship_scout",
}


def get_mode_for_preset(preset_id: str, custom_presets: list[dict] | None = None) -> str | None:
    """Return the mode associated with a preset, or None if no association."""
    if preset_id in PRESET_MODE_ASSOCIATIONS:
        return PRESET_MODE_ASSOCIATIONS[preset_id]
    if custom_presets:
        for p in custom_presets:
            if p.get("id") == preset_id:
                return p.get("mode")
    return None

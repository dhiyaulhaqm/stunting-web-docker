ROLES = {
    "admin": "Admin",
    "petugas_kesehatan": "Petugas Kesehatan",
    "orang_tua": "Orang Tua",
}

ROLE_ALIASES = {
    "petugas": "petugas_kesehatan",
    "petugas kesehatan": "petugas_kesehatan",
    "orang tua": "orang_tua",
    "ortu": "orang_tua",
}


def normalize_role(role):
    if role is None:
        return None

    normalized = str(role).strip().lower()
    normalized = ROLE_ALIASES.get(normalized, normalized)

    return normalized if normalized in ROLES else None


def role_options():
    return [
        {"value": value, "label": label}
        for value, label in ROLES.items()
    ]

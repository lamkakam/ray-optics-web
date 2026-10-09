"""Glasses kept in the vendor catalogs through opticalglass's AGF library.

opticalglass 2.0 refreshed the vendor spreadsheets, dropping glasses that the
previous 1.1.1 spreadsheets listed. Saved prescriptions and example systems may
still name them, and the frontend accepts only glasses present in the exported
catalogs. The glasses below were dropped from the 2.0.2 spreadsheets yet still
resolve through ``create_glass(name, catalog)`` to the Zemax AGF data that
opticalglass bundles, so they are exported under their vendor catalog.

The list is pinned rather than derived at runtime: it records the difference
between two specific spreadsheet releases, and glasses that no longer resolve at
all are intentionally absent.
"""

#: Dropped spreadsheet glasses that resolve to AGF media, keyed by vendor catalog.
LEGACY_AGF_GLASSES: dict[str, tuple[str, ...]] = {
    "CDGM": ("D-LaF82L",),
    "Hikari": (
        "Q-FKH2S",
        "Q-LAF010S",
        "Q-LAK52S",
        "Q-LASF03S",
        "Q-LASFH11S",
        "Q-LASFH12S",
        "Q-PSKH1S",
        "Q-SF6S",
    ),
    "Hoya": ("FDS90(P)",),
    "Ohara": (
        "S-BAH10",
        "S-BAL41",
        "S-FPM2",
        "S-FPM3",
        "S-LAH63",
        "S-LAL13",
        "S-LAL54",
        "S-LAM54",
        "S-LAM61",
        "S-NPH53",
        "S-TIH23",
        "S-TIM22",
    ),
    "Schott": (
        "K7",
        "LAFN7",
        "N-KZFS4HT",
        "N-LAF35",
        "N-LASF45HT",
        "N-LASF46A",
        "N-LASF9HT",
        "N-ZK7",
        "P-BK7",
        "P-LASF50",
        "P-LASF51",
        "P-SF8",
        "P-SK57Q1",
        "P-SK58A",
    ),
    "Sumita": ("K-FIR100UV", "K-FIR98UV", "K-PFK90", "K-PSFn202"),
}

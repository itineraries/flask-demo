#!/usr/bin/env python3
from .types import SourceSection
from .place_google import get_suggestions as gs_google

def autocomplete(partial_input, offset=None):
    # Get autocomplete suggestions from all sources.
    return [
        # Google Maps Place Autocomplete API
        SourceSection(
            heading="From Google Maps",
            suggestions=gs_google(partial_input, offset)
        ),
        # Add more sources here.
        # All sources must return a list of Suggestion objects (see types.py).
    ]

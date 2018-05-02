#!/usr/bin/env python3
'''
This module offers autocomplete suggestions for names of places. Call
autocomplete to get a list of SourceSection objects. See types.py for more
information on the SourceSection and Suggestion classes.

Files are organized this way:
 - source_*.py files contain a get_suggestions() function that takes the same
   arguments as autocomplete() below
 - pickle_*.py files will not be imported; they are scripts that prepare cache
   files for their respective source_*.py files
 - cache_*.pickle files are data files that sources can use for any purpose
'''
from .types import SourceSection, Suggestion
from .source_google import get_suggestions as gs_google

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

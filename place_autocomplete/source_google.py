#!/usr/bin/env python3
import atexit, collections, flask, itertools, json, keyring, os, pickle, \
    requests
from . import Suggestion
SEARCH_CIRCLE_CENTER = "40.72797042,-73.98642518"
SEARCH_CIRCLE_RADIUS = "4500"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "cache_google.pickle")
CACHE_MAX_ENTRIES = 1000

try:
    _apikey = os.environ["GMAPS_PLACE_AUTOCOMPLETE_KEY"]
except KeyError:
    _apikey = keyring.get_password("google_maps", "place_autocomplete")

_cache = collections.OrderedDict()

def get_suggestions(partial_input, offset=None):
    cache_key = (partial_input, offset or len(partial_input))
    try:
        return _cache[cache_key]
    except KeyError:
        pass
    # Build the URL parameters.
    # See https://developers.google.com/places/web-service/autocomplete for
    # information about these parameters.
    params = {
        # A string of what the user has entered so far
        "input": partial_input,
        # The API key
        "key": _apikey,
        # A point near which to search
        "location": SEARCH_CIRCLE_CENTER,
        # The distance, in meters, to search around the point
        "radius": SEARCH_CIRCLE_RADIUS
    }
    if offset is not None:
        # The position of the caret in the text field
        params["offset"] = offset
    # Send the request, decode the response, and return a list of Suggestions.
    # In the event of an error, just return an empty list. Automatic retrial is
    # not critical for autocomplete because the user will probably type another
    # character soon anyway.
    result = []
    try:
        request = requests.get(
            "https://maps.googleapis.com/maps/api/place/autocomplete/json",
            params=params
        )
    except requests.exceptions.ConnectionError:
        print("place_autocomplete: info: connection error")
    else:
        try:
            decoded = json.loads(request.text)
        except json.decoder.JSONDecodeError:
            print("place_autocomplete: info: JSON decode error")
        else:
            status = decoded.get("status")
            if status == "OK":
                for prediction in decoded["predictions"]:
                    sf = prediction["structured_formatting"]
                    # Instantiate a Suggestion. It will be appended to result.
                    suggestion = Suggestion(
                        secondary_text=sf.get("secondary_text", "")
                    )
                    # Split the main text up by the matched substrings.
                    main_text = sf["main_text"]
                    last_offset = 0
                    for length_offset in sf["main_text_matched_substrings"]:
                        length = length_offset["length"]
                        offset = length_offset["offset"]
                        next_offset = offset + length
                        # Check for characters that are not a part of a matched
                        # substring.
                        if last_offset < offset:
                            suggestion.add_main_text_part(
                                text=main_text[last_offset:offset],
                                is_match=False
                            )
                        # Add this matched substring.
                        suggestion.add_main_text_part(
                            text=main_text[offset:next_offset],
                            is_match=True
                        )
                        # Advance our cursor.
                        last_offset = next_offset
                    # Check for an unmatched part at the end of the main text.
                    if last_offset < len(main_text):
                        suggestion.add_main_text_part(
                            text=main_text[last_offset:],
                            is_match=False
                        )
                    # Save the suggestion.
                    result.append(suggestion)
            else:
                print("place_autocomplete: info: status:", status)
    # Add the result to the cache. If the cache is too large, delete the oldest
    # entries.
    _cache[cache_key] = result
    if len(_cache) > CACHE_MAX_ENTRIES:
        for key in itertools.islice(_cache.keys(), CACHE_MAX_ENTRIES // 10):
            del _cache[key]
    # We are done.
    return result
def load_cache():
    try:
        with open(CACHE_FILE, "rb") as f:
            _cache.update(pickle.load(f))
    except (EOFError, OSError, TypeError):
        pass
def save_cache():
    if _cache:
        try:
            with open(CACHE_FILE, "wb") as f:
                pickle.dump(_cache, f)
        except OSError as e:
            print("source_google: warning: unable to save cache file")
            print(e)

if flask.app.get_env() == "production" or \
    os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    # The Flask reloader has a master and child process.
    # Only save and load the cache in the master process.
    # https://stackoverflow.com/a/25519547/1149181
    atexit.register(save_cache)
    load_cache()

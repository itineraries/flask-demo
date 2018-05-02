#!/usr/bin/env python3
import attr, json, keyring, os, requests
SEARCH_CIRCLE_CENTER = "40.72797042,-73.98642518"
SEARCH_CIRCLE_RADIUS = "4500"

try:
    _apikey = os.environ["GMAPS_PLACE_AUTOCOMPLETE_KEY"]
except KeyError:
    _apikey = keyring.get_password("google_maps", "place_autocomplete")

@attr.s
class Suggestion:
    '''
    This class represents one suggestion that autocomplete may return.
    
    Attributes:
        main_text_parts:
            A list of Substring objects that, when joined, are a string that
            partially or fully matches the input string
        secondary_text:
            Some additional text that is related to the main text but that does
            not necessarily match with the input string
    '''
    @attr.s
    class Substring:
        '''
        This class represents one match in the main text of a Suggestion.
        
        Attributes:
            text:
                A string
            is_match:
                Whether this string matched something in the input string
        '''
        text = attr.ib(converter=str)
        is_match = attr.ib(converter=bool)
        def __str__(self):
            if self.is_match:
                return "*" + self.text + "*"
            return self.text
    secondary_text = attr.ib(converter=str)
    main_text_parts = attr.ib(default=attr.Factory(list))
    @property
    def main_text(self):
        return "".join(str(part) for part in self.main_text_parts)
    def __str__(self):
        return self.main_text + "\n" + self.secondary_text
    def add_main_text_part(self, *args, **kwargs):
        self.main_text_parts.append(self.Substring(*args, **kwargs))
def autocomplete(partial_input, offset=None):
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
    return result
def test():
    '''
    Runs a simple test of the API.
    '''
    partial_input = input("Enter a partial name of a place: ")
    print("Getting autocomplete results...\n")
    for i, suggestion in enumerate(autocomplete(partial_input), start=1):
        print("{:>3d}.".format(i), suggestion.main_text)
        print("    ", suggestion.secondary_text, end="\n\n")

if __name__ == "__main__":
    test()

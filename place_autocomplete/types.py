#!/usr/bin/env python3
import attr

@attr.s
class Suggestion:
    '''
    This class represents one suggestion that autocomplete may return.
    
    Attributes:
        main_text_parts:
            A list of strings that, when joined, are a string that partially
            or fully matches the input string. Even indices are strings that
            matched something in the input string, and odd indices are strings
            that did not.
        secondary_text:
            Some additional text that is related to the main text but that does
            not necessarily match with the input string.
    '''
    secondary_text = attr.ib(converter=str)
    main_text_parts = attr.ib(default=attr.Factory(list))
    @property
    def main_text(self):
        return "".join(
            (str(part) if i & 1 else "*" + str(part) + "*")
            for i, part in enumerate(self.main_text_parts)
        )
    def __str__(self):
        return self.main_text + "\n" + self.secondary_text
    def add_main_text_part(self, text, is_match):
        if len(self.main_text_parts) & 1 == is_match:
            # Two scenarios:
            #  - The next index is odd, and the text did match.
            #  - The next index is even, and the text did not match.
            if self.main_text_parts:
                self.main_text_parts[-1] += text
            else:
                self.main_text_parts.append("")
                self.main_text_parts.append(text)
        else:
            # Two scenarios:
            #  - The next index is odd, and the text did not match.
            #  - The next index is even, and the text did match.
            self.main_text_parts.append(text)
@attr.s(frozen=True)
class SourceSection:
    '''
    This class represents a collection of suggestions all from the same source.
    Examples of sources include Google Maps and the user's favorite places.
    
    Attributes:
        heading: a string that the user will see above the suggestions
        suggestions: a tuple of Suggestion objects from the same source
    '''
    heading = attr.ib(converter=str)
    suggestions = attr.ib(converter=tuple)

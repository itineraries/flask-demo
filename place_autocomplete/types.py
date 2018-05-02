#!/usr/bin/env python3
import attr

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

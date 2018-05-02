#!/usr/bin/env python3
import attr, cgi, datetime, dateutil.parser, json, os.path, pytz, sys, \
    urllib.parse
from place_autocomplete import autocomplete as place_autocomplete
from flask import Flask, Response, abort, render_template, request, \
    send_from_directory
for sam_dir in (
    # ./scheduler-and-mapper/
    os.path.join(os.path.dirname(__file__), "scheduler-and-mapper"),
    # ../scheduler-and-mapper/
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "scheduler-and-mapper"
    )
):
    # Look for the scheduler-and-mapper directory.
    if os.path.isdir(sam_dir):
        # Use the first one that is found.
        sys.path.insert(1, sam_dir)
        break
import agency_nyu, agency_walking, agency_walking_static, \
    agency_walking_dynamic, departure_lister, itinerary_finder, stops
TIME_FORMAT = "%I:%M %p on %A"
TIMEZONE = pytz.timezone("America/New_York")

agencies = (
    agency_nyu.AgencyNYU,
    agency_walking_static.AgencyWalkingStatic,
    agency_walking_dynamic.AgencyWalkingDynamic,
)
agencies_to_vary = (
    agency_nyu.AgencyNYU,
)
app = Flask(__name__)
weekdays = tuple(
    # Sunday to Saturday
    datetime.date(2006, 1, d).strftime("%A") for d in range(1, 8)
)

def days_hours_minutes(td):
    '''
    Breaks a datetime.timedelta into the days as an integer, the hours as an
    integer, and the minutes as a float.
    '''
    return td.days, td.seconds // 3600, (td.seconds / 60) % 60
def days_hours_minutes_string(td):
    '''
    Converts a datetime.timedelta into a string that contains days, hours, and
    minutes.
    '''
    days, hours, minutes = days_hours_minutes(td)
    minutes = round(minutes)
    result = []
    if days:
        if days == 1:
            result.append("1 day")
        else:
            result.append("{} days".format(days))
    if hours:
        if hours == 1:
            result.append("1 hour")
        else:
            result.append("{} hours".format(hours))
    if minutes:
        if minutes == 1:
            result.append("1 minute")
        else:
            result.append("{} minutes".format(minutes))
    if result:
        if len(result) == 1:
            return result[0]
        if len(result) == 2:
            return result[0] + " and " + result[1]
        result[-1] = "and " + result[-1]
        return ", ".join(result)
    return "An instant"
def get_datetime_trip():
    # Combine the "day" and "when" GET parameters and parse them together.
    try:
        return dateutil.parser.parse(
            request.args.get("day", "") +
            " " +
            request.args["when"]
        )
    except (KeyError, ValueError):
        return datetime.datetime.now(TIMEZONE).replace(tzinfo=None)
def get_weekdays_checked(datetime_trip):
    # Make a list of the days of the week and select the one in datetime_trip.
    dow = (datetime_trip.weekday() + 1) % 7
    return \
        [(s, False) for s in weekdays[:dow]] + \
        [(weekdays[dow], True)] + \
        [(s, False) for s in weekdays[dow+1:]]
def mark_weighted_edge_up(edge, margin):
    '''
    Renders a weighted edge as one HTML <li> element.
    
    The margin is inserted at the beginning of every line.
    '''
    return (
        # Start the list item.
        margin + "<li>\n" + 
        # Add the human-readable instruction.
        margin + "\t" + cgi.escape(
            edge.get_human_readable_instruction()
        ) + "\n" +
        # Start the nested unordered list.
        margin + "\t<ul>\n" + 
        # Add the departure time.
        margin + "\t\t<li>\n" +
        margin + "\t\t\t<span class=\"itinerary-time\">" + cgi.escape(
            edge.datetime_depart.strftime(TIME_FORMAT)
        ) + ":</span>\n" +
        margin + "\t\t\tDepart from\n" +
        margin + "\t\t\t<span class=\"itinerary-node\">" + cgi.escape(
            edge.from_node
        ) + "</span>.\n" +
        margin + "\t\t</li>\n" +
        # Add the list of intermediate nodes.
        (
            (
                # Start the list item.
                margin + "\t\t<li>\n" +
                # Add the heading for the nested list.
                margin + "\t\t\tIntermediate stops:\n" +
                # Start the nested ordered list.
                margin + "\t\t\t<ol>\n" +
                # Add the list items.
                "".join(
                    margin + "\t\t\t\t<li>\n" +
                    margin + "\t\t\t\t\t<span class=\"itinerary-time\">" +
                    cgi.escape(
                        node_and_time.time.strftime(TIME_FORMAT)
                    ) + ":</span>\n" +
                    margin + "\t\t\t\t\t<span class=\"itinerary-node\">" +
                    cgi.escape(node_and_time.node) + "</span>\n" +
                    margin + "\t\t\t\t</li>\n"
                    for node_and_time in edge.intermediate_nodes
                ) +
                # End the nested ordered list.
                margin + "\t\t\t</ol>\n" +
                # End the list item.
                margin + "\t\t</li>\n"
            )
            if edge.intermediate_nodes else
            ""
        ) +
        # Add the arrival time.
        margin + "\t\t<li>\n" +
        margin + "\t\t\t<span class=\"itinerary-time\">" + cgi.escape(
            edge.datetime_arrive.strftime(TIME_FORMAT)
        ) + ":</span>\n" +
        margin + "\t\t\tArrive at\n" +
        margin + "\t\t\t<span class=\"itinerary-node\">" + cgi.escape(
            edge.to_node
        ) + "</span>.\n" +
        margin + "\t\t</li>\n" +
        # End the nested unordered list.
        margin + "\t</ul>\n" +
        # End the list item.
        margin + "</li>\n"
    )

@app.route("/")
def root():
    # Read the parameters.
    try:
        origin = request.args["orig"].strip()
        destination = request.args["dest"].strip()
    except KeyError:
        origin = ""
        destination = ""
    depart = request.args.get("depart", None) != "0"
    datetime_trip = get_datetime_trip()
    walking_max_mode = request.args.get("walking-max", None)
    try:
        walking_max_custom = float(request.args["walking-max-custom"])
    except (KeyError, ValueError):
        walking_max_custom = 5.0
    weekdays_checked = get_weekdays_checked(datetime_trip)
    # Set the walking time limit.
    if walking_max_mode == "custom":
        agency_walking.set_max_seconds(walking_max_custom * 60.0)
    elif walking_max_mode == "zero":
        agency_walking.set_max_seconds(0.0)
    else:
        walking_max_mode = "unlimited"
        agency_walking.set_max_seconds_unlimited()
    # Check whether we should get an itinerary.
    document_title = "NYU CTIP"
    if origin and destination:
        document_title = origin + " to " + destination + " - " + document_title
        if origin == destination:
            output_escaped = \
                "<p>The origin and destination are the same.</p>\n\t\t\t"
        else:
            # Get the itinerary.
            markup_itineraries = "".join(
                (
                    # Start the list item.
                    "\t\t\t\t\t<li>\n"
                    # Add the travel time.
                    "\t\t\t\t\t\t" + cgi.escape(
                        days_hours_minutes_string(
                            itinerary[-1].datetime_arrive -
                            itinerary[0].datetime_depart
                        )
                    ) + "\n"
                    # Add the nested ordered list.
                    "\t\t\t\t\t\t<ol>\n" + "".join(
                        mark_weighted_edge_up(direction, "\t\t\t\t\t\t\t")
                        for direction in itinerary
                    ) +
                    "\t\t\t\t\t\t</ol>\n" +
                    # End the list item.
                    "\t\t\t\t\t</li>\n"
                )
                for itinerary in itinerary_finder.find_itineraries(
                    agencies_to_vary,
                    agencies,
                    origin,
                    destination,
                    datetime_trip,
                    depart,
                    max_count=3
                )
            )
            if markup_itineraries:
                output_escaped = "\n" \
                    "\t\t\t\t<p>Itineraries:</p>\n" \
                    "\t\t\t\t<ol>\n" + \
                    markup_itineraries + \
                    "\t\t\t\t</ol>\n" \
                    "\t\t\t"
            else:
                output_escaped = \
                    "\n\t\t\t\t<p>This itinerary is not possible either " \
                    "because there is no continuous path from the origin to " \
                    "the or because no agency recognized the origin or " \
                    "destination.</p>\n\t\t\t"
    else:
        output_escaped = ""
    # Reflect the parameters back to the user and send the itinerary.
    return render_template(
        "index.html",
        document_title=document_title,
        origin=origin,
        destination=destination,
        stops=stops.names_sorted,
        depart=depart,
        weekdays_checked=weekdays_checked,
        when=datetime_trip.strftime("%H:%M"),
        walking_max_mode=walking_max_mode,
        walking_max_custom=walking_max_custom,
        output_escaped=output_escaped
    )

@app.route("/departures")
def departures():
    # Read the parameters.
    origin = request.args.get("orig", "").strip()
    datetime_trip = get_datetime_trip()
    weekdays_checked = get_weekdays_checked(datetime_trip)
    # Check whether we should list departures.
    document_title = "Departures - NYU CTIP"
    if origin:
        document_title = origin + " - " + document_title
        # List the departures.
        markup_departures = "".join(
            mark_weighted_edge_up(direction, "\t\t\t\t\t")
            for direction in departure_lister.departure_list(
                agencies,
                origin,
                datetime_trip,
                20
            )
        )
        # Put the list to the output to the user.
        if markup_departures:
            output_escaped = \
                "\n\t\t\t\t<p>Departures from " + \
                "<span class=\"itinerary-node\">" + cgi.escape(origin) + \
                "</span>:</p>\n\t\t\t\t<ul>\n" + markup_departures + \
                "\t\t\t\t</ul>\n\t\t\t"
        else:
            output_escaped = \
                "\n\t\t\t\t<p>There are no departures from " \
                "<span class=\"itinerary-node\">" + cgi.escape(origin) + \
                "</span> after the specified time.</p>\n\t\t\t"
    else:
        output_escaped = ""
    # Reflect the parameters back to the user and list the departures.
    return render_template(
        "departures.html",
        document_title=document_title,
        origin=origin,
        stops=stops.names_sorted,
        weekdays_checked=weekdays_checked,
        when=datetime_trip.strftime("%H:%M"),
        output_escaped=output_escaped
    )

@app.route("/async/place/autocomplete/<partial_input>/<int:offset>")
def async_place_autocomplete_handler(partial_input, offset):
    '''
    Given the string that the user has typed in so far and the position of the
    cursor, this route returns a JSON of autocomplete suggestions.
    
    Arguments:
        partial_input: the string that the user has typed in so far
        offset: the position of the user's cursor
    '''
    if request.host != urllib.parse.urlparse(request.referrer).netloc:
        abort(403)
    result = {"status": "OK"}
    try:
        # Get autocomplete suggestions from the sources that are defined in
        # place_autocomplete/__init__.py. Pass them all to the client as
        # dictionaries. See place_autocomplete/types.py for an explanation of
        # the attributes.
        result["sections"] = [
            attr.asdict(source_section)
            for source_section in place_autocomplete(partial_input, offset)
        ]
    except BaseException as e:
        result["status"] = "Error"
    return Response(json.dumps(result), mimetype="application/json")

@app.route("/favicon.ico")
def favicon():
    # Taken straight from the Flask docs:
    # http://flask.pocoo.org/docs/0.12/patterns/favicon/
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon"
    )

if __name__ == "__main__":
    app.run()

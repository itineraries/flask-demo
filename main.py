#!/usr/bin/env python3
import cgi, datetime, dateutil.parser, os.path, sys
from flask import Flask, render_template, request, send_from_directory, url_for
sys.path.insert(
    1,
    # ../scheduler-and-mapper/
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "scheduler-and-mapper"
    )
)
sys.path.insert(
    1,
    # ./scheduler-and-mapper/
    os.path.join(os.path.dirname(__file__), "scheduler-and-mapper")
)
import agency_nyu, agency_walking, agency_walking_static, \
    agency_walking_dynamic, itinerary_finder, stops

agencies = (
    agency_nyu.AgencyNYU,
    agency_walking_static.AgencyWalkingStatic,
    agency_walking_dynamic.AgencyWalkingDynamic,
)
app = Flask(__name__)
weekdays = tuple(
    # Sunday to Saturday
    datetime.date(2006, 1, d).strftime("%A") for d in range(1, 8)
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
    depart = bool(request.args.get("depart", True))
    try:
        datetime_trip = dateutil.parser.parse(
            request.args.get("day", "") +
            " " +
            request.args["when"]
        )
    except (KeyError, ValueError):
        datetime_trip = datetime.datetime.now()
    walking_max_mode = request.args.get("walking-max", None)
    try:
        walking_max_custom = float(request.args["walking-max-custom"])
    except (KeyError, ValueError):
        walking_max_custom = 5.0
    # Make a list of the days of the week and select the one in datetime_trip.
    dow = (datetime_trip.weekday() + 1) % 7
    weekdays_checked = \
        [(s, False) for s in weekdays[:dow]] + \
        [(weekdays[dow], True)] + \
        [(s, False) for s in weekdays[dow+1:]]
    # Set the walking time limit.
    if walking_max_mode == "custom":
        agency_walking.set_max_seconds(walking_max_custom * 60.0)
    elif walking_max_mode == "zero":
        agency_walking.set_max_seconds(0.0)
    else:
        walking_max_mode = "unlimited"
        agency_walking.set_max_seconds_unlimited()
    # Check whether we should get an itinerary.
    if origin and destination:
        # Get the itinerary.
        try:
            itinerary = itinerary_finder.find_itinerary(
                agencies,
                origin,
                destination,
                datetime_trip,
                depart
            )
        except itinerary_finder.ItineraryNotPossible:
            output_escaped = \
                "<p>This itinerary is not possible either because there is " \
                "no continuous path from the origin to the destination or " \
                "because no agency recognized the origin or destination.</p>"
        else:
            output_escaped = \
                "<p>Itinerary:</p><ol>" + "".join(
                    "<li>" + cgi.escape(str(direction)) + "</li>"
                    for direction in itinerary
                ) + "</ol>"
    else:
        output_escaped = ""
    # Reflect the parameters back to the user and send the itinerary.
    return render_template(
        "index.html",
        origin=origin,
        destination=destination,
        stops=stops.name_to_point.keys(),
        depart=depart,
        weekdays_checked=weekdays_checked,
        when=datetime_trip.strftime("%H:%M"),
        walking_max_mode=walking_max_mode,
        walking_max_custom=walking_max_custom,
        output_escaped=output_escaped
    )

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

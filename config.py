#!/usr/bin/env python3
import keyring, os

class Secrets:
    google_maps_api_key = \
        os.environ.get("GMAPS_CLIENT_SIDE_KEY") or \
        keyring.get_password("google_maps", "client_side") or \
        keyring.get_password("google_maps", "default")

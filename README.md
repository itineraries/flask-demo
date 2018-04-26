# Flask Demo
This repository contains a simple Python Flask app that utilizes the 
[scheduler and mapper](https://github.com/itineraries/scheduler-and-mapper)
to serve itineraries over a web interface.

## Note: Production Branch
The `master` branch should never contain files from the `scheduler-and-mapper`
repository. The `azurewebsites-ctip` branch is used to deploy this app to
[ctip.azurewebsites.net](https://ctip.azurewebsites.net/). Do not commit
changes to files in this repository directly to it unless the changes are
specific to the deployment. To update the deployment, just update
`azurewebsites-ctip` from `master` and run
[prepare-scheduler-and-mapper.py](prepare-scheduler-and-mapper.py), which
copies the appropriate files from the `scheduler-and-mapper` repository.
It assumes that you have `flask-demo` and `scheduler-and-mapper` cloned to the
same location.

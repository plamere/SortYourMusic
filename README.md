
# Sort Your Music

A web app that lets you sort your music.

Online at

[http://static.echonest.com/SortYourMusic](http://static.echonest.com/SortYourMusic)


## Local Development

The following section describes how to develop Sort Your Music locally. It requires an Echo Nest and Spotify API key.

Install leveldb

    $ brew install leveldb

Install requirements for API server (optionally setup virtualenv first):

    $ pip install -r server/requirements.txt

Configure application keys for Echo Nest and Spotify, either export manually:

    export SPOTIPY_CLIENT_ID=...
    export SPOTIPY_CLIENT_SECRET=...
    export SPOTIPY_REDIRECT_URI=http://...
    export ECHO_NEST_API_KEY=...

or copy projenv.example, modify it, then source it:

    $ . projenv

Edit web/config.js to point to localhost and update Spotify client id.

Run server

    $ $(cd server ; python server2.py)

Optionally warm up server cache with top 1000 artists (this may take some time):

    $ $(cd server ; python warm.py)

Connect to [http://localhost:8235/SortYourMusic/](http://static.echonest.com/SortYourMusic)

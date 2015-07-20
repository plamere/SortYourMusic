import cPickle as pickle
import time

import flask
import plyvel
import pyen
from flask.ext.cors import CORS
from flask import Flask, jsonify, Blueprint, request

APP_HOST='0.0.0.0'
APP_PORT=8235
DEFAULT_PREFIX='/SortYourMusic'
STATIC_PATH='./static'
PLYVEL_PATH='./songdata'
CACHE_ERR_EXPIRE=600.0 # time until retry erroring pyen requests

app = Flask(__name__)

CORS(app, resources=r'/*', allow_headers='Content-Type')

@app.errorhandler(404)
def page_not_found(e):
    return jsonify({'status': 'error', 'reason': str(e)}), 404


# Song Information
# ========================================================================

@app.before_request
def open_pyen():
    flask.g.pyen = pyen.Pyen()

def normalise_tid(tid):
    return tid if tid.startswith('spotify:track') else "spotify:track:%s"%(tid)

def get_song_info(tid):
    tid = normalise_tid(tid)

    try:
        response = flask.g.pyen.get('song/profile', 
            track_id = tid,
            bucket=['audio_summary', 'song_hotttnesss', 'artist_hotttnesss'])
        
        if response['status']['code'] != 0:
            raise pyen.PyenException(response['message'])

        song = response['songs'][0]
        rsong = {
            'tid' : tid,
            'timestamp' : time.time(),
            'title' : song['title'],
            'artist' : song['artist_name'],
            'song_hotttnesss': song['song_hotttnesss'],
            'artist_hotttnesss': song['artist_hotttnesss'],
            'energy': song['audio_summary']['energy'],
            'liveness': song['audio_summary']['liveness'],
            'tempo': song['audio_summary']['tempo'],
            'speechiness': song['audio_summary']['speechiness'],
            'acousticness': song['audio_summary']['acousticness'],
            'instrumentalness': song['audio_summary']['instrumentalness'],
            'mode': song['audio_summary']['mode'],
            'time_signature': song['audio_summary']['time_signature'],
            'duration': song['audio_summary']['duration'],
            'valence': song['audio_summary']['valence'],
            'danceability': song['audio_summary']['danceability'],
            'loudness': song['audio_summary']['loudness'],
        }
    except pyen.PyenException, e:
        rsong = {
            'tid' : tid,
            'timestamp' : time.time(),
            'err' : str(e),
        }

    return rsong


# Caching
# ========================================================================

app.cache_stat = {
    'rid': 0,
    'en_rid': 0,
    'en_err': 0,
    'cache_hits': 0,  # originally set to 1, not sure why.
    'sum_time': 0,
    'max_time': 0,
}

# Warning: app.db is intended to only be set once. Multi-process WSGI hosting may fail.
app.db = None

def get_db():
    # with debug, flask will reload, so don't load db until first request.
    if not app.db:
        app.db = plyvel.DB(PLYVEL_PATH, create_if_missing=True)
    return app.db

@app.before_request
def open_db():
    flask.g.db = get_db()

def cache_entry_valid(entry):
    if 'err' not in entry:
        return True
    ts = entry.get('timestamp', 0)
    age = time.time() - ts
    return age < CACHE_ERR_EXPIRE

def cached_get_song_info(tid):
    tid = normalise_tid(tid)
    tid_utf8 = tid.encode('UTF-8')

    cached_s = flask.g.db.get(tid_utf8)
    if cached_s:
        app.cache_stat['cache_hits'] += 1
        result = pickle.loads(cached_s)
        if cache_entry_valid(result):
            return result

    result = get_song_info(tid)
    if 'err' in result:
        app.cache_stat['en_err'] += 1
    else:
        app.cache_stat['en_rid'] += 1
    flask.g.db.put (tid_utf8, pickle.dumps(result, pickle.HIGHEST_PROTOCOL))
    return result

def get_cache_info():
    response = {
        'requests': app.cache_stat['rid'],
        'en_requests': app.cache_stat['en_rid'],
        'en_errs': app.cache_stat['en_err'],
        'cache_hits': app.cache_stat['cache_hits'],
        'cache_size': sum((1 for _ in flask.g.db)),
        'max_processing_time': app.cache_stat['max_time']
    }

    if app.cache_stat['rid'] > 0:
        response['avg_processing_time'] = app.cache_stat['sum_time'] / app.cache_stat['rid']

    return response

def get_multi_song_info(tids):
    app.cache_stat['rid'] += 1

    start = time.time()
    slist = [cached_get_song_info(tid) for tid in tids]
    processing_time = time.time() - start

    app.cache_stat['sum_time'] += processing_time
    app.cache_stat['max_time'] = max(processing_time, app.cache_stat['max_time'])

    return slist, processing_time


# Sort Your Music
# ========================================================================

# use a blueprint so we can use the url_prefix /SortYourMusic without prepending all routes
sort_your_music = Blueprint('sort_your_music', __name__, static_folder=STATIC_PATH, static_url_path='')

@sort_your_music.route('/')
def index():
    return sort_your_music.send_static_file('index.html')

@sort_your_music.route('/info')
def info():
    return jsonify(get_cache_info())

@sort_your_music.route('/songs')
def songs():
    tids_s = request.args.get('ids')
    tids = tids_s.split(',') if tids_s else []
    songs, processing_time = get_multi_song_info(tids)
    return jsonify({
        'songs' : songs,
        'time': processing_time
    })

app.register_blueprint(sort_your_music, url_prefix=DEFAULT_PREFIX)


# Main
# ========================================================================

if __name__ == '__main__':
    app.debug = True
    app.run(host=APP_HOST, port=APP_PORT, threaded=True)

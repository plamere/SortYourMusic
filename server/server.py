import os 
import sys
import cherrypy
from cherrypy import tools
import ConfigParser
import json
import webtools
import time
import atexit
import pyen
import atexit
import cPickle as pickle

class SongServer(object):
    def __init__(self):
        self.cache_path = 'songdata.pkl'
        self.en = pyen.Pyen()
        self.load_cache()
        print 'loaded', len(self.cache), 'items from the cache'

        atexit.register(self.save_cache)
        self.original_term_handler = cherrypy.engine.signal_handler.handlers["SIGTERM"]
        cherrypy.engine.signal_handler.set_handler("SIGTERM", self.on_term)

    def on_term():
        self.save_cache()
        self.original_term_handler()

    @cherrypy.expose
    def index(self):
        raise cherrypy.HTTPRedirect("index.html")

    @cherrypy.expose
    @tools.json_out()
    # @cherrypy.tools.caching(delay=3600 * 24)

    def songs(self, ids):
        slist = []
        self.cache['rid'] += 1
        start = time.time()
        for tid in ids.split(','):
            slist.append(self.get_song_info(tid))

        processing_time = time.time() - start
        self.cache['sum_time'] += processing_time
        if processing_time > self.cache['max_time']:
            self.cache['max_time'] = processing_time

        response = {
            'songs' : slist,
            'time': processing_time
        }

        return response

    @cherrypy.expose
    @tools.json_out()
    # @cherrypy.tools.caching(delay=3600 * 24)

    def info(self):
        response = {
            'requests': self.cache['rid'],
            'en_requests': self.cache['en_rid'],
            'en_errs': self.cache['en_err'],
            'cache_hits': self.cache['cache_hits'],
            'cache_size': len(self.cache),
            'max_processing_time': self.cache['max_time']
        }

        if self.cache['rid'] > 0:
            response['avg_processing_time'] = self.cache['sum_time'] / self.cache['rid']

        return response

    def get_song_info(self, tid):
        if tid.find('spotify:track') != 0:
            tid = 'spotify:track:' + tid
        if tid in self.cache:
            rsong =  self.cache[tid]
            self.cache['cache_hits'] += 1
        else:

            try:
                self.cache['en_rid'] += 1
                response = self.en.get('song/profile', 
                    track_id = tid,
                    bucket=['audio_summary', 
                        'song_hotttnesss', 'artist_hotttnesss'])
                
                if response['status']['code'] == 0:
                    song = response['songs'][0]
                    rsong = {
                        'tid' : tid,
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
            except pyen.PyenException:
                self.cache['en_err'] += 1
                rsong = {
                    'tid' : tid,
                }

            self.cache[tid] = rsong
            self.cache_needs_save = True
        return rsong

    def save_cache(self):
        if self.cache_needs_save:
            f = open(self.cache_path, 'w')
            print 'saved', len(self.cache), 'items to the cache'
            pickle.dump(self.cache, f, pickle.HIGHEST_PROTOCOL);
            f.close()
            self.cache_needs_save = False

    def load_cache(self):
        obj = {}
        if os.path.exists(self.cache_path):
            f = open(self.cache_path, 'r')
            obj = pickle.load(f)
            f.close()
        self.cache = obj
        if 'rid' not in self.cache:
            print 'reset rid'
            self.cache['rid'] = 0
            self.cache['en_rid'] = 0
            self.cache['en_err'] = 0
            self.cache['cache_hits'] = 1
            self.cache['sum_time'] = 0
            self.cache['max_time'] = 0
        self.cache_needs_save = False

    
def CORS():
    cherrypy.response.headers["Access-Control-Allow-Origin"] = "*" 
    cherrypy.response.headers['Content-Type']= 'application/json'

def error_page_404(status, message, traceback, version):
    cherrypy.response.headers['Content-Type']= 'application/json'
    cherrypy.response.headers["Access-Control-Allow-Origin"] = "*" 
    results = { 'status' : 'error', 'reason': message}
    return json.dumps(results)

if __name__ == '__main__':
    cherrypy.tools.CORS = cherrypy.Tool('before_handler', CORS)

    config = {
        'global' : {
            'server.socket_host' : '0.0.0.0',
            'server.socket_port' : 8235,
            'server.thread_pool' : 10,
        },
        '/' : {
            'tools.CORS.on' : True,
            'error_page.404': error_page_404,
        }
    }

    static_doc_config = webtools.get_export_map_for_directory("static")
    config.update(static_doc_config)
    cherrypy.quickstart(SongServer(), '/SortYourMusic', config=config)


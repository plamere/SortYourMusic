
import pyen
import spotipy
import requests

en = pyen.Pyen()
sp = spotipy.Spotify()
missing_count = 0
all_count = 0

all_tracks = {}

def get_song_info(ids):
    global all_count, missing_count
    params = { 'ids' : ','.join(ids) }
    r = requests.get('http://labs2.echonest.com/SortYourMusic/songs', params=params)
    results = r.json()
    for song in results['songs']:
        all_count += 1
        if 'title' in song:
            print '   ', song['title'], song['artist']
        else:
            if song['tid'] in all_tracks:
                t = all_tracks[song['tid']]
                print '  MISSING', t['name'], t['artists'][0]['name']
            else:
                print '  MISSING weired', song['tid']
            missing_count += 1
    

results = en.get('artist/top_hottt', results=1000, bucket='id:spotify')
for i, artist in enumerate(results['artists']):
    if 'foreign_ids' in artist and len(artist['foreign_ids']) > 0:
        spid = artist['foreign_ids'][0]['foreign_id']
        print i, all_count, missing_count, artist['name'], spid
        ids = []
        tracks = sp.artist_top_tracks(spid)
        for track in tracks['tracks']:
            all_tracks[track['uri']] = track
            ids.append(track['uri'])
        get_song_info(ids)


print all_count, missing_count

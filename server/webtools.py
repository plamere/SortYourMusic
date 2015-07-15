import os
import os.path
import hashlib
from httplib import HTTP
from urlparse import urlparse
import urllib
import urllib2
import simplejson as json

def  get_export_map_for_directory(path, prefix = "/"):
    map = {}
    return build_export_map_for_directory(map, path, prefix)

def  build_export_map_for_directory(map, path, prefix = "/"):
    for file in os.listdir(path):
        exported_name = prefix + file
        exported_path = os.path.abspath(os.path.join(path, file))
        map[exported_name] = {
            'tools.staticfile.on' : True,
            'tools.expires.on' : True,
            'tools.expires.secs' : 1000000,
            'tools.expires.force' : True,
            'tools.staticfile.filename' : exported_path,
        }
        if os.path.isdir(exported_path):
            build_export_map_for_directory(map, exported_path, exported_name + '/')
    return map

def checkURL(url):
     try:
         user_agent = 'Mozilla/4.0 (compatible; MSIE 5.5; Windows NT)'
         headers = { 'User-Agent' : user_agent }
         values = {}
         data = urllib.urlencode(values)
         req = urllib2.Request(url, data, headers)
         response = urllib2.urlopen(req)
         print 'found', url
         return True
     except urllib2.URLError, e:
        print 'not found', url
        print e
        return False


def get_param_as_list(param):
    if not param:
        param = []
    if not isinstance(param, list):
        param = [param]
    return param

def to_json(dict, callback=None):
    results =  json.dumps(dict, sort_keys=True, indent = 4)
    if callback:
        results = callback + "(" + results + ")"
    return results

if __name__ == '__main__':
    import pprint

    print str(get_export_map_for_directory('.'))
    print checkURL('http://slashdot.org')
    print checkURL('http://google.com')
    print checkURL('http://slashdot.org/notadirectory')

    map = {}
    build_export_map_for_directory(map, '.')
    pprint.pprint(map)


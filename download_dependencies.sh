mkdir -p vendor/ && cd vendor/

#jquery
mkdir -p jquery/ && cd jquery/
wget https://code.jquery.com/jquery-3.6.0.min.js -O jquery.min.js
cd ..
#ryzom_map
mkdir -p ryzom_map/ && cd ryzom_map/
wget https://api.bmsite.net/maps/v1/map.min.js
wget https://api.bmsite.net/maps/v1/map-areas.min.js
cd ..
#leaflet
wget http://cdn.leafletjs.com/leaflet/v1.7.1/leaflet.zip
unzip leaflet.zip -d leaflet/ && rm leaflet.zip
#jquery.i18n (only src/ files are interesting to us)
wget https://github.com/wikimedia/jquery.i18n/archive/refs/tags/v1.0.7.zip -O jquery.i18n.zip
unzip jquery.i18n.zip && rm jquery.i18n.zip
mkdir -p jquery.i18n/
cp jquery.i18n-1.0.7/src/*.js jquery.i18n/
rm -Rf jquery.i18n-1.0.7/
#js-cookie
mkdir -p js-cookie/ && cd js-cookie/
wget https://github.com/js-cookie/js-cookie/releases/download/v2.2.1/js.cookie-2.2.1.min.js -O js.cookie.min.js

# Dependencies

This project requires the following lib :
* JQuery - any 3.X version should work
* [ryzom-map.js](https://api.bmsite.net/#maps-js) - any 1.3+ version should work
* Leaflet - any 1.X version should work
* JQuery-i18n - any 1.X version should work
* JS-Cookies - any 2.X version should work


This project also requires an internet connection - `ryzom-map.js` use [Ballistic Mystix hosted version](https://api.bmsite.net/#maps-tiles) for rendering. You can obviously host your own, and change `window.Ryzom.apiDomain` (and optionally `window.Ryzom.tilePath`) accordingly.

# Installation

I'm using local JS files, so you'll need to download them and put then in `vendor/` subfolder. For convenience, a script named `download_dependencies.sh` will do just that for you (it requires `unzip`).

# Running the editor

For a test ride, you can open directly `index.html` in your favorite browser. Unfortunately, translations won't work (because requests to json files aren't allowed on `file:///` protocol) this way.

Instead, you can test it by copying the files on any web server, or simply running python simple webserver :

```
python3 -m http.server
```
and then visit [localhost:8000](http://localhost:8000). 

# License
	Copyright (c) 2014 Guillaume Dupuy <glorf@glorf.fr>

	Ryzom Landmark Editor is free software; you can redistribute it and/or modify
	it under the terms of the GNU Lesser General Public License as published by
	the Free Software Foundation; either version 3 of the License, or
	(at your option) any later version.

[LGPLv3](http://opensource.org/licenses/LGPL-3.0)

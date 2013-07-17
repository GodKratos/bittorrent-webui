(function (){
	const BitTorrentWebUI = alexisbrunet.com.BitTorrentWebUI;
	const Prefs = BitTorrentWebUI.Prefs;
	const Util = BitTorrentWebUI.Util;

	var _filenames = [];
	var _streamListeners = [];

BitTorrentWebUI.chromeLoad = function() {
	window.removeEventListener("load", BitTorrentWebUI.chromeLoad, true);

	Prefs.convertOldPreferences();

	Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader)
			.registerContentListener( BitTorrentWebUI );

	BitTorrentWebUI.httpResponseObserver = Util.createObserver();
	BitTorrentWebUI.httpResponseObserver.observe = function( aSubject, aTopic, aData ) {
		if( aTopic == 'http-on-examine-response' ) {
			if( Prefs.handleTorrents() == false ) return;

			try {
				var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
				if(!httpChannel) return;

				var uriText = httpChannel.URI.asciiSpec;
				var contentType = httpChannel.getResponseHeader("Content-Type");

				if( Util.isBitTorrentContentType(contentType) ) {
					/* make sure content disposition is inline
					   (prevent the download box from popping up) */
					Util.debug("Loading URL by Type: " + uriText + "\n\tContent-Type: " + contentType);
					var contentDispHdr = httpChannel.getResponseHeader("Content-Disposition");
					var newContentDispHdr =
						contentDispHdr.replace(	/attachment/i, "inline" );

					httpChannel.setResponseHeader("Content-Disposition", newContentDispHdr, false);
				}
				else if( Util.isBitTorrentFileExt( uriText ) ) {
					if( Util.isWebPageContentType(contentType) ) return;

					/* The Content-Type header contained NO mention of "torrent",
					   BUT the uri ends with ".torrent" so lets grab it anyway! */
					Util.debug("Loading URL by EXT: " + uriText + "\n\tContent-Type: " + contentType);
					aSubject.contentType = BT_MIME_TYPE;

					var filename = uriText.substr( uriText.lastIndexOf( "/" ) + 1 );
					BitTorrentWebUI.addFile( httpChannel.URI, filename );
				}
			} catch(e) {
				// Util.debug("Caugth exception: " + e);
			}
		} else if(aTopic == 'http-on-modify-request') {
			var req = Components.interfaces.nsIRequest;
			var uriText = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel).URI.asciiSpec;

			if( Util.isBitTorrentFileExt( uriText ) ) {
				/* Make sure to bypass the cache when trying to download a .torrent file */
				aSubject.loadFlags = req.LOAD_NORMAL | req.LOAD_BYPASS_CACHE;
			}
		} else if(aTopic == 'magnet-on-open-uri') {
			if( Prefs.handleTorrents() == false ) return;

			var aURI = aSubject.QueryInterface(Components.interfaces.nsIURI);
			if(!aURI) return;

			var uriText = aURI.spec;
			Util.debug("Loading Magnet URL: " + uriText);
			if ( ! BitTorrentWebUI.addTorrentByURL( uriText ) ) {
				var alertsService = Components.classes["@mozilla.org/alerts-service;1"]
							.getService(Components.interfaces.nsIAlertsService);

				var mStrBundle = Util.getStrBundle();

				alertsService.showAlertNotification(
					"chrome://global/skin/icons/error-16.png",
					mStrBundle.GetStringFromName("notifyError"),
					mStrBundle.GetStringFromName("noMagnet"),
					false,
					"",
					null
				);
			}
		}
	};

	var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
	observerService.addObserver( BitTorrentWebUI.httpResponseObserver, "http-on-examine-response", false);
	observerService.addObserver( BitTorrentWebUI.httpResponseObserver, "http-on-modify-request", false);
	observerService.addObserver( BitTorrentWebUI.httpResponseObserver, "magnet-on-open-uri", false);

	if( Prefs.isFirstRun() ) {
		BitTorrentWebUI.onPageLoad = function(aEvent) {
			document.getElementById("appcontent").removeEventListener("load", BitTorrentWebUI.onPageLoad, true);
			Prefs.showOptionsDialog();
		};

		document.getElementById("appcontent").addEventListener("load", BitTorrentWebUI.onPageLoad, true);
	}
}

BitTorrentWebUI.chromeUnload = function() {
	window.removeEventListener("unload", BitTorrentWebUI.chromeUnload, true);

	var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
	observerService.removeObserver( BitTorrentWebUI.httpResponseObserver, "http-on-modify-request" );
	observerService.removeObserver( BitTorrentWebUI.httpResponseObserver, "http-on-examine-response" );

	Components.classes["@mozilla.org/uriloader;1"]
		.getService(Components.interfaces.nsIURILoader)
		.unRegisterContentListener( BitTorrentWebUI );

	BitTorrentWebUI.httpResponseObserver = null;
	_filenames = null;
	_streamListeners = null;
}

BitTorrentWebUI.addTorrentByURL = function( aURL ) {

	var dispatcher = Prefs.DispatcherFactory.create();

	if( dispatcher && dispatcher.setURL /* supports add by URL */ ) {
		Util.debug( "Adding URL: " + aURL );
		dispatcher.setURL( aURL );
		dispatcher.sendRequest();
	} else {
		Util.debug( "Add by URL not supported" );
		return false;
	}
	return true;
}

BitTorrentWebUI.addFile = function( aURI, aFilename ) {
	Util.debug( "Adding file: "+aFilename );
	_filenames[aURI] = decodeURIComponent(aFilename);
}

BitTorrentWebUI.addStreamListener = function( aURI ) {
	_streamListeners[aURI] =
		Util.createStreamListener( BitTorrentWebUI.removeStreamListener );
	return _streamListeners[aURI];
}

BitTorrentWebUI.removeStreamListener = function( aURI, aStreamData ) {
	var filename = _filenames[aURI];
	delete _filenames[aURI];
	delete _streamListeners[aURI];

	Util.debug( "Removing Stream Listener: "+filename );

	if( !aStreamData ) return;

	Util.debug( "Dispatching: "+filename );
	var dispatcher = Prefs.DispatcherFactory.create();

	Util.debug( "Dispatcher: "+dispatcher.getName() );

	dispatcher.setFilename( filename );
	dispatcher.setData( aStreamData );

//	try {
		dispatcher.sendRequest();
//	} catch(e) {
//		Util.debug( "BitTorrentWebUI.removeStreamListener exception: " + e );
//	}
}

BitTorrentWebUI.QueryInterface = function(aIID) {
	if( aIID.equals(Components.interfaces.nsISupports) ||
		aIID.equals(Components.interfaces.nsIURIContentListener) ||
		aIID.equals(Components.interfaces.nsISupportsWeakReference) )
			return this;
	throw Components.results.NS_NOINTERFACE;
}

BitTorrentWebUI.canHandleContent = function( contentType, isContentPreferred, desiredContentType ) {
	return Util.isBitTorrentContentType( contentType );
}

BitTorrentWebUI.isPreferred = function( contentType, desiredContentType ) {
	return BitTorrentWebUI.canHandleContent( contentType );
}

BitTorrentWebUI.onStartURIOpen = function( URI ) {
	return false;
}

BitTorrentWebUI.doContent = function( contentType, isContentPreferred, request, contentHandler ) {
	var httpChannel = request.QueryInterface(Components.interfaces.nsIHttpChannel);
	try {
		var contentDisposition = httpChannel.getResponseHeader("Content-Disposition");

		var matches = (new RegExp("filename\S*=\x22?([^\x22]+)\x22?;?$", "i")).exec( contentDisposition );
		if( matches && matches.length > 1 ) {
			BitTorrentWebUI.addFile( httpChannel.URI, matches[1] );
		}
	} catch(e) { }
	contentHandler.value = BitTorrentWebUI.addStreamListener( httpChannel.URI );
	return false;
}

BitTorrentWebUI.init = function() {
	Util.debug( "Starting BTWebUI" );
	Components.utils.import("resource://bittorrent_webui/magnetHandler.js");
	window.addEventListener( "load", BitTorrentWebUI.chromeLoad, false );
	window.addEventListener( "unload", BitTorrentWebUI.chromeUnload, false );
}

BitTorrentWebUI.init();
})();
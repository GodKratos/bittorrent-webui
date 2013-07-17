(function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;

	const STRING_BUNDLE = "chrome://bittorrent_webui/locale/btwebuiOverlay.properties";
	const BT_MIME_TYPE = "application/x-bittorrent";
	const MULTIPART_BOUNDARY = "SyR0kXCfhz9E2z2NfY92";

	alexisbrunet.com.BitTorrentWebUI.Util = {};
	var Prefs = alexisbrunet.com.BitTorrentWebUI.Prefs;
	var Util = alexisbrunet.com.BitTorrentWebUI.Util;

	Util.getStrBundle = function( aSrc ) {
		aSrc = (aSrc) ? aSrc : STRING_BUNDLE;
		var localeService = Cc["@mozilla.org/intl/nslocaleservice;1"]
			.getService(Ci.nsILocaleService);
		var appLocale = localeService.getApplicationLocale( );
		var stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"]
			.getService(Ci.nsIStringBundleService);

		return stringBundleService.createBundle(aSrc, appLocale);
	}

	Util.openTab = function( aHref ) {
		var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
			.getService(Ci.nsIWindowMediator);
		var browser = windowMediator.getMostRecentWindow("navigator:browser").getBrowser();
		browser.selectedTab = browser.addTab(aHref);
		browser.focus();
	}

	Util.isBitTorrentContentType = function( aContentType ) {
		if( Prefs.handleTorrents() == false ) {
			return false;
		}
		return (aContentType.indexOf("torrent") != -1 || aContentType.indexOf("magnet") != -1);
	}

	Util.isWebPageContentType = function( pContentType ) {
		var regExp = /[ht|x]ml/i;
		return regExp.test( pContentType );
	}

	/**
	 *	Create Observer function taken from a Mozilla tutorial at
	 *	http://developer.mozilla.org/en/docs/Creating_Sandboxed_HTTP_Connections
	 **/
	Util.createObserver = function() {
		return ({
			observe : function(subject, topic, data) {},
			QueryInterface : function(iid) {
				if (!iid.equals(Ci.nsIObserver) &&
					!iid.equals(Ci.nsISupportsWeakReference) &&
					!iid.equals(Ci.nsISupports)) {
					throw Components.results.NS_ERROR_NO_INTERFACE;
				}
				return this;
			}
		});
	}

	Util.openWebUI = function() {
		var dispatcher = Prefs.DispatcherFactory.create();
		this.openTab( dispatcher.getWebUIAddress() );
	}

	Util.getServerAddress = function() {
		return Prefs.getServerScheme() +
			Prefs.getServerAddress() +
			Prefs.getServerPort() + "/";
	}

	Util.debug = function( aString ) {
		if( Prefs.debugOutputToConsole() ) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
				.getService(Components.interfaces.nsIConsoleService);
			consoleService.logStringMessage("btwebui: " + aString);
		}
	}

	Util.isBitTorrentFileExt = function( aString ) {
		var regExp = /\.torrent$|^magnet:/i;
		return regExp.test(aString);
	}

	Util.getMultipartBoundary = function () {
		return MULTIPART_BOUNDARY;
	}

	/**
	 *	Base64 encode
	 *	Stolen from a file called webtoolkit.base64.js found at
	 *  	http://www.webtoolkit.info/
	 **/
	Util.encode64 = function( input ) {
		var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
			output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
		}
		return output;
	}

	/**
	 * 	StreamListener taken from a Mozilla tutorial at
	 *	http://developer.mozilla.org/en/docs/Creating_Sandboxed_HTTP_Connections
	 **/
	Util.createStreamListener = function(pCallbackFunc) {
		return ({
			callbackFunc: pCallbackFunc,
			data: "",

			onStartRequest: function (aRequest, aContext) {
				this.data = "";
			},

			onDataAvailable: function (aRequest, aContext, aStream, aSourceOffset, aLength) {
				var binInputStream = Cc["@mozilla.org/binaryinputstream;1"].
					createInstance(Ci.nsIBinaryInputStream);
				binInputStream.setInputStream(aStream);

				this.data += binInputStream.readBytes(aLength);
			},

			onStopRequest: function (aRequest, aContext, aStatus) {
				var channel = aRequest.QueryInterface(Ci.nsIChannel);
				if (Components.isSuccessCode(aStatus)) {
					// request was successful
					this.callbackFunc( channel.URI, this.data );
				} else {
					// request failed
					this.callbackFunc( channel.URI, null );
				}
			},

			// nsIInterfaceRequestor
			getInterface: function (aIID) {
				try {
					return this.QueryInterface(aIID);
				} catch (e) {
					throw Components.results.NS_NOINTERFACE;
				}
			},

			// nsIProgressEventSink (not implementing will cause annoying exceptions)
			onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
			onStatus : function (aRequest, aContext, aStatus, aStatusArg) { },
			onChannelRedirect: function (aOldChannel, aNewChannel, aFlags) { },
			onRedirect : function (aOldChannel, aNewChannel) { },

			// we are faking an XPCOM interface, so we need to implement QI
			QueryInterface : function(aIID) {
				if (aIID.equals(Ci.nsISupports) ||
					aIID.equals(Ci.nsIInterfaceRequestor) ||
					aIID.equals(Ci.nsIChannelEventSink) ||
					aIID.equals(Ci.nsIProgressEventSink) ||
					aIID.equals(Ci.nsIHttpEventSink) ||
					aIID.equals(Ci.nsIStreamListener))
						return this;

				throw Components.results.NS_NOINTERFACE;
			}
		});
	}

})();

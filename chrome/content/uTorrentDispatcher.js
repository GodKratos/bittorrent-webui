(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "UTorrentDispatcher",

function UTorrentDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();

	this.name = "uTorrent";
	this.httpRealm = "uTorrent";

	/* Adapted from Alastair Patrick's uTorrent Web UI Firefox extension
	 * http://thinkpond.org/articles/2008/utorrent-ext.shtml
	 */
	this.createHTTPPost = function() {
		var token = getToken();
		Util.debug( "creating HTTP post using token: " + token );
		/* not sure of the quality of the bencode/bdecode code
		 * so it's not included yet.
		if( !this.mFilename ) {
			try {
				var torrData = Util.bdecode( this.mData );
				this.mFilename = torrData.info.name;
			} catch(e) {}
		}
		*/
		this.writeBinary( "--" + MULTIPART_BOUNDARY + "\r\n" +
			"Content-Disposition: form-data; name=\"torrent_file\"; filename=\"" + this.mFilename + "\"\r\n" +
			"Content-Type: application/x-bittorrent\r\n" +
			"\r\n");

		Util.debug( "mData = " + this.mData );

		this.writeBinary( this.mData );
		this.writeBinary( "\r\n--" + MULTIPART_BOUNDARY + "--\r\n");

		this.mPostURI = "/?" +
			((token == null) ? "" : "token=" + encodeURIComponent(token) + "&") +
			"action=add-file";
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser.filename = this.mFilename;
		resultParser.parse = function( aRequest ) {
			var response = Util.JSON.parse( aRequest.responseText );
			var message = response.error;
			this.mSuccess = (message == null);
			if( this.mSuccess ) {
				this.mMessage = (this.filename) ? this.filename + " " +
					Util.getStrBundle().GetStringFromName("successMessageWithFilename") :
					Util.getStrBundle().GetStringFromName("successMessageNoFilename");
			} else {
				this.mMessage = message;
			}
			return true;
		};
		return resultParser;
	};

	this.setURL = function( aURL ) {
		this._url = aURL;

		/* now transform this instance into a URL Dispatcher */
		this.createHTTPPost = function() {};
		this.setRequestHeader = function() {};

		this.openRequest = function() {
			if( this._url ) {
				this.mRequest.open( "GET", this.getWebUIAddress() + "/?token=" + encodeURIComponent(getToken()) +
					"&action=add-url&s=" + encodeURIComponent( this._url ),
					true, Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );

				Util.debug( "uTorrent opening add by url request" );
			}
		}
	}

	this.getServerPath = function() {
		return "/gui/";
	};

	var self = this;
	function getToken() {
		Util.debug( "getting uTorrent token" );
		var request = new XMLHttpRequest();
		request.open( "GET", self.getWebUIAddress() + "/token.html", false,
				Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );

		try {
			request.send(null);

			if( request.status == 200 ) {
				/* should ask the guys at the uTorrent WebUI forum for a "token.xml" url
				 * so we can use request.responseXML.getElementsByTagName('token'); instead of
				 * this ugliness.
				 */
				var matches = (new RegExp("id=\'token\'[^>]+>([^<]+)", "i")).exec( request.responseText );
				return ( matches && matches.length > 1 ) ? matches[1] : null;
			}
		} catch(e) {}
		return null;
	};
});
})();
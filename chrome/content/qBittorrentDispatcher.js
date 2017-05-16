(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "qBittorrentDispatcher",

function qBittorrentDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();

	this.name = "qBittorrent";
	this.httpRealm = "qBittorrent";

	this.createHTTPPost = function() {
		this.writeBinary(
			"--" + MULTIPART_BOUNDARY + "\r\n" +
			"Content-Disposition: form-data; name=\"Filename\"\r\n" +
			"\r\n" +
			this.mFilename + "\r\n" +
			"--" + MULTIPART_BOUNDARY + "\r\n" +
			"Content-Disposition: form-data; name=\"torrentfile\"; filename=\"" + this.mFilename + "\"\r\n" +
			"Content-Type: application/x-bittorrent\r\n" +
			"\r\n");

		Util.debug( "mFilename = " + this.mFilename );
		//Util.debug( "mData = " + this.mData );

		this.writeBinary( this.mData );
		this.writeBinary(
			"\r\n--" + MULTIPART_BOUNDARY + "\r\n" +
			"Content-Disposition: form-data; name=\"Upload\"\r\n" +
			"\r\n" +
			"Submit Query" +
			"\r\n--" + MULTIPART_BOUNDARY + "--\r\n");

		this.mPostURI = "/command/upload";

	};

	this.setRequestHeader = function() {
		var sessionID = getSessionID();
		if(sessionID != null) {
			Util.debug("Using session id: " + sessionID);
			this.mRequest.setRequestHeader("Cookie", this.sessionID);
		}
		this.mRequest.setRequestHeader("Connection", "close");
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser.filename = this.mFilename;
		resultParser.parse = function( aRequest ) {
			//Util.debug("response = " + aRequest.response);
			//Util.debug("responseBody = " + aRequest.responseBody);
			//Util.debug("responseText = " + aRequest.responseText);
			//Util.debug("responseType = " + aRequest.responseType);
			//Util.debug("responseXML = " + aRequest.responseXML.xml);
			//Util.debug("status = " + aRequest.status);
			//Util.debug("statusText = " + aRequest.statusText);
			var message = aRequest.statusText;
			Util.debug(message);

			this.mSuccess = (message.indexOf("OK") >= 0);
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

	this.getServerPath = function() {
		return "/";
	};

	this.setURL = function( aURL ) {
		// For qBittorrent we use a post URL and add the torrent url that way
		this._url = aURL;
		this.mPostURI = "/command/download";

		this.createHTTPPost = function() {
			this.writeBinary("urls=" + encodeURIComponent( this._url ));
		};
	};

	function getSessionID() {
		var request = new XMLHttpRequest();
		request.open( "POST", self.getWebUIAddress() + "/login", false, null, null );
		request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		try {
			request.send( "username="+Prefs.getWebUIUsername()+"&password="+Prefs.getWebUIPassword() );

			if( request.status == 200 ) {
				var response = Util.JSON.parse(request.responseText);
				if(response.result == "Ok.") {
					return request.getResponseHeader("Set-Cookie");
				} else {
					Util.debug("Auth response: " + response.result);
				}
			} else {
				Util.debug("Auth status: " + request.status);
			}
		} catch(e) {}
		return null;
	}

});
})();
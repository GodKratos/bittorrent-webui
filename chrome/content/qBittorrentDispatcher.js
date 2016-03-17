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

  const AUTH_RPC_ERROR = 0;
  const AUTH_RPC_AVAILABLE = 1;
  const AUTH_RPC_UNAVAILABLE = 2;

  this.sessionID = null;

	this.createHTTPPost = function() {
    var sessionIdResult = getSessionID();
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
    this.mRequest.setRequestHeader("Content-Type",
        "multipart/form-data; boundary=" + MULTIPART_BOUNDARY );
    if(this.sessionID) {
      this.mRequest.setRequestHeader("Cookie", this.sessionID);
    }
  }

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
      var sessionIdResult = getSessionID();

			this.writeBinary("urls=" + encodeURIComponent( this._url ));
		};

		this.setRequestHeader = function() {
			this.mRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded" );
      if(this.sessionID) {
        this.mRequest.setRequestHeader("Cookie", this.sessionID);
      }
		};
	};

  var self = this;
	function getSessionID() {
		var request = new XMLHttpRequest();
		request.open( "POST", self.getWebUIAddress() + "/login", false, null, null );
    request.setRequestHeader(
        'Content-Type',
        'application/x-www-form-urlencoded; charset=utf-8');

		try {
			request.send(
          'username=' + Prefs.getWebUIUsername() +
          '&password=' + Prefs.getWebUIPassword()
			);

			if( request.status == 200 ) {
				var response = Util.JSON.parse(request.responseText);
				if(response.result) {
					var cookie = request.getResponseHeader("Set-Cookie");
					cookie = cookie.split(";", 1)[0];
					Util.debug("Using Cookie: " + cookie);
					self.sessionID = cookie;
				}
				return AUTH_RPC_AVAILABLE;
			} else {
				return AUTH_RPC_UNAVAILABLE;
			}
		} catch(e) {}
		return AUTH_RPC_ERROR;
	}

});

})();

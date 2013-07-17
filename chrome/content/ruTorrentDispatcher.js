(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "RUTorrentDispatcher",

function RUTorrentDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();

	this.name = "ruTorrent";
	this.httpRealm = "ruTorrent";

	this.createHTTPPost = function() {
		this.writeBinary( "--" + MULTIPART_BOUNDARY + "\r\n" +
			"Content-Disposition: form-data; name=\"torrent_file\"; filename=\"" + this.mFilename + "\"\r\n" +
			"Content-Type: application/x-bittorrent\r\n" +
			"\r\n");

		this.writeBinary( this.mData );
		this.writeBinary( "\r\n--" + MULTIPART_BOUNDARY + "--\r\n");

		this.mPostURI = "/php/addtorrent.php";
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser.filename = this.mFilename;
		resultParser.parse = function( aRequest ) {
			var response = aRequest.responseText;
			var message = response;
			Util.debug(aRequest)

			this.mSuccess = (message.indexOf("addTorrentSuccess") >= 0);
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
		return "/rutorrent/";
	};

	this.setURL = function( aURL ) {
		this._url = aURL;

		/* now transform this instance into a URL Dispatcher */
		this.createHTTPPost = function() {};
		this.setRequestHeader = function() {};

		this.openRequest = function() {
			if( this._url ) {
				this.mRequest.open( "GET", this.getWebUIAddress() + "/php/addtorrent.php?url=" + encodeURIComponent( this._url ),
					true, Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );

				Util.debug( "opening add by url request" );
			}
		};
	};


});
})();
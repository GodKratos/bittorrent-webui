(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "AzureusDispatcher",

function AzureusDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();

	this.httpRealm = "Azureus - HTML Web UI";
	this.name = "Azureus HTML WebUI";

	this.createHTTPPost = function() {
		this.writeBinary( "--" + MULTIPART_BOUNDARY + "\r\n" +
        	"Content-Disposition: form-data; name=\"upfile_0\"; filename=\"" + this.mFilename + "\"\r\n" +
        	"Content-Type: application/x-bittorrent\r\n" +
        	"\r\n");

        this.writeBinary( this.mData );
        this.writeBinary( "\r\n--" + MULTIPART_BOUNDARY + "--\r\n");

    	this.mPostURI = "/index.tmpl?d=u&local=1";
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser.parse = function( aRequest ) {
			var aResponseText = aRequest.responseText;
			var startIndex = aResponseText.indexOf( "id=\"up_msg\"" );
			this.mMessage = aResponseText.substring(
				aResponseText.indexOf( ">", startIndex )+1,
				aResponseText.indexOf( "<", startIndex )
			);
			this.mSuccess = ( this.mMessage.indexOf("success") != -1 );
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
				this.mRequest.open( "GET", this.getWebUIAddress() + "/index.tmpl?d=u&upurl=" + encodeURIComponent( this._url ),
					true, Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );

				Util.debug( "opening add by url request" );
    		}
		};
	};
});
})();
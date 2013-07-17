(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;
	
Prefs.DispatcherFactory.registerDispatcher( "AzureusSwingUIDispatcher",

function AzureusSwingUIDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();
	
	this.name = "Azureus Swing WebUI";
	this.httpRealm = "Azureus - Swing Web Interface";

	this.createHTTPPost = function() {	
		/* See note in uTorrentDispatcher.createHTTPPost()
		if( !this.mFilename ) { 
			try {
				var torrData = Util.bdecode( this.mData );
				this.mFilename = torrData.info.name; 
			} catch(e) {}
		}	
		*/
		this.writeBinary( "--" + MULTIPART_BOUNDARY + "\r\n" +
        	"Content-Disposition: form-data; name=\"upfile\"; filename=\"" + this.mFilename + "\"\r\n" +
        	"Content-Type: application/x-bittorrent\r\n" +
        	"\r\n");
        	
        this.writeBinary( this.mData );
    	this.writeBinary( "\r\n--" + MULTIPART_BOUNDARY + "--\r\n");
    	
    	this.mPostURI = "/upload.cgi";
	};
		
	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();
		
		resultParser._filename = this.mFilename;
		resultParser.parse = function( aRequest ) 
		{
			var re = new RegExp(/Upload\s(\w+):?\s?([^<]*)/);
			var matches = re.exec( aRequest.responseText );
			if( matches ) {
				if( matches[1] == "OK" ) {
					this.mSuccess = true;
					this.mMessage = (this._filename) ? this._filename + " " +
						Util.getStrBundle().GetStringFromName("successMessageWithFilename") :
						Util.getStrBundle().GetStringFromName("successMessageNoFilename");
				} else {
					this.mSuccess = false;
					this.mMessage = matches[2];
				}
				return true;	
			}
			return false;
		};	
		return resultParser;	
	};	
});

})();
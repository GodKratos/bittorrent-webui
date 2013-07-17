(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;
	
Prefs.DispatcherFactory.registerDispatcher( "AzSMRCDispatcher", 
		
function AzSMRCDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const MULTIPART_BOUNDARY = Util.getMultipartBoundary();
	
	this.name = "AzSMRC";
	this.httpRealm = "Azureus - AzSMRC";

	this.createHTTPPost = function() {
        this.writeBinary( "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + "\n" +
			"<Request version=\"1.0\" noEvents=\"true\">" + "\n" +
  				"<Query switch=\"addDownload\" returnResult=\"true\" location=\"XML\">" + "\n" +
				    "<Torrent>" );
        
		// convert to base64
        this.writeBinary( Util.encode64( this.mData ) );
        
    	this.writeBinary( "</Torrent>" + "\n" +
  				"</Query>" + "\n" +
			"</Request>" );
    	
    	this.mPostURI = "/process.cgi";
	};
	
	this.setRequestHeader = function() {
		this.mRequest.setRequestHeader("Content-Type", "application/xml; charset=iso-8859-1");	
		this.mRequest.setRequestHeader("Connection", "close");	
	};
	
	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();
		
		resultParser.parse = function( aRequest ) {
			var result = aRequest.responseXML.getElementsByTagName("Result");
            
			for(var i=0; i<result.length; ++i) {
				Util.debug( "AzSMRCResultParser found a result tag" );
				var state = result[i].getAttribute("state");
									
				if( state == "Error" ) {
					Util.debug( "AzSMRC reported an error" ); 
					this.mSuccess = false;
					this.mMessage = result[i].getAttribute("error");
					return true;
					
				} else if( state == "Successful" ) {
					Util.debug( "AzSMRC reports success" ); 
					this.mSuccess = true;						
					this.mMessage = result[i].getAttribute("name") + " " +
						Util.getStrBundle().GetStringFromName("successMessageWithFilename");
					return true;
				}
        	}
        	Util.debug( "AzSMRCResultParser could not find any state information" );
        	return false;
		};	
		return resultParser;	
	};
});

})();
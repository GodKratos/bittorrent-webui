(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "TransmissionDispatcher",

function TransmissionDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const rpcURI = "/transmission/rpc";

	this.name = "Transmission";
	this.httpRealm = this.name;

	this.createHTTPPost = function() {
		Util.debug( "Transmission sending data as JSON" );
		var request = ({
			method: "torrent-add",
			arguments: {
				metainfo: Util.encode64( this.mData )
			}
		});
		this.writeBinary( Util.JSON.stringify(request) );

		this.mPostURI = rpcURI;
	};

	this.setRequestHeader = function() {
		var sessionID = getSessionID();
		if(sessionID != null) {
			Util.debug("Using session id: " + sessionID);
			this.mRequest.setRequestHeader("X-Transmission-Session-Id", sessionID);
		}
		this.mRequest.setRequestHeader("Connection", "close");
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser.parse = function( aRequest ) {
			var response = Util.JSON.parse(aRequest.responseText);

			this.mSuccess = (response.result == "success");
			if( this.mSuccess ) {
				this.mMessage = Util.getStrBundle().GetStringFromName("successMessageNoFilename");

				var torrentInfo = response.arguments["torrent-added"];
				if( torrentInfo ) {
					this.mMessage = torrentInfo["name"] + " " +
						Util.getStrBundle().GetStringFromName("successMessageWithFilename");
				}
				var torrentInfo = response.arguments["torrent-duplicate"];
				if( torrentInfo ) {
					this.mSuccess = false;
					this.mMessage = Util.getStrBundle().GetStringFromName("duplicateTorrent");
				}
			} else {
				this.mMessage = response.result;
			}
			return true;
		};
		return resultParser;
	};


	this.setURL = function( aURL ) {
		this._url = aURL;

		if (this._url) {
			this.createHTTPPost = function() {
				Util.debug( "Transmission adding torrent by URL" );
				var request = ({
					method: "torrent-add",
					arguments: {
						filename: this._url
					}
				});
				this.writeBinary( Util.JSON.stringify(request) );

				this.mPostURI = rpcURI;
			};
		} else {
			Util.debug( "Transmission adding torrent by URL failed" );
		}
	}


	var self = this;
	function getSessionID() {
		Util.debug( "Getting Transmission session ID" );
		var request = new XMLHttpRequest();
		// Using GET here makes this call hang on Transmission 1.51
		request.open( "POST", self.getWebUIAddress() + rpcURI, false,
				Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );

		try {
			request.send( '{"method":"session-get"}' );
			if( request.status == 409 ) {
				return request.getResponseHeader("X-Transmission-Session-Id");
			}
		} catch(e) {}
		return null;
	}


});
})();

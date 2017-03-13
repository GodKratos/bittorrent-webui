(function (){
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

Prefs.DispatcherFactory.registerDispatcher( "DelugeDispatcher",

function DelugeDispatcher() {
	BTWebUI.Dispatcher.apply(this);

	const JSON_RPC_ERROR = 0;
	const JSON_RPC_AVAILABLE = 1;
	const JSON_RPC_UNAVAILABLE = 2;

	this.name = "Deluge";
	this.httpRealm = null;

	this.usernameField = null;
	this.passwordField = 'password';

	this.sessionID = null;

	this.createHTTPPost = function() {
		var sessionIdResult = getSessionID();

		/* see note in uTorrentDispatcher.createHTTPPost()
		if( !this.mFilename ) {
			try {
				var torrData = Util.bdecode( this.mData );
				this.mFilename = torrData.info.name;
			} catch(e) {}
		}
		*/
		if( sessionIdResult == JSON_RPC_UNAVAILABLE ) {
			Deluge_1_1_x.apply(this);
			return this.createHTTPPost();
		}

		Util.debug( "Preparing to send data as JSON" );
		this.writeBinary(
			Util.JSON.stringify({
				id:2,
				method: "core.add_torrent_file",
				params: [this.mFilename,
						 Util.encode64(this.mData),
						 null]
			})
		);

		this.mPostURI = "/json";
	};

	this.setRequestHeader = function() {
		if(this.sessionID) {
			this.mRequest.setRequestHeader("Cookie", this.sessionID);
		}
		this.mRequest.setRequestHeader("Connection", "close");
	};

	this.getResultParser = function() {
		var resultParser = this.getResultParserBase();

		resultParser._filename = this.mFilename;
		resultParser.parse = function( aRequest ) {
			Util.debug("responseText: "+aRequest.responseText);
			var response = Util.JSON.parse(aRequest.responseText);

			this.mSuccess = (response.result != null);
			if( this.mSuccess ) {
				this.mMessage = (this._filename != null) ? this._filename + " " +
					Util.getStrBundle().GetStringFromName("successMessageWithFilename") :
					Util.getStrBundle().GetStringFromName("successMessageNoFilename");
			} else {
				if(response.error) {
					this.mMessage = response.error.message;
				}
			}
			return true;
		};
		return resultParser;
	};


	this.setURL = function( aURL ) {
		this._url = aURL;

		if (this._url) {
			if (this._url.match(/^magnet/i)) {
				/* Add Magnet URL */
				this.createHTTPPost = function() {
					var sessionIdResult = getSessionID();

					Util.debug( "Deluge adding magnet torrent by URL" );

					this.writeBinary(
						Util.JSON.stringify({
							id:2,
							method: "core.add_torrent_magnet",
							params: [this._url, null]
						})
					);

					this.mPostURI = "/json";
				};
			} else {
				/* Add torrent URL */
				this.createHTTPPost = function() {
					var sessionIdResult = getSessionID();

					Util.debug( "Deluge adding torrent by URL" );

					this.writeBinary(
						Util.JSON.stringify({
							id:2,
							method: "core.add_torrent_url",
							params: [this._url, null]
						})
					);

					this.mPostURI = "/json";
				};
			}
		} else {
			Util.debug( "Deluge adding torrent by URL failed" );
		}
	}


	var self = this;
	function getSessionID() {
		var request = new XMLHttpRequest();
		request.open( "POST", self.getWebUIAddress() + "/json", false, null, null );

		try {
			request.setRequestHeader("Content-Type", "application/json");
			request.send(
				Util.JSON.stringify({
					id : 1,
					method: "auth.login",
					params: [Prefs.getWebUIPassword()]
				})
			);

			if( request.status == 200 ) {
				var response = Util.JSON.parse(request.responseText);
				if(response.result) {
					var cookie = request.getResponseHeader("Set-Cookie");
					cookie = cookie.split(";", 1)[0];
					Util.debug("Using Cookie: " + cookie);
					self.sessionID = cookie;
				}grep
				return JSON_RPC_AVAILABLE;
			} else if(request.status == 404) {
				return JSON_RPC_UNAVAILABLE;
			}
		} catch(e) {}
		return JSON_RPC_ERROR;
	}

	/* Inline constructor for Deluge 1.1.x
	 * Only tested with Deluge 1.1.9
	 */
	function Deluge_1_1_x() {
		this.passwordField = 'pwd';

		this.createHTTPPost = function() {
			Util.debug( "Using Deluge 1.1.x Dispatcher" );

			var POSTData = this.passwordField + '=' + encodeURIComponent( Prefs.getWebUIPassword() ) +
				'&torrent_name=' + encodeURIComponent( this.mFilename ) +
				'&data_b64=' + encodeURIComponent( Util.encode64( this.mData ) );

			this.writeBinary( POSTData );

			this.mPostURI = "/remote/torrent/add";
		};

		this.setRequestHeader = function() {
			this.mRequest.setRequestHeader("Connection", "close");
//			this.mRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			this.mRequest.setRequestHeader("Content-type", "application/json");
		};

		this.getResultParser = function() {
			var resultParser = this.getResultParserBase();

			resultParser._filename = this.mFilename;
			resultParser.parse = function( aRequest ) {

				var response = aRequest.responseText;
				Util.debug( "responseText: " + response );

				this.mSuccess = (response == "ok\n");
				if( this.mSuccess ) {
					this.mMessage = (this._filename != null) ? this._filename + " " +
						Util.getStrBundle().GetStringFromName("successMessageWithFilename") :
						Util.getStrBundle().GetStringFromName("successMessageNoFilename");
				} else {
					this.mMessage = response;
				}
				return true;
			};
			return resultParser;
		};
	}
});
})();

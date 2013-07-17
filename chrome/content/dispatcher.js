(function() {
	var BTWebUI = alexisbrunet.com.BitTorrentWebUI;
	const Prefs = BTWebUI.Prefs;
	const Util = BTWebUI.Util;

BTWebUI.Dispatcher = function () {
	const MULTIPART_BOUNDARY = BTWebUI.Util.getMultipartBoundary();
	const DOWNLOAD_ICON = "chrome://mozapps/skin/downloads/downloadIcon.png";
	const ERROR_ICON = "chrome://global/skin/icons/error-16.png";

	var mStrBundle = Util.getStrBundle();

	var _buffer = null;
	var _bufOutputStream = null;
	var _binaryOutStream = null;
	var _bufferInitialized = false;

	function initBuffer() {
		_buffer = Components.classes["@mozilla.org/storagestream;1"]
					.createInstance(Components.interfaces.nsIStorageStream);
		_buffer.init(1024, 1024*1024, null);
		_bufOutputStream = _buffer.getOutputStream(0);
		_binaryOutStream = Components.classes["@mozilla.org/binaryoutputstream;1"]
				   .createInstance(Components.interfaces.nsIBinaryOutputStream);
		_binaryOutStream.setOutputStream( _bufOutputStream );
		_bufferInitialized = true;
	};

	this.mRequest = new XMLHttpRequest();
	this.mPostURI = "/";

	this.setFilename = function( aFilename ) { this.mFilename = aFilename; };
	this.setData = function( aData ) { this.mData = aData; };

	this.getWebUIAddress = function() {
		var strPath = Prefs.getServerScheme() + Prefs.getServerAddress() +	Prefs.getServerPort()
		if( Prefs.getServerPath() != "" ) {
			strPath = strPath + "/" + Prefs.getServerPath();
		}
		return strPath;
	};
	this.getServerPath = function() { return "/"; };
	this.getName = function() { return this.name; };
	this.getClassName = function() { return this.className; };
	this.getHTTPRealm = function() { return this.httpRealm; };

	// define the hooks for the subclasses
	this.createHTTPPost = 	function() { alert("assert: virtual method createHTTPPost() must be overloaded"); };
	this.getResultParser = 	function() { alert("assert: virtual method getResultParser() must be overloaded"); };

	this.openRequest = function() {
		this.mRequest.open( "POST", this.getWebUIAddress() + this.mPostURI, true,
		   	Prefs.getWebUIUsername(), Prefs.getWebUIPassword() );
	};

	this.setRequestHeader = function() {
		this.mRequest.setRequestHeader("Content-Type",
			"multipart/form-data; boundary=" + MULTIPART_BOUNDARY );
	};

	this.getResultParserBase = function() {
		return({
			mSuccess: false,
			mMessage: Util.getStrBundle().GetStringFromName("unknownError"),

			success: function() { return this.mSuccess; },
			getMessage: function() { return this.mMessage; },
			parse: function( aResponseText ) {
				alert("assert: virtual method parse() must be overloaded");
				return false;
			}
		});
	};

	this.onReadyStateChange = function( aRequest ) {
		if( aRequest.readyState == 4 ) {
			var alertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

			var reqStatus;
			if ( Prefs.beepEnabled() ) {
				var sound = Components.classes["@mozilla.org/sound;1"]
							.createInstance(Components.interfaces.nsISound);
				sound.beep();
			}

			try {
				reqStatus = aRequest.status;
			} catch( e ) {
				/* we can't extract a status code from the response,
				   assume our request timed out */
				alertsService.showAlertNotification(
						ERROR_ICON,
						mStrBundle.GetStringFromName("notifyError"),
						mStrBundle.GetStringFromName("noReply"),
						false,
						"",
						null
				);
				return;
			}

			if( reqStatus == 200 ) {
				/* The HTTP transaction was successful... don't celebrate yet */
				var result = this.getResultParser();

				var parseResult = result.parse( aRequest );
				if( !parseResult ) {
					/* Error occurred while evaluating the servers response */
					alertsService.showAlertNotification(
						ERROR_ICON,
						mStrBundle.GetStringFromName("notifyError"),
						mStrBundle.GetStringFromName("unknownError") + "(result.parse)",
						false, "", null);
					/* parsing could not be done... ditch! */
					return;
				}

				/* Parsing the server response worked */
				if( result.success() ) {
					/* Server response indicates that the torrent was added, yay */
					var clickObserver = Util.createObserver();
					clickObserver.observe = function(aSubject, aTopic, aData) {
					 	if( aTopic == 'alertclickcallback')
					 		Util.openTab( aData );
					};

					alertsService.showAlertNotification(
						DOWNLOAD_ICON,
						mStrBundle.GetStringFromName("notifySuccess"),
						result.getMessage(),
						true,
						this.getWebUIAddress(),
						clickObserver );
				}
				else {
					/* Server reports an error, show it to user */
					alertsService.showAlertNotification( ERROR_ICON,
						mStrBundle.GetStringFromName("notifyError"),
						result.getMessage(), false, "", null );
				}
			}
			else if( reqStatus == 0 ) {
				/* Could not reach webui */
				alertsService.showAlertNotification(
						ERROR_ICON,
						mStrBundle.GetStringFromName("notifyError"),
						mStrBundle.GetStringFromName("noReply"),
						false,
						"",
						null
				);
			}
			else if( reqStatus < 100 || reqStatus > 505 ) {
				/* The request status doesn't mean anything... weird */
				alertsService.showAlertNotification(
						ERROR_ICON,
						mStrBundle.GetStringFromName("notifyError"),
						mStrBundle.GetStringFromName("unknownError") + " (" + reqStatus + ")",
						false,
						"",
						null
				);
			}
			else {
				/* Server replied with something other than 200 OK, notify the user */
				var statusText = "";
				try {
					statusText = aRequest.statusText;
				} catch( e ) {}

				alertsService.showAlertNotification( ERROR_ICON,
					mStrBundle.GetStringFromName("notifyError"),
					mStrBundle.GetStringFromName("serverReplied") +
					": " + statusText + " (" + reqStatus + ")",
					false, "", null );
			}
		}
	};

	this.writeBinary = function( aString ) {
		if(!_bufferInitialized) {
			initBuffer();
		}
		_binaryOutStream.writeBytes( aString, aString.length );
	};

	/* Template method */
	this.sendRequest = function() {
		this.createHTTPPost();
		this.openRequest();
		this.setRequestHeader();

		if(_bufferInitialized) {
			_bufOutputStream.close();
		}
		var bufInputStream = (_bufOutputStream ? _bufOutputStream.newInputStream(0) : null);
		_sendRequest( this.mRequest, bufInputStream, this );
	};

	function _sendRequest( request, data, callbackObj ) {
		request.onreadystatechange = function() {
			callbackObj.onReadyStateChange( request );
		}
		request.send( data );
	}
}

Prefs.DispatcherFactory = {
	dispatchers: [],
	classNames: [],

	registerDispatcher: function( aClassName, aConstructor ) {
		var next = this.dispatchers.length;
		this.dispatchers[next] = aConstructor;
		this.classNames[next] = aClassName;
	},

	getAll: function() {
		var dispatchers = [];
		for( var i=0; i < this.dispatchers.length; i++ ) {
			dispatchers.push(
				new (this.dispatchers[i])()
			);
			dispatchers[dispatchers.length-1].className = this.classNames[i];
		}
		return dispatchers;
	},

	create: function(aClassName) {
		if(aClassName == null)
			aClassName = Prefs.getWebUIType();

		var index = this.classNames.indexOf(aClassName);
		if(index != -1) {
			return new (this.dispatchers[index])();
		}
		throw new TypeError("Unkown dispatcher class: " + aClassName);
	}
};

})();
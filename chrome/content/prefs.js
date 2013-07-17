(function (){
	alexisbrunet.com.BitTorrentWebUI.Prefs = {};
	const Prefs = alexisbrunet.com.BitTorrentWebUI.Prefs;

	const Cc = Components.classes;
	const Ci = Components.interfaces;

	var passwordManager = null;
	var handleTorrents = true;
	var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	Prefs.addObserver = function(aDomain, aObserver, aHoldWeak) {
		prefs.addObserver(aDomain, aObserver, aHoldWeak);
	}

	Prefs.removeObserver = function(aDomain, aObserver) {
		prefs.removeObserver(aDomain, aObserver);
	}

	Prefs.lockPref = function(aPrefName) {
		prefs.lockPref(aPrefName);
	}

	Prefs.unlockPref = function(aPrefName) {
		prefs.unlockPref(aPrefName);
	}

	Prefs.getWebUIType = function() {
		return prefs.getCharPref("extensions.bitTorrentWebUI.dispatcher");
	}

	Prefs.getServerScheme = function() {
		return prefs.getCharPref("extensions.bitTorrentWebUI.serverScheme");
	}

	Prefs.getEnabledFlag = function() {
		return prefs.getBoolPref("extensions.bitTorrentWebUI.enabled");
	}

	Prefs.getServerAddress = function() {
		return prefs.getCharPref("extensions.bitTorrentWebUI.serverAddress");
	}

	Prefs.getServerPath = function() {
		return prefs.getCharPref("extensions.bitTorrentWebUI.serverPath").replace(/^\/|\/$|^\s+|\s+$/g,'');
	}

	Prefs.setServerPath = function( path ) {
		prefs.setCharPref("extensions.bitTorrentWebUI.serverPath", path);
	}

	Prefs.getServerPort = function() {
		try {
			var checkPortVal = parseInt( prefs.getCharPref("extensions.bitTorrentWebUI.serverPort") );
			if( !isNaN(checkPortVal) && checkPortVal > 0 ) {
				return ":"+checkPortVal;
			}
		} catch( e ) {}
		return "";
	}

	Prefs.isFirstRun = function() {
		var firstRun = prefs.getBoolPref("extensions.bitTorrentWebUI.firstRun");
		if( firstRun ) {
			prefs.setBoolPref("extensions.bitTorrentWebUI.firstRun", false);
		}

		if( this.getServerAddress().length > 0 ) {
			return false;
		}
		return firstRun;
	}

	Prefs.getInstantApply = function() {
		try{
  			return prefs.getBoolPref("browser.preferences.instantApply");
		} catch( e ) { }
		return true;
	},

	Prefs.debugOutputToConsole = function() {
		return prefs.getBoolPref("extensions.bitTorrentWebUI.debugToConsole");
	},

	Prefs.getPasswordManager = function() {
		if(passwordManager)
			return passwordManager;

		if ("@mozilla.org/passwordmanager;1" in Cc) {
			passwordManager = new this.PasswordManager();
		} else if("@mozilla.org/login-manager;1" in Cc) {
			passwordManager = new this.LoginManager();
		}

		return passwordManager;
	}

	Prefs.setWebUIUsername = function( username ) {
		prefs.setCharPref("extensions.bitTorrentWebUI.serverUsername", username);
	}

	Prefs.getWebUIUsername = function() {
		return prefs.getCharPref("extensions.bitTorrentWebUI.serverUsername");
	}

	Prefs.getWebUIPassword = function() {
		var username = this.getWebUIUsername();
		var hostname = this.getServerScheme()+this.getServerAddress()+this.getServerPort();
		var pwManager = this.getPasswordManager();

		if( pwManager != null ) {
			try {
		  		return pwManager.getPassword( hostname, username, this.getHTTPRealm() );
		  	} catch( ex ) {}
		}
        return null;
	}

	Prefs.setWebUIPassword = function( pPassword ) {
		var username = this.getWebUIUsername();
		var hostname = this.getServerScheme()+this.getServerAddress()+this.getServerPort();
		var pwManager = this.getPasswordManager();

		var dispatcher = this.DispatcherFactory.create();

		var authenticationHelper = {
			'httpRealm' : this.getHTTPRealm( dispatcher ),
			'usernameField' : dispatcher.usernameField,
			'passwordField' : dispatcher.passwordField
		};

		if( pPassword && pwManager ) {
			pwManager.setPassword( hostname, username, pPassword, authenticationHelper );
		}
    }

    Prefs.getHTTPRealm = function(pDispatcher) {
		var httpRealm = (pDispatcher) ? pDispatcher.getHTTPRealm() :
			this.DispatcherFactory.create().getHTTPRealm();
		/* if using a client which uses form based auth */
		if( httpRealm == null )
			return httpRealm;

		/* we are using a HTTP auth client,
		 * check if the user has manually set the httpRealm preference */
		try {
			httpRealm = prefs.getCharPref("extensions.bitTorrentWebUI.httpRealm");
		} catch(e) {}

		return httpRealm;
	}

    Prefs.setEnabledFlag = function(aBool) {
		prefs.setBoolPref("extensions.bitTorrentWebUI.enabled", aBool);
	}

    Prefs.showAddByURLMenu = function() {
		var prefSetting = false;
		var dispatcher = this.DispatcherFactory.create();

		try {
			prefSetting = prefs.getBoolPref("extensions.bitTorrentWebUI.showAddByURLMenu");
		} catch( e ) {}
		return (prefSetting && dispatcher && dispatcher.setURL);
	}

    Prefs.showStatusIcon = function() {
		return prefs.getBoolPref("extensions.bitTorrentWebUI.showStatusIcon");
	}

    Prefs.beepEnabled = function() {
		return prefs.getBoolPref("extensions.bitTorrentWebUI.beepEnabled");
	}

    Prefs.showOptionsDialog = function() {
		var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Ci.nsIWindowMediator);
		var enumerator = wm.getEnumerator(null);

		while(enumerator.hasMoreElements()) {
  			var win = enumerator.getNext();
  			if( win.document.getElementById("BTWebUIOptions") ) {
  				win.focus();
  				return;
  			}
		}

		/** Stolen from an old version of pdfDownload **/
		var features = "chrome,titlebar,toolbar,centerscreen" + (this.getInstantApply() ? ",dialog=no" : ",modal");
		var settingsHandle = window.openDialog("chrome://bittorrent_webui/content/options.xul", "", features);
		settingsHandle.focus();
	}

    Prefs.handleTorrents = function() {
		if( null == this.getServerAddress() ) return false;

		if( this.getEnabledFlag() )
			return handleTorrents;

		return !handleTorrents;
	}

    Prefs.setTorrentHandling = function( aBool ) {
		handleTorrents = aBool;
	}

    Prefs.convertOldPreferences = function() {
		/* Convert old bitTorrentWebUI.webUIType int pref to
		 * bitTorrentWebUI.dispatcher class */
		try {
			var oldIndex = prefs.getIntPref("bitTorrentWebUI.webUIType");
			var dispatchers = ["Azureus", "UTorrent", "AzSMRC", "AzureusSwingUI"];

			prefs.setCharPref("bitTorrentWebUI.dispatcher", dispatchers[oldIndex]+"Dispatcher");
			prefs.deleteBranch("bitTorrentWebUI.webUIType");

		} catch( e ) { }

		// Relocate preferences to extensions branch
		try {
			var prefsArray = prefs.getChildList("bitTorrentWebUI.", {});
			for (i in prefsArray) {
				if (!prefs.prefHasUserValue(prefsArray[i]))
					continue;

				switch (prefs.getPrefType(prefsArray[i])) {
					case prefs.PREF_STRING:
						prefs.setCharPref("extensions." + prefsArray[i], prefs.getCharPref(prefsArray[i]));
						break;
					case prefs.PREF_INT:
						prefs.setIntPref("extensions." + prefsArray[i], prefs.getIntPref(prefsArray[i]));
						break;
					case prefs.PREF_BOOL:
						prefs.setBoolPref("extensions." + prefsArray[i], prefs.getBoolPref(prefsArray[i]));
						break;
					default:
						break;
				}
			}
			prefs.deleteBranch("bitTorrentWebUI");
		} catch( e ) { }

		// Set default option for new serverPath preference
		try {
			if( !prefs.prefHasUserValue("extensions.bitTorrentWebUI.serverPath") ) {
				var dispPref = prefs.getCharPref("extensions.bitTorrentWebUI.dispatcher");
				if( dispPref == "UTorrentDispatcher" )
					prefs.setCharPref("extensions.bitTorrentWebUI.serverPath", "/gui/");
				else if ( dispPref == "RUTorrentDispatcher" )
					prefs.setCharPref("extensions.bitTorrentWebUI.serverPath", "/rutorrent/");
				else
					prefs.setCharPref("extensions.bitTorrentWebUI.serverPath", "/");
			}
		} catch( e ) { }
	}
})();

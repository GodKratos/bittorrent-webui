var BTWebUI_PrefsDialog = {};
(function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;

	var mainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
	                    .getService(Ci.nsIWindowMediator)
	                    .getMostRecentWindow("navigator:browser");

	var BTWebUI = mainWindow.alexisbrunet.com.BitTorrentWebUI;

	var Prefs = BTWebUI.Prefs;
	var Util = BTWebUI.Util;

	var savePass = true;
	var oldUsername = null;
	var oldDispatcher = null;
	var instantApply = Prefs.getInstantApply();
	var passwordField = null;
	var serverPathTextBox = null;

	BTWebUI_PrefsDialog.onCancel = function () {
		if( !instantApply ) {
			savePass = false;
		}
		return true;
	}

	BTWebUI_PrefsDialog.onLoadPrefPane = function () {
		window.addEventListener('unload',
			function (aEvent) {
				BTWebUI_PrefsDialog.onUnloadPrefPane(aEvent);
			},
			true
		);

		var dispatchers = Prefs.DispatcherFactory.getAll();
		passwordField = document.getElementById("txtAdminPassword");
		passwordField.value = Prefs.getWebUIPassword();
		serverPathTextBox = document.getElementById("txtServerPath");

		/* Make one of these
		 * <menulist label="bitTorrentClient" preference="webUIType" id="btClientMnuList">
		 */
		var menulist = document.createElement("menulist");
		menulist.setAttribute("label", "bitTorrentClient");
		menulist.setAttribute("preference", "webUIType");
		menulist.setAttribute("id", "btClientMnuList");

		var menuPopup = document.createElement( "menupopup" );
		for(var i=0; i<dispatchers.length; i++) {
			var listItem = document.createElement("menuitem");
			listItem.setAttribute("label", dispatchers[i].getName() );
			listItem.setAttribute("value", dispatchers[i].getClassName() );
			listItem.setAttribute("type", "string" );

			listItem.addEventListener('command',
				function( aEvent ) {
					BTWebUI_PrefsDialog.onChangeTorrentClient( aEvent );
				},
				true
			);
			menuPopup.appendChild( listItem );
		}
		menulist.appendChild(menuPopup);

		var row = document.getElementById("webUITypeRow");
		row.appendChild( menulist );

		this.onChangeTorrentClient( null );
		Util.debug("Openning preferences");
	}

	BTWebUI_PrefsDialog.onUnloadPrefPane = function( aEvent ) {
		window.removeEventListener(
			'unload',
			function( pEvent ) {
				BTWebUI_PrefsDialog.onUnloadPrefPane( pEvent );
			},
			true
		);

		if( savePass ) {
			Prefs.setWebUIPassword( passwordField.value );
			Prefs.setServerPath(serverPathTextBox.value);
		}

		savePass = true;
		Util.debug("Closing preferences");
	}

	function setUsername( newUsername ) {
		var usernameTextbox = document.getElementById("txtAdminUsername");
		var oldUsername = usernameTextbox.value;
		usernameTextbox.value = newUsername;
		Prefs.setWebUIUsername(newUsername);
		return oldUsername;
	}

	BTWebUI_PrefsDialog.onChangeTorrentClient = function( aEvent ) {
		var menuList = document.getElementById("btClientMnuList");
		var dispatcher = Prefs.DispatcherFactory.create(
				(menuList && menuList.selectedItem) ? menuList.selectedItem.value : null );

		var usernameTextbox = document.getElementById("txtAdminUsername");
		var passwordTextbox = document.getElementById("txtAdminPassword");

		/* if the dispatcher uses form based authentication */
		if( dispatcher && dispatcher.getHTTPRealm() == null ) {
			/* should also clear disabled fields */
			var disableUser = ( dispatcher.usernameField == null );
			if(disableUser) {
				oldUsername = setUsername("");
				Prefs.lockPref("extensions.bitTorrentWebUI.serverUsername");
			}
			usernameTextbox.disabled = disableUser;
		}
		else {
			Prefs.unlockPref("extensions.bitTorrentWebUI.serverUsername");
			usernameTextbox.disabled = false;
			passwordTextbox.disabled = false;

			if(oldUsername) {
				setUsername( oldUsername );
			}
		}

		// update path for new dispatcher if not using default
		//var serverPathTextBox = document.getElementById("txtServerPath");
		if( oldDispatcher != null && (oldDispatcher.getServerPath() == serverPathTextBox.value || serverPathTextBox.value == "")) {
			serverPathTextBox.value = dispatcher.getServerPath();
		}

		oldDispatcher = dispatcher;
	}
})();

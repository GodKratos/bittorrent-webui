(function (){
	const ns = alexisbrunet.com;

	const BTWebUI = ns.BitTorrentWebUI;
	const Prefs = BTWebUI.Prefs;
	const Util = BTWebUI.Util;

	var _contextMenu = null;
	var _linkURL = null;
	var _statusString = ({
		enabled: 	Util.getStrBundle().GetStringFromName("statusEnabled"),
		disabled:	Util.getStrBundle().GetStringFromName("statusDisabled")
	});

ns.BTWebUI_Chrome = {

	onLoad: function() {
		window.removeEventListener("load", ns.BTWebUI_Chrome.onLoad, false);

		_contextMenu = document.getElementById("contentAreaContextMenu");
		if(_contextMenu) {
			_contextMenu.addEventListener(
				"popupshowing",
				function(evt) {
					ns.BTWebUI_Chrome.showContextMenu(evt);
				},
				false
			);
		}

		Prefs.addObserver("", ns.BTWebUI_Chrome, false);
		ns.BTWebUI_Chrome.showStatusIcon( true );
	},

	showContextMenu: function( evt ) {
		var menuItem = document.getElementById("addTorrentByURL");
		menuItem.hidden = true;
		if( gContextMenu.onLink &&
				Prefs.showAddByURLMenu() ) {
			menuItem.hidden = false;
		}
		_linkURL = gContextMenu.linkURL;
	},

	sendURL: function() {
		ns.BitTorrentWebUI.addTorrentByURL( _linkURL );
	},

	init: function() {
		window.addEventListener("load", ns.BTWebUI_Chrome.onLoad, false);
		window.addEventListener("unload", ns.BTWebUI_Chrome.shutdown, false);
	},

	shutdown: function() {
		window.removeEventListener("unload", ns.BTWebUI_Chrome.shutdown, false);

		if(_contextMenu) {
			_contextMenu.removeEventListener(
				"popupshowing",
				function(evt) {
					ns.BTWebUI_Chrome.showContextMenu(evt);
				},
				false
			);
		}
		Prefs.removeObserver("", ns.BTWebUI_Chrome);
	},

	onStatusBarMenuShowing: function(menuPopUp) {
		var menuItem = document.getElementById( "btWebUIEnabled" );
		menuItem.setAttribute("checked", Prefs.getEnabledFlag() );
	},

	onClickStatusIcon: function(event) {
		if( event && event.button == 0) {
			this.toggleEnabledFlag();
		}
		if( event && event.button == 1) {
			Util.openWebUI();
		}
	},

	showStatusIcon: function(show) {
		var statusBarPanel = document.getElementById("btWebUIStatusBar");
		this.updateStatusIcon();
		statusBarPanel.hidden = !(Prefs.showStatusIcon() && show);
	},

	toggleEnabledFlag: function( event ) {
		Prefs.setEnabledFlag( !Prefs.getEnabledFlag() );
		this.updateStatusIcon();
	},

	updateStatusIcon: function() {
		var enabled = Prefs.getEnabledFlag();

		var image = document.getElementById( "btWebUIStatusIcon" );
		image.setAttribute("src",
			(enabled) ? "chrome://bittorrent_webui/content/images/bittorrent_16.png" :
			"chrome://bittorrent_webui/content/images/bittorrent_disabled_16.png");

		var panel = document.getElementById( "btWebUIStatusBar" );
		panel.tooltipText = "BitTorrent WebUI [" +
			((enabled) ? _statusString.enabled : _statusString.disabled) + "]";

		if (document.getElementById("btWebUIButton"))
			document.getElementById("btWebUIButton").setAttribute("status", (enabled) ? "1" : "0");
	},

	observe: function(subject, topic, data) {
    	if (topic != "nsPref:changed") {
       		return;
     	}

     	switch(data) {
       		case "extensions.bitTorrentWebUI.showStatusIcon":
         		this.showStatusIcon(true);
         		break;
         	case "extensions.bitTorrentWebUI.enabled":
         		this.updateStatusIcon();
         		break;
     	}
	}
};

ns.BTWebUI_Chrome.init();
})();

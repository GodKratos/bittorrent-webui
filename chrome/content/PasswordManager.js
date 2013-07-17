(function (){
	const Prefs = alexisbrunet.com.BitTorrentWebUI.Prefs;
	const Util = alexisbrunet.com.BitTorrentWebUI.Util;
	
	const Cc = Components.classes;
	const Ci = Components.interfaces;

/**
 * Password Manager Class for Firefox 1.5 to 2.0.x
 */
Prefs.PasswordManager = function () {
	const HTTP_REG_EX = /^https?:\/\//i;
	
	this.fixHostName = function( pHostName, pHttpRealm ) {
		if( pHttpRealm != null ) {
			pHostName = pHostName.replace(HTTP_REG_EX, '');
			pHostName += " (" + pHttpRealm + ")";
		}
		return pHostName;
	};

	this.setPassword = function( pHostName, pUserName, pPassword, pAuthHelper ) {
		var passwordManager = Cc["@mozilla.org/passwordmanager;1"]
	        	.getService(Ci.nsIPasswordManager);
		
		pHostName = this.fixHostName( pHostName, pAuthHelper.httpRealm );
		
		var passExists = false;
		var enumerator = passwordManager.enumerator;
		
		while( enumerator.hasMoreElements() ) {
            var pw = enumerator.getNext().QueryInterface(Ci.nsIPassword);				
            if( pw.host == pHostName && pw.user == pUserName) {
            	if( pw.password == pPassword ) {
            		passExists = true;
            	} else {
            		passwordManager.removeUser( pHostName, pUserName );
				}
            }
        }
			
        if ( !passExists ) {
        	Util.debug("Saving password for " + pHostName);
	        passwordManager.addUser( pHostName, pUserName, pPassword );
        }
	};
	
	this.getPassword = function( pHostName, pUserName, pHttpRealm ) {
		var passwordManager = Cc["@mozilla.org/passwordmanager;1"]
								.getService(Ci.nsIPasswordManager);
		
		pHostName = this.fixHostName( pHostName, pHttpRealm );
				        	
        var enumerator = passwordManager.enumerator;
        while( enumerator.hasMoreElements() ) {
            var pw = enumerator.getNext().QueryInterface(Ci.nsIPassword);				
            if( pw.host == pHostName && pw.user == pUserName) {
                return pw.password;
            }
        }
        
        Util.debug("Looking up password for " + pHostName + " found none!");
        return null;
	};
}

/**
 * Password Manager Class for Firefox 3
 */
Prefs.LoginManager = function () {

	this.setPassword = function( pHostName, pUserName, pPassword, pAuthHelper ) {
		var myLoginManager = Cc["@mozilla.org/login-manager;1"]
				                     .getService(Ci.nsILoginManager);
	        
        var nsLoginInfo = new Components.Constructor(
        	"@mozilla.org/login-manager/loginInfo;1",
            Ci.nsILoginInfo, 
            "init");
        
        var passExists = false;                                 
        var formSubmitURL = (pAuthHelper.httpRealm == null) ? pHostName : null;
                
		if( pPassword ) {
            var logins = myLoginManager.findLogins({}, pHostName, formSubmitURL, pAuthHelper.httpRealm);
			for (var i=0; i<logins.length; i++) {
				if (logins[i].username == pUserName) {
					if(logins[i].password == pPassword) {
						passExists = true;
					} 
					else {
						myLoginManager.removeLogin( logins[i] );
					}
				}
			}   
        }
        
        if( passExists ) return;                                 
        
        var usernameField = ( pAuthHelper.usernameField == null) ? "" : pAuthHelper.usernameField;
        var passwordField = ( pAuthHelper.passwordField == null) ? "" : pAuthHelper.passwordField;
                                      
        var authLoginInfo = new nsLoginInfo(pHostName, formSubmitURL, pAuthHelper.httpRealm,
                   pUserName, pPassword, usernameField, passwordField);
                   
       	Util.debug("Saving password for " + pHostName);
		myLoginManager.addLogin( authLoginInfo );
	};
	
	this.getPassword = function( pHostName, pUserName, pHttpRealm ) {		
		var myLoginManager = Cc["@mozilla.org/login-manager;1"]
		                     .getService(Ci.nsILoginManager);

		var formSubmitURL = (pHttpRealm == null) ? pHostName : null;
		pUserName = (pUserName == null) ? "" : pUserName;
		
		var logins = myLoginManager.findLogins({}, pHostName, formSubmitURL, pHttpRealm);
		for (var i = 0; i < logins.length; i++) {
			if (logins[i].username == pUserName) {
				return logins[i].password;
			}
		}
		
		Util.debug("Looking up password for " + pHostName + " found none!");
		return null;	
	};
}
})();
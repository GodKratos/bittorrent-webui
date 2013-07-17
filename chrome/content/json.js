(function () {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	
	var Util = alexisbrunet.com.BitTorrentWebUI.Util;
	
if(window.JSON !== undefined) { 
	/* Fx 3.5 */
	Util.debug("Using JSON");
	
	Util.JSON = { 
		stringify: function(aJSObject, aKeysToDrop) {
			return JSON.stringify(aJSObject);
		},
	
		parse: function(aJSONString) {
			return JSON.parse(aJSONString);
		}
	};
		
} else if("@mozilla.org/dom/json;1" in Cc) {
	/* Fx 3.0 */
	Util.debug("Using nsIJSON")
	
	var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
	
	Util.JSON = {
		stringify: function(aJSObject, aKeysToDrop) {
			return nativeJSON.encode(aJSObject);
		},
		
		parse: function(aJSONString) {
			return nativeJSON.decode(aJSONString);
		}
	};
		
} else {
	/* Fx < 3.0 */
	Util.debug("Using JSON.jsm and json_parse.js");

/* Code for Util.JSON.stringify adapted from
 * http://mxr.mozilla.org/mozilla/source/js/src/xpconnect/loader/JSON.jsm
 * 
 * Code for Util.JSON.parse adapted from
 * http://www.json.org/json_parse.js
 * so it doesn't use eval or evalInSandbox
 */

	/* ***** BEGIN LICENSE BLOCK *****
	 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
	 *
	 * The contents of this file are subject to the Mozilla Public License Version
	 * 1.1 (the "License"); you may not use this file except in compliance with
	 * the License. You may obtain a copy of the License at
	 * http://www.mozilla.org/MPL/
	 *
	 * Software distributed under the License is distributed on an "AS IS" basis,
	 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
	 * for the specific language governing rights and limitations under the
	 * License.
	 *
	 * The Original Code is Mozilla code.
	 *
	 * The Initial Developer of the Original Code is
	 * Simon Bünzli <zeniko@gmail.com>
	 * Portions created by the Initial Developer are Copyright (C) 2006-2007
	 * the Initial Developer. All Rights Reserved.
	 *
	 * Contributor(s):
	 *
	 * Alternatively, the contents of this file may be used under the terms of
	 * either the GNU General Public License Version 2 or later (the "GPL"), or
	 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
	 * in which case the provisions of the GPL or the LGPL are applicable instead
	 * of those above. If you wish to allow use of your version of this file only
	 * under the terms of either the GPL or the LGPL, and not to allow others to
	 * use your version of this file under the terms of the MPL, indicate your
	 * decision by deleting the provisions above and replace them with the notice
	 * and other provisions required by the GPL or the LGPL. If you do not delete
	 * the provisions above, a recipient may use your version of this file under
	 * the terms of any one of the MPL, the GPL or the LGPL.
	 *
	 * ***** END LICENSE BLOCK ***** */

	/**
	 * Utilities for JavaScript code to handle JSON content.
	 * See http://www.json.org/ for comprehensive information about JSON.
	 *
	 * Import this module through
	 *
	 * Components.utils.import("resource://gre/modules/JSON.jsm");
	 *
	 * Usage:
	 *
	 * var newJSONString = JSON.toString( GIVEN_JAVASCRIPT_OBJECT );
	 * var newJavaScriptObject = JSON.fromString( GIVEN_JSON_STRING );
	 *
	 * Note: For your own safety, Objects/Arrays returned by
	 *       JSON.fromString aren't instanceof Object/Array.
	 */

	// The following code is a loose adaption of Douglas Crockford's code
	// from http://www.json.org/json.js (public domain'd)

	// Notable differences:
	// * Unserializable values such as |undefined| or functions aren't
	//   silently dropped but always lead to a TypeError.
	// * An optional key blacklist has been added to JSON.toString
	
Util.JSON = {
  /**
   * Converts a JavaScript object into a JSON string.
   *
   * @param aJSObject is the object to be converted
   * @param aKeysToDrop is an optional array of keys which will be
   *                    ignored in all objects during the serialization
   * @return the object's JSON representation
   *
   * Note: aJSObject MUST not contain cyclic references.
   */
  stringify: function JSON_stringify(aJSObject, aKeysToDrop) {
	
    // we use a single string builder for efficiency reasons
    var pieces = [];
    
    // this recursive function walks through all objects and appends their
    // JSON representation (in one or several pieces) to the string builder
    function append_piece(aObj) {
      if (typeof aObj == "string") {
        aObj = aObj.replace(/[\\"\x00-\x1F\u0080-\uFFFF]/g, function($0) {
          // use the special escape notation if one exists, otherwise
          // produce a general unicode escape sequence
          switch ($0) {
          case "\b": return "\\b";
          case "\t": return "\\t";
          case "\n": return "\\n";
          case "\f": return "\\f";
          case "\r": return "\\r";
          case '"':  return '\\"';
          case "\\": return "\\\\";
          }
          return "\\u" + ("0000" + $0.charCodeAt(0).toString(16)).slice(-4);
        });
        pieces.push('"' + aObj + '"')
      }
      else if (typeof aObj == "boolean") {
        pieces.push(aObj ? "true" : "false");
      }
      else if (typeof aObj == "number" && isFinite(aObj)) {
        // there is no representation for infinite numbers or for NaN!
        pieces.push(aObj.toString());
      }
      else if (aObj === null) {
        pieces.push("null");
      }
      // if it looks like an array, treat it as such - this is required
      // for all arrays from either outside this module or a sandbox
      else if (aObj instanceof Array ||
               typeof aObj == "object" && "length" in aObj &&
               (aObj.length === 0 || aObj[aObj.length - 1] !== undefined)) {
        pieces.push("[");
        for (var i = 0; i < aObj.length; i++) {
          arguments.callee(aObj[i]);
          pieces.push(",");
        }
        if (aObj.length > 0)
          pieces.pop(); // drop the trailing colon
        pieces.push("]");
      }
      else if (typeof aObj == "object") {
        pieces.push("{");
        for (var key in aObj) {
          // allow callers to pass objects containing private data which
          // they don't want the JSON string to contain (so they don't
          // have to manually pre-process the object)
          if (aKeysToDrop && aKeysToDrop.indexOf(key) != -1)
            continue;
          
          arguments.callee(key.toString());
          pieces.push(":");
          arguments.callee(aObj[key]);
          pieces.push(",");
        }
        if (pieces[pieces.length - 1] == ",")
          pieces.pop(); // drop the trailing colon
        pieces.push("}");
      }
      else {
        throw new TypeError("No JSON representation for this object!");
      }
    }
    append_piece(aJSObject);
    
    return pieces.join("");
  }
};

/*
http://www.JSON.org/json_parse.js
2009-04-18

Public Domain.

NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

This file creates a json_parse function.

    json_parse(text, reviver)
        This method parses a JSON text to produce an object or array.
        It can throw a SyntaxError exception.

        The optional reviver parameter is a function that can filter and
        transform the results. It receives each of the keys and values,
        and its return value is used instead of the original value.
        If it returns what it received, then the structure is not modified.
        If it returns undefined then the member is deleted.

        Example:

        // Parse the text. Values that look like ISO date strings will
        // be converted to Date objects.

        myData = json_parse(text, function (key, value) {
            var a;
            if (typeof value === 'string') {
                a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                if (a) {
                    return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                        +a[5], +a[6]));
                }
            }
            return value;
        });

This is a reference implementation. You are free to copy, modify, or
redistribute.

This code should be minified before deployment.
See http://javascript.crockford.com/jsmin.html

USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
NOT CONTROL.
*/

//This is a function that can parse a JSON text, producing a JavaScript
//data structure. It is a simple, recursive descent parser. It does not use
//eval or regular expressions, so it can be used as a model for implementing
//a JSON parser in other languages.

//We are defining the function inside of another function to avoid creating
//global variables.

 var at,     // The index of the current character
     ch,     // The current character
     escapee = {
         '"':  '"',
         '\\': '\\',
         '/':  '/',
         b:    '\b',
         f:    '\f',
         n:    '\n',
         r:    '\r',
         t:    '\t'
     },
     text,

     error = function (m) {

//Call error when something is wrong.

         throw {
             name:    'SyntaxError',
             message: m,
             at:      at,
             text:    text
         };
     },

     next = function (c) {

//If a c parameter is provided, verify that it matches the current character.

         if (c && c !== ch) {
             error("Expected '" + c + "' instead of '" + ch + "'");
         }

//Get the next character. When there are no more characters,
//return the empty string.

         ch = text.charAt(at);
         at += 1;
         return ch;
     },

     number = function () {

//Parse a number value.

         var number,
             string = '';

         if (ch === '-') {
             string = '-';
             next('-');
         }
         while (ch >= '0' && ch <= '9') {
             string += ch;
             next();
         }
         if (ch === '.') {
             string += '.';
             while (next() && ch >= '0' && ch <= '9') {
                 string += ch;
             }
         }
         if (ch === 'e' || ch === 'E') {
             string += ch;
             next();
             if (ch === '-' || ch === '+') {
                 string += ch;
                 next();
             }
             while (ch >= '0' && ch <= '9') {
                 string += ch;
                 next();
             }
         }
         number = +string;
         if (isNaN(number)) {
             error("Bad number");
         } else {
             return number;
         }
     },

     string = function () {

//Parse a string value.

         var hex,
             i,
             string = '',
             uffff;

//When parsing for string values, we must look for " and \ characters.

         if (ch === '"') {
             while (next()) {
                 if (ch === '"') {
                     next();
                     return string;
                 } else if (ch === '\\') {
                     next();
                     if (ch === 'u') {
                         uffff = 0;
                         for (i = 0; i < 4; i += 1) {
                             hex = parseInt(next(), 16);
                             if (!isFinite(hex)) {
                                 break;
                             }
                             uffff = uffff * 16 + hex;
                         }
                         string += String.fromCharCode(uffff);
                     } else if (typeof escapee[ch] === 'string') {
                         string += escapee[ch];
                     } else {
                         break;
                     }
                 } else {
                     string += ch;
                 }
             }
         }
         error("Bad string");
     },

     white = function () {

//Skip whitespace.

         while (ch && ch <= ' ') {
             next();
         }
     },

     word = function () {

//true, false, or null.

         switch (ch) {
         case 't':
             next('t');
             next('r');
             next('u');
             next('e');
             return true;
         case 'f':
             next('f');
             next('a');
             next('l');
             next('s');
             next('e');
             return false;
         case 'n':
             next('n');
             next('u');
             next('l');
             next('l');
             return null;
         }
         error("Unexpected '" + ch + "'");
     },

     value,  // Place holder for the value function.

     array = function () {

//Parse an array value.

         var array = [];

         if (ch === '[') {
             next('[');
             white();
             if (ch === ']') {
                 next(']');
                 return array;   // empty array
             }
             while (ch) {
                 array.push(value());
                 white();
                 if (ch === ']') {
                     next(']');
                     return array;
                 }
                 next(',');
                 white();
             }
         }
         error("Bad array");
     },

     object = function () {

//Parse an object value.

         var key,
             object = {};

         if (ch === '{') {
             next('{');
             white();
             if (ch === '}') {
                 next('}');
                 return object;   // empty object
             }
             while (ch) {
                 key = string();
                 white();
                 next(':');
                 if (Object.hasOwnProperty.call(object, key)) {
                     error('Duplicate key "' + key + '"');
                 }
                 object[key] = value();
                 white();
                 if (ch === '}') {
                     next('}');
                     return object;
                 }
                 next(',');
                 white();
             }
         }
         error("Bad object");
     };

 value = function () {

//Parse a JSON value. It could be an object, an array, a string, a number,
//or a word.

     white();
     switch (ch) {
     case '{':
         return object();
     case '[':
         return array();
     case '"':
         return string();
     case '-':
         return number();
     default:
         return ch >= '0' && ch <= '9' ? number() : word();
     }
 };

//Return the json_parse function. It will have access to all of the above
//functions and variables.

Util.JSON.parse = function (source, reviver) {
     var result;

     text = source;
     at = 0;
     ch = ' ';
     result = value();
     white();
     if (ch) {
         error("Syntax error");
     }

//If there is a reviver function, we recursively walk the new structure,
//passing each name/value pair to the reviver function for possible
//transformation, starting with a temporary root object that holds the result
//in an empty key. If there is not a reviver function, we simply return the
//result.

     return typeof reviver === 'function' ? (function walk(holder, key) {
         var k, v, value = holder[key];
         if (value && typeof value === 'object') {
             for (k in value) {
                 if (Object.hasOwnProperty.call(value, k)) {
                     v = walk(value, k);
                     if (v !== undefined) {
                         value[k] = v;
                     } else {
                         delete value[k];
                     }
                 }
             }
         }
         return reviver.call(holder, key, value);
     }({'': result}, '')) : result;
};

} 
})();

/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is FIDOquoter.
 *
 * The Initial Developer of the Original Code is
 * Sergey Poziturin.
 * Portions created by the Initial Developer are Copyright (C) 2010
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

// Parts of this code are based upon sources of Quote Colors extension by Malte Ruecker

var fidoquoter_MsgBrowser=null;
var fidoquoter_LoadedMsgURI=null;
//are we running in Seamonkey 2 or later?
var fidoquoter_bAppIsSM2=false;
//are we running Thunderbird 3 beta 3 or later?
//If yes, we need to use a modified way of retrieving the message URI
var fidoquoter_bAppIsTb3=false;

var msgPaneObserver = {

sPrefName: "mail.pane_config.dynamic",
oPrefServ: null,
oIXULAppInfo: null,
oIVersionComparator: null,

initBrowserRef: function() {
	fidoquoter_MsgBrowser=document.getElementById("messagepane");
	if(fidoquoter_MsgBrowser) {
		fidoquoter_MsgBrowser.addEventListener("load", this.applyColorsToMsg, true);
	}//if
},

initMain: function() {
	oIXULAppInfo=Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
	oIVersionComparator=Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
	if(this.oIXULAppInfo.ID=="{3550f703-e582-4d05-9a08-453d09bdfdc6}") {
		if(this.oIVersionComparator.compare(this.oIXULAppInfo.version, "3.0") >= 0) {
			fidoquoter_bAppIsTb3 = true;
		}//if
	} else {
		if(this.oIXULAppInfo.ID == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}") {
			if(this.oIVersionComparator.compare(this.oIXULAppInfo.version, "2.0a1") >= 0) {
				fidoquoter_bAppIsSM2 = true;
			}//if
		}//if
	}//else

	//init message browser
	msgPaneObserver.initBrowserRef();
},

applyColorsToMsg: function() {
	//dump("applyColorsToMsg called.\n");
    if(!fidoquoter_MsgBrowser) {
		return;
	}//if
	//Load preferencies:
    var user_prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");
    //If we don't use color markup - quit:
    if(!user_prefs.getBoolPref("extensions.fidoquoter.boolUseColors")) {
    	return;
    }//if
	if(fidoquoter_bAppIsTb3) { // special treatment for Thunderbird 3
		if(gMessageDisplay && gMessageDisplay.folderDisplay.selectedMessageUris) {
			fidoquoter_LoadedMsgURI = gMessageDisplay.folderDisplay.selectedMessageUris[0];
		}//if
	} else { // all other supported applications (Thunderbird 2, SeaMonkey 2, ...)
		fidoquoter_LoadedMsgURI = GetLoadedMessage();
	}//else
	if(!fidoquoter_LoadedMsgURI) {
		return;
	}//if
    var messagePrefix=/^mailbox-message:|^imap-message:|^news-message:|^file:/i;
    if(!messagePrefix.test(fidoquoter_LoadedMsgURI)) {
    	return;
	}//if
	
	//Check if this is a valid group/email:
	var source=null;
	if(currentHeaderData.newsgroups) {
		source=currentHeaderData.newsgroups.headerValue;
	} else {
		if(currentHeaderData.from) {
			source=currentHeaderData.from.headerValue;
		}//if
	}//else
	if(source) {
		var groupRegexp=user_prefs.getCharPref("extensions.fidoquoter.stringGroups");
		var re=new RegExp(groupRegexp);
		if(source.match(re)==null) {
			return;
		}//if
	} else {
		//Could not get the source!
	}//else
	
    var oMsgDoc=fidoquoter_MsgBrowser.contentDocument;
    if(!oMsgDoc) {
    	return;
	}//if

    var elmBody=oMsgDoc.getElementsByTagName("body").item(0);
    // does not seem to be a valid message
    if(!elmBody) {
    	return;
	}//if
	//Default foreground text color:
    var defFgColor=user_prefs.getCharPref("browser.display.foreground_color");
    //Quote colors:
    var color1=user_prefs.getCharPref("extensions.fidoquoter.stringColor1");
    var color2=user_prefs.getCharPref("extensions.fidoquoter.stringColor2");
    //Get origin:

	/*
    var msgHdr = messenger.messageServiceFromURI(fidoquoter_LoadedMsgURI).messageURIToMsgHdr(fidoquoter_LoadedMsgURI);
    dump(msgHdr.getStringProperty("x-ftn-tearline")+"\n");
    dump(msgHdr.getStringProperty("x-comment-to")+"\n");
    dump(msgHdr.getStringProperty("from")+"\n");
	var listener1 = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(Components.interfaces.nsISyncStreamListener);
	var consumer1 = listener1.QueryInterface(Components.interfaces.nsIInputStream);
	try{   
		messenger.messageServiceFromURI(fidoquoter_LoadedMsgURI).streamMessage(fidoquoter_LoadedMsgURI, listener1, null, null, false, ""); 
	}catch(ex){                   
		alert("error: "+ex);
	}//catch
	var folder1 = msgHdr.folder; 
	var mailText=folder1.getMsgTextFromStream(listener1.inputStream, msgHdr.Charset, 65536, 32768, false, true, { }); 
	//var mailArray=decodeURIComponent(escape(mailText));
    dump(mailText+"\n");
    */

	//Here we change the message:
	var nextElm=elmBody.firstChild;
	//var prevTextElm=nextElm;
	while(nextElm) {
		var msgText=nextElm.innerHTML;
		if(msgText) {
			//Work on FTN addresses if it is allowed:
			if(user_prefs.getBoolPref("extensions.fidoquoter.boolFTNAddrAsLink")) {
				nextElm.innerHTML=fidoquoter_replaceFTNAddr(msgText, user_prefs.getCharPref("extensions.fidoquoter.stringFTNURL"), user_prefs.getCharPref("extensions.fidoquoter.stringFTNDomain"));
			}//if
			//Change color of the message:
			nextElm.innerHTML=fidoquoter_colorize(nextElm.innerHTML, "\n", defFgColor, color1, color2);
			//prevTextElm=nextElm;
		}//if
		nextElm=nextElm.nextSibling;
	}//while
	//Something in the end of the message should go here:
	//prevTextElm.innerHTML+="Origin";
},

register: function() {
	this.oPrefServ=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	this.oPrefServ.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
	this.oPrefServ.addObserver(this.sPrefName, this, false);
},

unregister: function() {
	if(this.oPrefServ) {
		this.oPrefServ.removeObserver(this.sPrefName, this);
  	}//if
},

observe: function(subject, topic, data) {
	if(topic=="nsPref:changed") {
		this.initBrowserRef();
	}//if
},

FQunloadMessenger: function() {
	msgPaneObserver.unregister();
},

};

msgPaneObserver.register();
    
window.addEventListener("load", msgPaneObserver.initMain, false);
window.addEventListener("unload", msgPaneObserver.FQunloadMessenger, false);


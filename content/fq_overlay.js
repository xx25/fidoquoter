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
 
 // Parts of this code are based upon sources of ReFwdFormatter extension by Masahiko Ishiki

//X-Comment-To:
var qtnquoter_xct=null;

var fidoquoter = {

//Compose on send observer:

SendObserver: function() {
	var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	observerService.addObserver(this, "mail:composeOnSend", false);
},

//Checks if the byte needs escaping in QP format:
needsEscape: function(b) {
	return b<32 || b>126 || b=='=' || b=='?';
},

// 0xff => "ff"
// 0xff => "377"
formatNumber: function(number, base, num_digits) {
	var dst=number.toString(base).toUpperCase();
	for (var i=dst.length; i<num_digits; ++i) {
		dst="0"+dst;
	}//for
	return dst;
},

//Converts array of bytes to quoted printable:
qp_encode: function(src, charset) {
	if(src==null)
		return "";
	var dst="=?"+charset+"?Q?";
	for(var i=0; i<src.length; i++) {
		var b=src[i];
		if(this.needsEscape(b)) {
			dst+="="+this.formatNumber(b, 16, 2);
		} else {
			dst+=String.fromCharCode(b);
		}//else
	}//for
	dst+="?=";
	return dst;
},

//Converts string from UTF-8 to charset quoted printable (if needed):
utf8_decode: function(src, charset) {
	var converter=Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset=charset;
	//var codepageString=converter.ConvertFromUnicode(src);
	var codepageString=converter.ConvertFromUnicode(src);
	if(codepageString==src) {
		//If we don't need to decode anything - return src as is:
		return src;
	}//if
	var data={};
	var arr=converter.convertToByteArray(src, data);
	codepageString=this.qp_encode(arr, charset);
    //dump("utf8_decode: '"+codepageString+"',\n'"+arr+"'\n'"+escape(arr)+"'\n"+data+"'\n'");
    return codepageString;
},

//Logging to an error console:
LOG: function(msg) {
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	consoleService.logStringMessage(msg);
},

//Splits the single long quoted line of text into several smaller lines:
splitSingleLine: function(src, initials, maxLineLen) {
	if(src==null)
		return "";
	var i=0;
	var dst="";
	var j=0;
	var arr=new Array();
	while(true) {
		var sub=src.substring(i, i+maxLineLen);
		var spIndex=sub.lastIndexOf(" ");
		if( ((i==0)&&(spIndex>initials.length+2)) || ((i>0)&&(spIndex>0)) ) {
			i+=spIndex+1;
		} else {
			i+=maxLineLen;
			spIndex=maxLineLen;
		}//else
		var s=(j==0?"":"<br> "+initials+" ")+sub.substring(0, spIndex);
		//dump("Adding '"+s+"'\n");
		arr.push(s);
		j++;
		if(i>src.length) {
			break;
		}//if
	}//while
	if(arr.length>1) {
		//If there are more then 1 resulting lines
		var last=arr[arr.length-1].replace(/^<br> *[\w\?А-Яа-я]+[&gt;>]+(.*)$/g, "$1");
		//Concatinate the last 2, if the length permits:
		if(arr[arr.length-2].length+last.length<maxLineLen) {
			arr[arr.length-2]+=last;
			arr[arr.length-1]=null;
		}//if
	}//if
	for(var i in arr) {
		if(arr[i]!=null) {
			dst+=arr[i];
		}//if
	}//for
	//dump("splitSingleLine:\n"+dst+"\n===\n");
	return dst;
},

//Takes quoted text and tries to normalize strings by length:
concatAllLines: function(src, maxLineLen) {
    if(src==null)
	return "";
    var arr=src.split("<br>");
    var dst="";
    var newDst;
    for(var i=0; i<arr.length; i++) {
	if(arr[i].length>maxLineLen) {
	    var initials=arr[i].replace(/^ *([\w\?А-Яа-я]+[&gt;>]+).*/g, "$1");
	    var spIndex=arr[i].substring(0, maxLineLen).lastIndexOf(" ");
	    var nxtAdd="";
	    //Split the line either by space or (if space not found) by size:
	    if(spIndex>initials.length+2) {//+2 because of 2 spaces that were trimmed
		newDst=arr[i].substring(0, spIndex);
		nxtAdd=arr[i].substring(spIndex+1);
	    } else {
		newDst=arr[i].substring(0, maxLineLen);
		nxtAdd=arr[i].substring(maxLineLen);
	    }//else
	    //Now we have the remainder of the current line in newDst (and it will be added to dst) and..
	    //... addition to the next line in nxtAdd.
	    if(arr[i+1]!=null) {
		var initialsNext=arr[i+1].replace(/^ *([\w\?А-Яа-я]+[&gt;>]+).*/g, "$1");
		if(initials==initialsNext) {
		    //If the next line is the continuation of the current one:
		    var re=new RegExp("^ *"+initials.replace(/([?])/g, "\\?")+"(.*)");
		    //Just add:
		    arr[i+1]=" "+initials+" "+nxtAdd+arr[i+1].replace(re, "$1");
		} else {
		    //If the next line is a line from another quote:
		    newDst+="<br>"+this.splitSingleLine(" "+initials+" "+nxtAdd, initials, maxLineLen);//Ya, just add, too
		}//else
	    } else {
		newDst=this.splitSingleLine(arr[i], initials, maxLineLen);
	    }//else
	} else {
		newDst=arr[i];
	}//else
	dst+=(i==0?"":"<br>")+newDst;
    }//for
    return dst;
},

//Quote single line of text:
quote: function(src, initials, maxLineLen) {
	//Delete &nbsp:
	src=src.replace(/^(.*)(&nbsp[;]?)+(.*)$/g, "$1 $3");
	//Check for '>>>' quoting and replace it with '??>>>':
	if( (src.length>0) && (src.search(/^ *[>&gt;]+.*$/g)==0) ) {
		src=src.replace(/^ *([>&gt;]+)(.*$)/g, "??$1$2");
	}//if
	//Increase quoting symbol >
	var dst=src.replace(/^( *[\w\?А-Яа-я]{1,3}&gt;?)(.*)/g, "$1&gt;$2");
	if(dst==src) {
		//If this is not a quote originally, quote it with author's initials:
		dst=" "+initials+"&gt; "+src;
	} else {
		//Add space in front of quote, if it isn't there already:
		dst=dst.replace(/^( *)(.*)/, " $2");
	}//else
	//Replace starting space with nbsp because of mozilla bug. This is really bullshit:
	dst=dst.replace(/^ +(.*)$/, " $1").replace(/^(.*)<br> +(.*)$/g, "$1<br> $2");
	//Done.
	//dump("quote: '"+src+"':'"+dst+"'\n");
	return dst;
},

//Delete <span....> and </span> blocks of text:
unspan: function(src) {
	var dst=src.replace(/.*(<\/?span [^>]+>)/g, "").replace(/(<\/span>).*/g, "");
	//this.LOG("unspan: '"+src+"':'"+dst+"'");
	return dst;
},

//Returns text that should not be quoted - beginning:
unspanBefore: function(src) {
	var dst=src.replace(/(.*)(<\/?span [^>]+>).*/g, "$1");
	//this.LOG("unspanBefore: '"+src+"':'"+dst+"'");
	return dst;
},

//Returns text that should not be quoted - ending part:
unspanAfter: function(src) {
	var dst=src.replace(/.*(<\/span>)(.*)/g, "$2");
	//this.LOG("unspanAfter: '"+src+"':'"+dst+"'");
	return dst;
},

//Extracts initials from (2 chars) "name <some@email.com>":
getInitials: function(srcFrom) {
	if(srcFrom==null)
		return null;
	var dst=srcFrom.replace(/^(.*)<.*$/g, "$1");
	dst=dst.replace(/[\" ]*([\wА-Яа-я]{1}).*[\. ,_]([\wА-Яа-я]{1}).*/g, "$1$2");
	if(dst.length>2)
		dst=dst.charAt(0);
	return dst;
},

//Extracts name from "name <some@email.com>":
getName: function(srcFrom) {
	if(srcFrom==null)
		return null;
	var dst=srcFrom.replace(/^(.*)<.*$/g, "$1");
	dst=fidoquoter_trim(dst);
	dst=dst.replace(/^\"*(.*)\"$/, "$1");
	if(dst.length==0)
		dst=null;
	return dst;
},

//Returns true if run under Thunderbird 3.0+:
amiTB3: function() {
	var oIXULAppInfo=Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
	var oIVersionComparator=Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
	if(oIXULAppInfo.ID=="{3550f703-e582-4d05-9a08-453d09bdfdc6}") {
		if(oIVersionComparator.compare(oIXULAppInfo.version, "3.0") >= 0) {
			return true;
		}//if
	}//if
	return false;
},

//Returns true if run under Seamonkey 2.0+:
amiSM: function() {
	var oIXULAppInfo=Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
	var oIVersionComparator=Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
	if(oIXULAppInfo.ID == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}") {
		if(oIVersionComparator.compare(oIXULAppInfo.version, "2.0a1") >= 0) {
			return true;
		}//if
	}//if
	return false;
},

//Formats the body of the letter:
format: function() {
    if(fidoquoter.editing) {
      return;
    }//if
    fidoquoter.editing = true;
    qtnquoter_xct=null;
    
    //Preferences:
	var maxLineLen=72;//Maximum length of the text line
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.fidoquoter.");
    var ret=prefs.getBoolPref("boolFTNQ");
    var fwd=prefs.getBoolPref("boolChSubjOnFwd");
    var quoteEmpty=prefs.getBoolPref("boolQEmpty");
    //var quoteSign=prefs.getBoolPref("boolQSign");
    var quoteSign=true;//FIXME: thunderbird deals with signature by it's own opinion :-/
    var groupRegexp=prefs.getCharPref("stringGroups");
    var flowedFmtOn=prefs.getBoolPref("boolFlowedFmtOn");
    var useColors=prefs.getBoolPref("boolUseColors");
    var addXCT=prefs.getBoolPref("boolXCT");
    
    var user_prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");
	//Default foreground text color:
    var defFgColor=user_prefs.getCharPref("browser.display.foreground_color");
    //Quote colors:
    var color1=user_prefs.getCharPref("extensions.fidoquoter.stringColor1");
    var color2=user_prefs.getCharPref("extensions.fidoquoter.stringColor2");
    //Flowed format:
    var curFlowedFmt=user_prefs.getBoolPref("mailnews.send_plaintext_flowed");
    //dump("Flowed="+curFlowedFmt+"\n");
    if(curFlowedFmt!=flowedFmtOn) {
    	//Tell the user we want to change the flowed format:
    	if(window.confirm("Warning: FIDOquoter is going to change mailnews.send_plaintext_flowed preference to "+flowedFmtOn+".  "+(flowedFmtOn?"Setting it to true may prevent quoting from working correctly.":"Setting it to false will make quoting work correctly.")+" Allow?")) {
	    user_prefs.setBoolPref("mailnews.send_plaintext_flowed", flowedFmtOn);
    	}//if
    }//if

    //For TB3+ we need special properties for FTN support (koi8-r fallback and threading):
    if((this.amiTB3()||(this.amiSM())) && prefs.getBoolPref("boolCheckTB3FTN")) {
    	this.LOG("Checking compatibility...");
    	try {
	    var tb3_disable_fallback_to_utf8_koi8r=user_prefs.getBoolPref("mailnews.disable_fallback_to_utf8.KOI8-R");
	    var tb3_correct_threading=user_prefs.getBoolPref("mail.correct_threading");
	    var tb3_strict_threading=user_prefs.getBoolPref("mail.strict_threading");
	    var tb3_thread_without_re=user_prefs.getBoolPref("mail.thread_without_re");
	    var tb3_reuse_thread_window2=user_prefs.getBoolPref("mailnews.reuse_thread_window2");
	    var tb3_thread_pane_column_unthreads=user_prefs.getBoolPref("mailnews.thread_pane_column_unthreads");
    	} catch (e) {
	    this.LOG("Unexpected property issue.");
    	}//catch
    	if( (tb3_disable_fallback_to_utf8_koi8r!=true) && (tb3_correct_threading!=false) && (tb3_strict_threading!=false) && 
    	(tb3_thread_without_re!=true) && (tb3_reuse_thread_window2!=false) && (tb3_thread_pane_column_unthreads!=true) ) {
	    this.LOG("Need to change properties.");
		//Tell the user we want to change properties:
	    if(window.confirm("Warning: FIDOquoter needs to change these parameters in order to set codepage fallback to KOI8-R and to support threading correctly. If you don't want it, just press NO and uncheck \"Check for KOI8-R compatibility and correct threading support\" checkbox. Parameters are:\nmailnews.disable_fallback_to_utf8.KOI8-R=true\nmail.correct_threading=false\nmail.strict_threading=false\nmail.thread_without_re=true\nmailnews.reuse_thread_window2=false\nmailnews.thread_pane_column_unthreads=true\nAllow?")) {
		user_prefs.setBoolPref("mailnews.disable_fallback_to_utf8.KOI8-R", true);
		user_prefs.setBoolPref("mail.correct_threading", false);
		user_prefs.setBoolPref("mail.strict_threading", false);
		user_prefs.setBoolPref("mail.thread_without_re", true);
		user_prefs.setBoolPref("mailnews.reuse_thread_window2", false);
		user_prefs.setBoolPref("mailnews.thread_pane_column_unthreads", true);
		this.LOG("Compatibility properties changed.");
	    }//if
    	}//if
    }//if
    
    //Check colors:
    if(useColors) {
	try {
	    if(user_prefs.getBoolPref("browser.display.use_document_colors")==false) {
		if(window.confirm("Warning: FIDOquoter is configured to use color markup, but the colors won't be shown until you set browser.display.use_document_colors to true. Set it automatically? If you answer OK, colors will be shown the next time you start the editor.")) {
		    user_prefs.setBoolPref("browser.display.use_document_colors", true);
		}//if
	    }//if
    	} catch (e) {
	    ;
	}//catch
    }//if
    
    var t = gMsgCompose.type;
    var curGroup=document.getElementById("addressCol2#1").value.toString();//FIXME: this should be taken from orig. msg
    if (fwd && (t ==3 || t ==4)) {
	    // Foward (3: ForwardAsAttachment, 4: ForwardInline)
	document.getElementById("msgSubject").value = document.getElementById("msgSubject").value.replace(/^\[/,"").replace(/\]$/,"");
    } else if ( ret && (t == 1 || t == 2 || t == 6 || t == 7 || t == 8) ) {
	    // Reply (1: Reply, 2: ReplyAll, 6: ReplyToSender, 7: ReplyToGroup, 8: ReplyToSenderAndGroup)
	try {
	    var re=new RegExp(groupRegexp);
	    if(curGroup.match(re)==null) {
		this.LOG("Group '"+curGroup+"' did not match regexp '"+groupRegexp+"'");
		fidoquoter.editing = false;
		return;
	    }//if
	} catch (e) {
	    this.LOG("Regexp '"+groupRegexp+"' is wrong!");
	}//catch
	this.LOG("Group '"+curGroup+"' matched regexp '"+groupRegexp+"'");
        var b=document.getElementById("content-frame").contentDocument.body;
        var h=b.innerHTML;
	var msgCompFields = gMsgCompose.compFields;
	    //Here we get the original message:
	var messenger=Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
	var origMsgHdr=messenger.messageServiceFromURI(gMsgCompose.originalMsgURI).messageURIToMsgHdr(gMsgCompose.originalMsgURI);
	    //Now we get initials of the person we reply to:
        var ini=this.getInitials(origMsgHdr.mime2DecodedAuthor);
            //Insert the X-Comment-To header, if needed:
	qtnquoter_xct=(addXCT?this.getName(origMsgHdr.mime2DecodedAuthor):null);
            //Now we quote:
        if (h != "<br>") {
            if (ret && !gMsgCompose.composeHTML) {
		    //With plain text work here:
		var origBody="";
		    //Here we remove the original quoting made by thunderbird:
		var origText=h.replace(/(<\/?span [^>]+>)&gt; /g, "$1").replace(/<br>&gt; /g, "<br>").replace(/<br>&gt;  /g, "<br>&nbsp;").replace(/<br>&gt;((&gt;)+) /g, "<br>$1&nbsp;").replace(/<br>&gt;((&gt;)+)  /g, "<br>$1&nbsp;").replace(/<br>&gt;((&gt;)+)<br>/g, "<br>$1&nbsp;<br>");
		    //Here we get the text to quote:
		h=this.unspan(origText);
		    //And not to quote:
		var header=this.unspanBefore(origText);
		var footer=this.unspanAfter(origText);
		    //Start quoting line by line (it's not clever, but it's easy):
		var beginQ=true;
		var beginSign=false;
		var s=h.split("<br>");
		for(var i=0; i<s.length; i++) {
		    if( (s[i]=="--") && (!quoteSign) ) {
			beginSign=true;
			continue;
		    }//if
		    if(beginSign) {
			if(fidoquoter_trim(s[i]).length==0) {
				//If this was the first empty line after we stopped quoting after meeting '--' - continue quoting:
			    beginSign=false;
			}//if
		    }//if
		    if(beginQ) {
			if(fidoquoter_trim(s[i]).length==0) {
			    if(quoteEmpty) {
				s[i]=this.quote(s[i], ini, maxLineLen);
			    } else {}
			} else {
			    s[i]=this.quote(s[i], ini, maxLineLen);
			}//else
		    }//if
		    if(fidoquoter_trim(s[i]).length>0) {
			if(beginSign==false) {
			    origBody=origBody+s[i]+"<br>";
			}//if
		    }//if
		}//for
		if(flowedFmtOn) {
			//Finally concat all lines, if possible:
		    origBody=this.concatAllLines(origBody, maxLineLen);
		}
		//b.innerHTML="<div style=\"white-space:-moz-pre-wrap; border: 1px solid black;\">"+("<span style=\"background:yellow\">")+header+origBody+footer+"</span>"+"</div>";
		if(useColors) {
			//Here we swap color1 and color2 for sysop convenience:
		    origBody=fidoquoter_colorize(origBody, "<br>", defFgColor, color2, color1);
		}//if
		//leo b.innerHTML=header+origBody+footer;
		b.innerHTML=header+"<div style=\"white-space:nowrap\">"+origBody+"<div style=\"white-space:normal\">"+footer;
		//b.innerHTML="<div style=\"white-space:-moz-pre-wrap; border: 1px solid black;\">"+header+origBody+footer+"</div>";
		//dump("New message:\n"+b.innerHTML+"\n");
	    }//if
	}//if
    }//if
    window.setTimeout("fidoquoter.editing=false", 700);
  },

  onDelayLoad : function() {
    window.setTimeout("fidoquoter.format()", 700);
  },

  onDelayReopen : function() {
    window.setTimeout("fidoquoter.format()", 300);
  },

  onLoad: function(e) {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("fidoquoter-strings");
    opening = false;
    var el=document.getElementById("content-frame");
	if(el) {
		el.addEventListener("load", fidoquoter.onDelayLoad, true);
	}//if
    window.addEventListener("compose-window-reopen", fidoquoter.onDelayReopen, true);
    var sendObserver;
    if(e.target==document) {
		this.SendObserver.prototype= {
		  observe: function(subject, topic, data) {
			 var f = this.observe;
			 while (f) {
			   if(/Save/.test(f.name)) {
				   //dump("Ignoring send notification because we're probably autosaving or saving as a draft/template\n");
				   return;
			   }//if
			   f=f.caller;
			 }//while
			 //add your headers here, separated by \r\n
		 	if(gMsgCompose!=null) {
		 		//Check if we already have X-Comment-To set via header:
			 	var prevXCT=gMsgCompose.compFields.otherRandomHeaders;
			 	if(prevXCT!=null) {
			 		prevXCT=prevXCT.replace(/.*X-Comment-To: (.*)\r?\n?.*/i, "$1");
			 	}//if
			 	if( (prevXCT==null) || (prevXCT.length==0) ) {
				 	//Now add automatic X-Comment-To (set from From: header of the original message):
					if(qtnquoter_xct!=null) {
						fidoquoter.LOG("X-Comment-To: '"+qtnquoter_xct+"'");
				 		gMsgCompose.compFields.otherRandomHeaders += "X-Comment-To: "+fidoquoter.utf8_decode(qtnquoter_xct, gMsgCompose.compFields.characterSet)+"\r\n";
				 		qtnquoter_xct=null;
			 		}//if
			 	} else {
			 		//Here we add X-Comment-To specified by user in header editor. We already have it in prevXCT, but need to decode:
			 		prevXCT=fidoquoter.utf8_decode(prevXCT, gMsgCompose.compFields.characterSet);
			 		gMsgCompose.compFields.otherRandomHeaders=gMsgCompose.compFields.otherRandomHeaders.replace(/(.*)X-Comment-To: (.*)(\r?\n?.*)/i, "$1"+"X-Comment-To: "+prevXCT+"$3");
			 		fidoquoter.LOG("otherRandomHeaders:\n"+gMsgCompose.compFields.otherRandomHeaders);
			 	}//else
		 	 }//if
		}
		};
    	sendObserver=new this.SendObserver();
	}//if
  },

};

window.addEventListener("load", function(e) { fidoquoter.onLoad(e); }, true);


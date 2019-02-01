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

//Delete spaces and so on at the beginning and at the end of the string:
function fidoquoter_trim(src) {
	return src.replace(/(^\s+)|(\s+$)/g, "");;
}

//Change color of the text:
function fidoquoter_colorize (src, delimiter, defFgColor, color1, color2) {
	if(src==null)
		return "";
	//dump("\n=================\n"+src+"\n=================\n");
	var curColor=defFgColor;
	var dst="";
	//Blockquote:
	//src=src.replace(/<blockquote .*?>/gi, "&gt;").replace(/<\/blockquote>/gi, "").replace(/<pre .*?>/gi, "").replace(/<\/pre>/gi, "");
	//&nbsp; replacement:
	src=src.replace(/&nbsp;/g, " ");
	//<br> replacement if needed:
	/*
	if(delimiter!="<br>") {
		src=src.replace(/<br>/g, "");
	}//if
	*/
	var arr=src.split(delimiter);
	var prevInitials="";
	var initials="";
	for(var i=0; i<arr.length; i++) {
		var tmpStr=arr[i].replace(/^<.*>(.*)$/, "$1");
		if(tmpStr.match(/^ *([\w\?А-Яа-я]{0,3}(&gt;)+).*$/)!=null) {
			//If we have initials:
			initials=tmpStr.replace(/^ *([\w\?А-Яа-я]{0,3}(&gt;)+) *.*$/, "$1");
		} else {
			//If we don't have initials:
			dst+="<span style=\"color:"+defFgColor+"\">"+arr[i]+"</span>"+delimiter;
			continue;
		}//else
		//dump("'"+tmpStr+"'\nInitials: '"+initials+"', prevInitials: '"+prevInitials+"'\n");
		var tmpStrTrimmed=fidoquoter_trim(arr[i]);
		if( (initials==tmpStrTrimmed) && (tmpStrTrimmed.length>initials.length) ) {
			curColor=defFgColor;
			initials="";
		} else {
			if(fidoquoter_trim(initials)!=fidoquoter_trim(prevInitials)) {
				if(curColor!=color1) {
					curColor=color1;
				} else {
					curColor=color2;
				}//else
			}//if
		}//else
		dst+="<span style=\"color:"+curColor+"\">"+arr[i]+"</span>"+delimiter;
		prevInitials=initials;
	}//for
	//dump(dst+"\n==========\n");
	return dst;
}

//Convert FTN addresses in the message to something else:
function fidoquoter_replaceFTNAddr(origText, url, domain) {
	var rc=origText;
	rc=rc.replace(/((\d{1}):(\d{1,4})\/(\d{1,6})\.(\d{1,6}))/g, "<a href=\"mailto:Sysop@p$5.f$4.n$3.z$2."+domain+"\">$1</a><a href=\"http://nodehist.fidonet.org.ua/?address=$2%3A$3%2F$4\">\u2794</a>");
	rc=rc.replace(/((\d{1}):(\d{1,4})\/(\d{1,6}))([^\.\d])/g, "<a href=\"mailto:Sysop@f$4.n$3.z$2."+domain+"\">$1</a><a href=\"http://nodehist.fidonet.org.ua/?address=$2%3A$3%2F$4\">\u2794</a>$5");
	return rc;
}


#!
#  vim:set sw=4 ts=8 fileencoding=utf8::Кодировка:UTF-8[АБЁЪЯабёъя]
#
# \version $Revision: 8 $
# \date $Date: 2015-12-26 07:31:46 +0000 (Sat, 26 Dec 2015) $
# \author $Author: sergeserge3leo $
#
# \brief Сборка FIDOquoter
#

set -e

BDIR=${BDIR:-build}
BNAME=${BNAME:-FIDOquoter}
BVERSION=${BVERSION:-1.0}
BRELEASE=${BRELEASE:-a1}

rm -f install.rdf
BREVISION=$(
	svn -v st | awk '
	    { 
		m=substr($0, 1, 9);
		gsub("[[:space:]]", "", m);
		r=substr($0, 10, 9);
		gsub("[[:space:]]", "", r);
		if(m != "") {
		    mod = mod m;
		}
		if(r ~ /^[0-9]*$/ && r > rev) {
		    rev = r;
		}
	    }
	    END {
		print rev, mod;
	    }' \
	    | tr '>' '_'
    )
sed 's/\(.*svn revision = \)[^;]*\(;.*\)/\1'"${BREVISION}"'\2/g' \
    < install.rdf.in \
    > install.rdf

name="${BDIR}/${BNAME}-${BVERSION}${BRELEASE}.xpi"
rm -f "${name}"
zip -r "${name}" * \
    --exclude 'build/*' --exclude 'www/*' --exclude 'doc/*' \
    --exclude '*.swp' --exclude '*.orig' \
    --exclude .svn --exclude '.DS*' \
    --exclude '*.in' --exclude '*.sh'

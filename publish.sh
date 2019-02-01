#!
#  vim:set sw=4 ts=8 fileencoding=utf8::Кодировка:UTF-8[АБЁЪЯабёъя]
#
# \version $Revision: 7 $
# \date $Date: 2015-12-26 07:23:26 +0000 (Sat, 26 Dec 2015) $
# \author $Author: sergeserge3leo $
#
# \brief Сборка и публикация FIDOquoter
#

set -e

./build.sh
scp build/*.xpi lnfm1.sai.msu.ru:/resurs/www/person/leo/FIDOquoter/files/
rm build/*.xpi
rm install.rdf

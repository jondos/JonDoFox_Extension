#!/bin/sh

# Use this script to generate a distributable .xpi or an alhpa version 
# including the chrome-folder as a .jar-archive

OPTSTR="v:a:bh"
getopts "${OPTSTR}" CMD_OPT
while [ $? -eq 0 ];
do
  case ${CMD_OPT} in
    v) JDF_VERSION="${OPTARG}";;
    a) ALPHA_VERSION="${OPTARG}";; 
    b) JDF_BROWSER="1";;
    h) echo '' 
       echo 'JonDoDox Extension Packaging Script 1.0 (2011 Copyright (c) JonDos GmbH)'
       echo "usage: $0 [options]"
       echo 'Possible options are:'
       echo '-v [version]'
       echo '   The version number of the next JonDoFox release (necessary for the alpha'
       echo '   release).'
       echo '-a [alpha_version]'
       echo '   The alpha version number.'
       echo '-b builds the xpi for use in the JonDoBrowser.'
       echo '-h prints this help text.'
       echo ''
       exit 0
       ;;
  esac
  getopts "${OPTSTR}" CMD_OPT
done

signing()
{
  cd ..
  # Check for the existence of signtool
  if ! [ -e "/usr/bin/signtool" ]; then
    echo \*\* Found no signtool to use! Aborting...
  exit
  fi

  # Unzipping the unsigned .xpi and signing the files
  mkdir signdir
  unzip -d signdir xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi
  signtool -d ${HOME}/.mozilla/firefox/profile -k "Importiertes Zertifikat" signdir

  # Finally zipping the signed files again to get a .xpi
  cd signdir
  zip ../jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi META-INF/zigbert.rsa
  zip -r -D ../jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi META-INF * -x META-INF/zigbert.rsa

  #Clean-up
  cd ..
  rm -rf signdir
  rm xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi
  mv jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi xpi 
}

SEDBIN="sed"
# we need GNU sed, check if gsed is installed (for BSD)
if [ `which gsed` ]; then
  echo "GNU sed found, seems we are on BSD"
  SEDBIN="gsed"
fi

XPINAME="jondofox"

if [ ${JDF_BROWSER} ]; then
  # We basically replace all the JDF peculiarites (like logos, .xhtml,
  # "about:jondobrowser") with the JDB ones and undo that after building the
  # .xpi.
  XPINAME="jondofoxBrowser"
  echo "Replacing \"about:jondofox\" with \"about:jondobrowser\""
  cd src
  $SEDBIN -i 's/about:jondofox/about:jondobrowser/g' \
    $(grep -ril 'about:jondofox' *)
  $SEDBIN -i 's/what=jondofox/what=jondobrowser/g' \
    $(grep -ril 'what=jondofox' *)
  $SEDBIN -i 's/jondofox-features.xhtml/jondobrowser-features.xhtml/g' \
    $(grep -ril 'jondofox-features.xhtml' *)
  $SEDBIN -i 's/jondofox-colors.jpg/jondobrowser-colors.jpg/g' \
    $(grep -ril 'jondofox-colors.jpg' *)
  $SEDBIN -i 's/jondofox-background.jpg/jondobrowser-background.jpg/g' \
    $(grep -ril 'jondofox-background.jpg' *)
  echo "Replacing the JonDoFox update URL with an own"
  $SEDBIN -i 's/downloads\/update.rdf/downloads\/updateBrowser.rdf/g' \
    $(grep -ril 'downloads/update.rdf' *)
  cd ..
fi

# Check for existence of the old XPI and remove it.
if [ -e ${XPINAME}.xpi ]; then
  rm ${XPINAME}.xpi
fi
for FILE in xpi/jondofox_tmp*.xpi; do
  echo \*\* Removing existing ${FILE} ..
  rm ${FILE} 
done

# Create a jarfile in src/chrome containing chrome contents
echo \*\* Creating jarfile containing \'chrome\':
cd src/chrome
zip -Xvr9 jondofox.jar ./ -x "*.svn/*" "*.swp" "*.git" "*~"
cd ../..

# Create the .xpi
echo \*\* Creating the xpi file:
cd src

# Exclude chrome from the zip
if ! [ ${JDF_VERSION} ]; then
  zip -Xvr9 ../xpi/${XPINAME}.xpi ./ -x "*.svn/*" "*.swp" "chrome/*" "*.git" "*~"
  # Move jondofox.jar into the .xpi but without compressing it. 
  zip -Xvm0 ../xpi/${XPINAME}.xpi ./chrome/jondofox.jar 
else
  zip -Xvr9 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./ -x \
  "*.svn/*" "*.swp" "chrome/*" "*.git"
  zip -Xvm0 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./chrome/jondofox.jar 
  echo \*\* Signing -xpi
  signing  
fi

if [ ${JDF_BROWSER} ]; then
  # We basically reset all the JDF peculiarites (like logos, .xhtml,
  # "about:jondobrowser").
  echo "Resetting the values."
  $SEDBIN -i 's/about:jondobrowser/about:jondofox/g' \
    $(grep -ril 'about:jondobrowser' *)
  $SEDBIN -i 's/what=jondobrowser/what=jondofox/g' \
    $(grep -ril 'what=jondobrowser' *)
  $SEDBIN -i 's/jondobrowser-features.xhtml/jondofox-features.xhtml/g' \
    $(grep -ril 'jondobrowser-features.xhtml' *)
  $SEDBIN -i 's/jondobrowser-colors.jpg/jondofox-colors.jpg/g' \
    $(grep -ril 'jondobrowser-colors.jpg' *)
  $SEDBIN -i 's/jondobrowser-background.jpg/jondofox-background.jpg/g' \
    $(grep -ril 'jondobrowser-background.jpg' *)
  # Resetting the update URL to the old one...
  $SEDBIN -i 's/downloads\/updateBrowser.rdf/downloads\/update.rdf/g' \
    `grep -ril 'downloads/updateBrowser.rdf' *`
fi

cd ..

exit 0

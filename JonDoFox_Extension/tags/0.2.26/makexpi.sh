#!/bin/bash

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

if [ ${JDF_BROWSER} ]; then
  # We basically replace all the JDF peculiarites (like logos, .xhtml,
  # "about:jondobrowser") with the JDB ones and undo that after building the
  # .xpi.
  echo "Replacing \"about:jondofox\" with \"about:jondobrowser\""
  cd src
  sed -i 's/about:jondofox/about:jondobrowser/g' \
    $(grep -ril 'about:jondofox' *)
  sed -i 's/what=jondofox/what=jondobrowser/g' \
    $(grep -ril 'what=jondofox' *)
  sed -i 's/jondofox-features.xhtml/jondobrowser-features.xhtml/g' \
    $(grep -ril 'jondofox-features.xhtml' *)
  sed -i 's/jondofox-colors.jpg/jondobrowser-colors.jpg/g' \
    $(grep -ril 'jondofox-colors.jpg' *)
  sed -i 's/jondofox-background.jpg/jondobrowser-background.jpg/g' \
    $(grep -ril 'jondofox-background.jpg' *)
  echo "Replacing the JonDoFox update URL with an own"
  sed -i 's/downloads\/update.rdf/downloads\/updateBrowser.rdf/g' \
    $(grep -ril 'downloads/update.rdf' *)
  echo "Adapting netError.xhtml"
  sed -i 's/\&jondofox.instructions.titleText;/\&jondobrowser.instructions.titleText;/g' \
    $(grep -ril '&jondofox.instructions.titleText;' *)
  cd ..
fi

# Check for existence of the .xpi. [ -e ] does not work due to the "*".
for FILE in xpi/jondofox*.xpi; do
  echo \*\* Removing existing ${FILE} ..
  rm ${FILE} 
done

# Create a jarfile in src/chrome containing chrome contents
echo \*\* Creating jarfile containing \'chrome\':
cd src/chrome
zip -Xvr9 jondofox.jar ./ -x "*.svn/*" "*.swp" "*.git"
cd ../..

# Create the .xpi
echo \*\* Creating the xpi file:
cd src

# Exclude chrome from the zip
if ! [ ${JDF_VERSION} ]; then
  zip -Xvr9 ../xpi/jondofox.xpi ./ -x "*.svn/*" "*.swp" "chrome/*" "*.git"
  # Move jondofox.jar into the .xpi but without compressing it. 
  zip -Xvm0 ../xpi/jondofox.xpi ./chrome/jondofox.jar 
else
  zip -Xvr9 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./ -x \
  "*.svn/*" "*.swp" "chrome/*" "*.git"
  zip -Xvm0 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./chrome/jondofox.jar 
  echo \*\* Signing -xpi
  signing
  echo \*\* Uploading new alpha version... 
  scp -P 55022 xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi root@78.129.207.114:/var/www/website/htdocs/en/downloads/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi  
fi

if [ ${JDF_BROWSER} ]; then
  # We basically reset all the JDF peculiarites (like logos, .xhtml,
  # "about:jondobrowser").
  echo "Resetting the values."
  sed -i 's/about:jondobrowser/about:jondofox/g' \
    $(grep -ril 'about:jondobrowser' *)
  sed -i 's/what=jondobrowser/what=jondofox/g' \
    $(grep -ril 'what=jondobrowser' *)
  sed -i 's/jondobrowser-features.xhtml/jondofox-features.xhtml/g' \
    $(grep -ril 'jondobrowser-features.xhtml' *)
  sed -i 's/jondobrowser-colors.jpg/jondofox-colors.jpg/g' \
    $(grep -ril 'jondobrowser-colors.jpg' *)
  sed -i 's/jondobrowser-background.jpg/jondofox-background.jpg/g' \
    $(grep -ril 'jondobrowser-background.jpg' *)
  # Resetting the update URL to the old one...
  sed -i 's/downloads\/updateBrowser.rdf/downloads\/update.rdf/g' \
    `grep -ril 'downloads/updateBrowser.rdf' *`
  sed -i 's/\&jondobrowser.instructions.titleText;/\&jondofox.instructions.titleText;/g' \
    $(grep -ril '&jondobrowser.instructions.titleText;' *)
fi

cd ..

exit 0

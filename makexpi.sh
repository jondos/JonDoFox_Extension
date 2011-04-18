#!/bin/bash

# Use this script to generate a distributable .xpi or an alhpa version 
# including the chrome-folder as a .jar-archive

OPTSTR="v:a:h"
getopts "${OPTSTR}" CMD_OPT
while [ $? -eq 0 ];
do
  case ${CMD_OPT} in
    v) JDF_VERSION="${OPTARG}";;
    a) ALPHA_VERSION="${OPTARG}";; 
    h) echo '' 
       echo 'JonDoDox Extension Packaging Script 1.0 (2008 Copyright (c) JonDos GmbH)'
       echo "usage: $0 [options]"
       echo 'Possible options are:'
       echo '-v [version]'
       echo '   The version number of the next JonDoFox release (necessary for the alpha'
       echo '   release).'
       echo '-a [alpha_version]'
       echo '   The alpha version number.'
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
  signtool -d ${HOME}/.mozilla/firefox/profile -k "The USERTRUST Network ID von JonDos GmbH" signdir

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

# Check for existence of the .xpi. [ -e ] does not work due to the "*".
for FILE in xpi/jondofox*.xpi; do
  echo \*\* Removing existing ${FILE} ..
  rm ${FILE} 
done

# Create a jarfile in src/chrome containing chrome contents
echo \*\* Creating jarfile containing \'chrome\':
cd src/chrome
zip -Xvr9 jondofox.jar ./ -x "*.svn/*" "*.swp"
cd ../..

# Create the .xpi
echo \*\* Creating the xpi file:
cd src
# Exclude chrome from the zip
if ! [ ${JDF_VERSION} ]; then
  zip -Xvr9 ../xpi/jondofox.xpi ./ -x "*.svn/*" "*.swp" "chrome/*"
  # Move jondofox.jar into the .xpi but without compressing it. 
  zip -Xvm0 ../xpi/jondofox.xpi ./chrome/jondofox.jar 
  cd ..
else
  zip -Xvr9 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./ -x "*.svn/*" "*.swp" "chrome/*"  
  zip -Xvm0 ../xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi ./chrome/jondofox.jar 
  echo \*\* Signing -xpi
  signing
  echo \*\* Uploading new alpha version... 
  scp -P 55022 xpi/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi root@78.129.207.114:/var/www/website/htdocs/en/downloads/jondofox${JDF_VERSION}-alpha${ALPHA_VERSION}.xpi  
fi

exit 0

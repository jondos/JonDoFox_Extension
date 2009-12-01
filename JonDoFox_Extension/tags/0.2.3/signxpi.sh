#!/bin/bash

# Use this script to sign a jondofox.xpi

# Check for the existence of the .xpi
if ! [ -e "xpi/jondofox.xpi" ]; then
  echo \*\* There is no jondofox.xpi to sign! Aborting...
  exit
fi

# Check for the existence of signtool
if ! [ -e "/usr/bin/signtool" ]; then
  echo \*\* Found no signtool to use! Aborting...
  exit
fi

# Unzipping the unsigned .xpi and signing the files
mkdir signdir
unzip -d signdir xpi/jondofox.xpi
signtool -d ${HOME}/.mozilla/firefox/profile -k "The USERTRUST Network ID von JonDos GmbH" signdir

# Finally zipping the signed files again to get a .xpi
cd signdir
zip ../jondofox.xpi META-INF/zigbert.rsa
zip -r -D ../jondofox.xpi META-INF * -x META-INF/zigbert.rsa

#Clean-up
cd ..
rm -rf signdir
rm xpi/jondofox.xpi
mv jondofox.xpi xpi
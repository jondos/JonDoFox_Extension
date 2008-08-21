#!/bin/bash

# Check for existence
if [ -e "xpi/jondofox.xpi" ]; then
  echo \*\* Removing existing *.xpi ..
  rm xpi/jondofox.xpi
fi

# Say something
echo \*\* Creating \'jondofox.xpi\':
# Change directory
cd src
# Zip files excluding all .*
zip -Xvr ../xpi/jondofox.xpi ./ -x "*.svn/*" "*.swp"
